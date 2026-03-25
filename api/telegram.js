import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBSITE_URL = process.env.WEBSITE_URL || "https://userfx-nzr5594a7-user-fxs-projects.vercel.app";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

const bot = new Telegraf(BOT_TOKEN);

const BRAND = "𝐔𝐬𝐞𝐫 Ŧҳ 🜲";

function getMainKeyboard() {
  return Markup.keyboard([["💳"], ["🔐", "🖥️"], ["🔄"]]).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard([["📺", "🌩️"], ["📸", "🎁"], ["↩️"]]).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🜲", url: WEBSITE_URL }]],
    },
  };
}

async function sendMainPanel(ctx) {
  await ctx.reply(
    `${BRAND}

Main panel:`,
    getMainKeyboard()
  );
}

async function sendMembershipPanel(ctx) {
  await ctx.reply(
    `☁️ <b>FX Memberships</b>

Current plan: <b>⚪ userFX</b>
Verified: <b>Yes</b>
Membership active: <b>Yes</b>
Expires: <b>Mar 25, 2026, 08:13 a.m.</b>

Main panel:`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendAccessPanel(ctx) {
  await ctx.reply(
    `🔓 <b>Access unlocked</b>

Active plan: <b>⚪ userFX</b>
Expires: <b>Mar 25, 2026, 08:13 a.m.</b>

Choose an option:`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `🖥️ <b>Channels</b>

Open channels and site access from here.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendRefreshPanel(ctx) {
  await ctx.reply(
    `🔄 <b>Status refreshed</b>

Current plan: <b>⚪ userFX</b>
Membership active: <b>Yes</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx) {
  await ctx.reply(
    `📺 <b>Feed</b>

Public updates, previews, and featured drops.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendVideoCloudsMessage(ctx) {
  await ctx.reply(
    `🌩️ <b>VideoClouds</b>

Cloud access section enabled.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  await ctx.reply(
    `📸 <b>Photos</b>

Unlocked preview section.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  await ctx.reply(
    `🎁 <b>Gifts</b>

Support section enabled.`,
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

Available commands:
/start
/help`,
    getMainKeyboard()
  );
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
