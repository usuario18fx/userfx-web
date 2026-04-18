import path from "path";
import { Telegraf, Markup, Input } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

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

const BTN_VIDEOCALL = "📞 Videocall";
const BTN_BACK = "↩️ Back";
const BTN_CANCEL = "✖ Cancel";

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
  return Markup.keyboard([[BTN_VIDEOCALL], [BTN_BACK]], {
    columns: 1,
  }).resize();
}

function getPendingPhotoKeyboard() {
  return Markup.keyboard([[BTN_CANCEL]], {
    columns: 1,
  }).resize();
}

function getApprovedVideocallButtons() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📞 Zoom", url: ZOOM_URL },
          { text: "💬 Telegram", url: TELEGRAM_CALL_URL },
        ],
      ],
    },
  };
}

function getAdminApprovalButtons(requesterId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ Approve",
            callback_data: `approve_video_${requesterId}`,
          },
          {
            text: "❌ Reject",
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
    // no-op
  }
}

async function sendMainMenu(ctx) {
  await ctx.reply(
    `FX | EXCLUSIVE SPACE

Premium access panel.
Use the buttons below to navigate our private sections.`,
    getMainKeyboard()
  );
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
    caption: `To unlock videocall options, send one clear photo for identity check.

After approval, you will receive the videocall buttons.`,
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
    `✅ Approved

Your identity was verified.`
  );

  await bot.telegram.sendPhoto(
    userId,
    Input.fromLocalFile(asset("videocall.jpeg")),
    {
      caption: `Choose your videocall option below.`,
      ...getApprovedVideocallButtons(),
    }
  );

  await bot.telegram.sendMessage(userId, "Return to menu anytime.", getMainKeyboard());
}

bot.start(async (ctx) => {
  await sendMainMenu(ctx);
});

bot.hears(BTN_VIDEOCALL, async (ctx) => {
  await openVideocallFlow(ctx);
});

bot.hears(BTN_CANCEL, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
  await sendMainMenu(ctx);
});

bot.hears(BTN_BACK, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
  await sendMainMenu(ctx);
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
    `✅ Photo received.

Your videocall request is under review.`
  );
});

bot.action(/^approve_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("Approved");

  const requesterId = String(ctx.match[1]);
  const pending = pendingVideoRequests.get(requesterId);

  if (!pending) {
    await ctx.reply("Request not found.");
    return;
  }

  pendingVideoRequests.delete(requesterId);
  await sendApprovedVideocallFlow(requesterId);
});

bot.action(/^reject_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("Rejected");

  const requesterId = String(ctx.match[1]);
  pendingVideoRequests.delete(requesterId);

  await bot.telegram.sendMessage(
    requesterId,
    `❌ Request not approved.`,
    getMainKeyboard()
  );
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  const knownInputs = ["/start", BTN_VIDEOCALL, BTN_BACK, BTN_CANCEL];
  if (knownInputs.includes(text)) return;

  if (pending?.waitingForPhoto) {
    pending.invalidTextCount = (pending.invalidTextCount || 0) + 1;
    pendingVideoRequests.set(userId, pending);

    if (pending.invalidTextCount >= 4) {
      pendingVideoRequests.delete(userId);
      await ctx.reply("Request closed.");
      await sendMainMenu(ctx);
      return;
    }

    await ctx.reply("Send one photo to receive the videocall options.");
    return;
  }

  await sendMainMenu(ctx);
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
