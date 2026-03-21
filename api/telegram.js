import "dotenv/config";
import pg from "pg";
import { Bot, InlineKeyboard, Keyboard, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
const providerToken = process.env.TELEGRAM_PROVIDER_TOKEN || "";

if (!token) {
  throw new Error("Missing BOT_TOKEN in environment variables");
}

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in environment variables");
}

const { Pool } = pg;

const db = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const bot = new Bot(token);

/* =========================
   KEYBOARDS
========================= */

function getMainKeyboard() {
  return new Keyboard()
    .text("💳 View Memberships")
    .row()
    .text("🔒 Access")
    .text("🖥 Channels")
    .row()
    .text("🔄 Refresh Status")
    .resized()
    .persistent();
}

function getAccessKeyboard() {
  return new Keyboard()
    .text("📺 Feed")
    .text("🌩 VideoClouds")
    .row()
    .text("📸 Photos")
    .text("🎁 Gifts")
    .row()
    .text("⬅️ Back")
    .resized()
    .persistent();
}

/* =========================
   INLINE MENUS
========================= */

function getPlansMenu() {
  return new InlineKeyboard()
    .text("⚪ userFX · 8 days · $5", "buy_plan_userfx")
    .row()
    .text("👑 vipFX · 30 days · $15", "buy_plan_vipfx")
    .row()
    .text("⬅️ Back", "back_to_main");
}

function getChannelsMenu() {
  return new InlineKeyboard()
    .text("👑 Room | Ŧҳ VIP 🜲", "channel_fxvip")
    .row()
    .text("☁️ SmokeLandia", "channel_smokelandia")
    .row()
    .text("⬅️ Back", "back_to_main");
}

/* =========================
   HELPERS
========================= */

function resolvePlan(planType) {
  if (planType === "buy_plan_vipfx") {
    return {
      planName: "vipfx",
      priceUsd: 15,
      label: "vipFX",
      durationDays: 30,
      codePrefix: "FX-VIP01-",
      title: "vipFX Membership",
      description: "30 days access to Feed, VideoClouds, unlocked Photos, and Gifts.",
      amountCents: 1500,
      payload: "membership_vipfx_30d",
    };
  }

  return {
    planName: "userfx",
    priceUsd: 5,
    label: "userFX",
    durationDays: 8,
    codePrefix: "FX-USER01-",
    title: "userFX Membership",
    description: "8 days access to Feed, VideoClouds, unlocked Photos, and Gifts.",
    amountCents: 500,
    payload: "membership_userfx_8d",
  };
}

function planTypeFromPayload(payload) {
  if (payload === "membership_vipfx_30d") return "buy_plan_vipfx";
  return "buy_plan_userfx";
}

function randomSuffix(length = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function generateAccessCode(planType) {
  const { codePrefix } = resolvePlan(planType);
  const suffix = randomSuffix(4);

  return {
    code: `${codePrefix}${suffix}`,
    prefix: codePrefix,
    suffix,
  };
}

function normalizeAccessCodeRow(row) {
  if (!row) return null;

  const code = row.code ?? "";
  const prefix =
    row.code_prefix ??
    (code && code.length > 4 ? code.slice(0, -4) : "");
  const suffix =
    row.code_suffix ??
    (code && code.length >= 4 ? code.slice(-4) : "");

  return {
    code,
    code_prefix: prefix,
    code_suffix: suffix,
    expires_at: row.expires_at ?? null,
  };
}

function formatPlanLabel(plan) {
  switch (plan) {
    case "vipfx":
      return "👑 vipFX";
    case "userfx":
      return "⚪ userFX";
    default:
      return "🆓 FREE";
  }
}

function isMembershipActive(user) {
  if (!user?.membership_expires_at) return false;
  return new Date(user.membership_expires_at).getTime() > Date.now();
}

function formatExpiry(dateValue) {
  if (!dateValue) return "Not set";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function ensureUser(userId, username) {
  await db.query(
    `
    insert into users (user_id, username)
    values ($1, $2)
    on conflict (user_id)
    do update set
      username = excluded.username,
      updated_at = now()
    `,
    [userId, username]
  );
}

async function getUserRecord(userId) {
  const result = await db.query(
    `
    select
      plan,
      verificado,
      membership_started_at,
      membership_expires_at
    from users
    where user_id = $1
    limit 1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return {
      plan: "free",
      verificado: false,
      membership_started_at: null,
      membership_expires_at: null,
    };
  }

  return {
    plan: result.rows[0].plan ?? "free",
    verificado: result.rows[0].verificado ?? false,
    membership_started_at: result.rows[0].membership_started_at ?? null,
    membership_expires_at: result.rows[0].membership_expires_at ?? null,
  };
}

async function expireMembershipIfNeeded(userId) {
  const user = await getUserRecord(userId);

  if (
    user.plan !== "free" &&
    user.membership_expires_at &&
    new Date(user.membership_expires_at).getTime() <= Date.now()
  ) {
    await db.query(
      `
      update users
      set plan = 'free',
          verificado = false,
          updated_at = now()
      where user_id = $1
      `,
      [userId]
    );
  }
}

async function getFreshUserRecord(userId) {
  await expireMembershipIfNeeded(userId);
  return getUserRecord(userId);
}

async function getLatestAccessCode(userId, planName) {
  const result = await db.query(
    `
    select code, code_prefix, code_suffix, expires_at
    from access_codes
    where user_id = $1 and plan = $2
    order by created_at desc
    limit 1
    `,
    [userId, planName]
  );

  if (result.rowCount === 0) return null;
  return normalizeAccessCodeRow(result.rows[0]);
}

/* =========================
   RENDERERS
========================= */

async function renderMainMenu(ctx, userId, mode = "reply") {
  const user = await getFreshUserRecord(userId);
  const active = isMembershipActive(user);

  const text =
    `☁️ <b>FX Memberships</b>\n\n` +
    `Current plan: <b>${formatPlanLabel(user.plan)}</b>\n` +
    `Verified: <b>${user.verificado ? "Yes" : "No"}</b>\n` +
    `Membership active: <b>${active ? "Yes" : "No"}</b>\n` +
    `Expires: <b>${formatExpiry(user.membership_expires_at)}</b>\n\n` +
    `Main panel:`;

  if (mode === "edit") {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
    });
    return;
  }

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: getMainKeyboard(),
  });
}

async function renderPlansMenu(ctx, userId, mode = "edit") {
  const user = await getFreshUserRecord(userId);

  const text =
    `⭐️ <b>FX Memberships</b>\n\n` +
    `Current plan: <b>${formatPlanLabel(user.plan)}</b>\n` +
    `Expires: <b>${formatExpiry(user.membership_ex
