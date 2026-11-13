import { accessEntryMode } from "../../lib/access-entry-mode.js";
import { sendAccessNotice } from "../../lib/access-notices.js";
import { PLAN_DAYS, PLAN_STARS } from "../../lib/access-plans.js";
import { issueFxChatLink, appendFxChatMessage, getFxChatAdminReplyTarget, revokeFxChatByTelegram, hasFxChatConsent, fxChatReply } from "../../lib/fx-chat.js";
﻿          import { Telegraf, Markup } from "telegraf";
          import Redis from "ioredis";
          import winston from "winston";
          import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
          export const config = {
            api: {
              bodyParser: false,
            },
          };
// ======================================================
// LOGGER
// ======================================================
          const logger = winston.createLogger({
            level: "info",
            format: winston.format.json(),
            transports: [new winston.transports.Console()],
          });
// ======================================================
// ENVIRONMENT
// ======================================================
          const BOT_TOKEN = process.env.BOT_TOKEN;
          const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
          const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
          const ADMIN_USER_ID = process.env.TELEGRAM_ADMIN_ID || process.env.ADMIN_USER_ID;
          const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_USER || process.env.TELEGRAM_WEBHOOK_SECRET || "";
          const ADMIN_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_ADMIN || "";
          const REDIS_URL = process.env.REDIS_URL;
          const ZOOM_URL = process.env.ZOOM_URL;
          const TELEGRAM_CALL_URL = process.env.TELEGRAM_CALL_URL;
          const SMOKELANDIA_GROUP_LINK = process.env.SMOKELANDIA_GROUP_LINK || "https://t.me/SmokelandiaFx_bot";
          const USER_GROUP_LINK = process.env.USER_GROUP_LINK || "https://t.me/+v57jkAGn3DA0NWJh";
          const USERFX_SITE_URL = process.env.USERFX_SITE_URL || "https://user18fx.com";
          const SUPABASE_URL = process.env.SUPABASE_URL || "";
          const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
          /*
           * Telegram Mini App / Vault.
           *
           * Example:
           * https://t.me/User18Fx_bot?startapp=vault
           */
          const TELEGRAM_MINI_APP_URL = process.env.TELEGRAM_MINI_APP_URL || `${USERFX_SITE_URL.replace(/\/$/, "")}/vault`;
          const CODE_ENGINE_NAMESPACE = process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
const BOT_CONTACT_ACTIVITY_KEY = CODE_ENGINE_NAMESPACE + ":bot-contacts:last-seen";
const BOT_CONTACT_DATA_PREFIX = CODE_ENGINE_NAMESPACE + ":bot-contacts:user:";
const BOT_CONTACT_OPTOUT_PREFIX = CODE_ENGINE_NAMESPACE + ":bot-contacts:optout:";
const BOT_CONTACT_BLOCK_PREFIX = CODE_ENGINE_NAMESPACE + ":bot-contacts:blocked:";
const BOT_CONTACT_RETENTION_SECONDS = 30 * 24 * 60 * 60;

          const MAX_BODY_BYTES = 1024 * 1024;
          const PAYMENT_TTL_SECONDS = 60 * 60 * 24 * 365;
          const IDENTITY_CODE_TTL_SECONDS = 15 * 60;
// ======================================================
// MEDIA
// ======================================================
          const ASSETS_BASE_URL = `${USERFX_SITE_URL.replace(/\/$/, "")}/assets`;
const ASSET_WELCOME_VIDEO = `${ASSETS_BASE_URL}/FX-Y24V01.mp4`;
const ASSET_VIDEOCALL_IMAGE = `${ASSETS_BASE_URL}/videocall.jpg`;
const ASSET_CHANNELS_VIDEO = `${ASSETS_BASE_URL}/videoSMKLFX.mp4`;
const ASSET_SMOKELANDIA_VIDEO = `${ASSETS_BASE_URL}/introSMKL.mp4`;
const ASSET_USERFX_VIDEO = `${ASSETS_BASE_URL}/introFX.mp4`;
const ASSET_GETCODE_IMAGE = `${ASSETS_BASE_URL}/USERFX-ID18V20.jpg`;
const VIDEOCALL_REPLY_MEDIA_URL = process.env.VIDEOCALL_REPLY_MEDIA_URL || ASSET_USERFX_VIDEO;
const VIDEOCALL_REPLY_MEDIA_TYPE = String(process.env.VIDEOCALL_REPLY_MEDIA_TYPE || (/\.(mp4|mov|m4v|webm)(?:\?|$)/i.test(VIDEOCALL_REPLY_MEDIA_URL) ? "video" : "photo")).toLowerCase() === "video" ? "video" : "photo";
// ======================================================
// VAULT WEBSITE RELAY
// ======================================================
const VAULT_WEBHOOK_URL = process.env.VAULT_WEBHOOK_URL || `${USERFX_SITE_URL.replace(/\/$/, "")}/api/telegram/webhook`;
const VAULT_WEBHOOK_SECRET = process.env.VAULT_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || "";
function isVaultPayload(payload) {
  const value = String(payload || "").trim();
  return /^(BSIC|PRX0|VIPX)-/i.test(value);
}
async function relayVaultUpdate(update) {
  if (!VAULT_WEBHOOK_URL || !VAULT_WEBHOOK_SECRET) {
    logger.error("VAULT WEBHOOK CONFIGURATION MISSING", {
      urlPresent: Boolean(VAULT_WEBHOOK_URL),
      secretPresent: Boolean(VAULT_WEBHOOK_SECRET),
    });
    return false;
  }
  try {
    const response = await fetch(VAULT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": VAULT_WEBHOOK_SECRET,
      },
      body: JSON.stringify(update),
      cache: "no-store",
    });
    const text = await response.text();
    logger.info("VAULT UPDATE RELAY", {
      ok: response.ok,
      status: response.status,
      response: text.slice(0, 500),
    });
    return response.ok;
  } catch (error) {
    logger.error("VAULT UPDATE RELAY ERROR", {
      message: error?.message || null,
      stack: error?.stack || null,
    });
    return false;
  }
}
// ======================================================
// REQUIRED BOT TOKENS
// ======================================================
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing");
}
if (!ADMIN_BOT_TOKEN) {
  throw new Error("ADMIN_BOT_TOKEN is missing");
}
// ======================================================
// BOTS
// ======================================================
const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);
function syntheticUsernameForId(id) {
  const value = String(id || "").trim();
  return /^\d{5,20}$/.test(value) ? `id_${value}` : "";
}

function visibleSpecialText(value) {
  return String(value || "")
    .replace(/TGMX-([A-HJ-NP-Z2-9]{4})/g, "SPCL-$1")
    .replace(/\bTGMX\b/g, "SPCL")
    .replace(/@id_(\d{5,20})\b/g, "ID $1")
    .replace(/\bid_(\d{5,20})\b/g, "ID $1");
}

bot.telegram.webhookReply = false;
adminBot.telegram.webhookReply = false;

bot.use(async (ctx, next) => {
  if (ctx.chat?.type === "private" && ctx.from?.id) {
    try {
      const client = await ensureRedis();
      if (client) {
        const userId = String(ctx.from.id);
        const username = String(ctx.from.username || "").toLowerCase();
        const started = /^\/start(?:@\w+)?(?:\s|$)/i.test(String(ctx.message?.text || ""));
        if (username) await client.set(CODE_ENGINE_NAMESPACE + ":private-recipient:" + username, userId);
        if (started) await client.del(BOT_CONTACT_OPTOUT_PREFIX + userId);
        if (!(await client.exists(BOT_CONTACT_OPTOUT_PREFIX + userId))) {
          const now = Date.now();
          const data = JSON.stringify({
            id: userId,
            username: username ? "@" + username : "",
            firstName: String(ctx.from.first_name || "").slice(0, 80),
            lastSeen: now,
          });
          await client.multi()
            .zadd(BOT_CONTACT_ACTIVITY_KEY, now, userId)
            .zremrangebyscore(BOT_CONTACT_ACTIVITY_KEY, "-inf", now - BOT_CONTACT_RETENTION_SECONDS * 1000)
            .set(BOT_CONTACT_DATA_PREFIX + userId, data, "EX", BOT_CONTACT_RETENTION_SECONDS)
            .del(BOT_CONTACT_BLOCK_PREFIX + userId)
            .exec();
        }
      }
    } catch (error) {
      logger.warn("BOT CONTACT ACTIVITY TRACKING FAILED", { message: error?.message });
    }
  }
  return next();
});

// A FREE reply is attached to a specific admin prompt; other chat replies keep their own routes.
adminBot.use(async (ctx, next) => {
  const answer = ctx.message?.text;
  const replyId = ctx.message?.reply_to_message?.message_id;
  if (!isAdmin(ctx) || !replyId || typeof answer !== "string") return next();
  const client = await ensureRedis();
  if (!client) return next();
  const key = CODE_ENGINE_NAMESPACE + ":admin-message-free:" + ctx.chat.id + ":" + ctx.from.id + ":" + replyId;
  const recipientId = await client.get(key);
  if (!recipientId) return next();
  if (answer.trim() === "/cancel") {
    await client.del(key);
    return ctx.reply("FREE cancelado.");
  }
  const text = answer.trim();
  if (!text || text.length > 3000) return ctx.reply("Escribe un mensaje de 1 a 3000 caracteres, o /cancel.");
  const lock = key + ":sending";
  if (await client.set(lock, "1", "EX", 600, "NX") !== "OK") {
    return ctx.reply("Ya se está procesando esta respuesta.");
  }
  const result = await deliverAdminMessage(recipientId, text);
  if (result.ok) {
    await client.del(key);
    return ctx.reply("✔ FREE enviado a " + formatAdminRecipient(recipientId, result.contact) + ".");
  }
  await client.del(lock);
  return ctx.reply("✘ " + result.reason);
});
// One consent-gated chat, shared with the existing Telegram webhook.
bot.use(async (ctx, next) => {
  if (ctx.chat?.type === "private" && ctx.from?.id && typeof ctx.message?.text === "string") {
    try {
      await appendFxChatMessage(String(ctx.from.id), "user", ctx.message.text, "telegram", "tg-in:" + ctx.update?.update_id);
    } catch (error) {
      logger.warn("FX CHAT USER MIRROR FAILED", { message: error?.message || "unknown" });
    }
  }
  return next();
});
adminBot.use(async (ctx, next) => {
  if (!isAdmin(ctx) || !ctx.message?.reply_to_message?.message_id || typeof ctx.message?.text !== "string") return next();
  const adminChatId = ctx.chat?.id;
  try {
    const recipientId = await getFxChatAdminReplyTarget(adminChatId, ctx.message.reply_to_message.message_id);
    if (!recipientId) return next();
    const message = ctx.message.text.trim().slice(0, 1000);
    if (!message) return;
    await bot.telegram.sendMessage(recipientId, "USER FX SUPPORT:\n" + message);
    await appendFxChatMessage(recipientId, "support", message, "telegram:admin", "admin-webchat:" + adminChatId + ":" + ctx.message.message_id);
    return ctx.reply("Reply delivered to web chat and Telegram.");
  } catch (error) {
    logger.error("FX WEBCHAT ADMIN REPLY FAILED", { message: error?.message || "unknown" });
    return ctx.reply("The reply couldn't be delivered.");
  }
});
// ======================================================
const accessEntryModes = new Map();
for (const [targetBot, botId] of [[bot, "user"], [adminBot, "admin"]]) {
  const mode = accessEntryMode({
    redis: ensureRedis, namespace: CODE_ENGINE_NAMESPACE, botId, isAdmin,
    normalizeUsername: normalizeTelegramFxUsername,
    showPanel: (ctx, username) => showManualAccess(ctx, username),
    exitText: "EXIT", styledExitText: "ᴇxɪᴛ",
  });
  accessEntryModes.set(targetBot, mode);
  targetBot.use(manualTextMiddleware);
  targetBot.use((ctx, next) => {
    ctx.state.accessEntryMode = mode;
    return mode.middleware(ctx, next);
  });
}

// USER BOT VOICE · NATIVE GEN-Z ENGLISH + SMALL CAPS
// Applies to every outgoing USER-bot message/caption/button.
// Preserves HTML, URLs, @usernames and private access codes.
// ======================================================
const FX_SMALL_CAPS = Object.freeze({
  a: "ᴀ",
  b: "ʙ",
  c: "ᴄ",
  d: "ᴅ",
  e: "ᴇ",
  f: "ꜰ",
  g: "ɢ",
  h: "ʜ",
  i: "ɪ",
  j: "ᴊ",
  k: "ᴋ",
  l: "ʟ",
  m: "ᴍ",
  n: "ɴ",
  o: "ᴏ",
  p: "ᴘ",
  q: "ǫ",
  r: "ʀ",
  s: "ꜱ",
  t: "ᴛ",
  u: "ᴜ",
  v: "ᴠ",
  w: "ᴡ",
  x: "x",
  y: "ʏ",
  z: "ᴢ",
});

function fxGenZRewrite(value = "") {
  return String(value)
    .replace(/\bPlease try again\b/gi, "Run it back in a sec")
    .replace(/\bPlease\b/gi, "Just")
    .replace(/\bUnable to\b/gi, "Couldn't")
    .replace(/\bYou already have\b/gi, "You've already got")
    .replace(/\bYou need to\b/gi, "You'll need to")
    .replace(/\bYou need\b/gi, "You'll need")
    .replace(/\bThank you\b/gi, "Appreciate you")
    .replace(/\bTry again\b/gi, "Run it back")
    .replace(/\bSomething went wrong\b/gi, "That didn't land")
    .replace(/\bInvalid code\b/gi, "That code isn't hitting")
    .replace(/\bAccess denied\b/gi, "You're not cleared for this yet")
    .replace(/\bNot authorized\b/gi, "You're not cleared for this yet")
    .replace(/\bRequest sent\b/gi, "You're in — request sent")
    .replace(/\bPayment confirmed\b/gi, "Payment locked in")
    .replace(/\bPayment received\b/gi, "Payment locked in")
    .replace(/\bExpired\b/gi, "That one timed out")
    .replace(/\bCode expired\b/gi, "That code timed out");
}

function fxSmallCapsSegment(value = "") {
  return String(value).replace(/[A-Za-z]/g, (char) => {
    const lower = char.toLowerCase();
    return FX_SMALL_CAPS[lower] || char;
  });
}

function fxBotTone(value = "") {
  const text = fxGenZRewrite(value);

  const protectedToken = /(<[^>]+>|https?:\/\/[^\s<]+|t\.me\/[^\s<]+|@[A-Za-z0-9_]+|(?:TGMX|SPCL|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4}|FXCHAT-[A-F0-9]{20})/g;

  return text
    .split(protectedToken)
    .map((part) => {
      if (!part) return part;

      protectedToken.lastIndex = 0;
      if (protectedToken.test(part)) {
        protectedToken.lastIndex = 0;
        return part;
      }

      protectedToken.lastIndex = 0;
      return fxSmallCapsSegment(part);
    })
    .join("");
}

function fxStyleReplyMarkup(replyMarkup) {
  if (!replyMarkup || typeof replyMarkup !== "object") {
    return replyMarkup;
  }

  const clone = typeof structuredClone === "function" ? structuredClone(replyMarkup) : JSON.parse(JSON.stringify(replyMarkup));

  const styleButton = (button) => {
    if (button && typeof button.text === "string") {
      button.text = visibleSpecialText(fxBotTone(button.text));
    }
    return button;
  };

  if (Array.isArray(clone.inline_keyboard)) {
    clone.inline_keyboard = clone.inline_keyboard.map((row) => row.map(styleButton));
  }

  if (Array.isArray(clone.keyboard)) {
    clone.keyboard = clone.keyboard.map((row) => row.map(styleButton));
  }

  return clone;
}

const fxOriginalUserCallApi = bot.telegram.callApi.bind(bot.telegram);

bot.telegram.callApi = function fxStyledCallApi(method, payload = {}, signal) {
  const nextPayload = { ...payload };

  for (const field of ["text", "caption", "title", "description"]) {
    if (typeof nextPayload[field] === "string") {
      nextPayload[field] = visibleSpecialText(fxBotTone(nextPayload[field]));
    }
  }

  if (nextPayload.reply_markup && typeof nextPayload.reply_markup === "object") {
    nextPayload.reply_markup = fxStyleReplyMarkup(nextPayload.reply_markup);
  }

  let nextMethod = method;

  if (method === "sendPhoto" && typeof nextPayload.photo === "string" && /\.mp4(?:\?|$)/i.test(nextPayload.photo)) {
    nextMethod = "sendVideo";
    nextPayload.video = nextPayload.photo;
    delete nextPayload.photo;
  }

  return fxOriginalUserCallApi(nextMethod, nextPayload, signal).then((result) => {
    if (nextMethod === "sendMessage" && nextPayload.chat_id && typeof nextPayload.text === "string" && !nextPayload.text.startsWith("USER FX SUPPORT:")) {
      void appendFxChatMessage(String(nextPayload.chat_id), "bot", nextPayload.text, "telegram", "tg-bot:" + nextPayload.chat_id + ":" + result?.message_id)
        .catch((error) => logger.warn("FX CHAT BOT MIRROR FAILED", { message: error?.message || "unknown" }));
    }
    return result;
  });
};
// ======================================================
// TOKEN VALIDATION
// ======================================================
async function validateBotTokens() {
  try {
    const userMe = await bot.telegram.getMe();
    logger.info("USER BOT TOKEN OK", {
      id: userMe.id,
      username: userMe.username,
      firstName: userMe.first_name,
    });
  } catch (error) {
    logger.error("USER BOT TOKEN INVALID", {
      errorCode: error?.response?.error_code || null,
      description: error?.response?.description || null,
      message: error?.message || null,
    });
  }
  try {
    const adminMe = await adminBot.telegram.getMe();
    logger.info("ADMIN BOT TOKEN OK", {
      id: adminMe.id,
      username: adminMe.username,
      firstName: adminMe.first_name,
    });
  } catch (error) {
    logger.error("ADMIN BOT TOKEN INVALID", {
      errorCode: error?.response?.error_code || null,
      description: error?.response?.description || null,
      message: error?.message || null,
    });
  }
}
void validateBotTokens();
// ======================================================
// ENV VALIDATION
// ======================================================
const requiredEnv = {
  BOT_TOKEN,
  ADMIN_BOT_TOKEN,
  ADMIN_CHAT_ID,
  ADMIN_USER_ID,
  WEBHOOK_SECRET,
  ADMIN_WEBHOOK_SECRET,
  REDIS_URL,
  ZOOM_URL,
  TELEGRAM_CALL_URL,
};
const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
}

function getVisitorsSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration");
  }

  if (!globalThis.__userfxVisitorsSupabase) {
    globalThis.__userfxVisitorsSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return globalThis.__userfxVisitorsSupabase;
}

function maskVisitorIp(value) {
  const ip = String(value || "").trim();

  if (!ip) return "—";

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }

  if (ip.includes(":")) {
    return `${ip.split(":").filter(Boolean).slice(0, 2).join(":")}:…`;
  }

  return "—";
}

// ======================================================
// REDIS
// ======================================================
let redis = null;
logger.info("REDIS URL EXISTS", {
  exists: Boolean(REDIS_URL),
});
if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    redis.on("connect", () => {
      logger.info("REDIS CONNECT");
    });
    redis.on("ready", () => {
      logger.info("REDIS READY");
    });
    redis.on("error", (error) => {
      logger.error("REDIS ERROR", {
        message: error?.message,
        stack: error?.stack,
      });
    });
    redis.on("close", () => {
      logger.warn("REDIS CLOSE");
    });
  } catch (error) {
    logger.error("REDIS INIT FAILED", {
      message: error?.message,
      stack: error?.stack,
    });
    redis = null;
  }
}
async function ensureRedis() {
  if (!redis) return null;
  try {
    const status = String(redis.status || "");
    if (status === "wait") {
      await redis.connect();
    }
  } catch (error) {
    logger.error("REDIS CONNECT ERROR", {
      message: error?.message,
    });
  }
  return redis;
}
// ======================================================
// REDIS HELPERS
// ======================================================
async function redisGetJson(key) {
  const client = await ensureRedis();
  if (!client) return null;
  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (error) {
    logger.error("REDIS GET ERROR", {
      key,
      message: error?.message,
    });
    return null;
  }
}
async function redisSetJson(key, value, ttl = null) {
  const client = await ensureRedis();
  if (!client) return false;
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await client.set(key, serialized, "EX", ttl);
    } else {
      await client.set(key, serialized);
    }
    return true;
  } catch (error) {
    logger.error("REDIS SET ERROR", { key, message: error?.message });
    return false;
  }
}
async function redisDelete(key) {
  const client = await ensureRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch (error) {
    logger.error("REDIS DELETE ERROR", { key, message: error?.message });
  }
}
async function scanKeys(pattern) {
  const client = await ensureRedis();
  if (!client) return [];
  const keys = [];
  let cursor = "0";
  try {
    do {
      const result = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = String(result[0]);
      if (result[1]?.length) {
        keys.push(...result[1]);
      }
    } while (cursor !== "0");
    return keys;
  } catch (error) {
    logger.error("REDIS SCAN ERROR", { pattern, message: error?.message });
    return [];
  }
}
// ======================================================
// USER DATA
// ======================================================
async function getPaidUser(userId) {
  return redisGetJson(`paid_user:${String(userId)}`);
}
async function setPaidUser(userId, data) {
  return redisSetJson(`paid_user:${String(userId)}`, data);
}
// ======================================================
// VIDEOCALL DATA
// ======================================================
const VIDEO_REQUEST_TTL = 60 * 60 * 6;
async function getVideoRequest(userId) {
  return redisGetJson(`video_request:${String(userId)}`);
}
async function setVideoRequest(userId, data) {
  return redisSetJson(`video_request:${String(userId)}`, data, VIDEO_REQUEST_TTL);
}
async function deleteVideoRequest(userId) {
  await redisDelete(`video_request:${String(userId)}`);
}
// ======================================================
// PAYMENT IDEMPOTENCY
// ======================================================
function getPaymentKey(chargeId) {
  return `processed_payment:${chargeId}`;
}
async function hasProcessedPayment(chargeId) {
  const client = await ensureRedis();
  if (!chargeId || !client) return false;
  try {
    return Boolean(await client.exists(getPaymentKey(chargeId)));
  } catch (error) {
    logger.error("PAYMENT CHECK ERROR", { chargeId, message: error?.message });
    return false;
  }
}
async function claimPaymentProcessed(chargeId) {
  const client = await ensureRedis();
  if (!chargeId) return false;
  if (!client) return true;
  try {
    const created = await client.set(getPaymentKey(chargeId), "1", "EX", PAYMENT_TTL_SECONDS, "NX");
    return created === "OK";
  } catch (error) {
    logger.error("PAYMENT CLAIM ERROR", { chargeId, message: error?.message });
    return false;
  }
}
async function markPaymentProcessed(chargeId) {
  const client = await ensureRedis();
  if (!chargeId || !client) return false;
  try {
    await client.set(getPaymentKey(chargeId), "1", "EX", PAYMENT_TTL_SECONDS);
    return true;
  } catch (error) {
    logger.error("PAYMENT MARK ERROR", { chargeId, message: error?.message });
    return false;
  }
}
async function releasePaymentClaim(chargeId) {
  if (!chargeId) return;
  await redisDelete(getPaymentKey(chargeId));
}
// ======================================================
// PLAN CONSTANTS
// ======================================================
const BASIC_STARS_PRICE = PLAN_STARS.basic;
const PRO_STARS_PRICE = PLAN_STARS.pro;
const VIP_STARS_PRICE = PLAN_STARS.vip;
const STARS_130_PAYLOAD = "videocall_access_130";
const STARS_130_PRICE = 130;
const BASIC_PAYLOAD = "basic";
const PRO_PAYLOAD = "pro";
const VIP_PAYLOAD = "vip";
const TIER_BASIC = "ʙᴀsɪᴄ";
const TIER_PRO = "ᴘʀᴏ";
const TIER_VIP = "ᴠɪᴘ";
// ======================================================
// PLAN CONFIGURATION
// ======================================================
const PLAN_CONFIG = {
  basic: {
    id: "basic",
    name: "BASIC",
    prefix: "BSIC",
    stars: BASIC_STARS_PRICE,
    maxAccesses: null,
    days: PLAN_DAYS.basic,
    features: { oncam: true, rec: false, chat: true, multimedia: false, stage: false },
    tier: TIER_BASIC,
  },
  pro: {
    id: "pro",
    name: "PRO",
    prefix: "PRX0",
    stars: PRO_STARS_PRICE,
    maxAccesses: null,
    days: PLAN_DAYS.pro,
    features: { oncam: true, rec: true, chat: true, multimedia: true, stage: false },
    tier: TIER_PRO,
  },
  vip: {
    id: "vip",
    name: "VIP",
    prefix: "VIPX",
    stars: VIP_STARS_PRICE,
    days: PLAN_DAYS.vip,
    features: { oncam: true, rec: true, chat: true, multimedia: true, stage: true },
    maxAccesses: null,
    tier: TIER_VIP,
  },
  special: {
    id: "special", name: "SPECIAL", prefix: "SPCL", stars: 0,
    days: null, maxAccesses: null,
    features: { oncam: false, rec: false, chat: false, multimedia: true, stage: true },
  },
};
// ======================================================
// REQUEST STATUS
// ======================================================
const REQUEST_STATUS = {
  WAITING_CONSENT: "waiting_consent",
  WAITING_PHOTO: "waiting_photo",
  AWAITING_ADMIN: "awaiting_admin",
  AWAITING_PAYMENT: "awaiting_payment",
  PAID: "paid",
  APPROVED: "approved",
};
// ======================================================
// BUTTONS
// ======================================================
const BTN_VIDEOCALL = "ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_VIP = "👑 ᴠɪᴘ";
const BTN_SPCL = "✦ ꜱᴘᴄʟ";
const BTN_BASIC = "🌹 ʙᴀꜱɪᴄ";
const BTN_PRO = "🔥 ᴘʀᴏ";
const BTN_CHANNELS = "ᴄʜᴀɴɴᴇʟꜱ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";
const BTN_ZOOM = "🟦 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "💬 ᴛᴇʟᴇɢʀᴀᴍ";
const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_BACK_MENU = "↽ ʙᴀᴄᴋ";
const BTN_GALLERY = "📸 ɢᴀʟʟᴇʀʏ";
const BTN_GALLERY_PREV = "❮ ᴘʀᴇᴠ";
const BTN_GALLERY_NEXT = "ɴᴇxᴛ ❯";
const BTN_GALLERY_CLOSE = "✕ ᴄʟᴏꜱᴇ";
const PUBLIC_GALLERY_SESSION_SECONDS = 60 * 60;
const PUBLIC_GALLERY_PHOTOS = Array.from({ length: 7 }, (_, i) => `${ASSETS_BASE_URL}/album/PRVW/PRVW-${String(i + 1).padStart(2, "0")}.jpg`);
const BTN_SMOKELANDIA = "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "𝐔𝐬ᴇʀ 🜲∓ҳ";
const BTN_PENDING_REQUEST = "ʀᴇǫᴜᴇꜱᴛ";
const BTN_GET_CODE = "ɢᴇᴛ ᴄᴏᴅᴇ";
const BTN_OPEN_VAULT = "🔐 ᴏᴘᴇɴ ᴠᴀᴜʟᴛ";
const BTN_WEBSITE = "🔠ᴇɴᴛᴇʀ-ᴄᴏᴅᴇ";
// ======================================================
// UTILITIES
// ======================================================
function escapeHtml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function getUserMeta(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "No name";
  const rawUsername = from?.username || syntheticUsernameForId(from?.id);
  const username = rawUsername ? `@${rawUsername}` : "sin_username";
  return {
    fullName,
    username,
    id: String(from?.id || ""),
  };
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getErrorStack(error) {
  if (error instanceof Error) {
    return error.stack || null;
  }
  return null;
}
function getTelegramError(error) {
  return {
    errorCode: error?.response?.error_code || null,
    description: error?.response?.description || null,
    message: error?.message || null,
    parameters: error?.response?.parameters || null,
  };
}
function secureCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
function isAdmin(ctx) {
  return String(ctx.from?.id || "") === String(ADMIN_USER_ID);
}
// ======================================================
// TELEGRAMFX ACCESS / SUPABASE
// ======================================================
const TELEGRAMFX_FIELDS = [
  ["telegramfx_access", "ᴛᴇʟᴇɢʀᴀᴍꜰx", 1],
  ["gallery_access", "ɢᴀʟʟᴇʀʏ", 2],
  ["private_chat_access", "ᴄʜᴀᴛ", 4],
  ["private_call_access", "ᴘʀɪᴠ", 8],
  ["telegram_group_access", "ɢʀᴏᴜᴘ", 16],
];
function normalizeTelegramFxUsername(value = "") {
  const raw = String(value || "")
    .trim()
    .replace(/^@+/, "");
  if (!/^[A-Za-z0-9_]{3,32}$/.test(raw)) return null;
  return { display: `@${raw}`, normalized: raw.toLowerCase() };
}
function telegramFxMask(record) {
  return TELEGRAMFX_FIELDS.reduce((mask, [field, , bit]) => (record?.[field] ? mask | bit : mask), 0);
}
function telegramFxMaskToRecord(mask) {
  const out = {};
  for (const [field, , bit] of TELEGRAMFX_FIELDS) out[field] = Boolean(mask & bit);
  return out;
}
function telegramFxPanelText(username, mask, saved = true) {
  const rows = TELEGRAMFX_FIELDS.map(([, label, bit]) => `${label}: ${mask & bit ? "✔" : "✘"}`).join("\n");
  return `🔐 <b>ᴛᴇʟᴇɢʀᴀᴍ𝐅𝐗 ᴀᴄᴄᴇꜱꜱ</b>\n\n<b>${escapeHtml(username)}</b>\n\n${rows}\n\n${saved ? "ꜱᴛᴀᴛᴇ ꜱᴀᴠᴇᴅ" : "ᴜɴꜱᴀᴠᴇᴅ ᴄʜᴀɴɢᴇꜱ"}`;
}
function telegramFxPanelKeyboard(usernameNormalized, mask) {
  const buttonFor = (label, bit) => Markup.button.callback(`${mask & bit ? "✔" : "✘"} ${label}`, `tfx_toggle_${usernameNormalized}_${mask ^ bit}`);
  const telegramfx = buttonFor("ᴛᴇʟᴇɢʀᴀᴍꜰx", 1);
  const gallery = buttonFor("ɢᴀʟʟᴇʀʏ", 2);
  const chat = buttonFor("ᴄʜᴀᴛ", 4);
  const priv = buttonFor("ᴘʀɪᴠ", 8);
  const group = buttonFor("ɢʀᴏᴜᴘ", 16);
  const save = Markup.button.callback("💾 ꜱᴀᴠᴇ", `tfx_save_${usernameNormalized}_${mask}`);
  const revoke = Markup.button.callback("⛔ ʀᴇᴠᴏᴋᴇ ᴀʟʟ", `tfx_revoke_${usernameNormalized}_0`);
  return Markup.inlineKeyboard([[telegramfx], [gallery, chat], [priv, group], [save, revoke], [Markup.button.callback("✉ Enviar aviso", `tfx_notify_${usernameNormalized}`)]]);
}
async function telegramFxRequest(pathname, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  }
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text.slice(0, 500)}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
async function getTelegramFxAccess(usernameNormalized) {
  const q = encodeURIComponent(usernameNormalized);
  const rows = await telegramFxRequest(`telegramfx_access?username_normalized=eq.${q}&select=*&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}
async function saveTelegramFxAccess(usernameNormalized, mask, admin) {
  const current = await getTelegramFxAccess(usernameNormalized);
  const username = current?.username || `@${usernameNormalized}`;
  const permissions = telegramFxMaskToRecord(mask);
  const payload = {
    username,
    username_normalized: usernameNormalized,
    ...permissions,
    enabled: mask !== 0,
    gallery_scope: permissions.gallery_access ? (current?.gallery_scope && current.gallery_scope !== "none" ? current.gallery_scope : "selected") : "none",
  };
  if (current) {
    await telegramFxRequest(`telegramfx_access?username_normalized=eq.${encodeURIComponent(usernameNormalized)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
  } else {
    await telegramFxRequest("telegramfx_access", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
  }

  await telegramFxRequest("telegramfx_access_audit", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      username,
      username_normalized: usernameNormalized,
      action: current ? "update" : "create",
      changes: permissions,
      admin_user_id: String(admin?.id || ""),
      admin_username: admin?.username ? `@${admin.username}` : null,
    }),
  });
  return { ...payload };
}
async function revokeTelegramFxAccess(usernameNormalized, admin) {
  const current = await getTelegramFxAccess(usernameNormalized);
  const username = current?.username || `@${usernameNormalized}`;
  const payload = {
    telegramfx_access: false,
    gallery_access: false,
    private_chat_access: false,
    private_call_access: false,
    telegram_group_access: false,
    enabled: false,
    gallery_scope: "none",
  };

  if (current) {
    await telegramFxRequest(`telegramfx_access?username_normalized=eq.${encodeURIComponent(usernameNormalized)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
  } else {
    await telegramFxRequest("telegramfx_access", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ username, username_normalized: usernameNormalized, ...payload }),
    });
  }
  await telegramFxRequest("telegramfx_access_audit", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      username,
      username_normalized: usernameNormalized,
      action: "revoke",
      changes: payload,
      admin_user_id: String(admin?.id || ""),
      admin_username: admin?.username ? `@${admin.username}` : null,
    }),
  });
}

async function listTelegramFxUsers(limit = 50) {
  return telegramFxRequest(`telegramfx_access?select=username,telegramfx_access,gallery_access,private_chat_access,private_call_access,telegram_group_access,enabled,updated_at&order=updated_at.desc&limit=${limit}`);
}
function getCommandArg(ctx, index = 0) {
  const parts = String(ctx.message?.text || "")
    .trim()
    .split(/\s+/)
    .slice(1);
  return parts[index] || "";
}
async function typing(ctx) {
  try {
    await ctx.sendChatAction("typing");
    await sleep(300);
  } catch {}
}
async function sendMediaSafe(ctx, kind, url, extra = {}) {
  try {
    if (kind === "video") {
      await ctx.replyWithVideo(url, extra);
      return;
    }
    await ctx.replyWithPhoto(url, extra);
  } catch (error) {
    logger.error("ꜱᴇɴᴅ ᴍᴇᴅɪᴀ ᴇʀʀᴏʀ", { kind, url, ...getTelegramError(error) });
  }
}
//// BUTTON TRACKING //
async function trackButtonClick(ctx, buttonName) {
  try {
    const client = await ensureRedis();
    if (!client) return;
    const user = getUserMeta(ctx.from);
    if (!user.id) return;
    if (isAdmin(ctx) || String(user.username || "").replace(/^@/, "").toLowerCase() === "user18fx") return;
    const data = {
      fullName: user.fullName,
      username: user.username,
      id: user.id,
      button: buttonName,
      clickedAt: new Date().toISOString(),
    };
    await client.set(`button_click:${user.id}:${Date.now()}`, JSON.stringify(data), "EX", 60 * 60 * 24 * 30);
  } catch (error) {
    logger.error("ᴛʀᴀᴄᴋ ʙᴜᴛᴛᴏɴ ᴇʀʀᴏʀ", { message: error?.message });
  }
}
//// RATE LIMIT //
async function checkRateLimit(userId, limit = 3, windowSeconds = 300) {
  const client = await ensureRedis();
  if (!client) return true;
  try {
    const key = `rate_limit:videocall:${userId}`;
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    return count <= limit;
  } catch (error) {
    logger.error("ʀᴀᴛᴇ ʟɪᴍɪᴛ ᴇʀʀᴏʀ", { message: error?.message });
    return true;
  }
}
//// CENTRAL CODE ENGINE //
function randomCodePart(length = 4) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const index = crypto.randomInt(0, alphabet.length);
    result += alphabet[index];
  }
  return result;
}

// ======================================================
// TGMX IDENTITY CODE ENGINE
// TGMX verifies Telegram identity only. It grants no paid vault access.
// ======================================================
function getIdentityCodeKey(code) {
  return `${CODE_ENGINE_NAMESPACE}:identity-code:${String(code || "")
              .trim()
              .toUpperCase()}`;
}
function getIdentityUserKey(userId) {
  return `${CODE_ENGINE_NAMESPACE}:identity-user:${String(userId)}`;
}
async function generateIdentityCode(ctx, options = {}) {
  const userId = String(ctx.from?.id || "");
  const parsedUsername = normalizeTelegramFxUsername(ctx.from?.username || syntheticUsernameForId(ctx.from?.id));
  const replaceExisting = Boolean(options.replaceExisting);

  if (!userId) {
    throw new Error("ᴛᴇʟᴇɢʀᴀᴍ ᴜꜱᴇʀ ɪᴅ ᴍɪꜱꜱɪɴɢ");
  }
  if (!parsedUsername) {
    await ctx.reply("⚠️ʏᴏᴜ ɴᴇᴇᴅ ᴀ ᴛᴇʟᴇɢʀᴀᴍ @ᴜꜱᴇʀɴᴀᴍᴇ ʙᴇꜰᴏʀᴇ ʀᴇǫᴜᴇꜱᴛɪɴɢ ᴀɴ ɪᴅᴇɴᴛɪᴛʏ ᴋᴇʏ. ꜱᴇᴛ ᴏɴᴇ ɪɴ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴇᴛᴛɪɴɢꜱ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.");
    return null;
  }

  const access = await getTelegramFxAccess(parsedUsername.normalized);
  if (!access || !access.enabled || !access.telegramfx_access) {
    await ctx.reply("⛔ Tu cuenta de Telegram no tiene acceso SPCL activo. Puedes solicitarlo enviándome un DM.", getSpclRequestKeyboard());
    return null;
  }

  const client = await ensureRedis();
  if (!client) {
    throw new Error("Redis is required for TGMX generation");
  }

  const userKey = getIdentityUserKey(userId);
  const previousCode = await client.get(userKey);
  if (previousCode) {
    const previousRaw = await client.get(getIdentityCodeKey(previousCode));
    if (previousRaw) {
      try {
        const previousRecord = JSON.parse(previousRaw);
        if (previousRecord.status === "consumed" && !replaceExisting) {
          await ctx.reply("✔ ʏᴏᴜʀ ɪᴅᴇɴᴛɪᴛʏ ᴄᴏᴅᴇ ʜᴀꜱ ᴀʟʀᴇᴀᴅʏ ʙᴇᴇɴ ᴜꜱᴇᴅ.");
          return null;
        }
        if (previousRecord.status === "active" && !replaceExisting) {
          return previousRecord;
        }
      } catch {}
    }
    await client.del(getIdentityCodeKey(previousCode));
    await client.del(userKey);
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const code = `TGMX-${randomCodePart(4)}`;
    const key = getIdentityCodeKey(code);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + IDENTITY_CODE_TTL_SECONDS * 1000);
    const record = {
      code,
      purpose: "telegram_identity",
      userId,
      telegramUsername: parsedUsername.normalized,
      status: "active",
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const created = await client.set(key, JSON.stringify(record), "EX", IDENTITY_CODE_TTL_SECONDS, "NX");

    if (created === "OK") {
      await client.set(userKey, code, "EX", IDENTITY_CODE_TTL_SECONDS);
      logger.info("TGMX IDENTITY CODE GENERATED", {
        userId,
        username: parsedUsername.display,
      });
      return record;
    }
  }

  throw new Error("ᴜɴᴀʙʟᴇ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ᴜɴɪǫᴜᴇ ᴛɢᴍx ɪᴅᴇɴᴛɪᴛʏ ᴄᴏᴅᴇ");
}
async function sendIdentityCode(ctx, options = {}) {
  try {
    await trackButtonClick(ctx, options.replaceExisting ? "ᴛɢᴍx ꜱᴇɴᴅ ᴀɢᴀɪɴ" : "ᴛɢᴍx ɪᴅᴇɴᴛɪᴛʏ");
    const record = await generateIdentityCode(ctx, options);
    if (!record) return;

    const username = normalizeTelegramFxUsername(ctx.from?.username || syntheticUsernameForId(ctx.from?.id));
    const returnUrl = `${USERFX_SITE_URL.replace(/\/$/, "")}/?identity=1#/private-room-access`;
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback("↻ ꜱᴇɴᴅ ᴀɢᴀɪɴ", `tgmx_resend_${record.code}`), Markup.button.webApp("ᴇɴᴛᴇʀ ᴄᴏᴅᴇ", returnUrl)]]);
    await ctx.reply(`🔐 <b>ᴛᴇʟᴇɢʀᴀᴍ ɪᴅᴇɴᴛɪᴛʏ ᴋᴇʏ</b>\n\n` + `${escapeHtml(username?.display || "")}` + `\n\n⇀ SPCL-   <code>${escapeHtml(record.code.slice(-4))}</code>` + `\n\nᴛʜɪꜱ ɪꜱ ᴀ ꜱᴘᴇᴄɪᴀʟ ᴄᴏᴅᴇ, ᴇɴᴊᴏʏ ɪᴛ, ɪꜰ ʏᴏᴜ ʜᴀᴠᴇ ᴀɴʏ ǫᴜᴇꜱᴛɪᴏɴꜱ, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ.` + `\n𝚆𝙴𝙻𝙲𝙾𝙼𝙴, 𝙺𝙴𝙴𝙿 𝙸𝚃 𝙻𝙸𝚃` + `\n\n⏱ ᴇxᴘɪʀᴇꜱ ɪɴ 𝟭𝟱 ᴍɪɴᴜᴛᴇꜱ ᴀɴᴅ ᴄᴀɴ ʙᴇ ᴜꜱᴇᴅ ᴏɴᴄᴇ.`, { parse_mode: "HTML", reply_markup: keyboard.reply_markup });
  } catch (error) {
    logger.error("T𝙶𝙼𝚇 𝙸𝙳𝙴𝙽𝚃𝙸𝚃𝚈 𝙴𝚁𝚁𝙾𝚁", {
      userId: String(ctx.from?.id || ""),
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.reply("✘ ᴜɴᴀʙʟᴇ ᴛᴏ ᴄʀᴇᴀᴛᴇ ʏᴏᴜʀ ᴛᴇʟᴇɢʀᴀᴍ ɪᴅᴇɴᴛɪᴛʏ ᴋᴇʏ ʀɪɢʜᴛ ɴᴏᴡ.").catch(() => {});
  }
}
function getPlanFromPayload(payload) {
  if (payload === BASIC_PAYLOAD) {
    return PLAN_CONFIG.basic;
  }
  if (payload === PRO_PAYLOAD) {
    return PLAN_CONFIG.pro;
  }
  if (payload === VIP_PAYLOAD) {
    return PLAN_CONFIG.vip;
  }
  return null;
}
function getCodeKey(code) {
  return `${CODE_ENGINE_NAMESPACE}:code:${code}`;
}
function getUserCodeIndexKey(userId) {
  return `${CODE_ENGINE_NAMESPACE}:user:${userId}:codes`;
}
async function generateAccessCode(planId, source, userId, chargeId = null, recipientUsername = null) {
  const client = await ensureRedis();
  if (!client) {
    throw new Error("Redis is required for code generation");
  }
  const plan = PLAN_CONFIG[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = `${plan.prefix}-${randomCodePart(4)}`;
    const key = getCodeKey(code);
    const record = {
      code,
      planId: plan.id,
      plan: plan.name,
      prefix: plan.prefix,
      stars: plan.stars,
      days: plan.days,
      features: { ...plan.features },
      unlimited: plan.days === null,
      expiresAt: null,
      activationPending: plan.days !== null,
      maxAccesses: plan.maxAccesses,
      usedAccesses: 0,
      remainingAccesses: plan.maxAccesses,
      unlimitedAccess: plan.maxAccesses === null,
      source,
      userId: String(userId),
      telegramUsername: recipientUsername,
      chargeId,
      status: "active",
      createdAt: new Date().toISOString(),
      redeemedAt: null,
      redeemedBy: null,
    };
    const created = await client.set(key, JSON.stringify(record), "NX");
    if (created === "OK") {
      await client.sadd(getUserCodeIndexKey(String(userId)), code);
      logger.info("ᴀᴄᴄᴇꜱꜱ ᴄᴏᴅᴇ ɢᴇɴᴇʀᴀᴛᴇᴅ", { planId, source, userId });
      return record;
    }
  }
  throw new Error("ᴜɴᴀʙʟᴇ ᴛᴏ ɢᴇɴᴇʀᴀᴛᴇ ᴜɴɪǫᴜᴇ ᴀᴄᴄᴇꜱꜱ ᴄᴏᴅᴇ");
}
async function getAccessCode(code) {
  const normalized = String(code || "")
    .trim()
    .toUpperCase();
  if (!normalized) {
    return null;
  }
  return redisGetJson(getCodeKey(normalized));
}
async function validateAccessCode(code) {
  const record = await getAccessCode(code);
  if (!record) {
    return { valid: false, reason: "not_found" };
  }
  if (record.status !== "active") {
    return { valid: false, reason: "not_active", record };
  }
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
    return { valid: false, reason: "expired", record };
  }
  const maxAccesses = record.maxAccesses === null ? null : Number(record.maxAccesses);
  const usedAccesses = Math.max(0, Number(record.usedAccesses) || 0);
  if (maxAccesses !== null && usedAccesses >= maxAccesses) {
    return { valid: false, reason: "no_accesses_remaining", record };
  }
  return { valid: true, record };
}
//// VAULT BUTTON //
function getOpenVaultKeyboard(code = "") {
  const baseUrl = String(TELEGRAM_MINI_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  const separator = baseUrl.includes("?") ? "&" : "?";
  const url = code ? `${baseUrl}${separator}code=${encodeURIComponent(String(code).trim().toUpperCase())}` : baseUrl;
  const isDirectHttps = /^https:\/\//i.test(url) && !/^https:\/\/t\.me\//i.test(url);
  return Markup.inlineKeyboard([[isDirectHttps ? Markup.button.webApp(BTN_OPEN_VAULT, url) : Markup.button.url(BTN_OPEN_VAULT, url)]]);
}
//// KEYBOARDS //
function getMainKeyboard() {
  return Markup.keyboard([
    [BTN_VIDEOCALL, BTN_GET_CODE],
    [BTN_CHANNELS, BTN_GALLERY],
    [BTN_REFRESH],
  ]).resize();
}
function getAccessKeyboard() {
  return Markup.keyboard([[BTN_BASIC, BTN_PRO], [BTN_VIP, BTN_SPCL], [BTN_BACK_MENU, Markup.button.webApp(BTN_WEBSITE, USERFX_SITE_URL)]]).resize();
}
function getPendingPhotoKeyboard() {
  return Markup.keyboard([[BTN_PENDING_REQUEST], [BTN_CANCEL]]).resize();
}
function getApprovedVideocallKeyboard() {
  return Markup.keyboard([[BTN_ZOOM, BTN_TELEGRAM], [BTN_BACK_MENU]]).resize();
}
function getVideocallInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: BTN_ZOOM, url: ZOOM_URL },
        { text: BTN_TELEGRAM, url: TELEGRAM_CALL_URL },
      ],
    ],
  };
}
function getStarsVipKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback(`| ✪ ${VIP_STARS_PRICE} |`, "pay_vip_stars")]]);
}
function getStarsBasicKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback(`| ✪ ${BASIC_STARS_PRICE} |`, "pay_basic_stars")]]);
}
function getStarsProKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback(`| ✪ ${PRO_STARS_PRICE} |`, "pay_pro_stars")]]);
}
function getChannelsKeyboard() {
  return Markup.keyboard([[BTN_SMOKELANDIA, BTN_USERFX_SITE], [BTN_BACK_MENU]]).resize();
}
function getPublicGalleryCaption(index) {
  return [
    "📸 USER FX · PUBLIC GALLERY",
    "Toronto, Canada",
    "Official page: User18fx.com",
    "",
    String(index + 1) + " / " + String(PUBLIC_GALLERY_PHOTOS.length),
  ].join("\n");
}
function getPublicGalleryKeyboard() {
  return Markup.keyboard([
    [BTN_GALLERY_PREV, BTN_GALLERY_NEXT],
    [BTN_GALLERY_CLOSE],
  ]).resize();
}
function getPublicGallerySessionKey(ctx) {
  return CODE_ENGINE_NAMESPACE + ":public-gallery:" + ctx.chat.id + ":" + ctx.from.id;
}
async function openPublicGallery(ctx) {
  const client = await ensureRedis();
  if (!client) return ctx.reply("Gallery is temporarily unavailable. Please try again.", getMainKeyboard());
  const key = getPublicGallerySessionKey(ctx);
  let previous = null;
  try {
    const raw = await client.get(key);
    if (raw) previous = JSON.parse(raw);
  } catch (error) {
    logger.warn("PUBLIC GALLERY SESSION READ FAILED", { message: error?.message });
  }
  const sent = await ctx.replyWithPhoto(PUBLIC_GALLERY_PHOTOS[0], {
    caption: getPublicGalleryCaption(0),
    reply_markup: getPublicGalleryKeyboard().reply_markup,
  });
  try {
    await client.set(key, JSON.stringify({ index: 0, messageId: sent.message_id }), "EX", PUBLIC_GALLERY_SESSION_SECONDS);
  } catch (error) {
    logger.error("PUBLIC GALLERY SESSION SAVE FAILED", { message: error?.message });
    await ctx.telegram.deleteMessage(ctx.chat.id, sent.message_id).catch(() => {});
    return ctx.reply("Gallery is temporarily unavailable. Please try again.", getMainKeyboard());
  }
  if (Number.isInteger(previous?.messageId) && previous.messageId !== sent.message_id) {
    await ctx.telegram.deleteMessage(ctx.chat.id, previous.messageId).catch(() => {});
  }
  return sent;
}
async function handlePublicGalleryNavigation(ctx, action) {
  const client = await ensureRedis();
  if (!client) return ctx.reply("Gallery is temporarily unavailable. Please try again.", getMainKeyboard());
  const key = getPublicGallerySessionKey(ctx);
  const lock = key + ":lock";
  let locked = false;
  try {
    locked = await client.set(lock, "1", "EX", 10, "NX") === "OK";
    if (!locked) {
      await ctx.deleteMessage().catch(() => {});
      return;
    }
    const raw = await client.get(key);
    let session = null;
    try { session = raw ? JSON.parse(raw) : null; } catch {}
    if (!session || !Number.isInteger(session.messageId) || !Number.isInteger(session.index)) {
      await ctx.deleteMessage().catch(() => {});
      return ctx.reply("Gallery session expired. Tap GALLERY to open it again.", getMainKeyboard());
    }
    if (action === BTN_GALLERY_CLOSE) {
      await client.del(key);
      await ctx.deleteMessage().catch(() => {});
      await ctx.telegram.deleteMessage(ctx.chat.id, session.messageId).catch(() => {});
      return ctx.reply("Gallery closed.", getMainKeyboard());
    }
    const delta = action === BTN_GALLERY_NEXT ? 1 : -1;
    const index = (session.index + delta + PUBLIC_GALLERY_PHOTOS.length) % PUBLIC_GALLERY_PHOTOS.length;
    await ctx.telegram.editMessageMedia(ctx.chat.id, session.messageId, undefined, {
      type: "photo",
      media: PUBLIC_GALLERY_PHOTOS[index],
      caption: getPublicGalleryCaption(index),
    });
    await client.set(key, JSON.stringify({ messageId: session.messageId, index }), "EX", PUBLIC_GALLERY_SESSION_SECONDS);
    await ctx.deleteMessage().catch(() => {});
  } catch (error) {
    logger.error("PUBLIC GALLERY NAVIGATION FAILED", getTelegramError(error));
    await ctx.deleteMessage().catch(() => {});
    await ctx.reply("Couldn't switch photos. Tap GALLERY to reopen.", getMainKeyboard()).catch(() => {});
  } finally {
    if (locked) await client.del(lock).catch(() => {});
  }
}
//// ACCESS STATE //
function tierRank(tier) {
  if (tier === TIER_VIP) return 3;
  if (tier === TIER_PRO) return 2;
  if (tier === TIER_BASIC) return 1;
  return 0;
}
async function getAccessState(userId) {
  const entry = await getPaidUser(userId);
  const tier = entry?.tier || null;
  return {
    hasVip: tierRank(tier) >= 3,
    hasPro: tierRank(tier) >= 2,
    hasBasic: tierRank(tier) >= 1,
    entry,
  };
}
//// PANELS //
async function sendMainPanel(ctx) {
  try {
    await typing(ctx);
    await sendMediaSafe(ctx, "ᴠɪᴅᴇᴏ", ASSET_WELCOME_VIDEO);
    await ctx.reply(
      `𓂅 Ŧҳ🜲 |ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ|
ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ.
ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`,
      getMainKeyboard(),
    );
  } catch (error) {
    logger.error("MAIN PANEL ERROR", {
      ...getTelegramError(error),
      userId: ctx.from?.id || null,
      chatId: ctx.chat?.id || null,
    });
    throw error;
  }
}
async function sendMembershipPanel(ctx) {
  await typing(ctx);
  await ctx.reply(
    `ᴀᴄᴄᴇꜱꜱ ᴄᴏᴅᴇ
               🌹 ʙᴀꜱɪᴄ
               🔥 ᴘʀᴏ 
               👑 ᴠɪᴘ`,
    getAccessKeyboard(),
  );
}
async function sendVipPanel(ctx) {
  try {
    await ctx.reply(
      `👑 VIP ACCESS\nCamera · Private chat · Recording · Multimedia · Stage\nUnlimited entries while active\nValid for ${PLAN_DAYS.vip} days from first activation`,
      getStarsVipKeyboard(),
    );
  } catch (error) {
    logger.error("VIP PANEL ERROR", getTelegramError(error));
  }
}
async function sendBasicPanel(ctx) {
  try {
    await ctx.reply(
      `🌹 BASIC ACCESS\nCamera access · Private chat\nUnlimited entries while active\nValid for ${PLAN_DAYS.basic} days from first activation`,
      getStarsBasicKeyboard(),
    );
  } catch (error) {
    logger.error("BASIC PANEL ERROR", getTelegramError(error));
  }
}
async function sendProPanel(ctx) {
  try {
    await ctx.reply(
      `🔥 PRO ACCESS\nCamera · Private chat · Recording · Multimedia\nUnlimited entries while active\nValid for ${PLAN_DAYS.pro} days from first activation`,
      getStarsProKeyboard(),
    );
  } catch (error) {
    logger.error("PRO PANEL ERROR", getTelegramError(error));
  }
}
//// CHANNELS //
async function sendChannelsPanel(ctx) {
  await sendMediaSafe(ctx, "video", ASSET_CHANNELS_VIDEO);
  await ctx.reply(
    `📺ᴄʜᴀɴɴᴇʟꜱ
              ᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`,
    getChannelsKeyboard(),
  );
}
//// REFRESH //
async function sendRefreshPanel(ctx) {
  const { hasVip, hasPro, hasBasic } = await getAccessState(String(ctx.from?.id || ""));
  const tier = hasVip ? "👑 ᴠɪᴘ" : hasPro ? "🔥 ᴘʀᴏ" : hasBasic ? "🌹 ʙᴀꜱɪᴄ" : "ɴᴏ ᴘʟᴀɴ";
  await ctx.reply(
    `↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ
              ᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}`,
    getMainKeyboard(),
  );
}
//// SEND GENERATED CODE //
async function sendGeneratedCode(ctx, record) {
  const safeCode = escapeHtml(record.code);
  const safePlan = escapeHtml(record.plan);
  const keyboard = getOpenVaultKeyboard(record.code);
  await ctx.reply(
    `✔ ᴀᴄᴄᴇꜱꜱ 𝐔𝐍𝐋𝐎𝐂𝐊𝐄𝐃
              ᴘʟᴀɴ: ${safePlan}
              ᴄᴏᴅᴇ:
              <code>${safeCode}</code>
              ᴋᴇᴇᴘ ᴛʜɪꜱ ᴄᴏᴅᴇ ᴛᴏ ᴇɴᴛᴇʀ ᴛʜᴇ ᴠᴀᴜʟᴛ.`,
    { parse_mode: "HTML", reply_markup: keyboard.reply_markup },
  );
}
//// VIDEOCALL FLOW //
const VIDEOCALL_INVITE_TEXT = `ʜᴏʟᴅ ᴜᴘ...
ɪ'ᴍ ᴅᴏᴡɴ ᴛᴏ ᴠɪᴅᴇᴏ ᴄᴀʟʟ ᴡɪᴛʜ ʏᴏᴜ, ʙᴜᴛ ʟᴇᴍᴍᴇ ɢʀᴀʙ ꜱᴏᴍᴇ ᴡᴀᴛᴇʀ ʀᴇᴀʟ ǫᴜɪᴄᴋ. ɢɪᴍᴍᴇ 2 ᴍɪɴꜱ ᴀɴᴅ ɪ'ʟʟ ꜱᴇɴᴅ ʏᴏᴜ ᴛʜᴇ ʟɪɴᴋ.
ᴡᴀɴɴᴀ ꜱᴡᴀᴘ ᴘɪᴄꜱ ɪɴ ᴛʜᴇ ᴍᴇᴀɴᴛɪᴍᴇ?`;

async function openVideocallFlow(ctx) {
  const userId = String(ctx.from?.id || "");
  if (!userId || ctx.chat?.type !== "private") {
    await ctx.reply("🔒 ᴏᴘᴇɴ ᴛʜɪꜱ ꜰʟᴏᴡ ɪɴ ᴀ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ.");
    return;
  }
  try {
    const existing = await getVideoRequest(userId);
    if (existing?.status === REQUEST_STATUS.WAITING_CONSENT) {
      await setVideoRequest(userId, { ...existing, status: REQUEST_STATUS.WAITING_PHOTO });
      await ctx.reply(VIDEOCALL_INVITE_TEXT, getPendingPhotoKeyboard());
      return;
    }
    if (existing && [REQUEST_STATUS.WAITING_PHOTO, REQUEST_STATUS.AWAITING_ADMIN, REQUEST_STATUS.AWAITING_PAYMENT].includes(existing.status)) {
      return await sendPendingVideocallPanel(ctx);
    }
    if (!(await checkRateLimit(userId, 3, 300))) {
      await ctx.reply("⏳ ᴘʟᴇᴀꜱᴇ ᴡᴀɪᴛ ʙᴇꜰᴏʀᴇ ᴛʀʏɪɴɢ ᴀɢᴀɪɴ.");
      return;
    }
    const user = getUserMeta(ctx.from);
    await setVideoRequest(userId, {
      userId,
      fullName: user.fullName,
      username: user.username,
      status: REQUEST_STATUS.WAITING_PHOTO,
      mediaCount: 0,
      replySent: false,
      createdAt: Date.now(),
    });
    await ctx.reply(VIDEOCALL_INVITE_TEXT, getPendingPhotoKeyboard());
    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📞 <b>NEW PRIVATE MEDIA REQUEST</b>\nUsername: ${escapeHtml(user.username)}\nID: ${escapeHtml(userId)}\nAwaiting first photo/video.`,
      { parse_mode: "HTML" },
    ).catch((error) => {
      logger.error("VIDEOCALL ADMIN NOTICE FAILED", getTelegramError(error));
    });
  } catch (error) {
    logger.error("OPEN VIDEOCALL FLOW ERROR", { userId, ...getTelegramError(error), stack: getErrorStack(error) });
  }
}
// Previously issued Telegram buttons cannot be recalled without their message IDs.
bot.action(/^exchange_consent_(\d+)$/, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  if (userId !== String(ctx.match[1]) || ctx.chat?.type !== "private") {
    await ctx.answerCbQuery("ᴛʜɪꜱ ʀᴇǫᴜᴇꜱᴛ ɪꜱɴ'ᴛ ʏᴏᴜʀꜱ.");
    return;
  }
  const pending = await getVideoRequest(userId);
  if (!pending || pending.status !== REQUEST_STATUS.WAITING_CONSENT) {
    await ctx.answerCbQuery("ʀᴇǫᴜᴇꜱᴛ ᴇxᴘɪʀᴇᴅ.");
    return;
  }
  await setVideoRequest(userId, { ...pending, status: REQUEST_STATUS.WAITING_PHOTO });
  await ctx.answerCbQuery("✔ ᴄᴏɴᴛɪɴᴜᴇ.");
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
  await ctx.reply(VIDEOCALL_INVITE_TEXT, getPendingPhotoKeyboard());
});
bot.action(/^exchange_cancel_(\d+)$/, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  if (userId !== String(ctx.match[1])) {
    await ctx.answerCbQuery("ᴛʜɪꜱ ʀᴇǫᴜᴇꜱᴛ ɪꜱɴ'ᴛ ʏᴏᴜʀꜱ.");
    return;
  }
  await deleteVideoRequest(userId);
  await ctx.answerCbQuery("ᴄᴀɴᴄᴇʟʟᴇᴅ.");
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
  await ctx.reply("✖ ᴇxᴄʜᴀɴɢᴇ ᴄᴀɴᴄᴇʟʟᴇᴅ.", getMainKeyboard());
});

//// PENDING VIDEOCALL //
async function sendPendingVideocallPanel(ctx) {
  const userId = String(ctx.from?.id || "");
  if (!userId) return;
  try {
    const pending = await getVideoRequest(userId);
    if (!pending) {
      await ctx.reply("⏳ ɴᴏ ᴀᴄᴛɪᴠᴇ ʀᴇǫᴜᴇꜱᴛ. ᴛᴀᴘ ᴠɪᴅᴇᴏᴄᴀʟʟ ᴛᴏ ꜱᴛᴀʀᴛ.", getMainKeyboard());
      return;
    }
    if (pending.status === REQUEST_STATUS.WAITING_CONSENT) {
      await setVideoRequest(userId, { ...pending, status: REQUEST_STATUS.WAITING_PHOTO });
      await ctx.reply(VIDEOCALL_INVITE_TEXT, getPendingPhotoKeyboard());
      return;
    }
    if (pending.status === REQUEST_STATUS.WAITING_PHOTO) {
      await ctx.reply("📸 ꜱᴇɴᴅ ᴀ ᴘʜᴏᴛᴏ ᴏʀ ᴠɪᴅᴇᴏ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ꜱᴡᴀᴘ.", getPendingPhotoKeyboard());
      return;
    }
    if (pending.status === REQUEST_STATUS.AWAITING_ADMIN) {
      await ctx.reply("👀 ɪ'ᴠᴇ ɢᴏᴛ ʏᴏᴜʀ ᴍᴇᴅɪᴀ. ᴡᴇ ᴄᴀɴ ᴋᴇᴇᴘ ꜱᴡᴀᴘᴘɪɴɢ ᴘɪᴄꜱ/ᴠɪᴅᴇᴏꜱ ᴡʜɪʟᴇ ɪ ᴄʜᴇᴄᴋ ᴄᴀʟʟ ᴀᴠᴀɪʟᴀʙɪʟɪᴛʏ.", getPendingPhotoKeyboard());
      return;
    }
    if (pending.status === REQUEST_STATUS.AWAITING_PAYMENT) {
      await ctx.reply("✪ ᴡᴇ ᴄᴀɴ ᴛᴀᴋᴇ ᴛʜɪꜱ ᴛᴏ ᴀ ᴄᴀʟʟ. ᴄᴏᴍᴘʟᴇᴛᴇ ᴛʜᴇ 130 ꜱᴛᴀʀꜱ ɪɴᴠᴏɪᴄᴇ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ.", getPendingPhotoKeyboard());
      return;
    }
    if ([REQUEST_STATUS.APPROVED, REQUEST_STATUS.PAID].includes(pending.status)) {
      await ctx.reply("📞 ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴀʀᴇ ʀᴇᴀᴅʏ.", { reply_markup: getVideocallInlineKeyboard() });
      return;
    }
    await ctx.reply("⏳ ɴᴏ ᴀᴄᴛɪᴠᴇ ʀᴇǫᴜᴇꜱᴛ.", getMainKeyboard());
  } catch (error) {
    logger.error("PENDING VIDEOCALL PANEL ERROR", { userId, ...getTelegramError(error), stack: getErrorStack(error) });
    await ctx.reply("✘ ᴄᴏᴜʟᴅɴ'ᴛ ᴄʜᴇᴄᴋ ʏᴏᴜʀ ʀᴇǫᴜᴇꜱᴛ.");
  }
}

//// APPROVED VIDEOCALL //
async function sendApprovedVideocallFlow(userId) {
  const targetUserId = String(userId);
  try {
    await bot.telegram.sendMessage(
      targetUserId,
      `👀 ʏᴏᴜ ɢᴏᴛ ᴍʏ ᴀᴛᴛᴇɴᴛɪᴏɴ.

ʀᴇᴀᴅʏ ᴛᴏ ᴛᴀᴋᴇ ᴛʜɪꜱ ᴏꜰꜰ ᴄʜᴀᴛ? ᴘɪᴄᴋ ᴡʜᴇʀᴇ ʏᴏᴜ ᴡᴀɴɴᴀ ᴄᴀʟʟ.`,
      { reply_markup: getVideocallInlineKeyboard() },
    );
    logger.info("VIDEOCALL OPTIONS SENT", { userId: targetUserId });
  } catch (error) {
    logger.error("SEND APPROVED VIDEOCALL ERROR", { userId: targetUserId, ...getTelegramError(error) });
    throw error;
  }
}

//// INVOICES //
async function sendStarsInvoice(telegram, chatId, options) {
  if (!chatId) return;
  await telegram.callApi("sendInvoice", {
    chat_id: chatId,
    title: options.title,
    description: options.description,
    payload: options.payload,
    provider_token: "",
    currency: "XTR",
    prices: [{ label: options.label, amount: options.amount }],
  });
}
async function sendVipInvoice(ctx) {
  const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
  if (!chatId) return;
  await sendStarsInvoice(ctx.telegram, chatId, {
    title: "𝓥ɪᴘ ᴀᴄᴄᴇss",
    description: `Camera, chat, recording, multimedia and stage. ${PLAN_DAYS.vip} days from first activation.`,
    payload: VIP_PAYLOAD,
    label: "ᴠɪᴘ ᴀᴄᴄᴇss",
    amount: VIP_STARS_PRICE,
  });
}
async function sendBasicInvoice(ctx) {
  const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
  if (!chatId) return;
  await sendStarsInvoice(ctx.telegram, chatId, {
    title: "𝐁𝐀𝐒𝐈𝐂 ᴀᴄᴄᴇss",
    description: `Camera and private chat. ${PLAN_DAYS.basic} days from first activation.`,
    payload: BASIC_PAYLOAD,
    label: "ʙᴀꜱɪᴄ ᴀᴄᴄᴇss",
    amount: BASIC_STARS_PRICE,
  });
}
async function sendProInvoice(ctx) {
  const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
  if (!chatId) return;
  await sendStarsInvoice(ctx.telegram, chatId, {
    title: "𝐏𝐑𝐎 ᴀᴄᴄᴇss",
    description: `Camera, chat, recording and multimedia. ${PLAN_DAYS.pro} days from first activation.`,
    payload: PRO_PAYLOAD,
    label: "ᴘʀᴏ ᴀᴄᴄᴇss",
    amount: PRO_STARS_PRICE,
  });
}
async function sendStars130Invoice(userId) {
  await sendStarsInvoice(bot.telegram, String(userId), {
    title: "ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇss",
    description: "ᴀᴄᴄᴇꜱꜱ ᴛᴏ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ꜱᴇʀᴠɪᴄᴇ.",
    payload: STARS_130_PAYLOAD,
    label: "ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇss",
    amount: STARS_130_PRICE,
  });
}
/// SUCCESSFUL PAYMENT //
async function handleSuccessfulPayment(ctx) {
  const payment = ctx.message?.successful_payment;
  if (!payment) return;
  const userId = String(ctx.from?.id || "");
  if (!userId) return;
  const chargeId = payment.telegram_payment_charge_id;
  const payload = payment.invoice_payload;
  logger.info("ꜱᴜᴄᴄᴇꜱꜱꜰᴜʟ ᴘᴀʏᴍᴇɴᴛ", { userId, payload, chargeId });
  if (isVaultPayload(payload)) {
    const relayed = await relayVaultUpdate(ctx.update);
    if (relayed) return;
  }
  const claimed = await claimPaymentProcessed(chargeId);
  if (!claimed) {
    logger.warn("ᴅᴜᴘʟɪᴄᴀᴛᴇ ᴘᴀʏᴍᴇɴᴛ", {
      userId,
      payload,
      chargeId,
      alreadyProcessed: await hasProcessedPayment(chargeId),
    });
    return;
  }
  //// VIDEOCALL //
  if (payload === STARS_130_PAYLOAD) {
    const request = await getVideoRequest(userId);
    if (!request || request.status !== REQUEST_STATUS.AWAITING_PAYMENT) {
      await ctx.reply(
        `⚠️ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ, ʙᴜᴛ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ ᴡᴀꜱ ғᴏᴜɴᴅ.
          ᴘʟᴇᴀꜱᴇ ᴄᴏɴᴛᴀᴄᴛ ꜱᴜᴘᴘᴏʀᴛ.`,
      );
      return;
    }
    try {
      await setVideoRequest(userId, {
        ...request,
        status: REQUEST_STATUS.PAID,
        paidAt: Date.now(),
        telegramPaymentChargeId: chargeId,
      });
      await ctx.reply(
        `✔ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ
              📞ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.`,
        { reply_markup: getVideocallInlineKeyboard() },
      );
    } catch (error) {
      await releasePaymentClaim(chargeId);
      logger.error("𝚅𝙸𝙳𝙴𝙾𝙲𝙰𝙻𝙻 𝙿𝙰𝚈𝙼𝙴𝙽𝚃 𝙷𝙰𝙽𝙳𝙻𝙴 𝙴𝚁𝚁𝙾𝚁", {
        userId,
        chargeId,
        ...getTelegramError(error),
      });
      throw error;
    }
    return;
  }
  //// BASIC / PRO / VIP //
  const plan = getPlanFromPayload(payload);
  if (plan) {
    try {
      const record = await generateAccessCode(plan.id, "telegram", userId, chargeId);
      const existing = await getPaidUser(userId);
      const oldRank = tierRank(existing?.tier || null);
      const newRank = tierRank(plan.tier);
      const effectiveRecord =
        newRank >= oldRank
          ? {
              ...existing,
              telegramPaymentChargeId: chargeId,
              paidAt: Date.now(),
              tier: plan.tier,
              planId: plan.id,
              code: record.code,
              codePrefix: plan.prefix,
              source: "telegram",
            }
          : {
              ...existing,
              telegramPaymentChargeId: chargeId,
              paidAt: Date.now(),
              lastPurchasedPlan: plan.id,
              lastPurchasedCode: record.code,
              source: "telegram",
            };
      await setPaidUser(userId, effectiveRecord);
      await sendGeneratedCode(ctx, record);
      return;
    } catch (error) {
      await releasePaymentClaim(chargeId);
      logger.error("ᴀᴄᴄᴇꜱꜱ ᴄᴏᴅᴇ ɢᴇɴᴇʀᴀᴛɪᴏɴ ᴇʀʀᴏʀ", {
        userId,
        payload,
        chargeId,
        ...getTelegramError(error),
        stack: getErrorStack(error),
      });
      await ctx.reply(`⚠️ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ.
              ᴡᴇ ᴄᴏᴜʟᴅ ɴᴏᴛ ɢᴇɴᴇʀᴀᴛᴇ ʏᴏᴜʀ ᴀᴄᴄᴇꜱꜱ ᴄᴏᴅᴇ ʏᴇᴛ.
              ᴘʟᴇᴀꜱᴇ ᴄᴏɴᴛᴀᴄᴛ ꜱᴜᴘᴘᴏʀᴛ.`);
      return;
    }
  }
  logger.warn("ᴜɴᴋɴᴏᴡɴ ᴘᴀʏᴍᴇɴᴛ ᴘᴀʏʟᴏᴀᴅ", { userId, payload, chargeId });
}
//// GET CODE PANEL //
async function openGetCodePanel(ctx, source = "ᴛᴇʟᴇɢʀᴀᴍ") {
  try {
    await trackButtonClick(ctx, `ɢᴇᴛ ᴄᴏᴅᴇ · ${source}`);
    await sendMediaSafe(ctx, "ᴘʜᴏᴛᴏ", ASSET_GETCODE_IMAGE);
    await ctx.reply("🔐ᴄʜᴏᴏꜱᴇ ʏᴏᴜʀ ᴀᴄᴄᴇꜱꜱ:", getAccessKeyboard());
  } catch (error) {
    logger.error("𝙶𝙴𝚃 𝙲𝙾𝙳𝙴 𝙿𝙰𝙽𝙴𝙻 𝙴𝚁𝚁𝙾𝚁", {
      source,
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.reply("⚠️ᴜɴᴀʙʟᴇ ᴛᴏ ᴏᴘᴇɴ ᴛʜᴇ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ.").catch(() => {});
  }
}

// Website chat linking never grants a paid or SPCL code.
async function sendFxChatLink(ctx) {
  if (ctx.chat?.type !== "private" || !ctx.from?.id || String(ctx.chat.id) !== String(ctx.from.id)) {
    await ctx.reply("Open this command in a private chat with @User18Fx_bot.");
    return;
  }
  try {
    const code = await issueFxChatLink(ctx.from.id, ctx.chat.id);
    await ctx.reply(code
      ? "FX WEB CHAT · ONE-TIME LINK\n\n" + code + "\n\nEnter this code in the USER FX web chat after accepting the terms. Expires in 10 minutes. Keep it private."
      : "Please wait 15 seconds before requesting another chat link.");
  } catch (error) {
    logger.error("FX WEBCHAT LINK FAILED", { message: error?.message || "unknown" });
    await ctx.reply("Chat linking is temporarily unavailable. Try again.");
  }
}
bot.command("webchat", sendFxChatLink);
bot.command("stopchat", async (ctx) => {
  if (ctx.chat?.type !== "private" || !ctx.from?.id) return;
  await revokeFxChatByTelegram(String(ctx.from.id));
  await ctx.reply("Website chat sync turned off. Your synced chat history has been cleared.");
});
bot.command("gallery", async (ctx) => {
  await trackButtonClick(ctx, "public_gallery");
  return openPublicGallery(ctx);
});
bot.command("getcode", async (ctx) => {
  await openGetCodePanel(ctx, "COMMAND");
});
// ===== // TGMX IDENTITY COMMAND ===========================
bot.command("identity", async (ctx) => {
  await sendIdentityCode(ctx);
});
bot.action(/^tgmx_resend_(TGMX-[A-HJ-NP-Z2-9]{4})$/, async (ctx) => {
  const requestedCode = String(ctx.match?.[1] || "")
    .trim()
    .toUpperCase();
  const userId = String(ctx.from?.id || "");
  const parsedUsername = normalizeTelegramFxUsername(ctx.from?.username || syntheticUsernameForId(ctx.from?.id));

  try {
    if (!userId || !parsedUsername) {
      await ctx.answerCbQuery("Unable to verify this request.", { show_alert: true });
      return;
    }

    const access = await getTelegramFxAccess(parsedUsername.normalized);
    if (!access || !access.enabled || !access.telegramfx_access) {
      await ctx.answerCbQuery("Your account is not registered for private access.", {
        show_alert: true,
      });
      return;
    }
    const client = await ensureRedis();
    if (!client) throw new Error("Redis unavailable");
    const raw = await client.get(getIdentityCodeKey(requestedCode));
    if (raw) {
      let record = null;
      try {
        record = JSON.parse(raw);
      } catch {}
      if (record && (String(record.userId || "") !== userId || String(record.telegramUsername || "").toLowerCase() !== parsedUsername.normalized)) {
        await ctx.answerCbQuery("Tʜɪꜱ ᴄᴏᴅᴇ ᴅᴏᴇꜱ ɴᴏᴛ ʙᴇʟᴏɴɢ ᴛᴏ ʏᴏᴜʀ ᴀᴄᴄᴏᴜɴᴛ.", { show_alert: true });
        return;
      }
      if (record?.status === "consumed") {
        await ctx.answerCbQuery("ᴛʜɪꜱ ɪᴅᴇɴᴛɪᴛʏ ᴄᴏᴅᴇ ᴡᴀꜱ ᴀʟʀᴇᴀᴅʏ ᴜꜱᴇᴅ.", { show_alert: true });
        return;
      }
    }
    await ctx.answerCbQuery("ꜱᴇɴᴅɪɴɢ ᴀ ɴᴇᴡ ᴄᴏᴅᴇ…");
    await sendIdentityCode(ctx, { replaceExisting: true });
  } catch (error) {
    logger.error("𝐓𝐆𝐑𝐌𝐗 ꜱᴇɴᴅ ᴀɢᴀɪɴ ᴇʀʀᴏʀ", {
      userId,
      code: requestedCode,
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.answerCbQuery("Couldn't generate a new code.", { show_alert: true }).catch(() => {});
  }
});

// SPCL — Confirm the real Telegram identity before checking server-side access.
// Never trust a username typed by the visitor or grant a session from a button alone.
const SPCL_DM_URL = "https://t.me/User18Fx";
function getSpclRequestKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("✉ SOLICITAR ACCESO · DM", SPCL_DM_URL)],
  ]);
}
async function openSpclConfirmation(ctx) {
  await trackButtonClick(ctx, "ꜱᴘᴄʟ");
  if (ctx.chat?.type !== "private") {
    await ctx.reply("🔒 Abre este bot en un chat privado para verificar SPCL.",
      Markup.inlineKeyboard([[Markup.button.url("ABRIR BOT", "https://t.me/User18Fx_bot?start=spcl")]]));
    return;
  }
  // ctx.from comes from Telegram's signed webhook, not user-entered text.
  const username = normalizeTelegramFxUsername(ctx.from?.username || "");
  const id = String(ctx.from?.id || "");
  if (!username || !id) {
    await ctx.reply("⚠️ Para SPCL primero configura un @username en tu perfil de Telegram y vuelve a pulsar SPCL.");
    return;
  }
  const buttons = Markup.inlineKeyboard([
    [Markup.button.callback("✓ CONFIRMAR MI USERNAME", `spcl_confirm_${id}`)],
    [Markup.button.callback("← CANCELAR", `spcl_cancel_${id}`)],
  ]);
  await ctx.reply(
    `✦ <b>SPCL · CONFIRMA TU USERNAME</b>\n\n¿Eres <b>${escapeHtml(username.display)}</b>?\n\nComprobaremos tu acceso antes de entregar cualquier código.`,
    { parse_mode: "HTML", reply_markup: buttons.reply_markup }
  );
}
bot.action(/^spcl_confirm_(\d+)$/, async (ctx) => {
  const requestedId = String(ctx.match?.[1] || "");
  if (!requestedId || requestedId !== String(ctx.from?.id || "")) {
    await ctx.answerCbQuery("Esta confirmación pertenece a otra cuenta.", { show_alert: true });
    return;
  }
  if (ctx.chat?.type !== "private") {
    await ctx.answerCbQuery("Solo en chat privado.", { show_alert: true });
    return;
  }
  const username = normalizeTelegramFxUsername(ctx.from?.username || "");
  if (!username) {
    await ctx.answerCbQuery("Primero configura tu @username.", { show_alert: true });
    return;
  }
  try {
    await ctx.answerCbQuery("Verificando acceso SPCL…");
    const access = await getTelegramFxAccess(username.normalized);
    if (!access || access.enabled !== true || access.telegramfx_access !== true) {
      await ctx.reply(
        `⛔ <b>NO TIENES ACCESO SPCL</b>\n\n${escapeHtml(username.display)} no tiene autorización activa.\n\nPuedes solicitar acceso enviándome un mensaje directo.`,
        { parse_mode: "HTML", reply_markup: getSpclRequestKeyboard().reply_markup }
      );
      return;
    }
    // Existing Redis identity-code engine: 15-minute, one-time code tied to
    // this Telegram user ID and username; Vault verifies it server-side.
    await sendIdentityCode(ctx, { replaceExisting: true });
  } catch (error) {
    logger.error("SPCL CONFIRMATION ERROR", {
      userId: String(ctx.from?.id || ""),
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.reply("⚠️ No fue posible verificar SPCL. Inténtalo de nuevo; no se ha concedido acceso.").catch(() => {});
  }
});
bot.action(/^spcl_cancel_(\d+)$/, async (ctx) => {
  if (String(ctx.match?.[1] || "") !== String(ctx.from?.id || "")) {
    await ctx.answerCbQuery("Esta confirmación pertenece a otra cuenta.", { show_alert: true });
    return;
  }
  await ctx.answerCbQuery("Cancelado");
  await ctx.reply("Verificación SPCL cancelada.", getAccessKeyboard());
});

//// USER START //
async function handleUserStart(ctx) {
  try {
    const messageText = String(ctx.message?.text || "").trim();
    const textPayload = messageText.replace(/^\/start(?:@\w+)?\s*/i, "").trim();
    const startPayload = String(ctx.startPayload || textPayload || "")
      .trim()
      .toLowerCase();
    if (startPayload === "spcl") {
      await openSpclConfirmation(ctx);
      return;
    }
    if (startPayload === "webchat") {
      await sendFxChatLink(ctx);
      return;
    }
    if (startPayload === "gallery") {
      await trackButtonClick(ctx, "public_gallery");
      await openPublicGallery(ctx);
      return;
    }
    if (startPayload === "videocall") {
      await trackButtonClick(ctx, "website_videocall");
      await openVideocallFlow(ctx);
      return;
    }
    if (startPayload === "channels") {
      await trackButtonClick(ctx, "website_channels");
      await sendChannelsPanel(ctx);
      return;
    }
    // TGMX IDENTITY START
    if (startPayload === "identity") {
      await sendIdentityCode(ctx);
      return;
    }
    //// WEBSITE DEVICE → BASIC //
    if (startPayload === "getcode_basic") {
      await trackButtonClick(ctx, "ᴡᴇʙꜱɪᴛᴇ ɢᴇᴛ ᴄᴏᴅᴇ ʙᴀꜱɪᴄ");
      await sendBasicPanel(ctx);
      return;
    }
    //// WEBSITE DEVICE → PRO //
    if (startPayload === "getcode_pro") {
      await trackButtonClick(ctx, "Wᴡᴇʙꜱɪᴛᴇ ɢᴇᴛ ᴄᴏᴅᴇ ᴘʀᴏ");
      await sendProPanel(ctx);
      return;
    }
    //// WEBSITE DEVICE → VIP //
    if (startPayload === "getcode_vip") {
      await trackButtonClick(ctx, "ᴡᴇʙꜱɪᴛᴇ ɢᴇᴛ ᴄᴏᴅᴇ ᴠɪᴘ");
      await sendVipPanel(ctx);
      return;
    }
    logger.info("ᴜꜱᴇʀ ꜱᴛᴀʀᴛ ʀᴇᴄᴇɪᴠᴇᴅ", {
      userId: String(ctx.from?.id || ""),
      chatId: String(ctx.chat?.id || ""),
      startPayload: startPayload || null,
      messageText: messageText || null,
    });
    if (startPayload === "getcode") {
      logger.info("ꜱᴛᴀʀᴛ ɢᴇᴛ ᴄᴏᴅᴇ", { userId: String(ctx.from?.id || "") });
      await openGetCodePanel(ctx, "WEBSITE");
      return;
    }
    if (startPayload === "pay_basic") {
      logger.info("ꜱᴛᴀʀᴛ ʙᴀꜱɪᴄ ᴘᴀʏᴍᴇɴᴛ");
      await sendBasicInvoice(ctx);
      return;
    }
    if (startPayload === "pay_pro") {
      logger.info("ꜱᴛᴀʀᴛ ᴘʀᴏ ᴘᴀʏᴍᴇɴᴛ");
      await sendProInvoice(ctx);
      return;
    }
    if (startPayload === "pay_vip") {
      logger.info("ꜱᴛᴀʀᴛ ᴠɪᴘ ᴘᴀʏᴍᴇɴᴛ");
      await sendVipInvoice(ctx);
      return;
    }
    if (isVaultPayload(startPayload)) {
      const relayed = await relayVaultUpdate(ctx.update);
      if (relayed) {
        return;
      }
    }
    await sendMainPanel(ctx);
  } catch (error) {
    logger.error("ꜱᴛᴀʀᴛ ᴇʀʀᴏʀ", { ...getTelegramError(error), stack: getErrorStack(error) });
    await ctx.reply("⚠️ᴜɴᴀʙʟᴇ ᴛᴏ ᴏᴘᴇɴ ᴛʜᴇ ᴘᴀʏᴍᴇɴᴛ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ.").catch(() => {});
  }
}
bot.start(handleUserStart);
//// PAYMENT SUPPORT //
bot.command("paysupport", async (ctx) => {
  await ctx.reply(
    `ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ
                  ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`,
  );
});
//// PAYMENT ACTIONS //
bot.action("pay_vip_stars", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await sendVipInvoice(ctx);
  } catch (error) {
    logger.error("𝙿𝙰𝚈  𝚅𝙸𝙿 𝙴𝚁𝚁𝙾𝚁", getTelegramError(error));
  }
});

bot.action("pay_pro_stars", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await sendProInvoice(ctx);
  } catch (error) {
    logger.error("𝙿𝙰𝚈 𝙿𝚁𝙾 𝙴𝚁𝚁𝙾𝚁", getTelegramError(error));
  }
});
bot.action("pay_basic_stars", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await sendBasicInvoice(ctx);
  } catch (error) {
    logger.error("𝙿𝙰𝚈 𝙱𝙰𝚂𝙸𝙲 𝙴𝚁𝚁𝙾𝚁 ", getTelegramError(error));
  }
});
//// PRE CHECKOUT //
bot.on("pre_checkout_query", async (ctx) => {
  try {
    const payload = ctx.update?.pre_checkout_query?.invoice_payload || "";
    if (isVaultPayload(payload)) {
      const relayed = await relayVaultUpdate(ctx.update);
      if (relayed) return;
    }
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    logger.error("ᴘʀᴇ ᴄʜᴇᴄᴋᴏᴜᴛ ᴇʀʀᴏʀ", getTelegramError(error));
    try {
      await ctx.answerPreCheckoutQuery(false, "ᴜɴᴀʙʟᴇ ᴛᴏ ᴘʀᴏᴄᴇꜱꜱ ᴘᴀʏᴍᴇɴᴛ ʀɪɢʜᴛ ɴᴏᴡ.");
    } catch {}
  }
});
//// MEDIA / PHOTO //
function isAcceptableMedia(ctx) {
  if (ctx.message?.photo?.length || ctx.message?.video) return true;
  const mime = String(ctx.message?.document?.mime_type || "");
  return mime.startsWith("image/") || mime.startsWith("video/");
}
async function sendExchangeReplyMedia(ctx) {
  const caption = `👀 ᴏᴋᴀʏ, ɪ ꜱᴇᴇ ʏᴏᴜ.

ʜᴇʀᴇ'ꜱ ᴀ ʟɪᴛᴛʟᴇ ꜱᴏᴍᴇᴛʜɪɴɢ ʙᴀᴄᴋ. ᴡᴀɴɴᴀ ᴋᴇᴇᴘ ᴛʜᴇ ᴠɪʙᴇ ɢᴏɪɴɢ? ʏᴏᴜ ᴄᴀɴ ꜱᴇɴᴅ ᴀɴᴏᴛʜᴇʀ ᴘɪᴄ ᴏʀ ᴠɪᴅᴇᴏ.`;
  try {
    if (VIDEOCALL_REPLY_MEDIA_TYPE === "video") {
      await ctx.replyWithVideo(VIDEOCALL_REPLY_MEDIA_URL, { caption });
    } else {
      await ctx.replyWithPhoto(VIDEOCALL_REPLY_MEDIA_URL, { caption });
    }
    return true;
  } catch (error) {
    logger.error("VIDEOCALL AUTO MEDIA FAILED", { userId: String(ctx.from?.id || ""), ...getTelegramError(error) });
    await ctx.reply("👀 ɢᴏᴛ ʏᴏᴜʀꜱ. ɪ'ᴍ ʜᴀᴠɪɴɢ ᴛʀᴏᴜʙʟᴇ ꜱᴇɴᴅɪɴɢ ᴍʏ ᴍᴇᴅɪᴀ ʀɪɢʜᴛ ɴᴏᴡ, ʙᴜᴛ ʏᴏᴜʀ ʀᴇǫᴜᴇꜱᴛ ɪꜱ ꜱᴛɪʟʟ ᴏᴘᴇɴ.").catch(() => {});
    return false;
  }
}
async function handleMedia(ctx) {
  const userId = String(ctx.from?.id || "");
  if (!userId || ctx.chat?.type !== "private") return;
  let pending = await getVideoRequest(userId);
  if (pending?.status === REQUEST_STATUS.WAITING_CONSENT) {
    pending = { ...pending, status: REQUEST_STATUS.WAITING_PHOTO };
  }
  if (!pending || ![REQUEST_STATUS.WAITING_PHOTO, REQUEST_STATUS.AWAITING_ADMIN].includes(pending.status)) {
    await ctx.reply("📸 ᴏᴘᴇɴ ᴠɪᴅᴇᴏᴄᴀʟʟ ꜰʀᴏᴍ ᴛʜᴇ ᴍᴇɴᴜ ᴛᴏ ꜱᴛᴀʀᴛ ᴀ ᴘʀɪᴠᴀᴛᴇ ᴍᴇᴅɪᴀ ꜱᴡᴀᴘ.", getMainKeyboard());
    return;
  }
  if (!isAcceptableMedia(ctx)) {
    await ctx.reply("📸 ᴘʜᴏᴛᴏꜱ ᴏʀ ᴠɪᴅᴇᴏꜱ ᴏɴʟʏ.");
    return;
  }
  const user = getUserMeta(ctx.from);
  const firstMedia = pending.status === REQUEST_STATUS.WAITING_PHOTO;
  const mediaCount = Number(pending.mediaCount || 0) + 1;
  const kind = ctx.message?.photo ? "photo" : ctx.message?.video ? "video" : "media file";
  try {
    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📸 <b>${firstMedia ? "NEW PRIVATE MEDIA" : "MORE MEDIA FROM USER"}</b>
Username: ${escapeHtml(user.username)}
ID: ${escapeHtml(userId)}
Type: ${escapeHtml(kind)}
Item: ${mediaCount}`,
      { parse_mode: "HTML" },
    );
    await bot.telegram.copyMessage(ADMIN_CHAT_ID, ctx.chat.id, ctx.message.message_id);
    if (firstMedia) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("💬 ʀᴇᴘʟʏ ᴏᴘᴛɪᴏɴꜱ", "admin_message_to:" + userId)],
        [Markup.button.callback("ᴘᴀʏ ✪𝟭𝟯𝟬 ꜱᴛᴀʀꜱ", `approve_stars_${userId}`)],
        [Markup.button.callback("ꜱᴇɴᴅ ᴢᴏᴏᴍ + ᴛᴇʟᴇɢʀᴀᴍ", `approve_call_${userId}`)],
        [Markup.button.callback("✘ ʀᴇᴊᴇᴄᴛ", `reject_video_${userId}`)],
      ]);
      await adminBot.telegram.sendMessage(ADMIN_CHAT_ID, "ᴄʜᴏᴏꜱᴇ ᴡʜᴇɴ ʏᴏᴜ'ʀᴇ ʀᴇᴀᴅʏ:", { reply_markup: keyboard.reply_markup });
    }
    await setVideoRequest(userId, {
      ...pending,
      status: REQUEST_STATUS.AWAITING_ADMIN,
      mediaCount,
      lastMediaAt: Date.now(),
      firstMediaAt: pending.firstMediaAt || Date.now(),
    });
    if (firstMedia) {
      await ctx.reply("📸 ɢᴏᴛ ɪᴛ. ᴍʏ ᴛᴜʀɴ ɴᴏᴡ…");
      const delivered = await sendExchangeReplyMedia(ctx);
      await setVideoRequest(userId, {
        ...(await getVideoRequest(userId)),
        replySent: delivered,
      });
    } else {
      await ctx.reply("👀 ɢᴏᴛ ᴛʜᴀᴛ ᴏɴᴇ ᴛᴏᴏ. ᴡᴇ ᴄᴀɴ ᴋᴇᴇᴘ ɪᴛ ᴛᴏ ᴘɪᴄꜱ/ᴠɪᴅᴇᴏꜱ ᴡʜɪʟᴇ ɪ ᴄʜᴇᴄᴋ ᴛʜᴇ ᴄᴀʟʟ.");
    }
  } catch (error) {
    logger.error("MEDIA HANDLER ERROR", { userId, ...getTelegramError(error), stack: getErrorStack(error) });
    await ctx.reply("✘ ꜱᴏᴍᴇᴛʜɪɴɢ ᴡᴇɴᴛ ᴡʀᴏɴɢ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ.").catch(() => {});
  }
}
bot.on("photo", handleMedia);
bot.on("video", handleMedia);
bot.on("document", handleMedia);

//// USER TEXT ROUTER //
bot.on("text", async (ctx, next) => {
  const text = String(ctx.message?.text || "").trim();
  const userId = String(ctx.from?.id || "");
  logger.info("USER TEXT RECEIVED", { userId, text });
  if (!userId) {
    return;
  }
  try {
    if (/^\/start(?:@\w+)?(?:\s|$)/i.test(text)) {
      const startPayload = text
        .replace(/^\/start(?:@\w+)?\s*/i, "")
        .trim()
        .toLowerCase();
      logger.info("ᴜꜱᴇʀ ꜱᴛᴀʀᴛ ʀᴇᴄᴇɪᴠᴇᴅ", {
        userId,
        startPayload: startPayload || null,
      });
      // TGMX IDENTITY START (TEXT ROUTER)
      if (startPayload === "identity") {
        await sendIdentityCode(ctx);
        return;
      }
      if (startPayload === "pay_basic") {
        logger.info("ꜱᴛᴀʀᴛ ʙᴀꜱɪᴄ ᴘᴀʏᴍᴇɴᴛ");
        await sendBasicInvoice(ctx);
        return;
      }
      if (startPayload === "pay_pro") {
        logger.info("ꜱᴛᴀʀᴛ ᴘʀᴏ ᴘᴀʏᴍᴇɴᴛ");
        await sendProInvoice(ctx);
        return;
      }
      if (startPayload === "pay_vip") {
        logger.info("ꜱᴛᴀʀᴛ ᴠɪᴘ ᴘᴀʏᴍᴇɴᴛ");
        await sendVipInvoice(ctx);
        return;
      }
      await sendMainPanel(ctx);
      return;
    }
    if (/^\/(access|permissions|notify_access|find|revoke|users|identity|visitors|visitorstats|clearvideo|resetvc|report|online|message|msg|stop)(?:@\w+)?(?:\s|$)/i.test(text)) {
      return next();
    }
    if (text.startsWith("/")) {
      await ctx.reply("🤖 ᴄᴏᴍᴀɴᴅᴏ ɴᴏ ʀᴇᴄᴏɴᴏᴄɪᴅᴏ.", getMainKeyboard()).catch(() => {});
      return;
    }
    //// EXCHANGE: MEDIA-ONLY UNTIL ADMIN DECIDES ////
    const exchange = await getVideoRequest(userId);
    if (exchange && [REQUEST_STATUS.WAITING_CONSENT, REQUEST_STATUS.WAITING_PHOTO, REQUEST_STATUS.AWAITING_ADMIN].includes(exchange.status) && ![BTN_CANCEL, BTN_PENDING_REQUEST, BTN_VIDEOCALL].includes(text)) {
      await ctx.reply("📸 ᴊᴜꜱᴛ ᴘʜᴏᴛᴏꜱ ᴏʀ ᴠɪᴅᴇᴏꜱ ᴡʜɪʟᴇ ᴡᴇ ꜱᴡᴀᴘ. ᴛᴀᴘ ᴄᴀɴᴄᴇʟ ᴛᴏ ᴇxɪᴛ.", getPendingPhotoKeyboard());
      return;
    }
    //// PUBLIC GALLERY KEYBOARD ////
    if ([BTN_GALLERY_PREV, BTN_GALLERY_NEXT, BTN_GALLERY_CLOSE].includes(text)) {
      return await handlePublicGalleryNavigation(ctx, text);
    }
    //// GET CODE //
    if (text === BTN_GET_CODE) {
      return await openGetCodePanel(ctx, "ʙᴜᴛᴛᴏɴ");
    }
    //// VIDEOCALL //
    if (text === BTN_VIDEOCALL) {
      await trackButtonClick(ctx, "ᴠɪᴅᴇᴏᴄᴀʟʟ");
      return await openVideocallFlow(ctx);
    }
    //// PENDING REQUEST //
    if (text === BTN_PENDING_REQUEST) {
      await trackButtonClick(ctx, "ᴘᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ");
      return await sendPendingVideocallPanel(ctx);
    }
    //// SPCL · Telegram username confirmation and permission check //
    if (text === BTN_SPCL) {
      return await openSpclConfirmation(ctx);
    }
    //// VIP //
    if (text === BTN_VIP) {
      await trackButtonClick(ctx, "ᴠɪᴘ");
      return await sendVipPanel(ctx);
    }
    //// BASIC  //
    if (text === BTN_BASIC) {
      await trackButtonClick(ctx, "ʙᴀꜱɪᴄ");
      return await sendBasicPanel(ctx);
    }
    //// PRO //
    if (text === BTN_PRO) {
      await trackButtonClick(ctx, "ᴘʀᴏ");
      return await sendProPanel(ctx);
    }
    //// PUBLIC GALLERY //
    if (text === BTN_GALLERY) {
      await trackButtonClick(ctx, "public_gallery");
      return await openPublicGallery(ctx);
    }
    //// CHANNELS //
    if (text === BTN_CHANNELS) {
      await trackButtonClick(ctx, "ᴄʜᴀɴɴᴇʟꜱ");
      return await sendChannelsPanel(ctx);
    }
    //// REFRESH //
    if (text === BTN_REFRESH) {
      await trackButtonClick(ctx, "ʀᴇꜰʀᴇꜱʜ");
      return await sendRefreshPanel(ctx);
    }
    //// CANCEL //
    if (text === BTN_CANCEL) {
      await deleteVideoRequest(userId);
      return await sendMainPanel(ctx);
    }
    //// BACK //
    if (text === BTN_BACK_MENU) {
      return await sendMainPanel(ctx);
    }
    // // ZOOM //
    if (text === BTN_ZOOM) {
      return await ctx.reply("📞ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ", {
        reply_markup: { inline_keyboard: [[{ text: "📹 ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ", url: ZOOM_URL }]] },
      });
    }
    //// TELEGRAM CALL //
    if (text === BTN_TELEGRAM) {
      return await ctx.reply("💬ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ", {
        reply_markup: {
          inline_keyboard: [[{ text: "📹ɪɴɪᴄɪᴀʀ ᴠɪᴅᴇᴏᴄᴀʟʟ", url: TELEGRAM_CALL_URL }]],
        },
      });
    }
    //// SMOKELANDIA //
    if (text === BTN_SMOKELANDIA) {
      return await sendMediaSafe(ctx, "video", ASSET_SMOKELANDIA_VIDEO, {
        reply_markup: { inline_keyboard: [[{ text: "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ", url: "https://t.me/+79Y_XpV5rak2Zjgx" }]] },
      });
    }
    //// USERFX SITE //
    if (text === BTN_USERFX_SITE) {
      return await sendMediaSafe(ctx, "video", ASSET_USERFX_VIDEO, {
        reply_markup: {
          inline_keyboard: [[{ text: "𝐔𝐬𝐞𝐫 Ŧҳ 🜲", url: "https://t.me/+Smfuo6ObfVFkOTFh" }]],
        },
      });
    }

    if (await hasFxChatConsent(userId)) return await ctx.reply(fxChatReply(text));
    return await sendMainPanel(ctx);
  } catch (error) {
    logger.error("ᴛᴇxᴛ ʜᴀɴᴅʟᴇʀ ᴇʀʀᴏʀ", {
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });

    await ctx.reply("✘ ᴍᴇꜱꜱᴀɢᴇ ɴᴏᴛ ᴘʀᴏᴄᴇꜱꜱᴇᴅ.").catch(() => {});
  }
});
bot.on("message", async (ctx, next) => {
  if (ctx.message?.text || ctx.message?.successful_payment) return next();
  const userId = String(ctx.from?.id || "");
  if (!userId || ctx.chat?.type !== "private") return next();
  const pending = await getVideoRequest(userId);
  if (pending && [REQUEST_STATUS.WAITING_CONSENT, REQUEST_STATUS.WAITING_PHOTO, REQUEST_STATUS.AWAITING_ADMIN].includes(pending.status)) {
    await ctx.reply("📸 ᴏɴʟʏ ᴘʜᴏᴛᴏꜱ ᴀɴᴅ ᴠɪᴅᴇᴏꜱ ᴀʀᴇ ᴀᴄᴄᴇᴘᴛᴇᴅ ɪɴ ᴛʜɪꜱ ꜱᴡᴀᴘ.").catch(() => {});
    return;
  }
  return next();
});
//// SUCCESSFUL PAYMENT HANDLER //
bot.on("successful_payment", handleSuccessfulPayment);
//// ADMIN COMMANDS - USER BOT //
bot.command("clearvideo", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const targetId = getCommandArg(ctx) || String(ctx.from?.id || "");
  if (!targetId) return;
  await deleteVideoRequest(targetId);
  await ctx.reply(`✔ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ ᴄʟᴇᴀʀᴇᴅ ꜰᴏʀ ${targetId}.`);
});

bot.command("resetvc", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("✘ ᴜɴᴀᴜᴛʜᴏʀɪᴢᴇᴅ.");
    return;
  }
  const targetId = getCommandArg(ctx) || String(ctx.from?.id || "");
  try {
    if (!targetId) return;
    const request = await getVideoRequest(targetId);
    if (!request) {
      await ctx.reply(`✔ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ ꜰᴏᴜɴᴅ ꜰᴏʀ ${targetId}.`);
      return;
    }
    await deleteVideoRequest(targetId);
    await ctx.reply(
      `✔ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ ʀᴇꜱᴇᴛ ꜰᴏʀ ${targetId}.
                           ᴘʀᴇᴠɪᴏᴜꜱ ꜱᴛᴀᴛᴜꜱ:
                ${request.status || "unknown"}
                           ᴛʜᴇ ᴜꜱᴇʀ ᴄᴀɴ ɴᴏᴡ ʀᴇǫᴜᴇꜱᴛ ᴀ ɴᴇᴡ ᴠɪᴅᴇᴏᴄᴀʟʟ.`,
    );
    logger.info("VIDEOCALL REQUEST RESET", {
      userId: targetId,
      previousStatus: request.status || null,
    });
  } catch (error) {
    logger.error("RESET VIDEOCALL ERROR", {
      userId: targetId,
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.reply("✘ ᴇʀʀᴏʀ ʀᴇꜱᴇᴛᴛɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ.");
  }
});
//// REPORT //
bot.command("report", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("✘ ᴜɴᴀᴜᴛʜᴏʀɪᴢᴇᴅ..");
    return;
  }
  const client = await ensureRedis();
  if (!client) {
    await ctx.reply("✘ ʀᴇᴅɪꜱ ɪꜱ ɴᴏᴛ ᴀᴠᴀɪʟᴀʙʟᴇ.");
    return;
  }
  try {
    const keys = await scanKeys("button_click:*");
    if (!keys.length) {
      await ctx.reply("📊 ɴᴏ ʙᴜᴛᴛᴏɴ ᴄʟɪᴄᴋꜱ ʀᴇᴄᴏʀᴅᴇᴅ ʏᴇᴛ.");
      return;
    }
    const values = await client.mget(...keys);
    const clicks = values
      .filter(Boolean)
      .map((value) => {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      })
      .filter((click) => click && String(click.id) !== String(ADMIN_USER_ID) && String(click.username || "").replace(/^@/, "").toLowerCase() !== "user18fx")
      .sort((a, b) => new Date(b.clickedAt).getTime() - new Date(a.clickedAt).getTime());
    let report = "📊 ʙᴜᴛᴛᴏɴ ᴄʟɪᴄᴋ ʀᴇᴘᴏʀᴛ\n\n";
    clicks.forEach((click, index) => {
      report += `<b>${index + 1}. ${escapeHtml(click.fullName)}</b>\n` + `Username: ${escapeHtml(click.username)}\n` + `ID: <code>${escapeHtml(click.id)}</code>\n` + `Button: <b>${escapeHtml(click.button)}</b>\n` + `Date: ${escapeHtml(click.clickedAt)}\n\n`;
    });
    const chunks = [];
    while (report.length > 0) {
      chunks.push(report.slice(0, 3900));
      report = report.slice(3900);
    }
    for (const chunk of chunks) {
      await ctx.reply(chunk, { parse_mode: "HTML" });
    }
  } catch (error) {
    logger.error("REPORT ERROR", {
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.reply("✘ ᴇʀʀᴏʀ ɢᴇɴᴇʀᴀᴛɪɴɢ ʀᴇᴘᴏʀᴛ.");
  }
});

//// USER FX · VISITOR COMMANDS //
bot.command("visitors", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("✘ ᴜɴᴀᴜᴛʜᴏʀɪᴢᴇᴅ.");
    return;
  }

  const arg = String(getCommandArg(ctx) || "").trim().toLowerCase();
  const showFullIp = arg === "full";
  const requestedLimit = /^\d{1,2}$/.test(arg) ? Number(arg) : 10;
  const limit = Math.min(Math.max(requestedLimit, 1), 30);

  try {
    const supabase = getVisitorsSupabase();

    const { data, error } = await supabase
      .from("track_events")
      .select("*")
      .eq("event", "miniapp_open")
      .limit(200);

    if (error) throw error;

    if (!Array.isArray(data) || data.length === 0) {
      await ctx.reply("📊 ɴᴏ ᴠɪꜱɪᴛᴏʀꜱ ʀᴇᴄᴏʀᴅᴇᴅ.");
      return;
    }

    const lines = ["USER FX · VISITORS", ""];
    const visibleVisitors = data.filter((row) => {
      const tg = row?.telegram || {};
      return String(tg.id || "") !== String(ADMIN_USER_ID) && String(tg.username || "").replace(/^@/, "").toLowerCase() !== "user18fx";
    });

    visibleVisitors.forEach((row, index) => {
      const telegram = row?.telegram && typeof row.telegram === "object" ? row.telegram : {};
      const geo = row?.geo && typeof row.geo === "object" ? row.geo : {};

      const user = telegram?.username
        ? `@${telegram.username}`
        : telegram?.id
          ? `TG-${telegram.id}`
          : "BROWSER";

      const ip = showFullIp
        ? String(row?.ip || "—")
        : maskVisitorIp(row?.ip);

      lines.push(`${String(index + 1).padStart(2, "0")} · ${user}`);
      lines.push(`IP · ${ip}`);
      lines.push(`${String(geo?.city || "—")}, ${String(geo?.country || "—")}`);
      const eventDate =
        row?.created_at ||
        row?.createdAt ||
        row?.timestamp ||
        row?.ts ||
        row?.date ||
        row?.time ||
        "—";

      lines.push(String(eventDate));
      lines.push("");
    });

    const output = lines.join("\n");
    const chunks = [];
    let remaining = output;

    while (remaining.length > 0) {
      if (remaining.length <= 3500) {
        chunks.push(remaining);
        break;
      }

      let splitAt = remaining.lastIndexOf("\n", 3500);

      if (splitAt <= 0) {
        splitAt = 3500;
      }

      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt).trimStart();
    }

    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  } catch (error) {
    logger.error("VISITORS COMMAND ERROR", {
      message: error?.message || null,
      stack: error?.stack || null,
    });

    await ctx.reply("✘ ᴜɴᴀʙʟᴇ ᴛᴏ ʟᴏᴀᴅ ᴠɪꜱɪᴛᴏʀꜱ.");
  }
});

bot.command("visitorstats", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("✘ ᴜɴᴀᴜᴛʜᴏʀɪᴢᴇᴅ.");
    return;
  }

  try {
    const supabase = getVisitorsSupabase();

    let visible = 0;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("track_events").select("telegram").eq("event", "miniapp_open").range(from, from + 999);
      if (error) throw error;
      visible += (data || []).filter(({ telegram: tg }) => String(tg?.id || "") !== String(ADMIN_USER_ID) && String(tg?.username || "").replace(/^@/, "").toLowerCase() !== "user18fx").length;
      if (!data || data.length < 1000) break;
    }
    await ctx.reply(`VIEW-${String(visible).padStart(5, "0")}`);
  } catch (error) {
    logger.error("VISITORSTATS COMMAND ERROR", {
      message: error?.message || null,
    });

    await ctx.reply("✘ ᴜɴᴀʙʟᴇ ᴛᴏ ʟᴏᴀᴅ ꜱᴛᴀᴛꜱ.");
  }
});

// ======================================================
// ADMIN MESSAGING: TEMPLATES / FREE / RECENT CONTACTS
// Telegram Bot API does not disclose a user's true online status.
// ======================================================
const ADMIN_MESSAGE_TEMPLATES = Object.freeze({
  talk: { label: "💬 KEEP TALKING", text: "👀 I'm here. Wanna keep talking? Send another pic or video whenever you're ready." },
  more: { label: "📸 SEND MORE", text: "📸 Wanna send another pic or a short video? I'm checking this out." },
  wait: { label: "⏳ HOLD ON", text: "⏳ Give me a little time. I'll get back to you right here." },
  call: { label: "📞 VIDEOCALL", text: "📞 Wanna take this to a videocall? I'll send the call options when they're ready." },
  thanks: { label: "✔ THANKS", text: "✔ Got it. Thanks for sharing. I'll keep you posted." },
  decline: { label: "✖ NOT NOW", text: "I'm gonna pass for now. Thanks for reaching out." },
});

function formatAdminRecipient(userId, contact) {
  return (contact?.username || (contact?.firstName ? contact.firstName + " " : "")) + " · ID " + String(userId);
}
async function getAdminMessageContact(userId, client) {
  const id = String(userId || "");
  if (!/^\d{5,20}$/.test(id)) return null;
  if (await client.exists(BOT_CONTACT_OPTOUT_PREFIX + id)) return null;
  if (await client.exists(BOT_CONTACT_BLOCK_PREFIX + id)) return null;
  let raw = await client.get(BOT_CONTACT_DATA_PREFIX + id);
  if (!raw) {
    const request = await getVideoRequest(id);
    if (request) {
      raw = JSON.stringify({ id, username: request.username || "", firstName: request.fullName || "", lastSeen: request.createdAt || 0 });
    }
  }
  if (!raw) return null;
  try {
    const contact = JSON.parse(raw);
    return String(contact.id || "") === id ? contact : null;
  } catch {
    return null;
  }
}
async function deliverAdminMessage(userId, text) {
  const client = await ensureRedis();
  if (!client) return { ok: false, reason: "Redis unavailable." };
  const contact = await getAdminMessageContact(userId, client);
  if (!contact) return { ok: false, reason: "Destinatario no registrado, bloqueado o dado de baja. Debe iniciar @User18Fx_bot." };
  try {
    await bot.telegram.sendMessage(String(userId), text, { disable_web_page_preview: true });
    return { ok: true, contact };
  } catch (error) {
    const errorCode = Number(error?.response?.error_code || 0);
    const description = String(error?.response?.description || error?.message || "unknown");
    if (errorCode === 403) {
      await client.multi()
        .set(BOT_CONTACT_BLOCK_PREFIX + userId, "1", "EX", BOT_CONTACT_RETENTION_SECONDS)
        .zrem(BOT_CONTACT_ACTIVITY_KEY, String(userId))
        .exec();
      return { ok: false, reason: "Telegram rechaza el contacto (bot bloqueado o chat no disponible)." };
    }
    logger.error("ADMIN MESSAGE SEND FAILED", { userId, errorCode, description });
    return { ok: false, reason: "Telegram no confirmó la entrega. Verifica antes de reintentar." };
  }
}
function adminMessageKeyboard(userId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(ADMIN_MESSAGE_TEMPLATES.talk.label, "admin_message_pick:talk:" + userId),
      Markup.button.callback(ADMIN_MESSAGE_TEMPLATES.more.label, "admin_message_pick:more:" + userId),
    ],
    [
      Markup.button.callback(ADMIN_MESSAGE_TEMPLATES.wait.label, "admin_message_pick:wait:" + userId),
      Markup.button.callback(ADMIN_MESSAGE_TEMPLATES.call.label, "admin_message_pick:call:" + userId),
    ],
    [
      Markup.button.callback(ADMIN_MESSAGE_TEMPLATES.thanks.label, "admin_message_pick:thanks:" + userId),
      Markup.button.callback(ADMIN_MESSAGE_TEMPLATES.decline.label, "admin_message_pick:decline:" + userId),
    ],
    [Markup.button.callback("✍ FREE · WRITE NOW", "admin_message_free:" + userId)],
  ]);
}
async function openAdminMessageMenu(ctx, userId, answerCallback = false) {
  if (!isAdmin(ctx)) {
    if (answerCallback) return ctx.answerCbQuery("Unauthorized", { show_alert: true });
    return ctx.reply("Unauthorized");
  }
  const client = await ensureRedis();
  if (!client) return ctx.reply("Redis unavailable.");
  const contact = await getAdminMessageContact(userId, client);
  if (!contact) {
    if (answerCallback) await ctx.answerCbQuery("User not available", { show_alert: true });
    return ctx.reply("No se puede enviar a ese usuario. Debe iniciar el bot y permitir mensajes.");
  }
  if (answerCallback) await ctx.answerCbQuery();
  return ctx.reply(
    "💬 RESPONDER A " + formatAdminRecipient(userId, contact) + "\n\nSelecciona una respuesta o usa FREE para escribirla ahora.",
    { reply_markup: adminMessageKeyboard(userId).reply_markup },
  );
}
async function showRecentAdminContacts(ctx, period = "1h", offset = 0, callback = false) {
  if (!isAdmin(ctx)) {
    if (callback) return ctx.answerCbQuery("Unauthorized", { show_alert: true });
    return ctx.reply("Unauthorized");
  }
  if (ctx.chat?.type !== "private") {
    if (callback) await ctx.answerCbQuery("Private admin chat only", { show_alert: true });
    return ctx.reply("Usa /online en el chat privado del bot administrador.");
  }
  const client = await ensureRedis();
  if (!client) return ctx.reply("Redis unavailable.");
  const hours = period === "24h" ? 24 : 1;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const entries = await client.zrevrangebyscore(BOT_CONTACT_ACTIVITY_KEY, "+inf", cutoff, "WITHSCORES", "LIMIT", offset, 11);
  const buttons = [];
  const rows = [];
  let index = offset;
  for (let i = 0; i < entries.length && rows.length < 8; i += 2) {
    const id = String(entries[i]);
    const seen = Number(entries[i + 1]);
    const contact = await getAdminMessageContact(id, client);
    if (!contact) continue;
    const mins = Math.max(0, Math.floor((Date.now() - seen) / 60000));
    const elapsed = mins < 60 ? mins + " min" : Math.floor(mins / 60) + " h";
    rows.push((index + 1) + ". " + formatAdminRecipient(id, contact) + " · hace " + elapsed);
    buttons.push([Markup.button.callback("✉ " + (contact.username || contact.firstName || id).slice(0, 28), "admin_message_to:" + id)]);
    index++;
  }
  const hasMore = entries.length >= 22;
  buttons.push([
    Markup.button.callback(period === "1h" ? "✔ LAST 1H" : "LAST 1H", "admin_message_online:1h:0"),
    Markup.button.callback(period === "24h" ? "✔ LAST 24H" : "LAST 24H", "admin_message_online:24h:0"),
  ]);
  if (hasMore && offset < 992) buttons.push([Markup.button.callback("NEXT ›", "admin_message_online:" + period + ":" + (offset + 8))]);
  if (callback) await ctx.answerCbQuery();
  return ctx.reply(
    "👥 /online · ACTIVIDAD RECIENTE (" + hours + "h)\n\n" +
    (rows.length ? rows.join("\n") : "No hay usuarios recientes registrados en este periodo.") +
    "\n\nNo representa el estado online de Telegram. Solo interacciones recientes; el envío puede fallar si el usuario bloqueó el bot.",
    { reply_markup: Markup.inlineKeyboard(buttons).reply_markup },
  );
}
async function openAdminMessageCommand(ctx) {
  if (!isAdmin(ctx)) return ctx.reply("Unauthorized");
  const arg = String(getCommandArg(ctx) || "").trim();
  if (!arg) return showRecentAdminContacts(ctx, "24h", 0);
  const client = await ensureRedis();
  if (!client) return ctx.reply("Redis unavailable.");
  let id = arg;
  if (!/^\d{5,20}$/.test(arg)) {
    const parsed = normalizeTelegramFxUsername(arg);
    if (!parsed) return ctx.reply("Uso: /message @username o /message 123456789");
    id = await resolveNoticeRecipient(parsed.normalized, client);
    if (!id) return ctx.reply("No encuentro un chat privado verificado para " + parsed.display + ".");
  }
  return openAdminMessageMenu(ctx, id);
}
for (const targetBot of [bot, adminBot]) {
  targetBot.command("online", async (ctx) => showRecentAdminContacts(ctx, "1h", 0));
  targetBot.command("message", openAdminMessageCommand);
  targetBot.command("msg", openAdminMessageCommand);
  targetBot.action(/^admin_message_online:(1h|24h):(\d{1,4})$/, async (ctx) => {
    return showRecentAdminContacts(ctx, ctx.match[1], Math.min(992, Number(ctx.match[2]) || 0), true);
  });
  targetBot.action(/^admin_message_to:(\d{5,20})$/, async (ctx) => {
    return openAdminMessageMenu(ctx, ctx.match[1], true);
  });
  targetBot.action(/^admin_message_pick:(talk|more|wait|call|thanks|decline):(\d{5,20})$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery("Unauthorized", { show_alert: true });
    const template = ADMIN_MESSAGE_TEMPLATES[ctx.match[1]];
    const userId = ctx.match[2];
    const client = await ensureRedis();
    if (!client) return ctx.answerCbQuery("Redis unavailable", { show_alert: true });
    const contact = await getAdminMessageContact(userId, client);
    if (!contact) return ctx.answerCbQuery("User unavailable", { show_alert: true });
    await ctx.answerCbQuery();
    const preview = Markup.inlineKeyboard([
      [Markup.button.callback("✔ SEND", "admin_message_send:" + ctx.match[1] + ":" + userId)],
      [Markup.button.callback("↶ OPTIONS", "admin_message_to:" + userId)],
    ]);
    return ctx.reply("PREVIEW → " + formatAdminRecipient(userId, contact) + "\n\n" + template.text, { reply_markup: preview.reply_markup });
  });
  targetBot.action(/^admin_message_send:(talk|more|wait|call|thanks|decline):(\d{5,20})$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery("Unauthorized", { show_alert: true });
    const client = await ensureRedis();
    if (!client) return ctx.answerCbQuery("Redis unavailable", { show_alert: true });
    const key = CODE_ENGINE_NAMESPACE + ":admin-message-confirm:" + ctx.chat.id + ":" + ctx.callbackQuery.message.message_id;
    if (await client.set(key, "1", "NX", "EX", 86400) !== "OK") {
      return ctx.answerCbQuery("Already processed");
    }
    const template = ADMIN_MESSAGE_TEMPLATES[ctx.match[1]];
    const result = await deliverAdminMessage(ctx.match[2], template.text);
    if (!result.ok) {
      await ctx.answerCbQuery(result.reason, { show_alert: true });
      return ctx.reply(result.reason);
    }
    await ctx.answerCbQuery("Message sent");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    return ctx.reply("✔ Enviado a " + formatAdminRecipient(ctx.match[2], result.contact) + ".");
  });
  targetBot.action(/^admin_message_free:(\d{5,20})$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery("Unauthorized", { show_alert: true });
    if (ctx.botInfo.id !== adminBot.botInfo?.id) {
      await ctx.answerCbQuery("Open the admin bot", { show_alert: true });
      return ctx.reply("Para escribir FREE, abre el chat con el bot administrador.");
    }
    const client = await ensureRedis();
    if (!client) return ctx.answerCbQuery("Redis unavailable", { show_alert: true });
    const contact = await getAdminMessageContact(ctx.match[1], client);
    if (!contact) return ctx.answerCbQuery("User unavailable", { show_alert: true });
    await ctx.answerCbQuery();
    const prompt = await ctx.reply(
      "✍ FREE → " + formatAdminRecipient(ctx.match[1], contact) + "\n\nEscribe la respuesta a este mensaje para enviarla. /cancel para salir.",
      { reply_markup: { force_reply: true, selective: true } },
    );
    const key = CODE_ENGINE_NAMESPACE + ":admin-message-free:" + ctx.chat.id + ":" + ctx.from.id + ":" + prompt.message_id;
    await client.set(key, ctx.match[1], "EX", 900);
  });
}
bot.command("stop", async (ctx) => {
  if (ctx.chat?.type !== "private" || !ctx.from?.id) return;
  const client = await ensureRedis();
  if (!client) return ctx.reply("No se pudo guardar la preferencia. Intenta de nuevo.");
  const id = String(ctx.from.id);
  await client.multi()
    .set(BOT_CONTACT_OPTOUT_PREFIX + id, "1")
    .zrem(BOT_CONTACT_ACTIVITY_KEY, id)
    .del(BOT_CONTACT_DATA_PREFIX + id)
    .exec();
  await ctx.reply("✔ No recibirás mensajes individuales del administrador. Envía /start si deseas reactivar los mensajes.");
});

//// ADMIN BOT / MY ID  //
adminBot.command("myid", async (ctx) => {
  try {
    await ctx.reply(`chat_id: ${ctx.chat?.id} user_id: ${ctx.from?.id}`);
  } catch (error) {
    logger.error("ADMIN MYID ERROR", getTelegramError(error));
  }
});
//// ADMIN: APPROVE STARS //
adminBot.action(/^approve_stars_(\d+)$/, async (ctx) => {
  const adminId = String(ctx.from?.id || "");
  if (adminId !== String(ADMIN_USER_ID)) {
    await ctx.answerCbQuery("✘ Unauthorized");
    return;
  }
  const requesterId = String(ctx.match[1]);
  const pending = await getVideoRequest(requesterId);
  if (!pending || pending.status !== REQUEST_STATUS.AWAITING_ADMIN) {
    await ctx.answerCbQuery("Request not found");
    return;
  }
  try {
    await ctx.answerCbQuery("✪ Payment selected");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await setVideoRequest(requesterId, {
      ...pending,
      status: REQUEST_STATUS.AWAITING_PAYMENT,
      paymentRequestedAt: Date.now(),
    });
    await bot.telegram.sendMessage(
      requesterId,
      `👀 ᴛʜᴀᴛ ᴡᴀꜱ ᴀ ɢᴏᴏᴅ ꜱᴛᴀʀᴛ.

ʟᴇᴛ'ꜱ ᴛᴀᴋᴇ ɪᴛ ᴛᴏ ᴀ ᴄᴀʟʟ. ᴄᴏᴍᴘʟᴇᴛᴇ ᴛʜᴇ ✪130 ꜱᴛᴀʀꜱ ɪɴᴠᴏɪᴄᴇ ʙᴇʟᴏᴡ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ.`,
    );
    await sendStars130Invoice(requesterId);
  } catch (error) {
    logger.error("ᴀᴘᴘʀᴏᴠᴇ ꜱᴛᴀʀꜱ ᴇʀʀᴏʀ", {
      requesterId,
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    const current = await getVideoRequest(requesterId);
    if (current) {
      await setVideoRequest(requesterId, { ...current, status: REQUEST_STATUS.AWAITING_ADMIN });
    }
    try {
      await bot.telegram.sendMessage(requesterId, "✘ ᴜɴᴀʙʟᴇ ᴛᴏ ᴄʀᴇᴀᴛᴇ ᴛʜᴇ ᴘᴀʏᴍᴇɴᴛ ɪɴᴠᴏɪᴄᴇ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ.");
    } catch {}
  }
});
//// ADMIN: APPROVE CALL //
adminBot.action(/^approve_call_(\d+)$/, async (ctx) => {
  const adminId = String(ctx.from?.id || "");
  if (adminId !== String(ADMIN_USER_ID)) {
    await ctx.answerCbQuery("✘ Unauthorized");
    return;
  }
  const requesterId = String(ctx.match[1]);
  const pending = await getVideoRequest(requesterId);
  if (!pending || pending.status !== REQUEST_STATUS.AWAITING_ADMIN) {
    await ctx.answerCbQuery("Request not found");
    return;
  }
  try {
    await ctx.answerCbQuery("📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ꜱᴇʟᴇᴄᴛᴇᴅ");
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] }).catch(() => {});
    await setVideoRequest(requesterId, {
      ...pending,
      status: REQUEST_STATUS.APPROVED,
      approvedAt: Date.now(),
    });
    await sendApprovedVideocallFlow(requesterId);
  } catch (error) {
    logger.error("APPROVE CALL ERROR", {
      requesterId,
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    const current = await getVideoRequest(requesterId);
    if (current) {
      await setVideoRequest(requesterId, { ...current, status: REQUEST_STATUS.AWAITING_ADMIN });
    }
  }
});
//// ADMIN: REJECT //
adminBot.action(/^reject_video_(\d+)$/, async (ctx) => {
  const adminId = String(ctx.from?.id || "");
  if (adminId !== String(ADMIN_USER_ID)) {
    await ctx.answerCbQuery("✘ ᴜɴᴀᴜᴛʜᴏʀɪᴢᴇᴅ");
    return;
  }
  const requesterId = String(ctx.match[1]);
  const pending = await getVideoRequest(requesterId);
  if (!pending) {
    await ctx.answerCbQuery("ʀᴇǫᴜᴇꜱᴛ ɴᴏᴛ ꜰᴏᴜɴᴅ");
    return;
  }
  try {
    await ctx.answerCbQuery("✘ ʀᴇᴊᴇᴄᴛᴇᴅ");
    await ctx
      .editMessageReplyMarkup({
        inline_keyboard: [],
      })
      .catch(() => {});
    await deleteVideoRequest(requesterId);
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback("ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ.", `notify_me_${requesterId}`)]]);
    await bot.telegram.sendMessage(
      requesterId,
      `⏳ ʏᴏᴜʀ ʀᴇǫᴜᴇꜱᴛ ᴡᴀꜱ ɴᴏᴛ ᴀᴘᴘʀᴏᴠᴇᴅ ᴀᴛ ᴛʜɪꜱ ᴛɪᴍᴇ.
                    ᴡᴀɴᴛ ᴜꜱ ᴛᴏ ʟᴇᴛ ʏᴏᴜ ᴋɴᴏᴡ ᴡʜᴇɴ ꜱʟᴏᴛꜱ ᴏᴘᴇɴ ᴜᴘ ᴀɢᴀɪɴ?`,
      { reply_markup: keyboard.reply_markup },
    );
  } catch (error) {
    logger.error("REJECT ERROR", { requesterId, ...getTelegramError(error) });
  }
});
/// NOTIFY ME //
bot.action(/^notify_me_(\d+)$/, async (ctx) => {
  const requesterId = String(ctx.match[1]);
  const clickedUserId = String(ctx.from?.id || "");
  if (clickedUserId !== requesterId) {
    await ctx.answerCbQuery("✘ ᴜɴᴀᴜᴛʜᴏʀɪᴢᴇᴅ");
    return;
  }
  try {
    await ctx.answerCbQuery("👍");
    await ctx
      .editMessageReplyMarkup({
        inline_keyboard: [],
      })
      .catch(() => {});
    const user = getUserMeta(ctx.from);
    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `🔔 <b>ɴᴏᴛɪꜰʏ ʀᴇǫᴜᴇꜱᴛ</b>
                Username: ${escapeHtml(user.username)}
                ID: ${escapeHtml(user.id)}
                Target: ${escapeHtml(requesterId)}`,
      { parse_mode: "HTML" },
    );
    await bot.telegram.sendMessage(
      requesterId,
      `📺 ɢᴏᴛ ɪᴛ!
                    ꜱᴡɪɴɢ ʙʏ ᴏᴜʀ ᴄʜᴀɴɴᴇʟ ᴀɴᴅ ꜱᴇᴇ ᴡʜᴀᴛ'ꜱ ɴᴇᴡ.`,
                {
                  reply_markup: {
                    inline_keyboard: [[{ text: "𝐔𝐬ᴇʀ 🜲∓ҳ", url: USER_GROUP_LINK }], [{ text: "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ", url: SMOKELANDIA_GROUP_LINK }]],
                  },
                },
              );
            } catch (error) {
              logger.error("ɴᴏᴛɪꜰʏ ᴇʀʀᴏʀ", { requesterId, ...getTelegramError(error) });
            }
          });
// ADMIN MANUAL ACCESS — codes are delivered here for manual distribution.
function manualAccessKeyboard(selectedPlan = "", username = "", issuedCode = "") {
  const button = (label, plan) => Markup.button.callback(label, `manual_access:${plan}${username ? ":" + username : ""}`);
  if (issuedCode) return Markup.inlineKeyboard([
    [Markup.button.callback(`${PLAN_CONFIG[selectedPlan]?.prefix || "SPCL"} ✔️`, `manual_manage:view:${issuedCode}`), Markup.button.callback("EDITAR ✏️", `manual_manage:edit:${issuedCode}`)],
    [Markup.button.callback("SEND TEXT 💬", `manual_manage:text:${issuedCode}`), Markup.button.callback("DELETE ❌", `manual_manage:delete:${issuedCode}`)],
    ...(username ? [[Markup.button.callback("✉ Enviar aviso", `manual_notify:${issuedCode}`)]] : []),
  ]);
  return Markup.inlineKeyboard([[button("SPCL", "special"), button("BSIC", "basic")], [button("PRX0", "pro"), button("VIPX", "vip")]]);
}
function manualAccessText(record) {
  const f = record.features || {};
  const mark = v => v ? "✔️" : "✖️";
  return [record.code, record.telegramUsername ? `Usuario: @${record.telegramUsername}` : "", "Código ya asignado.", "",
    `ONCAM · MYROOM: ${mark(f.oncam)}`, `GRABACIÓN: ${mark(f.rec)}`, `STAGE: ${mark(f.stage)}`,
    `CHAT: ${mark(f.chat)}`, `MULTIMEDIA: ${mark(f.multimedia)}`,
    `Duración: ${record.unlimited ? "Ilimitada" : record.days + " días"}`].filter(v => v !== "").join("\n");
}
async function findManualAccess(username) {
  const client = await ensureRedis();
  if (!client) throw new Error("Redis unavailable");
  const keys = await scanKeys(`${CODE_ENGINE_NAMESPACE}:code:*`);
  let latest = null;
  for (let i = 0; i < keys.length; i += 100) {
    const values = await client.mget(keys.slice(i, i + 100));
    for (const raw of values) {
      let r; try { r = JSON.parse(raw); } catch { continue; }
      if (r?.source !== "admin_manual" || String(r.telegramUsername || "").toLowerCase() !== username || r.status !== "active") continue;
      if (r.expiresAt && Date.parse(r.expiresAt) <= Date.now()) continue;
      if (!latest || String(r.createdAt) > String(latest.createdAt)) latest = r;
    }
  }
  return latest;
}
async function showManualAccess(ctx, inputUsername) {
  if (!isAdmin(ctx)) return ctx.reply("❌ Unauthorized.");
  const arg = typeof inputUsername === "string" ? inputUsername : getCommandArg(ctx);
  if (typeof inputUsername !== "string") {
    if (ctx.chat?.type !== "private") return ctx.reply("Abre el chat privado del bot para agregar usuarios.");
    const mode = ctx.state?.accessEntryMode;
    if (!mode) return ctx.reply("No se pudo abrir Agregar usuarios. Intenta /access de nuevo.");
    await mode.enter(ctx);
    if (!arg) return;
  }
  const target = arg ? normalizeTelegramFxUsername(arg) : null;
  if (arg && !target) return ctx.reply("Uso: /access @username");
  if (target) await ctx.state?.accessEntryMode?.remember?.(ctx, target.normalized);
  const existing = target ? await findManualAccess(target.normalized) : null;
  if (existing) return ctx.reply(manualAccessText(existing), manualAccessKeyboard(existing.planId, target.normalized, existing.code));
  return ctx.reply(`Selecciona el código que deseas otorgar${target ? " a " + target.display : ""}:`, manualAccessKeyboard("", target?.normalized || ""));
}
async function handleManualAccess(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery("❌ Unauthorized.");
  await ctx.answerCbQuery();
  const planId = ctx.match[1];
  const username = String(ctx.match[2] || "").toLowerCase();
  const message = ctx.callbackQuery.message;
  if (!message) return;
  const client = await ensureRedis();
  if (!client) return ctx.reply("No se pudo conectar a Redis.");
  const requestKey = `${CODE_ENGINE_NAMESPACE}:manual:${message.chat.id}:${message.message_id}`;
  const token = crypto.randomUUID();
  const lockKey = username ? `${CODE_ENGINE_NAMESPACE}:manual-lock:${username}` : requestKey + ":lock";
  if (await client.set(lockKey, token, "EX", 30, "NX") !== "OK") return ctx.reply("Cambio en proceso. Intenta de nuevo.");
  try {
    const previous = await client.get(requestKey);
    const replacing = previous?.startsWith("replace:") ? previous.slice(8) : "";
    const existing = username ? await findManualAccess(username) : null;
    if (existing && (!replacing || existing.code !== replacing)) {
      return ctx.editMessageText(manualAccessText(existing), manualAccessKeyboard(existing.planId, username, existing.code));
    }
    if (previous && !replacing) return ctx.reply(`Código ya generado: ${previous}`);
    if (replacing && !existing) return ctx.reply("El código anterior cambió. Abre /access de nuevo.");
    const record = await generateAccessCode(planId, "admin_manual", "", null, username || null);
    if (existing) {
      // Revoke the old bearer credential after its replacement exists.
      await client.eval(`local v=redis.call('GET',KEYS[1]); if not v then return 0 end; local r=cjson.decode(v); r.status='revoked'; redis.call('SET',KEYS[1],cjson.encode(r),'KEEPTTL'); return 1`, 1, getCodeKey(existing.code));
    }
    await client.set(requestKey, record.code);
    return ctx.editMessageText(manualAccessText(record), manualAccessKeyboard(planId, username, record.code));
  } catch (error) {
    logger.error("MANUAL ACCESS ERROR", { message: error?.message });
    return ctx.reply("No se pudo completar el cambio. Abre /access para comprobar el estado.");
  } finally {
    await client.eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, lockKey, token);
  }
}
function manualPrivilegeKeyboard(record) {
  const toggle = (label, field) => Markup.button.callback(
    `${label} ${record.features?.[field] ? "✔️" : "✖️"}`,
    `manual_manage:toggle_${field}:${record.code}`
  );
  return Markup.inlineKeyboard([
    [toggle("ONCAM", "oncam"), toggle("REC", "rec"), toggle("STAGE", "stage")],
    [toggle("CHAT", "chat"), toggle("GALLERY", "multimedia"), Markup.button.callback("CODE", `manual_manage:code:${record.code}`)],
  ]);
}
async function handleManualManage(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery("Unauthorized");
  await ctx.answerCbQuery();
  const [, action, code] = ctx.match;
  const client = await ensureRedis();
  if (action === "exit") {
    if (!client) return ctx.reply("No se pudo cerrar el panel. Intenta de nuevo.");
    const botId = ctx.state?.accessEntryMode === accessEntryModes.get(adminBot) ? "admin" : "user";
    await client.del(`${CODE_ENGINE_NAMESPACE}:add-users:${botId}:${ctx.chat.id}:${ctx.from.id}`);
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    return ctx.reply("Modo agregar usuarios cerrado.", { reply_markup: { remove_keyboard: true } });
  }
  let record = await getAccessCode(code);
  if (!client || record?.source !== "admin_manual" || record.status !== "active") return ctx.reply("Código inactivo. Abre /access para consultar el estado.");
  const username = String(record.telegramUsername || "").toLowerCase();
  if (action.startsWith("toggle_")) {
    const field = action.slice(7);
    await client.eval(`local v=redis.call('GET',KEYS[1]); if not v then return 0 end; local r=cjson.decode(v); if r.status~='active' then return 0 end; r.features=r.features or {}; r.features[ARGV[1]]=not r.features[ARGV[1]]; redis.call('SET',KEYS[1],cjson.encode(r),'KEEPTTL'); return 1`, 1, getCodeKey(code), field);
    record = await getAccessCode(code);
  }
  if (action === "code") {
    const m = ctx.callbackQuery.message;
    await client.set(`${CODE_ENGINE_NAMESPACE}:manual:${m.chat.id}:${m.message_id}`, `replace:${code}`);
    return ctx.editMessageText(`@${username} · Código actual: ${code}\nSelecciona el nuevo código:`, manualAccessKeyboard("", username));
  }
  if (action === "delete") return ctx.editMessageText(`¿Eliminar el acceso ${code} de @${username}?`, Markup.inlineKeyboard([
    [Markup.button.callback("ELIMINAR ❌", `manual_manage:confirm_delete:${code}`), Markup.button.callback("CANCELAR", `manual_manage:view:${code}`)]
  ]));
  if (action === "confirm_delete") {
    await client.eval(`local v=redis.call('GET',KEYS[1]); if not v then return 0 end; local r=cjson.decode(v); r.status='revoked'; redis.call('SET',KEYS[1],cjson.encode(r),'KEEPTTL'); return 1`, 1, getCodeKey(code));
    return ctx.editMessageText(`Acceso eliminado: ${code}\n@${username}`, manualAccessKeyboard("", username));
  }
  if (action === "text") {
    if (!username) return ctx.reply("Este código no tiene un usuario asignado.");
    const prompt = await ctx.reply(`Escribe el mensaje para @${username}. Responde a este mensaje; /cancel para cancelar.`, {reply_markup:{force_reply:true,selective:true}});
    await client.set(`${CODE_ENGINE_NAMESPACE}:manual-text:${ctx.botInfo.id}:${ctx.chat.id}:${ctx.from.id}:${prompt.message_id}`, code, "EX", 600);
    return;
  }
  const editing = action === "edit" || action.startsWith("toggle_");
  return ctx.editMessageText(manualAccessText(record), editing ? manualPrivilegeKeyboard(record) : manualAccessKeyboard(record.planId, username, code));
}
async function manualTextMiddleware(ctx, next) {
  if (["←", "EXIT", "ᴇxɪᴛ", "SALIR", "ꜱᴀʟɪʀ"].includes(ctx.message?.text?.trim())) return next();
  const replyId = ctx.message?.reply_to_message?.message_id;
  if (!replyId || !ctx.message?.text || !isAdmin(ctx) || ctx.chat?.type !== "private") return next();
  const client = await ensureRedis();
  if (!client) return next();
  const key = `${CODE_ENGINE_NAMESPACE}:manual-text:${ctx.botInfo.id}:${ctx.chat.id}:${ctx.from.id}:${replyId}`;
  const code = await client.get(key);
  if (!code) return next();
  if (ctx.message.text === "/cancel") { await client.del(key); return ctx.reply("Envío cancelado."); }
  const record = await getAccessCode(code);
  if (record?.status !== "active") return ctx.reply("El acceso ya no está activo.");
  const recipient = await resolveNoticeRecipient(record.telegramUsername, client);
  if (!recipient) return ctx.reply(NOTICE_RESULTS.unreachable);
  if (await client.set(key + ":sending", "1", "EX", 600, "NX") !== "OK") return ctx.reply("Este mensaje ya fue procesado.");
  try {
    await bot.telegram.sendMessage(recipient, ctx.message.text);
    await client.del(key);
    return ctx.reply("Mensaje enviado.");
  } catch (error) {
    logger.error("MANUAL TEXT ERROR", { message: error?.message });
    return ctx.reply("No se confirmó la entrega. Revisa el chat antes de intentar otro envío.");
  }
}
for (const targetBot of [bot, adminBot]) {
  targetBot.command("access", showManualAccess);
  targetBot.action(/^manual_access:(special|basic|pro|vip)(?::([A-Za-z0-9_]{3,32}))?$/, handleManualAccess);
  targetBot.action(/^manual_manage:(view|edit|code|text|delete|confirm_delete|exit|toggle_(?:oncam|rec|stage|chat|multimedia)):((?:SPCL|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4})$/, handleManualManage);
}
// =======  ADMIN: TELEGRAMFX ACCESS PANEL ==================
          async function showTelegramPermissions(ctx) {
            if (!isAdmin(ctx)) return await ctx.reply("✘ ᴜɴᴀᴜᴛʜᴏʀɪᴢᴇᴅ.");
            try {
              let accessTarget = getCommandArg(ctx);
              if (!accessTarget) return ctx.reply("Uso: /permissions @username");
              if (/^\d{5,20}$/.test(accessTarget)) {
                try {
                  const chat = await ctx.telegram.getChat(accessTarget);
                  accessTarget = String(chat?.username || syntheticUsernameForId(accessTarget));
                } catch {
                  accessTarget = syntheticUsernameForId(accessTarget);
                }
              }
              const parsed = normalizeTelegramFxUsername(accessTarget);
              if (!parsed) return await ctx.reply("Uso: /permissions @username");
              const record = await getTelegramFxAccess(parsed.normalized);
              const mask = telegramFxMask(record);
              await ctx.reply(telegramFxPanelText(parsed.display, mask, true), {
                parse_mode: "HTML",
                reply_markup: telegramFxPanelKeyboard(parsed.normalized, mask).reply_markup,
              });
            } catch (error) {
              logger.error("ᴛᴇʟᴇɢʀᴀᴍꜰx ᴀᴄᴄᴇꜱꜱ ᴄᴏᴍᴍᴀɴᴅ ᴇʀʀᴏʀ", { ...getTelegramError(error), stack: getErrorStack(error) });
              await ctx.reply("✘ ᴛʜᴇ ᴘᴇʀᴍɪꜱꜱɪᴏɴꜱ ᴘᴀɴᴇʟ ᴄᴏᴜʟᴅ ɴᴏᴛ ʙᴇ ᴏᴘᴇɴᴇᴅ.");
            }
          }
bot.command("permissions", showTelegramPermissions);
adminBot.command("permissions", showTelegramPermissions);
          for (const targetBot of [bot, adminBot]) targetBot.action(/^tfx_toggle_([A-Za-z0-9_]{3,32})_(\d{1,2})$/, async (ctx) => {
            if (!isAdmin(ctx)) return await ctx.answerCbQuery("✘ Unauthorized");
            const username = String(ctx.match[1]).toLowerCase();
            const mask = Math.max(0, Math.min(31, Number(ctx.match[2]) || 0));
            await ctx.answerCbQuery("ᴄʜᴀɴɢᴇ ᴘʀᴇᴘᴀʀᴇᴅ");
            await ctx
              .editMessageText(telegramFxPanelText(`@${username}`, mask, false), {
      parse_mode: "HTML",
      reply_markup: telegramFxPanelKeyboard(username, mask).reply_markup,
    })
    .catch(() => {});
});
for (const targetBot of [bot, adminBot]) targetBot.action(/^tfx_save_([A-Za-z0-9_]{3,32})_(\d{1,2})$/, async (ctx) => {
  if (!isAdmin(ctx)) return await ctx.answerCbQuery("✘ ᴜɴᴀᴜᴛʜᴏʀɪᴢᴇᴅ");
  const username = String(ctx.match[1]).toLowerCase();
  const mask = Math.max(0, Math.min(31, Number(ctx.match[2]) || 0));
  try {
    await saveTelegramFxAccess(username, mask, ctx.from);
    await ctx.answerCbQuery("✔ ꜱᴀᴠᴇ");
    await ctx
      .editMessageText(telegramFxPanelText(`@${username}`, mask, true), {
        parse_mode: "HTML",
        reply_markup: telegramFxPanelKeyboard(username, mask).reply_markup,
      })
      .catch(() => {});
  } catch (error) {
    logger.error("ᴛᴇʟᴇɢʀᴀᴍꜰx ꜱᴀᴠᴇ ᴇʀʀᴏʀ", {
      username,
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.answerCbQuery("✘ ᴇʀʀᴏʀ ꜱᴀᴠɪɴɢ", { show_alert: true });
  }
});
for (const targetBot of [bot, adminBot]) targetBot.action(/^tfx_revoke_([A-Za-z0-9_]{3,32})_0$/, async (ctx) => {
  if (!isAdmin(ctx)) return await ctx.answerCbQuery("✘ Unauthorized");
  const username = String(ctx.match[1]).toLowerCase();
  try {
    await revokeTelegramFxAccess(username, ctx.from);
    await ctx.answerCbQuery("⛔ ᴀᴄᴄᴇꜱꜱ ʀᴇᴠᴏᴋᴇᴅ");
    await ctx
      .editMessageText(telegramFxPanelText(`@${username}`, 0, true), {
        parse_mode: "HTML",
        reply_markup: telegramFxPanelKeyboard(username, 0).reply_markup,
      })
      .catch(() => {});
  } catch (error) {
    logger.error("TELEGRAMFX REVOKE ERROR", {
      username,
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.answerCbQuery("✘ ᴇʀʀᴏʀ ʀᴇᴠᴏᴋɪɴɢ", { show_alert: true });
  }
});
bot.command("find", async (ctx) => {
  if (!isAdmin(ctx)) return await ctx.reply("✘ Unauthorized.");
  try {
    const parsed = normalizeTelegramFxUsername(getCommandArg(ctx));
    if (!parsed) return await ctx.reply("Uso: /find @username");
    const record = await getTelegramFxAccess(parsed.normalized);
    if (!record) return await ctx.reply(`✘ ${parsed.display} no está registrado.`);
    const mask = telegramFxMask(record);
    await ctx.reply(telegramFxPanelText(record.username || parsed.display, mask, true), {
      parse_mode: "HTML",
    });
  } catch (error) {
    logger.error("ᴛᴇʟᴇɢʀᴀᴍꜰx ꜰɪɴᴅ ᴇʀʀᴏʀ", {
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.reply("✘ ᴛʜᴇ ᴜꜱᴇʀ ᴄᴏᴜʟᴅ ɴᴏᴛ ʙᴇ ǫᴜᴇʀɪᴇᴅ.");
  }
});

bot.command("revoke", async (ctx) => {
  if (!isAdmin(ctx)) return await ctx.reply("✘ Unauthorized.");
  try {
    const parsed = normalizeTelegramFxUsername(getCommandArg(ctx));
    if (!parsed) return await ctx.reply("Uso: /revoke @username");
    await revokeTelegramFxAccess(parsed.normalized, ctx.from);
    await ctx.reply(`⛔ Acceso revocado para ${parsed.display}.`);
  } catch (error) {
    logger.error("Tᴛᴇʟᴇɢʀᴀᴍꜰx ʀᴇᴠᴏᴋᴇ ᴄᴏᴍᴍᴀɴᴅ ᴇʀʀᴏʀ", {
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.reply("✘ ᴀᴄᴄᴇꜱꜱ ᴄᴏᴜʟᴅ ɴᴏᴛ ʙᴇ ʀᴇᴠᴏᴋᴇᴅ.");
  }
});
bot.command("users", async (ctx) => {
  if (!isAdmin(ctx)) return await ctx.reply("✘ Unauthorized.");
  try {
    const rows = await listTelegramFxUsers(50);
    if (!Array.isArray(rows) || !rows.length) {
      return await ctx.reply("No hay usuarios TelegramFX todavía.");
    }
    const text = rows
      .map((row, index) => {
        const mask = telegramFxMask(row);
        return `${index + 1}. ${row.username || "@unknown"} · ${mask ? "✅" : "⛔"} · ${mask.toString(2).padStart(5, "0")}`;
      })
      .join("\n");
    await ctx.reply(`👥 TELEGRAMFX USERS\n\n${text}\n\nUsa /permissions @username para editar.`, Markup.inlineKeyboard([[Markup.button.callback("✉ Avisar a pendientes", "tfx_notify_batch:0")]]));
  } catch (error) {
    logger.error("TELEGRAMFX USERS ERROR", {
      ...getTelegramError(error),
      stack: getErrorStack(error),
    });
    await ctx.reply("✘ No se pudo cargar la lista.");
  }
});

async function resolveNoticeRecipient(username, client) {
  let candidate = await client.get(`${CODE_ENGINE_NAMESPACE}:private-recipient:${username}`);
  if (!candidate) {
    // Backfill only from historical first-party bot interactions.
    const matches = new Set();
    const keys = (await scanKeys("button_click:*")).slice(0, 2000);
    for (let i = 0; i < keys.length; i += 100) {
      for (const raw of await client.mget(keys.slice(i, i + 100))) {
        try {
          const row = JSON.parse(raw);
          if (String(row.username || "").replace(/^@/, "").toLowerCase() === username && /^\d{5,20}$/.test(String(row.id))) matches.add(String(row.id));
        } catch {}
      }
    }
    if (matches.size !== 1) return null;
    candidate = [...matches][0];
  }
  try {
    const chat = await bot.telegram.getChat(candidate);
    if (chat.type !== "private" || String(chat.username || "").toLowerCase() !== username) return null;
    await client.set(`${CODE_ENGINE_NAMESPACE}:private-recipient:${username}`, String(chat.id));
    return String(chat.id);
  } catch { return null; }
}
async function notifyRegisteredAccess(username) {
  const client = await ensureRedis();
  if (!client) throw new Error("Redis unavailable");
  const access = await getTelegramFxAccess(username);
  return sendAccessNotice({
    redis: client, telegram: bot.telegram, namespace: CODE_ENGINE_NAMESPACE,
    username, access, siteUrl: USERFX_SITE_URL,
    resolveRecipient: (target) => resolveNoticeRecipient(target, client),
  });
}
const NOTICE_RESULTS = {
  sent: "Aviso enviado.", already: "Este usuario ya recibió el aviso o tiene un envío pendiente.",
  inactive: "El usuario no tiene acceso web activo. Guarda sus permisos primero.",
  unreachable: "No hay un chat privado verificado. Comparte https://t.me/User18Fx_bot y pide al usuario que lo inicie.",
  blocked: "Telegram rechazó el envío: el usuario bloqueó el bot o no permite contacto.",
  failed: "Telegram rechazó el envío. Puedes reintentarlo después.",
  uncertain: "Telegram no confirmó la entrega. No se repetirá automáticamente para evitar duplicados.",
};
async function handleAccessNotice(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery("Unauthorized");
  await ctx.answerCbQuery();
  try {
    const username = String(ctx.match[1]).toLowerCase();
    return ctx.reply(`@${username}: ${NOTICE_RESULTS[await notifyRegisteredAccess(username)]}`);
  } catch (error) {
    logger.error("ACCESS NOTICE ERROR", { message: error?.message });
    return ctx.reply("No se pudo completar el aviso. Revisa el estado antes de repetir.");
  }
}
async function showAccessNotices(ctx) {
  if (!isAdmin(ctx)) return ctx.reply("Unauthorized");
  return ctx.reply("Avisar a usuarios con acceso web activo que aún no recibieron el aviso. Se procesan 10 por lote; los envíos confirmados no se repiten.", Markup.inlineKeyboard([[Markup.button.callback("✉ Avisar a pendientes", "tfx_notify_batch:0")]]));
}
async function handleAccessNoticeBatch(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery("Unauthorized");
  await ctx.answerCbQuery();
  const cursor = ctx.match[1] === "0" ? "" : ctx.match[1];
  try {
    const client = await ensureRedis();
    if (!client) throw new Error("Redis unavailable");
    const batchKey = `${CODE_ENGINE_NAMESPACE}:notice-batch:${ctx.chat.id}:${ctx.callbackQuery.message.message_id}:${cursor}`;
    if (await client.set(batchKey, "started", "NX") !== "OK") return ctx.reply("Este lote ya fue iniciado. Usa /notify_access para volver a revisar pendientes.");
    const filter = cursor ? `&username_normalized=gt.${encodeURIComponent(cursor)}` : "";
    const rows = await telegramFxRequest(`telegramfx_access?select=username_normalized&enabled=eq.true&telegramfx_access=eq.true&order=username_normalized.asc&limit=11${filter}`);
    const results = {};
    const unresolved = [];
    for (const row of (rows || []).slice(0, 10)) {
      const username = row.username_normalized;
      if (!normalizeTelegramFxUsername(username)) continue;
      const status = await notifyRegisteredAccess(username);
      results[status] = (results[status] || 0) + 1;
      if (!["sent", "already"].includes(status)) unresolved.push(`@${username}: ${NOTICE_RESULTS[status]}`);
    }
    const more = rows?.length > 10;
    const next = more ? rows[9].username_normalized : null;
    await ctx.reply(`Avisos enviados: ${results.sent || 0}. Ya procesados: ${results.already || 0}. Sin envío confirmado: ${unresolved.length}.\n${unresolved.join("\n")}\n${more ? "Continúa con el siguiente lote." : "Lista recorrida. Los usuarios sin chat verificado deben iniciar el bot; después puedes volver a revisar pendientes."}`, more ? Markup.inlineKeyboard([[Markup.button.callback("Siguiente lote", `tfx_notify_batch:${next}`)]]) : {});
  } catch (error) {
    logger.error("ACCESS NOTICE BATCH ERROR", { message: error?.message });
    return ctx.reply("El lote no terminó. Usa /notify_access para revisar pendientes; los avisos confirmados no se repetirán.");
  }
}
for (const targetBot of [bot, adminBot]) {
  targetBot.action(/^tfx_notify_([A-Za-z0-9_]{3,32})$/, handleAccessNotice);
  targetBot.action(/^tfx_notify_batch:(0|[A-Za-z0-9_]{3,32})$/, handleAccessNoticeBatch);
  targetBot.command("notify_access", showAccessNotices);
}


async function handleManualNotice(ctx) {
  if (!isAdmin(ctx)) return ctx.answerCbQuery("Unauthorized");
  await ctx.answerCbQuery();
  try {
    const client = await ensureRedis();
    const code = ctx.match[1];
    const record = await getAccessCode(code);
    const username = normalizeTelegramFxUsername(record?.telegramUsername || "")?.normalized;
    if (!client || record?.source !== "admin_manual" || record.status !== "active" || !username) {
      return ctx.reply("No hay un destinatario válido para este código.");
    }
    const result = await sendAccessNotice({
      redis: client, telegram: bot.telegram, namespace: CODE_ENGINE_NAMESPACE,
      username, access: { enabled: true, telegramfx_access: true },
      siteUrl: USERFX_SITE_URL, noticeId: code,
      text: `You've been granted ${record.plan} access to USER FX. Your personal access code is ${record.code}. Open the website and choose ALREADY GOT CODE to enter.`,
      identityKey: false,
      resolveRecipient: (target) => resolveNoticeRecipient(target, client),
    });
    return ctx.reply(`@${username}: ${NOTICE_RESULTS[result]}`);
  } catch (error) {
    logger.error("MANUAL NOTICE ERROR", { message: error?.message });
    return ctx.reply("No se pudo confirmar el aviso.");
  }
}
for (const targetBot of [bot, adminBot]) {
  targetBot.action(/^manual_notify:((?:SPCL|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4})$/, handleManualNotice);
}

//// ADMIN CODE LOOKUP //
adminBot.command("code", async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply("✘ Unauthorized.");
    return;
  }
  const code = getCommandArg(ctx);
  if (!code) {
    await ctx.reply("Usage: /code BSIC-XXXX");
    return;
  }
  const result = await validateAccessCode(code);
  if (!result.valid) {
    await ctx.reply(`✘ Code invalid.\n\nReason: ${result.reason}`);
    return;
  }
  const record = result.record;
  await ctx.reply(`✔ CODE FOUND\n\nCode: ${record.code}\nPlan: ${record.plan}\nPlan ID: ${record.planId}\nSource: ${record.source}\nUser ID: ${record.userId}\nStatus: ${record.status}\nUsed accesses: ${record.usedAccesses ?? 0}\nRemaining accesses: ${record.remainingAccesses ?? "UNLIMITED"}\nCreated: ${record.createdAt}`);
});
//// ERROR HANDLERS //
bot.catch((error, ctx) => {
  logger.error("BOT ERROR", {
    updateId: ctx?.update?.update_id ?? null,
    ...getTelegramError(error),
    stack: getErrorStack(error),
  });
});
adminBot.catch((error, ctx) => {
  logger.error("ADMIN BOT ERROR", {
    updateId: ctx?.update?.update_id ?? null,
    chatId: ctx?.chat?.id ?? null,
    userId: ctx?.from?.id ?? null,
    ...getTelegramError(error),
    stack: getErrorStack(error),
  });
});
//// RAW BODY READER //
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    if (typeof req.setEncoding === "function") {
      req.setEncoding("utf8");
    }
    req.on("data", (chunk) => {
      const piece = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      bytes += Buffer.byteLength(piece, "utf8");
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error("payload_too_large"));
        if (typeof req.destroy === "function") {
          req.destroy();
        }
        return;
      }
      body += piece;
    });
    req.on("end", () => resolve(body));
    req.on("error", (error) => reject(error));
  });
}
async function getRequestBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== "") {
    if (typeof req.body === "string") {
      return req.body;
    }
    if (Buffer.isBuffer(req.body)) {
      return req.body.toString("utf8");
    }
    if (typeof req.body === "object") {
      return req.body;
    }
  }
  return readRawBody(req);
}
function getQueryValue(req, key) {
  const value = req.query?.[key];
  if (Array.isArray(value)) {
    return String(value[0] || "");
  }
  return String(value || "");
}
// ========  TELEGRAM BODY PARSER =================
function parseTelegramBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    throw new Error("Request body is empty");
  }
  if (typeof rawBody === "object") {
    return rawBody;
  }
  const raw = String(rawBody)
    .replace(/^\uFEFF/, "")
    .trim();
  if (!raw) {
    throw new Error("Request body is empty");
  }
  return JSON.parse(raw);
}
//// WEBHOOK HANDLER //
export default async function handler(req, res) {
  logger.info("TELEGRAM WEBHOOK REQUEST", {
    method: req.method,
    contentType: req.headers["content-type"] || null,
    contentLength: req.headers["content-length"] || null,
    secretPresent: Boolean(req.headers["x-telegram-bot-api-secret-token"]),
  });
  //// GET //
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, service: "telegram-webhook", status: "online" });
  }
  //// METHOD //
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }
  //// SECRET //
  const incomingSecret = String(req.headers["x-telegram-bot-api-secret-token"] || "").trim();
  const userSecret = String(WEBHOOK_SECRET || "").trim();
  const adminSecret = String(ADMIN_WEBHOOK_SECRET || "").trim();
  const requestedBot = getQueryValue(req, "bot").trim().toLowerCase();
  let isAdminWebhookRoute = incomingSecret.length > 0 && adminSecret.length > 0 && secureCompare(incomingSecret, adminSecret);
  let isUserWebhookRoute = incomingSecret.length > 0 && userSecret.length > 0 && secureCompare(incomingSecret, userSecret);
  if (isAdminWebhookRoute && isUserWebhookRoute) {
    if (requestedBot === "admin") {
      isUserWebhookRoute = false;
    } else {
      isAdminWebhookRoute = false;
    }
  }
  logger.info("TELEGRAM WEBHOOK SECRET CHECK", {
    incomingSecretPresent: Boolean(incomingSecret),
    isUser: isUserWebhookRoute,
    isAdmin: isAdminWebhookRoute,
    requestedBot: requestedBot || null,
  });
  if (!isAdminWebhookRoute && !isUserWebhookRoute) {
    logger.warn("TELEGRAM WEBHOOK UNAUTHORIZED");
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  //// BODY //
  let rawBody;
  try {
    rawBody = await getRequestBody(req);
    logger.info("TELEGRAM RAW BODY", {
      length: typeof rawBody === "string" ? rawBody.length : null,
    });
  } catch (error) {
    logger.error("BODY READ ERROR", {
      message: error?.message || null,
      stack: getErrorStack(error),
    });
    const status = error?.message === "payload_too_large" ? 413 : 400;
    return res.status(status).json({
      ok: false,
      error: status === 413 ? "payload_too_large" : "body_read_error",
      message: error?.message || "Unable to read request body",
    });
  }
  //// JSON //
  let update;
  try {
    update = parseTelegramBody(rawBody);
  } catch (error) {
    logger.error("BODY JSON PARSE ERROR", {
      message: error?.message || null,
    });
    return res.status(400).json({
      ok: false,
      error: "invalid_json",
      message: error?.message || "Invalid JSON",
    });
  }
  //// UPDATE VALIDATION //
  if (!update || typeof update !== "object" || Array.isArray(update)) {
    return res.status(400).json({ ok: false, error: "invalid_update" });
  }
  logger.info("TELEGRAM UPDATE RECEIVED", {
    bot: isAdminWebhookRoute ? "admin" : "user",
    updateId: update.update_id ?? null,
    hasMessage: Boolean(update.message),
    hasText: Boolean(update.message?.text),
    messageText: update.message?.text?.slice(0, 100) || null,
    messageType: Object.keys(update.message || {}).find((k) => ["text", "photo", "video", "document", "sticker", "animation", "voice", "video_note", "location", "contact", "poll"].includes(k)) || "other",
    hasCallback: Boolean(update.callback_query),
    hasPhoto: Boolean(update.message?.photo),
    hasPayment: Boolean(update.message?.successful_payment),
  });
  //// DISPATCH //
  try {
    if (isAdminWebhookRoute) {
      await adminBot.handleUpdate(update);
      return res.status(200).json({ ok: true, bot: "admin" });
    }
    if (isUserWebhookRoute) {
      await bot.handleUpdate(update);
      return res.status(200).json({ ok: true, bot: "ᴜꜱᴇʀ" });
    }
    return res.status(401).json({ ok: false, error: "ɪɴᴠᴀʟɪᴅ_ᴡᴇʙʜᴏᴏᴋ_ʀᴏᴜᴛᴇ" });
  } catch (error) {
    logger.error("ʙᴏᴛ ʜᴀɴᴅʟᴇ ᴜᴘᴅᴀᴛᴇ ᴇʀʀᴏʀ", {
      name: error?.name ?? null,
      message: error?.message ?? null,
      stack: getErrorStack(error),
      description: error?.response?.description ?? null,
    });
    return res.status(500).json({
      ok: false,
      error: "ᴛᴇʟᴇɢʀᴀᴍ_ʜᴀɴᴅʟᴇʀ_ᴇʀʀᴏʀ",
      message: error?.message ?? "unknown_error",
      description: error?.response?.description ?? null,
    });
  }
}




