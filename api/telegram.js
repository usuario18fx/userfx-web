import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBSITE_URL = "https://userfx-web.vercel.app";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

const bot = new Telegraf(BOT_TOKEN);

const BRAND = "𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄";
const PLAN_NAME = "🔷 userFX";
const EXPIRES_AT = "Mar 25, 2026 · 08:13 a.m.";
const STATUS = "Verified";
const ACCESS_STATE = "Active";

/* =========================
   KEYBOARDS
========================= */

function getMainKeyboard() {
  return Markup.keyboard(
    [
      ["💳 Membership", "⭐ Stars"],
      ["🔐 Access", "🖥️ Channels"],
      ["💬 Contact", "🔄 Refresh"],
    ],
    { columns: 2 }
  ).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard(
    [
      ["📺 Feed", "🌩️ VideoClouds"],
      ["📸 Photos", "🎁 Gifts"],
      ["↩️ Back"],
    ],
    { columns: 2 }
  ).resize();
}

function getMainInlineKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("💳 Membership", "membership"),
      Markup.button.callback("⭐ Stars", "stars"),
    ],
    [
      Markup.button.callback("🔐 Access", "access"),
      Markup.button.callback("🖥️ Channels", "channels"),
    ],
    [
      Markup.button.webApp("🌐 Open Website", WEBSITE_URL),
    ],
    [
      Markup.button.callback("💬 Contact", "contact"),
      Markup.button.callback("🔄 Refresh", "refresh"),
    ],
  ]);
}

function getAccessInlineKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📺 Feed", "feed"),
      Markup.button.callback("🌩️ VideoClouds", "videoclouds"),
    ],
    [
      Markup.button.callback("📸 Photos", "photos"),
      Markup.button.callback("🎁 Gifts", "gifts"),
    ],
    [
      Markup.button.webApp("🌐 Enter Site", WEBSITE_URL),
    ],
    [
      Markup.button.callback("↩️ Back", "main"),
    ],
  ]);
}

function getChannelsInlineKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("🌐 Website", WEBSITE_URL)],
    [Markup.button.callback("↩️ Back", "main")],
  ]);
}

function getContactInlineKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.url("💬 Contact Support", "https://t.me/User18fx")],
    [Markup.button.callback("↩️ Back", "main")],
  ]);
}

/* =========================
   SAFE SEND HELPERS
========================= */

async function replyWithMenu(ctx, text, extra = {}) {
  await ctx.reply(text, {
    parse_mode: "HTML",
    ...extra,
  });
}

async function editOrReply(ctx, text, extra = {}) {
  const payload = {
    parse_mode: "HTML",
    ...extra,
  };

  try {
    if (ctx.callbackQuery?.message) {
      await ctx.editMessageText(text, payload);
      return;
    }
  } catch (error) {
    console.error("EDIT MESSAGE FALLBACK:", error);
  }

  await ctx.reply(text, payload);
}

/* =========================
   PANELS
========================= */

async function sendMainPanel(ctx) {
  const text = `${BRAND}

<b>Exclusive access panel</b>

Premium content, private sections, and direct entry.

Choose a section below.`;

  await editOrReply(ctx, text, getMainInlineKeyboard());
  await ctx.reply("‎", getMainKeyboard());
}

async function sendMembershipPanel(ctx) {
  const text = `💳 <b>MEMBERSHIP</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${STATUS}</b>

Access
<b>${ACCESS_STATE}</b>

Expires
<b>${EXPIRES_AT}</b>

Your membership is currently active.`;

  await editOrReply(ctx, text, Markup.inlineKeyboard([
    [
      Markup.button.callback("⭐ Buy Stars", "stars"),
      Markup.button.callback("🔄 Refresh", "refresh"),
    ],
    [
      Markup.button.webApp("🌐 Open Website", WEBSITE_URL),
    ],
    [
      Markup.button.callback("↩️ Back", "main"),
    ],
  ]));
  await ctx.reply("‎", getMainKeyboard());
}

async function sendStarsPanel(ctx) {
  const text = `⭐ <b>STARS</b>

Telegram Stars section.

Here you can later connect:
• buy stars
• sell stars
• wallet
• premium upgrades

Right now this is the visual entry panel.`;

  await editOrReply(ctx, text, Markup.inlineKeyboard([
    [
      Markup.button.callback("💳 Membership", "membership"),
      Markup.button.callback("🔄 Refresh", "refresh"),
    ],
    [
      Markup.button.webApp("🌐 Open Website", WEBSITE_URL),
    ],
    [
      Markup.button.callback("↩️ Back", "main"),
    ],
  ]));
  await ctx.reply("‎", getMainKeyboard());
}

async function sendAccessPanel(ctx) {
  const text = `🔐 <b>ACCESS OPEN</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${ACCESS_STATE}</b>

Valid until
<b>${EXPIRES_AT}</b>

Choose a section below.`;

  await editOrReply(ctx, text, getAccessInlineKeyboard());
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsPanel(ctx) {
  const text = `🖥️ <b>CHANNELS</b>

Private channel access
Exclusive drops
Locked sections
Direct website entry

Use the button below to enter.`;

  await editOrReply(ctx, text, getChannelsInlineKeyboard());
  await ctx.reply("‎", getMainKeyboard());
}

async function sendRefreshPanel(ctx) {
  const text = `🔄 <b>STATUS UPDATED</b>

Plan
<b>${PLAN_NAME}</b>

Status
<b>${STATUS}</b>

Access
<b>${ACCESS_STATE}</b>

Expires
<b>${EXPIRES_AT}</b>`;

  await editOrReply(ctx, text, getMainInlineKeyboard());
  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx) {
  const text = `📺 <b>FEED</b>

Selected drops
Public previews
Featured content`;

  await editOrReply(ctx, text, getAccessInlineKeyboard());
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendVideoCloudsMessage(ctx) {
  const text = `🌩️ <b>VIDEOCLOUDS</b>

Ambient room
Visual session
Cloud access enabled`;

  await editOrReply(ctx, text, getAccessInlineKeyboard());
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  const text = `📸 <b>PHOTOS</b>

Unlocked visual section
Private gallery access`;

  await editOrReply(ctx, text, getAccessInlineKeyboard());
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  const text = `🎁 <b>GIFTS</b>

Support section
Transfer section
Additional access support`;

  await editOrReply(ctx, text, getAccessInlineKeyboard());
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendContactPanel(ctx) {
  const text = `💬 <b>CONTACT</b>

Direct support available.

Tap the button below to open the chat.`;

  await editOrReply(ctx, text, getContactInlineKeyboard());
  await ctx.reply("‎", getMainKeyboard());
}

/* =========================
   START / COMMANDS
========================= */

bot.start(async (ctx) => {
  await sendMainPanel(ctx);
});

bot.command("help", async (ctx) => {
  await replyWithMenu(
    ctx,
    `${BRAND}

<b>Available commands</b>

/start
/help`,
    getMainInlineKeyboard()
  );

  await ctx.reply("‎", getMainKeyboard());
});

/* =========================
   TEXT BUTTONS
========================= */

bot.hears("💳 Membership", async (ctx) => {
  await sendMembershipPanel(ctx);
});

bot.hears("⭐ Stars", async (ctx) => {
  await sendStarsPanel(ctx);
});

bot.hears("🔐 Access", async (ctx) => {
  await sendAccessPanel(ctx);
});

bot.hears("🖥️ Channels", async (ctx) => {
  await sendChannelsPanel(ctx);
});

bot.hears("💬 Contact", async (ctx) => {
  await sendContactPanel(ctx);
});

bot.hears("🔄 Refresh", async (ctx) => {
  await sendRefreshPanel(ctx);
});

bot.hears("📺 Feed", async (ctx) => {
  await sendFeedMessage(ctx);
});

bot.hears("🌩️ VideoClouds", async (ctx) => {
  await sendVideoCloudsMessage(ctx);
});

bot.hears("📸 Photos", async (ctx) => {
  await sendPhotosMessage(ctx);
});

bot.hears("🎁 Gifts", async (ctx) => {
  await sendGiftsMessage(ctx);
});

bot.hears("↩️ Back", async (ctx) => {
  await sendMainPanel(ctx);
});

/* =========================
   INLINE CALLBACKS
========================= */

bot.action("main", async (ctx) => {
  await ctx.answerCbQuery();
  await sendMainPanel(ctx);
});

bot.action("membership", async (ctx) => {
  await ctx.answerCbQuery();
  await sendMembershipPanel(ctx);
});

bot.action("stars", async (ctx) => {
  await ctx.answerCbQuery();
  await sendStarsPanel(ctx);
});

bot.action("access", async (ctx) => {
  await ctx.answerCbQuery();
  await sendAccessPanel(ctx);
});

bot.action("channels", async (ctx) => {
  await ctx.answerCbQuery();
  await sendChannelsPanel(ctx);
});

bot.action("contact", async (ctx) => {
  await ctx.answerCbQuery();
  await sendContactPanel(ctx);
});

bot.action("refresh", async (ctx) => {
  await ctx.answerCbQuery("Updated");
  await sendRefreshPanel(ctx);
});

bot.action("feed", async (ctx) => {
  await ctx.answerCbQuery();
  await sendFeedMessage(ctx);
});

bot.action("videoclouds", async (ctx) => {
  await ctx.answerCbQuery();
  await sendVideoCloudsMessage(ctx);
});

bot.action("photos", async (ctx) => {
  await ctx.answerCbQuery();
  await sendPhotosMessage(ctx);
});

bot.action("gifts", async (ctx) => {
  await ctx.answerCbQuery();
  await sendGiftsMessage(ctx);
});

/* =========================
   FALLBACK
========================= */

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();

  const knownInputs = [
    "💳 Membership",
    "⭐ Stars",
    "🔐 Access",
    "🖥️ Channels",
    "💬 Contact",
    "🔄 Refresh",
    "📺 Feed",
    "🌩️ VideoClouds",
    "📸 Photos",
    "🎁 Gifts",
    "↩️ Back",
    "/start",
    "/help",
  ];

  if (knownInputs.includes(text)) return;

  await sendMainPanel(ctx);
});

bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
});

/* =========================
   VERCEL HANDLER
========================= */

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
