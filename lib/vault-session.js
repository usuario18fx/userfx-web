import crypto from "crypto";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE =
  process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
const SESSION_COOKIE = "userfx_vault_session";

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
      console.error("[vault-session/redis]", error.message);
    });
  }

  return globalThis.__userfxRedis;
}

function parseCookies(header) {
  return String(header || "")
    .split(";")
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");

      if (separator < 0) {
        return cookies;
      }

      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();

      if (name) {
        try {
          cookies[name] = decodeURIComponent(value);
        } catch {
          cookies[name] = value;
        }
      }

      return cookies;
    }, {});
}

function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = String(cookies[SESSION_COOKIE] || "");

  return /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : "";
}

function getSessionKey(token) {
  const sessionHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  return `${CODE_ENGINE_NAMESPACE}:access-session:${sessionHash}`;
}

export async function readVaultSession(req) {
  const token = getSessionToken(req);

  if (!token) {
    return null;
  }

  const redis = getRedis();
  const sessionKey = getSessionKey(token);
  const rawSession = await redis.get(sessionKey);

  if (!rawSession) {
    return null;
  }

  let session;

  try {
    session = JSON.parse(rawSession);
  } catch {
    await redis.del(sessionKey);
    return null;
  }

  if (!/^(basic|pro|vip)$/.test(String(session.planId || ""))) {
    await redis.del(sessionKey);
    return null;
  }

  if (!Number.isFinite(Date.parse(session.expiresAt))) {
    await redis.del(sessionKey);
    return null;
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    await redis.del(sessionKey);
    return null;
  }

  return session;
}
