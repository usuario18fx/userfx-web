import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  await ctx.reply("Bot alive");
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      method: req.method,
      message: "Telegram endpoint alive",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      method: req.method,
    });
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("TELEGRAM HANDLER ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: "handler_error",
      details: String(error?.message || error),
    });
  }
}
