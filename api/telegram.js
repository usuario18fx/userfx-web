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

let schemaPromise = null;

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

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          telegram_id BIGINT NOT NULL UNIQUE,
          username TEXT,
          first_name TEXT,
          plan TEXT NOT NULL DEFAULT 'free',
          verificado BOOLEAN NOT NULL DEFAULT FALSE,
          membership_started_at TIMESTAMPTZ,
          membership_expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_telegram_id
        ON users(telegram_id);
      `);
    })();
  }

  return schemaPromise;
}

async function upsertTelegramUser(telegramUser, client = pool) {
  const telegramId = telegramUser?.id;
  const username = telegramUser?.username || null;
  const firstName = telegramUser?.first_name || null;

  if (!telegramId) {
    throw new Error("Missing telegram user id");
  }

  const result = await client.query(
    `
      INSERT INTO users (telegram_id, username, first_name, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (telegram_id)
      DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        updated_at = NOW()
      RETURNING *;
    `,
    [telegramId, username, firstName]
  );

  return result.rows[0];
}

async function getUserByTelegramId(telegramId, client = pool) {
  const result = await client.query(
    `
      SELECT *
      FROM users
      WHERE telegram_id = $1
      LIMIT 1;
    `,
    [telegramId]
  );

  return result.rows[0] || null;
}

async function getFreshUser(ctx) {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  return getUserByTelegramId(ctx.from.id);
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
  const user = await getFreshUser(ctx);
  await sendMainPanel(ctx, user);
});

bot.command("help", async (ctx) => {
  await getFreshUser(ctx);

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
  const user = await getFreshUser(ctx);
  await sendMembershipPanel(ctx, user);
});

bot.hears("🔐 Access", async (ctx) => {
  const user = await getFreshUser(ctx);
  await sendAccessPanel(ctx, user);
});

bot.hears("🖥️ Channels", async (ctx) => {
  await getFreshUser(ctx);
  await sendChannelsPanel(ctx);
});

bot.hears("🔄 Refresh", async (ctx) => {
  const user = await getFreshUser(ctx);
  await sendRefreshPanel(ctx, user);
});

bot.hears("📺", async (ctx) => {
  const user = await getFreshUser(ctx);
  await sendFeedMessage(ctx, user);
});

bot.hears("🌩️", async (ctx) => {
  const user = await getFreshUser(ctx);
  await sendVideoCloudsMessage(ctx, user);
});

bot.hears("📸", async (ctx) => {
  const user = await getFreshUser(ctx);
  await sendPhotosMessage(ctx, user);
});

bot.hears("🎁", async (ctx) => {
  const user = await getFreshUser(ctx);
  await sendGiftsMessage(ctx, user);
});

bot.hears("↩️", async (ctx) => {
  await getFreshUser(ctx);
  await sendMainPanel(ctx);
});

bot.on("text", async (ctx) => {
  await getFreshUser(ctx);

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
    await ensureSchema();

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
