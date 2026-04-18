import { Telegraf, Markup } from "telegraf";

// --- CONFIGURACIÓN ---
const CONFIG = {
  TOKEN: process.env.BOT_TOKEN,
  URLS: {
    WEBSITE: "https://userfx-web.vercel.app",
    ZOOM: "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1",
    TELEGRAM_CALL: "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY",
    VIDEO_INTRO: "https://userfx-web.vercel.app/assets/websiteFx.mp4"
  },
  PLAN: {
    NAME: "🔥 FX VIP",
    PRICE: 500
  }
};

if (!CONFIG.TOKEN) throw new Error("Missing BOT_TOKEN");
const bot = new Telegraf(CONFIG.TOKEN);

// --- DICCIONARIO DE TEXTOS (UI/UX) ---
const MESSAGES = {
  WELCOME: `<b>Welcome to USER FX</b>\n\n🎥 <i>Down to a video call?</i>\nHere’s the link, hop on whenever you’re ready.\n\n<b>Ready for more?</b>\nChoose an option below.`,
  MAIN: `<b>╔════════════════╗\n     FX | EXCLUSIVE SPACE\n╚════════════════╝</b>\n\nPremium access panel. Use the buttons below to navigate our private sections.`,
  VIP: `<b>👑 VIP STATUS</b>\n\n<b>Plan:</b> <code>${CONFIG.PLAN.NAME}</code>\n\n<b>Benefits:</b>\n• Full Premium Access\n• Priority Website Entry\n• Instant Call Connection\n\n<i>Upgrade your experience now.</i>`,
  USER: `<b>🧊 USER PANEL</b>\n\nYour basic entry point. Jump into a call or explore the unlocked sections below.`,
  SECTIONS: {
    access: `<b>🔐 ACCESS GRANTED</b>\nSelect a private category:`,
    feed: `<b>📺 FEED</b>\n────────────────\n• Selected drops\n• Public previews\n• Featured content`,
    photos: `<b>📸 PHOTOS</b>\n────────────────\n• Unlocked visual section\n• Private gallery access`,
    cloud: `<b>🌩️ VIDEOCLOUDS</b>\n────────────────\n• Ambient room\n• Visual session\n• Cloud access enabled`,
    gifts: `<b>🎁 GIFTS</b>\n────────────────\n• Support & Tips\n• Additional access support`
  }
};

// --- CONSTRUCTOR DE TECLADOS ---
const UI = {
  buttons: {
    calls: [
      Markup.button.url("📞 Zoom", CONFIG.URLS.ZOOM),
      Markup.button.url("💬 Telegram", CONFIG.URLS.TELEGRAM_CALL)
    ],
    back: Markup.button.callback("« BACK TO MENU", "main"),
    refresh: Markup.button.callback("↻ REFRESH", "main"),
    web: Markup.button.webApp("🌐 OPEN WEBSITE", CONFIG.URLS.WEBSITE)
  },

  main: () => Markup.inlineKeyboard([
    UI.buttons.calls,
    [Markup.button.callback("🔥 GET FULL ACCESS", "buy")],
    [Markup.button.callback("👑 VIP", "vip"), Markup.button.callback("🧊 USER", "user")],
    [UI.buttons.web],
    [UI.buttons.refresh]
  ]),

  sections: () => Markup.inlineKeyboard([
    [Markup.button.callback("📺 FEED", "view_feed"), Markup.button.callback("📸 PHOTOS", "view_photos")],
    [Markup.button.callback("🌩️ CLOUD", "view_cloud"), Markup.button.callback("🎁 GIFTS", "view_gifts")],
    UI.buttons.calls,
    [UI.buttons.back]
  ]),

  vip: () => Markup.inlineKeyboard([
    [Markup.button.callback("🔥 BUY VIP ACCESS", "buy")],
    UI.buttons.calls,
    [UI.buttons.back]
  ]),

  user: () => Markup.inlineKeyboard([
    [Markup.button.callback("🔐 OPEN SECTIONS", "view_access")],
    UI.buttons.calls,
    [UI.buttons.back]
  ])
};

// --- FUNCIONES AUXILIARES ---
async function updateUI(ctx, text, keyboard) {
  const payload = { parse_mode: "HTML", disable_web_page_preview: true, ...keyboard };
  try {
    if (ctx.callbackQuery) {
      // Intentar editar según el tipo de mensaje (con media o texto solo)
      if (ctx.callbackQuery.message.caption) return await ctx.editMessageCaption(text, payload);
      return await ctx.editMessageText(text, payload);
    }
    return await ctx.reply(text, payload);
  } catch (e) {
    return await ctx.reply(text, payload);
  }
}

// --- MANEJADORES DE COMANDOS ---
bot.start(async (ctx) => {
  await ctx.replyWithVideo(
    { url: CONFIG.URLS.VIDEO_INTRO },
    { caption: MESSAGES.WELCOME, parse_mode: "HTML", ...UI.main() }
  );
});

bot.action("main", (ctx) => updateUI(ctx, MESSAGES.MAIN, UI.main()));
bot.action("vip", (ctx) => updateUI(ctx, MESSAGES.VIP, UI.vip()));
bot.action("user", (ctx) => updateUI(ctx, MESSAGES.USER, UI.user()));

// Manejador dinámico para secciones
bot.action(/^view_(.+)$/, (ctx) => {
  const section = ctx.match[1];
  updateUI(ctx, MESSAGES.SECTIONS[section], UI.sections());
});

// --- SISTEMA DE PAGOS ---
bot.action("buy", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithInvoice({
    title: CONFIG.PLAN.NAME,
    description: "Full Premium access to USER FX Website",
    payload: "fx_vip_access",
    provider_token: "", // Telegram Stars
    currency: "XTR",
    prices: [{ label: CONFIG.PLAN.NAME, amount: CONFIG.PLAN.PRICE }],
  });
});

bot.on("pre_checkout_query", (ctx) => ctx.answerPreCheckoutQuery(true));

bot.on("successful_payment", async (ctx) => {
  await ctx.reply(
    `✅ <b>PAYMENT CONFIRMED</b>\n\nYour access to <b>${CONFIG.PLAN.NAME}</b> is now active.`,
    { parse_mode: "HTML", ...UI.user() }
  );
});

// --- WEBHOOK / SERVERLESS HANDLER ---
export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body);
      res.status(200).send("OK");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error");
    }
  } else {
    res.status(200).json({ status: "Bot is running" });
  }
}
