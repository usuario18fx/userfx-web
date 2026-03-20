import "dotenv/config";
import { Bot, InlineKeyboard, Keyboard, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("Missing BOT_TOKEN in environment variables");
}

const bot = new Bot(token);

const SMOKELANDIA_MINIAPP_URL = "https://fx.smokelandia.app";
const SMOKELANDIA_GROUP_URL = "https://t.me/+TU_LINK_AQUI";
const SMOKELANDIA_VIP_URL = "https://t.me/+TU_LINK_VIP_AQUI";

function getMainKeyboard() {
  return new Keyboard()
    .text("☁️ Open SmokeLandia")
    .row()
    .text("👑 VIP Room")
    .text("🔥 Join Group")
    .row()
    .text("ℹ️ About")
    .resized()
    .persistent();
}

function getMainInlineMenu() {
  return new InlineKeyboard()
    .webApp("☁️ Open SmokeLandia", SMOKELANDIA_MINIAPP_URL)
    .row()
    .text("👑 VIP Room", "vip_room")
    .row()
    .text("🔥 Join Group", "join_group")
    .row()
    .text("ℹ️ About", "about_smokelandia");
}

bot.command("start", async (ctx) => {
  await ctx.reply(
    `☁️ <b>SmokeLandia</b>\n\n` +
      `Private entry point.\n` +
      `Open the miniapp or choose an access option below.`,
    {
      parse_mode: "HTML",
      reply_markup: getMainKeyboard(),
    }
  );

  await ctx.reply(
    `Main panel:`,
    {
      reply_markup: getMainInlineMenu(),
    }
  );
});

bot.command("menu", async (ctx) => {
  await ctx.reply(
    `☁️ <b>SmokeLandia</b>\n\nChoose an option:`,
    {
      parse_mode: "HTML",
      reply_markup: getMainKeyboard(),
    }
  );

  await ctx.reply(`Main panel:`, {
    reply_markup: getMainInlineMenu(),
  });
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `📘 <b>Available commands</b>\n\n` +
      `/start - open panel\n` +
      `/menu - open panel\n` +
      `/help - show help`,
    {
      parse_mode: "HTML",
      reply_markup: getMainKeyboard(),
    }
  );
});

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  await ctx.answerCallbackQuery();

  if (data === "vip_room") {
    await ctx.reply(
      `👑 <b>VIP Room</b>\n\n` +
        `Private premium access.\n` +
        `Open here:\n${SMOKELANDIA_VIP_URL}`,
      { parse_mode: "HTML" }
    );
    return;
  }

  if (data === "join_group") {
    await ctx.reply(
      `🔥 <b>Join Group</b>\n\n` +
        `Open here:\n${SMOKELANDIA_GROUP_URL}`,
      { parse_mode: "HTML" }
    );
    return;
  }

  if (data === "about_smokelandia") {
    await ctx.reply(
      `ℹ️ <b>SmokeLandia</b>\n\n` +
        `Exclusive access point for the Smokelandia experience.`,
      { parse_mode: "HTML" }
    );
  }
});

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (text.startsWith("/")) return;

  if (text === "☁️ Open SmokeLandia") {
    await ctx.reply(
      `Tap below to open the miniapp.`,
      {
        reply_markup: new InlineKeyboard().webApp(
          "☁️ Open SmokeLandia",
          SMOKELANDIA_MINIAPP_URL
        ),
      }
    );
    return;
  }

  if (text === "👑 VIP Room") {
    await ctx.reply(
      `👑 VIP Room\n${SMOKELANDIA_VIP_URL}`
    );
    return;
  }

  if (text === "🔥 Join Group") {
    await ctx.reply(
      `🔥 Join Group\n${SMOKELANDIA_GROUP_URL}`
    );
    return;
  }

  if (text === "ℹ️ About") {
    await ctx.reply(
      `☁️ SmokeLandia\nExclusive access point for the Smokelandia experience.`,
      {
        reply_markup: getMainKeyboard(),
      }
    );
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