import path from "path";
import { Telegraf, Markup, Input } from "telegraf";

const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+E4X5V3IlygxhMGQx";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const TELEGRAM_CALL_URL = "https://t.me/User18fx";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);
const asset = (file) => path.join(process.cwd(), "assets", file);

const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests || new Map();

if (!globalThis.__fxPendingVideoRequests) {
  globalThis.__fxPendingVideoRequests = pendingVideoRequests;
} 

const BTN_PAY_STARS_VIP = "⭐ᴘᴀʏ ᴠɪᴘ";
const BTN_PAY_STARS_USER = "⭐ᴘᴀʏ ᴜꜱᴇʀ";

const BTN_SMOKELANDIA = "☁️ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "👑𝐔𝐬𝐞𝐫 Ŧҳ ᴡᴇʙꜱɪᴛᴇ";
const BTN_CHANNELS_BACK = "↩ ʙᴀᴄᴋ";

const BTN_VIDEOCALL = "📞 ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_GET_FULL_ACCESS = "🔥 ɢᴇᴛ ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ";
const BTN_VIP = "⚡ ᴠɪᴘ";
const BTN_USER = "👑 𝐔𝐬𝐞𝐫 Ŧҳ";
const BTN_CHANNELS = "📺 ᴄʜᴀɴɴᴇʟꜱ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";

const BTN_ZOOM = "📞 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "➢ ᴛᴇʟᴇɢʀᴀᴍ";
const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_BACK_MENU = "↩ ʙᴀᴄᴋ";

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

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "↗ ᴇɴᴛᴇʀ ꜱɪᴛᴇ", url: WEBSITE_URL }]],
    },
  };
} 

function getSmokelandiaChannelButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "☁️ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ ᴄʜᴀɴɴᴇʟ", url: SMOKELANDIA_GROUP_LINK }],
      ],
    },
  };
} 

function getUserFxChannelButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "👑 𝐔𝐬𝐞𝐫 Ŧҳ ᴄʜᴀɴɴᴇʟ", url: USER_GROUP_LINK }]],
    },
  };
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

async function safeDeleteMessage(ctx) {
  try {
    await ctx.deleteMessage();
  } catch {
    
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
👑 ᴘʀɪᴏʀɪᴛʏ ᴀᴄᴄᴇꜱꜱ
👑 ᴘʀɪᴠᴀᴛᴇ ᴜɴʟᴏᴄᴋꜱ
👑 ᴡᴇᴇᴋ¹ / ᴀʟʙᴜᴍ¹

⚡ ʙᴇɴᴇꜰɪᴛꜱ
⚡ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
⚡ ᴘʀᴇᴍɪᴜᴍ ꜱᴇᴄᴛɪᴏɴꜱ
⚡ ᴡᴇᴇᴋꜱ³ / ᴀʟʙᴜᴍꜱ³`,
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
  await ctx.reply(`↻ ʀᴇꜰʀᴇꜱʜᴇᴅ`, getMainKeyboard());
} 

async function sendSmokelandiaChannelPanel(ctx) {
  await ctx.replyWithPhoto(Input.fromLocalFile(asset("USERFX-ID18V20.jpg")), {
    caption: `☁️ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ

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

bot.start(async (ctx) => {
  await sendMainPanel(ctx);
}); 

bot.hears(BTN_PAY_STARS_VIP, async (ctx) => {
  await ctx.reply(`⚡ ᴠɪᴘ ᴘᴀʏᴍᴇɴᴛ ᴡɪᴛʜ ꜱᴛᴀʀꜱ ɢᴏᴇꜱ ʜᴇʀᴇ.`);
}); 

bot.hears(BTN_PAY_STARS_USER, async (ctx) => {
  await ctx.reply(`👑 𝐔𝐬𝐞𝐫 Ŧҳ ᴘᴀʏᴍᴇɴᴛ ᴡɪᴛʜ ꜱᴛᴀʀꜱ ɢᴏᴇꜱ ʜᴇʀᴇ.`);
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

bot.hears(BTN_VIDEOCALL, async (ctx) => {
  await openVideocallFlow(ctx);
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
      inline_keyboard: [[{ text: "➢ ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ", url: TELEGRAM_CALL_URL }]],
    },
  });
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
    `⏳ ɪ'ᴍ ᴅᴏɪɴɢ ꜱᴏᴍᴇ ᴇʀʀᴀɴᴅꜱ, ɪ'ʟʟ ʙᴇ ꜰʀᴇᴇ ꜱᴏᴏɴ.`,
    getMainKeyboard()
  );
}); 

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  const knownInputs = [
    "/start",
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
