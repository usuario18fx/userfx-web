import { db } from "../../db.js";

function resolvePlan(planType) {
  if (planType === "buy_plan_premium") {
    return { planName: "premium", price: 15 };
  }

  return { planName: "basic", price: 5 };
}

export async function handleSubscription(ctx, planType) {
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