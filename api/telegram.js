import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL = "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";

const USER_BOT_URL = "https://t.me/User18fxbot?start=userchannel";
const SMOKELANDIA_BOT_URL = "https://t.me/Smokelandiabot?start=smokelandiachannel";

const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+E4X5V3IlygxhMGQx";
const USER_PAYMENT_URL = "https://paypal.me/user1801FX?country.x=CA&locale.x=en_US";
const VIP_PAYMENT_URL = "https://paypal.me/user1801FX?country.x=CA&locale.x=en_US";

import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";

const CONTACT_URL = "https://t.me/User18fx";

const USER_PAYMENT_URL = "https://TU_LINK_DE_PAGO_USER_3";
const VIP_PAYMENT_URL = "https://TU_LINK_DE_PAGO_VIP_12";

const USER_BOT_URL = "https://t.me/User18fxbot?start=userchannel";
const SMOKELANDIA_BOT_URL = "https://t.me/Smokelandiabot?start=smokelandiachannel";

const USER_CHANNEL_LINK = "https://t.me/TU_CANAL_USER";
const SMOKELANDIA_CHANNEL_LINK = "https://t.me/TU_CANAL_SMOKELANDIA";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);

const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests || new Map();

if (!globalThis.__fxPendingVideoRequests) {
  globalThis.__fxPendingVideoRequests = pendingVideoRequests;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getRequesterData(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "No name";
  const username = from?.username ? `@${from.username}` : "sin_username";
  const id = String(from?.id || "");
  return { fullName, username, id };
}

function getMainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "👑 X / USER", callback_data: "mode_user" },
          { text: "🔥 V / VIP", callback_data: "mode_vip" },
        ],
        [
          { text: "📞 VIDEOCALL", callback_data: "videocall_start" },
          { text: "🖥 CHANNELS", callback_data: "open_channels" },
        ],
        [
          { text: "🌐 WEBSITE", url: WEBSITE_URL },
          { text: "↺", callback_data: "refresh_menu" },
        ],
      ],
    },
  };
}

function getBackKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "⏎", callback_data: "back_main" }]],
    },
  };
}

function getVipModeKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💳 $12", url: VIP_PAYMENT_URL },
          { text: "💬", url: CONTACT_URL },
        ],
        [{ text: "⏎", callback_data: "back_main" }],
      ],
    },
  };
}

function getUserModeKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⭐ 300 XTR", callback_data: "buy_user_stars" }],
        [{ text: "⏎", callback_data: "back_main" }],
      ],
    },
  };
}

function getVipModeKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "⭐ 1200 XTR", callback_data: "buy_vip_stars" },
          { text: "💬", url: "https://t.me/User18fx" },
        ],
        [{ text: "⏎", callback_data: "back_main" }],
      ],
    },
  };
}

function getZoomKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📹 ENTER ZOOM", url: ZOOM_URL },
          { text: "🌐 WEBSITE", url: WEBSITE_URL },
        ],
        [{ text: "⏎", callback_data: "back_main" }],
      ],
    },
  };
}

function getChannelsKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🤖👑", url: USER_BOT_URL },
          { text: "🤖🌩️", url: SMOKELANDIA_BOT_URL },
        ],
        [
          { text: "📺", url: USER_CHANNEL_LINK },
          { text: "📺", url: SMOKELANDIA_CHANNEL_LINK },
        ],
        [{ text: "⏎", callback_data: "back_main" }],
      ],
    },
  };
}

function buildWelcomeText() {
  return `•╦————————————╦•
        🜲 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲

<blockquote>Choose your mode and continue below.

ꜰᴇᴀᴛᴜʀᴇꜱ ɪʟɪᴍɪᴛ 🧩
📲ɴᴇᴡ ᴘɪᴄꜱ ᴇᴠᴇʀʏ ᴡᴇᴇᴋ
ᴀᴄᴄᴇꜱꜱ ᴛᴏ ᴠɪᴅᴇᴏ-ᴄʜᴀᴛ 📹
ᴇɴᴊᴏʏ ɪᴛ ..</blockquote>

•╩————————————╩•`;
}

function buildVipCard() {
  return `•╦————————————╦•
        🜲 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
<blockquote>🔥 V / VIP

⇀ Price  $12
⇀ Access  Unlimited
⇀ Status  Active</blockquote>
•╩————————————╩•`;
}


async function sendVipStarsInvoice(ctx) {
  await ctx.replyWithInvoice({
    title: "V / VIP",
    description: "Unlimited access",
    payload: "membership_vip",
    currency: "XTR",
    prices: [{ label: "V / VIP", amount: 1200 }],
    provider_token: "",
    start_parameter: "buy-vip-stars",
  });
}
async function sendUserStarsInvoice(ctx) {
  await ctx.replyWithInvoice({
    title: "X / USER",
    description: "Premium access",
    payload: "membership_user",
    currency: "XTR",
    prices: [{ label: "X / USER", amount: 300 }],
    provider_token: "",
    start_parameter: "buy-user-stars",
  });
}

async function notifyAdminNewRequest(ctx) {
  const requester = getRequesterData(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📞 <b>Nueva solicitud de videollamada</b>

Nombre: <b>${escapeHtml(requester.fullName)}</b>
Usuario: <b>${escapeHtml(requester.username)}</b>
ID: <code>${escapeHtml(requester.id)}</code>`,
    { parse_mode: "HTML" }
  );
}

async function notifyAdminMediaReceived(ctx, label = "Fotos") {
  const requester = getRequesterData(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📷 <b>${escapeHtml(label)} recibidas</b>

Nombre: <b>${escapeHtml(requester.fullName)}</b>
Usuario: <b>${escapeHtml(requester.username)}</b>
ID: <code>${escapeHtml(requester.id)}</code>`,
    { parse_mode: "HTML" }
  );
}

async function sendMainMenu(ctx) {
  await ctx.reply(buildWelcomeText(), {
    parse_mode: "HTML",
    ...getMainMenuKeyboard(),
  });
}

async function sendVipMode(ctx) {
  await ctx.reply(buildVipCard(), {
    parse_mode: "HTML",
    ...getVipModeKeyboard(),
  });
}
bot.action("buy_user_stars", async (ctx) => {
  await ctx.answerCbQuery();
  await sendUserStarsInvoice(ctx);
});

bot.action("buy_vip_stars", async (ctx) => {
  await ctx.answerCbQuery();
  await sendVipStarsInvoice(ctx);
});

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `🖥 <b>CHANNELS</b>

Choose where to continue.`,
    {
      parse_mode: "HTML",
      ...getChannelsKeyboard(),
    }
  );
}

async function startVideoCallFlow(ctx) {
  const userId = String(ctx.from?.id || "");

  if (!userId) {
    await ctx.reply("Unable to identify your account.");
    return;
  }

  pendingVideoRequests.set(userId, {
    waitingForMedia: true,
    invalidTextCount: 0,
    createdAt: Date.now(),
  });

  await notifyAdminNewRequest(ctx);

  await ctx.reply(
    `📹 <b>Videocall request received</b>

Send one photo or video to continue.`,
    {
      parse_mode: "HTML",
      reply_markup: { remove_keyboard: true },
    }
  );
}

async function completeMediaFlow(ctx, label = "File") {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);

  await ctx.reply(
    `✅ <b>${escapeHtml(label)} received</b>

Continue below.`,
    {
      parse_mode: "HTML",
      ...getZoomKeyboard(),
    }
  );
}

bot.start(async (ctx) => {
  const payload = (ctx.startPayload || "").trim();

  if (payload === "videocall") {
    await startVideoCallFlow(ctx);
    return;
  }

  if (payload === "userchannel") {
    await ctx.reply(
      `•╦————————————╦•
        🜲 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲

<blockquote>Tap below to open the private User group / channel.</blockquote>

•╩————————————╩•`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📺 OPEN USER CHANNEL", url: USER_CHANNEL_LINK }],
          ],
        },
      }
    );
    return;
  }

  if (payload === "smokelandiachannel") {
    await ctx.reply(
      `•╦————————————╦•
        ☁️ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ ☁️

<blockquote>Tap below to open the private Smokelandia group / channel.</blockquote>

•╩————————————╩•`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📺 OPEN SMOKELANDIA", url: SMOKELANDIA_CHANNEL_LINK }],
          ],
        },
      }
    );
    return;
  }

  await sendMainMenu(ctx);
});

bot.command("help", async (ctx) => {
  await sendMainMenu(ctx);
});

bot.command("videocall", async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.action("mode_vip", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(buildVipCard(), {
    parse_mode: "HTML",
    ...getVipModeKeyboard(),
  });
});


bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = payment.invoice_payload;

  if (payload === "membership_user") {
    // activar plan User👑 / X-USER
    // expires_at = ahora + 3 días
  }

  if (payload === "membership_vip") {
    // activar plan User🔥 / V-VIP
    // expires_at = ahora + 1 mes
  }

  await ctx.reply("✅ Payment received. Access enabled.");
});

bot.action("open_channels", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🖥 <b>CHANNELS</b>

Choose where to continue.`,
    {
      parse_mode: "HTML",
      ...getChannelsKeyboard(),
    }
  );
});

bot.action("videocall_start", async (ctx) => {
  await ctx.answerCbQuery();
  await startVideoCallFlow(ctx);
});

bot.action("refresh_menu", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(buildWelcomeText(), {
    parse_mode: "HTML",
    ...getMainMenuKeyboard(),
  });
});

bot.action("back_main", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(buildWelcomeText(), {
    parse_mode: "HTML",
    ...getMainMenuKeyboard(),
  });
});

bot.on("photo", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForMedia) return;

  await notifyAdminMediaReceived(ctx, "Fotos");

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await completeMediaFlow(ctx, "Photos");
});

bot.on("video", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForMedia) return;

  await notifyAdminMediaReceived(ctx, "Video");

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await completeMediaFlow(ctx, "Video");
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  const knownInputs = ["/start", "/help", "/videocall"];

  if (knownInputs.includes(text)) return;

  if (pending?.waitingForMedia) {
    pending.invalidTextCount = (pending.invalidTextCount || 0) + 1;
    pendingVideoRequests.set(userId, pending);

    if (pending.invalidTextCount >= 4) {
      pendingVideoRequests.delete(userId);
      await ctx.reply("Bye.");
      return;
    }

    if (pending.invalidTextCount === 1) {
      await ctx.reply("Send one photo or video to continue.");
    }

    return;
  }

  await ctx.reply("Use the menu.");
});

bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
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
