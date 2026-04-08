import { Telegraf, Markup, Input } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const CONTACT_URL = "https://t.me/User18fx";
const TELEGRAM_CALL_URL = "https://t.me/User18fx";

const USER_BOT_URL = "https://t.me/User18fxbot?start=userchannel";
const SMOKELANDIA_BOT_URL =
  "https://t.me/Smokelandiabot?start=smokelandiachannel";

const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+E4X5V3IlygxhMGQx";

/* BOTONES SIMPLES Y ESTABLES */
const BTN_USER = "👑 [X-user]";
const BTN_VIP = "🔥 [V-vip]";
const BTN_VIDEOCALL = "📞 VIDEOCALL";
const BTN_CHANNELS = "📺";
const BTN_WEBSITE = "🌐 WEBSITE";
const BTN_REFRESH = "↺";
const BTN_FEED = "📋";
const BTN_CLOUDS = "☁️";
const BTN_PHOTOS = "📸";
const BTN_GIFTS = "🎁";
const BTN_BACK = "←";
const BTN_EXIT = "⏎";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);

const pendingVideoRequests = globalThis.__fxPendingVideoRequests || new Map();
if (!globalThis.__fxPendingVideoRequests) {
  globalThis.__fxPendingVideoRequests = pendingVideoRequests;
}

const memberships = globalThis.__fxMemberships || new Map();
if (!globalThis.__fxMemberships) {
  globalThis.__fxMemberships = memberships;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getRequesterData(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "No name";
  const username = from?.username ? `@${from.username}` : "sin_username";
  const id = String(from?.id || "");
  return { fullName, username, id };
}

function getMembership(userId) {
  const current = memberships.get(String(userId));
  if (!current) return null;

  if (current.expiresAt && Date.now() > current.expiresAt) {
    memberships.delete(String(userId));
    return null;
  }

  return current;
}

function setMembership(userId, planKey) {
  const now = Date.now();
  const expiresAt =
    planKey === "vip"
      ? now + 30 * 24 * 60 * 60 * 1000
      : now + 3 * 24 * 60 * 60 * 1000;

  const membership = { planKey, expiresAt, paidAt: now };
  memberships.set(String(userId), membership);
  return membership;
}

function getPlanDisplay(userId) {
  const membership = getMembership(userId);

  if (!membership) {
    return {
      label: "[X-user]",
      price: "$3",
      access: "Premium",
      status: "Inactive",
      emoji: "👑",
      planKey: "user",
    };
  }

  if (membership.planKey === "vip") {
    return {
      label: "[V-vip]",
      price: "$12",
      access: "Unlimited",
      status: "Active",
      emoji: "🔥",
      planKey: "vip",
    };
  }

  return {
    label: "[X-user]",
    price: "$3",
    access: "Premium",
    status: "Active",
    emoji: "👑",
    planKey: "user",
  };
}

function getMainKeyboard() {
  return Markup.keyboard(
    [
      [BTN_USER, BTN_VIP],
      [BTN_VIDEOCALL, BTN_CHANNELS],
      [BTN_WEBSITE, BTN_REFRESH],
    ],
    { columns: 2 }
  ).resize();
}

function getBackKeyboard() {
  return Markup.keyboard([[BTN_EXIT]]).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard(
    [
      [BTN_FEED, BTN_CLOUDS],
      [BTN_PHOTOS, BTN_GIFTS],
      [BTN_BACK],
    ],
    { columns: 2 }
  ).resize();
}

function getWebsiteInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🌐 OPEN WEBSITE", url: WEBSITE_URL }]],
    },
  };
}

function getVideoCallKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📞 ENTER ZOOM", url: ZOOM_URL },
          { text: "💬 OPEN TELEGRAM", url: TELEGRAM_CALL_URL },
        ],
        [{ text: "🌐 WEBSITE", url: WEBSITE_URL }],
      ],
    },
  };
}

function getChannelsInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "ᴜꜱᴇʀ🜲Ŧҳ", url: USER_BOT_URL },
          { text: "ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ", url: SMOKELANDIA_BOT_URL },
        ],
      ],
    },
  };
}

function getUserPaymentInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "⭐ 300 XTR", callback_data: "buy_user_stars" }]],
    },
  };
}

function getVipPaymentInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "⭐ 1200 XTR", callback_data: "buy_vip_stars" },
          { text: "💬", url: CONTACT_URL },
        ],
      ],
    },
  };
}

function buildWelcomeCaption() {
  return `•╦————————————╦•
 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ🜲
🧩ꜰᴇᴀᴛᴜʀᴇꜱ ɪʟɪᴍɪᴛ
📲ɴᴇᴡ ᴘɪᴄꜱ ᴇᴠᴇʀʏ ᴡᴇᴇᴋ
📹ᴀᴄᴄᴇꜱꜱ ᴛᴏ ᴠɪᴅᴇᴏ-ᴄʜᴀᴛ
🔥ᴇɴᴊᴏʏ ɪᴛ ..
•╩————————————╩•`;
}

function buildUserCard(userId) {
  const plan = getPlanDisplay(userId);
  return `•╦————————————╦•
  ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
👑 ${plan.label}
⇀ ᴘʀɪᴄᴇ $3 
⇀ ꜱᴛᴀᴛᴜꜱ  ${plan.planKey === "user" ? plan.status : "Inactive"}
⇀ ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴇɴᴀʙʟᴇᴅ.
•╩————————————╩•`;
}

function buildVipCard(userId) {
  const plan = getPlanDisplay(userId);
  return `•╦————————————╦•
ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
🔥 [V-vip]
⇀ ᴘʀɪᴄᴇ   $12
⇀ ꜱᴛᴀᴛᴜꜱ  ${plan.planKey === "vip" ? plan.status : "Inactive"}
⇀ ᴀᴄᴄᴇꜱꜱ ᴜɴʟɪᴍɪᴛᴇᴅ
•╩————————————╩•`;
}

async function sendMainMenu(ctx) {
  await ctx.reply(buildWelcomeCaption(), getMainKeyboard());
}

bot.start(async (ctx) => {
  await sendMainMenu(ctx);
});

bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("TELEGRAM HANDLER ERROR:", error);
    return res.status(500).json({ ok: false });
  }
}
