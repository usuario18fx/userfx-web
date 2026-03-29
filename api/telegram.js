import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL = "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const USER_GROUP_LINK = "https://t.me/TU_ENLACE_USER";
const SMOKELANDIA_GROUP_LINK = "https://t.me/TU_ENLACE_SMOKELANDIA";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");

const bot = new Telegraf(BOT_TOKEN);

const pendingVideoRequests = globalThis.__fxPendingVideoRequests || new Map();
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
      ? `Access\n└ ${membership.accessLabel}\n`
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
  return Markup.keyboard([
    ["💳 Membership"],
    ["🔐 Access", "🖥️ Channels"],
    ["🔄 Refresh"],
  ], { columns: 2 }).resize();
}

function getAccessKeyboard() {
  return Markup.keyboard([
    ["📺", "🌩️"],
    ["📸", "📞 Videollamada"],
    ["🎁", "↩️"],
  ], { columns: 2 }).resize();
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
    `📞 <b>Nueva solicitud de videollamada</b>\nNombre: <b>${escapeHtml(requester.fullName)}</b>\nUsuario: <b>${escapeHtml(requester.username)}</b>\nID: de>${escapeHtml(requester.id)}</code>`,
    { parse_mode: "HTML" }
  );
}

async function notifyAdminMediaReceived(ctx, label = "Fotos") {
  const requester = getRequesterData(ctx.from);
  await bot.telegram.sendMessage(
    ADMIN_CHAT_ID,
    `📷 <b>${escapeHtml(label)} recibidas</b>\nNombre: <b>${escapeHtml(requester.fullName)}</b>\nUsuario: <b>${escapeHtml(requester.username)}</b>\nID: de>${escapeHtml(requester.id)}</code>`,
    { parse_mode: "HTML" }
  );
}

async function sendMainPanel(ctx) {
  await ctx.reply(
    `𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄\n<b>Exclusive access panel</b>\nPremium content, private sections, and direct entry.\nChoose a section below.`,
    { parse_mode: "HTML", ...getInlineWebsiteButton() }
  );
  await ctx.reply("‎", getMainKeyboard());
}

async function sendMembershipPanel(ctx) {
  const membership = getUserMembership(ctx);
  const statusCard = buildStatusCard(membership);
  await ctx.reply(statusCard, { parse_mode: "HTML", ...getInlineWebsiteButton() });
  await ctx.reply("‎", getMainKeyboard());
}

async function sendAccessPanel(ctx) {
  const membership = getUserMembership(ctx);
  await ctx.reply(
    `🔓 <b>ACCESS OPEN</b>\nPlan<b>${membership.planLabel}</b>\nStatus<b>${membership.statusLabel}</b>\nPrice<b>${membership.priceLabel}</b>\nChoose a section below.`,
    { parse_mode: "HTML", ...getInlineWebsiteButton() }
  );
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `🖥️ <b>CHANNELS</b>\nChoose where to continue.`,
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
  await ctx.reply(statusCard, { parse_mode: "HTML", ...getInlineWebsiteButton() });
  await ctx.reply("‎", getMainKeyboard());
}

async function sendFeedMessage(ctx) {
  await ctx.reply(
    `📺 <b>FEED</b>\nSelected drops\nPublic previews\nFeatured content`,
    { parse_mode: "HTML", ...getInlineWebsiteButton() }
  );
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendVideoCloudsMessage(ctx) {
  await ctx.reply(
    `🌩️ <b>VIDEOCLOUDS</b>\nAmbient room\nVisual session\nCloud access enabled`,
    { parse_mode: "HTML", ...getInlineWebsiteButton() }
  );
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendPhotosMessage(ctx) {
  const membership = getUserMembership(ctx);
  await ctx.reply(
    `📸 <b>PHOTOS</b>\nPlan<b>${membership.planLabel}</b>\n📲ɴᴇᴡ ᴘɪᴄꜱ ᴇᴠᴇʀʏ ᴡᴇᴇᴋ\nPrivate gallery access`,
    { parse_mode: "HTML", ...getInlineWebsiteButton() }
  );
  await ctx.reply("‎", getAccessKeyboard());
}

async function sendGiftsMessage(ctx) {
  await ctx.reply(
    `🎁 <b>GIFTS</b>\nSupport section\nTransfer section\nAdditional access support`,
    { parse_mode: "HTML", ...getInlineWebsiteButton() }
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
    `📹 <b>Videocall request received</b>\nSend one photo or video to continue.\nAfter your file arrives, the Zoom link will be unlocked.`,
    { parse_mode: "HTML", reply_markup: { remove_keyboard: true } }
  );
}

async function completeMediaFlow(ctx, label = "File") {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
  await ctx.reply(
    `✅ <b>${escapeHtml(label)} received</b>\nContinue to the Zoom room below.`,
    { parse_mode: "HTML", ...getInlineZoomButton() }
  );
  await ctx.reply("‎", getAccessKeyboard());
}

// ── HANDLERS ──────────────────────────────────────────────

bot.start(async (ctx) => {
  const payload = (ctx.startPayload || "").trim();

  if (payload === "videocall") {
    await startVideoCallFlow(ctx);
    return;
  }
  if (payload === "userchannel") {
    await ctx.reply(
      `•╦————————————╦•\n 🜲 ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲\n<blockquote>🜲 ᴜꜱᴇʀ ᴇɴᴛʀʏ\nTap below to open the private group / channel.</blockquote>\n•╩————————————╩•`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🜲 OPEN USER CHANNEL", url: USER_GROUP_LINK }]],
        },
      }
    );
    return;
  }
  if (payload === "smokelandiachannel") {
    await ctx.reply(
      `•╦————————————╦•\n ☁️ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ ☁️\n<blockquote>☁️ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ ᴇɴᴛʀʏ\nTap below to open the private group / channel.</blockquote>\n•╩————————————╩•`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "☁️ OPEN SMOKELANDIA", url: SMOKELANDIA_GROUP_LINK }]],
        },
      }
    );
    return;
  }

  await sendMainPanel(ctx);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    `𝐅𝐗 | 𝐖𝐄𝐁𝐒𝐈𝐓𝐄\n<b>Available commands</b>\n/start\n/help\n/videocall`,
    { parse_mode: "HTML", ...getInlineWebsiteButton() }
  );
  await ctx.reply("‎", getMainKeyboard());
});

bot.command("videocall", async (ctx) => {
  await startVideoCallFlow(ctx);
});

bot.hears("💳 Membership", async (ctx) => { await sendMembershipPanel(ctx); });
bot.hears("🔐 Access",     async (ctx) => { await sendAccessPanel(ctx); });
bot.hears("🖥️ Channels",  async (ctx) => { await sendChannelsPanel(ctx); });
bot.hears("🔄 Refresh",   async (ctx) => { await sendRefreshPanel(ctx); });
bot.hears("📺",            async (ctx) => { await sendFeedMessage(ctx); });
bot.hears("🌩️",           async (ctx) => { await sendVideoCloudsMessage(ctx); });
