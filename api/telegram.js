import crypto from "crypto";
import path from "path";
import { Telegraf, Markup, Input } from "telegraf";
import Redis from "ioredis";

/* =========================================================
   ENVIRONMENT
========================================================= */

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const REDIS_URL = process.env.REDIS_URL;

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const SITE_URL =
  process.env.SITE_URL || "https://userfx-web.vercel.app";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

if (!ADMIN_CHAT_ID) {
  throw new Error("Missing ADMIN_CHAT_ID");
}

if (!REDIS_URL) {
  throw new Error("Missing REDIS_URL");
}

/* =========================================================
   LINKS
========================================================= */

const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";

const TELEGRAM_CALL_URL =
  "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY";

const USER_GROUP_LINK =
  "https://t.me/+v57jkAGn3DA0NWJh";

const SMOKELANDIA_GROUP_LINK =
  "https://t.me/+E4X5V3IlygxhMGQx";

/* =========================================================
   PLANS
========================================================= */

const PLANS = {
  basic: {
    id: "basic",
    name: "BASIC",
    prefix: "FX01-",
    stars: 350,
    days: 7,
    payload: "basic",
  },

  pro: {
    id: "pro",
    name: "PRO",
    prefix: "AX01-",
    stars: 750,
    days: 30,
    payload: "pro",
  },

  vip: {
    id: "vip",
    name: "VIP",
    prefix: "VIPX-",
    stars: 1500,
    days: 90,
    payload: "vip",
  },
};

const VIDEOCALL_STARS = 130;
const VIDEOCALL_PAYLOAD = "videocall_access_130";

/* =========================================================
   BOT
========================================================= */

const bot = new Telegraf(BOT_TOKEN);

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

/* =========================================================
   ASSETS
========================================================= */

const asset = (file) =>
  path.join(process.cwd(), "assets", file);

/* =========================================================
   BUTTONS
========================================================= */

const BTN_VIDEOCALL = "📞 ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_GET_CODE = "ɢᴇᴛ ᴄᴏᴅᴇ";
const BTN_CHANNELS = "📺 ᴄʜᴀɴɴᴇʟꜱ";

const BTN_BASIC = "⚡ ʙᴀꜱɪᴄ";
const BTN_PRO = "🔥 ᴘʀᴏ";
const BTN_VIP = "👑 ᴠɪᴘ";

const BTN_PAY_BASIC = "⭐ ᴘᴀʏ ʙᴀꜱɪᴄ";
const BTN_PAY_PRO = "⭐ ᴘᴀʏ ᴘʀᴏ";
const BTN_PAY_VIP = "⭐ ᴘᴀʏ ᴠɪᴘ";

const BTN_SMOKELANDIA = "☁️ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX = "🜲 ᴜꜱᴇʀ ꜰx";

const BTN_ZOOM = "📞 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "💬 ᴛᴇʟᴇɢʀᴀᴍ";

const BTN_BACK = "↽ ʙᴀᴄᴋ";
const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";

/* =========================================================
   KEYBOARDS
========================================================= */

function getMainKeyboard() {
  return Markup.keyboard(
    [
      [BTN_VIDEOCALL],
      [BTN_GET_CODE],
      [BTN_CHANNELS],
      [BTN_REFRESH],
    ],
    {
      columns: 2,
    }
  )
    .resize()
    .persistent();
}

function getPlansKeyboard() {
  return Markup.keyboard(
    [
      [BTN_BASIC, BTN_PRO, BTN_VIP],
      [BTN_BACK],
    ],
    {
      columns: 3,
    }
  ).resize();
}

function getBasicKeyboard() {
  return Markup.keyboard(
    [
      [BTN_PAY_BASIC],
      [BTN_BACK],
    ],
    {
      columns: 1,
    }
  ).resize();
}

function getProKeyboard() {
  return Markup.keyboard(
    [
      [BTN_PAY_PRO],
      [BTN_BACK],
    ],
    {
      columns: 1,
    }
  ).resize();
}

function getVipKeyboard() {
  return Markup.keyboard(
    [
      [BTN_PAY_VIP],
      [BTN_BACK],
    ],
    {
      columns: 1,
    }
  ).resize();
}

function getChannelsKeyboard() {
  return Markup.keyboard(
    [
      [BTN_SMOKELANDIA, BTN_USERFX],
      [BTN_BACK],
    ],
    {
      columns: 2,
    }
  ).resize();
}

function getVideocallKeyboard() {
  return Markup.keyboard(
    [
      [BTN_ZOOM, BTN_TELEGRAM],
      [BTN_BACK],
    ],
    {
      columns: 2,
    }
  ).resize();
}

function getCancelKeyboard() {
  return Markup.keyboard([[BTN_CANCEL]]).resize();
}

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getUserMeta(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";

  const fullName =
    `${firstName} ${lastName}`.trim() || "No name";

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

function randomCodePart() {
  return crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();
}

async function generateUniqueCode(planId) {
  const plan = PLANS[planId];

  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const code =
      `${plan.prefix}${randomCodePart()}`;

    const exists = await redis.exists(
      `fx:code:${code}`
    );

    if (!exists) {
      return code;
    }
  }

  throw new Error("Unable to generate unique code");
}

/* =========================================================
   REDIS KEYS
========================================================= */

function codeKey(code) {
  return `fx:code:${String(code).toUpperCase()}`;
}

function userCodesKey(userId) {
  return `fx:user:${userId}:codes`;
}

function paymentKey(chargeId) {
  return `fx:payment:${chargeId}`;
}

function videocallKey(userId) {
  return `fx:videocall:${userId}`;
}

function notifyKey(userId) {
  return `fx:notify:${userId}`;
}

/* =========================================================
   CREATE ACCESS CODE
========================================================= */

async function createAccessCode({
  userId,
  planId,
  payment,
}) {
  const plan = PLANS[planId];

  if (!plan) {
    throw new Error("Invalid plan");
  }

  const code = await generateUniqueCode(planId);

  const now = Date.now();

  const expiresAt =
    now +
    plan.days *
      24 *
      60 *
      60 *
      1000;

  const record = {
    code,
    plan: plan.id,
    planName: plan.name,
    userId: String(userId),
    status: "active",
    createdAt: now,
    expiresAt,
    telegramPaymentChargeId:
      payment.telegram_payment_charge_id || "",
    telegramProviderChargeId:
      payment.provider_payment_charge_id || "",
  };

  const ttlSeconds =
    Math.ceil(
      (expiresAt - now) / 1000
    ) + 86400;

  await redis.set(
    codeKey(code),
    JSON.stringify(record),
    "EX",
    ttlSeconds
  );

  await redis.sadd(
    userCodesKey(userId),
    code
  );

  await redis.set(
    paymentKey(
      payment.telegram_payment_charge_id
    ),
    JSON.stringify({
      userId: String(userId),
      code,
      plan: plan.id,
      createdAt: now,
    }),
    "EX",
    60 * 60 * 24 * 365
  );

  return record;
}

/* =========================================================
   GET CODE URL
========================================================= */

function getCodeUrl() {
  return `${SITE_URL}/?getcode=1`;
}

/* =========================================================
   MAIN
========================================================= */

async function sendMainPanel(ctx) {
  await ctx.reply(
    `Ŧҳ | ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ

ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ.

ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ.`,
    getMainKeyboard()
  );
}

/* =========================================================
   GET CODE
========================================================= */

async function sendGetCode(ctx) {
  await ctx.reply(
    `ɢᴇᴛ ᴄᴏᴅᴇ

ᴄʜᴏᴏꜱᴇ ʏᴏᴜʀ ᴀᴄᴄᴇꜱꜱ ᴘʟᴀɴ ʙᴇʟᴏᴡ.

ʙᴀꜱɪᴄ — 350 ⭐
ᴘʀᴏ — 750 ⭐
ᴠɪᴘ — 1500 ⭐

ᴛʜᴇ ᴡᴇʙꜱɪᴛᴇ ɪꜱ ᴀʟꜱᴏ ᴀᴠᴀɪʟᴀʙʟᴇ ʙᴇʟᴏᴡ.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🌐 ᴏᴘᴇɴ ɢᴇᴛ ᴄᴏᴅᴇ",
              url: getCodeUrl(),
            },
          ],
        ],
      },
    }
  );

  await ctx.reply(
    `ᴄʜᴏᴏꜱᴇ ᴘʟᴀɴ`,
    getPlansKeyboard()
  );
}

/* =========================================================
   PLAN PANELS
========================================================= */

async function sendBasicPanel(ctx) {
  await ctx.reply(
    `⚡ ʙᴀꜱɪᴄ

⭐ 350 ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ

ᴠᴀʟɪᴅ ꜰᴏʀ 7 ᴅᴀʏꜱ.

ᴘᴀʏ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ᴛᴏ ʀᴇᴄᴇɪᴠᴇ ʏᴏᴜʀ ᴄᴏᴅᴇ.`,
    getBasicKeyboard()
  );
}

async function sendProPanel(ctx) {
  await ctx.reply(
    `🔥 ᴘʀᴏ

⭐ 750 ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ

ᴠᴀʟɪᴅ ꜰᴏʀ 30 ᴅᴀʏꜱ.

ᴘᴀʏ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ᴛᴏ ʀᴇᴄᴇɪᴠᴇ ʏᴏᴜʀ ᴄᴏᴅᴇ.`,
    getProKeyboard()
  );
}

async function sendVipPanel(ctx) {
  await ctx.reply(
    `👑 ᴠɪᴘ

⭐ 1500 ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ

ᴠᴀʟɪᴅ ꜰᴏʀ 90 ᴅᴀʏꜱ.

ᴘᴀʏ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ᴛᴏ ʀᴇᴄᴇɪᴠᴇ ʏᴏᴜʀ ᴄᴏᴅᴇ.`,
    getVipKeyboard()
  );
}

/* =========================================================
   INVOICE
========================================================= */

async function sendPlanInvoice(ctx, planId) {
  const plan = PLANS[planId];

  if (!plan) return;

  await ctx.telegram.callApi(
    "sendInvoice",
    {
      chat_id: ctx.chat.id,
      title: `${plan.name} ACCESS`,
      description:
        `${plan.name} access for ${plan.days} days.`,
      payload: plan.payload,
      currency: "XTR",
      prices: [
        {
          label: `${plan.name} ACCESS`,
          amount: plan.stars,
        },
      ],
      start_parameter: `fx_${plan.id}`,
    }
  );
}

/* =========================================================
   VIDEOCALL START
========================================================= */

async function openVideocallFlow(ctx) {
  const userId = String(ctx.from?.id || "");

  if (!userId) return;

  const existing =
    await redis.get(
      videocallKey(userId)
    );

  if (existing) {
    await ctx.reply(
      `ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ʜᴀᴠᴇ ᴀɴ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇQᴜᴇꜱᴛ.`,
      getCancelKeyboard()
    );

    return;
  }

  const rateKey =
    `fx:ratelimit:videocall:${userId}`;

  const count =
    await redis.incr(rateKey);

  if (count === 1) {
    await redis.expire(
      rateKey,
      60 * 15
    );
  }

  if (count > 3) {
    await ctx.reply(
      `ᴛᴏᴏ ᴍᴀɴʏ ʀᴇQᴜᴇꜱᴛꜱ.

ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.`,
      getMainKeyboard()
    );

    return;
  }

  await redis.set(
    videocallKey(userId),
    JSON.stringify({
      userId,
      status: "waiting_photo",
      createdAt: Date.now(),
    }),
    "EX",
    60 * 30
  );

  await ctx.reply(
    `ʙᴇꜰᴏʀᴇ ᴡᴇ ᴋᴇᴇᴘ ɢᴏɪɴɢ...

ᴄᴀɴ ɪ ꜱᴇᴇ ᴀ ᴘɪᴄ ᴏꜰ ʏᴏᴜ?

ꜱᴇɴᴅ ᴀ ᴘʜᴏᴛᴏ ᴏꜰ ʏᴏᴜʀꜱᴇʟꜰ ʙᴇʟᴏᴡ.`,
    getCancelKeyboard()
  );
}

/* =========================================================
   PHOTO
========================================================= */

async function handleVideocallPhoto(ctx) {
  const userId = String(ctx.from?.id || "");

  const raw =
    await redis.get(
      videocallKey(userId)
    );

  if (!raw) return false;

  const state = JSON.parse(raw);

  if (state.status !== "waiting_photo") {
    return false;
  }

  state.status = "awaiting_admin";
  state.updatedAt = Date.now();

  await redis.set(
    videocallKey(userId),
    JSON.stringify(state),
    "EX",
    60 * 30
  );

  const user =
    getUserMeta(ctx.from);

  const adminMessage =
    await bot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📞 <b>NEW VIDEOCALL REQUEST</b>

Name:
<b>${escapeHtml(user.fullName)}</b>

Username:
<b>${escapeHtml(user.username)}</b>

ID:
<code>${escapeHtml(user.id)}</code>

Status:
<b>WAITING FOR DECISION</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "⭐ 130 STARS",
                callback_data:
                  `vc_pay_${userId}`,
              },
            ],
            [
              {
                text: "✅ ACCEPT",
                callback_data:
                  `vc_accept_${userId}`,
              },
              {
                text: "❌ REJECT",
                callback_data:
                  `vc_reject_${userId}`,
              },
            ],
          ],
        },
      }
    );

  await redis.hset(
    `fx:videocall:admin:${userId}`,
    {
      adminMessageId:
        String(adminMessage.message_id),
      userId,
      username: user.username,
      name: user.fullName,
    }
  );

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await ctx.reply(
    `✅ ᴘʜᴏᴛᴏ ʀᴇᴄᴇɪᴠᴇᴅ.

ʏᴏᴜʀ ʀᴇQᴜᴇꜱᴛ ɪꜱ ɴᴏᴡ ᴜɴᴅᴇʀ ʀᴇᴠɪᴇᴡ.`,
    getMainKeyboard()
  );

  return true;
}

/* =========================================================
   VIDEOCALL ACCEPT
========================================================= */

async function approveVideocall(userId) {
  await redis.del(
    videocallKey(userId)
  );

  await bot.telegram.sendMessage(
    userId,
    `✅ ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇQᴜᴇꜱᴛ ᴡᴀꜱ ᴀᴘᴘʀᴏᴠᴇᴅ.

ᴄʜᴏᴏꜱᴇ ʏᴏᴜʀ ᴄᴀʟʟ ᴏᴘᴛɪᴏɴ:`,
    getVideocallKeyboard()
  );
}

/* =========================================================
   VIDEOCALL REJECT
========================================================= */

async function rejectVideocall(userId) {
  await redis.del(
    videocallKey(userId)
  );

  await bot.telegram.sendMessage(
    userId,
    `⏳ ɪ'ᴍ ᴄᴜʀʀᴇɴᴛʟʏ ʙᴜꜱʏ.

ɪ ᴍɪɢʜᴛ ᴍᴇꜱꜱᴀɢᴇ ʏᴏᴜ ʟᴀᴛᴇʀ ɪꜰ ᴛʜᴀᴛ'ꜱ ᴄᴏᴏʟ.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔔 ɴᴏᴛɪꜰʏ ᴍᴇ",
              callback_data:
                `notify_me_${userId}`,
            },
          ],
          [
            {
              text: "📺 ᴜꜱᴇʀ FX",
              url: USER_GROUP_LINK,
            },
          ],
        ],
      },
    }
  );
}

/* =========================================================
   VIDEOCALL 130 STARS
========================================================= */

async function sendVideocallInvoiceToUser(userId) {
  await bot.telegram.sendInvoice(
    userId,
    "VIDEOCALL ACCESS",
    "Private videocall access.",
    VIDEOCALL_PAYLOAD,
    "XTR",
    [
      {
        label: "VIDEOCALL",
        amount: VIDEOCALL_STARS,
      },
    ],
    {
      start_parameter:
        "fx_videocall",
    }
  );
}

/* =========================================================
   NOTIFY ME
========================================================= */

async function notifyMe(ctx, userId) {
  if (
    String(ctx.from?.id || "") !==
    String(userId)
  ) {
    await ctx.answerCbQuery(
      "This notification is not for you."
    );

    return;
  }

  await redis.set(
    notifyKey(userId),
    JSON.stringify({
      userId,
      createdAt: Date.now(),
      status: "waiting",
    }),
    "EX",
    60 * 60 * 24 * 30
  );

  await ctx.answerCbQuery(
    "Notification enabled."
  );

  await ctx.reply(
    `🔔 ᴅᴏɴᴇ.

ɪ'ʟʟ ᴋᴇᴇᴘ ʏᴏᴜʀ ʀᴇQᴜᴇꜱᴛ ᴏɴ ᴛʜᴇ ʟɪꜱᴛ.`,
    getMainKeyboard()
  );

  const user =
    getUserMeta(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `🔔 <b>NOTIFY REQUEST</b>

Name:
<b>${escapeHtml(user.fullName)}</b>

Username:
<b>${escapeHtml(user.username)}</b>

ID:
<code>${escapeHtml(user.id)}</code>`,
    {
      parse_mode: "HTML",
    }
  );
}

/* =========================================================
   SUCCESSFUL PAYMENT
========================================================= */

async function handleSuccessfulPayment(ctx) {
  const payment =
    ctx.message?.successful_payment;

  if (!payment) return;

  const userId =
    String(ctx.from?.id || "");

  if (!userId) return;

  const payload =
    payment.invoice_payload;

  /* -----------------------------------------
     VIDEOCALL
  ----------------------------------------- */

  if (
    payload ===
    VIDEOCALL_PAYLOAD
  ) {
    await redis.set(
      videocallKey(userId),
      JSON.stringify({
        userId,
        status: "paid",
        paidAt: Date.now(),
        chargeId:
          payment.telegram_payment_charge_id,
      }),
      "EX",
      60 * 30
    );

    await ctx.reply(
      `✅ 130 ⭐ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ.

ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇꜱꜱ ɪꜱ ʀᴇᴀᴅʏ.`,
      getVideocallKeyboard()
    );

    await bot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `⭐ <b>VIDEOCALL PAYMENT</b>

User:
<code>${escapeHtml(userId)}</code>

Amount:
<b>130 STARS</b>`,
      {
        parse_mode: "HTML",
      }
    );

    return;
  }

  /* -----------------------------------------
     ACCESS PLAN
  ----------------------------------------- */

  const planId =
    Object.keys(PLANS).find(
      (id) =>
        PLANS[id].payload === payload
    );

  if (!planId) {
    console.error(
      "Unknown payment payload:",
      payload
    );

    return;
  }

  /* -----------------------------------------
     DUPLICATE PAYMENT PROTECTION
  ----------------------------------------- */

  const chargeId =
    payment.telegram_payment_charge_id;

  if (!chargeId) {
    throw new Error(
      "Missing Telegram payment charge ID"
    );
  }

  const existingPayment =
    await redis.exists(
      paymentKey(chargeId)
    );

  if (existingPayment) {
    await ctx.reply(
      `ᴛʜɪꜱ ᴘᴀʏᴍᴇɴᴛ ᴡᴀꜱ ᴀʟʀᴇᴀᴅʏ ᴘʀᴏᴄᴇꜱꜱᴇᴅ.`,
      getMainKeyboard()
    );

    return;
  }

  const record =
    await createAccessCode({
      userId,
      planId,
      payment,
    });

  /* -----------------------------------------
     SEND CODE
  ----------------------------------------- */

  await ctx.reply(
    `✅ ᴘᴀʏᴍᴇɴᴛ ᴄᴏᴍᴘʟᴇᴛᴇ

${record.planName} ᴀᴄᴛɪᴠᴀᴛᴇᴅ.

🔐 ʏᴏᴜʀ ᴀᴄᴄᴇꜱꜱ ᴄᴏᴅᴇ:

<code>${record.code}</code>

⏳ ᴠᴀʟɪᴅ ᴜɴᴛɪʟ:
${new Date(
      record.expiresAt
    ).toUTCString()}

ᴜꜱᴇ ᴛʜɪꜱ ᴄᴏᴅᴇ ᴏɴ ᴛʜᴇ ᴜꜱᴇʀ FX ᴡᴇʙꜱɪᴛᴇ.`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🌐 ᴏᴘᴇɴ ᴜꜱᴇʀ FX",
              url: SITE_URL,
            },
          ],
        ],
      },
    }
  );

  /* -----------------------------------------
     ADMIN LOG
  ----------------------------------------- */

  const user =
    getUserMeta(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `💰 <b>NEW ACCESS PURCHASE</b>

Plan:
<b>${escapeHtml(record.planName)}</b>

Stars:
<b>${PLANS[planId].stars}</b>

Name:
<b>${escapeHtml(user.fullName)}</b>

Username:
<b>${escapeHtml(user.username)}</b>

Telegram ID:
<code>${escapeHtml(user.id)}</code>

Code:
<code>${escapeHtml(record.code)}</code>

Expires:
<b>${new Date(
      record.expiresAt
    ).toISOString()}</b>`,
    {
      parse_mode: "HTML",
    }
  );
}

/* =========================================================
   COMMANDS
========================================================= */

bot.start(async (ctx) => {
  await sendMainPanel(ctx);
});

bot.command("getcode", async (ctx) => {
  await sendGetCode(ctx);
});

bot.command("paysupport", async (ctx) => {
  await ctx.reply(
    `ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ

ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`
  );
});

/* =========================================================
   MAIN BUTTONS
========================================================= */

bot.hears(
  BTN_VIDEOCALL,
  openVideocallFlow
);

bot.hears(
  BTN_GET_CODE,
  sendGetCode
);

bot.hears(
  BTN_CHANNELS,
  async (ctx) => {
    await ctx.reply(
      `📺 ᴄʜᴀɴɴᴇʟꜱ

ᴄʜᴏᴏꜱᴇ ᴀ ᴄʜᴀɴɴᴇʟ:`,
      getChannelsKeyboard()
    );
  }
);

bot.hears(
  BTN_REFRESH,
  async (ctx) => {
    await ctx.reply(
      `↻ ꜱᴛᴀᴛᴜꜱ ʀᴇꜰʀᴇꜱʜᴇᴅ.`,
      getMainKeyboard()
    );
  }
);

/* =========================================================
   PLANS
========================================================= */

bot.hears(
  BTN_BASIC,
  sendBasicPanel
);

bot.hears(
  BTN_PRO,
  sendProPanel
);

bot.hears(
  BTN_VIP,
  sendVipPanel
);

bot.hears(
  BTN_PAY_BASIC,
  (ctx) =>
    sendPlanInvoice(
      ctx,
      "basic"
    )
);

bot.hears(
  BTN_PAY_PRO,
  (ctx) =>
    sendPlanInvoice(
      ctx,
      "pro"
    )
);

bot.hears(
  BTN_PAY_VIP,
  (ctx) =>
    sendPlanInvoice(
      ctx,
      "vip"
    )
);

/* =========================================================
   CHANNELS
========================================================= */

bot.hears(
  BTN_SMOKELANDIA,
  async (ctx) => {
    await ctx.reply(
      `☁️ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "☁️ ᴇɴᴛᴇʀ",
                url: SMOKELANDIA_GROUP_LINK,
              },
            ],
          ],
        },
      }
    );
  }
);

bot.hears(
  BTN_USERFX,
  async (ctx) => {
    await ctx.reply(
      `🜲 ᴜꜱᴇʀ FX`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🜲 ᴇɴᴛᴇʀ",
                url: USER_GROUP_LINK,
              },
            ],
          ],
        },
      }
    );
  }
);

/* =========================================================
   VIDEOCALL LINKS
========================================================= */

bot.hears(
  BTN_ZOOM,
  async (ctx) => {
    await ctx.reply(
      `📞 ᴢᴏᴏᴍ`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ",
                url: ZOOM_URL,
              },
            ],
          ],
        },
      }
    );
  }
);

bot.hears(
  BTN_TELEGRAM,
  async (ctx) => {
    await ctx.reply(
      `💬 ᴛᴇʟᴇɢʀᴀᴍ`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💬 ᴏᴘᴇɴ ᴄᴀʟʟ",
                url: TELEGRAM_CALL_URL,
              },
            ],
          ],
        },
      }
    );
  }
);

/* =========================================================
   BACK / CANCEL
========================================================= */

bot.hears(
  BTN_BACK,
  async (ctx) => {
    await redis.del(
      videocallKey(
        String(ctx.from?.id || "")
      )
    );

    await sendMainPanel(ctx);
  }
);

bot.hears(
  BTN_CANCEL,
  async (ctx) => {
    await redis.del(
      videocallKey(
        String(ctx.from?.id || "")
      )
    );

    await sendMainPanel(ctx);
  }
);

/* =========================================================
   ADMIN ACCEPT
========================================================= */

bot.action(
  /^vc_accept_(\d+)$/,
  async (ctx) => {
    const userId =
      String(ctx.match[1]);

    if (
      String(ctx.from?.id || "") !==
      String(ADMIN_CHAT_ID)
    ) {
      await ctx.answerCbQuery(
        "Not authorized."
      );

      return;
    }

    await ctx.answerCbQuery(
      "Accepted"
    );

    await approveVideocall(
      userId
    );

    try {
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [
            {
              text: "✅ ACCEPTED",
              callback_data:
                "noop",
            },
          ],
        ],
      });
    } catch {}
  }
);

/* =========================================================
   ADMIN REJECT
========================================================= */

bot.action(
  /^vc_reject_(\d+)$/,
  async (ctx) => {
    const userId =
      String(ctx.match[1]);

    if (
      String(ctx.from?.id || "") !==
      String(ADMIN_CHAT_ID)
    ) {
      await ctx.answerCbQuery(
        "Not authorized."
      );

      return;
    }

    await ctx.answerCbQuery(
      "Rejected"
    );

    await rejectVideocall(
      userId
    );

    try {
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [
            {
              text: "❌ REJECTED",
              callback_data:
                "noop",
            },
          ],
        ],
      });
    } catch {}
  }
);

/* =========================================================
   ADMIN 130 STARS
========================================================= */

bot.action(
  /^vc_pay_(\d+)$/,
  async (ctx) => {
    const userId =
      String(ctx.match[1]);

    if (
      String(ctx.from?.id || "") !==
      String(ADMIN_CHAT_ID)
    ) {
      await ctx.answerCbQuery(
        "Not authorized."
      );

      return;
    }

    await ctx.answerCbQuery(
      "Payment sent"
    );

    await sendVideocallInvoiceToUser(
      userId
    );
  }
);

/* =========================================================
   NOTIFY ME
========================================================= */

bot.action(
  /^notify_me_(\d+)$/,
  async (ctx) => {
    await notifyMe(
      ctx,
      String(ctx.match[1])
    );
  }
);

/* =========================================================
   PRE CHECKOUT
========================================================= */

bot.on(
  "pre_checkout_query",
  async (ctx) => {
    await ctx.answerPreCheckoutQuery(
      true
    );
  }
);

/* =========================================================
   PHOTO
========================================================= */

bot.on(
  "photo",
  async (ctx) => {
    await handleVideocallPhoto(ctx);
  }
);

/* =========================================================
   PAYMENT MESSAGE
========================================================= */

bot.on(
  "message",
  async (ctx, next) => {
    if (
      ctx.message?.successful_payment
    ) {
      await handleSuccessfulPayment(
        ctx
      );

      return;
    }

    await next();
  }
);

/* =========================================================
   UNKNOWN TEXT
========================================================= */

bot.on(
  "text",
  async (ctx) => {
    const text =
      String(
        ctx.message?.text || ""
      ).trim();

    if (
      text.startsWith("/")
    ) {
      return;
    }

    const userId =
      String(ctx.from?.id || "");

    const stateRaw =
      await redis.get(
        videocallKey(userId)
      );

    if (stateRaw) {
      const state =
        JSON.parse(stateRaw);

      if (
        state.status ===
        "waiting_photo"
      ) {
        await ctx.reply(
          `ʜᴏʟᴅ ᴜᴘ 😏

ɪ ɴᴇᴇᴅ ᴀ ᴘʜᴏᴛᴏ ꜰɪʀꜱᴛ.`
        );

        return;
      }
    }

    await sendMainPanel(ctx);
  }
);

/* =========================================================
   ERRORS
========================================================= */

bot.catch((error) => {
  console.error(
    "TELEGRAF ERROR:",
    error
  );
});

/* =========================================================
   WEBHOOK
========================================================= */

export default async function handler(
  req,
  res
) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "USER FX Telegram Bot",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    if (
      WEBHOOK_SECRET
    ) {
      const incomingSecret =
        req.headers[
          "x-telegram-bot-api-secret-token"
        ];

      if (
        incomingSecret !==
        WEBHOOK_SECRET
      ) {
        return res.status(401).json({
          ok: false,
          error: "unauthorized",
        });
      }
    }

    const update =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    if (!update) {
      return res.status(400).json({
        ok: false,
        error: "empty_update",
      });
    }

    await bot.handleUpdate(
      update
    );

    return res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "TELEGRAM HANDLER ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error: "handler_error",
      details: String(
        error?.message || error
      ),
    });
  }
}