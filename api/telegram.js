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
    .text("🔓 Access")
    .text("📺 Channels")
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
    `Expires: <b>${formatExpiry(user.membership_expires_at)}</b>\n\n` +
    `⚪ <b>userFX</b>\n` +
    `Duration: <b>8 days</b>\n` +
    `Access to Feed, VideoClouds, unlocked Photos, and Gifts.\n\n` +
    `👑 <b>vipFX</b>\n` +
    `Duration: <b>30 days</b>\n` +
    `Access to Feed, VideoClouds, unlocked Photos, and Gifts.\n\n` +
    `Pick a membership:`;

  if (mode === "edit") {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: getPlansMenu(),
    });
    return;
  }

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: getPlansMenu(),
  });
}

async function renderChannelsMenu(ctx, mode = "reply") {
  const text =
    `╔══════ -🜲 - ══════╗\n\n` +
    `👑  <b>ʀᴏᴏᴍ | •Ŧҳ ᴠɪᴘ 🜲</b>\n` +
    `•             $12.00\n` +
    `•     ᴇxᴄʟᴜꜱɪᴠᴇ ᴄᴏɴᴛᴇɴᴛ\n\n` +
    `☁️       <b>𝐒ᴍᴏᴋᴇ𝐋ᴀɴᴅɪᴀ</b>\n` +
    `•               $10.00\n` +
    `•             ᴇxᴄʟᴜꜱɪᴠᴇ\n` +
    `╚═══════════════╝\n\n` +
    `⌦ <code>/channels</code>`;

  if (mode === "edit") {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
      reply_markup: getChannelsMenu(),
    });
    return;
  }

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: getChannelsMenu(),
  });
}

async function renderAccessMenu(ctx, userId, mode = "reply") {
  const user = await getFreshUserRecord(userId);

  if (!isMembershipActive(user) || user.plan === "free") {
    const text =
      `🔒 <b>Access locked</b>\n\n` +
      `You need an active membership to unlock this content.\n` +
      `Open <b>View Memberships</b> and activate your access.`;

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
    return;
  }

  const text =
    `🔓 <b>Access unlocked</b>\n\n` +
    `Active plan: <b>${formatPlanLabel(user.plan)}</b>\n` +
    `Expires: <b>${formatExpiry(user.membership_expires_at)}</b>\n\n` +
    `Choose an option:`;

  if (mode === "edit") {
    await ctx.editMessageText(text, {
      parse_mode: "HTML",
    });
    return;
  }

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: getAccessKeyboard(),
  });
}

/* =========================
   ACCESS CODE MESSAGES
========================= */

async function replyWithExistingCode(ctx, label, expiresAt, accessRow) {
  const row = normalizeAccessCodeRow(accessRow);

  if (!row) {
    await ctx.reply("❌ No access code found.");
    return;
  }

  await ctx.reply(
    `ℹ️ Your <b>${label}</b> membership is already active.\n` +
      `Expires: <b>${formatExpiry(expiresAt)}</b>\n\n` +
      `Full code:\n<code>${row.code}</code>\n\n` +
      `Last 4 characters:\n<code>${row.code_suffix}</code>\n\n` +
      `On the website, the first part is already filled in.\n` +
      `You only need to enter:\n<code>${row.code_suffix}</code>`,
    { parse_mode: "HTML" }
  );
}

async function replyWithNewCode(ctx, label, durationDays, expiresAt, generated) {
  await ctx.reply(
    `🔥 <b>Membership activated</b>\n\n` +
      `Plan: <b>${label}</b>\n` +
      `Duration: <b>${durationDays} days</b>\n` +
      `Expires: <b>${formatExpiry(expiresAt)}</b>\n\n` +
      `Full code:\n<code>${generated.code}</code>\n\n` +
      `Last 4 characters:\n<code>${generated.suffix}</code>\n\n` +
      `On the website, the first part is already filled in.\n` +
      `You only need to enter:\n<code>${generated.suffix}</code>`,
    { parse_mode: "HTML" }
  );
}

/* =========================
   BUSINESS LOGIC
========================= */

async function activateMembership(ctx, planType) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  const { planName, label, durationDays } = resolvePlan(planType);

  await db.query("BEGIN");

  try {
    const membershipResult = await db.query(
      `
      update users
      set plan = $1,
          verificado = true,
          membership_started_at = now(),
          membership_expires_at = now() + ($2 || ' days')::interval,
          updated_at = now()
      where user_id = $3
      returning membership_expires_at
      `,
      [planName, String(durationDays), userId]
    );

    if (membershipResult.rowCount === 0) {
      await db.query("ROLLBACK");
      await ctx.reply("❌ User not found in the database.");
      return;
    }

    const generated = generateAccessCode(planType);

    await db.query(
      `
      insert into access_codes (
        user_id,
        code,
        code_prefix,
        code_suffix,
        plan,
        expires_at
      )
      values ($1, $2, $3, $4, $5, $6)
      `,
      [
        userId,
        generated.code,
        generated.prefix,
        generated.suffix,
        planName,
        membershipResult.rows[0].membership_expires_at,
      ]
    );

    await db.query(
      `
      insert into logs (user_id, action)
      values ($1, $2)
      `,
      [userId, `PURCHASE_${planName.toUpperCase()}`]
    );

    await db.query("COMMIT");

    await replyWithNewCode(
      ctx,
      label,
      durationDays,
      membershipResult.rows[0].membership_expires_at,
      generated
    );

    await renderAccessMenu(ctx, userId, "reply");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("Activation error:", error);
    await ctx.reply("❌ Something went wrong while activating your membership.");
  }
}

async function handleSubscription(ctx, planType) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  const current = await getFreshUserRecord(userId);
  const plan = resolvePlan(planType);

  try {
    if (current.plan === plan.planName && isMembershipActive(current)) {
      let existingCode = await getLatestAccessCode(userId, plan.planName);

      if (!existingCode) {
        const generated = generateAccessCode(planType);

        await db.query(
          `
          insert into access_codes (
            user_id,
            code,
            code_prefix,
            code_suffix,
            plan,
            expires_at
          )
          values ($1, $2, $3, $4, $5, $6)
          `,
          [
            userId,
            generated.code,
            generated.prefix,
            generated.suffix,
            plan.planName,
            current.membership_expires_at,
          ]
        );

        existingCode = {
          code: generated.code,
          code_prefix: generated.prefix,
          code_suffix: generated.suffix,
          expires_at: current.membership_expires_at,
        };
      }

      await replyWithExistingCode(
        ctx,
        plan.label,
        current.membership_expires_at,
        existingCode
      );
      return;
    }

    if (providerToken) {
      await ctx.replyWithInvoice(
        plan.title,
        plan.description,
        plan.payload,
        providerToken,
        "USD",
        [{ label: plan.label, amount: plan.amountCents }]
      );
      return;
    }

    await ctx.reply(
      `🔂 Activating <b>${plan.label}</b>\n` +
        `Price: <b>$${plan.priceUsd}</b>\n` +
        `Duration: <b>${plan.durationDays} days</b>.`,
      { parse_mode: "HTML" }
    );

    await activateMembership(ctx, planType);
  } catch (error) {
    console.error("Subscription flow error:", error);
    await ctx.reply("❌ Something went wrong while processing your membership.");
  }
}

async function handleProtectedAccess(ctx, userId, type) {
  const user = await getFreshUserRecord(userId);

  if (!isMembershipActive(user) || user.plan === "free") {
    await ctx.reply(
      `🔒 <b>Access locked</b>\n\nYou need an active membership to use this option.`,
      {
        parse_mode: "HTML",
        reply_markup: getMainKeyboard(),
      }
    );
    return;
  }

  if (type === "feed") {
    await ctx.reply(
      `📜<b>Private Feed</b>\n\nAccess to the private channel and exclusive content while your membership is active.`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessKeyboard(),
      }
    );
    return;
  }

  if (type === "videoclouds") {
    await ctx.reply(
      `🌩 <b>VideoClouds</b>\n\nA chill spot to get ready, settle in, and be set to smoke with me.\n\nJoin here:\nhttps://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessKeyboard(),
      }
    );
    return;
  }

  if (type === "photos") {
    await ctx.reply(
      `📸 <b>Unlocked Photos</b>\n\n⬇ Your photos won’t stay blocked anymore. With ⬇ an active membership, you’ll be able to view them on my website.`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessKeyboard(),
      }
    );
    return;
  }

  if (type === "gifts") {
    await ctx.reply(
      `🎁 <b>Gifts & transfers</b>\n\nYou can send gifts, bank transfers, or direct support through PayPal here:\nhttps://www.paypal.me/UsuarioFX`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessKeyboard(),
      }
    );
  }
}

/* =========================
   COMMANDS
========================= */

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  await ensureUser(userId, username);
  await renderMainMenu(ctx, userId, "reply");
});

bot.command("menu", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  await ensureUser(userId, username);
  await renderMainMenu(ctx, userId, "reply");
});

bot.command("plans", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  await ensureUser(userId, username);
  await renderPlansMenu(ctx, userId, "reply");
});

bot.command("access", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  await ensureUser(userId, username);
  await renderAccessMenu(ctx, userId, "reply");
});

bot.command("channels", async (ctx) => {
  await renderChannelsMenu(ctx, "reply");
});

bot.command("status", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  await ensureUser(userId, username);
  await renderMainMenu(ctx, userId, "reply");
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `📘 <b>Available commands</b>\n\n` +
      `/start - open panel\n` +
      `/menu - open main menu\n` +
      `/plans - view memberships\n` +
      `/access - view access options\n` +
      `/channels - view premium channel options\n` +
      `/status - check current status\n` +
      `/help - show help`,
    {
      parse_mode: "HTML",
      reply_markup: getMainKeyboard(),
    }
  );
});

/* =========================
   CALLBACKS
========================= */

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  await ctx.answerCallbackQuery();

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  try {
    await ensureUser(userId, username);

    if (data === "action_subscription") {
      await renderPlansMenu(ctx, userId);
      return;
    }

    if (data === "action_access") {
      await renderAccessMenu(ctx, userId);
      return;
    }

    if (data === "action_channels") {
      await renderChannelsMenu(ctx, "edit");
      return;
    }

    if (data === "action_refresh") {
      await renderMainMenu(ctx, userId, "reply");
      return;
    }

    if (data === "buy_plan_userfx" || data === "buy_plan_vipfx") {
      await handleSubscription(ctx, data);
      return;
    }

    if (data === "channel_fxvip") {
      await ctx.reply(
        `👑 <b>Room | Ŧҳ VIP 🜲</b>\n\n` +
          `Price: <b>$12.00</b>\n` +
          `Type: <b>Exclusive content</b>\n\n` +
          `Use /channels to come back here.`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data === "channel_smokelandia") {
      await ctx.reply(
        `☁️ <b>SmokeLandia</b>\n\n` +
          `Price: <b>$10.00</b>\n` +
          `Type: <b>Exclusive</b>\n\n` +
          `Use /channels to come back here.`,
        { parse_mode: "HTML" }
      );
      return;
    }

    if (data === "back_to_main") {
      await renderMainMenu(ctx, userId, "reply");
      return;
    }
  } catch (error) {
    console.error("Callback error:", error);
    await ctx.reply("❌ Something went wrong while processing that action.");
  }
});

/* =========================
   PAYMENTS
========================= */

bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("message:successful_payment", async (ctx) => {
  const payload = ctx.message.successful_payment.invoice_payload;
  const planType = planTypeFromPayload(payload);

  await activateMembership(ctx, planType);
});

/* =========================
   KEYBOARD TEXT ROUTES
========================= */

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (text.startsWith("/")) return;

  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  await ensureUser(userId, username);

  if (text === "💳 View Memberships") {
    await renderPlansMenu(ctx, userId, "reply");
    return;
  }

  if (text === "🔓 Access") {
    await renderAccessMenu(ctx, userId, "reply");
    return;
  }

  if (text === "📺 Channels") {
    await renderChannelsMenu(ctx, "reply");
    return;
  }

  if (text === "🔄 Refresh Status") {
    await renderMainMenu(ctx, userId, "reply");
    return;
  }

  if (text === "📺 Feed") {
    await handleProtectedAccess(ctx, userId, "feed");
    return;
  }

  if (text === "🌩 VideoClouds") {
    await handleProtectedAccess(ctx, userId, "videoclouds");
    return;
  }

  if (text === "📸 Photos") {
    await handleProtectedAccess(ctx, userId, "photos");
    return;
  }

  if (text === "🎁 Gifts") {
    await handleProtectedAccess(ctx, userId, "gifts");
    return;
  }

  if (text === "⬅️ Back") {
    await renderMainMenu(ctx, userId, "reply");
    return;
  }

  await ctx.reply("Use /menu to open the panel.", {
    reply_markup: getMainKeyboard(),
  });
});

bot.catch((err) => {
  console.error("BOT ERROR:", err);
});

const handler = webhookCallback(bot, "http");

export default async function telegramWebhook(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  return handler(req, res);
}
