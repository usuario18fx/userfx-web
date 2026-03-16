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

function getPlansMenu() {
  return new InlineKeyboard()
    .text("☁️ Cloud Básico - 5 USD", "buy_plan_basic")
    .row()
    .text("👑 Cloud VIP Pro - 15 USD", "buy_plan_premium")
    .row()
    .text("⬅️ Volver al Panel", "back_to_main");
}

function getMainMenu() {
  return new InlineKeyboard().text("💳 Ver Suscripciones", "action_subscription");
}

function resolvePlan(planType) {
  if (planType === "buy_plan_premium") {
    return { planName: "premium", price: 15 };
  }

  return { planName: "basic", price: 5 };
}

async function ensureTables() {
  await db.query(`
    create table if not exists users (
      id bigserial primary key,
      user_id bigint unique not null,
      username text,
      plan text default 'free',
      verificado boolean default false,
      updated_at timestamptz default now()
    );
  `);

  await db.query(`
    create table if not exists logs (
      id bigserial primary key,
      user_id bigint not null,
      action text not null,
      created_at timestamptz default now()
    );
  `);
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

async function handleSubscription(ctx, planType) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply("❌ No se pudo identificar al usuario.");
    return;
  }

  const { planName, price } = resolvePlan(planType);

  try {
    await ctx.reply(
      `⏳ Procesando tu suscripción <b>${planName.toUpperCase()}</b> por <b>${price} USD</b>...`,
      { parse_mode: "HTML" }
    );

    const result = await db.query(
      `
      update users
      set plan = $1,
          verificado = true,
          updated_at = now()
      where user_id = $2
      returning user_id, username, plan, verificado
      `,
      [planName, userId]
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
      `🔥 <b>Upgrade completado.</b>\n\nAhora eres un usuario <b>${planName.toUpperCase()}</b> de CloudVip.\nTus beneficios fueron desbloqueados automáticamente.`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error en la transacción de suscripción:", error);
    await ctx.reply("❌ Hubo un problema al procesar la suscripción.");
  }
}

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (!userId) {
    await ctx.reply("❌ No se pudo identificar al usuario.");
    return;
  }

  await ensureTables();
  await ensureUser(userId, username);

  await ctx.reply(
    `☁️ <b>CloudVip System</b>\n\nPanel principal:`,
    {
      parse_mode: "HTML",
      reply_markup: getMainMenu(),
    }
  );
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
    await ensureTables();
    await ensureUser(userId, username);

    if (data === "action_subscription") {
      const userResult = await db.query(
        `
        select plan
        from users
        where user_id = $1
        limit 1
        `,
        [userId]
      );

      const currentPlan = userResult.rows[0]?.plan ?? "free";

      await ctx.editMessageText(
        `⭐️ <b>CloudVip Subscriptions</b>\n\nTu plan actual: <code>${String(currentPlan).toUpperCase()}</code>\n\nSelecciona un plan:`,
        {
          parse_mode: "HTML",
          reply_markup: getPlansMenu(),
        }
      );

      return;
    }

    if (data.startsWith("buy_plan_")) {
      await handleSubscription(ctx, data);
      return;
    }

    if (data === "back_to_main") {
      await ctx.editMessageText(
        `☁️ <b>CloudVip System</b>\n\nPanel principal:`,
        {
          parse_mode: "HTML",
          reply_markup: getMainMenu(),
        }
      );
      return;
    }
  } catch (error) {
    console.error("Error en callback_query:data:", error);
    await ctx.reply("❌ Ocurrió un error procesando la acción.");
  }
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
