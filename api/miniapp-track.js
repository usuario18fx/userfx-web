import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MAX_AUTH_AGE_SECONDS = 10 * 60;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  if (!globalThis.__userfxTrackingSupabase) {
    globalThis.__userfxTrackingSupabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return globalThis.__userfxTrackingSupabase;
}

function getClientIp(req) {
  return String(
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
  )
    .split(",")[0]
    .trim();
}

function safeDecodeHeader(value) {
  if (!value) return null;

  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

function parseBody(req) {
  if (req.body === undefined || req.body === null) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  if (typeof req.body === "object") return req.body;
  return {};
}

function verifyTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) {
    return { valid: false, reason: "missing_data" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    return { valid: false, reason: "invalid_hash" };
  }

  const authDate = Number(params.get("auth_date"));

  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { valid: false, reason: "invalid_auth_date" };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const age = nowSeconds - authDate;

  if (age < -60 || age > MAX_AUTH_AGE_SECONDS) {
    return { valid: false, reason: "expired_auth_date" };
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const expected = Buffer.from(computedHash, "hex");
  const received = Buffer.from(hash, "hex");

  if (expected.length !== received.length) {
    return { valid: false, reason: "invalid_signature" };
  }

  if (!crypto.timingSafeEqual(expected, received)) {
    return { valid: false, reason: "invalid_signature" };
  }

  return { valid: true, reason: null, params };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  let body;

  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({
      ok: false,
      error: "invalid_json",
    });
  }

  const initData = String(body.initData || "").trim();

  if (!initData) {
    return res.status(200).json({
      ok: true,
      tracked: false,
      source: "browser",
    });
  }

  const verification = verifyTelegramWebAppData(initData, BOT_TOKEN);

  if (!verification.valid) {
    return res.status(401).json({
      ok: false,
      tracked: false,
      error: verification.reason,
    });
  }

  let telegramUser = {};

  try {
    telegramUser = JSON.parse(verification.params.get("user") || "{}");
  } catch {
    telegramUser = {};
  }

  const geo = {
    country: req.headers["x-vercel-ip-country"] || null,
    region: req.headers["x-vercel-ip-country-region"] || null,
    city: safeDecodeHeader(req.headers["x-vercel-ip-city"]),
    timezone: req.headers["x-vercel-ip-timezone"] || null,
  };

  try {
    const supabase = getSupabase();

    const { error } = await supabase.from("track_events").insert({
      event: "miniapp_open",
      telegram: telegramUser,
      meta: {
        authDate: Number(verification.params.get("auth_date")) || null,
      },
      geo,
      ip: getClientIp(req),
      ua: req.headers["user-agent"] || null,
      href: req.headers.referer || null,
      path: "/miniapp",
      host: req.headers.host || null,
      referer: req.headers.referer || null,
    });

    if (error) {
      console.error("[miniapp-track/insert]", error);
      return res.status(500).json({
        ok: false,
        tracked: false,
        error: "server_error",
      });
    }

    return res.status(200).json({
      ok: true,
      tracked: true,
      source: "telegram",
    });
  } catch (error) {
    console.error("[api/miniapp-track]", error);
    return res.status(500).json({
      ok: false,
      tracked: false,
      error: "server_error",
    });
  }
}
