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
      console.error("[access-session/redis]", error.message);
    });
  }

  return globalThis.__userfxRedis;
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function isSecureRequest(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();

  return process.env.NODE_ENV === "production" || forwardedProto === "https";
}

function clearSessionCookie(req) {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (isSecureRequest(req)) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = String(cookies[SESSION_COOKIE] || "");

  return /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");

  if (req.method !== "GET" && req.method !== "DELETE") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
    });
  }

  try {
    const redis = getRedis();
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

    if (Date.parse(session.expiresAt) <= Date.now()) {
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

    return res.status(200).json({
      ok: true,
      authenticated: true,
      planId: session.planId,
      accessMode: session.accessMode,
      expiresAt: session.expiresAt,
      codeExpiresAt: session.codeExpiresAt,
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
