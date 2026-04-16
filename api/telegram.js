import path from "path";
import { Telegraf, Markup, Input } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const CONTACT_URL = "https://t.me/User18fx";
const TELEGRAM_CALL_URL = "https://t.me/User18fx";

const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+E4X5V3IlygxhMGQx";

/* BOTONES NUEVOS */
const BTN_USER = "👑[𝐗-𝐔𝐬𝐞𝐫]";
const BTN_VIP = "🔥[𝐕-𝐯𝐢𝐩]";
const BTN_VIDEOCALL = "ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_WEBSITE = "ᴡᴇʙꜱɪᴛᴇ";
const BTN_REFRESH = "↺ ʀᴇꜰʀᴇꜱʜ";
const BTN_CHANNELS = "ᴄʜᴀɴɴᴇʟꜱ";

const BTN_BACK = "← BACK";
const BTN_EXIT = "⏎ MENU";
const BTN_SEND_PHOTO_VIDEO = "📤 SEND PHOTO / VIDEO";
const BTN_CANCEL_VIDEO = "✖ CANCEL";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);
const asset = (file) => path.join(process.cwd(), "assets", file);

/* ESTADO */
const pendingVideoRequests = new Map();

/* KEYBOARDS */
function getMainKeyboard() {
  return Markup.keyboard(
    [
      [BTN_USER, BTN_VIP],
      [BTN_VIDEOCALL],
      [BTN_WEBSITE],
      [BTN_REFRESH],
      [BTN_CHANNELS],
    ],
    { columns: 1 }
  ).resize();
}

function getChannelsKeyboard() {
  return Markup.keyboard(
    [
      ["Userfx", "Smokelandia"],
      [BTN_EXIT],
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

/* MENSAJES */
async function sendMainMenu(ctx) {
  await ctx.reply("FX MENU", getMainKeyboard());
}

/* CHANNELS */
async function sendChannelsPanel(ctx) {
  await ctx.replyWithVideo(
    Input.fromLocalFile(asset("websiteFx.mp4")),
    { caption: "ᴄʜᴀɴɴᴇʟꜱ" }
  );

  await ctx.reply("‎", getChannelsKeyboard());
}

/* VIDEOCALL */
async function startVideoCallFlow(ctx) {
  const userId = String(ctx.from?.id || "");

  pendingVideoRequests.set(userId, {
    waitingForMedia: true,
    awaitingAdminApproval: false,
    waitingForPlatform: false,
  });

  await ctx.replyWithPhoto(Input.fromLocalFile(asset("videocall.jpeg")), {
    caption: `SEND ONE PHOTO OR VIDEO`,
  });

  await ctx.reply("‎", getVideoRequestKeyboard());
}

async function sendSelectedPlatformLink(ctx, platform) {
  if (platform === "zoom") {
    await ctx.reply("OPEN ZOOM", {
      reply_markup: {
        inline_keyboard: [[{ text: "ENTER ZOOM", url: ZOOM_URL }]],
      },
    });
  } else {
    await ctx.reply("OPEN TELEGRAM", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "OPEN TELEGRAM", url: TELEGRAM_CALL_URL }],
        ],
      },
    });
  }

  await ctx.reply("‎", getMainKeyboard());
}

/* HANDLERS */
bot.start(sendMainMenu);

bot.hears(BTN_USER, async (ctx) => {
  await ctx.reply("USER MODE");
});

bot.hears(BTN_VIP, async (ctx) => {
  await ctx.reply("VIP MODE");
});

bot.hears(BTN_VIDEOCALL, startVideoCallFlow);
bot.hears(BTN_CHANNELS, sendChannelsPanel);
bot.hears(BTN_WEBSITE, (ctx) =>
  ctx.reply("OPEN WEBSITE", {
    reply_markup: {
      inline_keyboard: [[{ text: "🌐 OPEN", url: WEBSITE_URL }]],
    },
  })
);

bot.hears(BTN_REFRESH, sendMainMenu);
bot.hears(BTN_EXIT, sendMainMenu);

/* CHANNEL BUTTONS */
bot.hears("Userfx", async (ctx) => {
  await ctx.reply("USERFX", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "OPEN USER", url: USER_GROUP_LINK }],
      ],
    },
  });
});

bot.hears("Smokelandia", async (ctx) => {
  await ctx.reply("SMOKELANDIA", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "OPEN SMKL", url: SMOKELANDIA_GROUP_LINK }],
      ],
    },
  });
});

/* MEDIA */
bot.on("photo", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForMedia) return;

  pending.waitingForMedia = false;
  pending.awaitingAdminApproval = true;

  await ctx.reply("MEDIA RECEIVED. WAIT APPROVAL.");
});

bot.action(/^approve_video_(.+)$/, async (ctx) => {
  const requesterId = String(ctx.match[1]);

  pendingVideoRequests.set(requesterId, {
    waitingForPlatform: true,
  });

  await bot.telegram.sendMessage(
    requesterId,
    "APPROVED",
    getVideoPlatformInlineKeyboard()
  );
});

bot.action("choose_platform_zoom", async (ctx) => {
  await sendSelectedPlatformLink(ctx, "zoom");
});

bot.action("choose_platform_telegram", async (ctx) => {
  await sendSelectedPlatformLink(ctx, "telegram");
});

/* SERVER */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);
    res.status(200).end();
  } catch (e) {
    res.status(500).end();
  }
}