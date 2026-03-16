import "dotenv/config";
import pg from "pg";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
const databaseUrl = process.env.DATABASE_URL;

if (!token) {
  throw new Error("Falta BOT_TOKEN en variables de entorno");
}

if (!databaseUrl) {
  throw new Error("Falta DATABASE_URL en variables de entorno");
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
    .text("💳 Ver Membresías", "action_subscription")
    .row()
    .text("🔄 Actualizar Estado", "action_refresh");
}

function getPlansMenu() {
  return new InlineKeyboard()
    .text("⚪ userFX · 8 días · $5", "buy_plan_userfx")
    .row()
    .text("👑 vipFX · 30 días · $15", "buy_plan_vipfx")
    .row()
    .text("⬅️ Volver", "back_to_main");
}

function getAccessMenu() {
  return new InlineKeyboard()
    .text("📺 Feed", "access_feed")
    .row()
    .text("🌩 VideoClouds", "access_videoclouds")
    .row()
    .text("📸 Fotos", "access_photos")
    .row()
    .text("🎁 Gifts", "access_gifts")
    .row()
    .text("⬅️ Volver", "back_to_main");
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
  if (!dateValue) return "No definida";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "No definida";
  return date.toLocaleString("es-MX", {
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
    `Plan actual: <b>${formatPlanLabel(user.plan)}</b>\n` +
    `Verificado: <b>${user.verificado ? "Sí" : "No"}</b>\n` +
    `Membresía activa: <b>${active ? "Sí" : "No"}</b>\n` +
    `Expira: <b>${formatExpiry(user.membership_expires_at)}</b>\n\n` +
    `Panel principal:`;

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

async function renderPlansMenu(ctx, userId) {
  const user = await getFreshUserRecord(userId);

  await ctx.editMessageText(
    `⭐️ <b>Membresías FX</b>\n\n` +
      `Tu plan actual: <b>${formatPlanLabel(user.plan)}</b>\n` +
      `Expira: <b>${formatExpiry(user.membership_expires_at)}</b>\n\n` +
      `⚪ <b>userFX</b>\n` +
      `Duración: <b>8 días</b>\n` +
      `Acceso a Feed, VideoClouds, Fotos desbloqueadas y Gifts.\n\n` +
      `👑 <b>vipFX</b>\n` +
      `Duración: <b>30 días</b>\n` +
      `Acceso a Feed, VideoClouds, Fotos desbloqueadas y Gifts.\n\n` +
      `Selecciona un plan:`,
    {
      parse_mode: "HTML",
      reply_markup: getPlansMenu(),
    }
  );
}

async function renderAccessMenu(ctx, userId, mode = "edit") {
  const user = await getFreshUserRecord(userId);

  if (!isMembershipActive(user) || user.plan === "free") {
    const text =
      `🔒 <b>Acceso bloqueado</b>\n\n` +
      `Necesitas una membresía activa para entrar a este contenido.\n` +
      `Ve a <b>Ver Membresías</b> y activa tu acceso.`;

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
    `🔓 <b>Accesos habilitados</b>\n\n` +
    `Plan activo: <b>${formatPlanLabel(user.plan)}</b>\n` +
    `Expira: <b>${formatExpiry(user.membership_expires_at)}</b>\n\n` +
    `Selecciona una opción:`;

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

async function handleSubscription(ctx, planType) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply("❌ No se pudo identificar al usuario.");
    return;
  }

  const current = await getFreshUserRecord(userId);
  const { planName, price, label, durationDays } = resolvePlan(planType);

  if (current.plan === planName && isMembershipActive(current)) {
    await ctx.reply(
      `ℹ️ Ya tienes activa la membresía <b>${label}</b>.\nExpira: <b>${formatExpiry(current.membership_expires_at)}</b>`,
      { parse_mode: "HTML" }
    );
    return;
  }

  try {
    await ctx.reply(
      `🧪 Activando membresía <b>${label}</b>\nPrecio: <b>$${price}</b>\nDuración: <b>${durationDays} días</b>.`,
      { parse_mode: "HTML" }
    );

    const result = await db.query(
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

    if (result.rowCount === 0) {
      await ctx.reply("❌ No se encontró tu usuario en la base de datos.");
      return;
    }

    await db.query(
      `
      insert into logs (user_id, action)
      values ($1, $2)
      `,
      [userId, `PURCHASE_${planName.toUpperCase()}`]
    );

    await ctx.reply(
      `🔥 <b>Membresía activada</b>\n\n` +
        `Plan: <b>${label}</b>\n` +
        `Duración: <b>${durationDays} días</b>\n` +
        `Expira: <b>${formatExpiry(result.rows[0].membership_expires_at)}</b>\n\n` +
        `Ya puedes acceder a:\n` +
        `📺 Feed\n` +
        `🌩 VideoClouds\n` +
        `📸 Fotos\n` +
        `🎁 Gifts`,
      { parse_mode: "HTML" }
    );

    await renderAccessMenu(ctx, userId, "reply");
  } catch (error) {
    console.error("Subscription SQL error:", error);
    await ctx.reply("❌ Hubo un problema al procesar la membresía.");
  }
}

async function handleProtectedAccess(ctx, userId, type) {
  const user = await getFreshUserRecord(userId);

  if (!isMembershipActive(user) || user.plan === "free") {
    await ctx.reply(
      `🔒 <b>Acceso bloqueado</b>\n\nNecesitas una membresía activa para usar esta opción.`,
      {
        parse_mode: "HTML",
        reply_markup: getMainMenu(),
      }
    );
    return;
  }

  if (type === "feed") {
    await ctx.reply(
      `📺 <b>Feed privado</b>\n\nAcceso al canal privado y contenido exclusivo durante tu membresía activa.`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessMenu(),
      }
    );
    return;
  }

  if (type === "videoclouds") {
    await ctx.reply(
      `🌩 <b>VideoClouds</b>\n\nUn espacio para prepararte, relajarte y estar listo, para poder fumar conmigo.\n\nEntra aquí:\nhttps://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessMenu(),
      }
    );
    return;
  }

  if (type === "photos") {
    await ctx.reply(
      `📸 <b>Fotos desbloqueadas</b>\n\nTus fotos ya no estarán bloqueadas. Con tu membresía activa ya podrás verlas dentro de mi sitio web.`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessMenu(),
      }
    );
    return;
  }

  if (type === "gifts") {
    await ctx.reply(
      `🎁 <b>Gifts y transferencias</b>\n\nAquí puedes enviar gifts, transferencias bancarias o apoyo directo por PayPal:\nhttps://www.paypal.me/UsuarioFX`,
      {
        parse_mode: "HTML",
        reply_markup: getAccessMenu(),
      }
    );
  }
}

/* =========================
   BOT LOGIC
========================= */

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (!userId) {
    await ctx.reply("❌ No se pudo identificar al usuario.");
    return;
  }

  await ensureUser(userId, username);
  await renderMainMenu(ctx, userId, "reply");
});

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  await ctx.answerCallbackQuery();

  if (!userId) {
    await ctx.reply("❌ No se pudo identificar al usuario.");
    return;
  }

  try {
    await ensureUser(userId, username);

    if (data === "action_subscription") {
      await renderPlansMenu(ctx, userId);
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
    await ctx.reply("❌ Ocurrió un error procesando la acción.");
  }
});

bot.on("message:text", async (ctx) => {
  if (ctx.message.text === "/start") return;

  await ctx.reply("Usa /start para abrir el panel.", {
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
