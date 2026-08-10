import { Telegraf, Markup, Input } from "telegraf";
import Redis from "ioredis";
import winston from "winston";
import path from "path";

// ======================================================
// LOGGER
// ======================================================

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "combined.log",
    }),
  ],
});

// ======================================================
// VERCEL CONFIG
// ======================================================

export const config = {
  api: {
    bodyParser: true,
  },
};

export const maxDuration = 60;

// ======================================================
// ENV
// ======================================================

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const ADMIN_WEBHOOK_SECRET = process.env.ADMIN_WEBHOOK_SECRET;
const REDIS_URL = process.env.REDIS_URL;

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

const redis = new Redis(REDIS_URL);

redis.on("error", (error) => {
  logger.error("REDIS ERROR", {
    message: error?.message,
    stack: error?.stack,
  });
});

// ======================================================
// REDIS HELPERS
// ======================================================

async function redisGetJson(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error("REDIS GET JSON ERROR", {
      key,
      message: error?.message,
    });

    return null;
  }
}

async function redisSetJson(key, data, ttlSeconds = null) {
  try {
    const serialized = JSON.stringify(data);

    if (ttlSeconds) {
      await redis.set(
        key,
        serialized,
        "EX",
        ttlSeconds
      );
    } else {
      await redis.set(
        key,
        serialized
      );
    }

    return true;
  } catch (error) {
    logger.error("REDIS SET JSON ERROR", {
      key,
      message: error?.message,
    });

    return false;
  }
}

async function redisDelete(key) {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error("REDIS DELETE ERROR", {
      key,
      message: error?.message,
    });
  }
}

// ======================================================
// PAID USERS
// ======================================================

async function getPaidUser(userId) {
  return redisGetJson(
    `paid_user:${String(userId)}`
  );
}

async function setPaidUser(userId, data) {
  return redisSetJson(
    `paid_user:${String(userId)}`,
    data
  );
}

// ======================================================
// VIDEO REQUEST STATE
// ======================================================
async function getVideoRequest(userId) {
  return redisGetJson(
    `video_request:${String(userId)}`
);
}
async function setVideoRequest(userId, data) {
  return redisSetJson(
    `video_request:${String(userId)}`,
    data,
    60 * 60 * 6
  );}
async function deleteVideoRequest(userId) {
  await redisDelete(
    `video_request:${String(userId)}`
  );}
// ======================================================
// BOTS
const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);
bot.telegram.webhookReply = false;
adminBot.telegram.webhookReply = false;
const ZOOM_URL = "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const TELEGRAM_CALL_URL = "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY";
const SMOKELANDIA_GROUP_LINK = "https://t.me/SmokelandiaFx_bot";
const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const USERFX_SITE_URL = "https://userfx-web.vercel.app";
const VIP_STARS_PRICE = 1500;
const USER_STARS_PRICE = 500;
const STARS_130_PAYLOAD =
  "videocall_access_130";
const STARS_130_PRICE = 130;
const VIP_PAYLOAD =
  "vip_fx_access";
const USER_PAYLOAD =
  "user_fx_access";
const TIER_VIP =
  "ᴠɪᴘ";
const TIER_USER =
  "ᴜꜱᴇʀ";
// ======================================================
// BUTTONS
// ======================================================

const BTN_VIDEOCALL =
  "📞 ᴠɪᴅᴇᴏᴄᴀʟʟ";

const BTN_GET_FULL_ACCESS =
  "🔥 ɢᴇᴛ ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ";

const BTN_VIP =
  "⚡ᴠɪᴘ";

const BTN_USER =
  "👑ᴜꜱᴇʀ";

const BTN_CHANNELS =
  "📺ᴄʜᴀɴɴᴇʟꜱ";

const BTN_REFRESH =
  "↻ ʀᴇꜰʀᴇꜱʜ";

const BTN_ZOOM =
  "🟦 ᴢᴏᴏᴍ";

const BTN_TELEGRAM =
  "💬 ᴛᴇʟᴇɢʀᴀᴍ";

const BTN_CANCEL =
  "✖ ᴄᴀɴᴄᴇʟ";

const BTN_BACK_MENU =
  "↽ ʙᴀᴄᴋ";

const BTN_SMOKELANDIA =
  "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ";

const BTN_USERFX_SITE =
  "𝐔𝐬𝐞𝐫 🜲∓ҳ";

const BTN_CHANNELS_BACK =
  "↽ ʙᴀᴄᴋ";

// ======================================================
// UTILITIES
// ======================================================

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function getUserMeta(from) {
  const firstName =
    from?.first_name || "";

  const lastName =
    from?.last_name || "";

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    "No name";

  const username =
    from?.username
      ? `@${from.username}`
      : "sin_username";

  const id =
    String(from?.id || "");

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

// ======================================================
// BUTTON TRACKING
// ======================================================

async function trackButtonClick(
  ctx,
  buttonName
) {
  try {
    const user =
      getUserMeta(ctx.from);

    if (!user.id) {
      return;
    }

    const data = {
      fullName: user.fullName,
      username: user.username,
      id: user.id,
      button: buttonName,
      clickedAt:
        new Date().toISOString(),
    };

    await redis.set(
      `button_click:${user.id}:${Date.now()}`,
      JSON.stringify(data),
      "EX",
      60 * 60 * 24 * 30
    );
  } catch (error) {
    logger.error(
      "TRACK BUTTON ERROR",
      {
        message: error?.message,
        stack: error?.stack,
      }
    );
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
  try {
    const key =
      `rate_limit:videocall:${String(userId)}`;

    const count =
      await redis.incr(key);

    if (count === 1) {
      await redis.expire(
        key,
        windowSeconds
      );
    }

    return count <= limit;
  } catch (error) {
    logger.error(
      "RATE LIMIT ERROR",
      {
        message: error?.message,
      }
    );

    return true;
  }
}

// ======================================================
// KEYBOARDS
// ======================================================

function getMainKeyboard() {
  return Markup.keyboard([
    [BTN_VIDEOCALL],
    [BTN_GET_FULL_ACCESS],
    [BTN_VIP, BTN_USER],
    [BTN_CHANNELS],
    [BTN_REFRESH],
  ]).resize();
}

function getPendingPhotoKeyboard() {
  return Markup.keyboard([
    [BTN_CANCEL],
  ]).resize();
}

function getApprovedVideocallKeyboard() {
  return Markup.keyboard([
    [BTN_ZOOM, BTN_TELEGRAM],
    [BTN_BACK_MENU],
  ]).resize();
}

// ======================================================
// VIDEOCALL INLINE BUTTONS
// ======================================================

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

// ======================================================
// STARS KEYBOARDS
// ======================================================

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

// ======================================================
// CHANNELS
// ======================================================

function getChannelsKeyboard() {
  return Markup.keyboard([
    [
      BTN_SMOKELANDIA,
      BTN_USERFX_SITE,
    ],
    [
      BTN_CHANNELS_BACK,
    ],
  ]).resize();
}

// ======================================================
// ACCESS
// ======================================================

async function getAccessState(userId) {
  const entry =
    await getPaidUser(userId);

  return {
    hasVip:
      entry?.tier === TIER_VIP,

    hasUser:
      entry?.tier === TIER_USER ||
      entry?.tier === TIER_VIP,

    entry,
  };
}

// ======================================================
// TYPING
// ======================================================

async function typing(
  ctx,
  action = "typing"
) {
  try {
    const delay =
      500 +
      Math.floor(
        Math.random() * 900
      );

    await ctx.sendChatAction(action);

    await new Promise(
      (resolve) =>
        setTimeout(resolve, delay)
    );
  } catch (error) {
    logger.error(
      "TYPING ERROR",
      {
        message: error?.message,
      }
    );
  }
}

// ======================================================
// MAIN PANEL
// ======================================================

async function sendMainPanel(ctx) {
  await typing(ctx);

  await ctx.reply(
    `Ŧҳ | ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ

ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ.

ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`,
    getMainKeyboard()
  );
}

// ======================================================
// MEMBERSHIP
// ======================================================

async function sendMembershipPanel(ctx) {
  await typing(ctx);

  await ctx.reply(
    `🔥 ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ

👑 ʙᴇɴᴇꜰɪᴛꜱ
⇀ ᴘʀɪᴏʀɪᴛʏ ᴀᴄᴄᴇꜱꜱ
⇀ ᴘʀɪᴠᴀᴛᴇ ᴜɴʟᴏᴄᴋꜱ
⇀ ᴡᴇᴇᴋ¹ / ᴀʟʙᴜᴍ¹

⚡ ʙᴇɴᴇꜰɪᴛs
⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
⇀ ᴘʀᴇᴍɪᴜᴍ ꜱᴇᴄᴛɪᴏɴꜱ
⇀ ᴡᴇᴇᴋꜱ³ / ᴀʟʙᴜᴍꜱ³`,
    getMainKeyboard()
  );
}

// ======================================================
// VIP
// ======================================================

async function sendVipPanel(ctx) {
  try {
    await ctx.replyWithVideo(
      "Gs1OgH5HZGzdmjgWmCalvexfhI4DGJN6FuJ-J7JlaLQUeB4c8Xw0_ju086n6YM_g",
      {
        caption:
          `ᴠɪᴘ⚡

ᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
        reply_markup:
          getStarsVipKeyboard()
            .reply_markup,
      }
    );
  } catch (error) {
    logger.error(
      "VIP PANEL ERROR",
      {
        message: error?.message,
        stack: error?.stack,
      }
    );

    await ctx.reply(
      `ᴠɪᴘ⚡

ᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
      getStarsVipKeyboard()
    );
  }
}

// ======================================================
// USER
// ======================================================

async function sendUserPanel(ctx) {
  try {
    await ctx.replyWithPhoto(
      "r7iZgQjb73xKY4_5WH2DbV7GHk7P9zoC7RuHnB9wIHPQ_o0hbBcNyVhQA4uVN7GT",
      {
        caption:
          `ᴜꜱᴇʀ👑

ᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
        reply_markup:
          getStarsUserKeyboard()
            .reply_markup,
      }
    );
  } catch (error) {
    logger.error(
      "USER PANEL ERROR",
      {
        message: error?.message,
        stack: error?.stack,
      }
    );

    await ctx.reply(
      `ᴜꜱᴇʀ👑

ᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
      getStarsUserKeyboard()
    );
  }
}

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
  const {
    hasVip,
    hasUser,
  } =
    await getAccessState(
      ctx.from?.id
    );

  const tier =
    hasVip
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
// VIDEOCALL REQUEST
// ======================================================

async function openVideocallFlow(ctx) {
  const userId =
    String(ctx.from?.id || "");

  if (!userId) {
    return;
  }

  const allowed =
    await checkRateLimit(
      userId,
      3,
      300
    );

  if (!allowed) {
    await ctx.reply(
      "⏳ Please wait before requesting again."
    );

    return;
  }

  const currentRequest =
    await getVideoRequest(userId);

  if (
    currentRequest?.status ===
      "waiting_photo" ||
    currentRequest?.status ===
      "awaiting_admin" ||
    currentRequest?.status ===
      "awaiting_payment"
  ) {
    await ctx.reply(
      "⏳ You already have an active videocall request."
    );

    return;
  }

  const user =
    getUserMeta(ctx.from);

  await setVideoRequest(
    userId,
    {
      userId,
      fullName: user.fullName,
      username: user.username,
      status: "waiting_photo",
      invalidTextCount: 0,
      createdAt: Date.now(),
    }
  );

  // ----------------------------------------------------
  // SEND VIDEO TO USER
  // ----------------------------------------------------

  try {   await ctx.reply(
      Input.fromLocalFile(
        assets("FX-Y24V01.mp4")
      ),
      {
        caption:
          `ʜᴏʟᴅ ᴜᴘ, ʙᴇꜰᴏʀᴇ ᴡᴇ ᴋᴇᴇᴘ ɢᴏɪɴɢ, ᴄᴀɴ ɪ ꜱᴇᴇ ᴀ ᴘɪᴄ ᴏꜰ ʏᴏᴜ?

ɪ ᴡᴀɴɴᴀ ᴋɴᴏᴡ ᴡʜᴏ ɪ'ᴍ ᴛᴀʟᴋɪɴɢ ᴛᴏ...

ᴛʜᴇɴ ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʙᴜᴛᴛᴏɴꜱ.`,
        reply_markup:
          getPendingPhotoKeyboard()
            .reply_markup,
      }
    );
  } catch (error) {
    logger.error(
      "SEND VIDEO ERROR",
      {
        message: error?.message,
        stack: error?.stack,
      }
    );

    await ctx.reply(
      `ʜᴏʟᴅ ᴜᴘ...

ᴄᴀɴ ɪ ꜱᴇᴇ ᴀ ᴘɪᴄ ᴏꜰ ʏᴏᴜ?`,
      getPendingPhotoKeyboard()
    );
  }

  // ----------------------------------------------------
  // NOTIFY ADMIN
  // ----------------------------------------------------

  try {
    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📞 New videocall request

Name:
${escapeHtml(user.fullName)}

Username:
${escapeHtml(user.username)}

ID:
${escapeHtml(user.id)}

Chat ID User:
${escapeHtml(userId)}

ᴇꜱᴘᴇʀᴀɴᴅᴏ ꜱᴜ ꜰᴏᴛᴏ...`,
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    logger.error(
      "ADMIN MESSAGE ERROR",
      {
        message: error?.message,
        stack: error?.stack,
      }
    );
  }
}

// ======================================================
// APPROVED VIDEOCALL
// ======================================================

async function sendApprovedVideocallFlow(
  userId
) {
  const targetUserId =
    String(userId);

  try {
    // --------------------------------------------------
    // APPROVAL MESSAGE
    // --------------------------------------------------

    await bot.telegram.sendMessage(
      targetUserId,
      `✅ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ

ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ ᴀᴘᴘʀᴏᴠᴇᴅ.`
    );

    // --------------------------------------------------
    // VIDEOCALL BUTTONS
    // --------------------------------------------------

    const keyboard =
      getVideocallInlineKeyboard();

    logger.info(
      "SENDING VIDEOCALL KEYBOARD",
      {
        userId: targetUserId,
        keyboard,
        zoomUrl: ZOOM_URL,
        telegramUrl:
          TELEGRAM_CALL_URL,
      }
    );

    await bot.telegram.sendMessage(
      targetUserId,
      `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.

ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ:`,
      {
        reply_markup: keyboard,
      }
    );

    logger.info(
      "VIDEOCALL OPTIONS SENT",
      {
        userId: targetUserId,
      }
    );
  } catch (error) {
    logger.error(
      "SEND APPROVED VIDEOCALL ERROR",
      {
        userId: targetUserId,
        message: error?.message,
        description:
          error?.response?.description,
        errorResponse:
          error?.response,
        stack: error?.stack,
      }
    );
  }
}

// ======================================================
// INVOICES
// ======================================================

async function sendVipInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message
      ?.chat?.id;

  if (!chatId) {
    logger.error(
      "NO CHAT ID VIP INVOICE"
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
            amount:
              VIP_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error(
      "VIP INVOICE ERROR",
      {
        message: error?.message,
        stack: error?.stack,
      }
    );

    await ctx.reply(
      "❌ ᴘᴀʏᴍᴇɴᴛ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴇʀʀᴏʀ."
    );
  }
}

async function sendUserInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message
      ?.chat?.id;

  if (!chatId) {
    logger.error(
      "NO CHAT ID USER INVOICE"
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
            label:
              "USER FX ACCESS",
            amount:
              USER_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error(
      "USER INVOICE ERROR",
      {
        message: error?.message,
        stack: error?.stack,
      }
    );

    await ctx.reply(
      "❌ ᴘᴀʏᴍᴇɴᴛ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴇʀʀᴏʀ."
    );
  }
}

async function sendStars130Invoice(
  userId
) {
  try {
    await bot.telegram.callApi(
      "sendInvoice",
      {
        chat_id: userId,
        title:
          "VIDEOCALL ACCESS",
        description:
          "Access to the videocall service.",
        payload:
          STARS_130_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label:
              "VIDEOCALL ACCESS",
            amount:
              STARS_130_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    logger.error(
      "130 STARS INVOICE ERROR",
      {
        userId,
        message: error?.message,
        stack: error?.stack,
      }
    );

    await bot.telegram.sendMessage(
      userId,
      "❌ ᴇʀʀᴏʀ ᴄʀᴇᴀᴛɪɴɢ ᴛʜᴇ ᴘᴀʏᴍᴇɴᴛ."
    );
  }
}

// ======================================================
// PAYMENT
// ======================================================

async function handleSuccessfulPayment(
  ctx
) {
  const payment =
    ctx.message?.successful_payment;

  if (!payment) {
    return;
  }

  const userId =
    String(ctx.from?.id || "");

  if (!userId) {
    return;
  }

  const chargeId =
    payment.telegram_payment_charge_id;

  const payload =
    payment.invoice_payload;

  logger.info(
    "SUCCESSFUL PAYMENT",
    {
      userId,
      payload,
      chargeId,
    }
  );

  // ====================================================
  // VIDEOCALL 130 STARS
  // ====================================================

  if (
    payload ===
    STARS_130_PAYLOAD
  ) {
    const request =
      await getVideoRequest(
        userId
      );

    if (
      !request ||
      request.status !==
        "awaiting_payment"
    ) {
      logger.warn(
        "130 PAYMENT WITHOUT VALID REQUEST",
        {
          userId,
          payload,
        }
      );

      await ctx.reply(
        `⚠️ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ, ʙᴜᴛ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇQᴜᴇꜱᴛ ᴡᴀꜱ ꜰᴏᴜɴᴅ.

ᴘʟᴇᴀꜱᴇ ᴄᴏɴᴛᴀᴄᴛ ꜱᴜᴘᴘᴏʀᴛ.`
      );

      return;
    }

    await setVideoRequest(
      userId,
      {
        ...request,
        status: "paid",
        paidAt: Date.now(),
        telegramPaymentChargeId:
          chargeId,
      }
    );

    await ctx.reply(
      `✅ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ

📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.

ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ:`,
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

  if (
    payload === VIP_PAYLOAD
  ) {
    const entry = {
      telegramPaymentChargeId:
        chargeId,
      paidAt: Date.now(),
      tier: TIER_VIP,
    };

    await setPaidUser(
      userId,
      entry
    );

    await ctx.reply(
      `✅ ᴠɪᴘ ᴀᴄᴛɪᴠᴀᴛᴇᴅ

ʏᴏᴜʀ "ᴠɪᴘ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
    );

    return;
  }

  // ====================================================
  // USER
  // ====================================================

  if (
    payload === USER_PAYLOAD
  ) {
    const entry = {
      telegramPaymentChargeId:
        chargeId,
      paidAt: Date.now(),
      tier: TIER_USER,
    };

    await setPaidUser(
      userId,
      entry
    );

    await ctx.reply(
      `✅ "ᴜꜱᴇʀ" ᴀᴄᴛɪᴠᴀᴛᴇᴅ

ʏᴏᴜʀ "ᴜꜱᴇʀ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
    );
  }
}

// ======================================================
// START
// ======================================================

bot.start(
  async (ctx) => {
    try {
      await sendMainPanel(ctx);
    } catch (error) {
      logger.error(
        "START ERROR",
        {
          message: error?.message,
          stack: error?.stack,
        }
      );
    }
  }
);

// ======================================================
// SUPPORT
// ======================================================

bot.command(
  "paysupport",
  async (ctx) => {
    await ctx.reply(
      `ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ

ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`
    );
  }
);

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
      logger.error(
        "PAY VIP ERROR",
        {
          message:
            error?.message,
          stack: error?.stack,
        }
      );
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
        "PAY USER ERROR",
        {
          message:
            error?.message,
          stack: error?.stack,
        }
      );
    }
  }
);

// ======================================================
// BACK TO MAIN
// ======================================================

bot.action(
  "back_to_main",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      await ctx
        .deleteMessage()
        .catch(() => {});

      await sendMainPanel(ctx);
    } catch (error) {
      logger.error(
        "BACK MAIN ERROR",
        {
          message:
            error?.message,
          stack: error?.stack,
        }
      );
    }
  }
);

// ======================================================
// PRE CHECKOUT
// ======================================================

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
            error?.message,
          stack: error?.stack,
        }
      );
    }
  }
);

// ======================================================
// MEDIA
// ======================================================

async function handleMedia(ctx) {
  const userId =
    String(ctx.from?.id || "");

  if (!userId) {
    return;
  }

  const pending =
    await getVideoRequest(
      userId
    );

  if (
    !pending ||
    pending.status !==
      "waiting_photo"
  ) {
    return;
  }

  const updatedPending = {
    ...pending,
    status:
      "awaiting_admin",
    invalidTextCount: 0,
    photoReceivedAt:
      Date.now(),
  };

  await setVideoRequest(
    userId,
    updatedPending
  );

  try {
    const user =
      getUserMeta(ctx.from);

    const adminKeyboard =
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "⭐ ᴘᴀʏ 130 ꜱᴛᴀʀꜱ",
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

    await adminBot.telegram.copyMessage(
      ADMIN_CHAT_ID,
      ctx.chat.id,
      ctx.message.message_id,
      {
        reply_markup:
          adminKeyboard.reply_markup,
      }
    );
  } catch (error) {
    logger.error(
      "SEND MEDIA ERROR",
      {
        message:
          error?.message,
        stack: error?.stack,
      }
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

// ======================================================
// TEXT
// ======================================================

bot.on(
  "text",
  async (ctx) => {
    const text =
      (ctx.message.text || "")
        .trim();

    const userId =
      String(ctx.from?.id || "");

    try {
      // =================================================
      // VIDEOCALL
      // =================================================

      if (
        text === BTN_VIDEOCALL
      ) {
        await trackButtonClick(
          ctx,
          "VIDEOCALL"
        );

        return await openVideocallFlow(
          ctx
        );
      }

      // =================================================
      // FULL ACCESS
      // =================================================

      if (
        text ===
        BTN_GET_FULL_ACCESS
      ) {
        await trackButtonClick(
          ctx,
          "FULL ACCESS"
        );

        return await sendMembershipPanel(
          ctx
        );
      }

      // =================================================
      // VIP
      // =================================================

      if (
        text === BTN_VIP
      ) {
        await trackButtonClick(
          ctx,
          "VIP"
        );

        return await sendVipPanel(
          ctx
        );
      }

      // =================================================
      // USER
      // =================================================

      if (
        text === BTN_USER
      ) {
        await trackButtonClick(
          ctx,
          "USER"
        );

        return await sendUserPanel(
          ctx
        );
      }

      // =================================================
      // CHANNELS
      // =================================================

      if (
        text === BTN_CHANNELS
      ) {
        await trackButtonClick(
          ctx,
          "CHANNELS"
        );

        return await sendChannelsPanel(
          ctx
        );
      }

      // =================================================
      // REFRESH
      // =================================================

      if (
        text === BTN_REFRESH
      ) {
        await trackButtonClick(
          ctx,
          "REFRESH"
        );

        return await sendRefreshPanel(
          ctx
        );
      }

      // =================================================
      // CANCEL
      // =================================================

      if (
        text === BTN_CANCEL
      ) {
        await deleteVideoRequest(
          userId
        );

        return await sendMainPanel(
          ctx
        );
      }

      // =================================================
      // BACK
      // =================================================

      if (
        text === BTN_BACK_MENU
      ) {
        await deleteVideoRequest(
          userId
        );

        return await sendMainPanel(
          ctx
        );
      }

      // =================================================
      // ZOOM
      // =================================================

      if (
        text === BTN_ZOOM
      ) {
        return await ctx.reply(
          `📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text:
                      "📹 ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ",
                    url:
                      ZOOM_URL,
                  },
                ],
              ],
            },
          }
        );
      }

      // =================================================
      // TELEGRAM
      // =================================================

      if (
        text === BTN_TELEGRAM
      ) {
        return await ctx.reply(
          `💬 ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ`,
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

      // =================================================
      // CHANNELS LINKS
      // =================================================

      if (
        text ===
        BTN_SMOKELANDIA
      ) {
        return await ctx.reply(
          "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text:
                      "↗ ᴏᴘᴇɴ",
                    url:
                      SMOKELANDIA_GROUP_LINK,
                  },
                ],
              ],
            },
          }
        );
      }

      if (
        text ===
        BTN_USERFX_SITE
      ) {
        return await ctx.reply(
          "𝐔𝐬𝐞𝐫 🜲∓ҳ",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text:
                      "↗ ᴇɴᴛᴇʀ",
                    url:
                      USERFX_SITE_URL,
                  },
                ],
              ],
            },
          }
        );
      }

      // =================================================
      // COMMANDS
      // =================================================

      if (
        text.startsWith("/")
      ) {
        return;
      }

      // =================================================
      // WAITING FOR PHOTO
      // =================================================

      const pending =
        await getVideoRequest(
          userId
        );

      if (
        pending?.status ===
        "waiting_photo"
      ) {
        const invalidTextCount =
          Number(
            pending.invalidTextCount ||
              0
          ) + 1;

        if (
          invalidTextCount >= 4
        ) {
          await deleteVideoRequest(
            userId
          );

          await ctx.reply(
            "✘ ʀᴇQᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ."
          );

          await sendMainPanel(
            ctx
          );

          return;
        }

        await setVideoRequest(
          userId,
          {
            ...pending,
            invalidTextCount,
          }
        );

        await ctx.reply(
          "📸😏 ʜᴏʟᴅ ᴜᴘ... ʟᴇᴍᴍᴇ ꜱᴇᴇ ᴀɴʏ ᴘɪᴄᴛᴜʀᴇ ᴏꜰ ʏᴏᴜ ꜰɪʀꜱᴛ."
        );

        return;
      }

      // =================================================
      // DEFAULT
      // =================================================

      await sendMainPanel(
        ctx
      );
    } catch (error) {
      logger.error(
        "TEXT HANDLER ERROR",
        {
          message:
            error?.message,
          stack:
            error?.stack,
        }
      );
    }
  }
);

// ======================================================
// PAYMENT EVENT
// ======================================================

bot.on(
  "successful_payment",
  handleSuccessfulPayment
);

// ======================================================
// ADMIN BOT ACTIONS
// ======================================================

// ======================================================
// ADMIN APPROVE STARS
// ======================================================

adminBot.action(
  /^approve_stars_(\d+)$/,
  async (ctx) => {
    const adminId =
      String(ctx.from?.id || "");

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
        "awaiting_admin"
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

      await ctx.editMessageReplyMarkup({
        inline_keyboard: [],
      });

      await setVideoRequest(
        requesterId,
        {
          ...pending,
          status:
            "awaiting_payment",
          paymentRequestedAt:
            Date.now(),
        }
      );

      await bot.telegram.sendMessage(
        requesterId,
        `✅ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ

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
          message:
            error?.message,
          stack:
            error?.stack,
        }
      );
    }
  }
);

// ======================================================
// ADMIN APPROVE CALL
// ======================================================

adminBot.action(
  /^approve_call_(\d+)$/,
  async (ctx) => {
    const adminId =
      String(ctx.from?.id || "");

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
        "awaiting_admin"
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

      // Remove admin buttons
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [],
      });

      // Save approval
      await setVideoRequest(
        requesterId,
        {
          ...pending,
          status: "approved",
          approvedAt:
            Date.now(),
        }
      );

      // Send Zoom + Telegram buttons
      await sendApprovedVideocallFlow(
        requesterId
      );
    } catch (error) {
      logger.error(
        "APPROVE CALL ERROR",
        {
          requesterId,
          message:
            error?.message,
          description:
            error?.response
              ?.description,
          stack:
            error?.stack,
        }
      );
    }
  }
);

// ======================================================
// ADMIN REJECT
// ======================================================

adminBot.action(
  /^reject_video_(\d+)$/,
  async (ctx) => {
    const adminId =
      String(ctx.from?.id || "");

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

      await ctx.editMessageReplyMarkup({
        inline_keyboard: [],
      });

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
        `⏳ ɪ'ᴍ ᴊᴜꜱᴛ ɢᴇᴛᴛɪɴɢ ʀᴇᴀᴅʏ ᴛᴏ ʜᴀᴠᴇ ꜱᴏᴍᴇ ꜰᴜɴ ᴡɪᴛʜ ᴀ ɢᴜʏ.

ɪ ᴍɪɢʜᴛ ᴍᴇꜱꜱᴀɢᴇ ʏᴏᴜ ʟᴀᴛᴇʀ ɪꜰ ᴛʜᴀᴛ'ꜱ ᴄᴏᴏʟ`,
        {
          reply_markup:
            keyboard.reply_markup,
        }
      );
    } catch (error) {
      logger.error(
        "REJECT VIDEO ERROR",
        {
          requesterId,
          message:
            error?.message,
          stack:
            error?.stack,
        }
      );
    }
  }
);

// ======================================================
// USER NOTIFY
// ======================================================

bot.action(
  /^notify_me_(\d+)$/,
  async (ctx) => {
    const requesterId =
      String(ctx.match[1]);

    const clickedUserId =
      String(ctx.from?.id || "");

    if (
      clickedUserId !==
      requesterId
    ) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
      );

      return;
    }

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

Name:
${escapeHtml(user.fullName)}

Username:
${escapeHtml(user.username)}

ID:
${escapeHtml(user.id)}

Target:
${escapeHtml(requesterId)}`,
        {
          parse_mode: "HTML",
        }
      );

      await bot.telegram.sendVideo(
        requesterId,
        Input.fromLocalFile(
          assets(
            "videoSMKLFX.mp4"
          )
        ),
        {
          caption:
            `ꜰᴏʀ ꜱᴜʀᴇ!

ꜱᴡɪɴɢ ʙʏ ᴍʏ ᴄʜᴀɴɴᴇʟ ᴀɴᴅ ꜱᴇᴇ ᴡʜᴀᴛ'ꜱ ɴᴇᴡ..`,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    "𝐔𝐬ᴇʀ 🜲∓ҳ",
                  url:
                    USER_GROUP_LINK,
                },
              ],
              [
                {
                  text:
                    "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
                  url:
                    SMOKELANDIA_GROUP_LINK,
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
          message:
            error?.message,
          stack:
            error?.stack,
        }
      );
    }
  }
);

// ======================================================
// ADMIN REPORT
// ======================================================

bot.command(
  "report",
  async (ctx) => {
    if (
      String(ctx.from?.id) !==
      String(ADMIN_USER_ID)
    ) {
      return;
    }

    try {
      const keys =
        await redis.keys(
          "button_click:*"
        );

      if (
        keys.length === 0
      ) {
        await ctx.reply(
          "📊 No button clicks recorded yet."
        );

        return;
      }

      const values =
        await redis.mget(
          ...keys
        );

      const clicks =
        values
          .filter(Boolean)
          .map((value) =>
            JSON.parse(value)
          )
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
        `📊 <b>BUTTON CLICK REPORT</b>\n\n`;
      clicks.forEach(
        (click, index) => {
          report +=
            `<b>${index + 1}. ${escapeHtml(click.fullName)}</b>\n` +
            `Username: ${escapeHtml(click.username)}\n` +
            `ID: <code>${escapeHtml(click.id)}</code>\n` +
            `Button: <b>${escapeHtml(click.button)}</b>\n` +
            `Date: ${escapeHtml(click.clickedAt)}\n\n`;
        } );
      if (
        report.length > 4000
      ) {
        report =
          report.slice(0, 3900) +
          "\n\n...";
      }
      await ctx.reply(
        report,
        {
          parse_mode: "HTML",
    } );
    } catch (error) {
      logger.error(
        "REPORT ERROR",
        {
          message:
            error?.message,
          stack:
            error?.stack,
    });
      await ctx.reply(
        "❌ Error generating report."
     );
    } });
// ======================================================
// ADMIN ID
adminBot.command(
  "myid",
  async (ctx) => {
    await ctx.reply(
    `chat_id: ${ctx.chat.id}\nuser_id: ${ctx.from?.id}`
  );
});
// ======================================================
// BOT ERROR
bot.catch((error) => {
  logger.error(
    "BOT ERROR",
    {
      message:
        error?.message,
      stack:
        error?.stack,
      description:
        error?.response
          ?.description,
} );
});
// ADMIN BOT ERROR

adminBot.catch((error) => {
  logger.error(
    "ADMIN BOT ERROR",
    {
      message:
        error?.message,
      stack:
        error?.stack,
      description:
        error?.response
          ?.description,
 } );
});
// WEBHOOK
export default async function handler(req, res) {

  // 👇 AGREGA ESTO AQUÍ
  logger.info("INCOMING REQUEST", {
    method: req.method,
    secret: req.headers["x-telegram-bot-api-secret-token"],
  });

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "telegram-webhook",
      status: "online",
    });
  }
  if (
    req.method !== "POST"
  ) {
    return res.status(405).json({
      ok: false,
      error:
        "method_not_allowed",
 });
  }
  try {
    const secret =
      req.headers[
        "x-telegram-bot-api-secret-token"
];
    if (!secret) {
      logger.warn(
        "WEBHOOK REQUEST WITHOUT SECRET"
  );
      return res.status(401).json({
        ok: false,
        error:
          "missing_webhook_secret",
  });
    }
    const update =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;
    if (!update) {
      return res.status(400).json({
        ok: false,
        error:
          "empty_update",
  });
    }
  // ADMIN BOT
    if (
      secret ===
      ADMIN_WEBHOOK_SECRET
    ) {
      await adminBot.handleUpdate(
        update
    );
      return res.status(200).json({
        ok: true,
        bot: "admin",
    });
    }
// USER BOT
   if (
      secret === WEBHOOK_SECRET
  ) {
      await bot.handleUpdate(
        update
  );
      return res.status(200).json({
        ok: true,
        bot: "user",
  });
  }
    logger.warn(
      "INVALID WEBHOOK SECRET"
  );
    return res.status(401).json({
      ok: false,
      error:
        "unauthorized",
    });
  } catch (error) {
    logger.error(
      "BOT HANDLE UPDATE ERROR",
      {
        message:
          error?.message,
        stack:
          error?.stack,
        description:
          error?.response
            ?.description,
     });
    return res.status(500).json({
      ok: false,
      error:
        "telegram_handler_error",
   });
}}