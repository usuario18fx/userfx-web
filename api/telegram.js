import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);

const BRAND = "𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄";
const PLAN_NAME = "🔷 userFX";
const EXPIRES_AT = "Mar 25, 2026 · 08:13 a.m.";
const STATUS = "Verified";
const ACCESS_STATE = "Active";

const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests || new Map();

if (!globalThis.__fxPendingVideoRequests) {
  globalThis.__fxPendingVideoRequests = pendingVideoRequests;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getMainKeyboard() {
  return Markup.keyboard(
    [
      ["💳 Membership"],
      ["🔐 Access", "🖥️ Channels"],
      ["🔄 Refresh"],
    ],
    { columns: 2 }
  ).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard(
    [
      ["📺", "🌩️"],
      ["📸", "📞 Videollamada"],
      ["🎁", "↩️"],
    ],
    { columns: 2 }
  ).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "↗ ENTER SITE", url: WEBSITE_URL }]],
    },
  };
}

function getInlineZoomButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "📹 ENTER ZOOM", url: ZOOM_URL }]],
    },
  };
}

function getRequesterData(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "No name";
  const username = from?.username ? `@${from.username}` : "sin_username";
  const id = String(from?.id || "");

  return { fullName, username, id };
}

async function notifyAdminNewRequest(ctx) {
  const requester = getRequesterData(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📞 <b>Nueva solicitud de videollamada</b>

Nombre: <b>${escapeHtml(requester.fullName)}</b>
Usuario: <b>${escapeHtml(requester.username)}</b>
ID: <code>${escapeHtml(requester.id)}</code>`,
    { parse_mode: "HTML" }
  );
}

async function notifyAdminPhotosReceived(ctx) {
  const requester = getRequesterData(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📷 <b>Fotos recibidas</b>

Nombre: <b>${escapeHtml(requester.fullName)}</b>
Usuario: <b>${escapeHtml(requester.username)}</b>
ID: <code>${escapeHtml(requester.id)}</code>`,
    { parse_mode: "HTML" }
  );
}

async function sendMainPanel(ctx) {
  await ctx.reply(
    `${BRAND}

<b>Exclusive access panel</b>

Premium content, private sections, and direct entry.

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendMembershipPanel(ctx) {
  await ctx.reply(
    `☁️ <b>MEMBERSHIP</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${STATUS}</b>

Access
<b>${ACCESS_STATE}</b>

Expires
<b>${EXPIRES_AT}</b>

Your membership is currently active.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendAccessPanel(ctx) {
  await ctx.reply(
    `🔓 <b>ACCESS OPEN</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${ACCESS_STATE}</b>

Valid until
<b>${EXPIRES_AT}</b>

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `🖥️ <b>CHANNELS</b>

Private channel access
Exclusive drops
Locked sections
Direct website entry

Use the button below to enter.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendRefreshPanel(ctx) {
  await ctx.reply(
    `🔄 <b>STATUS UPDATED</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${STATUS}</b>

Access
<b>${ACCESS_STATE}</b>

Expires
<b>${EXPIRES_AT}</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx) {
  await ctx.reply(
    `📺 <b>FEED</b>

Selected drops
Public previews
Featured content`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendVideoCloudsMessage(ctx) {
  await ctx.reply(
    `🌩️ <b>VIDEOCLOUDS</b>

Ambient room
Visual session
Cloud access enabled`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  await ctx.reply(
    `📸 <b>PHOTOS</b>

Unlocked visual section
Private gallery access`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  await ctx.reply(
    `🎁 <b>GIFTS</b>

Support section
Transfer section
Additional access support`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function startVideoCallFlow(ctx) {
  const userId = String(ctx.from?.id || "");

  if (!userId) {
    await ctx.reply("Unable to identify your account.");
    return;
  }

  pendingVideoRequests.set(userId, {
    waitingForPhotos: true,
    createdAt: Date.now(),
  });

  await notifyAdminNewRequest(ctx);

  await ctx.reply(
    `📹 <b>Videocall request received</b>

Send your photos to continue.

After your photos arrive, the Zoom link will be unlocked.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

bot.start(async (ctx) => {
  const payload = (ctx.startPayload || "").trim();

  if (payload === "videocall") {
    await startVideoCallFlow(ctx);
    return;
  }

  await sendMainPanel(ctx);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `${BRAND}

<b>Available commands</b>

/start
/help
/videocall`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.command("videocall", async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.hears("💳 Membership", async (ctx) => {
  await sendMembershipPanel(ctx);
});

bot.hears("🔐 Access", async (ctx) => {
  await sendAccessPanel(ctx);
});

bot.hears("🖥️ Channels", async (ctx) => {
  await sendChannelsPanel(ctx);
});

bot.hears("🔄 Refresh", async (ctx) => {
  await sendRefreshPanel(ctx);
});

bot.hears("📺", async (ctx) => {
  await sendFeedMessage(ctx);
});

bot.hears("🌩️", async (ctx) => {
  await sendVideoCloudsMessage(ctx);
});

bot.hears("📸", async (ctx) => {
  await sendPhotosMessage(ctx);
});

bot.hears("🎁", async (ctx) => {
  await sendGiftsMessage(ctx);
});

bot.hears("📞 Videollamada", async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.hears("↩️", async (ctx) => {
  await sendMainPanel(ctx);
});

bot.on("photo", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForPhotos) return;

  await notifyAdminPhotosReceived(ctx);

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  pendingVideoRequests.delete(userId);

  await ctx.reply(
    `✅ <b>Photos received</b>

Continue to the Zoom room below.`,
    {
      parse_mode: "HTML",
      ...getInlineZoomButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  const knownInputs = [
    "💳 Membership",
    "🔐 Access",
    "🖥️ Channels",
    "🔄 Refresh",
    "📺",
    "🌩️",
    "📸",
    "🎁",
    "📞 Videollamada",
    "↩️",
    "/start",
    "/help",
    "/videocall",
  ];

  if (knownInputs.includes(text)) return;

  if (pending?.waitingForPhotos) {
    await ctx.reply("Send at least one photo to continue.");
    return;
  }

  await sendMainPanel(ctx);
});

bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      method: req.method,
      message: "Telegram endpoint alive",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      method: req.method,
    });
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("TELEGRAM HANDLER ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: "handler_error",
      details: String(error?.message || error),
    });
  }
}