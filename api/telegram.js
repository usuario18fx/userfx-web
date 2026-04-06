import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL = "https://zoom.us/j/XXXXXXX"; // ← TU LINK REAL
const TELEGRAM_CALL_URL = "https://t.me/User18fx"; // ← tu user

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");

const bot = new Telegraf(BOT_TOKEN);

/* =========================
   CONFIG
========================= */

const PLAN_NAME = "🔥 FX VIP";
const PRICE_STARS = 500;

/* =========================
   INLINE UI
========================= */

function mainInline() {
  return Markup.inlineKeyboard([
    [
      Markup.button.url("📞 Zoom Call", ZOOM_URL),
      Markup.button.url("💬 Telegram Call", TELEGRAM_CALL_URL),
    ],
    [
      Markup.button.callback("🔥 Buy Access", "buy"),
      Markup.button.callback("⭐ Stars", "stars"),
    ],
    [
      Markup.button.callback("🔐 Access", "access"),
      Markup.button.webApp("🌐 Enter Site", WEBSITE_URL),
    ],
  ]);
}

function accessInline() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📺 Feed", "feed"),
      Markup.button.callback("📸 Photos", "photos"),
    ],
    [
      Markup.button.callback("🌩️ VideoClouds", "cloud"),
      Markup.button.callback("🎁 Gifts", "gifts"),
    ],
    [
      Markup.button.url("📞 Zoom Call", ZOOM_URL),
      Markup.button.url("💬 Telegram Call", TELEGRAM_CALL_URL),
    ],
    [
      Markup.button.callback("↩️ Back", "main"),
    ],
  ]);
}

/* =========================
   START (VIDEO + CTA)
========================= */

bot.start(async (ctx) => {
  await ctx.replyWithVideo(
    { url: "https://tu-video.mp4" }, // ← TU VIDEO
    {
      caption: `🎥 Down to a video call?

Here’s the link, hop on whenever you’re ready.

🔥 ${PLAN_NAME}`,
      ...mainInline(),
    }
  );
});

/* =========================
   PANELS
========================= */

async function sendMain(ctx) {
  await ctx.editMessageCaption?.(
    `🔥 <b>FX ACCESS</b>

Premium access panel.`,
    {
      parse_mode: "HTML",
      ...mainInline(),
    }
  ).catch(async () => {
    await ctx.reply(
      `🔥 <b>FX ACCESS</b>`,
      {
        parse_mode: "HTML",
        ...mainInline(),
      }
    );
  });
}

async function sendAccess(ctx) {
  await ctx.editMessageText(
    `🔐 <b>ACCESS OPEN</b>

Plan: ${PLAN_NAME}`,
    {
      parse_mode: "HTML",
      ...accessInline(),
    }
  );
}

/* =========================
   PAYMENT (STARS)
========================= */

bot.action("buy", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.replyWithInvoice({
    title: PLAN_NAME,
    description: "Full access to Fx Website",
    payload: "fx_vip",
    provider_token: "",
    currency: "XTR",
    prices: [{ label: "FX VIP", amount: PRICE_STARS }],
  });
});

bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("successful_payment", async (ctx) => {
  await ctx.reply(
    `✅ <b>PAYMENT SUCCESSFUL</b>

Access granted.`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🔥 ENTER NOW", WEBSITE_URL)],
      ]),
    }
  );
});

/* =========================
   ACTIONS
========================= */

bot.action("main", async (ctx) => {
  await ctx.answerCbQuery();
  await sendMain(ctx);
});

bot.action("access", async (ctx) => {
  await ctx.answerCbQuery();
  await sendAccess(ctx);
});

bot.action("stars", async (ctx) => {
  await ctx.answerCbQuery("Use Buy Access");
});

bot.action("feed", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("📺 Feed unlocked");
});

bot.action("photos", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("📸 Photos unlocked");
});

bot.action("cloud", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("🌩️ Cloud active");
});

bot.action("gifts", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("🎁 Gifts section");
});

/* =========================
   FALLBACK
========================= */

bot.on("text", async (ctx) => {
  await ctx.reply("Use /start");
});

bot.catch(console.error);

/* =========================
   VERCEL HANDLER
========================= */

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "handler_error" });
  }
}
