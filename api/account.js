import crypto from "crypto";
import Redis from "ioredis";
import {
  ensureAccount,
  getAccount,
  updateAccountProfile,
} from "../lib/account.js";
import {
  getTelegramFxAccess,
  hasTelegramFxAccess,
  normalizeTelegramUsername,
} from "../lib/telegram/access.js";

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
      console.error("[account/redis]", error.message);
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

function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = String(cookies[SESSION_COOKIE] || "");
  return /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : "";
}

async function validateTelegramAccess(value) {
  const username = normalizeTelegramUsername(value);

  if (!username) {
    return { allowed: false, username: null };
  }

  const record = await getTelegramFxAccess(username.normalized);

  return {
    allowed: hasTelegramFxAccess(record),
    username,
  };
}

async function readAccessSession(redis, req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const sessionKey = `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(token)}`;
  const raw = await redis.get(sessionKey);
  if (!raw) return null;

  let session;

  try {
    session = JSON.parse(raw);
  } catch {
    await redis.del(sessionKey);
    return null;
  }

  const expiresAt = Date.parse(String(session.expiresAt || ""));

  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() ||
    !/^(basic|pro|vip)$/.test(String(session.planId || ""))
  ) {
    await redis.del(sessionKey);
    return null;
  }

  if (session.accessMode === "telegram_identity") {
    const telegram = await validateTelegramAccess(session.telegramUsername);

    if (!telegram.allowed || !telegram.username) {
      await redis.del(sessionKey);
      return null;
    }

    session = {
      ...session,
      telegramUsername: telegram.username.normalized,
      telegramAccessCheckedAt: new Date().toISOString(),
    };
  }

  if (!session.accountId) {
    const account = await ensureAccount(redis, CODE_ENGINE_NAMESPACE, {
      userId: session.telegramUserId || session.userId || null,
      telegramUsername: session.telegramUsername || null,
      codeHash: session.codeHash || null,
      planId: session.planId,
      accessMode: session.accessMode,
    });

    session = {
      ...session,
      accountId: account.accountId,
      telegramUserId:
        session.telegramUserId || session.userId || account.telegramUserId || null,
    };
  }

  await redis.set(sessionKey, JSON.stringify(session), "KEEPTTL");

  return {
    sessionKey,
    session,
  };
}

function shapeAccount(account, session) {
  return {
    accountId: account.accountId,
    telegramUsername: account.telegramUsername
      ? `@${account.telegramUsername}`
      : null,
    planId: session.planId,
    accessMode: session.accessMode,
    accessLabel:
      session.accessMode === "telegram_identity"
        ? "SPCL"
        : session.accessLabel || null,
    memberAccess: session.accessMode === "telegram_identity",
    profile: account.profile,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    lastAccessAt: account.lastAccessAt,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");

  if (!["GET", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const redis = getRedis();
    const access = await readAccessSession(redis, req);

    if (!access?.session?.accountId) {
      return res.status(401).json({
        ok: false,
        authenticated: false,
        error: "ACCESS SESSION REQUIRED",
      });
    }

    let account = await getAccount(
      redis,
      CODE_ENGINE_NAMESPACE,
      access.session.accountId,
    );

    if (!account) {
      account = await ensureAccount(redis, CODE_ENGINE_NAMESPACE, {
        userId:
          access.session.telegramUserId || access.session.userId || null,
        telegramUsername: access.session.telegramUsername || null,
        codeHash: access.session.codeHash || null,
        planId: access.session.planId,
        accessMode: access.session.accessMode,
      });
    }

    if (req.method === "PATCH") {
      let body;

      try {
        body =
          typeof req.body === "string"
            ? JSON.parse(req.body)
            : req.body || {};
      } catch {
        return res.status(400).json({
          ok: false,
          error: "INVALID REQUEST",
        });
      }

      account = await updateAccountProfile(
        redis,
        CODE_ENGINE_NAMESPACE,
        account.accountId,
        body.profile || body,
      );

      if (!account) {
        return res.status(404).json({
          ok: false,
          error: "ACCOUNT NOT FOUND",
        });
      }
    }

    return res.status(200).json({
      ok: true,
      authenticated: true,
      account: shapeAccount(account, access.session),
    });
  } catch (error) {
    console.error("[api/account]", error);
    return res.status(500).json({
      ok: false,
      authenticated: false,
      error: "ACCOUNT SERVER ERROR",
    });
  }
}
