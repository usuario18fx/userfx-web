import { Telegraf, Markup, Input } from "telegraf";
import Redis from "ioredis";
import winston from "winston";
import path from "path";
// =================== LOGGER ===================
const logger = winston.createLogger({ level: "info", format: winston.format.json(),transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error",
  } ) ,
    new winston.transports.File({ filename: "combined.log",
  } ) , ] , } ) ;
// =================== CONFIG ===================
export const config = { api: { bodyParser: true,
  } , } ;
export const maxDuration = 60;
// =================== ENV ===================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const ADMIN_WEBHOOK_SECRET = process.env.ADMIN_WEBHOOK_SECRET;
const REDIS_URL = process.env.REDIS_URL;
// =================== ENV VALIDATION ==================
const requiredEnv = {
  BOT_TOKEN,
  ADMIN_BOT_TOKEN,
  ADMIN_CHAT_ID,
  WEBHOOK_SECRET,
  ADMIN_WEBHOOK_SECRET,
  REDIS_URL,
};
const missingEnv = Object.entries(requiredEnv)  .filter(([, value]) => !value) .map(([key]) => key);
if (missingEnv.length > 0) { throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`
  ) ; }
// =================== REDIS ===================
const redis = new Redis(REDIS_URL);
redis.on("error", (error) => { logger.error("REDIS ERROR", {  message: error?.message,  stack: error?.stack,
  } ) ; } ) ;
const getPaidUser = async (userId) => {
  try { const data = await redis.get(`paid_user:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error("REDIS GET ERROR", { message: error?.message,
  } ) ;
    return null;
  } } ;
const setPaidUser = async (userId, data) => {
  try { await redis.set( `paid_user:${userId}`,  JSON.stringify(data)
  ) ;
  } catch (error) {
    logger.error("REDIS SET ERROR", { message: error?.message,
  } ) ; } } ;
// =================== BOT ==================
const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);
bot.telegram.webhookReply = false;
adminBot.telegram.webhookReply = false;
// =================== CONSTANTS ===================
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const TELEGRAM_CALL_URL =
  "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY";
const USER_GROUP_LINK =
  "https://t.me/+2P62YW1Pt441NDUx";
const SMOKELANDIA_GROUP_LINK =
  "https://t.me/SmokelandiaFx_bot";
const VIP_STARS_PRICE = 1500;
const USER_STARS_PRICE = 500;
const VIP_PAYLOAD = "vip_fx_access";
const USER_PAYLOAD = "user_fx_access";
const TIER_VIP = "ᴠɪᴘ";
const TIER_USER = "ᴜꜱᴇʀ";
// =================== GLOBAL STATE ===================
const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests || new Map();
const paidUsers =
  globalThis.__fxPaidUsers || new Map();
if (!globalThis.__fxPendingVideoRequests) { globalThis.__fxPendingVideoRequests = pendingVideoRequests;
}
if (!globalThis.__fxPaidUsers) { globalThis.__fxPaidUsers = paidUsers;
}
// =================== BUTTONS ===================
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
const BTN_SMOKELANDIA = "ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "𝐔𝐬𝐞𝐫🜲Ŧҳ";
const BTN_CHANNELS_BACK = "↽ ʙᴀᴄᴋ";
// =================== UTILS ===================
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
  const username = from?.username
    ? `@${from.username}`
    : "sin_username";
  const id = String(from?.id || "");
  return { fullName, username, id,
  };}
function assets(filename) {
  return path.join( process.cwd(), "assets", filename
  );}
// =================== RATE LIMIT ===================
const rateLimiter = new Map();
function checkRateLimit( userId, limit = 5, window = 60000
) {
  const now = Date.now();
  const requests = rateLimiter.get(userId) || [];
  const recent = requests.filter((time) => now - time < window
    );
  if (recent.length >= limit) {
    return false;
  }
  recent.push(now); rateLimiter.set( userId, recent
  );
  return true;
}
// =================== KEYBOARDS ===================
function getMainKeyboard() {
  return Markup.keyboard([
    [BTN_VIDEOCALL],
    [BTN_GET_FULL_ACCESS],
    [BTN_VIP, BTN_USER],
    [BTN_CHANNELS],
    [BTN_REFRESH],
  ])
    .resize();
}
function getPendingPhotoKeyboard() {
  return Markup.keyboard([ [BTN_CANCEL],
  ])
    .resize();
}
function getApprovedVideocallKeyboard() {
  return Markup.keyboard([
    [BTN_ZOOM, BTN_TELEGRAM],
    [BTN_BACK_MENU],
    ])
    .resize();
    }
function getStarsVipKeyboard() { return Markup.inlineKeyboard([
    [ Markup.button.callback( "⭐ ᴘᴀʏ ᴠɪᴘ ✪", "pay_vip_stars"
    ) , ],
    [ Markup.button.callback( "↽ ʙᴀᴄᴋ",  "back_to_main"
     ) , ] , ] ) ; }
function getStarsUserKeyboard() { return Markup.inlineKeyboard([
    [ Markup.button.callback( "⭐ ᴘᴀʏ ᴜꜱᴇʀ ✪", "pay_user_stars") ,
    ] , [ Markup.button.callback( "↽ ʙᴀᴄᴋ", "back_to_main"
    ) , ] , ] ) ; }
function getChannelsKeyboard() {
  return Markup.keyboard([
    [ BTN_SMOKELANDIA, BTN_USERFX_SITE, ] ,
    [ BTN_CHANNELS_BACK ] ,
    ] )
    .resize();
    }
 function getAccessState(userId) {
  const entry = paidUsers.get(String(userId));
  return {  hasVip: entry?.tier === TIER_VIP, hasUser:
      entry?.tier === TIER_USER ||
      entry?.tier === TIER_VIP,
     } ; }
// =================== TYPING ===================
async function typing( ctx, action = "typing"
    ) {
  try {  const delay = 800 + Math.floor( Math.random() * 1800
    ) ;
    await ctx.sendChatAction(action);
    await new Promise( (resolve) => setTimeout(resolve, delay)
    ) ;
  } catch (error) {logger.error("TYPING ERROR", { message: error?.message,
    } ) ; } }
// =================== MAIN PANEL ===================
async function sendMainPanel(ctx) {
  await typing(ctx);
  await ctx.reply( `Ŧҳ | ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ\nᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ. ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`, getMainKeyboard()
  ) ; }
// =================== MEMBERSHIP ===================
async function sendMembershipPanel(ctx) {
  await typing(ctx);
  await ctx.reply( `🔥 ꜰᴜʟʟ ᴀᴄᴄᴇꜱꜱ\n\n👑 ʙᴇɴᴇꜰɪᴛꜱ\n⇀ ᴘʀɪᴏʀɪᴛʏ ᴀᴄᴄᴇꜱꜱ\n⇀ ᴘʀɪᴠᴀᴛᴇ ᴜɴʟᴏᴄᴋꜱ\n⇀ ᴡᴇᴇᴋ¹ / ᴀʟʙᴜᴍ¹\n\n⚡ ʙᴇɴᴇꜰɪᴛꜱ\n⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ\n⇀ ᴘʀᴇᴍɪᴜᴍ ꜱᴇᴄᴛɪᴏɴꜱ\n⇀ ᴡᴇᴇᴋꜱ³ / ᴀʟʙᴜᴍꜱ³`, getMainKeyboard()
 ) ; }
// =================== VIP ===================
async function sendVipPanel(ctx) {
  try { await ctx.replyWithVideo( "Gs1OgH5HZGzdmjgWmCalvexfhI4DGJN6FuJ-J7JlaLQUeB4c8Xw0_ju086n6YM_g",
       { caption:`ᴠɪᴘ⚡\nᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,  reply_markup: getStarsVipKeyboard().reply_markup,
       } ) ;
       } catch (error) { logger.error("ERROR sendVipPanel",
       { message: error?.message,
       } ) ;
      await ctx.reply( `ᴠɪᴘ⚡\nᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`, getStarsVipKeyboard()
      ) ; } } 
// =================== USER ===================
async function sendUserPanel(ctx) {
  try { await ctx.replyWithPhoto(
      "r7iZgQjb73xKY4_5WH2DbV7GHk7P9zoC7RuHnB9wIHPQ_o0hbBcNyVhQA4uVN7GT",
      { caption: `ᴜꜱᴇʀ👑\nᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`, reply_markup: getStarsUserKeyboard().reply_markup,
      } ) ;
      } catch (error) { logger.error(  "ERROR sendUserPanel",
      { message: error?.message,
      } ) ;
      await ctx.reply( `ᴜꜱᴇʀ👑\nᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`, getStarsUserKeyboard()
      ) ; } } 
// =================== CHANNELS ===================
async function sendChannelsPanel(ctx) {
  await ctx.reply( `📺ᴄʜᴀɴɴᴇʟꜱ\nᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`, getChannelsKeyboard()
     ) ; }
// =================== REFRESH ===================
async function sendRefreshPanel(ctx) {
  const { hasVip, hasUser,
  } = getAccessState( ctx.from?.id
  ) ;
  const tier = hasVip ? "⚡ᴠɪᴘ"
                      : hasUser
                         ? "𝐔𝐬𝐞𝐫🜲Ŧҳ"
                         : "ɴᴏ ᴘʟᴀɴ";
   await ctx.reply( `↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ\nᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}`, getMainKeyboard()
    ) ; }
// =================== VIDEOCALL ===================
async function openVideocallFlow(ctx) {
 const userId = String(ctx.from?.id || "");
  if (!userId) { return;
            }
            if ( !checkRateLimit( userId, 3, 300000
            ) ) {
            await ctx.reply("⏳ Please wait before requesting again."
            ) ;
            return;
            }
            pendingVideoRequests.set( userId,
            {
            waitingForPhoto: true,
            awaitingAdminApproval: false,
            invalidTextCount: 0,
            createdAt: Date.now(),
         } ) ;
          try {
          await ctx.replyWithVideo( Input.fromLocalFile( assets("FX-Y24V01.mp4")
           ) , {
           caption: `ʜᴏʟᴅ ᴜᴘ, ʙᴇꜰᴏʀᴇ ᴡᴇ ᴋᴇᴇᴘ ɢᴏɪɴɢ, ᴄᴀɴ ɪ ꜱᴇᴇ ᴀ ᴘɪᴄ ᴏꜰ ʏᴏᴜ? ɪ ᴡᴀɴɴᴀ ᴋɴᴏᴡ ᴡʜᴏ ɪ'ᴍ ᴛᴀʟᴋɪɴɢ ᴛᴏ...\n\nᴛʜᴇɴ ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʙᴜᴛᴛᴏɴꜱ.`,...getPendingPhotoKeyboard(),
          } ) ;
          } catch (error) {  logger.error( "SEND VIDEO ERROR",
         { message: error?.message,
         } ) ;
         await ctx.reply(  `ʜᴏʟᴅ ᴜᴘ... ᴄᴀɴ ɪ ꜱᴇᴇ ᴀ ᴘɪᴄ ᴏꜰ ʏᴏᴜ?`
         ) ; }
         const user = getUserMeta(ctx.from);
         try {  await adminBot.telegram.sendMessage( ADMIN_CHAT_ID,`📞 <b>New videocall request</b>\n\nName: <b>${escapeHtml(user.fullName)}</b>\nUsername: <b>${escapeHtml(user.username)}</b>\nID: <code>${escapeHtml(user.id)}</code>\nChat ID User: <code>${escapeHtml(userId)}</code>\n\nᴇꜱᴘᴇʀᴀɴᴅᴏ ꜱᴜ ꜰᴏᴛᴏ...`,
        { parse_mode: "HTML",
        } ) ;
        } catch (error) { logger.error( "ADMIN MESSAGE ERROR",
        { message: error?.message,
        } ) ; } } 
// =================== APPROVED ===================
async function sendApprovedVideocallFlow( serId
       ) {
       await bot.telegram.sendMessage( userId, `✅ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ\nʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ ᴀᴘᴘʀᴏᴠᴇᴅ.`
       ) ;
       await bot.telegram.sendMessage( userId,  `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.\nᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ:`, getApprovedVideocallKeyboard()
       ) ; }
// =================== INVOICES ===================
async function sendVipInvoice(ctx) {
  const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat?.id;
      if (!chatId) { logger.error( "NO CHAT ID VIP INVOICE"
      ) ;
      return;
      }
      try { await ctx.telegram.callApi( "sendInvoice",
      {        
      chat_id: chatId,
      title: "VIP ACCESS",
      description:"ᴠɪᴘ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
      payload: VIP_PAYLOAD,
      currency: "XTR",
      prices: [
      {
      label: "VIP ACCESS",
      amount: VIP_STARS_PRICE,
      } , ] , } ) ;
      }  catch (error) {logger.error(  "VIP INVOICE ERROR",
      {
      message: error?.message,
       } ) ; 
      await ctx.reply( "❌ᴘᴀʏᴍᴇɴᴛ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴇʀʀᴏʀ."
      ) ; } }
async function sendUserInvoice(ctx) {
  const chatId =  ctx.chat?.id ||  ctx.callbackQuery?.message?.chat?.id;
      if (!chatId) {  logger.error( "NO CHAT ID USER INVOICE"
      ) ;
      return;
      }
      try { await ctx.telegram.callApi(  "sendInvoice",      
    { chat_id: chatId,
      title: "USER FX ACCESS",
      description:  "ᴜꜱᴇʀ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
      payload: USER_PAYLOAD,
      currency: "XTR",
      prices: [
      {
      label: "USER FX ACCESS",
      amount: USER_STARS_PRICE,
     } , ] , } ) ;
     } catch (error) { logger.error(  "USER INVOICE ERROR",
     { message: error?.message,
     } ) ; 
     await ctx.reply( "❌ᴘᴀʏᴍᴇɴᴛ ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴇʀʀᴏʀ."
     ) ; } }
// =================== PAYMENT ===================
async function handleSuccessfulPayment(  ctx
) {
  const payment =  ctx.message?.successful_payment; if (!payment) {  return;
  }
  const userId = String(ctx.from?.id || "");
  const chargeId = payment.telegram_payment_charge_id;
  const data = { telegramPaymentChargeId:  chargeId, paidAt: Date.now(),
     } ;
     if ( payment.invoice_payload === VIP_PAYLOAD
     ) {
    const entry = { ...data, tier: TIER_VIP,
    };
     paidUsers.set( userId, entry
    ) ;
       await setPaidUser( userId, entry
       ) ;
       await ctx.reply( `✅ ᴠɪᴘ ᴀᴄᴛɪᴠᴀᴛᴇᴅ\nʏᴏᴜʀ "ᴠɪᴘ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`, getMainKeyboard()
       ) ;
        return;
       }
  if ( payment.invoice_payload === USER_PAYLOAD
       ) {
  const entry = {...data, tier: TIER_USER,
       } ;
       paidUsers.set( userId, entry
       ) ;
       await setPaidUser( userId, entry
       ) ;
       await ctx.reply(`✅ "ᴜꜱᴇʀ" ᴀᴄᴛɪᴠᴀᴛᴇᴅ\nʏᴏᴜʀ "ᴜꜱᴇʀ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`, getMainKeyboard()
       ) ; } }
// =================== START ===================
   bot.start(async (ctx) => { try { await sendMainPanel(ctx);
    } catch (error) { logger.error( "START ERROR",{ message: error?.message,
    } ) ; } } ) ;
// =================== SUPPORT ===================
   bot.command( "paysupport", async (ctx) => { 
     await ctx.reply(`ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ\nꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`
    ) ; } ) ; 
// =================== PAYMENT ACTIONS ===================
  bot.action( "pay_vip_stars", async (ctx) => { try {
      await ctx.answerCbQuery();
      await sendVipInvoice(ctx);
      } catch (error) { logger.error( "PAY VIP ERROR",
      { message: error?.message,
      } ) ; } } ) ;
bot.action("pay_user_stars", async (ctx) => { try {
      await ctx.answerCbQuery();
      await sendUserInvoice(ctx);
      } catch (error) {logger.error( "PAY USER ERROR",
      { message: error?.message,
      } ) ; } } ) ;
// =================== BACK ===================
bot.action("back_to_main",async (ctx) => { try {
      await ctx.answerCbQuery();
      await ctx.deleteMessage().catch(() => { } ) ;
      await sendMainPanel(ctx);
    } catch (error) { logger.error( "BACK MAIN ERROR",
      { message: error?.message,
} ) ; } } ) ;
// ================= PRE CHECKOUT ===================
bot.on( "pre_checkout_query", async (ctx) => {
    await ctx.answerPreCheckoutQuery( true
) ; } ) ;
// =================== MEDIA ===================
async function handleMedia(ctx) {
 const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get( userId
  ) ;
  if (!pending?.waitingForPhoto) { return;
  }
  pending.waitingForPhoto = false;
  pending.awaitingAdminApproval = true;
  pendingVideoRequests.set(userId, pending
  ); try {
  const user = getUserMeta(ctx.from);
    await bot.telegram.copyMessage( ADMIN_CHAT_ID,ctx.chat.id,ctx.message.message_id,
      { reply_markup: { inline_keyboard: [
       [ {
       text: "✓ ᴀᴘᴘʀᴏᴠᴇ",
       callback_data:
      `approve_video_${user.id}`,
       } , {
       text: "✘ ʀᴇᴊᴇᴄᴛ",callback_data: `reject_video_${user.id}`,
       } , ] , ] , } , } ) ;
       } catch (error) {logger.error( "SEND MEDIA ERROR",
       { message: error?.message,
       } ) ; } }
    bot.on( "photo",(ctx) => handleMedia(ctx)
       ) ;
    bot.on( "video",(ctx) => handleMedia(ctx)
       ) ;
// =================== TEXT ===================
    bot.on( "text", async (ctx) => { const text = (ctx.message.text || "") .trim();
    const userId = String(ctx.from?.id || "");
    const pending = pendingVideoRequests.get( userId
       ) ;
    try {
       if ( text === BTN_VIDEOCALL
      ) {
      return await openVideocallFlow( ctx
      ) ; }
      if ( text === BTN_GET_FULL_ACCESS
      ) {
      return await sendMembershipPanel( ctx
        ) ; }
      if ( text === BTN_VIP
      ) {
      return await sendVipPanel( ctx
      ) ; }
      if ( text === BTN_USER
      ) {
      return await sendUserPanel( ctx
      ) ; }
      if ( text === BTN_CHANNELS
      ) {
      return await sendChannelsPanel( ctx
      ) ; }
      if ( text === BTN_REFRESH
      ) {
         return await sendRefreshPanel( ctx
      ) ; }
      if ( text === BTN_CANCEL
           ) {
            pendingVideoRequests.delete( userId
            ) ;
      return await sendMainPanel( ctx
            ) ; }
      if ( text === BTN_BACK_MENU
            ) {
            pendingVideoRequests.delete( userId
            ) ;
      return await sendMainPanel( ctx
            ) ; }
      if ( text === BTN_ZOOM
           ) {
      return await ctx.reply(`📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ`,
          {  reply_markup: { inline_keyboard: [
          [ { text: "📹ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ", url: ZOOM_URL,
          } , ] , ] , } , } ) ; }
       if ( text === BTN_TELEGRAM
          ) {
          return await ctx.reply(  `💬 ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ`,
          {
          reply_markup: { inline_keyboard: [
          [  {
          text: "📹 ɪɴɪᴄɪᴀʀ ᴠɪᴅᴇᴏᴄᴀʟʟ",
          url:   TELEGRAM_CALL_URL,
         } , ] , ] , } , } ) ; }
      if (text.startsWith("/")) {
        return;
        }
      if (pending?.waitingForPhoto) {
          pending.invalidTextCount =
         (pending.invalidTextCount || 0) + 1;
          pendingVideoRequests.set( userId, pending
         ) ;
      if (
          pending.invalidTextCount >= 4
          ) {
          pendingVideoRequests.delete( userId
          ) ;
          await ctx.reply( "✘ ʀᴇQᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ."
          ) ;
         await sendMainPanel(ctx);
         return;
         }
         await ctx.reply(  "📸😏ʜᴏʟᴅ ᴜᴘ... ʟᴇᴍᴍᴇ ꜱᴇᴇ ᴀɴʏ ᴘɪᴄᴛᴜʀᴇ ᴏꜰ ʏᴏᴜ ꜰɪʀꜱᴛ."
         ) ;
         return;
         }
         await sendMainPanel(ctx);
         } catch (error) {  logger.error( "TEXT HANDLER ERROR",
         {  message: error?.message,
         } ) ; } } ) ;
// =================== PAYMENT EVENT ===================
     bot.on( "successful_payment", handleSuccessfulPayment
         ) ;
// =================== ADMIN APPROVE ===================
      bot.action(/^approve_video_(.+)$/, async (ctx) => {
       if ( String(ctx.from.id) !== String(ADMIN_CHAT_ID)
       ) {
       await ctx.answerCbQuery( "❌ Unauthorized"
       ) ;
       return;
       }
      await ctx.answerCbQuery( "✅ ᴀᴘᴘʀᴏᴠᴇᴅ"
      ) ;
      await ctx.editMessageReplyMarkup( { inline_keyboard: [],
      } ) ;
  const requesterId = String(ctx.match[1] ) ;
  const pending =  pendingVideoRequests.get( requesterId
      ) ;
       if (!pending) { await ctx.reply( "ʀᴇQᴜᴇꜱᴛ ɴᴏᴛ ꜰᴏᴜɴᴅ."
      ) ;
      return;
    }
    pendingVideoRequests.delete( requesterId
    ) ;
    await sendApprovedVideocallFlow( requesterId
    ) ; } ) ;
// =================== ADMIN REJECT ===================
    bot.action( /^reject_video_(.+)$/, async (ctx) => {
    if ( String(ctx.from.id) !== String(ADMIN_CHAT_ID)
    )  {
    await ctx.answerCbQuery( "❌ Unauthorized"
    ) ;
    return;
    }
    await ctx.answerCbQuery( "❌ ʀᴇᴊᴇᴄᴛᴇᴅ"
    ) ;
    await ctx.editMessageReplyMarkup( { inline_keyboard: [],
    } ) ;
  const requesterId = String(ctx.match[1]) ; pendingVideoRequests.delete( requesterId
    ) ;
  const keyboard =  Markup.inlineKeyboard( [ [ Markup.button.callback("ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ.", `notify_me_${requesterId}`
    ) , ] , ] ) ;
    await bot.telegram.sendMessage( requesterId, `⏳ ɪ'ᴍ ᴊᴜꜱᴛ ɢᴇᴛᴛɪɴɢ ʀᴇᴀᴅʏ ᴛᴏ ʜᴀᴠᴇ ꜱᴏᴍᴇ ꜰᴜɴ ᴡɪᴛʜ ᴀ ɢᴜʏ. ɪ ᴍɪɢʜᴛ ᴍᴇꜱꜱᴀɢᴇ ʏᴏᴜ ʟᴀᴛᴇʀ ɪꜰ ᴛʜᴀᴛ'ꜱ ᴄᴏᴏʟ`,
    {
    reply_markup: keyboard.reply_markup,
    } ) ; } ) ;
// =================== ADMIN NOTIFY ===================
    bot.action(/^notify_me_(.+)$/, async (ctx) => { const requesterId = String(ctx.match[1]); await ctx.answerCbQuery("ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ."
    ) ;
    await ctx.editMessageReplyMarkup({inline_keyboard: [],
    } ) ;
    try {  const user = getUserMeta(ctx.from);
    await adminBot.telegram.sendMessage( ADMIN_CHAT_ID, `🔔 <b>Notify request</b>\nName: <b>${escapeHtml(user.fullName)}</b>\nUsername: <b>${escapeHtml(user.username)}</b>\nID: <code>${escapeHtml(user.id)}</code>\nTarget: <code>${escapeHtml(requesterId)}</code>`,
    { parse_mode: "HTML",
    } ) ;
    await bot.telegram.sendMessage( requesterId, "ꜰᴏʀ ꜱᴜʀᴇ! ꜱᴡɪɴɢ ʙʏ ᴍʏ ᴄʜᴀɴɴᴇʟ ᴀɴᴅ ꜱᴇᴇ ᴡʜᴀᴛ'ꜱ ɴᴇᴡ..",
    {reply_markup: { inline_keyboard: [
    [ {
    text:"𝐔𝐬𝐞𝐫 Ŧҳ 🜲",
    url:"https://t.me/+v57jkAGn3DA0NWJh",
    } , ] , ] , } ,  }  ) ;
    } catch (error) { logger.error( "NOTIFY ERROR",
    { message: error?.message,
    } ) ; }}  ) ; 
// =================== ERROR HANDLERS ===================
    bot.catch((error) => { logger.error( "BOT ERROR",
    { message: error?.message,  stack: error?.stack,
    } ) ; } ) ; 
    adminBot.catch((error) => {  logger.error( "ADMIN BOT ERROR",
    { message: error?.message, stack: error?.stack,
    } ) ; } ) ;
// =================== ADMIN COMMAND ===================
    adminBot.command( "myid",  async (ctx) => {
    await ctx.reply(  `chat_id: ${ctx.chat.id}`
    ) ; } ) ;
// =================== WEBHOOK ===================
    export default async function handler( req, res
    ) {
    if (req.method === "GET") {
    return res
    .status(200)
    .send("Telegram webhook online");
     }
     if (req.method !== "POST") {
    return res
      .status(405) .json( { error: "Method not allowed",
    } ) ; } 
    try {
    const secret = req.headers[ "x-telegram-bot-api-secret-token"
    ] ; 
    if (!secret) { logger.warn(  "WEBHOOK REQUEST WITHOUT SECRET"
    ) ;
    return res .status(401) .json ( { error: "Missing webhook secret",
    } ) ; }
    const update = req.body;
    // =================== ADMIN BOT ===================
    if ( secret === ADMIN_WEBHOOK_SECRET
    ) {
    await adminBot.handleUpdate( update
    ) ;
    return res  .status(200) .send("OK");
    }
    // =================== USER BOT ===================
    if (  secret === WEBHOOK_SECRET
    ) {
      await bot.handleUpdate( update
    ) ;
      return res .status(200)  .send("OK");
    }
    // =================== INVALID ===================
    logger.warn("INVALID WEBHOOK SECRET"
    ) ;
    return res .status(401).json({error: "Invalid webhook secret",
    } ) ; 
     } catch (error) {
    logger.error( "WEBHOOK ERROR",
    { message: error?.message, stack: error?.stack,
    } ) ;
    return res .status(200) .send("OK");
    } }