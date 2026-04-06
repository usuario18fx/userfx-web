import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const CONTACT_URL = "https://t.me/User18fx";
const TELEGRAM_CALL_URL = "https://t.me/User18fx";

const USER_BOT_URL = "https://t.me/User18fxbot?start=userchannel";
const SMOKELANDIA_BOT_URL =
  "https://t.me/Smokelandiabot?start=smokelandiachannel";

const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+E4X5V3IlygxhMGQx";

/* BOTONES ESTABLES */
const BTN_USER = "👑 [X-user]";
const BTN_VIP = "🔥 [V-vip]";
const BTN_VIDEOCALL = "📞 VIDEOCALL";
const BTN_CHANNELS = "📺 CHANNELS";
const BTN_WEBSITE = "🌐 WEBSITE";
const BTN_REFRESH = "↺";
const BTN_FEED = "📋";
const BTN_CLOUDS = "☁️";
const BTN_PHOTOS = "📸";
const BTN_GIFTS = "🎁";
const BTN_BACK = "←";
const BTN_EXIT = "⏎";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);

const pendingVideoRequests = globalThis.__fxPendingVideoRequests || new Map();
if (!globalThis.__fxPendingVideoRequests) {
  globalThis.__fxPendingVideoRequests = pendingVideoRequests;
}

const memberships = globalThis.__fxMemberships || new Map();
if (!globalThis.__fxMemberships) {
  globalThis.__fxMemberships = memberships;
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

function getMembership(userId) {
  const current = memberships.get(String(userId));
  if (!current) return null;

  if (current.expiresAt && Date.now() > current.expiresAt) {
    memberships.delete(String(userId));
    return null;
  }

  return current;
}

function setMembership(userId, planKey) {
  const now = Date.now();

  const expiresAt =
    planKey === "vip"
      ? now + 30 * 24 * 60 * 60 * 1000
      : now + 3 * 24 * 60 * 60 * 1000;

  const membership = {
    planKey,
    expiresAt,
    paidAt: now,
  };

  memberships.set(String(userId), membership);
  return membership;
}

function getPlanDisplay(userId) {
  const membership = getMembership(userId);

  if (!membership) {
    return {
      label: "[X-user]",
      price: "$3",
      access: "Premium",
      status: "Inactive",
      emoji: "👑",
      planKey: "user",
    };
  }

  if (membership.planKey === "vip") {
    return {
      label: "[V-vip]",
      price: "$12",
      access: "Unlimited",
      status: "Active",
      emoji: "🔥",
      planKey: "vip",
    };
  }

  return {
    label: "[X-user]",
    price: "$3",
    access: "Premium",
    status: "Active",
    emoji: "👑",
    planKey: "user",
  };
}

function getMainKeyboard() {
  return Markup.keyboard(
    [
      [BTN_USER, BTN_VIP],
      [BTN_VIDEOCALL, BTN_CHANNELS],
      [BTN_WEBSITE, BTN_REFRESH],
    ],
    { columns: 2 }
  ).resize();
}

function getBackKeyboard() {
  return Markup.keyboard([[BTN_EXIT]]).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard(
    [
      [BTN_FEED, BTN_CLOUDS],
      [BTN_PHOTOS, BTN_GIFTS],
      [BTN_BACK],
    ],
    { columns: 2 }
  ).resize();
}

function getWebsiteInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🌐 OPEN WEBSITE", url: WEBSITE_URL }]],
    },
  };
}

function getVideoCallKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📞 ENTER ZOOM", url: ZOOM_URL },
          { text: "💬 OPEN TELEGRAM", url: TELEGRAM_CALL_URL },
        ],
        [{ text: "🌐 WEBSITE", url: WEBSITE_URL }],
      ],
    },
  };
}

function getChannelsInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "ᴜꜱᴇʀ🜲Ŧҳ", url: USER_BOT_URL },
          { text: "ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ", url: SMOKELANDIA_BOT_URL },
        ],
      ],
    },
  };
}

function getUserPaymentInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "⭐ 300 XTR", callback_data: "buy_user_stars" }]],
    },
  };
}

function getVipPaymentInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "⭐ 1200 XTR", callback_data: "buy_vip_stars" },
          { text: "💬", url: CONTACT_URL },
        ],
      ],
    },
  };
}

/* AQUÍ SÍ PUEDES DEJAR TU FUENTE FANCY */
function buildWelcomeCaption() {
  return `•╦————————————╦•
 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ🜲

Choose your mode and continue below.

🧩ꜰᴇᴀᴛᴜʀᴇꜱ ɪʟɪᴍɪᴛ
📲ɴᴇᴡ ᴘɪᴄꜱ ᴇᴠᴇʀʏ ᴡᴇᴇᴋ
📹ᴀᴄᴄᴇꜱꜱ ᴛᴏ ᴠɪᴅᴇᴏ-ᴄʜᴀᴛ
🔥ᴇɴᴊᴏʏ ɪᴛ ..

•╩————————————╩•`;
}

function buildUserCard(userId) {
  const plan = getPlanDisplay(userId);

  return `•╦————————————╦•
           ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
👑 ${plan.label}
⇀ Price   $3
⇀ Status  ${plan.planKey === "user" ? plan.status : "Inactive"}
⇀ Access  Premium
•╩————————————╩•`;
}

function buildVipCard(userId) {
  const plan = getPlanDisplay(userId);

  return `•╦————————————╦•
           ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
🔥 [V-vip]
⇀ Price   $12
⇀ Status  ${plan.planKey === "vip" ? plan.status : "Inactive"}
⇀ Access  Unlimited
•╩————————————╩•`;
}

async function sendUserStarsInvoice(ctx) {
  await ctx.replyWithInvoice({
    title: "[X-user]",
    description: "Premium access",
    payload: "membership_user",
    currency: "XTR",
    prices: [{ label: "[X-user]", amount: 300 }],
    provider_token: "",
    start_parameter: "buy-user-stars",
  });
}

async function sendVipStarsInvoice(ctx) {
  await ctx.replyWithInvoice({
    title: "[V-vip]",
    description: "Unlimited access",
    payload: "membership_vip",
    currency: "XTR",
    prices: [{ label: "[V-vip]", amount: 1200 }],
    provider_token: "",
    start_parameter: "buy-vip-stars",
  });
}

function getAdminVideoRequestInlineKeyboard(requesterId) {
  return Markup.inlineKeyboard([
    [{ text: "←", callback_data: `video_back_${requesterId}` }],
  ]);
}

async function notifyAdminNewRequest(ctx) {
  const requester = getRequesterData(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📞 <b>New call request just came in</b>

Nombre: <b>${escapeHtml(requester.fullName)}</b>
Usuario: <b>${escapeHtml(requester.username)}</b>
ID: <code>${escapeHtml(requester.id)}</code>`,
    {
      parse_mode: "HTML",
      ...getAdminVideoRequestInlineKeyboard(requester.id),
    }
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
  await ctx.reply(buildWelcomeCaption(), getMainKeyboard());
}

async function sendUserMode(ctx) {
  await ctx.reply(buildUserCard(ctx.from?.id), {
    ...getUserPaymentInlineKeyboard(),
  });
  await ctx.reply("‎", getBackKeyboard());
}

async function sendVipMode(ctx) {
  await ctx.reply(buildVipCard(ctx.from?.id), {
    ...getVipPaymentInlineKeyboard(),
  });
  await ctx.reply("‎", getBackKeyboard());
}

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `📺 CHANNELS

Choose where to continue.`,
    {
      ...getChannelsInlineKeyboard(),
    }
  );
  await ctx.reply("‎", getBackKeyboard());
}

async function sendWebsitePanel(ctx) {
  await ctx.reply(
    `🌐 WEBSITE

Open the site below.`,
    {
      ...getWebsiteInlineKeyboard(),
    }
  );
  await ctx.reply("‎", getBackKeyboard());
}

async function sendRefreshPanel(ctx) {
  await sendMainMenu(ctx);
}

async function sendFeedMessage(ctx) {
  await ctx.reply(
    `📋 FEED

Selected drops
Public previews
Featured content`,
    {
      ...getWebsiteInlineKeyboard(),
    }
  );
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendCloudsMessage(ctx) {
  await ctx.reply(
    `☁️ CLOUDS

Ambient room
Visual session
Cloud access enabled`,
    {
      ...getWebsiteInlineKeyboard(),
    }
  );
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  await ctx.reply(
    `📸 PHOTOS

New pics every week.
Private gallery access.`,
    {
      ...getWebsiteInlineKeyboard(),
    }
  );
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  await ctx.reply(
    `🎁 GIFTS

Support section
Transfer section
Additional access support`,
    {
      ...getWebsiteInlineKeyboard(),
    }
  );
  await ctx.reply("‎", getAccessKeyboard());
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
    `📹 Videocall request received

Send one photo or video to continue.
Choose Zoom or Telegram after approval.`,
    {
      reply_markup: { remove_keyboard: true },
    }
  );
}

async function completeMediaFlow(ctx, label = "File") {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);

  await ctx.reply(
    `✅ ${escapeHtml(label)} received

Continue below.`,
    {
      ...getVideoCallKeyboard(),
    }
  );
  await ctx.reply("‎", getBackKeyboard());
}

bot.start(async (ctx) => {
  const payload = (ctx.startPayload || "").trim();

  if (payload === "videocall") {
    await startVideoCallFlow(ctx);
    return;
  }

  if (payload === "userchannel") {
    await ctx.reply(
      `🜲 USER ENTRY

Tap below to open the private User channel.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📺 OPEN USER CHANNEL", url: USER_GROUP_LINK }],
          ],
        },
      }
    );
    return;
  }

  if (payload === "smokelandiachannel") {
    await ctx.reply(
      `☁️ SMOKELANDIA ENTRY

Tap below to open the private Smokelandia channel.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📺 OPEN SMOKELANDIA", url: SMOKELANDIA_GROUP_LINK }],
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

bot.hears(BTN_USER, async (ctx) => {
  await sendUserMode(ctx);
});

bot.hears(BTN_VIP, async (ctx) => {
  await sendVipMode(ctx);
});

bot.hears(BTN_VIDEOCALL, async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.hears(BTN_CHANNELS, async (ctx) => {
  await sendChannelsPanel(ctx);
});

bot.hears(BTN_WEBSITE, async (ctx) => {
  await sendWebsitePanel(ctx);
});

bot.hears(BTN_REFRESH, async (ctx) => {
  await sendRefreshPanel(ctx);
});

bot.hears(BTN_FEED, async (ctx) => {
  await sendFeedMessage(ctx);
});

bot.hears(BTN_CLOUDS, async (ctx) => {
  await sendCloudsMessage(ctx);
});

bot.hears(BTN_PHOTOS, async (ctx) => {
  await sendPhotosMessage(ctx);
});

bot.hears(BTN_GIFTS, async (ctx) => {
  await sendGiftsMessage(ctx);
});

bot.hears(BTN_BACK, async (ctx) => {
  await sendMainMenu(ctx);
});

bot.hears(BTN_EXIT, async (ctx) => {
  await sendMainMenu(ctx);
});

bot.action("buy_user_stars", async (ctx) => {
  await ctx.answerCbQuery();
  await sendUserStarsInvoice(ctx);
});

bot.action("buy_vip_stars", async (ctx) => {
  await ctx.answerCbQuery();
  await sendVipStarsInvoice(ctx);
});

bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  const payload = payment.invoice_payload;
  const userId = String(ctx.from?.id || "");

  if (payload === "membership_user") {
    setMembership(userId, "user");
  }

  if (payload === "membership_vip") {
    setMembership(userId, "vip");
  }

  await ctx.reply("✅ Payment received. Access enabled.");
  await ctx.reply("‎", getBackKeyboard());
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

bot.action(/^video_back_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("Usuario devuelto al menú");

  const requesterId = ctx.match[1];
  pendingVideoRequests.delete(String(requesterId));

  await bot.telegram.sendMessage(
    requesterId,
    buildWelcomeCaption(),
    getMainKeyboard()
  );
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  const knownInputs = [
    "/start",
    "/help",
    "/videocall",
    BTN_USER,
    BTN_VIP,
    BTN_VIDEOCALL,
    BTN_CHANNELS,
    BTN_WEBSITE,
    BTN_REFRESH,
    BTN_FEED,
    BTN_CLOUDS,
    BTN_PHOTOS,
    BTN_GIFTS,
    BTN_BACK,
    BTN_EXIT,
  ];

  if (knownInputs.includes(text)) {
    return;
  }

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

  await ctx.reply("Use the keyboard.");
});

bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
});

export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.headers["x-vercel-forwarded-for"] ||
    "unknown";

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      method: req.method,
      message: "Telegram endpoint alive",
      ip,
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      method: req.method,
      ip,
    });
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);

    return res.status(200).json({
      ok: true,
      ip,
    });
  } catch (error) {
    console.error("TELEGRAM HANDLER ERROR:", error);
    return res.status(500).json({
      ok: false,
      error: "handler_error",
      details: String(error?.message || error),
      ip,
    });
  }
}
