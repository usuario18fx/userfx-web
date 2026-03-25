import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBSITE_URL =
  process.env.WEBSITE_URL || "https://userfx-6ln9hopv9-user-fxs-projects.vercel.app";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

const bot = new Telegraf(BOT_TOKEN);

const BRAND = "𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄";
const PLAN_NAME = "⚪ userFX";
const EXPIRES_AT = "Mar 25, 2026 · 08:13 a.m.";

function getMainKeyboard() {
  return Markup.keyboard([["💳"], ["🔐", "🖥️"], ["🔄"]]).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard([["📺", "🌩️"], ["📸", "🎁"], ["↩️"]]).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "↗ ENTER", url: WEBSITE_URL }]],
    },
  };
}

async function sendMainPanel(ctx) {
  await ctx.reply(
    `${BRAND}

<b>Exclusive access panel</b>

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
<b>Verified</b>

Access
<b>Active</b>

Expires
<b>${EXPIRES_AT}</b>`,
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

Valid until
<b>${EXPIRES_AT}</b>

Select a room.`,
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

Private spaces, drops, and direct access.`,
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

Access
<b>Active</b>`,
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

Drops, previews, and selected content.`,
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

Ambient room access enabled.`,
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

Unlocked visual section.`,
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

Support and transfer section.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

bot.start(async (ctx) => {
  await sendMainPanel(ctx);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `${BRAND}

<b>Available commands</b>

/start
/help`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.hears("💳", async (ctx) => {
  await sendMembershipPanel(ctx);
});

bot.hears("🔐", async (ctx) => {
  await sendAccessPanel(ctx);
});

bot.hears("🖥️", async (ctx) => {
  await sendChannelsPanel(ctx);
});

bot.hears("🔄", async (ctx) => {
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

bot.hears("↩️", async (ctx) => {
  await sendMainPanel(ctx);
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();

  const knownInputs = [
    "💳",
    "🔐",
    "🖥️",
    "🔄",
    "📺",
    "🌩️",
    "📸",
    "🎁",
    "↩️",
    "/start",
    "/help",
  ];

  if (knownInputs.includes(text)) return;

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
