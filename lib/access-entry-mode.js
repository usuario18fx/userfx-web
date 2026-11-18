export function accessEntryMode({ redis, namespace, botId, isAdmin, normalizeUsername, showPanel, exitText = "EXIT", styledExitText = "ᴇxɪᴛ" }) {
  const keyFor = (ctx) => namespace + ":add-users:" + botId + ":" + ctx.chat.id + ":" + ctx.from.id;
  const prompt = async (ctx) => ctx.reply("ADD GUESTS · Drop their @username, babe. No need to repeat /access. Tap EXIT when you’re done.", {
    reply_markup: { keyboard: [[{ text: "←" }, { text: styledExitText }]], resize_keyboard: true, is_persistent: true, input_field_placeholder: "@username", one_time_keyboard: false }
  });
  return {
    async remember(ctx, username) {
      const client = await redis();
      if (client) await client.set(keyFor(ctx) + ":target", username, "EX", 1800);
    },
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
      if ([exitText, styledExitText, "EXIT", "ᴇxɪᴛ", "SALIR", "ꜱᴀʟɪʀ", "/exitaccess"].includes(text)) {
        await client.del(keyFor(ctx), keyFor(ctx) + ":target");
        return ctx.reply("Guest-add mode closed. You’re all set.", { reply_markup: { remove_keyboard: true } });
      }
      if (text === "←") {
        const username = await client.get(keyFor(ctx) + ":target");
        await client.set(keyFor(ctx), "active", "EX", 1800);
        return username ? showPanel(ctx, username) : prompt(ctx);
      }
      const target = normalizeUsername(text);
      if (!target) return ctx.reply("Send a valid @username or tap EXIT, babe.");
      await client.set(keyFor(ctx), "active", "EX", 1800);
      return showPanel(ctx, target.normalized);
    }
  };
}
