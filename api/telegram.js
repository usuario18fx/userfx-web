import fs from "fs";
import path from "path";
import { Pool } from "pg";
import { Telegraf, Markup, Input } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

if (!BOT_TOKEN) { 
  throw new Error("Missing BOT_TOKEN");
}

if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const bot = new Telegraf(BOT_TOKEN);

const WEBSITE_URL = process.env.WEBSITE_URL || "https://userfx-web.vercel.app";
const VIP_CHANNEL_URL =
  process.env.VIP_CHANNEL_URL || "https://t.me/+HpfTil4YbSA5NjJh";
const SMOKELANDIA_CHANNEL_URL =
  process.env.SMOKELANDIA_CHANNEL_URL || "https://t.me/+E4X5V3IlygxhMGQx";
const PAYPAL_URL = process.env.PAYPAL_URL || "https://paypal.me/UsuarioFX";
const ZOOM_URL =
  process.env.ZOOM_URL || "https://us05web.zoom.us/j/9010970018?pwd=TU_LINK_REAL";
const BRAND = "𝐔𝐬𝐞𝐫 Ŧҳ 🜲";
const VIDEO_PATH = path.join(process.cwd(), "assets", "smkl-video01.mp4");

const MEMBERSHIPS = {
  userfx: {
    key: "userfx",
    title: "🔷 userFX",
    days: 8,
    priceUsd: 5,
    starsAmount: 500,
    label: "userFX · 8 days · $5",
    codePrefix: "FX-USERFX-",
    displayName: "userFX",
  },
  vipfx: {
    key: "vipfx",
    title: "👑 vipFX",
    days: 30,
    priceUsd: 15,
    starsAmount: 1500,
    label: "vipFX · 30 days · $15",
    codePrefix: "FX-VIPFX-",
    displayName: "vipFX",
  },
};

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

let schemaPromise = null;

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

function getInlineWebsiteAndStarsButtons(planKey = "vipfx") {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🜲", url: WEBSITE_URL }],
        [{ text: "⭐", callback_data: `pay_stars:${planKey}` }],
      ],
    },
  };
}

function getMembershipsInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔷", callback_data: "membership:userfx" }],
        [{ text: "👑", callback_data: "membership:vipfx" }],
        [{ text: "🜲", url: WEBSITE_URL }],
      ],
    },
  };
}

function getChannelsInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "👑", url: VIP_CHANNEL_URL }],
        [{ text: "☁️", url: SMOKELANDIA_CHANNEL_URL }],
        [{ text: "🜲", url: WEBSITE_URL }],
      ],
    },
  };
}

function formatDate(dateValue) {
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
    return String(dateValue || "");
  }
}

function getCodeLast4(fullCode = "") {
  return fullCode.slice(-4).toUpperCase();
}

function isMembershipActive(user) {
  if (!user?.membership_expires_at) return false;
  return new Date(user.membership_expires_at).getTime() > Date.now();
}

function randomChunk(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateAccessCode(planKey) {
  const plan = MEMBERSHIPS[planKey];
  return `${plan.codePrefix}${randomChunk(6)}`;
}

function getPlanFromPayload(payload = "") {
  const parts = String(payload).split(":");
  const planKey = parts[1];
  if (planKey === "userfx" || planKey === "vipfx") return planKey;
  return null;
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
        CREATE TABLE IF NOT EXISTS access_codes (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          code TEXT NOT NULL UNIQUE,
          plan TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          telegram_payment_charge_id TEXT NOT NULL UNIQUE,
          provider_payment_charge_id TEXT,
          invoice_payload TEXT NOT NULL,
          plan TEXT NOT NULL,
          currency TEXT NOT NULL,
          total_amount BIGINT NOT NULL,
          raw_payment JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);`
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_access_codes_user_id ON access_codes(user_id);`
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);`
      );
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

async function ensureTelegramId(telegramId, client = pool) {
  await client.query(
    `
      INSERT INTO users (telegram_id, updated_at)
      VALUES ($1, NOW())
      ON CONFLICT (telegram_id)
      DO UPDATE SET updated_at = NOW();
    `,
    [telegramId]
  );
}

async function getFreshUserRecord(telegramId, client = pool) {
  await ensureTelegramId(telegramId, client);

  const result = await client.query(
    `
      SELECT
        u.*,
        ac.code AS access_code
      FROM users u
      LEFT JOIN LATERAL (
        SELECT code
        FROM access_codes
        WHERE user_id = u.id
        ORDER BY created_at DESC
        LIMIT 1
      ) ac ON TRUE
      WHERE u.telegram_id = $1
      LIMIT 1;
    `,
    [telegramId]
  );

  return result.rows[0] || null;
}

async function activateMembership({ telegramUser, planKey, payment }) {
  const plan = MEMBERSHIPS[planKey];
  if (!plan) {
    throw new Error(`Invalid membership plan: ${planKey}`);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user = await upsertTelegramUser(telegramUser, client);

    const existingPayment = await client.query(
      `
        SELECT id
        FROM payments
        WHERE telegram_payment_charge_id = $1
        LIMIT 1;
      `,
      [payment.telegram_payment_charge_id]
    );

    if (existingPayment.rowCount > 0) {
      await client.query("COMMIT");
      return getFreshUserRecord(telegramUser.id);
    }

    const lockedUserResult = await client.query(
      `
        SELECT *
        FROM users
        WHERE id = $1
        FOR UPDATE;
      `,
      [user.id]
    );

    const lockedUser = lockedUserResult.rows[0];
    const now = new Date();
    const currentExpiry = lockedUser.membership_expires_at
      ? new Date(lockedUser.membership_expires_at)
      : null;

    const baseDate =
      currentExpiry && currentExpiry.getTime() > now.getTime()
        ? currentExpiry
        : now;

    const expiresAt = new Date(baseDate.getTime());
    expiresAt.setUTCDate(expiresAt.getUTCDate() + plan.days);

    let accessCode = generateAccessCode(planKey);
    let attempts = 0;

    while (attempts < 5) {
      const codeCheck = await client.query(
        `SELECT id FROM access_codes WHERE code = $1 LIMIT 1;`,
        [accessCode]
      );

      if (codeCheck.rowCount === 0) break;

      accessCode = generateAccessCode(planKey);
      attempts += 1;
    }

    await client.query(
      `
        UPDATE users
        SET
          username = $2,
          first_name = $3,
          plan = $4,
          verificado = TRUE,
          membership_started_at = NOW(),
          membership_expires_at = $5,
          updated_at = NOW()
        WHERE id = $1;
      `,
      [
        user.id,
        telegramUser?.username || null,
        telegramUser?.first_name || null,
        planKey,
        expiresAt.toISOString(),
      ]
    );

    await client.query(
      `
        INSERT INTO access_codes (user_id, code, plan, expires_at)
        VALUES ($1, $2, $3, $4);
      `,
      [user.id, accessCode, planKey, expiresAt.toISOString()]
    );

    await client.query(
      `
        INSERT INTO payments (
          user_id,
          telegram_payment_charge_id,
          provider_payment_charge_id,
          invoice_payload,
          plan,
          currency,
          total_amount,
          raw_payment
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb);
      `,
      [
        user.id,
        payment.telegram_payment_charge_id,
        payment.provider_payment_charge_id || null,
        payment.invoice_payload,
        planKey,
        payment.currency,
        payment.total_amount,
        JSON.stringify(payment),
      ]
    );

    await client.query("COMMIT");

    return getFreshUserRecord(telegramUser.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function sendMainPanel(ctx) {
  await ctx.reply(
    `${BRAND}

Main panel:`,
    getMainKeyboard()
  );
}

async function sendAccessPanel(ctx, user) {
  await ctx.reply(
    `🔓 <b>Access unlocked</b>

Active plan: <b>${user.plan === "vipfx" ? "👑 vipFX" : "⚪ userFX"}</b>
Expires: <b>${formatDate(user.membership_expires_at)}</b>

Choose an option:`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendMembershipStatus(ctx, user) {
  const fullCode = user?.access_code || "No active code yet";
  const last4 = fullCode === "No active code yet" ? "----" : getCodeLast4(fullCode);

  await ctx.reply(
    `${BRAND}

ℹ️ <b>Your ${user.plan === "vipfx" ? "vipFX" : "userFX"} membership is active.</b>
Expires: <b>${formatDate(user.membership_expires_at)}</b>

Full code:
${fullCode}

Last 4 characters:
<b>${last4}</b>

On the website, the first part is already filled in.

You only need to enter:
<b>${last4}</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendMembershipOptions(ctx) {
  await ctx.reply(
    `${BRAND}

Access to Feed, VideoClouds, unlocked Photos, and Gifts.

Pick a membership:`,
    getMembershipsInlineKeyboard()
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
    `☁️ <b>VideoClouds</b>

A chill spot to get ready, settle in, and be set to smoke with me.`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "☁️", url: ZOOM_URL }],
          [{ text: "🜲", url: WEBSITE_URL }],
        ],
      },
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  await ctx.reply(
    `📸 <b>Unlocked Photos</b>

Your photos won’t stay blocked anymore. With an active membership, you’ll be able to view them on my website.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  await ctx.reply(
    `🎁 <b>Gifts & transfers</b>

Send support here.`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💸", url: PAYPAL_URL }],
          [{ text: "🜲", url: WEBSITE_URL }],
          [{ text: "⭐", callback_data: "pay_stars:vipfx" }],
        ],
      },
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsMessage(ctx) {
  await ctx.reply(
    `${BRAND}

╭─────────────── crown ───────────────╮

👑 <b>ROOM | Ŧҳ VIP</b>
One page.
One video.
Exclusive content.
Private drops.
VIP access.

☁️ <b>SmokeLandia</b>
One page.
One video.
Ambient content.
Exclusive space.
Website-linked access.

╰─────────────────────────────────────╯

/channels`,
    {
      parse_mode: "HTML",
      ...getChannelsInlineKeyboard(),
    }
  );

  try {
    if (fs.existsSync(VIDEO_PATH)) {
      await ctx.replyWithVideo(Input.fromLocalFile(VIDEO_PATH), {
        caption: `${BRAND}

Channel preview.`,
        ...getInlineWebsiteButton(),
      });
    } else {
      await ctx.reply(
        `${BRAND}

Preview video pending.`,
        getInlineWebsiteButton()
      );
    }
  } catch (error) {
    console.error("VIDEO ERROR:", error);
    await ctx.reply(
      `${BRAND}

Preview video pending.`,
      getInlineWebsiteButton()
    );
  }

  await ctx.reply("‎", getMainKeyboard());
}

async function handleProtectedAccess(ctx, telegramId, type) {
  const user = await getFreshUserRecord(telegramId);

  if (!isMembershipActive(user) || user.plan === "free") {
    await ctx.reply(
      `🔒 <b>Access locked</b>

You need an active membership to use this option.`,
      {
        parse_mode: "HTML",
        ...getInlineWebsiteAndStarsButtons("vipfx"),
      }
    );

    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  if (type === "feed") {
    await sendFeedMessage(ctx);
    return;
  }

  if (type === "videoclouds") {
    await sendVideoCloudsMessage(ctx);
    return;
  }

  if (type === "photos") {
    await sendPhotosMessage(ctx);
    return;
  }

  if (type === "gifts") {
    await sendGiftsMessage(ctx);
  }
}

async function sendTelegramStarsInvoice(ctx, planKey) {
  const plan = MEMBERSHIPS[planKey];
  if (!plan) return;

  const telegramId = ctx.from?.id || "unknown";
  const payload = `membership:${planKey}:${telegramId}:${Date.now()}`;

  await ctx.replyWithInvoice({
    title: `${plan.title} membership`,
    description: "Access to exclusive content.",
    payload,
    currency: "XTR",
    prices: [{ label: plan.label, amount: plan.starsAmount }],
    start_parameter: `buy-${planKey}-${telegramId}`,
  });
}

bot.start(async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await sendMainPanel(ctx);
});

bot.command("channels", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await sendChannelsMessage(ctx);
});

bot.command("memberships", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await sendMembershipOptions(ctx);
});

bot.command("help", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);

  await ctx.reply(
    `${BRAND}

Available commands:
/start
/channels
/memberships`,
    getMainKeyboard()
  );
});

bot.hears("💳", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);

  const user = await getFreshUserRecord(ctx.from.id);

  if (isMembershipActive(user) && user.plan !== "free") {
    await sendMembershipStatus(ctx, user);
    return;
  }

  await sendMembershipOptions(ctx);
});

bot.hears("🔐", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);

  const user = await getFreshUserRecord(ctx.from.id);

  if (!isMembershipActive(user) || user.plan === "free") {
    await ctx.reply(
      `🔒 <b>Access locked</b>

You need an active membership to use this option.`,
      {
        parse_mode: "HTML",
        ...getInlineWebsiteAndStarsButtons("vipfx"),
      }
    );

    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  await sendAccessPanel(ctx, user);
});

bot.hears("🖥️", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await sendChannelsMessage(ctx);
});

bot.hears("🔄", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);

  const user = await getFreshUserRecord(ctx.from.id);

  if (isMembershipActive(user) && user.plan !== "free") {
    await sendMembershipStatus(ctx, user);
    return;
  }

  await ctx.reply(
    `${BRAND}

No active membership found.`,
    getInlineWebsiteAndStarsButtons("vipfx")
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.hears("📺", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await handleProtectedAccess(ctx, ctx.from.id, "feed");
});

bot.hears("🌩️", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await handleProtectedAccess(ctx, ctx.from.id, "videoclouds");
});

bot.hears("📸", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await handleProtectedAccess(ctx, ctx.from.id, "photos");
});

bot.hears("🎁", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await handleProtectedAccess(ctx, ctx.from.id, "gifts");
});

bot.hears("↩️", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await sendMainPanel(ctx);
});

bot.action("membership:userfx", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await ctx.answerCbQuery();
  await sendTelegramStarsInvoice(ctx, "userfx");
});

bot.action("membership:vipfx", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await ctx.answerCbQuery();
  await sendTelegramStarsInvoice(ctx, "vipfx");
});

bot.action("pay_stars:userfx", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await ctx.answerCbQuery();
  await sendTelegramStarsInvoice(ctx, "userfx");
});

bot.action("pay_stars:vipfx", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);
  await ctx.answerCbQuery();
  await sendTelegramStarsInvoice(ctx, "vipfx");
});

bot.on("pre_checkout_query", async (ctx) => {
  console.log("PRE CHECKOUT:", ctx.update.pre_checkout_query);
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("successful_payment", async (ctx) => {
  await ensureSchema();

  const payment = ctx.message?.successful_payment;
  const telegramUser = ctx.from;

  if (!payment || !telegramUser) {
    return;
  }

  console.log("SUCCESSFUL PAYMENT:", payment);

  const planKey = getPlanFromPayload(payment.invoice_payload);

  if (!planKey) {
    await ctx.reply(
      `${BRAND}

Payment received, but plan could not be identified.

Contact support.`,
      getInlineWebsiteButton()
    );
    await ctx.reply("‎", getMainKeyboard());
    return;
  }

  const user = await activateMembership({
    telegramUser,
    planKey,
    payment,
  });

  const fullCode = user.access_code;
  const last4 = getCodeLast4(fullCode);

  await ctx.reply(
    `${BRAND}

✅ <b>Payment received.</b>

Plan: <b>${MEMBERSHIPS[planKey].displayName}</b>
Currency: <b>${payment.currency}</b>
Total: <b>${payment.total_amount}</b>
Expires: <b>${formatDate(user.membership_expires_at)}</b>

Full code:
${fullCode}

Last 4 characters:
<b>${last4}</b>

On the website, the first part is already filled in.

You only need to enter:
<b>${last4}</b>`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.on("text", async (ctx) => {
  await ensureSchema();
  await upsertTelegramUser(ctx.from);

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
    "/channels",
    "/memberships",
    "/help",
  ];

export default async function handler(req, res) {
  console.log("METHOD:", req.method);

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
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
