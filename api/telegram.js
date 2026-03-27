import { Telegraf, Markup } from "telegraf";
import { Pool } from "pg";

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const WEBSITE_URL = "https://userfx-web.vercel.app";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

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
      ["💳 Membership"],
      ["🔐 Access", "🖥️ Channels"],
      ["🔄 Refresh"],
    ],
    { columns: 2 }
  ).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard([["📺", "🌩️"], ["📸", "🎁"], ["↩️"]]).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "↗ ENTER SITE", url: WEBSITE_URL }]],
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
  if (plan === "vipfx") return "👑 vipFX";
  if (plan === "userfx") return "🔷 userFX";
  return "Free";
}

function getLookupValue(from) {
  return from?.username || from?.first_name || null;
}

async function getUserFromDb(from) {
  const lookup = getLookupValue(from);

  if (!lookup) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE username = $1
         OR first_name = $1
      LIMIT 1
    `,
    [lookup]
  );

  return result.rows[0] || null;
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

async function sendMembershipPanel(ctx, user) {
  const active = isMembershipActive(user);
  const planLabel = active ? getPlanLabel(user.plan) : "Free";
  const statusLabel = user?.verificado ? "Verified" : "Unverified";
  const accessLabel = active ? "Active" : "Locked";
  const expiresLabel = active ? formatDate(user.membership_expires_at) : "No active membership";

  await ctx.reply(
    `☁️ <b>MEMBERSHIP</b>

Plan
<b>${planLabel}</b>

Status
<b>${statusLabel}</b>

Access
<b>${accessLabel}</b>

Expires
<b>${expiresLabel}</b>`,
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

Plan
<b>Free</b>

Status
<b>No active membership</b>

Use the website to unlock access.`,
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

Plan
<b>${getPlanLabel(user.plan)}</b>

Status
<b>Active</b>

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

async function sendRefreshPanel(ctx, user) {
  const active = isMembershipActive(user);
  const planLabel = active ? getPlanLabel(user.plan) : "Free";
  const statusLabel = user?.verificado ? "Verified" : "Unverified";
  const accessLabel = active ? "Active" : "Locked";
  const expiresLabel = active ? formatDate(user.membership_expires_at) : "No active membership";

  await ctx.reply(
    `🔄 <b>STATUS UPDATED</b>

Plan
<b>${planLabel}</b>

Status
<b>${statusLabel}</b>

Access
<b>${accessLabel}</b>

Expires
<b>${expiresLabel}</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx, user) {
  if (!isMembershipActive(user)) {
    await sendAccessPanel(ctx, user);
    return;
  }

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
  if (!isMembershipActive(user)) {
    await sendAccessPanel(ctx, user);
    return;
  }

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
  if (!isMembershipActive(user)) {
    await sendAccessPanel(ctx, user);
    return;
  }

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
  if (!isMembershipActive(user)) {
    await sendAccessPanel(ctx, user);
    return;
  }

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

bot.hears("💳 Membership", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendMembershipPanel(ctx, user);
});

bot.hears("🔐 Access", async (ctx) => {
  const user = await getUserFromDb(ctx.from);
  await sendAccessPanel(ctx, user);
});

bot.hears("🖥️ Channels", async (ctx) => {
  await sendChannelsPanel(ctx);
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

bot.hears("↩️", async (ctx) => {
  await sendMainPanel(ctx);
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const knownInputs = [
    "💳 Membership",
    "🔐 Access",
    "🖥️ Channels",
    "🔄 Refresh",
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
