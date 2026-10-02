import crypto from "crypto";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE = process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
const SESSION_COOKIE = "userfx_vault_session";
const ADMIN_USER_ID = String(process.env.ADMIN_USER_ID || "").trim();
const GALLERY_VISIBLE_KEY = `${CODE_ENGINE_NAMESPACE}:runtime:gallery-visible`;
const STAGE_STATE_KEY = `${CODE_ENGINE_NAMESPACE}:runtime:stage`;
const GALLERY_PRESENCE_PREFIX = `${CODE_ENGINE_NAMESPACE}:presence:gallery:`;
const STAGE_PRESENCE_PREFIX = `${CODE_ENGINE_NAMESPACE}:presence:stage:`;
const PRESENCE_TTL_SECONDS = 45;

function getRedis() {
  if (!REDIS_URL) throw new Error("Missing REDIS_URL");

  if (!globalThis.__userfxRedis) {
    globalThis.__userfxRedis = new Redis(REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 10000,
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

async function readSession(redis, req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = String(cookies[SESSION_COOKIE] || "");
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;

  const key = `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(token)}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    const expiresAt = Date.parse(String(session.expiresAt || ""));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function isOwner(session) {
  const telegramUserId = String(session?.telegramUserId || session?.userId || "").trim();
  return Boolean(ADMIN_USER_ID && telegramUserId && telegramUserId === ADMIN_USER_ID);
}

async function scanCount(redis, pattern) {
  let cursor = "0";
  let count = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    count += keys.length;
  } while (cursor !== "0");

  return count;
}

async function countSharedAccounts(redis) {
  let cursor = "0";
  const accounts = new Set();

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", `${CODE_ENGINE_NAMESPACE}:access-session:*`, "COUNT", 100);
    cursor = nextCursor;

    if (keys.length) {
      const values = await redis.mget(keys);
      for (const raw of values) {
        if (!raw) continue;
        try {
          const session = JSON.parse(raw);
          const accountId = String(session?.accountId || "").trim();
          const expiresAt = Date.parse(String(session?.expiresAt || ""));
          if (accountId && Number.isFinite(expiresAt) && expiresAt > Date.now()) accounts.add(accountId);
        } catch {}
      }
    }
  } while (cursor !== "0");

  return accounts.size;
}

async function readRuntime(redis) {
  const [galleryRaw, stageRaw, sharedWith, viewingGallery, viewingStage] = await Promise.all([
    redis.get(GALLERY_VISIBLE_KEY),
    redis.get(STAGE_STATE_KEY),
    countSharedAccounts(redis),
    scanCount(redis, `${GALLERY_PRESENCE_PREFIX}*`),
    scanCount(redis, `${STAGE_PRESENCE_PREFIX}*`),
  ]);

  let stage = { live: false, startedAt: null };

  if (stageRaw) {
    try {
      stage = { ...stage, ...JSON.parse(stageRaw) };
    } catch {}
  }

  return {
    galleryVisible: galleryRaw !== "0",
    stage,
    sharedWith,
    viewingGallery,
    viewingStage,
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    const redis = getRedis();
    const session = await readSession(redis, req);

    if (!session) {
      return res.status(401).json({
        ok: false,
        authenticated: false,
        error: "authentication_required",
      });
    }

    const owner = isOwner(session);

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const action = String(body.action || "");
      const accountKey = String(session.accountId || session.telegramUserId || "anonymous");

      if (action === "gallery-heartbeat") {
        await redis.set(`${GALLERY_PRESENCE_PREFIX}${hashValue(accountKey).slice(0, 24)}`, "1", "EX", PRESENCE_TTL_SECONDS);
      } else if (action === "stage-heartbeat") {
        await redis.set(`${STAGE_PRESENCE_PREFIX}${hashValue(accountKey).slice(0, 24)}`, "1", "EX", PRESENCE_TTL_SECONDS);
      } else {
        if (!owner) {
          return res.status(403).json({ ok: false, error: "owner_required" });
        }

        if (action === "gallery-show") {
          await redis.set(GALLERY_VISIBLE_KEY, "1");
        } else if (action === "gallery-hide") {
          await redis.set(GALLERY_VISIBLE_KEY, "0");
        } else if (action === "stage-start") {
          await redis.set(STAGE_STATE_KEY, JSON.stringify({
            live: true,
            startedAt: new Date().toISOString(),
            hostTelegramUserId: String(session.telegramUserId || ""),
          }));
        } else if (action === "stage-stop") {
          await redis.set(STAGE_STATE_KEY, JSON.stringify({
            live: false,
            startedAt: null,
            hostTelegramUserId: String(session.telegramUserId || ""),
          }));
        } else {
          return res.status(400).json({ ok: false, error: "unknown_action" });
        }
      }
    }

    const runtime = await readRuntime(redis);

    return res.status(200).json({
      ok: true,
      authenticated: true,
      isOwner: owner,
      role: owner ? "owner" : "member",
      ...runtime,
    });
  } catch (error) {
    console.error("[api/admin-runtime]", error);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
