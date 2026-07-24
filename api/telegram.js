import path from "path";
import { Telegraf, Markup, Input } from "telegraf";
export const config = {
  api: {
    bodyParser: true,
} , } ;
export const maxDuration = 60;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
if (!BOT_TOKEN) throw new Error("Missing BOT_TOKEN");
if (!ADMIN_BOT_TOKEN) throw new Error("Missing ADMIN_BOT_TOKEN");
if (!ADMIN_CHAT_ID) throw new Error("Missing ADMIN_CHAT_ID");
const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);
const WEBSITE_URL = "https://userfx-web.vercel.app";
const ZOOM_URL =
  "https://us05web.zoom.us/j/9010970018?pwd=VUANDTsbsJf01iOHFikQvEad4L0xtW.1";
const TELEGRAM_CALL_URL = "https://t.me/call/KigSDr0fLj8wlqJ9nmPlrUP9cPY";
const USER_GROUP_LINK = "https://t.me/+2P62YW1Pt441NDUx";
const SMOKELANDIA_GROUP_LINK = "https://t.me/+RFGSPa85SR43Mzgx";
const VIP_STARS_PRICE = 1500;
const USER_STARS_PRICE = 500;
const VIP_PAYLOAD = "vip_fx_access";
const USER_PAYLOAD = "user_fx_access";
const asset = (file) => path.join(process.cwd(), "assets", file);
const pendingVideoRequests =
  globalThis.__fxPendingVideoRequests || new Map();
if (!globalThis.__fxPendingVideoRequests) {
  globalThis.__fxPendingVideoRequests = pendingVideoRequests;
}
const paidUsers = globalThis.__fxPaidUsers || new Map();
if (!globalThis.__fxPaidUsers) {
  globalThis.__fxPaidUsers = paidUsers;
}
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
const BTN_PAY_STARS_VIP = "⭐ ᴘᴀʏ ᴠɪᴘ";
const BTN_PAY_STARS_USER = "⭐ ᴘᴀʏ ᴜꜱᴇʀ";
const BTN_SMOKELANDIA = "ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "𝐔𝐬𝐞𝐫🜲Ŧҳ";
const BTN_CHANNELS_BACK = "↽ ʙᴀᴄᴋ";
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
  return Markup.keyboard(
    [ [BTN_VIDEOCALL],
      [BTN_GET_FULL_ACCESS],
      [BTN_VIP, BTN_USER],
      [BTN_CHANNELS],
      [BTN_REFRESH],],
    { columns: 2 }
    ).resize();
    }
function getPendingPhotoKeyboard() {
  return Markup.keyboard([[BTN_CANCEL]], { columns: 1 }).resize();
}
function getApprovedVideocallKeyboard() {
  return Markup.keyboard (
   [ [ BTN_ZOOM, BTN_TELEGRAM], [BTN_BACK_MENU]],
   { columns: 2 }
   ).resize ( ) ;
   }
function getStarsVipKeyboard() {
  return Markup.keyboard([[BTN_PAY_STARS_VIP], [BTN_BACK_MENU]], {
    columns: 1,
} ).resize();
   }
function getStarsUserKeyboard() {
  return Markup.keyboard([[BTN_PAY_STARS_USER], [BTN_BACK_MENU]], {
    columns: 1,
} ).resize();
   }
function getChannelsKeyboard() {
  return Markup.keyboard(
   [[BTN_SMOKELANDIA, BTN_USERFX_SITE], [BTN_CHANNELS_BACK]],
   { columns: 2 }
   ).resize();
   }
function getAdminApprovalButtons(requesterId) {
  return {
    reply_markup: { inline_keyboard: [
        [
          { text: "✅ ᴀᴘᴘʀᴏᴠᴇ",
            callback_data: `approve_video_${requesterId}`,
          },
          { text: "❌ ʀᴇᴊᴇᴄᴛ",
            callback_data: `reject_video_${requesterId}`,
} , ] , ] , } , } ; }
function getSmokelandiaChannelButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "☁️ᴇɴᴛᴇʀ ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ", url: SMOKELANDIA_GROUP_LINK }],
        [{ text: "↽ ʙᴀᴄᴋ", callback_data: "back_to_channels" }],
] , } , } ; }
function getUserFxChannelButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🜲 ᴇɴᴛᴇʀ 𝐔𝐬𝐞𝐫 Ŧҳ", url: USER_GROUP_LINK }],
        [{ text: "↽ ʙᴀᴄᴋ", callback_data: "back_to_channels" }],
] , } , } ; }
function getAccessState(userId) {
  const entry = paidUsers.get(String(userId));
  return {
    hasVip: entry?.tier === "ᴠɪᴘ",
    hasUser: entry?.tier === "ᴜꜱᴇʀ" || entry?.tier === "vip",
} ; }
async function safeDeleteMessage(ctx) {
  try {
    await ctx.deleteMessage();
  } catch {}
}
async function sendMainPanel(ctx) {
  await ctx.reply(
    `Ŧҳ | ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ
ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ. ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`,
    getMainKeyboard()
) ; }
async function sendMembershipPanel(ctx) {
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
) ; }
async function sendVipPanel(ctx) {
  await ctx.replyWithVideo(Input.fromLocalFile(asset("FX-Y24V01.mp4")), {
    caption: `ᴠɪᴘ⚡ 
    ᴜɴʟᴏᴄᴋ "ᴠɪᴘ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
    reply_markup: getStarsVipKeyboard().reply_markup,
} ) ; }
async function sendUserPanel(ctx) {
  await ctx.replyWithPhoto(Input.fromLocalFile(asset("userFX.jpg")), {
    caption: `ᴜꜱᴇʀ👑 
    ᴜɴʟᴏᴄᴋ "ᴜꜱᴇʀ" ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ ✪`,
    reply_markup: getStarsUserKeyboard().reply_markup,
} ) ; }
async function sendChannelsPanel(ctx) {
  await ctx.reply(
    `📺ᴄʜᴀɴɴᴇʟꜱ
ᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`,
    getChannelsKeyboard()
) ; }
async function sendRefreshPanel(ctx) {
  const { hasVip, hasUser } = getAccessState(ctx.from?.id);
  const tier = hasVip ? "⚡ᴠɪᴘ" : hasUser ? "𝐔𝐬𝐞𝐫🜲Ŧҳ" : "ɴᴏ ᴘʟᴀɴ";
  await ctx.reply(
`↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ
ᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}`,
    getMainKeyboard()
) ; }
async function sendSmokelandiaChannelPanel(ctx) {
  await ctx.replyWithPhoto(Input.fromLocalFile(asset("USERFX-ID18V20.jpg")), {
    caption: 
`☁️ꜱᴍᴏᴋᴇʟᴀɴᴅɪᴀ
ᴘʀɪᴠᴀᴛᴇ ꜱᴍᴏᴋᴇ ʀᴏᴏᴍ ʀᴇᴀᴅʏ.
👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
    ...getSmokelandiaChannelButton(),
} ) ; }
async function sendUserFxChannelPanel(ctx) {
  await ctx.replyWithPhoto(Input.fromLocalFile(asset("videocall.jpg")), {
    caption: `𝐔𝐬𝐞𝐫 🜲Ŧҳ
ᴘʀɪᴠᴀᴛᴇ ʀᴏᴜᴛᴇ ʀᴇᴀᴅʏ.
👇 ᴄʟɪᴄᴋ ᴘᴀʀᴀ ᴇɴᴛʀᴀʀ`,
    ...getUserFxChannelButton(),
} ) ; }
async function openVideocallFlow(ctx) {
  const userId = String(ctx.from?.id || "");
  if (!userId) return;
  pendingVideoRequests.set(userId, {
    waitingForPhoto: true,
    awaitingAdminApproval: false,
    invalidTextCount: 0,
    createdAt: Date.now(),
} ) ;
  await safeDeleteMessage(ctx);
  await ctx.replyWithVideo(Input.fromLocalFile(asset("FX-Y24V01.mp4")), {
    caption: `ʜᴏʟᴅ ᴜᴘ, ʙᴇꜰᴏʀᴇ ᴡᴇ ᴋᴇᴇᴘ ɢᴏɪɴɢ, ᴄᴀɴ ɪ ꜱᴇᴇ ᴀ ᴘɪᴄ ᴏꜰ ʏᴏᴜ? ɪ ᴡᴀɴɴᴀ ᴋɴᴏᴡ ᴡʜᴏ ɪ'ᴍ ᴛᴀʟᴋɪɴɢ ᴛᴏ..
ᴛʜᴇɴ ʏᴏᴜ ᴡɪʟʟ ʀᴇᴄᴇɪᴠᴇ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʙᴜᴛᴛᴏɴꜱ.`,
    ...getPendingPhotoKeyboard(),
} ) ;
 const user = getUserMeta(ctx.from);
  try {
    adminBot.telegram.sendMessage(
    ADMIN_CHAT_ID,
      `📞 <b>New videocall request</b>
Name: <b>${escapeHtml(user.fullName)}</b>
Username: <b>${escapeHtml(user.username)}</b>
ID: <code>${escapeHtml(user.id)}</code>
Chat ID usuario: <code>${escapeHtml(userId)}</code>
Esperando su foto...`,
      { parse_mode: "HTML" }
) ; } catch (err) {
    console.error("ADMIN ERROR:", err);
} }
async function sendApprovedVideocallFlow(userId) {
  await bot.telegram.sendMessage(
    userId,
    `✅ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ
ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ ᴀᴘᴘʀᴏᴠᴇᴅ.`
 ) ;
  await bot.telegram.sendMessage(
    userId,
    `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.
ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ:`,
    getApprovedVideocallKeyboard()
) ; }
async function sendVipInvoice(ctx) {
  if (!ctx.chat?.id) return;
  await ctx.telegram.callApi("sendInvoice", {
    chat_id: ctx.chat.id,
    title: "⚡𝐕𝐈𝐏 ACCESS",
    description: "𝐕𝐈𝐏 ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ 𝐒𝐓𝐀𝐑𝐒.",
    payload: VIP_PAYLOAD,
    currency: "XTR",
    prices: [{ label: "𝐕𝐈𝐏 ACCESS", amount: VIP_STARS_PRICE }],
    start_parameter: VIP_PAYLOAD,
} ) ; }
async function sendUserInvoice(ctx) {
  if (!ctx.chat?.id) return;
  await ctx.telegram.callApi("sendInvoice", {
    chat_id: ctx.chat.id,
    title: "USER 🜲FX ACCESS",
    description: "ᴜꜱᴇʀ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
    payload: USER_PAYLOAD,
    currency: "XTR",
    prices: [{ label: "USER FX ACCESS", amount: USER_STARS_PRICE }],
    start_parameter: USER_PAYLOAD,
} ) ; }
async function handleSuccessfulPayment(ctx) {
  const payment = ctx.message?.successful_payment;
  if (!payment) return;
  const userId = String(ctx.from?.id || "");
  const chargeId = payment.telegram_payment_charge_id;
  if (payment.invoice_payload === VIP_PAYLOAD) {
    paidUsers.set(userId, {
      tier: "vip",
      telegramPaymentChargeId: chargeId,
      paidAt: Date.now(),
} ) ;
    await ctx.reply(
      `✅ ᴠɪᴘ ᴀᴄᴛɪᴠᴀᴛᴇᴅ
ʏᴏᴜʀ "ᴠɪᴘ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
) ;
    return;
}
  if (payment.invoice_payload === USER_PAYLOAD) {
    paidUsers.set(userId, {
      tier: "ᴜꜱᴇʀ",
      telegramPaymentChargeId: chargeId,
      paidAt: Date.now(),
} ) ;
    await ctx.reply(
      `✅ "ᴜꜱᴇʀ" ᴀᴄᴛɪᴠᴀᴛᴇᴅ
ʏᴏᴜʀ "ᴜꜱᴇʀ" ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ᴜɴʟᴏᴄᴋᴇᴅ.`,
      getMainKeyboard()
) ; } }
bot.start(async (ctx) => {
  try {
    adminBot.telegram.sendMessage(
      ADMIN_CHAT_ID,
      "✅ TEST DESDE ADMIN BOT"
).catch(err => {
 console.error("ADMIN TEST ERROR:", err);
} ) ;
  await sendMainPanel(ctx);
  } catch (error) {
    console.error("ERROR in bot.start:", error);
} } ) ;
bot.command("paysupport", async (ctx) => {
  await ctx.reply(
    `ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ
ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`
) ; } ) ;
bot.hears(BTN_VIDEOCALL, async (ctx) => {
  try {
    await openVideocallFlow(ctx);
} catch (error) {
    console.error("ERROR openVideocallFlow:", error);
    await ctx.reply(
      "ERROR:\n" + (error?.stack || error?.message || String(error))
) ;} } ) ;
bot.hears(BTN_GET_FULL_ACCESS, async (ctx) => {
  await sendMembershipPanel(ctx);
} ) ;
bot.hears(BTN_VIP, async (ctx) => {
  await sendVipPanel(ctx);
} ) ;
bot.hears(BTN_USER, async (ctx) => {
  await sendUserPanel(ctx);
} ) ;
bot.hears(BTN_CHANNELS, async (ctx) => {
  await sendChannelsPanel(ctx);
} ) ;
bot.hears(BTN_REFRESH, async (ctx) => {
  await sendRefreshPanel(ctx);
} ) ;
bot.hears(BTN_PAY_STARS_VIP, async (ctx) => {
  await sendVipInvoice(ctx);
} ) ;
bot.hears(BTN_PAY_STARS_USER, async (ctx) => {
  await sendUserInvoice(ctx);
} ) ;
bot.hears(BTN_SMOKELANDIA, async (ctx) => {
  await sendSmokelandiaChannelPanel(ctx);
} ) ;
bot.hears(BTN_USERFX_SITE, async (ctx) => {
  await sendUserFxChannelPanel(ctx);
} ) ;
bot.hears(BTN_CHANNELS_BACK, async (ctx) => {
  await sendMainPanel(ctx);
} ) ;
bot.hears(BTN_CANCEL, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
  await sendMainPanel(ctx);
} ) ;
bot.hears(BTN_BACK_MENU, async (ctx) => {
  const userId = String(ctx.from?.id || "");
  pendingVideoRequests.delete(userId);
  await sendMainPanel(ctx);
} ) ;
bot.hears(BTN_ZOOM, async (ctx) => {
  await ctx.reply(
    `📞 ᴏᴘᴇɴ ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ
Haz clic en el botón para unirte a la videollamada por Zoom:`,
{ reply_markup: { inline_keyboard:[ [ { text:"📹ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ",url:ZOOM_URL} ] ] ,
} , } ) ; } ) ;
bot.hears(BTN_TELEGRAM, async (ctx) => {
  await ctx.reply(
    `💬 ᴏᴘᴇɴ ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ
ᴄʟɪᴄᴋ ᴛʜᴇ ʙᴜᴛᴛᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ ᴏɴ ᴛᴇʟᴇɢʀᴀᴍ:`,
    { reply_markup: { inline_keyboard: [
    [{ text: "📹 ɪɴɪᴄɪᴀʀ ᴠɪᴅᴇᴏᴄᴀʟʟ", url: TELEGRAM_CALL_URL }],
] , } , } ) ; } ) ;
bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
} ) ;
bot.on("photo", async (ctx) => {
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);
  if (!pending?.waitingForPhoto) return;
  pending.waitingForPhoto = false;
  pending.awaitingAdminApproval = true;
  pendingVideoRequests.set(userId, pending);
  try {
    const photo = ctx.message.photo.at(-1);
    const user = getUserMeta(ctx.from);
  adminBot.telegram.sendPhoto(
  ADMIN_CHAT_ID, 
  photo.file_id,
{
  caption: `📞 New videocall request
Name: ${user.fullName}
Username: ${user.username}
ID: ${user.id}
Approve or reject:`,
        ...getAdminApprovalButtons(user.id),
} ) ; } catch (err) {
console.error("SEND PHOTO ERROR:", err);
} } ) ;
bot.on("text", async (ctx) => {
  const text = (ctx.message.text || "").trim();
  const userId = String(ctx.from?.id || "");
  const pending = pendingVideoRequests.get(userId);
  const knownInputs = [
    "/start",
    "/paysupport",
    BTN_VIDEOCALL,
    BTN_GET_FULL_ACCESS,
    BTN_VIP,
    BTN_USER,
    BTN_CHANNELS,
    BTN_REFRESH,
    BTN_ZOOM,
    BTN_TELEGRAM,
    BTN_CANCEL,
    BTN_BACK_MENU,
    BTN_PAY_STARS_VIP,
    BTN_PAY_STARS_USER,
    BTN_SMOKELANDIA,
    BTN_USERFX_SITE,
    BTN_CHANNELS_BACK,
] ;
  if (knownInputs.includes(text)) 
    return;
  if (pending?.waitingForPhoto) {
    pending.invalidTextCount = (pending.invalidTextCount || 0) + 1;
    pendingVideoRequests.set(userId, pending);
    if (pending.invalidTextCount >= 4) {
      pendingVideoRequests.delete(userId);
  await ctx.reply("❌ ʀᴇQᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ.");
  await sendMainPanel(ctx);
    return;
}
  await ctx.reply("📸😏ʜᴏʟᴅ ᴜᴘ... ʟᴇᴍᴍᴇ ꜱᴇᴇ ᴀɴʏ ᴘɪᴄᴛᴜʀᴇ ᴏꜰ ʏᴏᴜ ꜰɪʀꜱᴛ, ᴛʜᴇɴ ɪ'ʟʟ ꜱᴇɴᴅ ᴛʜᴇ ʟɪɴᴋꜱ ᴛᴏ ᴄᴀʟʟ ᴍᴇ."
) ;
    return;
}
  await sendMainPanel(ctx);
} ) ;
bot.catch((error) => {
  console.error("TELEGRAF ERROR:", error);
} ) ;
adminBot.command("myid", async (ctx) => {
  await ctx.reply(`chat_id: ${ctx.chat.id}`);
} ) ;
adminBot.action(/^approve_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("✅ ᴀᴘᴘʀᴏᴠᴇᴅ");
  const requesterId = String(ctx.match[1]);
  const pending = pendingVideoRequests.get(requesterId);
  if (!pending) {
    await ctx.reply("ʀᴇQᴜᴇꜱᴛ ɴᴏᴛ ꜰᴏᴜɴᴅ.");
    return;
  }
  pendingVideoRequests.delete(requesterId);
  await sendApprovedVideocallFlow(requesterId);
} ) ;
adminBot.action(/^reject_video_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery("❌ ʀᴇᴊᴇᴄᴛᴇᴅ");
  const requesterId = String(ctx.match[1]);
  pendingVideoRequests.delete(requesterId);
  await bot.telegram.sendMessage(
    requesterId,
    `⏳ ɪ'ᴍ ᴊᴜꜱᴛ ɢᴇᴛᴛɪɴɢ ʀᴇᴀᴅʏ ᴛᴏ ʜᴀᴠᴇ ꜱᴏᴍᴇ ꜰᴜɴ ᴡɪᴛʜ ᴀ ɢᴜʏ. ɪ ᴍɪɢʜᴛ ᴍᴇꜱꜱᴀɢᴇ ʏᴏᴜ ʟᴀᴛᴇʀ ɪꜰ ᴛʜᴀᴛ'ꜱ ᴄᴏᴏʟ`,
{
  reply_markup: { inline_keyboard: [
[ { text: "ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ.", callback_data: `notify_me_${requesterId}` }],
] , } , } ) ; } ) ;
adminBot.catch((error) => {
  console.error("ADMIN TELEGRAF ERROR:", error);
} ) ;
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
}
  // Telegram necesita respuesta inmediata para evitar 504
  res.status(200).send("OK");
  // Procesar actualización después de responder
  try {
  await bot.handleUpdate(req.body);
} catch (error) {
    console.error("BOT HANDLE UPDATE ERROR:", error);
} }