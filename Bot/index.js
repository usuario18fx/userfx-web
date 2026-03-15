import "dotenv/config";
import { Bot } from "grammy";
import { db } from "../db.js";
import { getPlansMenu } from "../Menus/plans.js";
import { handleSubscription } from "./Flows/subscription.js";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("Falta BOT_TOKEN en variables de entorno");
}

const bot = new Bot(token);

function getPremiumMenu() {
  return getPlansMenu();
}

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username ?? null;

  if (userId) {
    await db.query(
      `
      insert into users (user_id, username)
      values ($1, $2)
      on conflict (user_id)
      do update set username = excluded.username, updated_at = now()
      `,
      [userId, username]
    );
  }

  await ctx.reply(
    `☁️ <b>CloudVip System</b>\n\nPanel principal:`,
    {
      parse_mode: "HTML",
      reply_markup: getPremiumMenu(),
    }
  );
});

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;

  await ctx.answerCallbackQuery();

  if (!userId) {
    await ctx.reply("❌ No se pudo identificar al usuario.");
    return;
  }

  try {
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
        `⭐️ <b>CloudVip Subscriptions</b>\n\nTu plan actual: <code>${String(currentPlan).toUpperCase()}</code>\n\nMejora tu cuenta para desbloquear funciones premium.`,
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
          reply_markup: getPremiumMenu(),
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

bot.start();