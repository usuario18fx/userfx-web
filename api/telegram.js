import path from "path";
import { Telegraf, Markup, Input } from "telegraf";

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

/* BOTONES */
const BTN_USER = "👑 [X-user]";
const BTN_VIP = "🔥 [V-vip]";
const BTN_VIDEOCALL = "📞 VIDEOCALL";
const BTN_CHANNELS = "📺 CHANNELS";
const BTN_WEBSITE = "🌐 WEBSITE";
const BTN_REFRESH = "↺ REFRESH";
const BTN_FEED = "📋 FEED";
const BTN_CLOUDS = "☁️ CLOUDS";
const BTN_PHOTOS = "📸 PHOTOS";
const BTN_GIFTS = "🎁 GIFTS";
const BTN_BACK = "← BACK";
const BTN_EXIT = "⏎ MENU";
const BTN_SEND_PHOTO_VIDEO = "📤 SEND PHOTO / VIDEO";
const BTN_CANCEL_VIDEO = "✖ CANCEL";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);

const asset = (file) => path.join(process.cwd(), "assets", file);

/* ESTADO EN MEMORIA */
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

function getVideoRequestKeyboard() {
  return Markup.keyboard(
    [[BTN_SEND_PHOTO_VIDEO], [BTN_CANCEL_VIDEO]],
    { columns: 1 }
  ).resize();
}

function getWebsiteInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🌐 OPEN WEBSITE", url: WEBSITE_URL }]],
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
      inline_keyboard: [
        [{ text: "⭐ 300 XTR", callback_data: "buy_user_stars" }],
      ],
    },
  };
}

function getVipPaymentInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "⭐ 1200 XTR", callback_data: "buy_vip_stars" },
          { text: "💬 CONTACT", url: CONTACT_URL },
        ],
      ],
    },
  };
}

function getVideoPlatformInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📞 ZOOM", callback_data: "choose_platform_zoom" },
          { text: "💬 TELEGRAM", callback_data: "choose_platform_telegram" },
        ],
      ],
    },
  };
}

function getAdminVideoRequestInlineKeyboard(requesterId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "← RETURN USER TO MENU",
            callback_data: `video_back_${requesterId}`,
          },
        ],
      ],
    },
  };
}

function getAdminApprovalKeyboard(requesterId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ APPROVE", callback_data: `approve_video_${requesterId}` },
          { text: "❌ REJECT", callback_data: `reject_video_${requesterId}` },
        ],
        [
          {
            text: "← RETURN USER TO MENU",
            callback_data: `video_back_${requesterId}`,
          },
        ],
      ],
    },
  };
}

function buildWelcomeCaption() {
  return `🧩 ꜰᴇᴀᴛᴜʀᴇꜱ ɪʟɪᴍɪᴛ
📲 ɴᴇᴡ ᴘɪᴄꜱ ᴇᴠᴇʀʏ ᴡᴇᴇᴋ
📹 ᴀᴄᴄᴇꜱꜱ ᴛᴏ ᴠɪᴅᴇᴏ-ᴄʜᴀᴛ
🔥 ᴇɴᴊᴏʏ ɪᴛ`;
}

function buildUserCard(userId) {
  const plan = getPlanDisplay(userId);

  return `•╦————————————╦•
ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
👑 ${plan.label}
⇀ ᴘʀɪᴄᴇ $3
⇀ ꜱᴛᴀᴛᴜꜱ ${plan.planKey === "user" ? plan.status : "Inactive"}
⇀ ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴇɴᴀʙʟᴇᴅ
•╩————————————╩•`;
}

function buildVipCard(userId) {
  const plan = getPlanDisplay(userId);

  return `•╦————————————╦•
ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
🔥 [V-vip]
⇀ ᴘʀɪᴄᴇ $12
⇀ ꜱᴛᴀᴛᴜꜱ ${plan.planKey === "vip" ? plan.status : "Inactive"}
⇀ ᴀᴄᴄᴇꜱꜱ ᴜɴʟɪᴍɪᴛᴇᴅ
•╩————————————╩•`;
}

async function sendUserStarsInvoice(ctx) {
  await ctx.replyWithInvoice({
    title: "X-user",
    description: "Premium access",
    payload: "membership_user",
    currency: "XTR",
    prices: [{ label: "X-user", amount: 300 }],
    provider_token: "",
    start_parameter: "buy-user-stars",
  });
}

async function sendVipStarsInvoice(ctx) {
  await ctx.replyWithInvoice({
    title: "V-vip",
    description: "Unlimited access",
    payload: "membership_vip",
    currency: "XTR",
    prices: [{ label: "V-vip", amount: 1200 }],
    provider_token: "",
    start_parameter: "buy-vip-stars",
  });
}

async function notifyAdminNewRequest(ctx) {
  const requester = getRequesterData(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📞 <b>New videocall request</b>

Nombre: <b>${escapeHtml(requester.fullName)}</b>
Usuario: <b>${escapeHtml(requester.username)}</b>
ID: <code>${escapeHtml(requester.id)}</code>`,
    {
      parse_mode: "HTML",
      ...getAdminVideoRequestInlineKeyboard(requester.id),
    }
  );
}

async function notifyAdminMediaReceived(ctx, label = "Media") {
  const requester = getRequesterData(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📷 <b>${escapeHtml(label)} received</b>

Nombre: <b>${escapeHtml(requester.fullName)}</b>
Usuario: <b>${escapeHtml(requester.username)}</b>
ID: <code>${escapeHtml(requester.id)}</code>

Approve or reject below.`,
    {
      parse_mode: "HTML",
      ...getAdminApprovalKeyboard(requester.id),
    }
  );
}

async function sendMainMenu(ctx) {
  await ctx.reply(buildWelcomeCaption(), getMainKeyboard());
}

async function sendHelpMessage(ctx) {
  await ctx.replyWithPhoto(Input.fromLocalFile(asset("help.jpg")), {
    caption: `🆘
ʜᴇʟᴘ`,
  });

  await ctx.reply("‎", getMainKeyboard());
}

async function sendUserMode(ctx) {
  await ctx.replyWithVideo(Input.fromLocalFile(asset("FX-Y24V01.mp4")), {
    caption: buildUserCard(ctx.from?.id),
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
    `📺 
ᴄʜᴀɴɴᴇʟꜱ`,
    {
      ...getChannelsInlineKeyboard(),
    }
  );

  await ctx.reply("‎", getBackKeyboard());
}

async function sendWebsitePanel(ctx) {
  await ctx.reply(
    `🌐 
ᴡᴇʙꜱɪᴛᴇ`,
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
    `📋 ꜰᴇᴇᴅ
➥ ꜱᴇʟᴇᴄᴛᴇᴅ ᴅʀᴏᴘꜱ
➥ ᴘᴜʙʟɪᴄ ᴘʀᴇᴠɪᴇᴡꜱ
➥ ꜰᴇᴀᴛᴜʀᴇᴅ ᴄᴏɴᴛᴇɴᴛ`,
    {
      ...getWebsiteInlineKeyboard(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendCloudsMessage(ctx) {
  await ctx.replyWithVideo(
    Input.fromLocalFile(asset("welcome-smkl.mp4")),
    {
      caption: `ᴄʟᴏᴜᴅꜱ
☁️
ᴀᴍʙɪᴇɴᴛ ʀᴏᴏᴍ`,
      ...getWebsiteInlineKeyboard(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  await ctx.replyWithPhoto(
    Input.fromLocalFile(asset("USERFX-ID18V20.jpg")),
    {
      caption: `ᴘʜᴏᴛᴏꜱ
📸
➥ɴᴇᴡ ᴘɪᴄꜱ ᴇᴠᴇʀʏ ᴡᴇᴇᴋ
➥ᴘʀɪᴠᴀᴛᴇ ɢᴀʟʟᴇʀʏ ᴀᴄᴄᴇꜱꜱ`,
      ...getWebsiteInlineKeyboard(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  await ctx.replyWithPhoto(Input.fromLocalFile(asset("gifts.jpg")), {
    caption: `🎁
ɢɪꜰᴛꜱ
➥ ꜱᴜᴘᴘᴏʀᴛ ꜱᴇᴄᴛɪᴏɴ ᴛʀᴀɴꜱꜰᴇʀ
➥ ꜱᴇᴄᴛɪᴏɴ ᴀᴅᴅɪᴛɪᴏɴᴀʟ
➥ ᴀᴄᴄᴇꜱꜱ ꜱᴜᴘᴘᴏʀᴛ`,
    ...getWebsiteInlineKeyboard(),
  });

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
    awaitingAdminApproval: false,
    waitingForPlatform: false,
    invalidTextCount: 0,
    createdAt: Date.now(),
  });

  await notifyAdminNewRequest(ctx);

  await ctx.replyWithPhoto(Input.fromLocalFile(asset("videocall.jpeg")), {
    caption: `•╦————————————╦•
ꜱᴇɴᴅ ᴏɴᴇ ᴘʜᴏᴛᴏ ᴏʀ ᴠɪᴅᴇᴏ ɴᴏᴡ
😏
ꜰɪʀꜱᴛ, ʏᴏᴜʀ ᴍᴜʟᴛɪᴍᴇᴅɪᴀ ᴍᴀᴛᴇʀɪᴀʟ ᴡɪʟʟ ʙᴇ ʀᴇᴠɪᴇᴡᴇᴅ.
ᴛʜᴇɴ ʏᴏᴜ ᴄʜᴏᴏꜱᴇ ʏᴏᴜʀ ᴠɪᴅᴇᴏ ᴘʟᴀᴛꜰᴏʀᴍ..
two buttons:
ZOOM / TELEGRAM
•╩————————————╩•`,
  });

  await ctx.reply("‎", getVideoRequestKeyboard());
}

async function sendSelectedPlatformLink(ctx, platform) {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);

  if (platform === "zoom") {
    await ctx.reply(
      `🔷 ᴢᴏᴏᴍ ꜱᴇʟᴇᴄᴛᴇᴅ
ᴛᴀᴘ ʙᴇʟᴏᴡ ᴛᴏ ᴏᴘᴇɴ ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ʟɪɴᴋ.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🔷 ENTER ZOOM", url: ZOOM_URL }]],
        },
      }
    );
  } else {
    await ctx.reply(
      `📞 ᴛᴇʟᴇɢʀᴀᴍ ꜱᴇʟᴇᴄᴛᴇᴅ
ᴛᴀᴘ ʙᴇʟᴏᴡ ᴛᴏ ᴏᴘᴇɴ ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ʟɪɴᴋ.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📞 OPEN TELEGRAM", url: TELEGRAM_CALL_URL }],
          ],
        },
      }
    );
  }

  await ctx.reply("‎", getBackKeyboard());
}

bot.start(async (ctx) => {
  const payload = (ctx.startPayload || "").trim();

  if (payload === "videocall") {
    await startVideoCallFlow(ctx);
    return;
  }

  if (payload === "userchannel") {
    await ctx.reply(`🜲 ᴜꜱᴇʀ ᴇɴᴛʀʏ`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📺 OPEN USER CHANNEL", url: USER_GROUP_LINK }],
        ],
      },
    });
    return;
  }

  if (payload === "smokelandiachannel") {
    await ctx.replyWithVideo(
      Input.fromLocalFile(asset("welcome-smkl.mp4")),
      {
        caption: `☁️
ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ ᴇɴᴛʀʏ`,
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
  await sendHelpMessage(ctx);
});

bot.command("videocall", async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.hears(["👑 [X-user]", "👑 X-user", "[X-user]", "X-user"], async (ctx) => {
  await sendUserMode(ctx);
});

bot.hears(["🔥 [V-vip]", "🔥 V-vip", "[V-vip]", "V-vip"], async (ctx) => {
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

bot.hears(BTN_SEND_PHOTO_VIDEO, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForMedia) {
    await ctx.reply("No active videocall request.");
    return;
  }

  await ctx.reply("Send one photo or one video now.");
});

bot.hears(BTN_CANCEL_VIDEO, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
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

bot.action("choose_platform_zoom", async (ctx) => {
  await ctx.answerCbQuery();

  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForPlatform) {
    await ctx.reply("This videocall request is no longer active.");
    return;
  }

  await sendSelectedPlatformLink(ctx, "zoom");
});

bot.action("choose_platform_telegram", async (ctx) => {
  await ctx.answerCbQuery();

  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForPlatform) {
    await ctx.reply("This videocall request is no longer active.");
    return;
  }

  await sendSelectedPlatformLink(ctx, "telegram");
});

bot.action(/^approve_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("Approved");

  const requesterId = String(ctx.match[1]);
  const pending = pendingVideoRequests.get(requesterId);

  if (!pending) {
    await ctx.reply("Request no longer exists.");
    return;
  }

  pending.awaitingAdminApproval = false;
  pending.waitingForPlatform = true;
  pendingVideoRequests.set(requesterId, pending);

  await bot.telegram.sendMessage(
    requesterId,
    `•╦————————————╦•
✅ Approved

Choose your call platform below.
•╩————————————╩•`,
    {
      ...getVideoPlatformInlineKeyboard(),
    }
  );
});

bot.action(/^reject_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("Rejected");

  const requesterId = String(ctx.match[1]);
  pendingVideoRequests.delete(requesterId);

  await bot.telegram.sendMessage(
    requesterId,
    `•╦————————————╦•
❌ Request not approved

Return to menu.
•╩————————————╩•`,
    getMainKeyboard()
  );
});

bot.action(/^video_back_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("User returned to menu");

  const requesterId = String(ctx.match[1]);
  pendingVideoRequests.delete(requesterId);

  await bot.telegram.sendMessage(
    requesterId,
    buildWelcomeCaption(),
    getMainKeyboard()
  );
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

  pending.waitingForMedia = false;
  pending.awaitingAdminApproval = true;
  pendingVideoRequests.set(userId, pending);

  await notifyAdminMediaReceived(ctx, "Photo");

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await ctx.reply(
    `•╦————————————╦•
✅ Photo received

Your request is now under review.
Wait for approval.
•╩————————————╩•`
  );
});

bot.on("video", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForMedia) return;

  pending.waitingForMedia = false;
  pending.awaitingAdminApproval = true;
  pendingVideoRequests.set(userId, pending);

  await notifyAdminMediaReceived(ctx, "Video");

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await ctx.reply(
    `•╦————————————╦•
✅ Video received

Your request is now under review.
Wait for approval.
•╩————————————╩•`
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
    BTN_SEND_PHOTO_VIDEO,
    BTN_CANCEL_VIDEO,
    "👑 X-user",
    "[X-user]",
    "X-user",
    "🔥 V-vip",
    "[V-vip]",
    "V-vip",
  ];

  if (knownInputs.includes(text)) {
    return;
  }

  if (pending?.waitingForMedia) {
    pending.invalidTextCount = (pending.invalidTextCount || 0) + 1;
    pendingVideoRequests.set(userId, pending);

    if (pending.invalidTextCount >= 4) {
      pendingVideoRequests.delete(userId);
      await ctx.reply("Videocall request closed.");
      await sendMainMenu(ctx);
      return;
    }

    await ctx.reply("Send one photo or one video to continue.");
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

  console.log("IP:", ip);
  console.log("HEADERS:", req.headers);

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
