import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";

const USER_GROUP_LINK = "https://t.me/+U1V9FZh0neUxYWFh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+E4X5V3IlygxhMGQx";

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

function getUserMembership(ctx) {
  const id = String(ctx.from?.id || "");
  const isFire = id && Number(id.slice(-1)) % 2 === 0;

  if (isFire) {
    return {
      planKey: "fire",
      planLabel: "User🔥",
      priceLabel: "$12",
      accessLabel: "Unlimited",
      statusLabel: "Active",
      featuresTitle: "ꜰᴇᴀᴛᴜʀᴇꜱ ɪʟɪᴍɪᴛ 🧩",
    };
  }

  return {
    planKey: "king",
    planLabel: "User👑",
    priceLabel: "$3",
    accessLabel: "Premium",
    statusLabel: "Active",
    featuresTitle: "ꜰᴇᴀᴛᴜʀᴇꜱ ᴘʀᴇᴍɪᴜᴍ 🧩",
  };
}

function buildStatusCard(membership) {
  const accessBlock =
    membership.planKey === "fire"
      ? `Access
└ ${membership.accessLabel}

`
      : "";

  const emojiTitle = membership.planKey === "fire" ? "🔥" : "👑";

  return `•╦————————————╦•
        🜲 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲

<blockquote>${emojiTitle} ꜱᴛᴀᴛᴜꜱ ᴄᴀʀᴅ

Plan
└ ${membership.planLabel}

${accessBlock}Status
└ ${membership.statusLabel}

Price
└ ${membership.priceLabel}

${membership.featuresTitle}
📲ɴᴇᴡ ᴘɪᴄꜱ ᴇᴠᴇʀʏ ᴡᴇᴇᴋ
ᴀᴄᴄᴇꜱꜱ ᴛᴏ ᴠɪᴅᴇᴏ-ᴄʜᴀᴛ 📹
ᴇɴᴊᴏʏ ɪᴛ ..</blockquote>

•╩————————————╩•`;
}

function getMainKeyboard() {
  return Markup.keyboard(
    [
      ["💳 Membership"],
      ["🔐 Access", "🖥️ Channels"],
      ["🔄 Refresh"],
    ],
    { columns: 2 }
  ).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard(
    [
      ["📺", "🌩️"],
      ["📸", "📞 Videollamada"],
      ["🎁", "↩️"],
    ],
    { columns: 2 }
  ).resize();
}

function getInlineWebsiteButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🌐 OPEN WEBSITE", url: WEBSITE_URL }]],
    },
  };
}

function getInlineZoomButton() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "📹 ENTER ZOOM", url: ZOOM_URL }]],
    },
  };
}

function getRequesterData(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim() || "No name";
  const username = from?.username ? `@${from.username}` : "sin_username";
  const id = String(from?.id || "");

  return { fullName, username, id };
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

async function sendMainPanel(ctx) {
  await ctx.reply(
    `𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄

<b>Exclusive access panel</b>

Premium content, private sections, and direct entry.

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendMembershipPanel(ctx) {
  const membership = getUserMembership(ctx);
  const statusCard = buildStatusCard(membership);

  await ctx.reply(statusCard, {
    parse_mode: "HTML",
    ...getInlineWebsiteButton(),
  });

  await ctx.reply("‎", getMainKeyboard());
}

async function sendAccessPanel(ctx) {
  const membership = getUserMembership(ctx);

  await ctx.reply(
    `🔓 <b>ACCESS OPEN</b>

Plan
<b>${membership.planLabel}</b>

Status
<b>${membership.statusLabel}</b>

Price
<b>${membership.priceLabel}</b>

Choose a section below.`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `🖥️ <b>CHANNELS</b>

Choose where to continue.`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🜲 USER BOT", url: "https://t.me/User18fxbot" }],
          [{ text: "☁️ SMOKELANDIA BOT", url: "https://t.me/Smokelandiabot" }],
          [{ text: "🌐 OPEN WEBSITE", url: WEBSITE_URL }],
        ],
      },
    }
  );

  await ctx.reply("‎", getMainKeyboard());
}

async function sendRefreshPanel(ctx) {
  const membership = getUserMembership(ctx);
  const statusCard = buildStatusCard(membership);

  await ctx.reply(statusCard, {
    parse_mode: "HTML",
    ...getInlineWebsiteButton(),
  });

  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx) {
  await ctx.reply(
    `📺 <b>FEED</b>

Selected drops
Public previews
Featured content`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendVideoCloudsMessage(ctx) {
  await ctx.reply(
    `🌩️ <b>VIDEOCLOUDS</b>

Ambient room
Visual session
Cloud access enabled`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  const membership = getUserMembership(ctx);

  await ctx.reply(
    `📸 <b>PHOTOS</b>

Plan
<b>${membership.planLabel}</b>

📲ɴᴇᴡ ᴘɪᴄꜱ ᴇᴠᴇʀʏ ᴡᴇᴇᴋ
Private gallery access`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  await ctx.reply(
    `🎁 <b>GIFTS</b>

Support section
Transfer section
Additional access support`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
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
    waitingForPhotos: true,
    createdAt: Date.now(),
    invalidTextCount: 0,
  });

  await notifyAdminNewRequest(ctx);

  await ctx.reply(
    `📹 <b>Videocall request received</b>

Send one photo or video to continue.

After your file arrives, the Zoom link will be unlocked.`,
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

Continue to the Zoom room below.`,
    {
      parse_mode: "HTML",
      ...getInlineZoomButton(),
    }
  );

  await ctx.reply("‎", getAccessKeyboard());
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

<blockquote>🜲 ᴜꜱᴇʀ ᴇɴᴛʀʏ

Tap below to open the private group / channel.</blockquote>

•╩————————————╩•`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🜲 OPEN USER CHANNEL", url: USER_GROUP_LINK }],
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

<blockquote>☁️ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ ᴇɴᴛʀʏ

Tap below to open the private group / channel.</blockquote>

•╩————————————╩•`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "☁️ OPEN SMOKELANDIA", url: SMOKELANDIA_GROUP_LINK }],
          ],
        },
      }
    );
    return;
  }

  await sendMainPanel(ctx);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄

<b>Available commands</b>

/start
/help
/videocall`,
    {
      parse_mode: "HTML",
      ...getInlineWebsiteButton(),
    }
  );

  await ctx.reply("‎", getMainKeyboard());
});

bot.command("videocall", async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.hears("💳 Membership", async (ctx) => {
  await sendMembershipPanel(ctx);
});

bot.hears("🔐 Access", async (ctx) => {
  await sendAccessPanel(ctx);
});

bot.hears("🖥️ Channels", async (ctx) => {
  await sendChannelsPanel(ctx);
});

bot.hears("🔄 Refresh", async (ctx) => {
  await sendRefreshPanel(ctx);
});

bot.hears("📺", async (ctx) => {
  await sendFeedMessage(ctx);
});

bot.hears("🌩️", async (ctx) => {
  await sendVideoCloudsMessage(ctx);
});

bot.hears("📸", async (ctx) => {
  await sendPhotosMessage(ctx);
});

bot.hears("🎁", async (ctx) => {
  await sendGiftsMessage(ctx);
});

bot.hears("📞 Videollamada", async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.hears("↩️", async (ctx) => {
  await sendMainPanel(ctx);
});

bot.on("photo", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);

  if (!pending?.waitingForPhotos) return;

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

  if (!pending?.waitingForPhotos) return;

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

  const knownInputs = [
    "💳 Membership",
    "🔐 Access",
    "🖥️ Channels",
    "🔄 Refresh",
    "📺",
    "🌩️",
    "📸",
    "🎁",
    "📞 Videollamada",
    "↩️",
    "/start",
    "/help",
    "/videocall",
  ];

  if (knownInputs.includes(text)) return;

  if (pending?.waitingForPhotos) {
    pending.invalidTextCount = (pending.invalidTextCount || 0) + 1;
    pendingVideoRequests.set(userId, pending);

    if (pending.invalidTextCount >= 4) {
      pendingVideoRequests.delete(userId);
      await ctx.reply("Bye.");
      await ctx.reply("‎", getAccessKeyboard());
      return;
    }

    if (pending.invalidTextCount === 1) {
      await ctx.reply("Send one photo or video to continue.");
    }

    return;
  }

  await ctx.reply("Use the buttons below.");
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
