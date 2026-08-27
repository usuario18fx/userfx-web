import crypto from "crypto";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE =
  process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";

const SESSION_COOKIE = "userfx_vault_session";
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;
const BASIC_SESSION_SECONDS = 12 * 60 * 60;
const PRO_SESSION_SECONDS = 24 * 60 * 60;
const VIP_SESSION_SECONDS = 7 * 24 * 60 * 60;

const PREFIX_TO_PLAN = Object.freeze({
  BSIC: "basic",
  PRX0: "pro",
  VIPX: "vip",
});

const PLAN_TO_ACCESS_MODE = Object.freeze({
  basic: "single_session",
  pro: "remembered_code",
  vip: "persistent_7d",
});

function getRedis() {
  if (!REDIS_URL) {
    throw new Error("Missing REDIS_URL");
  }

  if (!globalThis.__userfxRedis) {
    globalThis.__userfxRedis = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 10000,
    });

    globalThis.__userfxRedis.on("error", (error) => {
      console.error("[verify/redis]", error.message);
    });
  }

  return globalThis.__userfxRedis;
}

function getClientIp(req) {
  return String(
    req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "unknown"
  )
    .split(",")[0]
    .trim();
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function checkRateLimit(redis, ip) {
  const key = `${CODE_ENGINE_NAMESPACE}:verify-rate:${hashValue(ip).slice(0, 24)}`;
  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  return attempts <= MAX_ATTEMPTS;
}

function isSecureRequest(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();

  return process.env.NODE_ENV === "production" || forwardedProto === "https";
}

function serializeSessionCookie(req, token, maxAge) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (isSecureRequest(req)) {
    parts.push("Secure");
  }

  if (Number.isFinite(maxAge)) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  }

  return parts.join("; ");
}

function getCodeExpiration(record) {
  const createdAt = Date.parse(record.createdAt);
  const days = Number(record.days);

  if (!Number.isFinite(createdAt) || !Number.isFinite(days) || days <= 0) {
    return null;
  }

  return createdAt + days * 24 * 60 * 60 * 1000;
}

function getSessionSeconds(planId, remainingCodeSeconds) {
  const requestedSeconds =
    planId === "vip"
      ? VIP_SESSION_SECONDS
      : planId === "pro"
        ? PRO_SESSION_SECONDS
        : BASIC_SESSION_SECONDS;

  return Math.max(1, Math.min(requestedSeconds, remainingCodeSeconds));
}

async function createAccessSession({
  redis,
  req,
  res,
  redisKey,
  rawRecord,
  record,
  fullCode,
  planId,
  codeExpiresAt,
}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const sessionHash = hashValue(token);
  const sessionKey = `${CODE_ENGINE_NAMESPACE}:access-session:${sessionHash}`;
  const remainingCodeSeconds = Math.max(
    1,
    Math.floor((codeExpiresAt - Date.now()) / 1000)
  );
  const sessionSeconds = getSessionSeconds(planId, remainingCodeSeconds);
  const sessionExpiresAt = Date.now() + sessionSeconds * 1000;
  const accessMode = PLAN_TO_ACCESS_MODE[planId];
  const sessionRecord = JSON.stringify({
    planId,
    accessMode,
    codeHash: hashValue(fullCode).slice(0, 32),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(sessionExpiresAt).toISOString(),
    codeExpiresAt: new Date(codeExpiresAt).toISOString(),
  });

  if (planId === "basic") {
    const consumedRecord = JSON.stringify({
      ...record,
      status: "consumed",
      usedAt: new Date().toISOString(),
    });
    const result = Number(
      await redis.eval(
        `
          local current = redis.call("GET", KEYS[1])
          if not current then return 0 end
          if current ~= ARGV[1] then return -1 end
          redis.call("SET", KEYS[1], ARGV[2], "KEEPTTL")
          redis.call("SET", KEYS[2], ARGV[3], "EX", tonumber(ARGV[4]))
          return 1
        `,
        2,
        redisKey,
        sessionKey,
        rawRecord,
        consumedRecord,
        sessionRecord,
        String(sessionSeconds)
      )
    );

    if (result !== 1) {
      return { ok: false, reason: result === 0 ? "missing" : "used" };
    }
  } else {
    await redis.set(sessionKey, sessionRecord, "EX", sessionSeconds);
  }

  const persistentMaxAge = planId === "vip" ? sessionSeconds : undefined;
  res.setHeader(
    "Set-Cookie",
    serializeSessionCookie(req, token, persistentMaxAge)
  );

  return {
    ok: true,
    accessMode,
    sessionExpiresAt: new Date(sessionExpiresAt).toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const redis = getRedis();
    const ip = getClientIp(req);
    const allowed = await checkRateLimit(redis, ip);

    if (!allowed) {
      return res.status(429).json({
        ok: false,
        error: "Too many attempts. Please refresh the page.",
      });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const safePrefix = String(body.prefix || "")
      .trim()
      .toUpperCase()
      .replace(/-+$/, "");
    const safeSuffix = String(body.suffix || "").trim().toUpperCase();

    if (!/^(BSIC|PRX0|VIPX)$/.test(safePrefix)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid prefix.",
      });
    }

    if (!/^[A-HJ-NP-Z2-9]{4}$/.test(safeSuffix)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid suffix.",
      });
    }

    const fullCode = `${safePrefix}-${safeSuffix}`;
    const redisKey = `${CODE_ENGINE_NAMESPACE}:code:${fullCode}`;
    const rawRecord = await redis.get(redisKey);

    if (!rawRecord) {
      return res.status(401).json({
        ok: false,
        error: "Invalid code.",
      });
    }

    let record;

    try {
      record = JSON.parse(rawRecord);
    } catch {
      console.error("[verify] Invalid Redis record", { redisKey });
      return res.status(500).json({
        ok: false,
        error: "Invalid access record.",
      });
    }

    const expectedPlanId = PREFIX_TO_PLAN[safePrefix];
    const recordPlanId = String(record.planId || "").trim().toLowerCase();

    if (recordPlanId !== expectedPlanId) {
      console.error("[verify] Prefix and plan mismatch", {
        redisKey,
        expectedPlanId,
        recordPlanId,
      });
      return res.status(500).json({
        ok: false,
        error: "Invalid access record.",
      });
    }

    if (record.status === "consumed" && recordPlanId === "basic") {
      return res.status(401).json({
        ok: false,
        error: "This BASIC code has already been activated.",
      });
    }

    if (record.status !== "active") {
      return res.status(401).json({
        ok: false,
        error: "This code is no longer active.",
      });
    }

    const codeExpiresAt = getCodeExpiration(record);

    if (!codeExpiresAt) {
      return res.status(500).json({
        ok: false,
        error: "Invalid access record.",
      });
    }

    if (Date.now() >= codeExpiresAt) {
      return res.status(401).json({
        ok: false,
        error: "This code has expired.",
      });
    }

    const session = await createAccessSession({
      redis,
      req,
      res,
      redisKey,
      rawRecord,
      record,
      fullCode,
      planId: recordPlanId,
      codeExpiresAt,
    });

    if (!session.ok) {
      return res.status(409).json({
        ok: false,
        error: "This BASIC code has already been activated.",
      });
    }

    return res.status(200).json({
      ok: true,
      code: fullCode,
      planId: recordPlanId,
      plan: record.plan,
      days: record.days,
      accessMode: session.accessMode,
      sessionExpiresAt: session.sessionExpiresAt,
      expiresAt: new Date(codeExpiresAt).toISOString(),
    });
  } catch (error) {
    console.error("[api/verify]", error);
    return res.status(500).json({
      ok: false,
      error: "Server connection error.",
    });
  }
}
