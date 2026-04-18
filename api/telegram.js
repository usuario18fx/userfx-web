import { Telegraf, Markup } from "telegraf";

// --- CONFIGURACIÓN ---
const CONFIG = {
  TOKEN: process.env.BOT_TOKEN,
  URLS: {
    WEBSITE: "https://userfx-web.vercel.app",
    SMOKELANDIA: "https://smokelandia.app",
    ZOOM: "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1",
    TELEGRAM_CALL: "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY",
    VIDEO_INTRO: "https://userfx-web.vercel.app/assets/websiteFx.mp4"
  },
  PLANS: {
    USER: {
      NAME: "🧊 USER",
      PRICE: 100,
      DURATION_DAYS: 1
    },
    VIP: {
      NAME: "👑 FX VIP",
      PRICE: 500,
      DURATION_DAYS: 21
    }
  }
};

if (!CONFIG.TOKEN) throw new Error("Missing BOT_TOKEN");
const bot = new Telegraf(CONFIG.TOKEN);

// --- DICCIONARIO DE TEXTOS ---
const MESSAGES = {
  WELCOME: `<b>Welcome to USER FX</b>\n\n🎥 <i>Down to a video call?</i>\nHere’s the link, hop on whenever you’re ready.\n\n<b>Ready for more?</b>\nChoose an option below.`,

  MAIN: `<b>╔════════════════╗\n     FX | EXCLUSIVE SPACE\n╚════════════════╝</b>\n\nPremium access panel. Use the buttons below to navigate our private sections.`,

  VIP: `<b>👑 VIP STATUS</b>\n\n<b>Plan:</b> <code>${CONFIG.PLANS.VIP.NAME}</code>\n<b>Price:</b> ${CONFIG.PLANS.VIP.PRICE} Stars\n<b>Duration:</b> ${CONFIG.PLANS.VIP.DURATION_DAYS} days\n\n<b>Benefits:</b>\n• Full Premium Access\n• Priority Website Entry\n• Instant Call Connection\n• Unique access code\n\n<i>Upgrade your experience now.</i>`,

  USER: `<b>🧊 USER PANEL</b>\n\n<b>Plan:</b> <code>${CONFIG.PLANS.USER.NAME}</code>\n<b>Price:</b> ${CONFIG.PLANS.USER.PRICE} Stars\n<b>Duration:</b> Single visual session\n\nYour basic entry point. Jump into a call or unlock your website access.`,

  PLANS_INFO: `<b>CHOOSE YOUR ACCESS PLAN</b>\n\n────────────────\n<b>${CONFIG.PLANS.USER.NAME} Access</b>: ${CONFIG.PLANS.USER.PRICE} Stars\n<i>Valid for 1 visual session (Single Use).</i>\n\n────────────────\n<b>${CONFIG.PLANS.VIP.NAME} Access</b>: ${CONFIG.PLANS.VIP.PRICE} Stars\n<i>Full access for ${CONFIG.PLANS.VIP.DURATION_DAYS} days (${CONFIG.PLANS.VIP.DURATION_DAYS / 7} weeks).</i>\n\nChoose below to pay:`,

  CHANNELS: `<b>🌐 CHANNELS</b>\n\nChoose where you want to enter:`,

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
    channels: Markup.button.callback("🌐 CHANNELS", "channels")
  },

  main: () =>
    Markup.inlineKeyboard([
      UI.buttons.calls,
      [Markup.button.callback("🔥 GET FULL ACCESS", "plans")],
      [
        Markup.button.callback("⚡ VIP", "vip"),
        Markup.button.callback("👑 USER", "user")
      ],
      [UI.buttons.channels],
      [UI.buttons.refresh]
    ]),

  channelsLinks: () =>
    Markup.inlineKeyboard([
      [Markup.button.url("🜲 USER FX", CONFIG.URLS.WEBSITE)],
      [Markup.button.url("☁️ SMOKELANDIA", CONFIG.URLS.SMOKELANDIA)],
      [UI.buttons.back]
    ]),

  sections: () =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback("📺 FEED", "view_feed"),
        Markup.button.callback("📸 PHOTOS", "view_photos")
      ],
      [
        Markup.button.callback("🌩️ CLOUD", "view_cloud"),
        Markup.button.callback("🎁 GIFTS", "view_gifts")
      ],
      UI.buttons.calls,
      [UI.buttons.back]
    ]),

  vip: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback(`🔥 BUY VIP (${CONFIG.PLANS.VIP.PRICE})`, "buy_vip")],
      UI.buttons.calls,
      [UI.buttons.back]
    ]),

  user: () =>
    Markup.inlineKeyboard([
      [Markup.button.callback("👑 BUY USER ACCESS", "buy_user")],
      [Markup.button.callback("🔐 OPEN SECTIONS", "view_access")],
      UI.buttons.calls,
      [UI.buttons.back]
    ]),

  choosePlan: () =>
    Markup.inlineKeyboard([
      [
        Markup.button.callback(`👑 USER (${CONFIG.PLANS.USER.PRICE})`, "buy_user"),
        Markup.button.callback(`⚡ VIP (${CONFIG.PLANS.VIP.PRICE})`, "buy_vip")
      ],
      [UI.buttons.back]
    ])
};

// --- FUNCIONES AUXILIARES ---
async function updateUI(ctx, text, keyboard) {
  const payload = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...keyboard
  };

  try {
    if (ctx.callbackQuery) {
      if (ctx.callbackQuery.message?.caption) {
        return await ctx.editMessageCaption(text, payload);
      }
      return await ctx.editMessageText(text, payload);
    }

    return await ctx.reply(text, payload);
  } catch (e) {
    return await ctx.reply(text, payload);
  }
}

// --- MOCK DB / CÓDIGOS ---
async function generateAndSaveCodeInDB(telegramId, planType) {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const newCode = `AX01-${randomSuffix}`;

  const now = new Date();
  const durationDays =
    planType === "vip"
      ? CONFIG.PLANS.VIP.DURATION_DAYS
      : CONFIG.PLANS.USER.DURATION_DAYS;

  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // AQUÍ CONECTAS TU DB REAL:
  // await supabase.from("access_codes").insert({
  //   telegram_id: telegramId,
  //   code: newCode,
  //   plan_type: planType,
  //   created_at: now.toISOString(),
  //   expires_at: expiresAt.toISOString(),
  //   used_at: null
  // });

  console.log(
    `[DB MOCK] Saved code ${newCode} for user ${telegramId} | plan=${planType} | expires=${expiresAt.toISOString()}`
  );

  return newCode;
}

// --- COMANDOS ---
bot.start(async (ctx) => {
  await ctx.replyWithVideo(
    { url: CONFIG.URLS.VIDEO_INTRO },
    {
      caption: MESSAGES.WELCOME,
      parse_mode: "HTML",
      ...UI.main()
    }
  );
});

// --- ACCIONES UI ---
bot.action("main", (ctx) => updateUI(ctx, MESSAGES.MAIN, UI.main()));
bot.action("vip", (ctx) => updateUI(ctx, MESSAGES.VIP, UI.vip()));
bot.action("user", (ctx) => updateUI(ctx, MESSAGES.USER, UI.user()));
bot.action("plans", (ctx) => updateUI(ctx, MESSAGES.PLANS_INFO, UI.choosePlan()));
bot.action("channels", (ctx) => updateUI(ctx, MESSAGES.CHANNELS, UI.channelsLinks()));

// --- SECCIONES DINÁMICAS ---
bot.action(/^view_(.+)$/, (ctx) => {
  const section = ctx.match[1];
  const message = MESSAGES.SECTIONS[section];

  if (!message) {
    return updateUI(ctx, MESSAGES.MAIN, UI.main());
  }

  return updateUI(ctx, message, UI.sections());
});

// --- PAGOS DINÁMICOS POR PLAN ---
bot.action(/^buy_(.+)$/, async (ctx) => {
  const planKey = ctx.match[1].toUpperCase();
  const plan = CONFIG.PLANS[planKey];

  if (!plan) {
    return await ctx.answerCbQuery("Error: Invalid Plan");
  }

  await ctx.answerCbQuery(`Opening Payment for ${plan.NAME}`);

  await ctx.replyWithInvoice({
    title: plan.NAME,
    description:
      planKey === "VIP"
        ? `Access to USER FX Website for ${CONFIG.PLANS.VIP.DURATION_DAYS} days`
        : "Access to USER FX Website for a single visual session",
    payload: `fx_access_${planKey.toLowerCase()}`,
    provider_token: "",
    currency: "XTR",
    prices: [
      {
        label: plan.NAME,
        amount: plan.PRICE
      }
    ]
  });
});

// --- PRE CHECKOUT ---
bot.on("pre_checkout_query", (ctx) => ctx.answerPreCheckoutQuery(true));

// --- PAGO EXITOSO ---
bot.on("successful_payment", async (ctx) => {
  const paymentInfo = ctx.message.successful_payment;
  const planType = paymentInfo.invoice_payload.replace("fx_access_", "");

  let uniqueAccessCode = "ERROR-GENERATING";

  try {
    uniqueAccessCode = await generateAndSaveCodeInDB(ctx.from.id, planType);
  } catch (error) {
    console.error("CRITICAL ERROR GENERATING CODE:", error);
    return await ctx.reply(
      "❌ There was a critical error generating your access code. Please contact support."
    );
  }

  const isVip = planType === "vip";
  const planName = isVip ? CONFIG.PLANS.VIP.NAME : CONFIG.PLANS.USER.NAME;
  const validityText = isVip
    ? `valid for ${CONFIG.PLANS.VIP.DURATION_DAYS} days`
    : "valid for a single user session";

  await ctx.reply(
    `✅ <b>PAYMENT CONFIRMED</b>\n\nYour <b>${planName}</b> access is active.\n\nHere is your unique access code:\n───────────────────\n<code>${uniqueAccessCode}</code>\n───────────────────\nThis code is ${validityText}. Use it on the website.`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.url("🜲 USER FX", CONFIG.URLS.WEBSITE)],
        [Markup.button.url("☁️ SMOKELANDIA", CONFIG.URLS.SMOKELANDIA)],
        [UI.buttons.back]
      ])
    }
  );
});

// --- HANDLER SERVERLESS / WEBHOOK ---
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
