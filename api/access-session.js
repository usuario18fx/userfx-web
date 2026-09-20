import crypto from "crypto";
import Redis from "ioredis";
import { ensureAccount } from "../lib/account.js";
import {
  getTelegramFxAccess,
  hasTelegramFxAccess,
  normalizeTelegramUsername,
} from "../lib/telegram/access.js";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE =
  process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
const SESSION_COOKIE = "userfx_vault_session";
const IDENTITY_COOKIE = "userfx_identity_session";
const IDENTITY_ACCESS_SECONDS = 10 * 365 * 24 * 60 * 60;

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
      console.error("[access-session/redis]", error.message);
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
      if (separator < 0) return cookies;

      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (!name) return cookies;

      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }

      return cookies;
    }, {});
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
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
  ];

  if (isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}

function clearSessionCookie(req) {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}

function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = String(cookies[SESSION_COOKIE] || "");
  return /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : "";
}

async function readIdentitySession(redis, req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = String(cookies[IDENTITY_COOKIE] || "");

  if (!token) return null;

  const key = `${CODE_ENGINE_NAMESPACE}:identity-session:${hashValue(token)}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    const record = JSON.parse(raw);

    if (
      record?.purpose !== "telegram_identity_session" ||
      !record?.userId ||
      !record?.telegramUsername
    ) {
      return null;
    }

    const expiresAt = Date.parse(String(record.expiresAt || ""));

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      await redis.del(key);
      return null;
    }

    return record;
  } catch {
    await redis.del(key);
    return null;
  }
}

async function validateTelegramAccess(value) {
  const username = normalizeTelegramUsername(value);

  if (!username) {
    return { allowed: false, username: null, record: null };
  }

  const record = await getTelegramFxAccess(username.normalized);

  return {
    allowed: hasTelegramFxAccess(record),
    username,
    record,
  };
}

async function attachPersistentAccount(redis, sessionKey, session) {
  if (session?.accountId) {
    return session;
  }

  const account = await ensureAccount(redis, CODE_ENGINE_NAMESPACE, {
    userId: session?.telegramUserId || session?.userId || null,
    telegramUsername: session?.telegramUsername || null,
    codeHash: session?.codeHash || null,
    planId: session?.planId || "basic",
    accessMode: session?.accessMode || "code",
  });

  const nextSession = {
    ...session,
    accountId: account.accountId,
    telegramUserId:
      session?.telegramUserId || session?.userId || account.telegramUserId || null,
  };

  if (sessionKey) {
    await redis.set(
      sessionKey,
      JSON.stringify(nextSession),
      "KEEPTTL",
    );
  }

  return nextSession;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");

  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const redis = getRedis();

    if (req.method === "POST") {
      const identity = await readIdentitySession(redis, req);

      if (!identity) {
        return res.status(401).json({
          ok: false,
          authenticated: false,
          error: "SPCL IDENTITY VERIFICATION REQUIRED",
        });
      }

      const telegram = await validateTelegramAccess(identity.telegramUsername);

      if (!telegram.allowed || !telegram.username) {
        return res.status(403).json({
          ok: false,
          authenticated: false,
          error: "TELEGRAMFX ACCESS IS NOT ACTIVE",
        });
      }

      const account = await ensureAccount(redis, CODE_ENGINE_NAMESPACE, {
        userId: identity.userId,
        telegramUsername: telegram.username.normalized,
        planId: "vip",
        accessMode: "telegram_identity",
      });

      const token = crypto.randomBytes(32).toString("base64url");
      const sessionKey = `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(token)}`;
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(
        Date.now() + IDENTITY_ACCESS_SECONDS * 1000,
      ).toISOString();

      const session = {
        accountId: account.accountId,
        planId: "vip",
        accessMode: "telegram_identity",
        accessLabel: "SPCL",
        memberAccess: true,
        telegramUsername: telegram.username.normalized,
        telegramUserId: String(identity.userId),
        maxAccesses: null,
        usedAccesses: 0,
        remainingAccesses: null,
        unlimitedAccess: true,
        telegramAccessCheckedAt: createdAt,
        createdAt,
        expiresAt,
      };

      await redis.set(
        sessionKey,
        JSON.stringify(session),
        "EX",
        IDENTITY_ACCESS_SECONDS,
      );

      res.setHeader(
        "Set-Cookie",
        serializeSessionCookie(req, token, IDENTITY_ACCESS_SECONDS),
      );

      return res.status(200).json({
        ok: true,
        authenticated: true,
        accountId: session.accountId,
        telegramUsername: session.telegramUsername,
        planId: session.planId,
        accessMode: session.accessMode,
        accessLabel: session.accessLabel,
        memberAccess: true,
        maxAccesses: session.maxAccesses,
        usedAccesses: session.usedAccesses,
        remainingAccesses: session.remainingAccesses,
        unlimitedAccess: session.unlimitedAccess,
        expiresAt: null,
      });
    }

    const token = getSessionToken(req);

    if (!token) {
      return res.status(200).json({
        ok: true,
        authenticated: false,
      });
    }

    const sessionKey = `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(token)}`;

    if (req.method === "DELETE") {
      await redis.del(sessionKey);
      res.setHeader("Set-Cookie", clearSessionCookie(req));
      return res.status(200).json({
        ok: true,
        authenticated: false,
      });
    }

    const rawSession = await redis.get(sessionKey);

    if (!rawSession) {
      res.setHeader("Set-Cookie", clearSessionCookie(req));
      return res.status(200).json({
        ok: true,
        authenticated: false,
      });
    }

    let session;

    try {
      session = JSON.parse(rawSession);
    } catch {
      await redis.del(sessionKey);
      res.setHeader("Set-Cookie", clearSessionCookie(req));
      return res.status(200).json({
        ok: true,
        authenticated: false,
      });
    }

    const expiresAt = Date.parse(String(session.expiresAt || ""));

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      await redis.del(sessionKey);
      res.setHeader("Set-Cookie", clearSessionCookie(req));
      return res.status(200).json({
        ok: true,
        authenticated: false,
      });
    }

    if (!/^(basic|pro|vip)$/.test(String(session.planId || ""))) {
      await redis.del(sessionKey);
      res.setHeader("Set-Cookie", clearSessionCookie(req));
      return res.status(200).json({
        ok: true,
        authenticated: false,
      });
    }

    if (session.accessMode === "telegram_identity") {
      const telegram = await validateTelegramAccess(session.telegramUsername);

      if (!telegram.allowed || !telegram.username) {
        await redis.del(sessionKey);
        res.setHeader("Set-Cookie", clearSessionCookie(req));
        return res.status(200).json({
          ok: true,
          authenticated: false,
        });
      }

      session = {
        ...session,
        telegramUsername: telegram.username.normalized,
        telegramAccessCheckedAt: new Date().toISOString(),
      };

      await redis.set(sessionKey, JSON.stringify(session), "KEEPTTL");
    }

    session = await attachPersistentAccount(redis, sessionKey, session);

    const memberAccess = session.accessMode === "telegram_identity";

    return res.status(200).json({
      ok: true,
      authenticated: true,
      accountId: session.accountId,
      telegramUsername: session.telegramUsername || null,
      planId: session.planId,
      accessMode: session.accessMode,
      accessLabel: memberAccess ? "SPCL" : session.accessLabel || null,
      memberAccess,
      maxAccesses: session.maxAccesses,
      usedAccesses: session.usedAccesses,
      remainingAccesses: session.remainingAccesses,
      unlimitedAccess: session.unlimitedAccess,
      expiresAt: memberAccess ? null : session.expiresAt,
    });
  } catch (error) {
    console.error("[api/access-session]", error);
    return res.status(500).json({
      ok: false,
      authenticated: false,
      error: "Server connection error.",
    });
  }
}
