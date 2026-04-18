import path from "path";
import { Telegraf, Markup, Input } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const TELEGRAM_CALL_URL = "https://t.me/User18fx";

if (!BOT_TOKEN) {
  throw new Error("Missing BOT_TOKEN");
}

if (!ADMIN_CHAT_ID) {
  throw new Error("Missing ADMIN_CHAT_ID");
}

const bot = new Telegraf(BOT_TOKEN);

const BRAND = "FX | EXCLUSIVE SPACE";

const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests || new Map();

if (!globalThis.__fxPendingVideoRequests) {
  globalThis.__fxPendingVideoRequests = pendingVideoRequests;
}

const asset = (file) => path.join(process.cwd(), "assets", file);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getFullName(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";
  return `${firstName} ${lastName}`.trim() || "No name";
}

function getUsername(from) {
  return from?.username ? `@${from.username}` : "sin_username";
}

function getMainKeyboard() {
  return Markup.keyboard([["📞 Videocall"], ["🔄 Refresh"]], {
    columns: 1,
  }).resize();
}

function getPendingKeyboard() {
  return Markup.keyboard([["✖ Cancel"]], {
    columns: 1,
  }).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "↗ ENTER SITE", url: WEBSITE_URL }]],
    },
  };
}

function getApprovedVideoButtons() {
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

function getAdminApprovalButtons(userId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "✅ Approve",
            callback_data: `approve_video_${userId}`,
          },
          {
            text: "❌ Reject",
            callback_data: `reject_video_${userId}`,
          },
        ],
      ],
    },
  };
}

async function sendMainPanel(ctx) {
  await ctx.reply(
    `${BRAND}

<b>Exclusive space</b>

Private videocall access is subject to approval.

Tap the button below to continue.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendRefreshPanel(ctx) {
  await ctx.reply(
    `${BRAND}

<b>Status updated</b>

Videocall access is available by request only.

Tap <b>Videocall</b> to begin.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function notifyAdminNewRequest(ctx) {
  const userId = String(ctx.from?.id || "");
  const fullName = escapeHtml(getFullName(ctx.from));
  const username = escapeHtml(getUsername(ctx.from));

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📞 <b>New videocall request</b>

Name: <b>${fullName}</b>
User: <b>${username}</b>
ID: <code>${escapeHtml(userId)}</code>

Waiting for identity photo.`,
    {
      parse_mode: "HTML",
    }
  );
}

async function startVideoRequestFlow(ctx) {
  const userId = String(ctx.from?.id || "");

  if (!userId) {
    await ctx.reply("Unable to identify your account.");
    return;
  }

  pendingVideoRequests.set(userId, {
    waitingForPhoto: true,
    awaitingApproval: false,
    createdAt: Date.now(),
    invalidTextCount: 0,
  });

  try {
    await ctx.deleteMessage();
  } catch (error) {
    console.error("DELETE MESSAGE ERROR:", error);
  }

  await ctx.replyWithVideo(Input.fromLocalFile(asset("websiteFx.mp4")), {
    caption: `📞 <b>VIDEOCALL REQUEST</b>

Send one photo to verify your identity.

After approval, you will receive the videocall options.`,
    parse_mode: "HTML",
  });

  await ctx.reply("Send your photo now.", getPendingKeyboard());

  await notifyAdminNewRequest(ctx);
}

async function notifyAdminPhotoReceived(ctx) {
  const userId = String(ctx.from?.id || "");
  const fullName = escapeHtml(getFullName(ctx.from));
  const username = escapeHtml(getUsername(ctx.from));

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📷 <b>Identity photo received</b>

Name: <b>${fullName}</b>
User: <b>${username}</b>
ID: <code>${escapeHtml(userId)}</code>

Approve or reject below.`,
    {
      parse_mode: "HTML",
      ...getAdminApprovalButtons(userId),
    }
  );
}

async function sendApprovedVideoMessages(userId) {
  await bot.telegram.sendMessage(
    userId,
    `✅ <b>Approved</b>

Your videocall request has been accepted.`,
    {
      parse_mode: "HTML",
    }
  );

  await bot.telegram.sendPhoto(
    userId,
    Input.fromLocalFile(asset("videocall.jpeg")),
    {
      caption: `Choose your videocall option below.`,
      ...getApprovedVideoButtons(),
    }
  );

  await bot.telegram.sendMessage(userId, "‎", getMainKeyboard());
}

bot.start(async (ctx) => {
  await sendMainPanel(ctx);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `${BRAND}

<b>Available commands</b>

/start
/help

Use <b>Videocall</b> to begin the approval flow.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.hears("📞 Videocall", async (ctx) => {
  await startVideoRequestFlow(ctx);
});

bot.hears("🔄 Refresh", async (ctx) => {
  await sendRefreshPanel(ctx);
});

bot.hears("✖ Cancel", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
  await sendMainPanel(ctx);
});

bot.on("photo", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForPhoto) {
    return;
  }

  pending.waitingForPhoto = false;
  pending.awaitingApproval = true;
  pending.invalidTextCount = 0;
  pendingVideoRequests.set(userId, pending);

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await notifyAdminPhotoReceived(ctx);

  await ctx.reply(
    `✅ Photo received.

Your request is under review.`,
    getPendingKeyboard()
  );
});

bot.action(/^approve_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("Approved");

  const userId = String(ctx.match[1]);
  const pending = pendingVideoRequests.get(userId);

  if (!pending) {
    await ctx.reply("This request no longer exists.");
    return;
  }

  pendingVideoRequests.delete(userId);
  await sendApprovedVideoMessages(userId);
});

bot.action(/^reject_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("Rejected");

  const userId = String(ctx.match[1]);
  pendingVideoRequests.delete(userId);

  await bot.telegram.sendMessage(
    userId,
    `❌ Your videocall request was not approved.`,
    getMainKeyboard()
  );
});

bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  const knownInputs = [
    "📞 Videocall",
    "🔄 Refresh",
    "✖ Cancel",
    "/start",
    "/help",
  ];

  if (knownInputs.includes(text)) {
    return;
  }

  if (pending?.waitingForPhoto) {
    pending.invalidTextCount = (pending.invalidTextCount || 0) + 1;
    pendingVideoRequests.set(userId, pending);

    if (pending.invalidTextCount >= 4) {
      pendingVideoRequests.delete(userId);

      await ctx.reply(
        `Request cancelled.

Start again when ready.`,
        getMainKeyboard()
      );
      return;
    }

    await ctx.reply(
      `Send one photo to continue.`,
      getPendingKeyboard()
    );
    return;
  }

  if (pending?.awaitingApproval) {
    await ctx.reply(
      `Your request is still under review.`,
      getPendingKeyboard()
    );
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
