import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

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

const bot = new Telegraf(BOT_TOKEN);
bot.telegram.webhookReply = false;

const memberships = globalThis.__fxMemberships || new Map();
if (!globalThis.__fxMemberships) {
  globalThis.__fxMemberships = memberships;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
      status: "Inactive",
      planKey: "user",
    };
  }

  if (membership.planKey === "vip") {
    return {
      label: "[V-vip]",
      price: "$12",
      status: "Active",
      planKey: "vip",
    };
  }

  return {
    label: "[X-user]",
    price: "$3",
    status: "Active",
    planKey: "user",
  };
}

function mainKeyboard() {
  return Markup.keyboard([
    [BTN_USER, BTN_VIP],
    [BTN_VIDEOCALL, BTN_CHANNELS],
    [BTN_WEBSITE, BTN_REFRESH],
  ]).resize();
}

function accessKeyboard() {
  return Markup.keyboard([
    [BTN_FEED, BTN_CLOUDS],
    [BTN_PHOTOS, BTN_GIFTS],
    [BTN_BACK, BTN_EXIT],
  ]).resize();
}

function simpleKeyboard() {
  return Markup.keyboard([[BTN_EXIT]]).resize();
}

function websiteInlineKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("🌐 OPEN WEBSITE", WEBSITE_URL)],
  ]);
}

function videoInlineKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.url("📞 ENTER ZOOM", ZOOM_URL),
      Markup.button.url("💬 OPEN TELEGRAM", TELEGRAM_CALL_URL),
    ],
    [Markup.button.url("🌐 WEBSITE", WEBSITE_URL)],
  ]);
}

function channelsInlineKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.url("ᴜꜱᴇʀ🜲Ŧҳ", USER_BOT_URL),
      Markup.button.url("ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ", SMOKELANDIA_BOT_URL),
    ],
    [
      Markup.button.url("👥 USER GROUP", USER_GROUP_LINK),
      Markup.button.url("🔥 SMOKELANDIA GROUP", SMOKELANDIA_GROUP_LINK),
    ],
  ]);
}

function userPaymentKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("⭐ 300 XTR", "buy_user_stars")],
  ]);
}

function vipPaymentKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("⭐ 1200 XTR", "buy_vip_stars"),
      Markup.button.url("💬 CONTACT", CONTACT_URL),
    ],
  ]);
}

function welcomeText() {
  return `
<b>•╦————————————╦•</b>
<b>ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ🜲</b>
🧩 <i>features ilimit</i>
📲 <i>new pics every week</i>
📹 <i>access to video-chat</i>
🔥 <i>enjoy it ..</i>
<b>•╩————————————╩•</b>
`.trim();
}

function userCard(userId) {
  const plan = getPlanDisplay(userId);

  return `
<b>•╦————————————╦•</b>
<b>ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲</b>
<b>👑 ${escapeHtml(plan.label)}</b>
⇀ <i>price $3</i>
⇀ <i>status ${escapeHtml(plan.planKey === "user" ? plan.status : "Inactive")}</i>
⇀ <i>premium access enabled</i>
<b>•╩————————————╩•</b>
`.trim();
}

function vipCard(userId) {
  const plan = getPlanDisplay(userId);

  return `
<b>•╦————————————╦•</b>
<b>ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲</b>
<b>🔥 [V-vip]</b>
⇀ <i>price $12</i>
⇀ <i>status ${escapeHtml(plan.planKey === "vip" ? plan.status : "Inactive")}</i>
⇀ <i>access unlimited</i>
<b>•╩————————————╩•</b>
`.trim();
}

async function sendHtml(ctx, text, extra = {}) {
  return ctx.reply(text, {
    parse_mode: "HTML",
    ...extra,
  });
}

async function notifyAdmin(ctx, title) {
  const requester = getRequesterData(ctx.from);

  const text = `
<b>${escapeHtml(title)}</b>
<b>Name:</b> ${escapeHtml(requester.fullName)}
<b>Username:</b> ${escapeHtml(requester.username)}
<b>ID:</b> <code>${escapeHtml(requester.id)}</code>
`.trim();

  return bot.telegram.sendMessage(ADMIN_CHAT_ID, text, {
    parse_mode: "HTML",
  });
}

async function sendMainMenu(ctx) {
  await sendHtml(ctx, welcomeText(), mainKeyboard());
}

bot.start(async (ctx) => {
  await sendMainMenu(ctx);
});

bot.hears(BTN_USER, async (ctx) => {
  await sendHtml(ctx, userCard(ctx.from.id), userPaymentKeyboard());
});

bot.hears(BTN_VIP, async (ctx) => {
  await sendHtml(ctx, vipCard(ctx.from.id), vipPaymentKeyboard());
});

bot.hears(BTN_VIDEOCALL, async (ctx) => {
  await notifyAdmin(ctx, "📞 Video call request");
  await sendHtml(
    ctx,
    "<b>📞 VIDEOCALL</b>\n<i>Choose how you want to connect.</i>",
    videoInlineKeyboard()
  );
});

bot.hears(BTN_CHANNELS, async (ctx) => {
  await sendHtml(
    ctx,
    "<b>📺 CHANNELS</b>\n<i>Select one of the available channels or groups.</i>",
    channelsInlineKeyboard()
  );
});

bot.hears(BTN_WEBSITE, async (ctx) => {
  await sendHtml(
    ctx,
    "<b>🌐 WEBSITE</b>\n<i>Open the official website using the button below.</i>",
    websiteInlineKeyboard()
  );
});

bot.hears(BTN_REFRESH, async (ctx) => {
  await sendMainMenu(ctx);
});

bot.hears(BTN_FEED, async (ctx) => {
  await sendHtml(ctx, "<b>📋 FEED</b>", simpleKeyboard());
});

bot.hears(BTN_CLOUDS, async (ctx) => {
  await sendHtml(ctx, "<b>☁️ CLOUDS</b>", simpleKeyboard());
});

bot.hears(BTN_PHOTOS, async (ctx) => {
  await sendHtml(ctx, "<b>📸 PHOTOS</b>", simpleKeyboard());
});

bot.hears(BTN_GIFTS, async (ctx) => {
  await sendHtml(ctx, "<b>🎁 GIFTS</b>", simpleKeyboard());
});

bot.hears(BTN_BACK, async (ctx) => {
  await sendHtml(ctx, "<b>↩️ ACCESS PANEL</b>", accessKeyboard());
});

bot.hears(BTN_EXIT, async (ctx) => {
  await sendMainMenu(ctx);
});

bot.action("buy_user_stars", async (ctx) => {
  await ctx.answerCbQuery();
  setMembership(ctx.from.id, "user");
  await notifyAdmin(ctx, "🧾 User purchase");
  await sendHtml(ctx, userCard(ctx.from.id), accessKeyboard());
});

bot.action("buy_vip_stars", async (ctx) => {
  await ctx.answerCbQuery();
  setMembership(ctx.from.id, "vip");
  await notifyAdmin(ctx, "🧾 VIP purchase");
  await sendHtml(ctx, vipCard(ctx.from.id), accessKeyboard());
});

bot.on("message", async (ctx, next) => {
  const incomingText = ctx.message?.text;

  if (incomingText === "👑 [X-user]") return next();
  if (incomingText === "🔥 [V-vip]") return next();
  if (incomingText === "📞 VIDEOCALL") return next();
  if (incomingText === "📺") return next();
  if (incomingText === "🌐 WEBSITE") return next();
  if (incomingText === "↺") return next();
  if (incomingText === "📋") return next();
  if (incomingText === "☁️") return next();
  if (incomingText === "📸") return next();
  if (incomingText === "🎁") return next();
  if (incomingText === "←") return next();
  if (incomingText === "⏎") return next();

  await sendHtml(
    ctx,
    `<b>DEBUG</b>\n<code>${escapeHtml(String(incomingText || "no-text"))}</code>`,
    mainKeyboard()
  );
});

bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("TELEGRAM HANDLER ERROR:", error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
