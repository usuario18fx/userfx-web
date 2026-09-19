import crypto from "crypto";
import Redis from "ioredis";
import {
  getTelegramFxAccess,
  hasTelegramFxAccess,
  normalizeTelegramUsername,
} from "./telegram/access.js";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE =
  process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
const SESSION_COOKIE = "userfx_vault_session";
const TELEGRAM_ACCESS_RECHECK_MS = 60 * 1000;

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

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
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

      if (!name) {
        return cookies;
      }

      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
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
  return `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(token)}`;
}

function hasExpired(session) {
  const expiresAt = Date.parse(String(session?.expiresAt || ""));
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}

async function validateTelegramSession(redis, sessionKey, session) {
  if (session.accessMode !== "telegram_identity") {
    return session;
  }

  const username = normalizeTelegramUsername(session.telegramUsername);

  if (!username) {
    await redis.del(sessionKey);
    return null;
  }

  const lastChecked = Date.parse(
    String(session.telegramAccessCheckedAt || ""),
  );

  if (
    Number.isFinite(lastChecked) &&
    Date.now() - lastChecked < TELEGRAM_ACCESS_RECHECK_MS
  ) {
    return session;
  }

  const access = await getTelegramFxAccess(username.normalized);

  if (!hasTelegramFxAccess(access)) {
    await redis.del(sessionKey);
    return null;
  }

  const refreshedSession = {
    ...session,
    telegramAccessCheckedAt: new Date().toISOString(),
  };

  await redis.set(sessionKey, JSON.stringify(refreshedSession), "KEEPTTL");
  return refreshedSession;
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

  if (hasExpired(session)) {
    await redis.del(sessionKey);
    return null;
  }

  session = await validateTelegramSession(redis, sessionKey, session);
  return session;
}
