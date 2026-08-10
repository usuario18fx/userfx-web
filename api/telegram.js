import { Telegraf, Markup } from "telegraf";
import Redis from "ioredis";
import winston from "winston";
// LOGGER 
const logger = winston.createLogger({
   level: "info",
   format: winston.format.json(),
   transports: [new winston.transports.Console()],
   } ) ;
// ENV 
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const ADMIN_WEBHOOK_SECRET = process.env.ADMIN_WEBHOOK_SECRET;

const REDIS_URL = process.env.REDIS_URL;

const ZOOM_URL = process.env.ZOOM_URL;
const TELEGRAM_CALL_URL = process.env.TELEGRAM_CALL_URL;

const SMOKELANDIA_GROUP_LINK =
  process.env.SMOKELANDIA_GROUP_LINK ||
  "https://t.me/SmokelandiaFx_bot";

const USER_GROUP_LINK =
  process.env.USER_GROUP_LINK ||
  "https://t.me/+v57jkAGn3DA0NWJh";

const USERFX_SITE_URL =
  process.env.USERFX_SITE_URL ||
  "https://userfx-web.vercel.app";
// VALIDATE ENV 
const requiredEnv = {
  BOT_TOKEN,
  ADMIN_BOT_TOKEN,
  ADMIN_CHAT_ID,
  ADMIN_USER_ID,
  WEBHOOK_SECRET,
  ADMIN_WEBHOOK_SECRET,
  REDIS_URL,
  ZOOM_URL,
  TELEGRAM_CALL_URL,
} ;
const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missingEnv.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  ) ;
  } 
// REDIS 
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
} ) ;
redis.on("error", (error) => { logger.error("REDIS ERROR", {message: error?.message,stack: error?.stack,
} ) ;
} ) ;
// REDIS HELPERS 
async function redisGetJson(key) {
  try {
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    logger.error("REDIS GET ERROR", {
      key,
      message: error?.message,
    } ) ;
    return null;
  } }
async function redisSetJson(key, value, ttl = null) {
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.set(key, serialized, "EX", ttl);
    } else {
      await redis.set(key, serialized);
    }
    return true;
  } catch (error) {
    logger.error("REDIS SET ERROR", {
      key,
      message: error?.message,
    } ) ;
    return false;
  } }
async function redisDelete(key) {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error("REDIS DELETE ERROR", {
      key,
      message: error?.message,
    } ) ;
   } }
async function scanKeys(pattern) {
  const keys = [];
  let cursor = "0";
  try {
    do {
      const result = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      ) ;
      cursor = result[0];
      if (result[1]?.length) {
        keys.push(...result[1]);
      }
    } while (cursor !== "0");
    return keys;
  } catch (error) {
    logger.error("REDIS SCAN ERROR", {
      pattern,
      message: error?.message,
    } ) ;
    return [];
  } }
// DATA 
async function getPaidUser(userId) {
  return redisGetJson(`paid_user:${String(userId) } ` ) ;
}
async function setPaidUser(userId, data) {
  return redisSetJson(`paid_user:${String(userId)} `, data) ;
}
const VIDEO_REQUEST_TTL = 60 * 60 * 6;
async function getVideoRequest(userId) {
  return redisGetJson(`video_request:${String(userId)} ` ) ;
}
async function setVideoRequest(userId, data) {
  return redisSetJson(`video_request:${String(userId)} ` ,
    data,VIDEO_REQUEST_TTL
  ) ;
  }
async function deleteVideoRequest(userId) {
  await redisDelete(`video_request:${String(userId) } ` ) ;
  }
// PAYMENT IDEMPOTENCY 
async function hasProcessedPayment(chargeId) {
  if (!chargeId) {
  return false;
  }
  try {
  return Boolean(
  await redis.exists(`processed_payment:${String(chargeId) } ` ) ) ;
  } catch (error) {
    logger.error("PAYMENT CHECK ERROR", {
      chargeId,
      message: error?.message,
    } ) ;
    return false;
  } }
async function markPaymentProcessed(chargeId) {
  if (!chargeId) {
    return;
  }
  try {
  await redis.set(
      `processed_payment:${String(chargeId)}`,
      "1",
      "EX",
      60 * 60 * 24 * 365
    ) ;
    } catch (error) {
    logger.error("PAYMENT MARK ERROR", {chargeId,message: error?.message, } ) ;
  } }
// BOTS
const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);
bot.telegram.webhookReply = false;
adminBot.telegram.webhookReply = false;
// CONSTANTS
const VIP_STARS_PRICE = 1500;
const USER_STARS_PRICE = 500;
const STARS_130_PAYLOAD = "videocall_access_130";
const STARS_130_PRICE = 130;
const VIP_PAYLOAD = "vip_fx_access";
const USER_PAYLOAD = "user_fx_access";
const TIER_VIP = "ᴠɪᴘ";
const TIER_USER = "ᴜꜱᴇʀ";
const REQUEST_STATUS = {
  WAITING_PHOTO: "waiting_photo",
  AWAITING_ADMIN: "awaiting_admin",
  AWAITING_PAYMENT: "awaiting_payment",
  PAID: "paid",
  APPROVED: "approved",
   } ;
// BUTTONS
const BTN_VIDEOCALL = "📞 ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_GET_FULL_ACCESS = "🔥 ɢᴇᴛ ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ";
const BTN_VIP = "⚡ᴠɪᴘ";
const BTN_USER = "👑ᴜꜱᴇʀ";
const BTN_CHANNELS = "📺ᴄʜᴀɴɴᴇʟꜱ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";
const BTN_ZOOM = "🟦 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "💬 ᴛᴇʟᴇɢʀᴀᴍ";
const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_BACK_MENU = "↽ ʙᴀᴄᴋ";
const BTN_SMOKELANDIA = "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "𝐔𝐬𝐞𝐫 🜲∓ҳ";
const BTN_CHANNELS_BACK = "↽ ʙᴀᴄᴋ";
// UTILITIES
function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function getUserMeta(from) {
  const firstName = from?.first_name || "";
  const lastName = from?.last_name || "";

  const fullName =
    `${firstName} ${lastName}`.trim() || "No name";

  const username = from?.username
    ? `@${from.username}`
    : "sin_username";

  return {
    fullName,
    username,
    id: String(from?.id || ""),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ======================================================
// BUTTON TRACKING
// ======================================================
async function trackButtonClick(ctx, buttonName) {
  try {
    const user = getUserMeta(ctx.from);
    if (!user.id) {
      return;
    }
    const data = {
      fullName: user.fullName,
      username: user.username,
      id: user.id,
      button: buttonName,
      clickedAt: new Date().toISOString(),
    } ;
    await redis.set(
      `button_click:${user.id}:${Date.now()}`,
      JSON.stringify(data),
      "EX",
      60 * 60 * 24 * 30
   ) ;
   } catch (error) { logger.error("TRACK BUTTON ERROR", {
   message: error?.message,
   } ) ;
   } }
// RATE LIMIT
async function checkRateLimit(
  userId,
  limit = 3,
  windowSeconds = 300
  ) {
  try {
  const key = `rate_limit:videocall:${String(userId)}`;
  const count = await redis.incr(key);
  if (count === 1) {
  await redis.expire(key, windowSeconds);
  }
    return count <= limit;
  } catch (error) {
    logger.error("RATE LIMIT ERROR", {
      message: error?.message,
  } ) ;
  return true;
  } }
// KEYBOARDS
function getMainKeyboard() {
  return Markup.keyboard([
    [BTN_VIDEOCALL],
    [BTN_GET_FULL_ACCESS],
    [BTN_VIP, BTN_USER],
    [BTN_CHANNELS],
    [BTN_REFRESH],
  ] ) .resize () ;
  }
function getPendingPhotoKeyboard() {
  return Markup.keyboard ( [ [BTN_CANCEL] ,
  ] ) .resize () ;
  }
function getApprovedVideocallKeyboard() {
  return Markup.keyboard([
    [BTN_ZOOM, BTN_TELEGRAM] , [BTN_BACK_MENU] ,
  ] ) .resize () ;
  }
function getVideocallInlineKeyboard() {
  return {
    inline_keyboard: [
  [ { text: BTN_ZOOM,
        url: ZOOM_URL, } ,
    { text: BTN_TELEGRAM,
        url: TELEGRAM_CALL_URL, } ,
  ] , ] , } ; 
  }
function getStarsVipKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback( "⭐ ᴘᴀʏ ᴠɪᴘ ✪", "pay_vip_stars"
  ) , ] ,
  [Markup.button.callback( "↽ ʙᴀᴄᴋ", "back_to_main"
  ) , ] , ] ) ;
  }
function getStarsUserKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback( "⭐ ᴘᴀʏ ᴜꜱᴇʀ ✪", "pay_user_stars"
  ) , ] , 
  [Markup.button.callback( "↽ ʙᴀᴄᴋ", "back_to_main"
  ) , ] , ] ) ;
  }
function getChannelsKeyboard() {
  return Markup.keyboard([
    [BTN_SMOKELANDIA, BTN_USERFX_SITE] ,
    [BTN_CHANNELS_BACK] ,
  ] ) .resize () ; 
  }
// ACCESS
async function getAccessState(userId) {
  const entry = await getPaidUser(userId) ;
  return { hasVip: entry?.tier === TIER_VIP, hasUser:
      entry?.tier === TIER_USER ||
      entry?.tier === TIER_VIP, entry,
  } ;
  }
// TYPING
async function typing(ctx) {
  try {
    await ctx.sendChatAction("typing");
    await sleep(300);
  } catch {
  } }
// MAIN PANEL
async function sendMainPanel(ctx) {
  try {
    await typing(ctx);
    await ctx.reply(
      `Ŧҳ | ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ
    ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ.
    ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`,
    getMainKeyboard()
    ) ;
    } catch (error) {
    const errorCode = error?.response?.error_code;
    const description = error?.response?.description || "";
    if (
    errorCode === 403 &&
    description.includes("bot was blocked by the user")
    ) {
    logger.warn("TELEGRAM USER BLOCKED BOT", {
    userId: ctx.from?.id || null,
    username: ctx.from?.username || null,
    errorCode,
    description,
    } ) ;
    return; }
    throw error;
    } } 
// MEMBERSHIP
async function sendMembershipPanel(ctx) {
  await typing(ctx);
  await ctx.reply(
    `🔥 ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ

👑 ʙᴇɴᴇꜰɪᴛꜱ
⇀ ᴘʀɪᴏʀɪᴛʏ ᴀᴄᴄᴇꜱꜱ
⇀ ᴘʀɪᴠᴀᴛᴇ ᴜɴʟᴏᴄᴋꜱ
⇀ ᴡᴇᴇᴋ¹ / ᴀʟʙᴜᴍ¹

⚡ ʙᴇɴᴇꜰɪᴛs
⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
⇀ ᴘʀᴇᴍɪᴜᴍ ꜱᴇᴄᴛɪᴏɴꜱ
⇀ ᴡᴇᴇᴋꜱ³ / ᴀʟʙᴜᴍꜱ³`,
    getMainKeyboard()
  ) ;
  }
// VIP
async function sendVipPanel(ctx) {
  try { await ctx.reply(
      `ᴠɪᴘ⚡
ᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`, getStarsVipKeyboard()
  ) ;
  } catch (error) { logger.error("VIP PANEL ERROR", { message: error?.message,
  } ) ;
  } }
// USER
async function sendUserPanel(ctx) {
  try {
    await ctx.reply(
      `ᴜꜱᴇʀ👑
ᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
      getStarsUserKeyboard() ) ;
  } catch (error) {
    logger.error("USER PANEL ERROR", {
      message: error?.message,
  } ) ;
  } }
// CHANNELS
async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `📺ᴄʜᴀɴɴᴇʟꜱ
ᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`,
    getChannelsKeyboard() ) ;
  }
// REFRESH
async function sendRefreshPanel(ctx) {
  const { hasVip, hasUser } =
    await getAccessState(ctx.from?.id);
  const tier = hasVip
    ? "⚡ᴠɪᴘ"
    : hasUser
      ? "𝐔𝐬𝐞𝐫 🜲∓ҳ"
      : "ɴᴏ ᴘʟᴀɴ";
  await ctx.reply( `↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ ᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}`, getMainKeyboard()
  ) ;
  }
// VIDEOCALL FLOW 
async function openVideocallFlow(ctx) {
  const userId = String(ctx.from?.id || "");
  if (!userId) {
    return;
  }
  const allowed = await checkRateLimit(
    userId,
    3,
    300
    ) ;
  if (!allowed) {
    await ctx.reply(
      "⏳ Please wait before requesting again."
    ) ; 
    return;
   }
  const currentRequest =
    await getVideoRequest(userId);
  if (
    currentRequest?.status ===
      REQUEST_STATUS.WAITING_PHOTO ||
    currentRequest?.status ===
      REQUEST_STATUS.AWAITING_ADMIN ||
    currentRequest?.status ===
      REQUEST_STATUS.AWAITING_PAYMENT
  ) {
    await ctx.reply(
      "⏳ You already have an active videocall request."
  ) ;
    return;
  }
  const user = getUserMeta(ctx.from);
  await setVideoRequest(userId, {
    userId,
    fullName: user.fullName,
    username: user.username,
    status: REQUEST_STATUS.WAITING_PHOTO,
    invalidTextCount: 0,
    createdAt: Date.now(),
  } ) ;
  await ctx.reply(
    `ʜᴏʟᴅ ᴜᴘ...
ᴡᴇ ɴᴇᴇᴅ ᴀ ᴘʜᴏᴛᴏ ꜰɪʀꜱᴛ.
ꜱᴇɴᴅ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ʜᴇʀᴇ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ.`,
    getPendingPhotoKeyboard()
  );
  try {
    await adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      `📞 NEW VIDEOCALL REQUEST
Name:
${escapeHtml(user.fullName) }
Username:
${escapeHtml(user.username) }
ID:
${escapeHtml(user.id) }
Chat ID:
${escapeHtml(userId) }
Waiting for photo...`,
    { parse_mode: "HTML", }
    ) ;
    } catch (error) { logger.error("ADMIN REQUEST ERROR", { message: error?.message, } ) ;
    } } 
// APPROVED VIDEOCALL 
async function sendApprovedVideocallFlow(userId) {
  const targetUserId = String(userId);
  try {
    await bot.telegram.sendMessage(
      targetUserId,
      `✅ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ
ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ ᴀᴘᴘʀᴏᴠᴇᴅ.`
    ) ;
    await bot.telegram.sendMessage(
      targetUserId,
      `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.
ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ:`,
      {
        reply_markup:
          getVideocallInlineKeyboard(),
      });
    logger.info(
      "VIDEOCALL OPTIONS SENT",
      {userId: targetUserId,}
    ) ;
  } catch (error) {
    logger.error(
    "SEND APPROVED VIDEOCALL ERROR",
      {
        userId: targetUserId,
        message: error?.message,
        description:
        error?.response?.description,
      } ) ;
      } }
// INVOICES 
  async function sendVipInvoice(ctx) {
  const chatId =ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
  if (!chatId) {
  return;
  }
  try {
  await ctx.telegram.callApi("sendInvoice",
      { chat_id: chatId,
        title: "VIP ACCESS",
        description: "ᴠɪᴘ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: VIP_PAYLOAD,
        currency: "XTR",
        prices: [
     {  label: "VIP ACCESS",
        amount: VIP_STARS_PRICE,
     } , ] , } ) ;
  } catch (error) { logger.error("VIP INVOICE ERROR", {
      message: error?.message, description:error?.response?.description,
     } ) ;
     } }
  async function sendUserInvoice(ctx) {
  const chatId =
      ctx.chat?.id ||
      ctx.callbackQuery?.message?.chat?.id;
    if (!chatId) {
    return;
       }
    try {
    await ctx.telegram.callApi("sendInvoice",
      { chat_id: chatId,
        title: "USER FX ACCESS",
        description:
          "ᴜꜱᴇʀ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: USER_PAYLOAD,
        currency: "XTR",
        prices: [
      { label: "USER FX ACCESS", amount: USER_STARS_PRICE, } , ] , }
      ) ;
  } catch (error) {logger.error("USER INVOICE ERROR", {message: error?.message,description: error?.response?.description,
    } ) ;
    } }
async function sendStars130Invoice(userId) {
  try {
    await bot.telegram.callApi(
      "sendInvoice",
      { chat_id: userId,
        title: "VIDEOCALL ACCESS",
        description:
          "Access to the videocall service.",
        payload: STARS_130_PAYLOAD,
        currency: "XTR",
        prices: [
          {
        label: "VIDEOCALL ACCESS",
        amount: STARS_130_PRICE,
          } , ] , } );
  } catch (error) {
    logger.error(
      "130 STARS INVOICE ERROR",
      {userId, message: error?.message,}
      ) ;
      } } 
// PAYMENT 
async function handleSuccessfulPayment(ctx) {
  const payment =
    ctx.message?.successful_payment;
  if (!payment) {
    return;
   }
  const userId = String( ctx.from?.id || ""
  ) ;
  if (!userId) { return;
    }
  const chargeId = payment.telegram_payment_charge_id;
  const payload = payment.invoice_payload;
  logger.info("SUCCESSFUL PAYMENT", { userId, payload,chargeId,
   } ) ;
  if ( await hasProcessedPayment(chargeId)
   ) {
    logger.warn("DUPLICATE PAYMENT", {
      userId,
      payload,
      chargeId,
    } ) ;
    return;
    }
    await markPaymentProcessed(chargeId);
// VIDEOCALL 130 
  if (payload === STARS_130_PAYLOAD) {
  const request =
  await getVideoRequest(userId);
  if ( !request ||
        request.status !==
        REQUEST_STATUS.AWAITING_PAYMENT
    ) {
  await ctx.reply(
  `⚠️ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ, ʙᴜᴛ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇQᴜᴇꜱᴛ ᴡᴀꜱ ꜰᴏᴜɴᴅ.
  ᴘʟᴇᴀꜱᴇ ᴄᴏɴᴛᴀᴄᴛ ꜱᴜᴘᴘᴏʀᴛ.`
    ) ;
    return; }
    await setVideoRequest( userId,
    { ...request,
      status: REQUEST_STATUS.PAID,
      paidAt: Date.now(),
      telegramPaymentChargeId: chargeId,
    } ) ;
    await ctx.reply(`✅ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ
📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      {reply_markup: getVideocallInlineKeyboard() , } ) ;
    return; }
  // VIP
  if (payload === VIP_PAYLOAD) {
    await setPaidUser(userId, {
      telegramPaymentChargeId: chargeId,
      paidAt: Date.now(),
      tier: TIER_VIP,
    } ) ;
    await ctx.reply( `✅ ᴠɪᴘ ᴀᴄᴛɪᴠᴀᴛᴇᴅ
    ʏᴏᴜʀ "ᴠɪᴘ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`, getMainKeyboard()
    ) ;
    return; }
    if (payload === USER_PAYLOAD) {
    await setPaidUser(userId, {
    telegramPaymentChargeId: chargeId,
    paidAt: Date.now(),
    tier: TIER_USER, } ) ;
    await ctx.reply(`✅ "ᴜꜱᴇʀ" ᴀᴄᴛɪᴠᴀᴛᴇᴅ ʏᴏᴜʀ "ᴜꜱᴇʀ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`, getMainKeyboard()
    ) ;
    } }
// START
bot.start(async (ctx) => {
  try { await sendMainPanel(ctx) ; } catch (error) {
    logger.error("START ERROR", {
      message: error?.message,
      stack: error?.stack,
    } ) ;
    } } ) ;
// SUPPORT
bot.command("paysupport", async (ctx) => {
  await ctx.reply(`ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`
    ) ;
    } ) ;
// PAYMENT ACTIONS
bot.action( "pay_vip_stars", async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await sendVipInvoice(ctx);
    } catch (error) {
      logger.error("PAY VIP ERROR", {
        message: error?.message,
    } ) ;
    } } ) ;
bot.action("pay_user_stars", async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await sendUserInvoice(ctx);
    } catch (error) {
      logger.error("PAY USER ERROR", {
        message: error?.message,
    } ) ;
    } } ) ;
// BACK MAIN
bot.action("back_to_main", async (ctx) => {
    try {
      await ctx.answerCbQuery();
      try {
      await ctx.deleteMessage();
    } catch {
    }
      await sendMainPanel(ctx);
    } catch (error) {logger.error("BACK MAIN ERROR", {message: error?.message, } ) ;
    } } ) ;
// PRE CHECKOUT
bot.on("pre_checkout_query", async (ctx) => {
    try { await ctx.answerPreCheckoutQuery(true);
    } catch (error) { logger.error( "PRE CHECKOUT ERROR",
   { message: error?.message, } ) ;
   } } ) ;
// MEDIA 
async function handleMedia(ctx) { const userId = String( ctx.from?.id || "" ) ;
  if (!userId) {
  return;
  }
  const pending = await getVideoRequest(userId);
  if ( !pending || pending.status !== REQUEST_STATUS.WAITING_PHOTO ) {
  return;
  }
  const updatedPending = {...pending, status: REQUEST_STATUS.AWAITING_ADMIN, invalidTextCount: 0, photoReceivedAt: Date.now () , } ;
  await setVideoRequest( userId, updatedPending ) ;
  try { const user = getUserMeta(ctx.from) ;
    const adminKeyboard = Markup.inlineKeyboard ( [
        [Markup.button.callback (
             "⭐ ᴘᴀʏ 130 ꜱᴛᴀʀꜱ", `approve_stars_${user.id}` ) , ] ,
        [Markup.button.callback(
            "📞 ꜱᴇɴᴅ ᴢᴏᴏᴍ + ᴛᴇʟᴇɢʀᴀᴍ",
            `approve_call_${user.id}` ) , ] ,
        [Markup.button.callback(
            "✘ ʀᴇᴊᴇᴄᴛ", `reject_video_${user.id}` ) , ] ,
  ] ) ;
  await adminBot.telegram.sendMessage ( ADMIN_CHAT_ID,
      `📸 <b>NEW PHOTO RECEIVED</b>
  Name:
  ${escapeHtml(user.fullName)}
  Username:
  ${escapeHtml(user.username)}
  ID:
  ${escapeHtml(user.id)}
  The user's media is attached below.`,
      {parse_mode: "HTML",
       reply_markup: adminKeyboard.reply_markup , }
  ) ;
  await adminBot.telegram.copyMessage( ADMIN_CHAT_ID, ctx.chat.id, ctx.message.message_id
  ) ;
  await adminBot.telegram.sendMessage(
    ADMIN_CHAT_ID, "Choose an action:",
    {reply_markup: adminKeyboard.reply_markup,} ) ;
    await ctx.reply(
      `📸 ᴘʜᴏᴛᴏ ʀᴇᴄᴇɪᴠᴇᴅ. ᴡᴀɪᴛ ᴡʜɪʟᴇ ᴡᴇ ʀᴇᴠɪᴇᴡ ɪᴛ.`) ;
    } catch (error) {
    logger.error( "MEDIA HANDLER ERROR",
    {message: error?.message,description:error?.response?.description, } ) ;
    } }
    bot.on("photo", handleMedia);
    bot.on("video", handleMedia);
// USER TEXT
    bot.on("text", async (ctx) => {
    const text = String(ctx.message?.text || "").trim() ;
    const userId = String( ctx.from?.id || "" ) ;
    if (!userId) {
    return;
    }
    try { if (text === BTN_VIDEOCALL) {
    await trackButtonClick( ctx, "VIDEOCALL") ;
    return await openVideocallFlow(ctx) ;
    }
    if (text === BTN_GET_FULL_ACCESS) {
    await trackButtonClick(
    ctx, "FULL ACCESS") ;
    return await sendMembershipPanel(ctx) ;
    }
    if (text === BTN_VIP) {await trackButtonClick(ctx, "VIP") ;
    return await sendVipPanel(ctx) ;
    }
    if (text === BTN_USER) {await trackButtonClick(ctx,"USER") ;
    return await sendUserPanel(ctx);
    }
    if (text === BTN_CHANNELS) {
    await trackButtonClick( ctx,"CHANNELS") ;
    return await sendChannelsPanel(ctx) ;
    }
    if (text === BTN_REFRESH) {await trackButtonClick(ctx,"REFRESH") ;
    return await sendRefreshPanel(ctx) ;
    }
      if (text === BTN_CANCEL) {
      await deleteVideoRequest(userId) ;
      return await sendMainPanel(ctx) ;
      }
      if (
      text === BTN_BACK_MENU ||
      text === BTN_CHANNELS_BACK
      ) {
      await deleteVideoRequest(userId);
      return await sendMainPanel(ctx);
      }
      if (text === BTN_ZOOM) {
      return await ctx.reply(
      "📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ",
      {reply_markup: {inline_keyboard: [
      [ {text: "📹 ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ", url: ZOOM_URL , } , ] , ] , } ,
      } ) ; 
      }
    if (text === BTN_TELEGRAM) {
      return await ctx.reply( "💬 ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ",
      { reply_markup: { inline_keyboard: [
      [ { text:  "📹 ɪɴɪᴄɪᴀʀ ᴠɪᴅᴇᴏᴄᴀʟʟ", url: TELEGRAM_CALL_URL, } ,
      ] , ] , } , } ) ;
      }
    if (text === BTN_SMOKELANDIA) {
      return await ctx.reply("𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
      {reply_markup: {inline_keyboard: [
      [ {text: "↗ ᴏᴘᴇɴ", url: SMOKELANDIA_GROUP_LINK, } , ] , ] , } , } ) ;
      }
    if (text === BTN_USERFX_SITE) {
     return await ctx.reply("𝐔𝐬𝐞𝐫 🜲∓ҳ",
     {reply_markup: {inline_keyboard: [ [ {text: "↗ ᴇɴᴛᴇʀ",url:USERFX_SITE_URL , } ,
     ] , ] , } , } ) ;
     }
    if (text.startsWith("/")) {return ; }
     const pending = await getVideoRequest(userId) ;
    if (
      pending?.status ===
      REQUEST_STATUS.WAITING_PHOTO
     ) {
     const invalidTextCount =
     Number(pending.invalidTextCount || 0) + 1;
     if (invalidTextCount >= 4) {await deleteVideoRequest(userId);
     await ctx.reply("✘ ʀᴇQᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ.") ;
     return await sendMainPanel(ctx); }
     await setVideoRequest(userId,
      {...pending,invalidTextCount, } ) ;
     await ctx.reply( "📸 ʜᴏʟᴅ ᴜᴘ... ꜱᴇɴᴅ ᴀ ᴘʜᴏᴛᴏ ꜰɪʀꜱᴛ.") ;
     return ; }
     await sendMainPanel(ctx);
     } catch (error) {
     logger.error( "TEXT HANDLER ERROR",
     {message: error?.message,stack: error?.stack,description:error?.response?.description,
     } ) ;
     } } ) ;
// PAYMENT EVENT
     bot.on("successful_payment",handleSuccessfulPayment) ;
// ADMIN AUTH
     function isAdmin(ctx) {
     return ( String(ctx.from?.id || "") === String(ADMIN_USER_ID) ) ; 
     }
// ADMIN APPROVE STARS
     adminBot.action( /^approve_stars_(\d+)$/,async (ctx) => { const adminId = String( ctx.from?.id || "" ) ;
    if ( adminId !== String(ADMIN_USER_ID)
    ) {
    await ctx.answerCbQuery("❌ Unauthorized" ) ;
    return;
    }
    const requesterId = String(ctx.match[1]);
    const pending = await getVideoRequest(
    requesterId
    ) ;
    if ( !pending || pending.status !== REQUEST_STATUS.AWAITING_ADMIN
    ) {
    await ctx.answerCbQuery("Request not found") ;
    return;
    }
    try {
    await ctx.answerCbQuery( "⭐ Payment selected") ;
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] , } ) 
    .catch( () => {} ) ;
    await setVideoRequest( requesterId,
    {...pending,status:REQUEST_STATUS.AWAITING_PAYMENT,paymentRequestedAt:Date.now () , } ) ;
    await bot.telegram.sendMessage(requesterId,
    `✅ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ
     ᴘʟᴇᴀꜱᴇ ᴄᴏᴍᴘʟᴇᴛᴇ ᴛʜᴇ 130 ꜱᴛᴀʀꜱ ᴘᴀʏᴍᴇɴᴛ.`
    ) ;
    await sendStars130Invoice( requesterId
    ) ;
    } catch (error) {
      logger.error(
        "APPROVE STARS ERROR",
        {
          requesterId,
          message:
            error?.message,
    } ) ;
    } } ) ;
// ADMIN APPROVE CALL
adminBot.action(
  /^approve_call_(\d+)$/,
  async (ctx) => {
    const adminId = String(
      ctx.from?.id || ""
    ) ;
    if (
      adminId !==
      String(ADMIN_USER_ID)
    ) {
      await ctx.answerCbQuery(
        "❌ Unauthorized"
    ) ;
      return;
    }
    const requesterId = String(ctx.match[1]);
    const pending =
    await getVideoRequest(requesterId
    ) ;
    if (!pending || pending.status !==REQUEST_STATUS.AWAITING_ADMIN
    ) {
    await ctx.answerCbQuery("Request not found"
    ) ;
    return;
    }
    try {
    await ctx.answerCbQuery (
    "📞 Videocall selected"
    ) ;
    await ctx
    .editMessageReplyMarkup ( {
    inline_keyboard: [] ,
    } )
    .catch(() => {});
      await setVideoRequest(
        requesterId,
        {
          ...pending,
          status:
            REQUEST_STATUS.APPROVED,
          approvedAt: Date.now(),
        });
      await sendApprovedVideocallFlow(
        requesterId
      );
    } catch (error) { logger.error(
    "APPROVE CALL ERROR",
    { requesterId, message: error?.message,
    } ) ;
    } } ) ;
// ======================================================
// ADMIN REJECT
// ======================================================
adminBot.action(
  /^reject_video_(\d+)$/,
  async (ctx) => {
    const adminId = String(
      ctx.from?.id || ""
    );
    if (adminId !==String(ADMIN_USER_ID)
    ) {
    await ctx.answerCbQuery(
    "❌ Unauthorized"
    );
    return;
    }
    const requesterId =String(ctx.match[1]);
    const pending = 
    await getVideoRequest(requesterId
    );
    if (!pending) {
    await ctx.answerCbQuery(
    "Request not found"
    );
    return;
    }
    try {
    await ctx.answerCbQuery(
    "❌ ʀᴇᴊᴇᴄᴛᴇᴅ"
    );
    await ctx
    .editMessageReplyMarkup({
    inline_keyboard: [],
    } )
    .catch(() => {});
    await deleteVideoRequest(
    requesterId
    ) ;
    const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(
      "ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ.",
      `notify_me_${requesterId}`
    ) , ] , ] ) ;
    await bot.telegram.sendMessage(requesterId,
      `⏳ ɪ'ᴍ ᴊᴜꜱᴛ ɢᴇᴛᴛɪɴɢ ʀᴇᴀᴅʏ.
ɪ ᴍɪɢʜᴛ ᴍᴇꜱꜱᴀɢᴇ ʏᴏᴜ ʟᴀᴛᴇʀ ɪꜰ ᴛʜᴀᴛ'ꜱ ᴄᴏᴏʟ.`,
    {reply_markup: keyboard.reply_markup, }
    ) ;
    } catch (error) { logger.error( "REJECT ERROR",
    {requesterId, message: error?.message,} ) ;
    } } ) ;
// NOTIFY ME
  bot.action(/^notify_me_(\d+)$/, async (ctx) => {
    const requesterId =
      String(ctx.match[1]);
    const clickedUserId =
      String(ctx.from?.id || "");
    if ( clickedUserId !== requesterId
    ) {
    await ctx.answerCbQuery("❌ Unauthorized" ) ;
    return;
    }
    try {
    await ctx.answerCbQuery("ʏᴇᴀ🔥") ;
    await ctx
    .editMessageReplyMarkup({ inline_keyboard: [],
    } )
    .catch(() => {} ) ;
    const user = getUserMeta(ctx.from);
    await adminBot.telegram.sendMessage(ADMIN_CHAT_ID,
    `🔔 <b>NOTIFY REQUEST</b>
    Name:
    ${escapeHtml(user.fullName) }
    Username:
    ${escapeHtml(user.username) }
    ID:
    ${escapeHtml(user.id) }
    Target:
    ${escapeHtml(requesterId)}`,
    {parse_mode: "HTML" , } ) ;
    await bot.telegram.sendMessage( requesterId,
    `ꜰᴏʀ ꜱᴜʀᴇ!
     ꜱᴡɪɴɢ ʙʏ ᴍʏ ᴄʜᴀɴɴᴇʟ ᴀɴᴅ ꜱᴇᴇ ᴡʜᴀᴛ'ꜱ ɴᴇᴡ..`,
    {reply_markup: {inline_keyboard: [
    [ { text:"𝐔𝐬ᴇʀ 🜲∓ҳ",url:USER_GROUP_LINK, } , ] ,
    [ { text: "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ",url: SMOKELANDIA_GROUP_LINK, } , ] , ] , } , } ) ;
    } catch (error) { logger.error("NOTIFY ERROR",
        {requesterId,message:error?.message , }
    ) ;
    } } ) ;
// ======================================================
// REPORT
// ======================================================

bot.command(
  "report",
  async (ctx) => {
    if (!isAdmin(ctx)) {
      return;
    }

    try {
      const keys =
        await scanKeys(
          "button_click:*"
        );

      if (!keys.length) {
        await ctx.reply(
          "📊 No button clicks recorded yet."
        );

        return;
      }

      const values =
        await redis.mget(...keys);

      const clicks = values
        .filter(Boolean)
        .map((value) => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
      } } )
      .filter(Boolean)
      .sort(
      (a, b) => new Date( b.clickedAt ).getTime() -
      new Date( a.clickedAt ).getTime()
      );
      let report =
        "📊 <b>BUTTON CLICK REPORT</b>\n\n";
      clicks.forEach( ( click, index ) => { report +=
       `<b>${index + 1}. ${escapeHtml( click.fullName ) } </b>\n` +
       `Username: ${escapeHtml( click.username ) } \n` +
       `ID: <code>${escapeHtml( click.id ) } </code>\n` +
       `Button: <b>${escapeHtml( click.button ) }</b>\n` +
       `Date: ${escapeHtml( click.clickedAt) }\n\n`; } ) ;
      const chunks = [];
      while (report.length > 0) {
        chunks.push(
          report.slice(0, 3900)
        ) ;
        report = report.slice(3900) ; 
          }
      for (const chunk of chunks) {
      await ctx.reply(
      chunk,
      { parse_mode: "HTML", } );
      }
    } catch (error) {
      logger.error(
        "REPORT ERROR",
        {message: error?.message,
      } ) ;
      await ctx.reply(
        "❌ Error generating report."
      ) ;
      } } ) ;
// ADMIN ID 
adminBot.command(
  "myid",
  async (ctx) => {
    await ctx.reply(
      `chat_id: ${ctx.chat?.id}\nuser_id: ${ctx.from?.id}`
    ) ;
   } ) ;
// ERROR HANDLERS 
bot.catch((error) => {
  logger.error("BOT ERROR", {
    message: error?.message,
    stack: error?.stack,
    description:
      error?.response?.description,
    } ) ;
   } ) ;
adminBot.catch((error) => {
  logger.error("ADMIN BOT ERROR", {
    message: error?.message,
    stack: error?.stack,
    description:
    error?.response?.description,
    } ) ;
   } ) ;
// WEBHOOK HANDLER 
export const config = {
  api: {
    bodyParser: false,
  } , } ;
// READ RAW BODY 
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    } ) ;
    req.on("end", () => {
      resolve(body);
    } ) ;
    req.on("error", (error) => {
    reject(error);
    } ) ;
  } ) ;
  }
// PARSE TELEGRAM BODY 
function parseTelegramBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    throw new Error("Request body is empty") ;
  } 
  if (typeof rawBody === "object") {
    return rawBody;
  }
  let raw = String(rawBody) ;
  // Elimina BOM UTF-8
  raw = raw.replace(/^\uFEFF/, "") ;
  // Elimina espacios/saltos de línea
  raw = raw.trim() ;
  if (!raw) {
    throw new Error("Request body is empty") ;
  }
  // JSON normal
  try {
    return JSON.parse(raw);
  } catch (firstError) { 
    try {
    const decoded = JSON.parse(raw);
    if (typeof decoded === "string") {
        return JSON.parse(decoded);
    }
      return decoded;
      } catch {
      throw firstError;
    } } } 
// WEBHOOK HANDLER 
export default async function handler(req, res) {
  logger.info("TELEGRAM WEBHOOK REQUEST", {
    method: req.method,
    contentType: req.headers["content-type"] || null,
    contentLength: req.headers["content-length"] || null,
    secretPresent: Boolean(
    req.headers["x-telegram-bot-api-secret-token"]
    ) ,
    } ) ;
  // GET = HEALTH CHECK 
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "telegram-webhook",
      status: "online",
    } ) ;
    } 
  // POST ONLY
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    } ) ;
    } 
  // SECRET 
  const incomingSecret =
    req.headers["x-telegram-bot-api-secret-token"];
  const isAdmin =
    incomingSecret &&
    ADMIN_WEBHOOK_SECRET &&
    incomingSecret === ADMIN_WEBHOOK_SECRET;
  const isUser =
    incomingSecret &&
    WEBHOOK_SECRET &&
    incomingSecret === WEBHOOK_SECRET;
  if (!isAdmin && !isUser) {
    logger.warn("INVALID TELEGRAM WEBHOOK SECRET", {
      secretPresent: Boolean(incomingSecret),
    } ) ;
    return res.status(401).json({
      ok: false,
      error: "unauthorized",
    } ) ;
    } 
  // READ BODY 
  let rawBody;
  try {
    rawBody = await readRawBody(req);
    logger.info("TELEGRAM RAW BODY", {
      type: typeof rawBody,
      length:
        typeof rawBody === "string"
          ? rawBody.length
          : null,
      preview:
        typeof rawBody === "string"
          ? rawBody.slice(0, 300)
          : null,
    });
  } catch (error) {
    logger.error("BODY READ ERROR", {
      message: error?.message || null,
      stack: error?.stack || null,
    } ) ;
    return res.status(400).json({
      ok: false,
      error: "body_read_error",
      message: error?.message || "Unable to read request body",
    } ) ;
    }
// PARSE JSON 
  let update;
  try {
    update = parseTelegramBody(rawBody);
  } catch (error) {
    logger.error("BODY JSON PARSE ERROR", {
      message: error?.message || null,
      rawBody:
        typeof rawBody === "string"
          ? rawBody.slice(0, 1000)
          : null,
      rawBodyLength:
        typeof rawBody === "string"
          ? rawBody.length
          : null,
    } ) ;
    return res.status(400).json({
      ok: false,
      error: "invalid_json",
      message:
        error?.message || "Invalid JSON",
    } ) ;
    } 
  // VALIDATE UPDATE 
    if ( !update || typeof update !== "object" || Array.isArray(update)
    ) {
    return res.status(400).json({ok: false,error: "invalid_update",
    } ) ;
    }
  logger.info("TELEGRAM UPDATE RECEIVED", {
    bot: isAdmin ? "admin" : "user",
    updateId: update.update_id ?? null,
    hasMessage: Boolean(update.message),
    hasCallback: Boolean(update.callback_query),
   } );
  // ADMIN BOT
  try {
    if (isAdmin) {
      await adminBot.handleUpdate(update) ;
      return res.status(200).json( { ok: true, bot: "admin", } ) ;
    } 
    // USER BOT 
    await bot.handleUpdate(update);
    return res.status(200).json({
      ok: true,
      bot: "user",
    });
  } catch (error) {
    logger.error("BOT HANDLE UPDATE ERROR", {
      name: error?.name || null,
      message: error?.message || null,
      stack: error?.stack || null,
      description:
        error?.response?.description || null,
    } ) ;
    return res.status(500).json({
      ok: false,
      error: "telegram_handler_error",
      name: error?.name || null,
      message:
        error?.message || "unknown_error",
      description:
        error?.response?.description || null,
    } ) ;
    } }