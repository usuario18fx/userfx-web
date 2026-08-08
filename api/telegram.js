import { Telegraf, Markup, Input } from "telegraf";
import Redis from "ioredis";
import winston from "winston";
import path from "path";

// ============================================================
// CONFIG
// ============================================================

export const config = {
  api: {
    bodyParser: true,
  },
};

export const maxDuration = 60;

// ============================================================
// ENVIRONMENT
// ============================================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const ADMIN_WEBHOOK_SECRET = process.env.ADMIN_WEBHOOK_SECRET;
const REDIS_URL = process.env.REDIS_URL;

const requiredEnv = [
  "BOT_TOKEN",
  "ADMIN_BOT_TOKEN",
  "ADMIN_CHAT_ID",
  "WEBHOOK_SECRET",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
}

// ============================================================
// LOGGER
// ============================================================

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

// ============================================================
// REDIS
// ============================================================

const redis = REDIS_URL ? new Redis(REDIS_URL) : null;

if (redis) {
  redis.on("error", (error) => {
    logger.error("REDIS ERROR", {
      message: error?.message || String(error),
    });
  });
}

async function getPaidUser(userId) {
  if (!redis) return null;

  try {
    const data = await redis.get(`paid_user:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error("REDIS GET ERROR", {
      message: error?.message || String(error),
    });

    return null;
  }
}

async function setPaidUser(userId, data) {
  if (!redis) return false;

  try {
    await redis.set(
      `paid_user:${userId}`,
      JSON.stringify(data)
    );

    return true;
  } catch (error) {
    logger.error("REDIS SET ERROR", {
      message: error?.message || String(error),
    });

    return false;
  }
}

// ============================================================
// TELEGRAM BOTS
// ============================================================

const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);

bot.telegram.webhookReply = false;
adminBot.telegram.webhookReply = false;

// ============================================================
// CONSTANTS
// ============================================================

const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";

const TELEGRAM_CALL_URL =
  "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY";

const USER_GROUP_LINK =
  "https://t.me/+2P62YW1Pt441NDUx";

const SMOKELANDIA_GROUP_LINK =
  "https://t.me/SmokelandiaFx_bot";

const USER_NOTIFY_LINK =
  "https://t.me/+v57jkAGn3DA0NWJh";

const VIP_STARS_PRICE = 1500;
const USER_STARS_PRICE = 500;

const VIP_PAYLOAD = "vip_fx_access";
const USER_PAYLOAD = "user_fx_access";

const TIER_VIP = "ᴠɪᴘ";
const TIER_USER = "ᴜꜱᴇʀ";

// ============================================================
// BUTTON LABELS
// ============================================================

const BTN_VIDEOCALL = "📞 ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_GET_FULL_ACCESS = "🔥 ɢᴇᴛ ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ";
const BTN_VIP = "⚡ᴠɪᴘ";
const BTN_USER = "👑ᴜꜱᴇʀ";
const BTN_CHANNELS = "📺ᴄʜᴀɴɴᴇʟꜱ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";

const BTN_ZOOM = "🟦 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "💬 ᴛᴇʟᴇɢʀᴀᴍ";

const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_BACK_MENU = "↽ ʙᴀᴄᴋ";

const BTN_SMOKELANDIA = "ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "𝐔𝐬𝐞𝐫🜲Ŧҳ";
const BTN_CHANNELS_BACK = "↽ ʙᴀᴄᴋ";

// ============================================================
// GLOBAL STATE
// ============================================================

const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests ||
  new Map();

const paidUsers =
  globalThis.__fxPaidUsers ||
  new Map();

const rateLimiter =
  globalThis.__fxRateLimiter ||
  new Map();

globalThis.__fxPendingVideoRequests =
  pendingVideoRequests;

globalThis.__fxPaidUsers =
  paidUsers;

globalThis.__fxRateLimiter =
  rateLimiter;

// ============================================================
// UTILITIES
// ============================================================

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getUserMeta(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    "No name";

  const username = from?.username
    ? `@${from.username}`
    : "sin_username";

  const id = String(from?.id || "");

  return {
    fullName,
    username,
    id,
  };
}

function assets(filename) {
  return path.join(
    process.cwd(),
    "assets",
    filename
  );
}

function validateVideoRequest(userId, pending) {
  if (!userId) {
    return {
      valid: false,
      error: "Missing user ID",
    };
  }

  if (!pending) {
    return {
      valid: false,
      error: "No pending request",
    };
  }

  if (
    pending.createdAt &&
    Date.now() - pending.createdAt > 3600000
  ) {
    pendingVideoRequests.delete(userId);

    return {
      valid: false,
      error: "Request expired",
    };
  }

  return {
    valid: true,
  };
}

// ============================================================
// RATE LIMITING
// ============================================================

function checkRateLimit(
  userId,
  limit = 5,
  windowMs = 60000
) {
  const now = Date.now();

  const userRequests =
    rateLimiter.get(userId) || [];

  const recent = userRequests.filter(
    (time) => now - time < windowMs
  );

  if (recent.length >= limit) {
    rateLimiter.set(userId, recent);
    return false;
  }

  recent.push(now);

  rateLimiter.set(userId, recent);

  return true;
}

// ============================================================
// KEYBOARDS
// ============================================================

function getMainKeyboard() {
  return Markup.keyboard([
    [BTN_VIDEOCALL],
    [BTN_GET_FULL_ACCESS],
    [BTN_VIP, BTN_USER],
    [BTN_CHANNELS],
    [BTN_REFRESH],
  ])
    .resize();
}

function getPendingPhotoKeyboard() {
  return Markup.keyboard([
    [BTN_CANCEL],
  ])
    .resize();
}

function getApprovedVideocallKeyboard() {
  return Markup.keyboard([
    [BTN_ZOOM, BTN_TELEGRAM],
    [BTN_BACK_MENU],
  ])
    .resize();
}

function getStarsVipKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "⭐ ᴘᴀʏ ᴠɪᴘ ✪",
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
        "⭐ ᴘᴀʏ ᴜꜱᴇʀ ✪",
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

function getChannelsKeyboard() {
  return Markup.keyboard([
    [
      BTN_SMOKELANDIA,
      BTN_USERFX_SITE,
    ],
    [
      BTN_CHANNELS_BACK,
    ],
  ])
    .resize();
}

async function getAccessState(userId) {
  const id = String(userId);

  let entry = paidUsers.get(id);

  if (!entry) {
    entry = await getPaidUser(id);

    if (entry) {
      paidUsers.set(id, entry);
    }
  }

  return {
    hasVip: entry?.tier === TIER_VIP,

    hasUser:
      entry?.tier === TIER_USER ||
      entry?.tier === TIER_VIP,

    entry,
  };
}

// ============================================================
// TYPING
// ============================================================

async function typing(
  ctx,
  action = "typing"
) {
  try {
    const delay =
      800 +
      Math.floor(Math.random() * 1200);

    await ctx.sendChatAction(action);

    await new Promise((resolve) =>
      setTimeout(resolve, delay)
    );
  } catch {
    // Ignore typing errors
  }
}

// ============================================================
// MAIN PANEL
// ============================================================

async function sendMainPanel(ctx) {
  await typing(ctx);

  await ctx.reply(
    `Ŧҳ | ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ

ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ.

ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`,
    getMainKeyboard()
  );
}

// ============================================================
// MEMBERSHIP
// ============================================================

async function sendMembershipPanel(ctx) {
  await typing(ctx);

  await ctx.reply(
    `🔥 ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ

👑 ʙᴇɴᴇꜰɪᴛꜱ
⇀ ᴘʀɪᴏʀɪᴛʏ ᴀᴄᴄᴇꜱꜱ
⇀ ᴘʀɪᴠᴀᴛᴇ ᴜɴʟᴏᴄᴋꜱ
⇀ ᴡᴇᴇᴋ¹ / ᴀʟʙᴜᴍ¹

⚡ ʙᴇɴᴇꜰɪᴛꜱ
⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
⇀ ᴘʀᴇᴍɪᴜᴍ ꜱᴇᴄᴛɪᴏɴꜱ
⇀ ᴡᴇᴇᴋꜱ³ / ᴀʟʙᴜᴍꜱ³`,
    getMainKeyboard()
  );
}

// ============================================================
// VIP PANEL
// ============================================================

async function sendVipPanel(ctx) {
  try {
    await ctx.replyWithVideo(
      "Gs1OgH5HZGzdmjgWmCalvexfhI4DGJN6FuJ-J7JlaLQUeB4c8Xw0_ju086n6YM_g",
      {
        caption:
          `ᴠɪᴘ⚡

ᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
        reply_markup:
          getStarsVipKeyboard().reply_markup,
      }
    );
  } catch (error) {
    logger.error(
      "ERROR sendVipPanel",
      {
        message:
          error?.message || String(error),
      }
    );

    await ctx.reply(
      `ᴠɪᴘ⚡

ᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
      getStarsVipKeyboard()
    );
  }
}

// ============================================================
// USER PANEL
// ============================================================

async function sendUserPanel(ctx) {
  try {
    await ctx.replyWithPhoto(
      "r7iZgQjb73xKY4_5WH2DbV7GHk7P9zoC7RuHnB9wIHPQ_o0hbBcNyVhQA4uVN7GT",
      {
        caption:
          `ᴜꜱᴇʀ👑

ᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
        reply_markup:
          getStarsUserKeyboard().reply_markup,
      }
    );
  } catch (error) {
    logger.error(
      "ERROR sendUserPanel",
      {
        message:
          error?.message || String(error),
      }
    );

    await ctx.reply(
      `ᴜꜱᴇʀ👑

ᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
      getStarsUserKeyboard()
    );
  }
}

// ============================================================
// CHANNELS
// ============================================================

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `📺ᴄʜᴀɴɴᴇʟꜱ

ᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`,
    getChannelsKeyboard()
  );
}

// ============================================================
// SMOKELANDIA CHANNEL
// ============================================================

async function sendSmokelandiaChannelPanel(ctx) {
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "☁️ᴇɴᴛᴇʀ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
          url: SMOKELANDIA_GROUP_LINK,
        },
      ],
      [
        {
          text: "↽ ʙᴀᴄᴋ",
          callback_data: "back_to_channels",
        },
      ],
    ],
  };

  try {
    await ctx.replyWithVideo(
      "r_JpgGY0aBXgoy_Z1N3eCm6DhtRVMOwJo1t-6WdfOSjxO1DUlEmJ8EZlhoe7RbdZ",
      {
        caption:
          `☁️ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ

ᴘʀɪᴠᴀᴛᴇ ꜱᴍᴏᴋᴇ ʀᴏᴏᴍ ʀᴇᴀᴅʏ.

👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    logger.error(
      "ERROR sendSmokelandiaChannelPanel",
      {
        message:
          error?.message || String(error),
      }
    );

    await ctx.reply(
      `☁️ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ

ᴘʀɪᴠᴀᴛᴇ ꜱᴍᴏᴋᴇ ʀᴏᴏᴍ ʀᴇᴀᴅʏ.

👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
      {
        reply_markup: keyboard,
      }
    );
  }
}

// ============================================================
// USER FX CHANNEL
// ============================================================

async function sendUserFxChannelPanel(ctx) {
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: "🜲 ᴇɴᴛᴇʀ 𝐔𝐬𝐞𝐫 Ŧҳ",
          url: USER_GROUP_LINK,
        },
      ],
      [
        {
          text: "↽ ʙᴀᴄᴋ",
          callback_data: "back_to_channels",
        },
      ],
    ],
  };

  try {
    await ctx.replyWithVideo(
      "r_JpgGY0aBXgoy_Z1N3eCnTh6i7FHfvdhebbpDPlZre1iHU9iYT44Aj4lCVXv115",
      {
        caption:
          `𝐔𝐬𝐞𝐫 🜲Ŧҳ

ᴘʀɪᴠᴀᴛᴇ ʀᴏᴜᴛᴇ ʀᴇᴀᴅʏ.

👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    logger.error(
      "ERROR sendUserFxChannelPanel",
      {
        message:
          error?.message || String(error),
      }
    );

    await ctx.reply(
      `𝐔𝐬𝐞𝐫 🜲Ŧҳ

ᴘʀɪᴠᴀᴛᴇ ʀᴏᴜᴛᴇ ʀᴇᴀᴅʏ.

👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
      {
        reply_markup: keyboard,
      }
    );
  }
}

// ============================================================
// REFRESH
// ============================================================

async function sendRefreshPanel(ctx) {
  const {
    hasVip,
    hasUser,
  } = await getAccessState(
    ctx.from?.id
  );

  const tier = hasVip
    ? "⚡ᴠɪᴘ"
    : hasUser
      ? "𝐔𝐬𝐞𝐫🜲Ŧҳ"
      : "ɴᴏ ᴘʟᴀɴ";

  await ctx.reply(
    `↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ

ᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}`,
    getMainKeyboard()
  );
}

// ============================================================
// VIDEOCALL FLOW
// ============================================================

async function openVideocallFlow(ctx) {
  const userId = String(
    ctx.from?.id || ""
  );

  if (!userId) return;

  if (!checkRateLimit(
    userId,
    3,
    300000
  )) {
    await ctx.reply(
      "⏳ Please wait before requesting again."
    );

    return;
  }

  pendingVideoRequests.set(
    userId,
    {
      waitingForPhoto: true,
      awaitingAdminApproval: false,
      invalidTextCount: 0,
      createdAt: Date.now(),
    }
  );

  await typing(
    ctx,
    "upload_video"
  );

  const caption =
    `ʜᴏʟᴅ ᴜᴘ, ʙᴇꜰᴏʀᴇ ᴡᴇ ᴋᴇᴇᴘ ɢᴏɪɴɢ,

ᴄᴀɴ ɪ ꜱᴇᴇ ᴀ ᴘɪᴄ ᴏꜰ ʏᴏᴜ?

ɪ ᴡᴀɴɴᴀ ᴋɴᴏᴡ ᴡʜᴏ ɪ'ᴍ ᴛᴀʟᴋɪɴɢ ᴛᴏ...

ᴛʜᴇɴ ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʙᴜᴛᴛᴏɴꜱ.`;

  try {
    await ctx.replyWithVideo(
      Input.fromLocalFile(
        assets("FX-Y24V01.mp4")
      ),
      {
        caption,
        ...getPendingPhotoKeyboard(),
      }
    );
  } catch (error) {
    logger.error(
      "ERROR sending videocall video",
      {
        message:
          error?.message || String(error),
      }
    );

    await ctx.reply(
      caption,
      getPendingPhotoKeyboard()
    );
  }

  const user = getUserMeta(
    ctx.from
  );

  try {
    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📞 <b>New videocall request</b>

Name: <b>${escapeHtml(user.fullName)}</b>
Username: <b>${escapeHtml(user.username)}</b>
ID: <code>${escapeHtml(user.id)}</code>
Chat ID User: <code>${escapeHtml(userId)}</code>

ᴇꜱᴘᴇʀᴀɴᴅᴏ ꜱᴜ ꜰᴏᴛᴏ...`,
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    logger.error(
      "ADMIN ERROR",
      {
        message:
          error?.message || String(error),
      }
    );
  }
}

// ============================================================
// APPROVED VIDEOCALL
// ============================================================

async function sendApprovedVideocallFlow(
  userId
) {
  await bot.telegram.sendMessage(
    userId,
    `✅ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ

ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ ᴀᴘᴘʀᴏᴠᴇᴅ.`
  );

  await bot.telegram.sendMessage(
    userId,
    `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.

ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ:`,
    getApprovedVideocallKeyboard()
  );
}

// ============================================================
// INVOICES
// ============================================================

async function sendVipInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message?.chat?.id;

  if (!chatId) {
    logger.error(
      "No chat id available for VIP invoice"
    );

    return;
  }

  try {
    await ctx.telegram.callApi(
      "sendInvoice",
      {
        chat_id: chatId,
        title: "VIP ACCESS",
        description:
          "ᴠɪᴘ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: VIP_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label: "VIP ACCESS",
            amount: VIP_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error(
      "ERROR VIP INVOICE",
      {
        message:
          error?.message || String(error),
      }
    );

    await ctx.reply(
      "❌ᴘᴀʏᴍᴇɴᴛ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴇʀʀᴏʀ."
    );
  }
}

async function sendUserInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message?.chat?.id;

  if (!chatId) {
    logger.error(
      "No chat id available for USER invoice"
    );

    return;
  }

  try {
    await ctx.telegram.callApi(
      "sendInvoice",
      {
        chat_id: chatId,
        title: "USER FX ACCESS",
        description:
          "ᴜꜱᴇʀ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: USER_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label: "USER FX ACCESS",
            amount: USER_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error(
      "ERROR USER INVOICE",
      {
        message:
          error?.message || String(error),
      }
    );

    await ctx.reply(
      "❌ᴘᴀʏᴍᴇɴᴛ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴇʀʀᴏʀ."
    );
  }
}

// ============================================================
// SUCCESSFUL PAYMENT
// ============================================================

async function handleSuccessfulPayment(ctx) {
  const payment =
    ctx.message?.successful_payment;

  if (!payment) return;

  const userId = String(
    ctx.from?.id || ""
  );

  const chargeId =
    payment.telegram_payment_charge_id;

  let entry = null;

  if (
    payment.invoice_payload ===
    VIP_PAYLOAD
  ) {
    entry = {
      tier: TIER_VIP,
      telegramPaymentChargeId:
        chargeId,
      paidAt: Date.now(),
    };
  }

  if (
    payment.invoice_payload ===
    USER_PAYLOAD
  ) {
    entry = {
      tier: TIER_USER,
      telegramPaymentChargeId:
        chargeId,
      paidAt: Date.now(),
    };
  }

  if (!entry) return;

  paidUsers.set(
    userId,
    entry
  );

  await setPaidUser(
    userId,
    entry
  );

  if (entry.tier === TIER_VIP) {
    await ctx.reply(
      `✅ ᴠɪᴘ ᴀᴄᴛɪᴠᴀᴛᴇᴅ

ʏᴏᴜʀ "ᴠɪᴘ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
    );

    return;
  }

  await ctx.reply(
    `✅ "ᴜꜱᴇʀ" ᴀᴄᴛɪᴠᴀᴛᴇᴅ

ʏᴏᴜʀ "ᴜꜱᴇʀ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
    getMainKeyboard()
  );
}

// ============================================================
// START
// ============================================================

bot.start(async (ctx) => {
  try {
    await sendMainPanel(ctx);
  } catch (error) {
    logger.error(
      "ERROR START",
      {
        message:
          error?.message || String(error),
      }
    );
  }
});

// ============================================================
// PAYMENT SUPPORT
// ============================================================

bot.command(
  "paysupport",
  async (ctx) => {
    await ctx.reply(
      `ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ

ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ,
ᴄᴏɴᴛᴀᴄᴛ @User18fx`
    );
  }
);

// ============================================================
// PAYMENT BUTTONS
// ============================================================

bot.action(
  "pay_vip_stars",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      await sendVipInvoice(ctx);
    } catch (error) {
      logger.error(
        "ERROR pay_vip_stars",
        {
          message:
            error?.message || String(error),
        }
      );

      await ctx.answerCbQuery(
        "✘ᴇʀʀᴏʀ"
      ).catch(() => {});
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
      logger.error(
        "ERROR pay_user_stars",
        {
          message:
            error?.message || String(error),
        }
      );

      await ctx.answerCbQuery(
        "✘ᴇʀʀᴏʀ"
      ).catch(() => {});
    }
  }
);

// ============================================================
// BACK TO MAIN
// ============================================================

bot.action(
  "back_to_main",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      await ctx.deleteMessage()
        .catch(() => {});

      await sendMainPanel(ctx);
    } catch (error) {
      logger.error(
        "ERROR back_to_main",
        {
          message:
            error?.message || String(error),
        }
      );
    }
  }
);

// ============================================================
// BACK TO CHANNELS
// ============================================================

bot.action(
  "back_to_channels",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      await ctx.deleteMessage()
        .catch(() => {});

      await sendChannelsPanel(ctx);
    } catch (error) {
      logger.error(
        "ERROR back_to_channels",
        {
          message:
            error?.message || String(error),
        }
      );
    }
  }
);

// ============================================================
// PRE CHECKOUT
// ============================================================

bot.on(
  "pre_checkout_query",
  async (ctx) => {
    try {
      await ctx.answerPreCheckoutQuery(
        true
      );
    } catch (error) {
      logger.error(
        "PRE CHECKOUT ERROR",
        {
          message:
            error?.message || String(error),
        }
      );
    }
  }
);

// ============================================================
// MEDIA HANDLER
// ============================================================

async function handleMedia(ctx) {
  const userId = String(
    ctx.from?.id || ""
  );

  const pending =
    pendingVideoRequests.get(
      userId
    );

  if (!pending) return;

  const validation =
    validateVideoRequest(
      userId,
      pending
    );

  if (!validation.valid) {
    await ctx.reply(
      "✘ ʀᴇQᴜᴇꜱᴛ ᴇxᴘɪʀᴇᴅ."
    );

    return;
  }

  if (!pending.waitingForPhoto) {
    return;
  }

  pending.waitingForPhoto = false;
  pending.awaitingAdminApproval = true;
  pending.invalidTextCount = 0;

  pendingVideoRequests.set(
    userId,
    pending
  );

  try {
    const user =
      getUserMeta(ctx.from);

    await bot.telegram.copyMessage(
      ADMIN_CHAT_ID,
      ctx.chat.id,
      ctx.message.message_id,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✓ ᴀᴘᴘʀᴏᴠᴇ",
                callback_data:
                  `approve_video_${user.id}`,
              },
              {
                text: "✘ ʀᴇᴊᴇᴄᴛ",
                callback_data:
                  `reject_video_${user.id}`,
              },
            ],
          ],
        },
      }
    );

    await ctx.reply(
      `⏳ ᴘʜᴏᴛᴏ ʀᴇᴄᴇɪᴠᴇᴅ.

ᴡᴀɪᴛ ᴡʜɪʟᴇ ɪᴛ ɪꜱ ʀᴇᴠɪᴇᴡᴇᴅ.`
    );
  } catch (error) {
    logger.error(
      "SEND MEDIA ERROR",
      {
        message:
          error?.message || String(error),
      }
    );

    await ctx.reply(
      "✘ ᴇʀʀᴏʀ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴛʜᴇ ᴘʜᴏᴛᴏ."
    );
  }
}

bot.on(
  "photo",
  handleMedia
);

bot.on(
  "video",
  handleMedia
);

// ============================================================
// TEXT HANDLER
// ============================================================

bot.on(
  "text",
  async (ctx) => {
    const text =
      ctx.message.text?.trim() || "";

    const userId = String(
      ctx.from?.id || ""
    );

    const pending =
      pendingVideoRequests.get(
        userId
      );

    try {
      if (text === BTN_VIDEOCALL) {
        return await openVideocallFlow(ctx);
      }

      if (
        text === BTN_GET_FULL_ACCESS
      ) {
        return await sendMembershipPanel(ctx);
      }

      if (text === BTN_VIP) {
        return await sendVipPanel(ctx);
      }

      if (text === BTN_USER) {
        return await sendUserPanel(ctx);
      }

      if (text === BTN_CHANNELS) {
        return await sendChannelsPanel(ctx);
      }

      if (text === BTN_REFRESH) {
        return await sendRefreshPanel(ctx);
      }

      if (
        text === BTN_SMOKELANDIA
      ) {
        return await sendSmokelandiaChannelPanel(ctx);
      }

      if (
        text === BTN_USERFX_SITE
      ) {
        return await sendUserFxChannelPanel(ctx);
      }

      if (
        text === BTN_CHANNELS_BACK ||
        text === BTN_BACK_MENU
      ) {
        pendingVideoRequests.delete(
          userId
        );

        return await sendMainPanel(ctx);
      }

      if (text === BTN_CANCEL) {
        pendingVideoRequests.delete(
          userId
        );

        return await sendMainPanel(ctx);
      }

      if (text === BTN_ZOOM) {
        return await ctx.reply(
          `📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ

Haz clic en el botón para unirte a la videollamada por Zoom:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text:
                      "📹ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ",
                    url: ZOOM_URL,
                  },
                ],
              ],
            },
          }
        );
      }

      if (
        text === BTN_TELEGRAM
      ) {
        return await ctx.reply(
          `💬 ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ

ᴄʟɪᴄᴋ ᴛʜᴇ ʙᴜᴛᴛᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ ᴏɴ ᴛᴇʟᴇɢʀᴀᴍ:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text:
                      "📹 ɪɴɪᴄɪᴀʀ ᴠɪᴅᴇᴏᴄᴀʟʟ",
                    url:
                      TELEGRAM_CALL_URL,
                  },
                ],
              ],
            },
          }
        );
      }
    } catch (error) {
      logger.error(
        "BUTTON TEXT ERROR",
        {
          message:
            error?.message || String(error),
        }
      );

      return;
    }

    if (text.startsWith("/")) {
      return;
    }

    if (pending?.waitingForPhoto) {
      pending.invalidTextCount =
        (pending.invalidTextCount || 0) +
        1;

      pendingVideoRequests.set(
        userId,
        pending
      );

      if (
        pending.invalidTextCount >= 4
      ) {
        pendingVideoRequests.delete(
          userId
        );

        await ctx.reply(
          "✘ ʀᴇQᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ."
        );

        await sendMainPanel(ctx);

        return;
      }

      await ctx.reply(
        `📸😏 ʜᴏʟᴅ ᴜᴘ...

ʟᴇᴍᴍᴇ ꜱᴇᴇ ᴀ ᴘɪᴄᴛᴜʀᴇ ᴏꜰ ʏᴏᴜ ꜰɪʀꜱᴛ.

ᴛʜᴇɴ ɪ'ʟʟ ꜱᴇɴᴅ ᴛʜᴇ ʟɪɴᴋꜱ ᴛᴏ ᴄᴀʟʟ ᴍᴇ.`
      );

      return;
    }

    await sendMainPanel(ctx);
  }
);

// ============================================================
// SUCCESSFUL PAYMENT EVENT
// ============================================================

bot.on(
  "successful_payment",
  handleSuccessfulPayment
);

// ============================================================
// NOTIFY ME
// ============================================================

bot.action(
  /^notify_me_(.+)$/,
  async (ctx) => {
    const requesterId =
      String(ctx.match[1]);

    try {
      await ctx.answerCbQuery(
        "ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ."
      );

      await ctx.editMessageReplyMarkup({
        inline_keyboard: [],
      });

      const user =
        getUserMeta(ctx.from);

      await adminBot.telegram.sendMessage(
        ADMIN_CHAT_ID,
        `🔔 <b>Notify request</b>

Name: <b>${escapeHtml(user.fullName)}</b>
Username: <b>${escapeHtml(user.username)}</b>
ID: <code>${escapeHtml(user.id)}</code>
Target: <code>${escapeHtml(requesterId)}</code>`,
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
                  text:
                    "𝐔𝐬𝐞𝐫 Ŧҳ 🜲",
                  url:
                    USER_NOTIFY_LINK,
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      logger.error(
        "NOTIFY ME ERROR",
        {
          message:
            error?.message || String(error),
        }
      );
    }
  }
);

// ============================================================
// ADMIN APPROVE
// ============================================================

bot.action(
  /^approve_video_(.+)$/,
  async (ctx) => {
    if (
      String(ctx.from.id) !==
      String(ADMIN_CHAT_ID)
    ) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
      );

      return;
    }

    try {
      await ctx.answerCbQuery(
        "✅ ᴀᴘᴘʀᴏᴠᴇᴅ"
      );

      await ctx.editMessageReplyMarkup({
        inline_keyboard: [],
      });

      const requesterId =
        String(ctx.match[1]);

      const pending =
        pendingVideoRequests.get(
          requesterId
        );

      if (!pending) {
        await ctx.reply(
          "ʀᴇQᴜᴇꜱᴛ ɴᴏᴛ ꜰᴏᴜɴᴅ."
        );

        return;
      }

      pendingVideoRequests.delete(
        requesterId
      );

      await sendApprovedVideocallFlow(
        requesterId
      );
    } catch (error) {
      logger.error(
        "APPROVE VIDEO ERROR",
        {
          message:
            error?.message || String(error),
        }
      );
    }
  }
);

// ============================================================
// ADMIN REJECT
// ============================================================

bot.action(
  /^reject_video_(.+)$/,
  async (ctx) => {
    if (
      String(ctx.from.id) !==
      String(ADMIN_CHAT_ID)
    ) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
      );

      return;
    }

    try {
      await ctx.answerCbQuery(
        "❌ ʀᴇᴊᴇᴄᴛᴇᴅ"
      );

      await ctx.editMessageReplyMarkup({
        inline_keyboard: [],
      });

      const requesterId =
        String(ctx.match[1]);

      pendingVideoRequests.delete(
        requesterId
      );

      const notifyKeyboard =
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
        `⏳ ɪ'ᴍ ᴊᴜꜱᴛ ɢᴇᴛᴛɪɴɢ ʀᴇᴀᴅʏ ᴛᴏ ʜᴀᴠᴇ ꜱᴏᴍᴇ ꜰᴜɴ ᴡɪᴛʜ ᴀ ɢᴜʏ.

ɪ ᴍɪɢʜᴛ ᴍᴇꜱꜱᴀɢᴇ ʏᴏᴜ ʟᴀᴛᴇʀ ɪꜰ ᴛʜᴀᴛ'ꜱ ᴄᴏᴏʟ`,
        {
          reply_markup:
            notifyKeyboard.reply_markup,
        }
      );
    } catch (error) {
      logger.error(
        "REJECT VIDEO ERROR",
        {
          message:
            error?.message || String(error),
        }
      );
    }
  }
);

// ============================================================
// ERROR HANDLERS
// ============================================================

bot.catch((error) => {
  logger.error(
    "TELEGRAF BOT ERROR",
    {
      message:
        error?.message || String(error),
    }
  );
});

adminBot.command(
  "myid",
  async (ctx) => {
    await ctx.reply(
      `chat_id: ${ctx.chat.id}`
    );
  }
);

adminBot.catch((error) => {
  logger.error(
    "ADMIN TELEGRAF ERROR",
    {
      message:
        error?.message || String(error),
    }
  );
});

// ============================================================
// WEBHOOK HANDLER
// ============================================================

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    const secret =
      req.headers[
        "x-telegram-bot-api-secret-token"
      ];

    if (!secret) {
      logger.warn(
        "Missing webhook secret"
      );

      return res
        .status(401)
        .json({
          error: "Unauthorized",
        });
    }

    let targetBot = null;

    if (
      secret === WEBHOOK_SECRET
    ) {
      targetBot = bot;
    }

    if (
      ADMIN_WEBHOOK_SECRET &&
      secret === ADMIN_WEBHOOK_SECRET
    ) {
      targetBot = adminBot;
    }

    if (!targetBot) {
      logger.warn(
        "Invalid webhook secret"
      );

      return res
        .status(401)
        .json({
          error: "Unauthorized",
        });
    }

    const update = req.body;

    await targetBot.handleUpdate(
      update
    );

    return res
      .status(200)
      .send("OK");
  } catch (error) {
    logger.error(
      "BOT HANDLE UPDATE ERROR",
      {
        message:
          error?.message || String(error),
        stack: error?.stack,
      }
    );

    return res
      .status(200)
      .send("OK");
  }
}