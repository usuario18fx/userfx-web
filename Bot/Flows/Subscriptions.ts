// src/bot/flows/subscription.ts
import type { Context } from "grammy";
import { db } from "../../api/db";

type SubscriptionContext = Context & {
  from?: {
    id: number;
    username?: string;
    first_name?: string;
  };
};

type PlanName = "basic" | "premium";

function resolvePlan(planType: string): { planName: PlanName; price: number } {
  if (planType === "buy_plan_premium") {
    return { planName: "premium", price: 15 };
  }

  return { planName: "basic", price: 5 };
}

export async function handleSubscription(
  ctx: SubscriptionContext,
  planType: string,
) {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply("❌ No se pudo identificar al usuario.");
    return;
  }

  const { planName, price } = resolvePlan(planType);

  try {
    await ctx.reply(
      `⏳ Procesando tu suscripción <b>${planName.toUpperCase()}</b> por <b>${price} USD</b>...`,
      { parse_mode: "HTML" },
    );

    const query = `
      UPDATE users
      SET plan = $1,
          verificado = true,
          updated_at = NOW()
      WHERE user_id = $2
      RETURNING user_id, username, plan, verificado
    `;

    const result = await db.query(query, [planName, userId]);

    if (result.rowCount === 0) {
      await ctx.reply(
        "❌ No se encontró tu registro en la base de datos. Regístrate primero.",
      );
      return;
    }

    await db.query(
      `
      INSERT INTO logs (user_id, action)
      VALUES ($1, $2)
      `,
      [userId, `PURCHASE_${planName.toUpperCase()}`],
    );

    await ctx.reply(
      `🔥 <b>Upgrade completado.</b>\n\nAhora eres un usuario <b>${planName.toUpperCase()}</b> de CloudVip.\nTus beneficios fueron desbloqueados automáticamente.`,
      { parse_mode: "HTML" },
    );
  } catch (error) {
    console.error("Error en la transacción de suscripción:", error);
    await ctx.reply("❌ Hubo un problema al procesar la suscripción.");
  }
}
