import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const TELEGRAM_CALL_URL = "https://t.me/User18fx";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
} // ➡️⬇️↕️↗️⬆️⬅️

const bot = new Telegraf(BOT_TOKEN);

const PLAN_NAME = "🔥 FX VIP";
const PRICE_STARS = 500;
const VIDEO_URL = "https://userfx-web.vercel.app/welcome-smkl.mp4";

function mainInline() {
  return Markup.inlineKeyboard([
    [
      Markup.button.url("📞 Zoom Call", ZOOM_URL),
      Markup.button.url("💬 Telegram Call", TELEGRAM_CALL_URL),
    ],
    [Markup.button.callback("🔥 BUY ACCESS", "buy")],
    [
      Markup.button.callback("👑 VIP", "vip"),
      Markup.button.callback("🧊 USER", "user"),
    ],
    [Markup.button.webApp("🌐 OPEN WEBSITE", WEBSITE_URL)],
    [Markup.button.callback("↻ REFRESH", "main")],
  ]);
} // ➡️⬇️↕️↗️⬆️⬅️

function accessInline() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📺 FEED", "feed"),
      Markup.button.callback("📸 PHOTOS", "photos"),
    ],
    [
      Markup.button.callback("🌩️ VIDEOCLOUDS", "cloud"),
      Markup.button.callback("🎁 GIFTS", "gifts"),
    ],
    [
      Markup.button.url("📞 Zoom Call", ZOOM_URL),
      Markup.button.url("💬 Telegram Call", TELEGRAM_CALL_URL),
    ],
    [Markup.button.webApp("🌐 OPEN WEBSITE", WEBSITE_URL)],
    [Markup.button.callback("↩ BACK", "main")],
  ]);
} // ➡️⬇️↕️↗️⬆️⬅️

function vipInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔥 BUY VIP ACCESS", "buy")],
    [
      Markup.button.url("📞 Zoom Call", ZOOM_URL),
      Markup.button.url("💬 Telegram Call", TELEGRAM_CALL_URL),
    ],
    [Markup.button.webApp("🌐 OPEN WEBSITE", WEBSITE_URL)],
    [Markup.button.callback("↩ BACK", "main")],
  ]);
} // ➡️⬇️↕️↗️⬆️⬅️

function userInline() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("🔐 OPEN ACCESS", "access")],
    [
      Markup.button.url("📞 Zoom Call", ZOOM_URL),
      Markup.button.url("💬 Telegram Call", TELEGRAM_CALL_URL),
    ],
    [Markup.button.webApp("🌐 OPEN WEBSITE", WEBSITE_URL)],
    [Markup.button.callback("↩ BACK", "main")],
  ]);
} // ➡️⬇️↕️↗️⬆️⬅️

async function safeEditOrReply(ctx, text, extra) {
  const payload = {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  };

  try {
    if (ctx.callbackQuery?.message?.text) {
      await ctx.editMessageText(text, payload);
      return;
    } // ➡️⬇️↕️↗️⬆️⬅️

    if (ctx.callbackQuery?.message?.caption) {
      await ctx.editMessageCaption(text, payload);
      return;
    } // ➡️⬇️↕️↗️⬆️⬅️
  } catch (error) {
    console.error("EDIT FALLBACK:", error);
  } // ➡️⬇️↕️↗️⬆️⬅️

  await ctx.reply(text, payload);
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendStartVideo(ctx) {
  await ctx.replyWithVideo(
    { url: VIDEO_URL },
    {
      caption: `🎥 <b>Down to a video call?</b>

Here’s the link, hop on whenever you’re ready.

Still horny?

Choose an option below.`,
      parse_mode: "HTML",
      ...mainInline(),
    }
  );
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendMain(ctx) {
  await safeEditOrReply(
    ctx,
    `🔥 <b>FX | WEBSITE</b>

Premium access panel.

Use the call buttons, buy access, or open the site directly.`,
    mainInline()
  );
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendVip(ctx) {
  await safeEditOrReply(
    ctx,
    `👑 <b>VIP ACCESS</b>

Plan
<b>${PLAN_NAME}</b>

Includes:
• premium access
• direct website entry
• fast call entry

Use the button below to continue.`,
    vipInline()
  );
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendUser(ctx) {
  await safeEditOrReply(
    ctx,
    `🧊 <b>X-USER</b>

Basic entry panel.

You can open the website, jump into a video call, or continue to access sections.`,
    userInline()
  );
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendAccess(ctx) {
  await safeEditOrReply(
    ctx,
    `🔐 <b>ACCESS OPEN</b>

Plan
<b>${PLAN_NAME}</b>

Choose a section below.`,
    accessInline()
  );
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendFeed(ctx) {
  await safeEditOrReply(
    ctx,
    `📺 <b>FEED</b>

Selected drops
Public previews
Featured content`,
    accessInline()
  );
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendPhotos(ctx) {
  await safeEditOrReply(
    ctx,
    `📸 <b>PHOTOS</b>

Unlocked visual section
Private gallery access`,
    accessInline()
  );
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendCloud(ctx) {
  await safeEditOrReply(
    ctx,
    `🌩️ <b>VIDEOCLOUDS</b>

Ambient room
Visual session
Cloud access enabled`,
    accessInline()
  );
} // ➡️⬇️↕️↗️⬆️⬅️

async function sendGifts(ctx) {
  await safeEditOrReply(
    ctx,
    `🎁 <b>GIFTS</b>

Support section
Transfer section
Additional access support`,
    accessInline()
  );
} // ➡️⬇️↕️↗️⬆️⬅️

bot.start(async (ctx) => {
  await sendStartVideo(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.command("help", async (ctx) => {
  await ctx.reply(
    `FX | WEBSITE

Commands available:
/start
/help`,
    {
      disable_web_page_preview: true,
      ...mainInline(),
    }
  );
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("main", async (ctx) => {
  await ctx.answerCbQuery("Updated");
  await sendMain(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("vip", async (ctx) => {
  await ctx.answerCbQuery();
  await sendVip(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("user", async (ctx) => {
  await ctx.answerCbQuery();
  await sendUser(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("access", async (ctx) => {
  await ctx.answerCbQuery();
  await sendAccess(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("feed", async (ctx) => {
  await ctx.answerCbQuery();
  await sendFeed(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("photos", async (ctx) => {
  await ctx.answerCbQuery();
  await sendPhotos(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("cloud", async (ctx) => {
  await ctx.answerCbQuery();
  await sendCloud(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("gifts", async (ctx) => {
  await ctx.answerCbQuery();
  await sendGifts(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.action("buy", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.replyWithInvoice({
    title: PLAN_NAME,
    description: "Full access to Fx Website",
    payload: "fx_vip_access",
    provider_token: "",
    currency: "XTR",
    prices: [{ label: PLAN_NAME, amount: PRICE_STARS }],
  });
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.on("successful_payment", async (ctx) => {
  const amount = ctx.message.successful_payment.total_amount;

  await ctx.reply(
    `✅ <b>PAYMENT SUCCESSFUL</b>

Amount
<b>${amount} Stars</b>

Access granted.`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("🔥 ENTER NOW", WEBSITE_URL)],
        [
          Markup.button.url("📞 Zoom Call", ZOOM_URL),
          Markup.button.url("💬 Telegram Call", TELEGRAM_CALL_URL),
        ],
      ]),
    }
  );
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();

  if (text === "/start" || text === "/help") {
    return;
  } // ➡️⬇️↕️↗️⬆️⬅️

  await sendMain(ctx);
}); // ➡️⬇️↕️↗️⬆️⬅️

bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
}); // ➡️⬇️↕️↗️⬆️⬅️

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      message: "Telegram endpoint alive",
    });
  } // ➡️⬇️↕️↗️⬆️⬅️

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      method: req.method,
    });
  } // ➡️⬇️↕️↗️⬆️⬅️

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
  } // ➡️⬇️↕️↗️⬆️⬅️
} // ➡️⬇️↕️↗️⬆️⬅️
