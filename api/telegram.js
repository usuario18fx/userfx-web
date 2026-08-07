import { Telegraf, Markup } from "telegraf";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const ADMIN_WEBHOOK_SECRET = process.env.ADMIN_WEBHOOK_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_BOT_TOKEN) throw new Error("Missing ADMIN_BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");
if (!TELEGRAM_WEBHOOK_SECRET) throw new Error("Missing TELEGRAM_WEBHOOK_SECRET");
if (!ADMIN_WEBHOOK_SECRET) throw new Error("Missing ADMIN_WEBHOOK_SECRET");
if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);

bot.telegram.webhookReply = false;
adminBot.telegram.webhookReply = false;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const ZOOM_URL =
  process.env.ZOOM_URL ||
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";

const TELEGRAM_CALL_URL =
  process.env.TELEGRAM_CALL_URL ||
  "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY";

const USER_GROUP_LINK =
  process.env.USER_GROUP_LINK ||
  "https://t.me/+2P62YW1Pt441NDUx";

const SMOKELANDIA_GROUP_LINK =
  process.env.SMOKELANDIA_GROUP_LINK ||
  "https://t.me/SmokelandiaFx_bot";

const VIP_STARS_PRICE = 1500;
const USER_STARS_PRICE = 500;

const VIP_PAYLOAD = "vip_fx_access";
const USER_PAYLOAD = "user_fx_access";

const VIP_DURATION_DAYS = 30;
const USER_DURATION_DAYS = 8;

const TIER_VIP = "ᴠɪᴘ";
const TIER_USER = "ᴜꜱᴇʀ";

const BTN_VIDEOCALL = "📞 ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_GET_FULL_ACCESS = "🔥 ɢᴇᴛ ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ";
const BTN_VIP = "⚡ᴠɪᴘ";
const BTN_USER = "👑ᴜꜱᴇʀ";
const BTN_CHANNELS = "📺ᴄʜᴀɴɴᴇʟꜱ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";

const BTN_ZOOM = "🟦 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "💬 ᴛᴇʟᴇɢʀᴀᴍ";
const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_BACK_MENU = "↽ ᴍᴇɴᴜ";
const BTN_CHANNELS_BACK = "↽ ᴄʜᴀɴɴᴇʟꜱ";

const BTN_SMOKELANDIA = "ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "𝐔𝐬𝐞𝐫🜲Ŧҳ";

const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests ||
  new Map();

globalThis.__fxPendingVideoRequests = pendingVideoRequests;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getUserMeta(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";

  const fullName =
    `${firstName} ${lastName}`.trim() || "No name";

  const username = from?.username
    ? `@${from.username}`
    : "sin_username";

  const id = String(from?.id || "");

  return {
    fullName,
    username,
    id,
  };
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
    {
      columns: 2,
    }
  ).resize();
}

function getPendingPhotoKeyboard() {
  return Markup.keyboard(
    [[BTN_CANCEL]],
    {
      columns: 1,
    }
  ).resize();
}

function getApprovedVideocallKeyboard() {
  return Markup.keyboard(
    [
      [BTN_ZOOM, BTN_TELEGRAM],
      [BTN_BACK_MENU],
    ],
    {
      columns: 2,
    }
  ).resize();
}

function getStarsVipKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "⭐ ᴘᴀʏ ᴠɪᴘ ✪",
        "pay_vip_stars"
      ),
    ],
    [
      Markup.button.callback(
        "↽ ʙᴀᴄᴋ",
        "back_to_main"
      ),
    ],
  ]);
}

function getStarsUserKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "⭐ ᴘᴀʏ ᴜꜱᴇʀ ✪",
        "pay_user_stars"
      ),
    ],
    [
      Markup.button.callback(
        "↽ ʙᴀᴄᴋ",
        "back_to_main"
      ),
    ],
  ]);
}

function getChannelsKeyboard() {
  return Markup.keyboard(
    [
      [BTN_SMOKELANDIA, BTN_USERFX_SITE],
      [BTN_CHANNELS_BACK],
    ],
    {
      columns: 2,
    }
  ).resize();
}

async function getMembership(userId) {
  const telegramId = String(userId);

  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("telegram_id", telegramId)
    .order("expires_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("SUPABASE MEMBERSHIP ERROR:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  if (
    data.expires_at &&
    Number(data.expires_at) <= Date.now()
  ) {
    return {
      ...data,
      expired: true,
    };
  }

  return {
    ...data,
    expired: false,
  };
}

async function getAccessState(userId) {
  const membership = await getMembership(userId);

  if (!membership || membership.expired) {
    return {
      hasVip: false,
      hasUser: false,
      membership: null,
    };
  }

  return {
    hasVip: membership.plan_key === TIER_VIP,
    hasUser:
      membership.plan_key === TIER_USER ||
      membership.plan_key === TIER_VIP,
    membership,
  };
}

async function saveMembership(
  userId,
  planKey,
  chargeId
) {
  const telegramId = String(userId);

  const durationDays =
    planKey === TIER_VIP
      ? VIP_DURATION_DAYS
      : USER_DURATION_DAYS;

  const now = Date.now();
  const expiresAt =
    now + durationDays * 24 * 60 * 60 * 1000;

  const { data: existing, error: findError } =
    await supabase
      .from("memberships")
      .select("id")
      .eq("telegram_id", telegramId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (findError) {
    console.error(
      "SUPABASE MEMBERSHIP FIND ERROR:",
      findError
    );

    throw findError;
  }

  const membershipData = {
    telegram_id: telegramId,
    plan_key: planKey,
    expires_at: expiresAt,
    paid_at: now,
  };

  let result;

  if (existing?.id) {
    result = await supabase
      .from("memberships")
      .update(membershipData)
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from("memberships")
      .insert(membershipData)
      .select()
      .single();
  }

  if (result.error) {
    console.error(
      "SUPABASE MEMBERSHIP SAVE ERROR:",
      result.error
    );

    throw result.error;
  }

  return result.data;
}

async function typing(ctx, action = "typing") {
  const delay =
    800 + Math.floor(Math.random() * 1800);

  await ctx.sendChatAction(action);

  await new Promise((resolve) =>
    setTimeout(resolve, delay)
  );
}

async function sendMainPanel(ctx) {
  await typing(ctx);

  await ctx.reply(
    `Ŧҳ | ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ
ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ. ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`,
    getMainKeyboard()
  );
}

async function sendMembershipPanel(ctx) {
  await typing(ctx);

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
  try {
    await ctx.replyWithVideo(
      "Gs1OgH5HZGzdmjgWmCalvexfhI4DGJN6FuJ-J7JlaLQUeB4c8Xw0_ju086n6YM_g",
      {
        caption:
          `ᴠɪᴘ⚡\nᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
        reply_markup:
          getStarsVipKeyboard().reply_markup,
      }
    );
  } catch (error) {
    console.error(
      "ERROR sendVipPanel video:",
      error
    );

    await ctx.reply(
      `ᴠɪᴘ⚡\nᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
      getStarsVipKeyboard()
    );
  }
}

async function sendUserPanel(ctx) {
  try {
    await ctx.replyWithPhoto(
      "r7iZgQjb73xKY4_5WH2DbV7GHk7P9zoC7RuHnB9wIHPQ_o0hbBcNyVhQA4uVN7GT",
      {
        caption:
          `ᴜꜱᴇʀ👑\nᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
        reply_markup:
          getStarsUserKeyboard().reply_markup,
      }
    );
  } catch (error) {
    console.error(
      "ERROR sendUserPanel photo:",
      error
    );

    await ctx.reply(
      `ᴜꜱᴇʀ👑\nᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
      getStarsUserKeyboard()
    );
  }
}

async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `📺ᴄʜᴀɴɴᴇʟꜱ\nᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`,
    getChannelsKeyboard()
  );
}

async function sendSmokelandiaChannelPanel(ctx) {
  try {
    await ctx.replyWithVideo(
      "r_JpgGY0aBXgoy_Z1N3eCm6DhtRVMOwJo1t-6WdfOSjxO1DUlEmJ8EZlhoe7RbdZ",
      {
        caption:
          `☁️ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ\nᴘʀɪᴠᴀᴛᴇ ꜱᴍᴏᴋᴇ ʀᴏᴏᴍ ʀᴇᴀᴅʏ.\n👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "☁️ᴇɴᴛᴇʀ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
                url: SMOKELANDIA_GROUP_LINK,
              },
            ],
            [
              {
                text: "↽ ʙᴀᴄᴋ",
                callback_data: "back_to_channels",
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error(
      "ERROR sendSmokelandiaChannelPanel:",
      error
    );

    await ctx.reply(
      `☁️ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ\nᴘʀɪᴠᴀᴛᴇ ꜱᴍᴏᴋᴇ ʀᴏᴏᴍ ʀᴇᴀᴅʏ.\n👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "☁️ᴇɴᴛᴇʀ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
                url: SMOKELANDIA_GROUP_LINK,
              },
            ],
            [
              {
                text: "↽ ʙᴀᴄᴋ",
                callback_data: "back_to_channels",
              },
            ],
          ],
        },
      }
    );
  }
}

async function sendUserFxChannelPanel(ctx) {
  try {
    await ctx.replyWithVideo(
      "r_JpgGY0aBXgoy_Z1N3eCnTh6i7FHfvdhebbpDPlZre1iHU9iYT44Aj4lCVXv115",
      {
        caption:
          `𝐔𝐬𝐞𝐫 🜲Ŧҳ\nᴘʀɪᴠᴀᴛᴇ ʀᴏᴜᴛᴇ ʀᴇᴀᴅʏ.\n👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🜲 ᴇɴᴛᴇʀ 𝐔𝐬𝐞𝐫 Ŧҳ",
                url: USER_GROUP_LINK,
              },
            ],
            [
              {
                text: "↽ ʙᴀᴄᴋ",
                callback_data: "back_to_channels",
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error(
      "ERROR sendUserFxChannelPanel:",
      error
    );

    await ctx.reply(
      `𝐔𝐬𝐞𝐫 🜲Ŧҳ\nᴘʀɪᴠᴀᴛᴇ ʀᴏᴜᴛᴇ ʀᴇᴀᴅʏ.\n👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🜲 ᴇɴᴛᴇʀ 𝐔𝐬𝐞𝐫 Ŧҳ",
                url: USER_GROUP_LINK,
              },
            ],
            [
              {
                text: "↽ ʙᴀᴄᴋ",
                callback_data: "back_to_channels",
              },
            ],
          ],
        },
      }
    );
  }
}

async function sendRefreshPanel(ctx) {
  const {
    hasVip,
    hasUser,
    membership,
  } = await getAccessState(ctx.from?.id);

  let tier = "ɴᴏ ᴘʟᴀɴ";

  if (hasVip) {
    tier = "⚡ᴠɪᴘ";
  } else if (hasUser) {
    tier = "𝐔𝐬𝐞𝐫🜲Ŧҳ";
  }

  let expirationText = "";

  if (membership?.expires_at) {
    expirationText =
      `\nᴇxᴘɪʀᴇꜱ: ${new Date(
        Number(membership.expires_at)
      ).toLocaleString("en-CA")}`;
  }

  await ctx.reply(
    `↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ\nᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}${expirationText}`,
    getMainKeyboard()
  );
}

async function openVideocallFlow(ctx) {
  const userId = String(ctx.from?.id || "");

  if (!userId) {
    return;
  }

  pendingVideoRequests.set(userId, {
    waitingForPhoto: true,
    awaitingAdminApproval: false,
    invalidTextCount: 0,
    createdAt: Date.now(),
  });

  await typing(ctx, "upload_video");

  await ctx.replyWithVideo(
    {
      url:
        process.env.VIDEOCALL_INTRO_VIDEO_URL ||
        "https://tudominio.com/FX-Y24V01.mp4",
    },
    {
      caption:
        `ʜᴏʟᴅ ᴜᴘ, ʙᴇꜰᴏʀᴇ ᴡᴇ ᴋᴇᴇᴘ ɢᴏɪɴɢ, ᴄᴀɴ ɪ ᴄᴇᴇ ᴀ ᴘɪᴄ ᴏꜰ ʏᴏᴜ? ɪ ᴡᴀɴɴᴀ ᴋɴᴏᴡ ᴡʜᴏ ɪ'ᴍ ᴛᴀʟᴋɪɴɢ ᴛᴏ...

ᴛʜᴇɴ ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʙᴜᴛᴛᴏɴꜱ.`,
      reply_markup:
        getPendingPhotoKeyboard().reply_markup,
    }
  );

  const user = getUserMeta(ctx.from);

  try {
    await adminBot.telegram.sendChatAction(
      ADMIN_CHAT_ID,
      "typing"
    );

    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📞 New videocall request

Name: ${escapeHtml(user.fullName)}

Username: ${escapeHtml(user.username)}

ID: ${escapeHtml(user.id)}

ᴄʜᴀᴛ ɪᴅ ᴜꜱᴇʀ: ${escapeHtml(userId)}

ᴇꜱᴘᴇʀᴀɴᴅᴏ ꜱᴜ ꜰᴏᴛᴏ...`,
      {
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.error("ADMIN ERROR:", error);
  }
}

async function sendApprovedVideocallFlow(userId) {
  await bot.telegram.sendMessage(
    userId,
    `✅ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ\nʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ ᴀᴘᴘʀᴏᴠᴇᴅ.`
  );

  await bot.telegram.sendMessage(
    userId,
    `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.\nᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ:`,
    getApprovedVideocallKeyboard()
  );
}

async function sendVipInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message?.chat?.id;

  if (!chatId) {
    console.error(
      "NO CHAT ID AVAILABLE FOR VIP INVOICE"
    );

    return;
  }

  try {
    await ctx.telegram.callApi(
      "sendInvoice",
      {
        chat_id: chatId,
        title: "VIP ACCESS",
        description:
          "ᴠɪᴘ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: VIP_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label: "VIP ACCESS",
            amount: VIP_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    console.error(
      "ERROR SENDING VIP INVOICE:",
      error
    );

    await ctx.reply(
      "❌ᴘᴀʏᴍᴇɴᴛ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴇʀʀᴏʀ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ."
    ).catch(() => {});
  }
}

async function sendUserInvoice(ctx) {
  const chatId =
    ctx.chat?.id ||
    ctx.callbackQuery?.message?.chat?.id;

  if (!chatId) {
    console.error(
      "NO CHAT ID AVAILABLE FOR USER INVOICE"
    );

    return;
  }

  try {
    await ctx.telegram.callApi(
      "sendInvoice",
      {
        chat_id: chatId,
        title: "USER FX ACCESS",
        description:
          "ᴜꜱᴇʀ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: USER_PAYLOAD,
        currency: "XTR",
        prices: [
          {
            label: "USER FX ACCESS",
            amount: USER_STARS_PRICE,
          },
        ],
      }
    );
  } catch (error) {
    console.error(
      "ERROR SENDING USER INVOICE:",
      error
    );

    await ctx.reply(
      "❌ᴘᴀʏᴍᴇɴᴛ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴇʀʀᴏʀ. ᴘʟᴇᴀꜱᴇ ᴛʀʏ ᴀɢᴀɪɴ."
    ).catch(() => {});
  }
}

async function handleSuccessfulPayment(ctx) {
  const payment =
    ctx.message?.successful_payment;

  if (!payment) {
    return;
  }

  const userId = String(
    ctx.from?.id || ""
  );

  const chargeId =
    payment.telegram_payment_charge_id;

  try {
    if (
      payment.invoice_payload === VIP_PAYLOAD
    ) {
      await saveMembership(
        userId,
        TIER_VIP,
        chargeId
      );

      await ctx.reply(
        `✅ ᴠɪᴘ ᴀᴄᴛɪᴠᴀᴛᴇᴅ\nʏᴏᴜʀ "ᴠɪᴘ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
        getMainKeyboard()
      );

      return;
    }

    if (
      payment.invoice_payload === USER_PAYLOAD
    ) {
      await saveMembership(
        userId,
        TIER_USER,
        chargeId
      );

      await ctx.reply(
        `✅ "ᴜꜱᴇʀ" ᴀᴄᴛɪᴠᴀᴛᴇᴅ\nʏᴏᴜʀ "ᴜꜱᴇʀ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
        getMainKeyboard()
      );
    }
  } catch (error) {
    console.error(
      "PAYMENT DATABASE ERROR:",
      error
    );

    await ctx.reply(
      "⚠️ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ, ʙᴜᴛ ᴛʜᴇ ᴍᴇᴍʙᴇʀꜱʜɪᴘ ᴄᴏᴜʟᴅ ɴᴏᴛ ʙᴇ ꜱᴀᴠᴇᴅ. ᴄᴏɴᴛᴀᴄᴛ ꜱᴜᴘᴘᴏʀᴛ."
    );
  }
}

bot.start(async (ctx) => {
  try {
    await sendMainPanel(ctx);
  } catch (error) {
    console.error(
      "ERROR IN BOT START:",
      error
    );
  }
});

bot.command("paysupport", async (ctx) => {
  await ctx.reply(
    `ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ\nꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`
  );
});

bot.action(
  "pay_vip_stars",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await sendVipInvoice(ctx);
    } catch (error) {
      console.error(
        "ERROR pay_vip_stars:",
        error
      );

      await ctx
        .answerCbQuery("✘ᴇʀʀᴏʀ")
        .catch(() => {});
    }
  }
);

bot.action(
  "pay_user_stars",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await sendUserInvoice(ctx);
    } catch (error) {
      console.error(
        "ERROR pay_user_stars:",
        error
      );

      await ctx
        .answerCbQuery("✘ᴇʀʀᴏʀ")
        .catch(() => {});
    }
  }
);

bot.action(
  "back_to_main",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      await ctx
        .deleteMessage()
        .catch(() => {});

      await sendMainPanel(ctx);
    } catch (error) {
      console.error(
        "ERROR back_to_main:",
        error
      );
    }
  }
);

bot.action(
  "back_to_channels",
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      await ctx
        .deleteMessage()
        .catch(() => {});

      await sendChannelsPanel(ctx);
    } catch (error) {
      console.error(
        "ERROR back_to_channels:",
        error
      );
    }
  }
);

bot.on(
  "pre_checkout_query",
  async (ctx) => {
    try {
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error(
        "PRE CHECKOUT ERROR:",
        error
      );
    }
  }
);

async function handleMedia(ctx) {
  const userId = String(
    ctx.from?.id || ""
  );

  const pending =
    pendingVideoRequests.get(userId);

  if (!pending?.waitingForPhoto) {
    return;
  }

  pending.waitingForPhoto = false;
  pending.awaitingAdminApproval = true;

  pendingVideoRequests.set(
    userId,
    pending
  );

  try {
    const user = getUserMeta(ctx.from);

    await bot.telegram.copyMessage(
      ADMIN_CHAT_ID,
      ctx.chat.id,
      ctx.message.message_id,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✓ ᴀᴘᴘʀᴏᴠᴇ",
                callback_data:
                  `approve_video_${user.id}`,
              },
              {
                text: "✘ ʀᴇᴊᴇᴄᴛ",
                callback_data:
                  `reject_video_${user.id}`,
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.error(
      "SEND MEDIA ERROR:",
      error
    );

    await ctx.reply(
      "✘ ᴛʜᴇ ᴘʜᴏᴛᴏ ᴄᴏᴜʟᴅ ɴᴏᴛ ʙᴇ ꜱᴇɴᴛ. ᴛʀʏ ᴀɢᴀɪɴ."
    );
  }
}

bot.on("photo", handleMedia);
bot.on("video", handleMedia);

bot.on("text", async (ctx) => {
  const text =
    ctx.message.text.trim();

  const userId = String(
    ctx.from?.id || ""
  );

  const pending =
    pendingVideoRequests.get(userId);

  try {
    if (text === BTN_VIDEOCALL) {
      return await openVideocallFlow(ctx);
    }

    if (text === BTN_GET_FULL_ACCESS) {
      return await sendMembershipPanel(ctx);
    }

    if (text === BTN_VIP) {
      return await sendVipPanel(ctx);
    }

    if (text === BTN_USER) {
      return await sendUserPanel(ctx);
    }

    if (text === BTN_CHANNELS) {
      return await sendChannelsPanel(ctx);
    }

    if (text === BTN_REFRESH) {
      return await sendRefreshPanel(ctx);
    }

    if (text === BTN_SMOKELANDIA) {
      return await sendSmokelandiaChannelPanel(ctx);
    }

    if (text === BTN_USERFX_SITE) {
      return await sendUserFxChannelPanel(ctx);
    }

    if (
      text === BTN_CHANNELS_BACK ||
      text === BTN_BACK_MENU
    ) {
      pendingVideoRequests.delete(userId);
      return await sendMainPanel(ctx);
    }

    if (text === BTN_CANCEL) {
      pendingVideoRequests.delete(userId);
      return await sendMainPanel(ctx);
    }

    if (text === BTN_ZOOM) {
      return await ctx.reply(
        `📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ\nHaz clic en el botón para unirte a la videollamada por Zoom:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📹ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ",
                  url: ZOOM_URL,
                },
              ],
            ],
          },
        }
      );
    }

    if (text === BTN_TELEGRAM) {
      return await ctx.reply(
        `💬 ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ\nᴄʟɪᴄᴋ ᴛʜᴇ ʙᴜᴛᴛᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ ᴏɴ ᴛᴇʟᴇɢʀᴀᴍ:`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📹 ɪɴɪᴄɪᴀʀ ᴠɪᴅᴇᴏᴄᴀʟʟ",
                  url: TELEGRAM_CALL_URL,
                },
              ],
            ],
          },
        }
      );
    }
  } catch (error) {
    console.error(
      "ERROR HANDLING BUTTON TEXT:",
      error
    );

    const detail =
      error?.response?.description ||
      error?.message ||
      String(error);

    await ctx
      .reply(`✘ᴇʀʀᴏʀ: ${detail}`)
      .catch(() => {});

    return;
  }

  if (text.startsWith("/")) {
    return;
  }

  if (pending?.waitingForPhoto) {
    pending.invalidTextCount =
      (pending.invalidTextCount || 0) + 1;

    pendingVideoRequests.set(
      userId,
      pending
    );

    if (
      pending.invalidTextCount >= 4
    ) {
      pendingVideoRequests.delete(userId);

      await ctx.reply(
        "✘ ʀᴇQᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ."
      );

      await sendMainPanel(ctx);

      return;
    }

    await ctx.reply(
      "📸😏ʜᴏʟᴅ ᴜᴘ... ʟᴇᴍᴍᴇ ꜱᴇᴇ ᴀɴʏ ᴘɪᴄᴛᴜʀᴇ ᴏꜰ ʏᴏᴜ ꜰɪʀꜱᴛ, ᴛʜᴇɴ ɪ'ʟʟ ꜱᴇɴᴅ ᴛʜᴇ ʟɪɴᴋꜱ ᴛᴏ ᴄᴀʟʟ ᴍᴇ."
    );

    return;
  }

  await sendMainPanel(ctx);
});

bot.on(
  "successful_payment",
  handleSuccessfulPayment
);

bot.action(
  /^notify_me_(.+)$/,
  async (ctx) => {
    const requesterId =
      String(ctx.match[1]);

    await ctx.answerCbQuery(
      "ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ."
    );

    await ctx
      .editMessageReplyMarkup({
        inline_keyboard: [],
      })
      .catch(() => {});

    try {
      const user =
        getUserMeta(ctx.from);

      await adminBot.telegram.sendMessage(
        ADMIN_CHAT_ID,
        `🔔 Notify request
Name: ${escapeHtml(user.fullName)}
Username: ${escapeHtml(user.username)}
ID: ${escapeHtml(user.id)}
Target: ${escapeHtml(requesterId)}`,
        {
          parse_mode: "HTML",
        }
      );

      await bot.telegram.sendMessage(
        requesterId,
        "ꜰᴏʀ ꜱᴜʀᴇ! ꜱᴡɪɴɢ ʙʏ ᴍʏ ᴄʜᴀɴɴᴇʟ ᴀɴᴅ ꜱᴇᴇ ᴡʜᴀᴛ'ꜱ ɴᴇᴡ..",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "𝐔𝐬𝐞𝐫 Ŧҳ 🜲",
                  url:
                    "https://t.me/+v57jkAGn3DA0NWJh",
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      console.error(
        "NOTIFY_ME ERROR:",
        error
      );
    }
  }
);

bot.action(
  /^approve_video_(.+)$/,
  async (ctx) => {
    await ctx.answerCbQuery(
      "✅ ᴀᴘᴘʀᴏᴠᴇᴅ"
    );

    await ctx
      .editMessageReplyMarkup({
        inline_keyboard: [],
      })
      .catch(() => {});

    const requesterId =
      String(ctx.match[1]);

    const pending =
      pendingVideoRequests.get(
        requesterId
      );

    if (!pending) {
      await ctx.reply(
        "ʀᴇQᴜᴇꜱᴛ ɴᴏᴛ ꜰᴏᴜɴᴅ."
      );

      return;
    }

    pendingVideoRequests.delete(
      requesterId
    );

    await sendApprovedVideocallFlow(
      requesterId
    );
  }
);

bot.action(
  /^reject_video_(.+)$/,
  async (ctx) => {
    await ctx.answerCbQuery(
      "❌ ʀᴇᴊᴇᴄᴛᴇᴅ"
    );

    await ctx
      .editMessageReplyMarkup({
        inline_keyboard: [],
      })
      .catch(() => {});

    const requesterId =
      String(ctx.match[1]);

    pendingVideoRequests.delete(
      requesterId
    );

    const notifyKeyboard =
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ.",
            `notify_me_${requesterId}`
          ),
        ],
      ]);

    await bot.telegram.sendMessage(
      requesterId,
      `⏳ ɪ'ᴍ ᴊᴜꜱᴛ ɢᴇᴛᴛɪɴɢ ʀᴇᴀᴅʏ ᴛᴏ ʜᴀᴠᴇ ꜱᴏᴍᴇ ꜰᴜɴ ᴡɪᴛʜ ᴀ ɢᴜʏ. ɪ ᴍɪɢʜᴛ ᴍᴇꜱꜱᴀɢᴇ ʏᴏᴜ ʟᴀᴛᴇʀ ɪꜰ ᴛʜᴀᴛ'ꜱ ᴄᴏᴏʟ`,
      {
        reply_markup:
          notifyKeyboard.reply_markup,
      }
    );
  }
);

bot.catch((error) => {
  console.error(
    "TELEGRAF ERROR:",
    error
  );
});

adminBot.command(
  "myid",
  async (ctx) => {
    await ctx.reply(
      `chat_id: ${ctx.chat.id}`
    );
  }
);

adminBot.catch((error) => {
  console.error(
    "ADMIN TELEGRAF ERROR:",
    error
  );
});

export default async function handler(
  req,
  res
) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "telegram-webhook",
    });
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({
        ok: false,
        error: "Method not allowed",
      });
  }

  try {
    const secret =
      req.headers[
        "x-telegram-bot-api-secret-token"
      ];

    const update = req.body;

    if (!update) {
      return res
        .status(400)
        .json({
          ok: false,
          error: "Missing Telegram update",
        });
    }

    if (
      secret === ADMIN_WEBHOOK_SECRET
    ) {
      await adminBot.handleUpdate(update);

      return res
        .status(200)
        .json({
          ok: true,
          bot: "admin",
        });
    }

    if (
      secret === TELEGRAM_WEBHOOK_SECRET
    ) {
      await bot.handleUpdate(update);

      return res
        .status(200)
        .json({
          ok: true,
          bot: "main",
        });
    }

    console.warn(
      "INVALID TELEGRAM WEBHOOK SECRET"
    );

    return res
      .status(401)
      .json({
        ok: false,
        error: "Unauthorized",
      });
  } catch (error) {
    console.error(
      "BOT HANDLE UPDATE ERROR:",
      error
    );

    return res
      .status(200)
      .json({
        ok: true,
      });
  }
}