import crypto from "crypto";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE = process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
const SESSION_COOKIE = "userfx_vault_session";
const HANDOFF_TTL_SECONDS = 5 * 60;
const CANONICAL_ORIGIN = String(process.env.USERFX_CANONICAL_URL || "https://user18fx.com").replace(/\/$/, "");

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
      console.error("[handoff/redis]", error.message);
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

function remainingSeconds(expiresAt) {
  const ms = Date.parse(String(expiresAt || "")) - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : 0;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");

  if (!["POST", "GET"].includes(req.method)) {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const redis = getRedis();

    if (req.method === "POST") {
      const sourceToken = getSessionToken(req);
      if (!sourceToken) {
        return res.status(401).json({ ok: false, error: "ACCESS SESSION REQUIRED" });
      }

      const sourceKey = `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(sourceToken)}`;
      const rawSession = await redis.get(sourceKey);
      if (!rawSession) {
        return res.status(401).json({ ok: false, error: "ACCESS SESSION EXPIRED" });
      }

      let session;
      try {
        session = JSON.parse(rawSession);
      } catch {
        return res.status(401).json({ ok: false, error: "INVALID ACCESS SESSION" });
      }

      const ttl = remainingSeconds(session.expiresAt);
      if (ttl <= 0 || !/^(basic|pro|vip)$/.test(String(session.planId || ""))) {
        return res.status(401).json({ ok: false, error: "ACCESS SESSION EXPIRED" });
      }

      const handoffToken = crypto.randomBytes(32).toString("base64url");
      const handoffKey = `${CODE_ENGINE_NAMESPACE}:handoff:${hashValue(handoffToken)}`;
      const record = {
        purpose: "browser_handoff",
        session,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + HANDOFF_TTL_SECONDS * 1000).toISOString(),
      };

      await redis.set(
        handoffKey,
        JSON.stringify(record),
        "EX",
        Math.min(HANDOFF_TTL_SECONDS, ttl)
      );

      return res.status(200).json({
        ok: true,
        url: `${CANONICAL_ORIGIN}/?handoff=${encodeURIComponent(handoffToken)}`,
        expiresIn: Math.min(HANDOFF_TTL_SECONDS, ttl),
      });
    }

    const handoffToken = String(req.query?.token || "").trim();
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(handoffToken)) {
      return res.status(400).json({ ok: false, error: "INVALID HANDOFF TOKEN" });
    }

    const handoffKey = `${CODE_ENGINE_NAMESPACE}:handoff:${hashValue(handoffToken)}`;

    const rawRecord = await redis.eval(
      `
        local current = redis.call("GET", KEYS[1])
        if not current then return false end
        redis.call("DEL", KEYS[1])
        return current
      `,
      1,
      handoffKey
    );

    if (!rawRecord) {
      return res.status(401).json({ ok: false, error: "HANDOFF EXPIRED OR ALREADY USED" });
    }

    let record;
    try {
      record = JSON.parse(rawRecord);
    } catch {
      return res.status(401).json({ ok: false, error: "INVALID HANDOFF" });
    }

    if (record?.purpose !== "browser_handoff" || !record?.session) {
      return res.status(401).json({ ok: false, error: "INVALID HANDOFF" });
    }

    const session = record.session;
    const ttl = remainingSeconds(session.expiresAt);
    if (ttl <= 0 || !/^(basic|pro|vip)$/.test(String(session.planId || ""))) {
      return res.status(401).json({ ok: false, error: "ACCESS SESSION EXPIRED" });
    }

    const newToken = crypto.randomBytes(32).toString("base64url");
    const newSessionKey = `${CODE_ENGINE_NAMESPACE}:access-session:${hashValue(newToken)}`;

    await redis.set(newSessionKey, JSON.stringify(session), "EX", ttl);
    res.setHeader("Set-Cookie", serializeSessionCookie(req, newToken, ttl));

    return res.status(200).json({
      ok: true,
      authenticated: true,
      planId: session.planId,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("[api/handoff]", error);
    return res.status(500).json({ ok: false, error: "HANDOFF SERVER ERROR" });
  }
}
