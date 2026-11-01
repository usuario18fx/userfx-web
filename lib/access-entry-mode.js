export function accessEntryMode({ redis, namespace, botId, isAdmin, normalizeUsername, showPanel, exitText = "SALIR", styledExitText = "SALIR" }) {
  const keyFor = (ctx) => namespace + ":add-users:" + botId + ":" + ctx.chat.id + ":" + ctx.from.id;
  const prompt = async (ctx) => ctx.reply("AGREGAR USUARIOS · Envía solo el @usuario. No necesitas repetir /access. Pulsa SALIR para terminar.", {
    reply_markup: { keyboard: [[{ text: exitText }]], resize_keyboard: true, is_persistent: true, input_field_placeholder: "@usuario", one_time_keyboard: false }
  });
  return {
    async enter(ctx) {
      if (!isAdmin(ctx) || ctx.chat?.type !== "private") return false;
      const client = await redis();
      if (!client) throw new Error("Redis unavailable");
      await client.set(keyFor(ctx), "active", "EX", 1800);
      await prompt(ctx);
      return true;
    },
    async middleware(ctx, next) {
      if (!isAdmin(ctx) || ctx.chat?.type !== "private" || typeof ctx.message?.text !== "string") return next();
      const text = ctx.message.text.trim();
      if (text.startsWith("/") && !/^\/exitaccess(?:@\w+)?$/.test(text)) return next();
      const client = await redis();
      if (!client || await client.get(keyFor(ctx)) !== "active") return next();
      if ([exitText, styledExitText, "/exitaccess"].includes(text)) {
        await client.del(keyFor(ctx));
        return ctx.reply("Modo agregar usuarios cerrado.", { reply_markup: { remove_keyboard: true } });
      }
      const target = normalizeUsername(text);
      if (!target) return ctx.reply("Envía un @usuario válido o pulsa SALIR.");
      await client.set(keyFor(ctx), "active", "EX", 1800);
      return showPanel(ctx, target.normalized);
    }
  };
}
