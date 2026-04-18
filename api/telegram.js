import path from "path";
import { Telegraf, Markup, Input } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const TELEGRAM_CALL_URL = "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY";

const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/SmokelandiaFx_bot";

const VIP_STARS_PRICE = 1500;
const USER_STARS_PRICE = 500;

const VIP_PAYLOAD = "vip_fx_access";
const USER_PAYLOAD = "user_fx_access";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);
const asset = (file) => path.join(process.cwd(), "assets", file);

const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests || new Map();

if (!globalThis.__fxPendingVideoRequests) {
  globalThis.__fxPendingVideoRequests = pendingVideoRequests;
} 

const paidUsers = globalThis.__fxPaidUsers || new Map();

if (!globalThis.__fxPaidUsers) {
  globalThis.__fxPaidUsers = paidUsers;
} 

const BTN_VIDEOCALL = "📞 ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_GET_FULL_ACCESS = "🔥 ɢᴇᴛ ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ";
const BTN_VIP = "⚡ ᴠɪᴘ";
const BTN_USER = "👑 𝐔𝐬𝐞𝐫 Ŧҳ";
const BTN_CHANNELS = "📺 ᴄʜᴀɴɴᴇʟꜱ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";

const BTN_ZOOM = "📞 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "💬 ᴛᴇʟᴇɢʀᴀᴍ";
const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_BACK_MENU = "↽ ʙᴀᴄᴋ";

const BTN_PAY_STARS_VIP = "⭐ ᴘᴀʏ ᴠɪᴘ";
const BTN_PAY_STARS_USER = "⭐ ᴘᴀʏ ᴜꜱᴇʀ";

const BTN_SMOKELANDIA = "☁️ｓｍｏｋｅｌａｎｄｉａ";
const BTN_USERFX_SITE = "👑 𝐔𝐬𝐞𝐫 Ŧҳ ᴡᴇʙꜱɪᴛᴇ";
const BTN_CHANNELS_BACK = "↽ ʙᴀᴄᴋ";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
} 

function getUserMeta(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "No name";
  const username = from?.username ? `@${from.username}` : "sin_username";
  const id = String(from?.id || "");
  return { fullName, username, id };
} 

function getMainKeyboard() {
  return Markup.keyboard(
    [
      [BTN_VIDEOCALL],
      [BTN_GET_FULL_ACCESS],
      [BTN_VIP, BTN_USER],
      [BTN_CHANNELS],
      [BTN_REFRESH],
    ],
    { columns: 2 }
  ).resize();
} 

function getPendingPhotoKeyboard() {
  return Markup.keyboard([[BTN_CANCEL]], {
    columns: 1,
  }).resize();
} 

function getApprovedVideocallKeyboard() {
  return Markup.keyboard(
    [
      [BTN_ZOOM, BTN_TELEGRAM],
      [BTN_BACK_MENU],
    ],
    { columns: 2 }
  ).resize();
} 

function getStarsVipKeyboard() {
  return Markup.keyboard([[BTN_PAY_STARS_VIP], [BTN_BACK_MENU]], {
    columns: 1,
  }).resize();
} 

function getStarsUserKeyboard() {
  return Markup.keyboard([[BTN_PAY_STARS_USER], [BTN_BACK_MENU]], {
    columns: 1,
  }).resize();
} 

function getChannelsKeyboard() {
  return Markup.keyboard(
    [
      [BTN_SMOKELANDIA, BTN_USERFX_SITE],
      [BTN_CHANNELS_BACK],
    ],
    { columns: 2 }
  ).resize();
} 

function getAdminApprovalButtons(requesterId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ ᴀᴘᴘʀᴏᴠᴇ",
            callback_data: `approve_video_${requesterId}`,
          },
          {
            text: "❌ ʀᴇᴊᴇᴄᴛ",
            callback_data: `reject_video_${requesterId}`,
          },
        ],
      ],
    },
  };
} 

function getSmokelandiaChannelButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "☁️ ᴇɴᴛᴇʀ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ", url: SMOKELANDIA_GROUP_LINK }],
      ],
    },
  };
} 

function getUserFxChannelButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "👑 ᴇɴᴛᴇʀ 𝐔𝐬𝐞𝐫 Ŧҳ", url: USER_GROUP_LINK }],
      ],
    },
  };
} 

function getAccessState(userId) {
  const entry = paidUsers.get(String(userId));
  return {
    hasVip: entry?.tier === "vip",
    hasUser: entry?.tier === "user" || entry?.tier === "vip",
  };
} 

async function safeDeleteMessage(ctx) {
  try {
    await ctx.deleteMessage();
  } catch {
    // ignore
  }
} 

async function sendMainPanel(ctx) {
  await ctx.reply(
    `Ŧҳ | ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ

ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ. ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`,
    getMainKeyboard()
  );
} 

async function sendMembershipPanel(ctx) {
  await ctx.reply(
    `🔥 ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ

👑 ʙᴇɴᴇꜰɪᴛꜱ
⇀ ᴘʀɪᴏʀɪᴛʏ ᴀᴄᴄᴇꜱꜱ
⇀ ᴘʀɪᴠᴀᴛᴇ ᴜɴʟᴏᴄᴋꜱ
⇀ ᴡᴇᴇᴋ¹ / ᴀʟʙᴜᴍ¹

⚡ ʙᴇɴᴇꜰɪᴛꜱ
⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
⇀ ᴘʀᴇᴍɪᴜᴍ ꜱᴇᴄᴛɪᴏɴꜱ
⇀ ᴡᴇᴇᴋꜱ³ / ᴀʟʙᴜᴍꜱ³`,
    getMainKeyboard()
  );
} 

async function sendVipPanel(ctx) {
  await ctx.reply(
    `⚡ ᴠɪᴘ

ᴜɴʟᴏᴄᴋ ᴠɪᴘ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.`,
    getStarsVipKeyboard()
  );
} 

async function sendUserPanel(ctx) {
  await ctx.reply(
    `👑 𝐔𝐬𝐞𝐫 Ŧҳ

ᴜɴʟᴏᴄᴋ ᴜꜱᴇʀ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.`,
    getStarsUserKeyboard()
  );
} 

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `📺 ᴄʜᴀɴɴᴇʟꜱ

ᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`,
    getChannelsKeyboard()
  );
} 

async function sendRefreshPanel(ctx) {
  const { hasVip, hasUser } = getAccessState(ctx.from?.id);
  const tier = hasVip ? "⚡ ᴠɪᴘ" : hasUser ? "👑 𝐔𝐬𝐞𝐫 Ŧҳ" : "ɴᴏ ᴘʟᴀɴ";
  await ctx.reply(
    `↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ

ᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}`,
    getMainKeyboard()
  );
} 

async function sendSmokelandiaChannelPanel(ctx) {
  await ctx.replyWithPhoto(Input.fromLocalFile(asset("USERFX-ID18V20.jpg")), {
    caption: `☁️ｓｍｏｋｅｌａｎｄｉａ

ᴘʀɪᴠᴀᴛᴇ ꜱᴍᴏᴋᴇ ʀᴏᴏᴍ ʀᴇᴀᴅʏ.`,
    ...getSmokelandiaChannelButton(),
  });

  await ctx.reply("‎", getChannelsKeyboard());
} 

async function sendUserFxChannelPanel(ctx) {
  await ctx.replyWithPhoto(Input.fromLocalFile(asset("videocall.jpeg")), {
    caption: `👑 𝐔𝐬𝐞𝐫 Ŧҳ

ᴘʀɪᴠᴀᴛᴇ ʀᴏᴜᴛᴇ ʀᴇᴀᴅʏ.`,
    ...getUserFxChannelButton(),
  });

  await ctx.reply("‎", getChannelsKeyboard());
} 

async function openVideocallFlow(ctx) {
  const userId = String(ctx.from?.id || "");
  if (!userId) return;

  pendingVideoRequests.set(userId, {
    waitingForPhoto: true,
    awaitingAdminApproval: false,
    invalidTextCount: 0,
    createdAt: Date.now(),
  });

  await safeDeleteMessage(ctx);

  await ctx.replyWithVideo(Input.fromLocalFile(asset("websiteFx.mp4")), {
    caption: `ᴛᴏ ᴜɴʟᴏᴄᴋ ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ, ꜱᴇɴᴅ ᴏɴᴇ ᴄʟᴇᴀʀ ᴘʜᴏᴛᴏ ꜰᴏʀ ɪᴅᴇɴᴛɪᴛʏ ᴄʜᴇᴄᴋ.

ᴀꜰᴛᴇʀ ᴀᴘᴘʀᴏᴠᴀʟ, ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʙᴜᴛᴛᴏɴꜱ.`,
    ...getPendingPhotoKeyboard(),
  });

  const user = getUserMeta(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📞 <b>New videocall request</b>

Name: <b>${escapeHtml(user.fullName)}</b>
Username: <b>${escapeHtml(user.username)}</b>
ID: <code>${escapeHtml(user.id)}</code>

Waiting for identity photo.`,
    { parse_mode: "HTML" }
  );
} 

async function notifyAdminPhotoReceived(ctx) {
  const user = getUserMeta(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📸 <b>Videocall photo received</b>

Name: <b>${escapeHtml(user.fullName)}</b>
Username: <b>${escapeHtml(user.username)}</b>
ID: <code>${escapeHtml(user.id)}</code>

Approve or reject below.`,
    {
      parse_mode: "HTML",
      ...getAdminApprovalButtons(user.id),
    }
  );
} 

async function sendApprovedVideocallFlow(userId) {
  await bot.telegram.sendMessage(
    userId,
    `✅ ᴀᴘᴘʀᴏᴠᴇᴅ

ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ ᴀᴘᴘʀᴏᴠᴇᴅ.`
  );

  await bot.telegram.sendMessage(
    userId,
    `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.`,
    getApprovedVideocallKeyboard()
  );
} 

async function sendVipInvoice(ctx) {
  await ctx.telegram.sendInvoice(
    ctx.chat.id,
    "⚡ VIP ACCESS",
    "VIP access with Telegram Stars.",
    VIP_PAYLOAD,
    "",
    "XTR",
    [{ label: "VIP ACCESS", amount: VIP_STARS_PRICE }]
  );
} 

async function sendUserInvoice(ctx) {
  await ctx.telegram.sendInvoice(
    ctx.chat.id,
    "👑 USER FX ACCESS",
    "User access with Telegram Stars.",
    USER_PAYLOAD,
    "",
    "XTR",
    [{ label: "USER FX ACCESS", amount: USER_STARS_PRICE }]
  );
} 

async function handleSuccessfulPayment(ctx) {
  const payment = ctx.message?.successful_payment;
  if (!payment) return;

  const userId = String(ctx.from?.id || "");
  const chargeId = payment.telegram_payment_charge_id;

  if (payment.invoice_payload === VIP_PAYLOAD) {
    paidUsers.set(userId, {
      tier: "vip",
      telegramPaymentChargeId: chargeId,
      paidAt: Date.now(),
    });

    await ctx.reply(
      `✅ ᴠɪᴘ ᴀᴄᴛɪᴠᴀᴛᴇᴅ

ʏᴏᴜʀ ᴠɪᴘ ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
    );
    return;
  }

  if (payment.invoice_payload === USER_PAYLOAD) {
    paidUsers.set(userId, {
      tier: "user",
      telegramPaymentChargeId: chargeId,
      paidAt: Date.now(),
    });

    await ctx.reply(
      `✅ 𝐔𝐬𝐞𝐫 Ŧҳ ᴀᴄᴛɪᴠᴀᴛᴇᴅ

ʏᴏᴜʀ ᴜꜱᴇʀ ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
    );
  }
} 

bot.start(async (ctx) => {
  await sendMainPanel(ctx);
});

bot.command("paysupport", async (ctx) => {
  await ctx.reply(
    `ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ

ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`
  );
}); 

bot.hears(BTN_VIDEOCALL, async (ctx) => {
  await openVideocallFlow(ctx);
}); 

bot.hears(BTN_GET_FULL_ACCESS, async (ctx) => {
  await sendMembershipPanel(ctx);
}); 

bot.hears(BTN_VIP, async (ctx) => {
  await sendVipPanel(ctx);
}); 

bot.hears(BTN_USER, async (ctx) => {
  await sendUserPanel(ctx);
}); 

bot.hears(BTN_CHANNELS, async (ctx) => {
  await sendChannelsPanel(ctx);
}); 

bot.hears(BTN_REFRESH, async (ctx) => {
  await sendRefreshPanel(ctx);
}); 

bot.hears(BTN_PAY_STARS_VIP, async (ctx) => {
  await sendVipInvoice(ctx);
}); 

bot.hears(BTN_PAY_STARS_USER, async (ctx) => {
  await sendUserInvoice(ctx);
}); 

bot.hears(BTN_SMOKELANDIA, async (ctx) => {
  await sendSmokelandiaChannelPanel(ctx);
}); 

bot.hears(BTN_USERFX_SITE, async (ctx) => {
  await sendUserFxChannelPanel(ctx);
}); 

bot.hears(BTN_CHANNELS_BACK, async (ctx) => {
  await sendMainPanel(ctx);
}); 

bot.hears(BTN_CANCEL, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
  await sendMainPanel(ctx);
}); 

bot.hears(BTN_BACK_MENU, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
  await sendMainPanel(ctx);
}); 

bot.hears(BTN_ZOOM, async (ctx) => {
  await ctx.reply(`ᴏᴘᴇɴ ᴢᴏᴏᴍ ʜᴇʀᴇ: ${ZOOM_URL}`, {
    reply_markup: {
      inline_keyboard: [[{ text: "📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ", url: ZOOM_URL }]],
    },
  });
}); 

bot.hears(BTN_TELEGRAM, async (ctx) => {
  await ctx.reply(`ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ ʜᴇʀᴇ: ${TELEGRAM_CALL_URL}`, {
    reply_markup: {
      inline_keyboard: [[{ text: "💬 ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ", url: TELEGRAM_CALL_URL }]],
    },
  });
}); 

bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
}); 

bot.on("photo", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForPhoto) return;

  pending.waitingForPhoto = false;
  pending.awaitingAdminApproval = true;
  pendingVideoRequests.set(userId, pending);

  await notifyAdminPhotoReceived(ctx);

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await ctx.reply(
    `✅ ᴘʜᴏᴛᴏ ʀᴇᴄᴇɪᴠᴇᴅ.

ʏᴏᴜʀ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇQᴜᴇꜱᴛ ɪꜱ ᴜɴᴅᴇʀ ʀᴇᴠɪᴇᴡ.`
  );
}); 

bot.on("message", async (ctx, next) => {
  if (ctx.message?.successful_payment) {
    await handleSuccessfulPayment(ctx);
    return;
  }

  await next();
}); 

bot.action(/^approve_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("ᴀᴘᴘʀᴏᴠᴇᴅ");

  const requesterId = String(ctx.match[1]);
  const pending = pendingVideoRequests.get(requesterId);

  if (!pending) {
    await ctx.reply("ʀᴇQᴜᴇꜱᴛ ɴᴏᴛ ꜰᴏᴜɴᴅ.");
    return;
  }

  pendingVideoRequests.delete(requesterId);
  await sendApprovedVideocallFlow(requesterId);
}); 

bot.action(/^reject_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("ʀᴇᴊᴇᴄᴛᴇᴅ");

  const requesterId = String(ctx.match[1]);
  pendingVideoRequests.delete(requesterId);

  await bot.telegram.sendMessage(
    requesterId,
    `⏳ ɪ'ᴍ ʙᴜꜱʏ ʀɪɢʜᴛ ɴᴏᴡ. ᴛʀʏ ᴀɢᴀɪɴ ꜱᴏᴏɴ.`,
    getMainKeyboard()
  );
}); 

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  const knownInputs = [
    "/start",
    "/paysupport",
    BTN_VIDEOCALL,
    BTN_GET_FULL_ACCESS,
    BTN_VIP,
    BTN_USER,
    BTN_CHANNELS,
    BTN_REFRESH,
    BTN_ZOOM,
    BTN_TELEGRAM,
    BTN_CANCEL,
    BTN_BACK_MENU,
    BTN_PAY_STARS_VIP,
    BTN_PAY_STARS_USER,
    BTN_SMOKELANDIA,
    BTN_USERFX_SITE,
    BTN_CHANNELS_BACK,
  ];

  if (knownInputs.includes(text)) return;

  if (pending?.waitingForPhoto) {
    pending.invalidTextCount = (pending.invalidTextCount || 0) + 1;
    pendingVideoRequests.set(userId, pending);

    if (pending.invalidTextCount >= 4) {
      pendingVideoRequests.delete(userId);
      await ctx.reply("ʀᴇQᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ.");
      await sendMainPanel(ctx);
      return;
    }

    await ctx.reply("ꜱᴇɴᴅ ᴏɴᴇ ᴘʜᴏᴛᴏ ᴛᴏ ʀᴇᴄᴇɪᴠᴇ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ.");
    return;
  }

  await sendMainPanel(ctx);
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
