import path from "path";
import { Telegraf, Markup, Input } from "telegraf";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const CONTACT_URL = "https://t.me/User18fx";
const TELEGRAM_CALL_URL = "https://t.me/User18fx";

const USER_GROUP_LINK = "https://t.me/+v57jkAGn3DA0NWJh";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+E4X5V3IlygxhMGQx";

/* BOTONES */
const BTN_USER = "👑[𝐗-𝐔𝐬𝐞𝐫]";
const BTN_VIP = "🔥[𝐕-𝐯𝐢𝐩]";
const BTN_VIDEOCALL = "ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_WEBSITE = "ᴡᴇʙꜱɪᴛᴇ";
const BTN_REFRESH = "↺ ʀᴇꜰʀᴇꜱʜ";
const BTN_CHANNELS = "ᴄʜᴀɴɴᴇʟꜱ";
const BTN_EXIT = "⏎ MENU";
const BTN_SEND_PHOTO_VIDEO = "📤 SEND PHOTO / VIDEO";
const BTN_CANCEL_VIDEO = "✖ CANCEL";
const BTN_CHANNEL_USERFX = "Userfx";
const BTN_CHANNEL_SMKL = "Smokelandia";

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const asset = (file) => path.join(process.cwd(), "assets", file);

/* ESTADO EN MEMORIA PARA VIDEOCALL */
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

function getRequesterData(from) {
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
      [BTN_CHANNEL_USERFX, BTN_CHANNEL_SMKL],
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

function getBackKeyboard() {
  return Markup.keyboard([[BTN_EXIT]]).resize();
}

function getWebsiteInlineKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🌐 OPEN WEBSITE", url: WEBSITE_URL }]],
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
  return `FX MENU`;
}

async function getMembership(userId) {
  const { data, error } = await supabase
    .from("memberships")
    .select("telegram_id, plan_key, expires_at, paid_at")
    .eq("telegram_id", String(userId))
    .maybeSingle();

  if (error) {
    console.error("SUPABASE getMembership error:", error);
    return null;
  }

  if (!data) return null;

  if (Date.now() > Number(data.expires_at)) {
    const { error: deleteError } = await supabase
      .from("memberships")
      .delete()
      .eq("telegram_id", String(userId));

    if (deleteError) {
      console.error("SUPABASE delete expired membership error:", deleteError);
    }

    return null;
  }

  return data;
}

async function setMembership(userId, planKey) {
  const now = Date.now();

  const expiresAt =
    planKey === "vip"
      ? now + 30 * 24 * 60 * 60 * 1000
      : now + 3 * 24 * 60 * 60 * 1000;

  const { error } = await supabase.from("memberships").upsert(
    {
      telegram_id: String(userId),
      plan_key: planKey,
      expires_at: expiresAt,
      paid_at: now,
    },
    { onConflict: "telegram_id" }
  );

  if (error) {
    console.error("SUPABASE setMembership error:", error);
    throw error;
  }

  return {
    telegram_id: String(userId),
    plan_key: planKey,
    expires_at: expiresAt,
    paid_at: now,
  };
}

async function requireMembership(ctx, type = "user") {
  const userId = String(ctx.from?.id || "");
  const membership = await getMembership(userId);

  if (!membership) {
    await ctx.reply(
      `•╦————————————╦•
🔒 ACCESS LOCKED

Get membership first.
•╩————————————╩•`,
      getMainKeyboard()
    );
    return false;
  }

  if (type === "vip" && membership.plan_key !== "vip") {
    await ctx.reply(
      `•╦————————————╦•
🔥 VIP REQUIRED

Upgrade to continue.
•╩————————————╩•`,
      getMainKeyboard()
    );
    return false;
  }

  return true;
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
    caption: `•╦————————————╦•
ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
👑 [X-user]
⇀ ᴘʀɪᴄᴇ $3
⇀ ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ
•╩————————————╩•`,
    ...getUserPaymentInlineKeyboard(),
  });

  await ctx.reply("‎", getBackKeyboard());
}

async function sendVipMode(ctx) {
  await ctx.reply(
    `•╦————————————╦•
ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ Ŧҳ 🜲
🔥 [V-vip]
⇀ ᴘʀɪᴄᴇ $12
⇀ ᴀᴄᴄᴇꜱꜱ ᴜɴʟɪᴍɪᴛᴇᴅ
•╩————————————╩•`,
    {
      ...getVipPaymentInlineKeyboard(),
    }
  );

  await ctx.reply("‎", getBackKeyboard());
}

async function sendWebsitePanel(ctx) {
  await ctx.reply(
    `ᴡᴇʙꜱɪᴛᴇ`,
    {
      ...getWebsiteInlineKeyboard(),
    }
  );

  await ctx.reply("‎", getBackKeyboard());
}

async function sendChannelsPanel(ctx) {
  await ctx.replyWithVideo(Input.fromLocalFile(asset("websiteFx.mp4")), {
    caption: `ᴄʜᴀɴɴᴇʟꜱ`,
  });

  await ctx.reply("‎", getChannelsKeyboard());
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
SEND ONE PHOTO OR VIDEO
😉
YOUR REQUEST WILL BE REVIEWED FIRST.
•╩————————————╩•`,
  });

  await ctx.reply("‎", getVideoRequestKeyboard());
}

async function sendSelectedPlatformLink(ctx, platform) {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);

  if (platform === "zoom") {
    await ctx.reply(
      `•╦————————————╦•
📞 ZOOM SELECTED
•╩————————————╩•`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "ENTER ZOOM", url: ZOOM_URL }]],
        },
      }
    );
  } else {
    await ctx.reply(
      `•╦————————————╦•
💬 TELEGRAM SELECTED
•╩————————————╩•`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "OPEN TELEGRAM", url: TELEGRAM_CALL_URL }],
          ],
        },
      }
    );
  }

  await ctx.reply("‎", getMainKeyboard());
}

bot.start(async (ctx) => {
  await sendMainMenu(ctx);
});

bot.command("help", async (ctx) => {
  await sendHelpMessage(ctx);
});

bot.command("videocall", async (ctx) => {
  if (!(await requireMembership(ctx, "user"))) return;
  await startVideoCallFlow(ctx);
});

bot.hears([BTN_USER, "👑 [X-user]", "👑 X-user", "[X-user]", "X-user"], async (ctx) => {
  await sendUserMode(ctx);
});

bot.hears([BTN_VIP, "🔥 [V-vip]", "🔥 V-vip", "[V-vip]", "V-vip"], async (ctx) => {
  await sendVipMode(ctx);
});

bot.hears(BTN_VIDEOCALL, async (ctx) => {
  if (!(await requireMembership(ctx, "user"))) return;
  await startVideoCallFlow(ctx);
});

bot.hears(BTN_WEBSITE, async (ctx) => {
  await sendWebsitePanel(ctx);
});

bot.hears(BTN_REFRESH, async (ctx) => {
  await sendMainMenu(ctx);
});

bot.hears(BTN_CHANNELS, async (ctx) => {
  await sendChannelsPanel(ctx);
});

bot.hears(BTN_CHANNEL_USERFX, async (ctx) => {
  if (!(await requireMembership(ctx, "user"))) return;

  await ctx.reply(`🜲 ᴜꜱᴇʀꜰx`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📺 OPEN USER CHANNEL", url: USER_GROUP_LINK }],
      ],
    },
  });
});

bot.hears(BTN_CHANNEL_SMKL, async (ctx) => {
  if (!(await requireMembership(ctx, "vip"))) return;

  await ctx.reply(`☁️ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📺 OPEN SMOKELANDIA", url: SMOKELANDIA_GROUP_LINK }],
      ],
    },
  });
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
  await ctx.replyWithInvoice({
    title: "X-user",
    description: "Premium access",
    payload: "membership_user",
    currency: "XTR",
    prices: [{ label: "X-user", amount: 300 }],
    provider_token: "",
    start_parameter: "buy-user-stars",
  });
});

bot.action("buy_vip_stars", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithInvoice({
    title: "V-vip",
    description: "Unlimited access",
    payload: "membership_vip",
    currency: "XTR",
    prices: [{ label: "V-vip", amount: 1200 }],
    provider_token: "",
    start_parameter: "buy-vip-stars",
  });
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
✅ APPROVED

CHOOSE YOUR VIDEO PLATFORM
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
❌ REQUEST NOT APPROVED

RETURN TO MENU.
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
  const payload = ctx.message.successful_payment.invoice_payload;
  const userId = String(ctx.from?.id || "");

  await setMembership(
    userId,
    payload === "membership_vip" ? "vip" : "user"
  );

  await ctx.reply(
    `•╦————————————╦•
✅ ACCESS ENABLED

YOU NOW HAVE FULL ACCESS.
•╩————————————╩•`
  );

  await sendMainMenu(ctx);
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
✅ PHOTO RECEIVED

YOUR REQUEST IS NOW UNDER REVIEW.
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
✅ VIDEO RECEIVED

YOUR REQUEST IS NOW UNDER REVIEW.
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
    BTN_WEBSITE,
    BTN_REFRESH,
    BTN_CHANNELS,
    BTN_EXIT,
    BTN_SEND_PHOTO_VIDEO,
    BTN_CANCEL_VIDEO,
    BTN_CHANNEL_USERFX,
    BTN_CHANNEL_SMKL,
    "👑 [X-user]",
    "👑 X-user",
    "[X-user]",
    "X-user",
    "🔥 [V-vip]",
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
