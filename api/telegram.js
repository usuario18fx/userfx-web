import "dotenv/config";
import { Telegraf, Markup } from "telegraf";

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("Missing BOT_TOKEN in environment variables");
}

const bot = new Telegraf(token);

const SMOKELANDIA_MINIAPP_URL = "https://fx.smokelandia.app";
const SMOKELANDIA_GROUP_URL = "https://t.me/+TU_LINK_DEL_GRUPO";
const SMOKELANDIA_VIP_URL = "https://t.me/+TU_LINK_VIP";

function mainKeyboard() {
  return Markup.keyboard([
    ["☁️ Open SmokeLandia"],
    ["👑 VIP Room", "🔥 Join Group"],
    ["ℹ️ About"]
  ]).resize();
}

function mainInlineMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.webApp("☁️ Open SmokeLandia", SMOKELANDIA_MINIAPP_URL)],
    [Markup.button.callback("👑 VIP Room", "vip_room")],
    [Markup.button.callback("🔥 Join Group", "join_group")],
    [Markup.button.callback("ℹ️ About", "about_smokelandia")]
  ]);
}

bot.start(async (ctx) => {
  await ctx.reply(
    "☁️ SmokeLandia\n\nPrivate entry point.\nOpen the miniapp or choose an access option below.",
    mainKeyboard()
  );

  await ctx.reply("Main panel:", mainInlineMenu());
});

bot.command("menu", async (ctx) => {
  await ctx.reply(
    "☁️ SmokeLandia\n\nChoose an option:",
    mainKeyboard()
  );

  await ctx.reply("Main panel:", mainInlineMenu());
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Available commands:\n\n/start - open panel\n/menu - open panel\n/help - show help",
    mainKeyboard()
  );
});

bot.action("vip_room", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `👑 VIP Room\n\nPrivate premium access.\nOpen here:\n${SMOKELANDIA_VIP_URL}`
  );
});

bot.action("join_group", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    `🔥 Join Group\n\nOpen here:\n${SMOKELANDIA_GROUP_URL}`
  );
});

bot.action("about_smokelandia", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "☁️ SmokeLandia\n\nExclusive access point for the Smokelandia experience."
  );
});

bot.hears("☁️ Open SmokeLandia", async (ctx) => {
  await ctx.reply(
    "Tap below to open the miniapp.",
    Markup.inlineKeyboard([
      [Markup.button.webApp("☁️ Open SmokeLandia", SMOKELANDIA_MINIAPP_URL)]
    ])
  );
});

bot.hears("👑 VIP Room", async (ctx) => {
  await ctx.reply(`👑 VIP Room\n${SMOKELANDIA_VIP_URL}`);
});

bot.hears("🔥 Join Group", async (ctx) => {
  await ctx.reply(`🔥 Join Group\n${SMOKELANDIA_GROUP_URL}`);
});

bot.hears("ℹ️ About", async (ctx) => {
  await ctx.reply(
    "☁️ SmokeLandia\nExclusive access point for the Smokelandia experience.",
    mainKeyboard()
  );
});

bot.on("text", async (ctx, next) => {
  const text = ctx.message?.text?.trim();
  if (text === "/start" || text === "/menu" || text === "/help") {
    return next();
  }

  const known = [
    "☁️ Open SmokeLandia",
    "👑 VIP Room",
    "🔥 Join Group",
    "ℹ️ About"
  ];

  if (!known.includes(text)) {
    await ctx.reply("Use /menu to open the panel.", mainKeyboard());
  }
});

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    await bot.handleUpdate(req.body, res);
    res.status(200).send("OK");
  } catch (error) {
    console.error("TELEGRAM WEBHOOK ERROR:", error);
    res.status(500).send("Internal Server Error");
  }
}