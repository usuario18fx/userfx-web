import crypto from "crypto";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const CODE_ENGINE_NAMESPACE =
  process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

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

function hashIp(ip) {
  return crypto
    .createHash("sha256")
    .update(ip)
    .digest("hex")
    .slice(0, 24);
}

async function checkRateLimit(redis, ip) {
  const key =
    `${CODE_ENGINE_NAMESPACE}:verify-rate:${hashIp(ip)}`;

  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  return attempts <= MAX_ATTEMPTS;
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

    const safePrefix = String(body.prefix || "")
      .trim()
      .toUpperCase()
      .replace(/-+$/, "");

    const safeSuffix = String(body.suffix || "")
      .trim()
      .toUpperCase();

    if (!/^(FX01|AX01|VIPX)$/.test(safePrefix)) {
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
      console.error("[verify] Invalid Redis record", {
        redisKey,
      });

      return res.status(500).json({
        ok: false,
        error: "Invalid access record.",
      });
    }

    if (record.status !== "active") {
      return res.status(401).json({
        ok: false,
        error: "This code is no longer active.",
      });
    }

    const createdAt = Date.parse(record.createdAt);
    const days = Number(record.days);
    let expiresAt = null;

    if (
      Number.isFinite(createdAt) &&
      Number.isFinite(days) &&
      days > 0
    ) {
      expiresAt = createdAt + days * 24 * 60 * 60 * 1000;

      if (Date.now() >= expiresAt) {
        return res.status(401).json({
          ok: false,
          error: "This code has expired.",
        });
      }
    }

    return res.status(200).json({
      ok: true,
      code: fullCode,
      planId: record.planId,
      plan: record.plan,
      days: record.days,
      expiresAt: expiresAt
        ? new Date(expiresAt).toISOString()
        : null,
    });
  } catch (error) {
    console.error("[api/verify]", error);

    return res.status(500).json({
      ok: false,
      error: "Server connection error.",
    });
  }
}