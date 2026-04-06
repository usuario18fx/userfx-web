import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const WEBSITE_URL = "https://userfx-web.vercel.app";

const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";

const TELEGRAM_CALL_URL = "https://t.me/User18fx";

const CONTACT_URL = "https://t.me/User18fx";

const USER_BOT_URL = "https://t.me/User18fxbot?start=userchannel";
const SMOKELANDIA_BOT_URL =
  "https://t.me/Smokelandiabot?start=smokelandiachannel";

const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+E4X5V3IlygxhMGQx";

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
  const fullName =
    `${from?.first_name || ""} ${from?.last_name || ""}`.trim() || "No name";
  const username = from?.username ? `@${from.username}` : "sin_username";
  const id = String(from?.id || "");
  return { fullName, username, id };
}

function setMembership(userId, planKey) {
  const now = Date.now();
  const expiresAt =
    planKey === "vip"
      ? now + 30 * 24 * 60 * 60 * 1000
      : now + 3 * 24 * 60 * 60 * 1000;

  memberships.set(String(userId), {
    planKey,
    expiresAt,
    paidAt: now,
  });
}

function getMainKeyboard() {
  return Markup.keyboard(
    [
      ["👑 [X-user]", "🔥 [V-vip]"],
      ["📞 VIDEOCALL", "📺 CHANNELS"],
      ["🌐 WEBSITE", "↺"],
    ],
    { columns: 2 }
  ).resize();
}

function getBackKeyboard() {
  return Markup.keyboard([["⏎"]]).resize();
}

function getZoomKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📞 ZOOM CALL", url: ZOOM_URL },
          { text: "💬 TELEGRAM CALL", url: TELEGRAM_CALL_URL },
        ],
        [{ text: "🌐 WEBSITE", url: WEBSITE_URL }],
      ],
    },
  };
}

async function notifyAdminNewRequest(ctx) {
  const r = getRequesterData(ctx.from);

  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📞 New call request

Nombre: ${escapeHtml(r.fullName)}
Usuario: ${escapeHtml(r.username)}
ID: ${r.id}`
  );
}

async function sendMainMenu(ctx) {
  await ctx.reply("Welcome", getMainKeyboard());
}

async function startVideoCallFlow(ctx) {
  const userId = String(ctx.from?.id || "");

  pendingVideoRequests.set(userId, {
    waitingForMedia: true,
  });

  await notifyAdminNewRequest(ctx);

  await ctx.reply(
    "Send 1 photo or video to continue.",
    { reply_markup: { remove_keyboard: true } }
  );
}

async function completeMediaFlow(ctx) {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);

  await ctx.reply(
    "Access granted. Choose call type.",
    {
      ...getZoomKeyboard(),
    }
  );

  await ctx.reply("‎", getBackKeyboard());
}

bot.start(async (ctx) => {
  await sendMainMenu(ctx);
});

bot.hears("📞 VIDEOCALL", async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.hears("↺", async (ctx) => {
  await sendMainMenu(ctx);
});

bot.on("photo", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);
  if (!pending?.waitingForMedia) return;

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await completeMediaFlow(ctx);
});

bot.on("video", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);
  if (!pending?.waitingForMedia) return;

  await bot.telegram.forwardMessage(
    ADMIN_CHAT_ID,
    ctx.chat.id,
    ctx.message.message_id
  );

  await completeMediaFlow(ctx);
});

bot.on("text", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (pending?.waitingForMedia) {
    await ctx.reply("Send media only.");
    return;
  }

  await ctx.reply("Use menu.", getMainKeyboard());
});

bot.catch((err) => {
  console.error(err);
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const update =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    await bot.handleUpdate(update);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
}
