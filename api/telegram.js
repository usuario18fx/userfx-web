import { Telegraf, Markup } from "telegraf";
import { Pool } from "pg";

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const WEBSITE_URL = "https://userfx-web.vercel.app";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!DATABASE_URL) throw new Error("Missing DATABASE_URL");

const bot = new Telegraf(BOT_TOKEN);

const pool =
  globalThis.__userfxTelegramPool ||
  new Pool({
    connectionString: DATABASE_URL,
    ssl:
      DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
  });

if (!globalThis.__userfxTelegramPool) {
  globalThis.__userfxTelegramPool = pool;
}

const BRAND = "𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄";

function getMainKeyboard() {
  return Markup.keyboard(
    [
      ["⏳ Status"],
      ["💳 Membership"],
      ["🔐 Access", "🖥️ Channels"],
      ["🔄 Refresh"],
    ],
    { columns: 2 }
  ).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard([["📺", "🌩️"], ["📸", "🎁"], ["↩️ [ BACK ]"]]).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "[ X/USER ]", url: WEBSITE_URL },
          { text: "[ V/VIP ]", url: WEBSITE_URL },
        ],
      ],
    },
  };
}

function formatDate(dateValue) {
  if (!dateValue) return "Not available";
  try {
    const date = new Date(dateValue);
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return String(dateValue);
  }
}

function isMembershipActive(user) {
  if (!user?.membership_expires_at) return false;
  return new Date(user.membership_expires_at).getTime() > Date.now();
}

function getPlanLabel(plan) {
  if (plan === "vipfx") return "V/VIP";
  if (plan === "userfx") return "X/USER";
  return "FREE";
}

function getUserMode(user) {
  return user?.plan === "vipfx" && isMembershipActive(user) ? "V/VIP" : "X/USER";
}

async function getUserFromDb(from) {
  const username = from?.username || null;
  if (!username) return null;

  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE username = $1
      LIMIT 1
    `,
    [username]
  );

  return result.rows[0] || null;
}

async function sendMainPanel(ctx, user = null) {
  const mode = getUserMode(user);

  await ctx.reply(
    `${BRAND}

<b>Exclusive access panel</b>

Mode
<b>${mode}</b>

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendStatusPanel(ctx, user) {
  const active = isMembershipActive(user);
  const mode = getUserMode(user);
  const expiresLabel = active
    ? formatDate(user.membership_expires_at)
    : "No active membership";

  await ctx.reply(
    `⏳ <b>STATUS</b>

Type
<b>${mode}</b>

Plan
<b>${active ? getPlanLabel(user.plan) : "FREE"}</b>

Access
<b>${active ? "OPEN" : "LOCKED"}</b>

Expires
<b>${expiresLabel}</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendMembershipPanel(ctx) {
  await ctx.reply(
    `💳 <b>MEMBERSHIP</b>

<b>[ X/USER ]</b>
8 days
Price: <b>$5 USD</b>

<b>[ V/VIP ]</b>
30 days
Price: <b>$15 USD</b>

Choose your access on the website.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendAccessPanel(ctx, user) {
  const active = isMembershipActive(user);

  if (!active) {
    await ctx.reply(
      `🔒 <b>ACCESS LOCKED</b>

Type
<b>X/USER</b>

No active membership found.

Go to the website and unlock access.`,
      {
        parse_mode: "HTML",
        ...getInlineWebsiteButton(),
      }
    );

    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  await ctx.reply(
    `🔓 <b>ACCESS OPEN</b>

Type
<b>${getUserMode(user)}</b>

Valid until
<b>${formatDate(user.membership_expires_at)}</b>

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsPanel(ctx, user) {
  await ctx.reply(
    `🖥️ <b>CHANNELS</b>

Type
<b>${getUserMode(user)}</b>

Private channel access
Exclusive drops
Locked sections
Direct website entry`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendRefreshPanel(ctx, user) {
  const active = isMembershipActive(user);

  await ctx.reply(
    `🔄 <b>STATUS UPDATED</b>

Type
<b>${getUserMode(user)}</b>

Plan
<b>${active ? getPlanLabel(user.plan) : "FREE"}</b>

Access
<b>${active ? "OPEN" : "LOCKED"}</b>

Expires
<b>${active ? formatDate(user.membership_expires_at) : "No active membership"}</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx, user) {
  if (!isMembershipActive(user)) return sendAccessPanel(ctx, user);

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

async function sendVideoCloudsMessage(ctx, user) {
  if (!isMembershipActive(user)) return sendAccessPanel(ctx, user);

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

async function sendPhotosMessage(ctx, user) {
  if (!isMembershipActive(user)) return sendAccessPanel(ctx, user);

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

async function sendGiftsMessage(ctx, user) {
  if (!isMembershipActive(user)) return sendAccessPanel(ctx, user);

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

bot.start(async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendMainPanel(ctx, user);
});

bot.command("help", async (ctx) => {
  const user = await getUserFromDb(ctx.from);

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
  await sendMainPanel(ctx, user);
});

bot.hears("⏳ Status", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendStatusPanel(ctx, user);
});

bot.hears("💳 Membership", async (ctx) => {
  await sendMembershipPanel(ctx);
});

bot.hears("🔐 Access", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendAccessPanel(ctx, user);
});

bot.hears("🖥️ Channels", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendChannelsPanel(ctx, user);
});

bot.hears("🔄 Refresh", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendRefreshPanel(ctx, user);
});

bot.hears("📺", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendFeedMessage(ctx, user);
});

bot.hears("🌩️", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendVideoCloudsMessage(ctx, user);
});

bot.hears("📸", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendPhotosMessage(ctx, user);
});

bot.hears("🎁", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendGiftsMessage(ctx, user);
});

bot.hears("↩️ [ BACK ]", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendMainPanel(ctx, user);
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const knownInputs = [
    "⏳ Status",
    "💳 Membership",
    "🔐 Access",
    "🖥️ Channels",
    "🔄 Refresh",
    "📺",
    "🌩️",
    "📸",
    "🎁",
    "↩️ [ BACK ]",
    "/start",
    "/help",
  ];

  if (knownInputs.includes(text)) return;

  const user = await getUserFromDb(ctx.from);
  await sendMainPanel(ctx, user);
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