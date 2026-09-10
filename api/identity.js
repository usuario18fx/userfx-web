import crypto from "crypto";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE = process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";

const IDENTITY_COOKIE = "userfx_identity_session";
const IDENTITY_CODE_PREFIX = "SPCL";
const IDENTITY_CODE_TTL_SECONDS = 15 * 60;
const IDENTITY_SESSION_SECONDS = 30 * 60;
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

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
      console.error("[identity/redis]", error.message);
    });
  }

  return globalThis.__userfxRedis;
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try { out[key] = decodeURIComponent(value); }
    catch { out[key] = value; }
  }
  return out;
}

function isSecureRequest(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  return process.env.NODE_ENV === "production" || forwardedProto === "https";
}

function serializeIdentityCookie(req, token, maxAge) {
  const parts = [
    `${IDENTITY_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
  ];
  if (isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}

function clearIdentityCookie(req) {
  const parts = [
    `${IDENTITY_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}

function normalizeTelegramUsername(value) {
  const raw = String(value || "").trim().replace(/^@+/, "");
  if (!/^[A-Za-z0-9_]{3,32}$/.test(raw)) return null;
  return { display: `@${raw}`, normalized: raw.toLowerCase() };
}

function normalizeIdentityCode(value) {
  const raw = String(value || "").trim().toUpperCase();
  const match = raw.match(/(?:SPCL|TGMX)-[A-HJ-NP-Z2-9]{4}/);
  return match ? match[0] : null;
}

function identityCodeKey(code) {
  return `${CODE_ENGINE_NAMESPACE}:identity-code:${code}`;
}

function identitySessionKey(token) {
  return `${CODE_ENGINE_NAMESPACE}:identity-session:${hashValue(token)}`;
}

function identityRateKey(ip) {
  return `${CODE_ENGINE_NAMESPACE}:identity-rate:${hashValue(ip).slice(0, 24)}`;
}

async function isRateLimited(redis, ip) {
  const attempts = Number((await redis.get(identityRateKey(ip))) || 0);
  return attempts >= MAX_ATTEMPTS;
}

async function recordFailedAttempt(redis, ip) {
  const key = identityRateKey(ip);
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, WINDOW_SECONDS);
  return attempts;
}

async function clearFailedAttempts(redis, ip) {
  await redis.del(identityRateKey(ip));
}

async function readIdentitySession(redis, req) {
  const cookies = parseCookies(req);
  const token = String(cookies[IDENTITY_COOKIE] || "");
  if (!token) return null;

  const raw = await redis.get(identitySessionKey(token));
  if (!raw) return null;

  try {
    const record = JSON.parse(raw);
    if (!record?.userId || !record?.telegramUsername) return null;
    return record;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    const redis = getRedis();

    if (req.method === "GET") {
      const session = await readIdentitySession(redis, req);
      if (!session) return res.status(200).json({ ok: true, verified: false });
      return res.status(200).json({
        ok: true,
        verified: true,
        username: `@${session.telegramUsername}`,
        expiresAt: session.expiresAt || null,
      });
    }

    if (req.method === "DELETE") {
      const cookies = parseCookies(req);
      const token = String(cookies[IDENTITY_COOKIE] || "");
      if (token) await redis.del(identitySessionKey(token));
      res.setHeader("Set-Cookie", clearIdentityCookie(req));
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed." });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const username = normalizeTelegramUsername(body.username);
    const code = normalizeIdentityCode(body.code);
    const ip = getClientIp(req);

    if (!username || !code) {
      await recordFailedAttempt(redis, ip);
      return res.status(400).json({
        ok: false,
        error: `ENTER YOUR TELEGRAM USERNAME AND ${IDENTITY_CODE_PREFIX} CODE`,
      });
    }

    if (await isRateLimited(redis, ip)) {
      return res.status(429).json({ ok: false, error: "TOO MANY IDENTITY ATTEMPTS" });
    }

    const key = identityCodeKey(code);
    const rawRecord = await redis.get(key);

    if (!rawRecord) {
      await recordFailedAttempt(redis, ip);
      console.warn("[api/identity] code not found", { code, username: username.normalized });
      return res.status(401).json({ ok: false, error: "IDENTITY VERIFICATION FAILED" });
    }

    let record;
    try { record = JSON.parse(rawRecord); }
    catch {
      await recordFailedAttempt(redis, ip);
      return res.status(401).json({ ok: false, error: "IDENTITY VERIFICATION FAILED" });
    }

    const recordUsername = String(record.telegramUsername || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase();

    if (
      record.purpose !== "telegram_identity" ||
      record.status !== "active" ||
      !record.userId ||
      recordUsername !== username.normalized
    ) {
      await recordFailedAttempt(redis, ip);
      console.warn("[api/identity] record mismatch", {
        code,
        requestedUsername: username.normalized,
        recordUsername,
        status: record?.status || null,
        purpose: record?.purpose || null,
      });
      return res.status(401).json({ ok: false, error: "IDENTITY VERIFICATION FAILED" });
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const sessionKey = identitySessionKey(token);
    const verifiedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + IDENTITY_SESSION_SECONDS * 1000).toISOString();

    const consumedRecord = JSON.stringify({
      ...record,
      status: "consumed",
      usedAt: verifiedAt,
    });

    const sessionRecord = JSON.stringify({
      purpose: "telegram_identity_session",
      userId: String(record.userId),
      telegramUsername: username.normalized,
      identityCodeHash: hashValue(code).slice(0, 32),
      verifiedAt,
      expiresAt,
    });

    const result = Number(
      await redis.eval(
        `
          local current = redis.call("GET", KEYS[1])
          if not current then return 0 end
          if current ~= ARGV[1] then return -1 end
          redis.call("SET", KEYS[1], ARGV[2], "EX", tonumber(ARGV[3]))
          redis.call("SET", KEYS[2], ARGV[4], "EX", tonumber(ARGV[5]))
          return 1
        `,
        2,
        key,
        sessionKey,
        rawRecord,
        consumedRecord,
        String(Math.max(IDENTITY_CODE_TTL_SECONDS, 60 * 60)),
        sessionRecord,
        String(IDENTITY_SESSION_SECONDS),
      ),
    );

    if (result !== 1) {
      await recordFailedAttempt(redis, ip);
      return res.status(409).json({
        ok: false,
        error: `IDENTITY CODE CHANGED. REQUEST A NEW ${IDENTITY_CODE_PREFIX} CODE.`,
      });
    }

    await clearFailedAttempts(redis, ip);
    res.setHeader("Set-Cookie", serializeIdentityCookie(req, token, IDENTITY_SESSION_SECONDS));

    return res.status(200).json({
      ok: true,
      verified: true,
      username: username.display,
      expiresAt,
    });
  } catch (error) {
    console.error("[api/identity]", error);
    return res.status(500).json({ ok: false, error: "IDENTITY SERVER ERROR" });
  }
}
