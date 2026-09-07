import crypto from "crypto";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE =
  process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SESSION_COOKIE = "userfx_vault_session";
const USERNAME_COOKIE = "userfx_telegram_username";

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
  if (!REDIS_URL) throw new Error("Missing REDIS_URL");

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

function createWatermarkId(fullCode) {
  const prefix = String(fullCode || "").split("-")[0] || "USER";
  const fingerprint = hashValue(`watermark:${fullCode}`)
    .slice(0, 8)
    .toUpperCase();

  return `${prefix}-${fingerprint}`;
}

async function checkRateLimit(redis, ip) {
  const key =
    `${CODE_ENGINE_NAMESPACE}:verify-rate:${hashValue(ip).slice(0, 24)}`;
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

  if (isSecureRequest(req)) parts.push("Secure");
  if (Number.isFinite(maxAge)) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  }

  return parts.join("; ");
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  const out = {};

  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;

    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();

    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }

  return out;
}

function normalizeTelegramUsername(value) {
  const raw = String(value || "")
    .trim()
    .replace(/^@+/, "");

  if (!/^[A-Za-z0-9_]{3,32}$/.test(raw)) return null;

  return {
    display: `@${raw}`,
    normalized: raw.toLowerCase(),
  };
}

async function getTelegramFxAccess(usernameNormalized) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const params = new URLSearchParams({
    username_normalized: `eq.${usernameNormalized}`,
    select:
      "username,username_normalized,telegramfx_access,gallery_access,enabled",
    limit: "1",
  });

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/telegramfx_access?${params.toString()}`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Supabase access lookup failed (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
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
  telegramUsername,
}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const sessionHash = hashValue(token);
  const sessionKey =
    `${CODE_ENGINE_NAMESPACE}:access-session:${sessionHash}`;

  const sessionSeconds = getSessionSeconds(planId);
  const sessionExpiresAt = Date.now() + sessionSeconds * 1000;
  const accessMode = PLAN_TO_ACCESS_MODE[planId];
  const usedAccesses = accessState.usedAccesses + 1;
  const remainingAccesses = Number.isFinite(accessState.maxAccesses)
    ? Math.max(0, accessState.maxAccesses - usedAccesses)
    : null;

  const usedAt = new Date().toISOString();
  const watermarkId = createWatermarkId(fullCode);

  const updatedRecord = {
    ...record,
    watermarkId,
    telegramUsername: telegramUsername.normalized,
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
    telegramUsername: telegramUsername.normalized,
    codeHash: hashValue(fullCode).slice(0, 32),
    watermarkId,
    maxAccesses: accessState.maxAccesses,
    usedAccesses,
    remainingAccesses,
    unlimitedAccess: accessState.unlimitedAccess,
    createdAt: usedAt,
    expiresAt: new Date(sessionExpiresAt).toISOString(),
  });

  const watermarkLookupKey =
    `${CODE_ENGINE_NAMESPACE}:watermark:${watermarkId}`;

  const watermarkLookupRecord = JSON.stringify({
    watermarkId,
    code: fullCode,
    planId,
    telegramUsername: telegramUsername.normalized,
    userId: record.userId ? String(record.userId) : null,
    createdAt: usedAt,
  });

  const result = Number(
    await redis.eval(
      `
        local current = redis.call("GET", KEYS[1])
        if not current then return 0 end
        if current ~= ARGV[1] then return -1 end
        redis.call("SET", KEYS[1], ARGV[2])
        redis.call("SET", KEYS[2], ARGV[3], "EX", tonumber(ARGV[4]))
        redis.call("SET", KEYS[3], ARGV[5])
        return 1
      `,
      3,
      redisKey,
      sessionKey,
      watermarkLookupKey,
      rawRecord,
      JSON.stringify(updatedRecord),
      sessionRecord,
      String(sessionSeconds),
      watermarkLookupRecord
    )
  );

  if (result !== 1) {
    return {
      ok: false,
      reason: result === 0 ? "missing" : "changed",
    };
  }

  const persistentMaxAge =
    planId === "vip" ? sessionSeconds : undefined;

  res.setHeader(
    "Set-Cookie",
    serializeSessionCookie(req, token, persistentMaxAge)
  );

  return {
    ok: true,
    accessMode,
    watermarkId,
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
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const cookies = parseCookies(req);
    const usernameInput =
      body.username ||
      cookies[USERNAME_COOKIE] ||
      "";

    const telegramUsername =
      normalizeTelegramUsername(usernameInput);

    if (!telegramUsername) {
      return res.status(400).json({
        ok: false,
        error: "ENTER YOUR TELEGRAM @USERNAME",
      });
    }

    const telegramAccess =
      await getTelegramFxAccess(telegramUsername.normalized);

    if (
      !telegramAccess ||
      telegramAccess.enabled !== true ||
      telegramAccess.telegramfx_access !== true
    ) {
      return res.status(403).json({
        ok: false,
        error: "TELEGRAM USER NOT AUTHORIZED",
      });
    }

    const safePrefix = String(body.prefix || "")
      .trim()
      .toUpperCase()
      .replace(/-+$/, "");

    const safeSuffix = String(body.suffix || "")
      .trim()
      .toUpperCase();

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
    const redisKey =
      `${CODE_ENGINE_NAMESPACE}:code:${fullCode}`;

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
    const recordPlanId =
      String(record.planId || "").trim().toLowerCase();

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

    const accessState =
      getAccessState(record, recordPlanId);

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
      telegramUsername,
    });

    if (!session.ok) {
      return res.status(409).json({
        ok: false,
        error:
          "The code changed while it was being verified. Try again.",
      });
    }

    return res.status(200).json({
      ok: true,
      username: telegramUsername.display,
      code: fullCode,
      planId: recordPlanId,
      plan: record.plan,
      accessMode: session.accessMode,
      watermarkId: session.watermarkId,
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
