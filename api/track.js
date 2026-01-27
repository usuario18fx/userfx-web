// api/track.js
// Tracking seguro: valida Telegram initData (para saber "quién").
// Permite testing en navegador SOLO si mandas X-Track-Secret (TRACK_SECRET en Vercel).

import crypto from "crypto";

function timingSafeEqualHex(aHex, bHex) {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function validateTelegramInitData(initDataRaw, botToken) {
  if (!initDataRaw || typeof initDataRaw !== "string") {
    return { ok: false, error: "initData_empty" };
  }

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "missing_hash" };

  // Construir data_check_string
  params.delete("hash");
  const pairs = [];
  for (const [k, v] of params.entries()) pairs.push([k, v]);
  pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join("\n");

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();

  // computed_hash = HMAC_SHA256(data_check_string, secret_key)
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (!timingSafeEqualHex(computed, hash)) {
    return { ok: false, error: "bad_hash" };
  }

  const out = Object.fromEntries(pairs);
  if (out.user) {
    try {
      out.user = JSON.parse(out.user);
    } catch {}
  }

  return { ok: true, data: out };
}

function pickTelegramIdentity(tgData) {
  const u = tgData?.user && typeof tgData.user === "object" ? tgData.user : null;
  return {
    user_id: u?.id ?? null,
    username: u?.username ?? null,
    first_name: u?.first_name ?? null,
    last_name: u?.last_name ?? null,
    language_code: u?.language_code ?? null,
    chat_instance: tgData?.chat_instance ?? null,
    start_param: tgData?.start_param ?? null,
    auth_date: tgData?.auth_date ?? null,
  };
}

function normalizeBody(reqBody) {
  if (!reqBody) return {};
  if (typeof reqBody === "object") return reqBody;

  // A veces llega string/buffer (sendBeacon o clientes raros)
  try {
    if (typeof reqBody === "string") return JSON.parse(reqBody);
    if (Buffer.isBuffer(reqBody)) return JSON.parse(reqBody.toString("utf8"));
  } catch {}

  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const TRACK_SECRET = process.env.TRACK_SECRET || "";

  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: "server_missing_bot_token" });
  }

  const body = normalizeBody(req.body);
  const event = typeof body.event === "string" ? body.event : "unknown";
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};

  // initData por header o body
  const initDataHeader =
    (typeof req.headers["x-telegram-init-data"] === "string" && req.headers["x-telegram-init-data"]) ||
    (typeof req.headers["x-telegram-initdata"] === "string" && req.headers["x-telegram-initdata"]) ||
    "";

  const initData = initDataHeader || (typeof body.initData === "string" ? body.initData : "");

  // Testing en browser: X-Track-Secret debe matchear TRACK_SECRET
  const secretHeader = req.headers["x-track-secret"];
  const hasSecret =
    TRACK_SECRET &&
    typeof secretHeader === "string" &&
    secretHeader.length > 0 &&
    secretHeader === TRACK_SECRET;

  const hasTelegramInitData = typeof initData === "string" && initData.includes("hash=");

  let telegram = null;

  if (hasTelegramInitData) {
    const v = validateTelegramInitData(initData, BOT_TOKEN);
    if (!v.ok) {
      return res.status(401).json({ ok: false, error: "bad_initData", reason: v.error });
    }
    telegram = pickTelegramIdentity(v.data);
  } else if (!hasSecret) {
    return res.status(401).json({ ok: false, error: "missing_initData_or_secret" });
  }

  // Geo aproximado por IP (Vercel headers)
  const geo = {
    country: req.headers["x-vercel-ip-country"] || null,
    region: req.headers["x-vercel-ip-country-region"] || null,
    city: req.headers["x-vercel-ip-city"] || null,
    latitude: req.headers["x-vercel-ip-latitude"] || null,
    longitude: req.headers["x-vercel-ip-longitude"] || null,
    timezone: req.headers["x-vercel-ip-timezone"] || null,
    postalCode: req.headers["x-vercel-ip-postal-code"] || null,
  };

  const payload = {
    ts: new Date().toISOString(),
    event,
    meta,
    telegram, // null si fue testing con secret
    geo,
    ua: req.headers["user-agent"] || null,
  };

  console.log("[track]", JSON.stringify(payload));

  return res.status(200).json({ ok: true });
}
