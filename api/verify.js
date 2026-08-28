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

const PLAN_ACCESS_LIMITS = Object.freeze({
  basic: 1,
  pro: 10,
  vip: null,
});

const PLAN_TO_ACCESS_MODE = Object.freeze({
  basic: "single_entry",
  pro: "ten_entries",
  vip: "unlimited_entries",
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

function getAccessState(record, planId) {
  const maxAccesses = PLAN_ACCESS_LIMITS[planId];
  const parsedUsedAccesses = Number(record.usedAccesses);
  const fallbackUsedAccesses =
    record.status === "consumed" && Number.isFinite(maxAccesses)
      ? maxAccesses
      : 0;
  const usedAccesses = Number.isFinite(parsedUsedAccesses)
    ? Math.max(0, Math.floor(parsedUsedAccesses))
    : fallbackUsedAccesses;
  const remainingAccesses = Number.isFinite(maxAccesses)
    ? Math.max(0, maxAccesses - usedAccesses)
    : null;

  return {
    maxAccesses,
    usedAccesses,
    remainingAccesses,
    unlimitedAccess: maxAccesses === null,
  };
}

function getSessionSeconds(planId) {
  return planId === "vip"
    ? VIP_SESSION_SECONDS
    : planId === "pro"
      ? PRO_SESSION_SECONDS
      : BASIC_SESSION_SECONDS;
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
  accessState,
}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const sessionHash = hashValue(token);
  const sessionKey = `${CODE_ENGINE_NAMESPACE}:access-session:${sessionHash}`;
  const sessionSeconds = getSessionSeconds(planId);
  const sessionExpiresAt = Date.now() + sessionSeconds * 1000;
  const accessMode = PLAN_TO_ACCESS_MODE[planId];
  const usedAccesses = accessState.usedAccesses + 1;
  const remainingAccesses = Number.isFinite(accessState.maxAccesses)
    ? Math.max(0, accessState.maxAccesses - usedAccesses)
    : null;
  const usedAt = new Date().toISOString();
  const updatedRecord = {
    ...record,
    status:
      remainingAccesses === 0 && accessState.maxAccesses !== null
        ? "consumed"
        : "active",
    maxAccesses: accessState.maxAccesses,
    usedAccesses,
    remainingAccesses,
    unlimitedAccess: accessState.unlimitedAccess,
    lastUsedAt: usedAt,
  };

  delete updatedRecord.days;
  delete updatedRecord.expiresAt;

  if (remainingAccesses === 0 && accessState.maxAccesses !== null) {
    updatedRecord.usedAt = usedAt;
  }

  const sessionRecord = JSON.stringify({
    planId,
    accessMode,
    codeHash: hashValue(fullCode).slice(0, 32),
    maxAccesses: accessState.maxAccesses,
    usedAccesses,
    remainingAccesses,
    unlimitedAccess: accessState.unlimitedAccess,
    createdAt: usedAt,
    expiresAt: new Date(sessionExpiresAt).toISOString(),
  });
  const result = Number(
    await redis.eval(
      `
        local current = redis.call("GET", KEYS[1])
        if not current then return 0 end
        if current ~= ARGV[1] then return -1 end
        redis.call("SET", KEYS[1], ARGV[2])
        redis.call("SET", KEYS[2], ARGV[3], "EX", tonumber(ARGV[4]))
        return 1
      `,
      2,
      redisKey,
      sessionKey,
      rawRecord,
      JSON.stringify(updatedRecord),
      sessionRecord,
      String(sessionSeconds)
    )
  );

  if (result !== 1) {
    return {
      ok: false,
      reason: result === 0 ? "missing" : "changed",
    };
  }

  const persistentMaxAge = planId === "vip" ? sessionSeconds : undefined;
  res.setHeader(
    "Set-Cookie",
    serializeSessionCookie(req, token, persistentMaxAge)
  );

  return {
    ok: true,
    accessMode,
    maxAccesses: accessState.maxAccesses,
    usedAccesses,
    remainingAccesses,
    unlimitedAccess: accessState.unlimitedAccess,
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

    const accessState = getAccessState(record, recordPlanId);

    if (
      accessState.remainingAccesses !== null &&
      accessState.remainingAccesses <= 0
    ) {
      return res.status(401).json({
        ok: false,
        error: "This code has no accesses remaining.",
      });
    }

    if (record.status !== "active") {
      return res.status(401).json({
        ok: false,
        error: "This code is no longer active.",
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
      accessState,
    });

    if (!session.ok) {
      return res.status(409).json({
        ok: false,
        error: "The code changed while it was being verified. Try again.",
      });
    }

    return res.status(200).json({
      ok: true,
      code: fullCode,
      planId: recordPlanId,
      plan: record.plan,
      accessMode: session.accessMode,
      maxAccesses: session.maxAccesses,
      usedAccesses: session.usedAccesses,
      remainingAccesses: session.remainingAccesses,
      unlimitedAccess: session.unlimitedAccess,
      sessionExpiresAt: session.sessionExpiresAt,
    });
  } catch (error) {
    console.error("[api/verify]", error);
    return res.status(500).json({
      ok: false,
      error: "Server connection error.",
    });
  }
}
