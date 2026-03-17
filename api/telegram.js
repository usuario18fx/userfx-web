import "dotenv/config";
import pg from "pg";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
const databaseUrl = process.env.DATABASE_URL;

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
   MENUS
========================= */
function getMainMenu() {
return new InlineKeyboard()
.text("💳 View Memberships", "action_subscription")
.row()
.text("🔓 Access", "action_access")
.row()
.text("📺 Channels", "action_channels")
.row()
.text("🔄 Refresh Status","action_refresh");
}

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
function getAccessMenu() {
  return new InlineKeyboard()
    .text("📺 Feed", "access_feed")
    .row()
    .text("🌩 VideoClouds", "access_videoclouds")
    .row()
    .text("📸 Photos", "access_photos")
    .row()
    .text("🎁 Gifts", "access_gifts")
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
      price: 15,
      label: "vipFX",
      durationDays: 30,
    };
  }

  return {
    planName: "userfx",
    price: 5,
    label: "userFX",
    durationDays: 8,
  };
}

function generateAccessCode(planName) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FX-${planName.toUpperCase()}-${random}`;
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
      reply_markup: getMainMenu(),
    });
    return;
  }

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: getMainMenu(),
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

async function renderAccessMenu(ctx, userId, mode = "edit") {
  const user = await getFreshUserRecord(userId);

  if (!isMembershipActive(user) || user.plan === "free") {
    const text =
      `🔒 <b>Access locked</b>\n\n` +
      `You need an active membership to unlock this content.\n` +
      `Open <b>View Memberships</b> and activate your access.`;

    if (mode === "edit") {
      await ctx.editMessageText(text, {
        parse_mode: "HTML",
        reply_markup: getMainMenu(),
      });
      return;
    }

    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: getMainMenu(),
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
      reply_markup: getAccessMenu(),
    });
    return;
  }

  await ctx.reply(text, {
    parse_mode: "HTML",
    reply_markup: getAccessMenu(),
  });
}

async function getLatestAccessCode(userId, planName) {
  const result = await db.query(
    `
    select code, expires_at
    from access_codes
    where user_id = $1 and plan = $2
    order by created_at desc
    limit 1
    `,
    [userId, planName]
  );

  if (result.rowCount === 0) return null;
  return result.rows[0];
}

async function handleSubscription(ctx, planType) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply("❌ Couldn't identify the user.");
    return;
  }

  const current = await getFreshUserRecord(userId);
  const { planName, price, label, durationDays } = resolvePlan(planType);

  try {
    if (current.plan === planName && isMembershipActive(current)) {
      let existingCode = await getLatestAccessCode(userId, planName);

      if (!existingCode) {
        const fallbackCode = generateAccessCode(planName);

        await db.query(
          `
          insert into access_codes (user_id, code, plan, expires_at)
          values ($1, $2, $3, $4)
          `,
          [
            userId,
            fallbackCode,
            planName,
            current.membership_expires_at,
          ]
        );

        existingCode = {
          code: fallbackCode,
          expires_at: current.membership_expires_at,
        };
      }

      await ctx.reply(
        `ℹ️ Your <b>${label}</b> membership is already active.\n` +
          `Expires: <b>${formatExpiry(current.membership_expires_at)}</b>\n\n` +
          `Your website access code:\n` +
          `<code>${existingCode.code}</code>`,
        { parse_mode: "HTML" }
      );
      return;
    }

    await db.query("BEGIN");

    await ctx.reply(
      `🔂 Activating <b>${label}</b>\nPrice: <b>$${price}</b>\nDuration: <b>${durationDays} days</b>.`,
      { parse_mode: "HTML" }
    );

    const membershipResult = await db.query(
      `
      update users
      set plan = $1,
          verificado = true,
          membership_started_at = now(),
          membership_expires_at = now() + ($2 || ' days')::interval,
          updated_at = now()
      where user_id = $3
      returning
        user_id,
        username,
        plan,
        verificado,
        membership_started_at,
        membership_expires_at
      `,
      [planName, String(durationDays), userId]
    );

    if (membershipResult.rowCount === 0) {
      await db.query("ROLLBACK");
      await ctx.reply("❌ User not found in the database.");
      return;
    }

    const accessCode = generateAccessCode(planName);

    await db.query(
      `
      insert into access_codes (user_id, code, plan, expires_at)
      values ($1, $2, $3, $4)
      `,
      [
        userId,
        accessCode,
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

    await ctx.reply(
      `🔥 <b>Membership activated</b>\n\n` +
        `Plan: <b>${label}</b>\n` +
        `Duration: <b>${durationDays} days</b>\n` +
        `Expires: <b>${formatExpiry(membershipResult.rows[0].membership_expires_at)}</b>\n\n` +
        `Your website access code:\n` +
        `<code>${accessCode}</code>\n\n` +
        `Open the website and paste that code to unlock your album.`,
      { parse_mode: "HTML" }
    );

    await renderAccessMenu(ctx, userId, "reply");
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error("Subscription SQL error:", error);
    await ctx.reply("❌ Something went wrong while activating your membership.");
  }
}

async function handleProtectedAccess(ctx, userId, type) {
  const user = await getFreshUserRecord(userId);

  if (!isMembershipActive(user) || user.plan === "free") {
    await ctx.reply(
      `🔒 <b>Access locked</b>\n\nYou need an active membership to use this option.`,
      {
        parse_mode: "HTML",
        reply_markup: getMainMenu(),
      }
    );
    return;
  }

  if (type === "feed") {
    await ctx.reply(
      `🗒️ <b>Private Feed</b>\n\nAccess to the private channel and exclusive content while your membership is active.`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessMenu(),
      }
    );
    return;
  }

  if (type === "videoclouds") {
    await ctx.reply(
      `🌩 <b>VideoClouds</b>\n\nA chill spot to get ready, settle in, and be set to smoke with me.\n\nJoin here:\nhttps://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessMenu(),
      }
    );
    return;
  }

  if (type === "photos") {
    await ctx.reply(
      `📸 <b>Unlocked Photos</b>\n\nYour photos won’t stay blocked anymore. With an active membership, you’ll be able to view them on my website.`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessMenu(),
      }
    );
    return;
  }

  if (type === "gifts") {
    await ctx.reply(
      `🎁 <b>Gifts & transfers</b>\n\nYou can send gifts, bank transfers, or direct support through PayPal here:\nhttps://www.paypal.me/UsuarioFX`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessMenu(),
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
const accessCode = generateAccessCode(planName);
const codeSuffix = accessCode.slice(-4);

await db.query(
  `
  insert into access_codes (user_id, code, code_suffix, plan, expires_at)
  values ($1, $2, $3, $4, $5)
  `,
  [
    userId,
    accessCode,
    codeSuffix,
    planName,
    membershipResult.rows[0].membership_expires_at,
  ]
);
await ctx.reply(
  `🥵 <b>Membership activated</b>\n\n` +
    `Plan: <b>${label}</b>\n` +
    `Duration: <b>${durationDays} days</b>\n` +
    `Expires: <b>${formatExpiry(membershipResult.rows[0].membership_expires_at)}</b>\n\n` +
    `Your unlock digits:\n` +
    `<code>${codeSuffix}</code>\n\n` +
    `Enter those 4 digits on the website to unlock the album.`,
  { parse_mode: "HTML" }
); 
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
bot.command("help", async (ctx) => {
  await ctx.reply(
`📘 <b>Available commands</b>\n\n` +
`/start - open panel\n` +
`/menu - open main menu\n` +
`/plans - view memberships\n` +
`/access - view access options\n` +
`/status - check current status\n` +
`/channels - view premium channel options\n` +
`/help - show help`,
  {
      parse_mode: "HTML",
      reply_markup: getMainMenu(),
    }
  );
});
/* ========== CALLBACKS ================ */
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

    if (data === "action_refresh") {
      await renderMainMenu(ctx, userId, "edit");
      return;
    }

    if (data === "buy_plan_userfx" || data === "buy_plan_vipfx") {
      await handleSubscription(ctx, data);
      return;
    }
if (data === "action_channels") {
  await renderChannelsMenu(ctx, "edit");
  return;
}
    if (data === "back_to_main") {
      await renderMainMenu(ctx, userId, "edit");
      return;
    }

    if (data === "access_feed") {
      await handleProtectedAccess(ctx, userId, "feed");
      return;
    }

    if (data === "access_videoclouds") {
      await handleProtectedAccess(ctx, userId, "videoclouds");
      return;
    }

    if (data === "access_photos") {
      await handleProtectedAccess(ctx, userId, "photos");
      return;
    }

    if (data === "access_gifts") {
      await handleProtectedAccess(ctx, userId, "gifts");
      return;
    }
  } catch (error) {
    console.error("Callback error:", error);
    await ctx.reply("❌ Something went wrong while processing that action.");
  }
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim().toLowerCase();

  if (
    text === "/start" ||
    text === "/menu" ||
    text === "/plans" ||
    text === "/access" ||
    text === "/status" ||
    text === "/help"
  ) {
    return;
  }

  await ctx.reply("Use /menu to open the panel.", {
    reply_markup: getMainMenu(),
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