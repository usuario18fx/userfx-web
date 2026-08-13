import { Telegraf, Markup } from "telegraf";
import Redis from "ioredis";
import winston from "winston";

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
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

const WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET_USER;

const ADMIN_WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET_ADMIN;

const REDIS_URL = process.env.REDIS_URL;
const ZOOM_URL = process.env.ZOOM_URL;
const TELEGRAM_CALL_URL = process.env.TELEGRAM_CALL_URL;

const SMOKELANDIA_GROUP_LINK =
  process.env.SMOKELANDIA_GROUP_LINK ||
  "https://t.me/SmokelandiaFx_bot";

const USER_GROUP_LINK =
  process.env.USER_GROUP_LINK ||
  "https://t.me/+v57jkAGn3DA0NWJh";

const USERFX_SITE_URL =
  process.env.USERFX_SITE_URL ||
  "https://userfx-web.vercel.app";

// ======================================================
// WEB VAULT / WEBSITE PAYMENT INTEGRATION
// ======================================================

const VAULT_WEBHOOK_URL =
  process.env.VAULT_WEBHOOK_URL ||
  `${USERFX_SITE_URL.replace(/\/$/, "")}/api/telegram/webhook`;

const VAULT_WEBHOOK_SECRET =
  process.env.VAULT_WEBHOOK_SECRET ||
  process.env.TELEGRAM_WEBHOOK_SECRET ||
  "";

function isVaultPayload(payload) {
  const value = String(payload || "").trim();
  return /^(FX01|AX01|VIPX)-/i.test(value);
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
// BOTS
// ======================================================

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing");
}

if (!ADMIN_BOT_TOKEN) {
  throw new Error("ADMIN_BOT_TOKEN is missing");
}

const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);

bot.telegram.webhookReply = false;
adminBot.telegram.webhookReply = false;

// ======================================================
// BOT TOKEN VALIDATION
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

// Do not block module initialization.
void validateBotTokens();

// ======================================================
// VALIDATE ENV
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
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
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

// ======================================================
// REDIS HELPERS
// ======================================================

async function redisGetJson(key) {
  if (!redis) {
    return null;
  }

  try {
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

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
  if (!redis) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);

    if (ttl) {
      await redis.set(key, serialized, "EX", ttl);
    } else {
      await redis.set(key, serialized);
    }

    return true;
  } catch (error) {
    logger.error("REDIS SET ERROR", {
      key,
      message: error?.message,
    });

    return false;
  }
}

async function redisDelete(key) {
  if (!redis) {
    return;
  }

  try {
    await redis.del(key);
  } catch (error) {
    logger.error("REDIS DELETE ERROR", {
      key,
      message: error?.message,
    });
  }
}

async function scanKeys(pattern) {
  if (!redis) {
    return [];
  }

  const keys = [];
  let cursor = "0";

  try {
    do {
      const result = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );

      cursor = result[0];

      if (result[1]?.length) {
        keys.push(...result[1]);
      }
    } while (cursor !== "0");

    return keys;
  } catch (error) {
    logger.error("REDIS SCAN ERROR", {
      pattern,
      message: error?.message,
    });

    return [];
  }
}

// ======================================================
// DATA
// ======================================================

async function getPaidUser(userId) {
  return redisGetJson(`paid_user:${String(userId)}`);
}

async function setPaidUser(userId, data) {
  return redisSetJson(`paid_user:${String(userId)}`, data);
}

const VIDEO_REQUEST_TTL = 60 * 60 * 6;

async function getVideoRequest(userId) {
  return redisGetJson(`video_request:${String(userId)}`);
}

async function setVideoRequest(userId, data) {
  return redisSetJson(
    `video_request:${String(userId)}`,
    data,
    VIDEO_REQUEST_TTL
  );
}

async function deleteVideoRequest(userId) {
  const id = String(userId);
  await redisDelete(`video_request:${id}`);
}

// ======================================================
// PAYMENT IDEMPOTENCY
// ======================================================

async function hasProcessedPayment(chargeId) {
  if (!chargeId || !redis) {
    return false;
  }

  try {
    return Boolean(
      await redis.exists(
        `processed_payment:${String(chargeId)}`
      )
    );
  } catch (error) {
    logger.error("PAYMENT CHECK ERROR", {
      chargeId,
      message: error?.message,
    });

    return false;
  }
}

async function markPaymentProcessed(chargeId) {
  if (!chargeId || !redis) {
    return false;
  }

  try {
    await redis.set(
      `processed_payment:${String(chargeId)}`,
      "1",
      "EX",
      60 * 60 * 24 * 365
    );

    return true;
  } catch (error) {
    logger.error("PAYMENT MARK ERROR", {
      chargeId,
      message: error?.message,
    });

    return false;
  }
}

// ======================================================
// CONSTANTS
// ======================================================

const VIP_STARS_PRICE = 499;
const USER_STARS_PRICE = 99;
const PRO_STARS_PRICE = 249;

const STARS_130_PAYLOAD = "videocall_access_130";
const STARS_130_PRICE = 130;

const VIP_PAYLOAD = "VIPX_DIRECT";
const USER_PAYLOAD = "FX01_DIRECT";
const PRO_PAYLOAD = "AX01_DIRECT";

const TIER_VIP = "ᴠɪᴘ";
const TIER_USER = "ᴜꜱᴇʀ";

const REQUEST_STATUS = {
  WAITING_PHOTO: "waiting_photo",
  AWAITING_ADMIN: "awaiting_admin",
  AWAITING_PAYMENT: "awaiting_payment",
  PAID: "paid",
  APPROVED: "approved",
};

// ======================================================
// BUTTONS
// ======================================================

const BTN_VIDEOCALL = "📞 ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_GET_FULL_ACCESS = "ɢᴇᴛ ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ";
const BTN_VIP = "👑 ᴠɪᴘ";
const BTN_USER = "⚡ ʙᴀꜱɪᴄ";
const BTN_PRO = "🔥 ᴘʀᴏ";
const BTN_CHANNELS = "📺ᴄʜᴀɴɴᴇʟꜱ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";

const BTN_ZOOM = "🟦 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "💬 ᴛᴇʟᴇɢʀᴀᴍ";

const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_BACK_MENU = "↽ ʙᴀᴄᴋ";

const BTN_SMOKELANDIA = "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "𝐔𝐬𝐞𝐫 🜲∓ҳ";

const BTN_CHANNELS_BACK = "↽ ʙᴀᴄᴋ";
const BTN_PENDING_REQUEST = "ᴘᴇɴᴅɪɴɢ ʀᴇǫᴜᴇꜱᴛ";

// ======================================================
// UTILITIES
// ======================================================

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getUserMeta(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";

  const fullName =
    `${firstName} ${lastName}`.trim() || "No name";

  const username = from?.username
    ? `@${from.username}`
    : "sin_username";

  return {
    fullName,
    username,
    id: String(from?.id || ""),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTelegramError(error) {
  return {
    errorCode: error?.response?.error_code || null,
    description: error?.response?.description || null,
    message: error?.message || null,
    method: error?.response?.parameters || null,
  };
}

// ======================================================
// ADMIN AUTH
// ======================================================

function isAdmin(ctx) {
  return (
    String(ctx.from?.id || "") ===
    String(ADMIN_USER_ID)
  );
}

// ======================================================
// BUTTON TRACKING
// ======================================================

async function trackButtonClick(ctx, buttonName) {
  try {
    if (!redis) {
      return;
    }

    const user = getUserMeta(ctx.from);

    if (!user.id) {
      return;
    }

    const data = {
      fullName: user.fullName,
      username: user.username,
      id: user.id,
      button: buttonName,
      clickedAt: new Date().toISOString(),
    };

    await redis.set(
      `button_click:${user.id}:${Date.now()}`,
      JSON.stringify(data),
      "EX",
      60 * 60 * 24 * 30
    );
  } catch (error) {
    logger.error("TRACK BUTTON ERROR", {
      message: error?.message,
    });
  }
}

// ======================================================
// RATE LIMIT
// ======================================================

async function checkRateLimit(
  userId,
  limit = 3,
  windowSeconds = 300
) {
  if (!redis) {
    return true;
  }

  try {
    const key =
      `rate_limit:videocall:${String(userId)}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return count <= limit;
    } catch (error) {
    logger.error("RATE LIMIT ERROR", {
      message: error?.message,
    });
     return true;
    }}
//// KEYBOARDS // 
function getMainKeyboard() {
  return Markup.keyboard([
    [BTN_VIDEOCALL],
    [BTN_GET_FULL_ACCESS],
    [BTN_VIP, BTN_USER],
    [BTN_PRO],
    [BTN_CHANNELS],
    [BTN_REFRESH],
  ]).resize();
}
function getPendingPhotoKeyboard() {
  return Markup.keyboard([
    [BTN_PENDING_REQUEST],
    [BTN_CANCEL],
  ]).resize();
}

function getApprovedVideocallKeyboard() {
  return Markup.keyboard([
    [BTN_ZOOM, BTN_TELEGRAM],
    [BTN_BACK_MENU],
  ]).resize();
}

function getVideocallInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: BTN_ZOOM,
          url: ZOOM_URL,
        },
        {
          text: BTN_TELEGRAM,
          url: TELEGRAM_CALL_URL,
        },
      ],
    ],
  };
}

function getStarsVipKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "⭐ ❘ᴘᴀʏ𝐕ɪᴘ❘",
        "pay_vip_stars"
      ),
    ],
    [
      Markup.button.callback(
        "↽ ʙᴀᴄᴋ",
        "back_to_main"
      ),
    ],
  ]);
}

function getStarsUserKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "⭐ ❘ᴘᴀʏ𝐔ꜱᴇʀ❘",
        "pay_user_stars"
      ),
    ],
    [
      Markup.button.callback(
        "↽ ʙᴀᴄᴋ",
        "back_to_main"
      ),
    ],
  ]);
}

function getStarsPROKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "⭐ ❘ᴘᴀʏ𝐌ᴏɴᴛʜʟʏ❘",
        "pay_PRO_stars"
      ),
    ],
    [
      Markup.button.callback(
        "↽ ʙᴀᴄᴋ",
        "back_to_main"
      ),
    ],
  ]);
}

function getChannelsKeyboard() {
  return Markup.keyboard([
    [BTN_SMOKELANDIA, BTN_USERFX_SITE],
    [BTN_CHANNELS_BACK],
  ]).resize();
}

// ======================================================
// ACCESS
// ======================================================

async function getAccessState(userId) {
  const entry = await getPaidUser(userId);

  return {
    hasVip: entry?.tier === TIER_VIP,
    hasUser:
      entry?.tier === TIER_USER ||
      entry?.tier === TIER_VIP ||
      entry?.tier === "ᴍᴏɴᴛʜʟʏ",
    entry,
  };
}

// ======================================================
// TYPING
// ======================================================

async function typing(ctx) {
  try {
    await ctx.sendChatAction("typing");
    await sleep(300);
  } catch {
    // Ignore typing errors
  }
}

// ======================================================
// MAIN PANEL
// ======================================================

async function sendMainPanel(ctx) {
  try {
    logger.info("MAIN PANEL: TYPING START");

    await typing(ctx);

    logger.info("MAIN PANEL: TYPING SUCCESS");

    await ctx.reply(
      `𓂅 Ŧҳ🜲 |ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ|
  ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ.
  ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`,
      getMainKeyboard()
    );

    logger.info("MAIN PANEL: REPLY SUCCESS");
  } catch (error) {
    logger.error("MAIN PANEL ERROR", {
      ...getTelegramError(error),
      userId: ctx.from?.id || null,
      chatId: ctx.chat?.id || null,
    });

    throw error;
  }
}

// ======================================================
// MEMBERSHIP
// ======================================================

async function sendMembershipPanel(ctx) {
  await typing(ctx);

  await ctx.reply(
  `ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ
⚡ ʙᴀꜱɪᴄ
   ⇀ ᴘʀɪᴏʀɪᴛʏ ᴀᴄᴄᴇꜱꜱ
   ⇀ ᴘʀɪᴠᴀᴛᴇ ᴜɴʟᴏᴄᴋꜱ
   ⇀ ᴡᴇᴇᴋ¹ / ᴀʟʙᴜᴍ¹
👑 ᴠɪᴘ
   ⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
   ⇀ ᴘʀᴇᴍɪᴜᴍ ꜱᴇᴄᴛɪᴏɴꜱ
   ⇀ ᴡᴇᴇᴋꜱ³ / ᴀʟʙᴜᴍꜱ³
🔥 ᴘʀᴏ
   ⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
   ⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
   ⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ `, getMainKeyboard()
  );
  }
//// VIP //
async function sendVipPanel(ctx) {
  try {
    await ctx.reply(
      `ᴠɪᴘ⚡
  ᴜɴʟᴏᴄᴋ ᴡɪᴛʜ ✪ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ`, getStarsVipKeyboard()
    );
  } catch (error) {
    logger.error("VIP PANEL ERROR", { ...getTelegramError(error),
    });
    }}
//// USER //
async function sendUserPanel(ctx) {
  try {
    await ctx.reply(
      `ᴜꜱᴇʀ👑 
      ᴜɴʟᴏᴄᴋ ᴡɪᴛʜ ✪ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ`, getStarsUserKeyboard()
    );
  } catch (error) {
    logger.error("USER PANEL ERROR", {...getTelegramError(error),
    });
    }}
async function sendPROPanel(ctx) {
  try {
    await ctx.reply(
      `ᴍᴏɴᴛʜʟʏ 👑
      ᴜɴʟᴏᴄᴋ ᴡɪᴛʜ ✪ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ`, getStarsPROKeyboard()
    );
  } catch (error) {
    logger.error("PRO PANEL ERROR", {...getTelegramError(error),
    });
    }}
// ======================================================
// CHANNELS
// ======================================================

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `📺ᴄʜᴀɴɴᴇʟꜱ
  ᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`,
    getChannelsKeyboard()
  );
}

// ======================================================
// REFRESH
// ======================================================

async function sendRefreshPanel(ctx) {
  const { hasVip, hasUser } =
    await getAccessState(ctx.from?.id);

  const tier = hasVip
    ? "⚡ᴠɪᴘ"
    : hasUser
      ? "𝐔𝐬𝐞𝐫 🜲∓ҳ"
      : "ɴᴏ ᴘʟᴀɴ";

  await ctx.reply(
    `↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ
ᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}`,
    getMainKeyboard()
  );
}

// ======================================================
// VIDEOCALL FLOW
// ======================================================
  async function openVideocallFlow(ctx) {
  const userId = String(ctx.from?.id || "");
  if (!userId) {
  return;
  }
  try {
  const allowed = await checkRateLimit(userId,3,300);
    if (!allowed) {
    await ctx.reply(
    "⏳ Please wait before requesting again.");
    return;
    }
    const currentRequest = await getVideoRequest(userId);
   if (
    currentRequest?.status === REQUEST_STATUS.WAITING_PHOTO ||
    currentRequest?.status === REQUEST_STATUS.AWAITING_ADMIN ||
    currentRequest?.status === REQUEST_STATUS.AWAITING_PAYMENT
   ) {
    await ctx.reply(
    "⏳ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ʜᴀᴠᴇ ᴀɴ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ.\n\n" +
    "ʏᴏᴜʀ ᴄᴜʀʀᴇɴᴛ ʀᴇǫᴜᴇꜱᴛ ɪꜱ ꜱᴛɪʟʟ ᴘʀᴏᴄᴇꜱꜱɪɴɢ.",
    getPendingPhotoKeyboard()
    );
    return;
    }
    const user = getUserMeta(ctx.from); 
    const request = {
      userId,
      fullName: user.fullName,
      username: user.username,
      status: REQUEST_STATUS.WAITING_PHOTO,
      invalidTextCount: 0,
      createdAt: Date.now(),
    };
    await setVideoRequest(userId, request);
    await ctx.reply(
      `ʜᴏʟᴅ ᴜᴘ...
      ᴡᴇ ɴᴇᴇᴅ ᴀ ᴘʜᴏᴛᴏ ꜰɪʀꜱᴛ.
      ꜱᴇɴᴅ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ʜᴇʀᴇ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ.`, getPendingPhotoKeyboard());
    logger.info("ADMIN REQUEST SEND START", { adminChatId: ADMIN_CHAT_ID, userId, });
    await adminBot.telegram.sendMessage(ADMIN_CHAT_ID,
      `📞 <b>ɴᴇᴡ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ</b>
     ɴᴀᴍᴇ: ${escapeHtml(user.fullName)}
     ɴᴀᴍᴇ: ${escapeHtml(user.username)}
     ɪᴅ: ${escapeHtml(user.id)}
     ᴄʜᴀᴛ ɪᴅ: ${escapeHtml(userId)}
     ⏳ᴡᴀɪᴛɪɴɢ ꜰᴏʀ ᴘʜᴏᴛᴏ...`,
      {parse_mode: "HTML",});
    logger.info("ADMIN REQUEST SEND SUCCESS",{adminChatId: ADMIN_CHAT_ID, userId, });
    } catch (error) {
     logger.error("OPEN VIDEOCALL FLOW ERROR",
    {userId,...getTelegramError(error), stack: error?.stack || null,}
    ); 
    }
    }
// ======================================================
// PENDING VIDEOCALL PANEL
// ======================================================

async function sendPendingVideocallPanel(ctx) {
  const userId = String(ctx.from?.id || "");

  if (!userId) {
    return;
  }

  try {
    const request =
      await getVideoRequest(userId);

    if (!request) {
      await ctx.reply(
        `⏳ ɴᴏ ᴘᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ.
ᴡʜᴇɴ ʏᴏᴜ ʀᴇǫᴜᴇꜱᴛ ᴀ ᴠɪᴅᴇᴏᴄᴀʟʟ, ɪᴛ ᴡɪʟʟ ᴀᴘᴘᴇᴀʀ ʜᴇʀᴇ.`,
        getMainKeyboard()
      );

      return;
    }

    let message = "";

    switch (request.status) {
      case REQUEST_STATUS.WAITING_PHOTO:
        message =
          `📸 ᴘᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ
⏳ ꜱᴛᴀᴛᴜꜱ: ᴡᴀɪᴛɪɴɢ ꜰᴏʀ ᴘʜᴏᴛᴏ
ᴡᴇ ɴᴇᴇᴅ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ.
📸 ꜱᴇɴᴅ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ʜᴇʀᴇ.`;
        break;

      case REQUEST_STATUS.AWAITING_ADMIN:
        message =
          `⏳ ᴘᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ
⏳ ꜱᴛᴀᴛᴜꜱ: ᴡᴀɪᴛɪɴɢ ғᴏʀ ᴀᴅᴍɪɴ
📸 ʏᴏᴜʀ ᴘʜᴏᴛᴏ ʜᴀꜱ ʙᴇᴇɴ ʀᴇᴄᴇɪᴠᴇᴅ.
ᴡᴇ ᴀʀᴇ ᴡᴀɪᴛɪɴɢ ғᴏʀ ᴀᴅᴍɪɴ ᴀᴘᴘʀᴏᴠᴀʟ.`;
        break;

      case REQUEST_STATUS.AWAITING_PAYMENT:
        message =
          `⭐ ᴘᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ
⭐ ꜱᴛᴀᴛᴜꜱ: ᴡᴀɪᴛɪɴɢ ғᴏʀ ᴘᴀʏᴍᴇɴᴛ
✔️ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ʜᴀꜱ ʙᴇᴇɴ ᴀᴘᴘʀᴏᴠᴇᴅ.
ᴘʟᴇᴀꜱᴇ ᴄᴏᴍᴘʟᴇᴛᴇ ᴛʜᴇ 130 ꜱᴛᴀʀꜱ ᴘᴀʏᴍᴇɴᴛ.`;
        break;
      case REQUEST_STATUS.PAID:
        message =
          `✅ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ
💳 ꜱᴛᴀᴛᴜꜱ: ᴘᴀɪᴅ
📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇꜱꜱ ɪꜱ ᴜɴʟᴏᴄᴋᴇᴅ.`;
        break;
      case REQUEST_STATUS.APPROVED:
        message =
          `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ
    ✔️ ꜱᴛᴀᴛᴜꜱ: ᴀᴘᴘʀᴏᴠᴇᴅ
    📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇꜱꜱ ɪꜱ ʀᴇᴀᴅʏ.`;
    break;
    default:
    await ctx.reply(
    "⏳ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ.", getMainKeyboard()
    );
    return;
    }
    await ctx.reply( message, getMainKeyboard());
    logger.info("PENDING VIDEOCALL PANEL", {
      userId,
      status: request.status,});
  } catch (error) {
  logger.error(
      "PENDING VIDEOCALL PANEL ERROR",
      { userId,...getTelegramError(error),
        stack: error?.stack || null,
      });
    await ctx.reply(
      "❌ ᴜɴᴀʙʟᴇ ᴛᴏ ᴄʜᴇᴄᴋ ᴘᴇɴᴅɪɴɢ ʀᴇǫᴜᴇꜱᴛ.",getMainKeyboard()
    );
    }}
// ======================================================
// APPROVED VIDEOCALL
// ======================================================

async function sendApprovedVideocallFlow(userId) {
  const targetUserId = String(userId);

  try {
    await bot.telegram.sendMessage(
      targetUserId,
      `✔️︎ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ ²▪³
  ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ 𝐀𝐏𝐏𝐑𝐎𝐕𝐄𝐃.`
    );

    await bot.telegram.sendMessage(
      targetUserId,
      `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.
  ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ:`,
      {
        reply_markup:
          getVideocallInlineKeyboard(),
      }
    );

    logger.info("VIDEOCALL OPTIONS SENT", {
      userId: targetUserId,
    });
  } catch (error) {
    logger.error(
      "SEND APPROVED VIDEOCALL ERROR",
      {
        userId: targetUserId,
        ...getTelegramError(error),
      }
    );

    throw error;
  }
}

// ======================================================
// INVOICES
// ======================================================

async function sendVipInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message?.chat?.id;

  if (!chatId) {
    return;
  }

  try {
    await ctx.telegram.callApi(
      "sendInvoice",
      {
        chat_id: chatId,
        title: "𝓥𝓘𝓟ᴀᴄᴄᴇss",
        description:
          "ᴠɪᴘ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: VIP_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label: "𝓥𝓘𝓟ᴀᴄᴄᴇss",
            amount: VIP_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error("VIP INVOICE ERROR", {
      ...getTelegramError(error),
    });

    throw error;
  }
}

async function sendUserInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message?.chat?.id;

  if (!chatId) {
    return;
  }

  try {
    await ctx.telegram.callApi(
      "sendInvoice",
      {
        chat_id: chatId,
        title: "𝐔𝐒𝐄𝐑ᴀᴄᴄᴇss",
        description:
          "ᴜꜱᴇʀ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: USER_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label: "𝐔𝐒𝐄𝐑ᴀᴄᴄᴇss",
            amount: USER_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error("USER INVOICE ERROR", {
      ...getTelegramError(error),
    });

    throw error;
  }
}

async function sendPROInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message?.chat?.id;

  if (!chatId) {
    return;
  }

  try {
    await ctx.telegram.callApi(
      "sendInvoice",
      {
        chat_id: chatId,
        title: "𝐌𝐎𝐍𝐓𝐇𝐋𝐘 ᴀᴄᴄᴇss",
        description: "ᴍᴇɴsᴜᴀʟ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: PRO_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label: "𝐌𝐎𝐍𝐓𝐇𝐋𝐘 ᴀᴄᴄᴇss",
            amount: PRO_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error("PRO INVOICE ERROR", {
      ...getTelegramError(error),
    });
    throw error;
  }
}

async function sendStars130Invoice(userId) {
  try {
    await bot.telegram.callApi(
      "sendInvoice",
      {
        chat_id: String(userId),
        title: "ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇss",
        description:
          "ᴀᴄᴄᴇꜱꜱ ᴛᴏ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ꜱᴇʀᴠɪᴄᴇ.",
        payload: STARS_130_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label: "ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇss",
            amount: STARS_130_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error(
      "130 STARS INVOICE ERROR",
      {
        userId,
        ...getTelegramError(error),
      }
    );

    throw error;
  }
}

// ======================================================
// SUCCESSFUL PAYMENT
// ======================================================

async function handleSuccessfulPayment(ctx) {
  const payment =
    ctx.message?.successful_payment;

  if (!payment) {
    return;
  }

  const userId = String(ctx.from?.id || "");

  if (!userId) {
    return;
  }

  const chargeId =
    payment.telegram_payment_charge_id;

  const payload =
    payment.invoice_payload;

  logger.info("SUCCESSFUL PAYMENT", {
    userId,
    payload,
    chargeId,
  });

  if (isVaultPayload(payload)) {
    const relayed = await relayVaultUpdate(ctx.update);
    if (relayed) {
      return;
    }
  }

  if (await hasProcessedPayment(chargeId)) {
    logger.warn("DUPLICATE PAYMENT", {
      userId,
      payload,
      chargeId,
    });

    return;
  }

  // ====================================================
  // VIDEOCALL 130 STARS
  // ====================================================

  if (payload === STARS_130_PAYLOAD) {
    const request =
      await getVideoRequest(userId);

    if (
      !request ||
      request.status !==
        REQUEST_STATUS.AWAITING_PAYMENT
    ) {
      await ctx.reply(
        `⚠️ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ, ʙᴜᴛ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ ᴡᴀꜱ ғᴏᴜɴᴅ.
      -ᴘʟᴇᴀꜱᴇ ᴄᴏɴᴛᴀᴄᴛ ꜱᴜᴘᴘᴏʀᴛ.`
      );

      return;
    }

    await setVideoRequest(
      userId,
      {
        ...request,
        status: REQUEST_STATUS.PAID,
        paidAt: Date.now(),
        telegramPaymentChargeId: chargeId,
      }
    );

    await markPaymentProcessed(chargeId);

    await ctx.reply(
      `✅ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ
  📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      {
        reply_markup:
          getVideocallInlineKeyboard(),
      }
    );

    return;
  }

  // ====================================================
  // VIP
  // ====================================================

  if (payload === VIP_PAYLOAD) {
    await setPaidUser(userId, {
      telegramPaymentChargeId: chargeId,
      paidAt: Date.now(),
      tier: TIER_VIP,
    });

    await markPaymentProcessed(chargeId);

    await ctx.reply(
      `✅ ᴠɪᴘ ᴀᴄᴛɪᴠᴀᴛᴇᴅ
    ʏᴏᴜʀ "ᴠɪᴘ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
    );

    return;
  }

  // ====================================================
  // PRO
  // ====================================================

  if (payload === PRO_PAYLOAD) {
    await setPaidUser(userId, {
      telegramPaymentChargeId: chargeId,
      paidAt: Date.now(),
      tier: "ᴍᴏɴᴛʜʟʏ",
      planId: "AX01",
    });

    await markPaymentProcessed(chargeId);

    await ctx.reply(
      `✅ ᴍᴏɴᴛʜʟʏ ᴀᴄᴛɪᴠᴀᴛᴇᴅ\n    ʏᴏᴜʀ ᴍᴏɴᴛʜʟʏ ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
    );

    return;
  }

  // ====================================================
  // USER
  // ====================================================

  if (payload === USER_PAYLOAD) {
    await setPaidUser(userId, {
      telegramPaymentChargeId: chargeId,
      paidAt: Date.now(),
      tier: TIER_USER,
    });

    await markPaymentProcessed(chargeId);

    await ctx.reply(
      `✅ "ᴜꜱᴇʀ" ᴀᴄᴛɪᴠᴀᴛᴇᴅ
    ʏᴏᴜʀ "ᴜꜱᴇʀ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
    );
  }
}

// ======================================================
// PENDING VIDEOCALL CALLBACK
// ======================================================

bot.action(
  /^pending_videocall_(\d+)$/,
  async (ctx) => {
    const userId = String(ctx.match[1]);
    const telegramUserId =
      String(ctx.from?.id || "");

    // Seguridad: el usuario solo puede consultar su propia solicitud
    if (telegramUserId !== userId) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
      );
      return;
    }

    try {
      const request =
        await getVideoRequest(userId);

      if (!request) {
        await ctx.answerCbQuery(
          "No pending request"
        );
        return;
      }

      let message = "";

      switch (request.status) {
        case REQUEST_STATUS.WAITING_PHOTO:
          message =
            "📸 ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ ɪꜱ ᴡᴀɪᴛɪɴɢ ғᴏʀ ʏᴏᴜʀ ᴘʜᴏᴛᴏ.\n\n" +
            "ᴘʟᴇᴀꜱᴇ ꜱᴇɴᴅ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ.";
          break;

        case REQUEST_STATUS.AWAITING_ADMIN:
          message =
            "⏳ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ʜᴀꜱ ʙᴇᴇɴ ꜱᴇɴᴛ.\n\n" +
            "ᴡᴇ ᴀʀᴇ ᴡᴀɪᴛɪɴɢ ғᴏʀ ᴀᴅᴍɪɴ ᴀᴘᴘʀᴏᴠᴀʟ.";
          break;

        case REQUEST_STATUS.AWAITING_PAYMENT:
          message =
            "⭐ ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ ɪꜱ ᴡᴀɪᴛɪɴɢ ғᴏʀ ᴘᴀʏᴍᴇɴᴛ.\n\n" +
            "ᴘʟᴇᴀꜱᴇ ᴄᴏᴍᴘʟᴇᴛᴇ ᴛʜᴇ 130 ꜱᴛᴀʀꜱ ᴘᴀʏᴍᴇɴᴛ.";
          break;

        case REQUEST_STATUS.PAID:
          message =
            "✅ ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ᴘᴀʏᴍᴇɴᴛ ʜᴀꜱ ʙᴇᴇɴ ʀᴇᴄᴇɪᴠᴇᴅ.";
          break;

        case REQUEST_STATUS.APPROVED:
          message =
            "📞 ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ɪꜱ ʀᴇᴀᴅʏ.";
          break;

        default:
          await ctx.answerCbQuery(
            "No active request"
          );
          return;
      }

      await ctx.answerCbQuery(
        "⏳ Request status"
      );

      await ctx.reply(message);

      logger.info(
        "PENDING VIDEOCALL CHECK",
        {
          userId,
          status: request.status,
        }
      );
    } catch (error) {
      logger.error(
        "PENDING VIDEOCALL ERROR",
        {
          userId,
          ...getTelegramError(error),
          stack: error?.stack || null,
        }
      );

      await ctx.answerCbQuery(
        "❌ Unable to check request"
      );
    }
  }
);

// ======================================================
// USER START
// ======================================================

bot.start(async (ctx) => {
  try {
    const startPayload =
      String(ctx.startPayload || "").trim();

    if (isVaultPayload(startPayload)) {
      const relayed = await relayVaultUpdate(ctx.update);
      if (relayed) {
        return;
      }
    }

    await sendMainPanel(ctx);
  } catch (error) {
    logger.error("START ERROR", {
      ...getTelegramError(error),
      stack: error?.stack,
    });
  }
});

// ======================================================
// SUPPORT
// ======================================================

bot.command("paysupport", async (ctx) => {
  await ctx.reply(
    `ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ
    ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`
  );
});

// ======================================================
// PAYMENT ACTIONS
// ======================================================

bot.action(
  "pay_vip_stars",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await sendVipInvoice(ctx);
    } catch (error) {
      logger.error("PAY VIP ERROR", {
        ...getTelegramError(error),
      });
    }
  }
);

bot.action(
  "pay_pro_stars",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await sendPROInvoice(ctx);
    } catch (error) {
      logger.error("PAY PRO ERROR", {
        ...getTelegramError(error),
      });
    }
  }
);

bot.action(
  "pay_user_stars",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await sendUserInvoice(ctx);
    } catch (error) {
      logger.error("PAY USER ERROR", {
        ...getTelegramError(error),
      });
    }
  }
);

// ======================================================
// BACK MAIN
// ======================================================

bot.action(
  "back_to_main",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      try {
        await ctx.deleteMessage();
      } catch {
        // Ignore delete errors
      }

      await sendMainPanel(ctx);
    } catch (error) {
      logger.error("BACK MAIN ERROR", {
        ...getTelegramError(error),
      });
    }
  }
);

// ======================================================
// PRE CHECKOUT
// ======================================================

bot.on( "pre_checkout_query",
  async (ctx) => {
    try {
      const payload =
        ctx.update?.pre_checkout_query?.invoice_payload ||
        "";

      if (isVaultPayload(payload)) {
        const relayed = await relayVaultUpdate(ctx.update);
        if (relayed) {
          return;
        }
      }

      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      logger.error(
        "PRE CHECKOUT ERROR",
        {
          ...getTelegramError(error),
        }
      );
    }
  }
);

// ======================================================
// MEDIA
// ======================================================

async function handleMedia(ctx) {
  const userId = String(
    ctx.from?.id || ""
  );

  if (!userId) {
    return;
  }

  const pending =
    await getVideoRequest(userId);

  if (
    !pending ||
    pending.status !==
      REQUEST_STATUS.WAITING_PHOTO
  ) {
    return;
  }

  const user = getUserMeta(ctx.from);

  const updatedPending = {
    ...pending,
    status: REQUEST_STATUS.AWAITING_ADMIN,
    invalidTextCount: 0,
    photoReceivedAt: Date.now(),
  };

  await setVideoRequest(
    userId,
    updatedPending
  );

  try {
    const adminKeyboard =
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "ᴘᴀʏ ✪𝟭𝟯𝟬 ꜱᴛᴀʀꜱ",
            `approve_stars_${user.id}`
          ),
        ],
        [
          Markup.button.callback(
            "📞 ꜱᴇɴᴅ ᴢᴏᴏᴍ + ᴛᴇʟᴇɢʀᴀᴍ",
            `approve_call_${user.id}`
          ),
        ],
        [
          Markup.button.callback(
            "✘ ʀᴇᴊᴇᴄᴛ",
            `reject_video_${user.id}`
          ),
        ],
      ]);

    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📸 <b>NEW PHOTO RECEIVED</b>
Name: ${escapeHtml(user.fullName)}
Username: ${escapeHtml(user.username)}
ID: ${escapeHtml(user.id)}
Chat ID: ${escapeHtml(userId)}
📸 ᴜꜱᴇʀ ᴘʜᴏᴛᴏ ɪꜱ ᴀᴛᴛᴀᴄʜᴇᴅ ʙᴇʟᴏᴡ.`,
      {
        parse_mode: "HTML",
      }
    );

    await bot.telegram.copyMessage(
      ADMIN_CHAT_ID,
      ctx.chat.id,
      ctx.message.message_id
    );

    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      "ᴄʜᴏᴏꜱᴇ ᴀɴ ᴀᴄᴛɪᴏɴ:",
      {
        reply_markup:
          adminKeyboard.reply_markup,
      }
    );

    await ctx.reply(
      `📸 ᴘʜᴏᴛᴏ ʀᴇᴄᴇɪᴠᴇᴅ.¹▪³
ᴡᴀɪᴛ ᴡʜɪʟᴇ ʀᴇᴠɪᴇᴡ ɪᴛ.`
    );
  } catch (error) {
    logger.error(
      "MEDIA HANDLER ERROR",
      {
        userId,
        ...getTelegramError(error),
        stack: error?.stack || null,
        adminChatId:
          ADMIN_CHAT_ID || null,
      }
    );
  }
}
// Handle user photos.
bot.on("photo", handleMedia);
// // USER TEXT// 
bot.on("text", async (ctx) => {
const text = String(ctx.message?.text || "").trim();
const userId = String( ctx.from?.id || "");
  if (!userId) {return;
  }
  try {
// // VIDEOCALL // 
  if (text === BTN_VIDEOCALL) {
  await trackButtonClick(ctx, 
    "VIDEOCALL");
  return await openVideocallFlow(ctx);
     }
  if (text === BTN_PENDING_REQUEST) {
  return await sendPendingVideocallPanel(ctx);
     }
// // PENDING VIDEOCALL //
  if (text === BTN_PENDING_REQUEST) {
  await trackButtonClick( ctx,
     "PENDING VIDEOCALL REQUEST");
  return await sendPendingVideocallPanel(ctx);
     }
// // FULL ACCESS // 
  if (text === BTN_GET_FULL_ACCESS) {
  await trackButtonClick(ctx,
  "FULL ACCESS" );
  return await sendMembershipPanel(ctx);
     }
//// VIP // 
  if (text === BTN_VIP) { await trackButtonClick(ctx,
     "𝓥𝓘𝓟");
  return await sendVipPanel(ctx);
     }
  //// USER // 
    if (text === BTN_USER) {
     await trackButtonClick( ctx, 
      "𝐔𝐒𝐄𝐑");
    return await sendUserPanel(ctx);
     }
//// PRO // 
    if (text === BTN_PRO) {await trackButtonClick(ctx,
      "PRO");
    return await sendPROPanel(ctx);
     }
//// CHANNELS // 
    if (text === BTN_CHANNELS) {
    await trackButtonClick(ctx,
        "CHANNELS");
    return await sendChannelsPanel(ctx);
     }
// // REFRESH // 
    if (text === BTN_REFRESH) {
      await trackButtonClick(ctx, 
        "REFRESH");
      return await sendRefreshPanel(ctx);
     }
//// CANCEL // 
    if (text === BTN_CANCEL) {
      await deleteVideoRequest(userId);
      return await sendMainPanel(ctx);
     }
//// BACK // 
    if (
      text === BTN_BACK_MENU ||
      text === BTN_CHANNELS_BACK
     ) {
      await deleteVideoRequest(userId);
      return await sendMainPanel(ctx);
     }
//// ZOOM // 
    if (text === BTN_ZOOM) {
    return await ctx.reply(
      "📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ",
     {reply_markup: {inline_keyboard: [
     [{text: "📹 ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ",url: ZOOM_URL,},],
     ],},});
     }
// // TELEGRAM //
    if (text === BTN_TELEGRAM) {
      return await ctx.reply(
        "💬 ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ",
      {reply_markup: {inline_keyboard: [
      [{text: "📹 ɪɴɪᴄɪᴀʀ ᴠɪᴅᴇᴏᴄᴀʟʟ",
       url: TELEGRAM_CALL_URL,},],
      ],},});
      }
//// SMOKELANDIA //
    if (text === BTN_SMOKELANDIA) {
    return await ctx.reply(
      "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
      { reply_markup: {
        inline_keyboard: [
      [{ text: "↗ ᴏᴘᴇɴ",
         url: SMOKELANDIA_GROUP_LINK,
      },], ],}, });
      }
    //// USER FX SITE // 
      if (text === BTN_USERFX_SITE) {
      return await ctx.reply(
        "𝐔𝐬𝐞𝐫 🜲∓ҳ",
        { reply_markup: {
          inline_keyboard: [
       [{ text: "↗ ᴇɴᴛᴇʀ",
          url: USERFX_SITE_URL,
       },],],},});
    }
//// COMMANDS // 
     if (text.startsWith("/")) {
      return;
    }
//// VIDEOCALL PENDING TEXT // 
      const pending =
      await getVideoRequest(userId);
      if (
      pending?.status ===
      REQUEST_STATUS.WAITING_PHOTO
    ) {
      const invalidTextCount = Number(pending.invalidTextCount || 0
        ) + 1;
        if (invalidTextCount >= 4) {
        await deleteVideoRequest(userId);
        await ctx.reply("✘ ʀᴇQᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ."
        );
        return await sendMainPanel(ctx);
        }
        await setVideoRequest(userId,
        {
          ...pending, invalidTextCount,
        });
        await ctx.reply("📸 ʜᴏʟᴅ ᴜᴘ... ꜱᴇɴᴅ ᴀ ᴘʜᴏᴛᴏ ꜰɪʀꜱᴛ."
        );
        return;
        }
       await sendMainPanel(ctx);
       } catch (error) {logger.error("TEXT HANDLER ERROR",
       {
        ...getTelegramError(error),stack: error?.stack,
      });
      }});
//// PAYMENT EVENT // 
      bot.on("successful_payment",handleSuccessfulPayment);
//// CLEAR VIDEO // 
      bot.command( "clearvideo", async (ctx) => {
       if (!isAdmin(ctx)) {
      return;
       }
      const userId = String(ctx.from?.id || "");
      await deleteVideoRequest(userId);
      await ctx.reply(
      "✅ Videocall request cleared."
      );
      });
// // RESET VIDEOCALL REQUEST //
bot.command(
  "resetvc",
  async (ctx) => {
    const userId = String(
      ctx.from?.id || ""
    );

    try {
      if (!userId) {
        return;
      }

      const request =
        await getVideoRequest(userId);

      if (!request) {
        await ctx.reply(
          "✅ No active videocall request found."
        );

        return;
      }

      await deleteVideoRequest(userId);

      await ctx.reply(
        `✅ Videocall request reset.
  Previous status: ${request.status || "unknown"}
  You can now request a new videocall.`
      );

      logger.info(
        "VIDEOCALL REQUEST RESET",
        {
          userId,
          previousStatus:
            request.status || null,
        }
      );
    } catch (error) {
      logger.error(
        "RESET VIDEOCALL ERROR",
        {
          userId,
          ...getTelegramError(error),
          stack: error?.stack,
        }
      );

      await ctx.reply(
        "❌ Error resetting videocall request."
      );
    }
  }
);

// ======================================================
// REPORT
// ======================================================

bot.command(
  "report",
  async (ctx) => {
    if (!isAdmin(ctx)) {
      return;
    }

    if (!redis) {
      await ctx.reply(
        "❌ Redis is not available."
      );

      return;
    }

    try {
      const keys =
        await scanKeys("button_click:*");

      if (!keys.length) {
        await ctx.reply(
          "📊 No button clicks recorded yet."
        );

        return;
      }

      const values =
        await redis.mget(...keys);

      const clicks = values
        .filter(Boolean)
        .map((value) => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(
              b.clickedAt
            ).getTime() -
            new Date(
              a.clickedAt
            ).getTime()
        );

      let report =
        "📊 BUTTON CLICK REPORT\n\n";

      clicks.forEach(
        (click, index) => {
          report +=
            `<b>${index + 1}. ${escapeHtml(
              click.fullName
            )}</b>\n` +
            `Username: ${escapeHtml(
              click.username
            )}\n` +
            `ID: <code>${escapeHtml(
              click.id
            )}</code>\n` +
            `Button: <b>${escapeHtml(
              click.button
            )}</b>\n` +
            `Date: ${escapeHtml(
              click.clickedAt
            )}\n\n`;
        }
      );

      const chunks = [];

      while (report.length > 0) {
        chunks.push(
          report.slice(0, 3900)
        );

        report =
          report.slice(3900);
      }

      for (const chunk of chunks) {
        await ctx.reply(
          chunk,
          {
            parse_mode: "HTML",
          }
        );
      }
    } catch (error) {
      logger.error(
        "REPORT ERROR",
        {
          ...getTelegramError(error),
          stack: error?.stack,
        }
      );

      await ctx.reply(
        "❌ Error generating report."
      );
    }
  }
);

// ======================================================
// ADMIN MYID
// ======================================================

adminBot.command(
  "myid",
  async (ctx) => {
    try {
      await ctx.reply(
        `chat_id: ${ctx.chat?.id}\nuser_id: ${ctx.from?.id}`
      );
    } catch (error) {
      logger.error(
        "ADMIN MYID ERROR",
        {
          ...getTelegramError(error),
        }
      );
    }
  }
);

// ======================================================
// ADMIN APPROVE STARS
// ======================================================

adminBot.action(
  /^approve_stars_(\d+)$/,
  async (ctx) => {
    const adminId = String(
      ctx.from?.id || ""
    );

    if (
      adminId !==
      String(ADMIN_USER_ID)
    ) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
      );

      return;
    }

    const requesterId =
      String(ctx.match[1]);

    const pending =
      await getVideoRequest(
        requesterId
      );

    if (
      !pending ||
      pending.status !==
        REQUEST_STATUS.AWAITING_ADMIN
    ) {
      await ctx.answerCbQuery(
        "Request not found"
      );

      return;
    }

    try {
      await ctx.answerCbQuery(
        "⭐ Payment selected"
      );

      await ctx
        .editMessageReplyMarkup({
          inline_keyboard: [],
        })
        .catch(() => {});

      await setVideoRequest(
        requesterId,
        {
          ...pending,
          status:
            REQUEST_STATUS.AWAITING_PAYMENT,
          paymentRequestedAt:
            Date.now(),
        }
      );

      await bot.telegram.sendMessage(
        requesterId,
        `✔️ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ  ²▪³
         ᴘʟᴇᴀꜱᴇ ᴄᴏᴍᴘʟᴇᴛᴇ ᴛʜᴇ 130 ꜱᴛᴀʀꜱ ᴘᴀʏᴍᴇɴᴛ.`
      );

      await sendStars130Invoice(
        requesterId
      );
    } catch (error) {
      logger.error(
        "APPROVE STARS ERROR",
        {
          requesterId,
          ...getTelegramError(error),
          stack: error?.stack || null,
        }
      );

      const current =
        await getVideoRequest(
          requesterId
        );

      if (current) {
        await setVideoRequest(
          requesterId,
          {
            ...current,
            status:
              REQUEST_STATUS.AWAITING_ADMIN,
          }
        );
      }

      try {
        await bot.telegram.sendMessage(
          requesterId,
          "❌ Unable to create the payment invoice. Please try again."
        );
      } catch {
        // Ignore notification error
      }
    }
  }
);

// ======================================================
// ADMIN APPROVE CALL
// ======================================================

adminBot.action(
  /^approve_call_(\d+)$/,
  async (ctx) => {
    const adminId = String(
      ctx.from?.id || ""
    );

    if (
      adminId !==
      String(ADMIN_USER_ID)
    ) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
      );

      return;
    }

    const requesterId =
      String(ctx.match[1]);

    const pending =
      await getVideoRequest(
        requesterId
      );

    if (
      !pending ||
      pending.status !==
        REQUEST_STATUS.AWAITING_ADMIN
    ) {
      await ctx.answerCbQuery(
        "Request not found"
      );

      return;
    }

    try {
      await ctx.answerCbQuery(
        "📞 Videocall selected"
      );

      await ctx
        .editMessageReplyMarkup({
          inline_keyboard: [],
        })
        .catch(() => {});

      await setVideoRequest(
        requesterId,
        {
          ...pending,
          status:
            REQUEST_STATUS.APPROVED,
          approvedAt: Date.now(),
        }
      );

      await sendApprovedVideocallFlow(
        requesterId
      );
    } catch (error) {
      logger.error(
        "APPROVE CALL ERROR",
        {
          requesterId,
          ...getTelegramError(error),
          stack: error?.stack || null,
        }
      );

      const current =
        await getVideoRequest(
          requesterId
        );

      if (current) {
        await setVideoRequest(
          requesterId,
          {
            ...current,
            status:
              REQUEST_STATUS.AWAITING_ADMIN,
          }
        );
      }
    }
  }
);

// ======================================================
// ADMIN REJECT
// ======================================================

adminBot.action(
  /^reject_video_(\d+)$/,
  async (ctx) => {
    const adminId = String(
      ctx.from?.id || ""
    );

    if (
      adminId !==
      String(ADMIN_USER_ID)
    ) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
      );

      return;
    }

    const requesterId =
      String(ctx.match[1]);

    const pending =
      await getVideoRequest(
        requesterId
      );

    if (!pending) {
      await ctx.answerCbQuery(
        "Request not found"
      );

      return;
    }

    try {
      await ctx.answerCbQuery(
        "❌ ʀᴇᴊᴇᴄᴛᴇᴅ"
      );

      await ctx
        .editMessageReplyMarkup({
          inline_keyboard: [],
        })
        .catch(() => {});

      await deleteVideoRequest(
        requesterId
      );

      const keyboard =
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ.",
              `notify_me_${requesterId}`
            ),
          ],
        ]);

      await bot.telegram.sendMessage(
        requesterId,
        `⏳ ʜᴇʏ ꜱᴇxʏ, ɪ’ᴍ ᴏɴ ᴀ ᴠɪᴅᴇᴏ ᴄᴀʟʟ ᴡɪᴛʜ ᴀɴᴏᴛʜᴇʀ ɢᴜʏ ʀɪɢʜᴛ ɴᴏᴡ. 
        ɪꜱ ɪᴛ ᴄᴏᴏʟ ɪꜰ ɪ ᴛᴇxᴛ ʏᴏᴜ ᴡʜᴇɴ ɪ’ᴍ ғʀᴇᴇ?.`,
        {
          reply_markup:
            keyboard.reply_markup,
        }
      );
    } catch (error) {
      logger.error(
        "REJECT ERROR",
        {
          requesterId,
          ...getTelegramError(error),
        }
      );
    }
  }
);

// ======================================================
// NOTIFY ME
// ======================================================

bot.action(
  /^notify_me_(\d+)$/,
  async (ctx) => {
    const requesterId =
      String(ctx.match[1]);

    const clickedUserId =
      String(ctx.from?.id || "");

    if (
      clickedUserId !== requesterId
    ) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
      );

      return;
    }

    try {
      await ctx.answerCbQuery(
        "ʏᴇᴀ🔥"
      );

      await ctx
        .editMessageReplyMarkup({
          inline_keyboard: [],
        })
        .catch(() => {});

      const user =
        getUserMeta(ctx.from);

      await adminBot.telegram.sendMessage(
        ADMIN_CHAT_ID,
        `🔔 <b>NOTIFY REQUEST</b>
      Name: ${escapeHtml(user.fullName)}
      Username: ${escapeHtml(user.username)}
      ID: ${escapeHtml(user.id)}
      Target: ${escapeHtml(requesterId)}`,
        {
          parse_mode: "HTML",
        }
      );

      await bot.telegram.sendMessage(
        requesterId,
        `ꜰᴏʀ ꜱᴜʀᴇ!
      ꜱᴡɪɴɢ ʙʏ ᴍʏ ᴄʜᴀɴɴᴇʟ ᴀɴᴅ ꜱᴇᴇ ᴡʜᴀᴛ'ꜱ ɴᴇᴡ..`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "𝐔𝐬ᴇʀ 🜲∓ҳ",
                  url: USER_GROUP_LINK,
                },
              ],
              [
                {
                  text: "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
                  url: SMOKELANDIA_GROUP_LINK,
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      logger.error(
        "NOTIFY ERROR",
        {
          requesterId,
          ...getTelegramError(error),
        }
      );
    }
  }
);

// ======================================================
// ERROR HANDLER
// ======================================================

bot.catch((error, ctx) => {
  logger.error(
    "BOT ERROR",
    {
      updateId:
        ctx?.update?.update_id ??
        null,
      ...getTelegramError(error),
      stack: error?.stack || null,
    }
  );
});

adminBot.catch((error, ctx) => {
  logger.error(
    "ADMIN BOT ERROR",
    {
      updateId:
        ctx?.update?.update_id ??
        null,
      chatId:
        ctx?.chat?.id ??
        null,
      userId:
        ctx?.from?.id ??
        null,
      ...getTelegramError(error),
      stack: error?.stack || null,
    }
  );
});

// ======================================================
// RAW BODY READER
// ======================================================

function readRawBody(req) {
  return new Promise(
    (resolve, reject) => {
      let body = "";

      req.setEncoding("utf8");

      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        resolve(body);
      });

      req.on("error", (error) => {
        reject(error);
      });
    }
  );
}

// ======================================================
// PARSE TELEGRAM BODY
// ======================================================

function parseTelegramBody(rawBody) {
  if (
    rawBody === undefined ||
    rawBody === null
  ) {
    throw new Error(
      "Request body is empty"
    );
  }

  if (
    typeof rawBody === "object"
  ) {
    return rawBody;
  }

  const raw = String(rawBody)
    .replace(/^\uFEFF/, "")
    .trim();

  if (!raw) {
    throw new Error(
      "Request body is empty"
    );
  }

  return JSON.parse(raw);
}

// ======================================================
// WEBHOOK HANDLER
// ======================================================

export default async function handler(
  req,
  res
) {
  logger.info(
    "TELEGRAM WEBHOOK REQUEST",
    {
      method: req.method,
      contentType:
        req.headers["content-type"] ||
        null,
      contentLength:
        req.headers["content-length"] ||
        null,
      secretPresent: Boolean(
        req.headers[
          "x-telegram-bot-api-secret-token"]),
        });
  // ====================================================
  // HEALTH CHECK
  // ====================================================

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "telegram-webhook",
      status: "online",
    });
  }

  // ====================================================
  // METHOD CHECK
  // ====================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  // ====================================================
  // WEBHOOK SECRET
  // ====================================================

  const incomingSecret = String(
    req.headers[
      "x-telegram-bot-api-secret-token"
    ] || ""
  ).trim();

  const userSecret = String(
    WEBHOOK_SECRET || ""
  ).trim();

  const adminSecret = String(
    ADMIN_WEBHOOK_SECRET || ""
  ).trim();

  const isAdminWebhookRoute =
    incomingSecret.length > 0 &&
    adminSecret.length > 0 &&
    incomingSecret === adminSecret;

  const isUserWebhookRoute =
    incomingSecret.length > 0 &&
    userSecret.length > 0 &&
    incomingSecret === userSecret;

  logger.info(
    "TELEGRAM WEBHOOK SECRET CHECK",
    {
      incomingSecretPresent:
        Boolean(incomingSecret),
      userSecretPresent:
        Boolean(userSecret),
      adminSecretPresent:
        Boolean(adminSecret),
      incomingLength:
        incomingSecret.length,
      userLength:
        userSecret.length,
      adminLength:
        adminSecret.length,
      isUser: isUserWebhookRoute,
      isAdmin: isAdminWebhookRoute,
    }
  );

  if (
    !isAdminWebhookRoute &&
    !isUserWebhookRoute
  ) {
    logger.warn(
      "TELEGRAM WEBHOOK UNAUTHORIZED"
    );

    return res.status(401).json({
      ok: false,
      error: "unauthorized",
    });
  }

  // ====================================================
  // READ BODY
  // ====================================================

  let rawBody;

  try {
    rawBody =
      await readRawBody(req);

    logger.info(
      "TELEGRAM RAW BODY",
      {
        type: typeof rawBody,
        length:
          typeof rawBody === "string"
            ? rawBody.length
            : null,
        preview:
          typeof rawBody === "string"
            ? rawBody.slice(0, 300)
            : null,
      }
    );
  } catch (error) {
    logger.error(
      "BODY READ ERROR",
      {
        message:
          error?.message || null,
        stack:
          error?.stack || null,
      }
    );

    return res.status(400).json({
      ok: false,
      error: "body_read_error",
      message:
        error?.message ||
        "Unable to read request body",
    });
  }

  // ====================================================
  // PARSE BODY
  // ====================================================

  let update;

  try {
    update =
      parseTelegramBody(rawBody);
  } catch (error) {
    logger.error(
      "BODY JSON PARSE ERROR",
      {
        message:
          error?.message || null,
        rawBody:
          typeof rawBody === "string"
            ? rawBody.slice(0, 1000)
            : null,
        rawBodyLength:
          typeof rawBody === "string"
            ? rawBody.length
            : null,
      }
    );

    return res.status(400).json({
      ok: false,
      error: "invalid_json",
      message:
        error?.message ||
        "Invalid JSON",
    });
  }

  // ====================================================
  // UPDATE VALIDATION
  // ====================================================

  if (
    !update ||
    typeof update !== "object" ||
    Array.isArray(update)
  ) {
    return res.status(400).json({
      ok: false,
      error: "invalid_update",
    });
  }

  logger.info(
    "TELEGRAM UPDATE RECEIVED",
    {
      bot: isAdminWebhookRoute
        ? "admin"
        : "user",

      updateId:
        update.update_id ??
        null,

      hasMessage:
        Boolean(update.message),

      hasCallback:
        Boolean(update.callback_query),

      hasPhoto:
        Boolean(
          update.message?.photo
        ),

      hasPayment:
        Boolean(
          update.message
            ?.successful_payment
        ),
    }
  );

  // ====================================================
  // ROUTING
  // ====================================================

  try {
    // ==================================================
    // ADMIN BOT
    // ==================================================

    if (isAdminWebhookRoute) {
      logger.info(
        "ROUTING UPDATE TO ADMIN BOT",
        {
          updateId:
            update.update_id ??
            null,

          chatId:
            update.message?.chat?.id ??
            update.callback_query?.message
              ?.chat?.id ??
            null,

          userId:
            update.message?.from?.id ??
            update.callback_query?.from
              ?.id ??
            null,
        }
      );

      await adminBot.handleUpdate(
        update
      );

      logger.info(
        "ADMIN BOT UPDATE SUCCESS",
        {
          updateId:
            update.update_id ??
            null,
        }
      );

      return res.status(200).json({
        ok: true,
        bot: "admin",
      });
    }

    // ==================================================
    // USER BOT
    // ==================================================

    if (isUserWebhookRoute) {
      logger.info(
        "ROUTING UPDATE TO USER BOT",
        {
          updateId:
            update.update_id ??
            null,

          chatId:
            update.message?.chat?.id ??
            update.callback_query?.message
              ?.chat?.id ??
            null,

          userId:
            update.message?.from?.id ??
            update.callback_query?.from
              ?.id ??
            null,
        }
      );

      await bot.handleUpdate(
        update
      );

      logger.info(
        "USER BOT UPDATE SUCCESS",
        {
          updateId:
            update.update_id ??
            null,
        }
      );

      return res.status(200).json({
        ok: true,
        bot: "user",
      });
    }

    // ==================================================
    // INVALID SECRET
    // ==================================================

    logger.warn(
      "NO VALID WEBHOOK ROUTE",
      {
        updateId:
          update.update_id ??
          null,
      }
    );

    return res.status(401).json({
      ok: false,
      error: "invalid_webhook_route",
    });
  } catch (error) {
    logger.error(
      "BOT HANDLE UPDATE ERROR",
      {
        name:
          error?.name ??
          null,

        message:
          error?.message ??
          null,

        stack:
          error?.stack ??
          null,

        description:
          error?.response
            ?.description ??
          null,
      }
    );

    return res.status(500).json({
      ok: false,
      error: "telegram_handler_error",
      message:
        error?.message ??
        "unknown_error",
      description:
        error?.response
          ?.description ??
        null,
    });
  }
}