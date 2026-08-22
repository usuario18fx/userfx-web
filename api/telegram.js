import { Telegraf, Markup } from "telegraf";
import Redis from "ioredis";
import winston from "winston";
import crypto from "crypto";
export const config = {
    api: {
        bodyParser: false,
    },
};
// ======================================================
// LOGGER
// ======================================================
const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});
// ======================================================
// ENVIRONMENT
// ======================================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_USER ||
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    "";
const ADMIN_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET_ADMIN ||
    "";
const REDIS_URL = process.env.REDIS_URL;
const ZOOM_URL = process.env.ZOOM_URL;
const TELEGRAM_CALL_URL = process.env.TELEGRAM_CALL_URL;
const SMOKELANDIA_GROUP_LINK = process.env.SMOKELANDIA_GROUP_LINK ||
    "https://t.me/SmokelandiaFx_bot";
const USER_GROUP_LINK = process.env.USER_GROUP_LINK ||
    "https://t.me/+v57jkAGn3DA0NWJh";
const USERFX_SITE_URL = process.env.USERFX_SITE_URL ||
    "https://userfx-web.vercel.app";
/*
 * Telegram Mini App / Vault.
 *
 * Example:
 * https://t.me/User18Fx_bot?startapp=vault
 */
const TELEGRAM_MINI_APP_URL = process.env.TELEGRAM_MINI_APP_URL ||
    `${USERFX_SITE_URL.replace(/\/$/, "")}/vault`;
const CODE_ENGINE_NAMESPACE = process.env.CODE_ENGINE_NAMESPACE ||
    "userfx:vault";
const MAX_BODY_BYTES = 1024 * 1024;
const PAYMENT_TTL_SECONDS = 60 * 60 * 24 * 365;
// ======================================================
// MEDIA
// ======================================================
const ASSETS_BASE_URL = `${USERFX_SITE_URL.replace(/\/$/, "")}/assets`;
const ASSET_WELCOME_VIDEO = `${ASSETS_BASE_URL}/FX-Y24V01.mp4`;
const ASSET_VIDEOCALL_IMAGE = `${ASSETS_BASE_URL}/videocall.jpg`;
const ASSET_CHANNELS_VIDEO = `${ASSETS_BASE_URL}/videoSMKLFX.mp4`;
const ASSET_SMOKELANDIA_VIDEO = `${ASSETS_BASE_URL}/introSMKL.mp4`;
const ASSET_USERFX_VIDEO = `${ASSETS_BASE_URL}/introFX.mp4`;
const ASSET_GETCODE_IMAGE = `${ASSETS_BASE_URL}/USERFX-ID18V20.jpg`;
// ======================================================
// VAULT WEBSITE RELAY
// ======================================================
const VAULT_WEBHOOK_URL = process.env.VAULT_WEBHOOK_URL ||
    `${USERFX_SITE_URL.replace(/\/$/, "")}/api/telegram/webhook`;
const VAULT_WEBHOOK_SECRET = process.env.VAULT_WEBHOOK_SECRET ||
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    "";
function isVaultPayload(payload) {
    const value = String(payload || "").trim();
    return /^(FX01|AX01|VIPX)-/i.test(value);
}
async function relayVaultUpdate(update) {
    if (!VAULT_WEBHOOK_URL || !VAULT_WEBHOOK_SECRET) {
        logger.error("VAULT WEBHOOK CONFIGURATION MISSING", {
            urlPresent: Boolean(VAULT_WEBHOOK_URL),
            secretPresent: Boolean(VAULT_WEBHOOK_SECRET),
        });
        return false;
    }
    try {
        const response = await fetch(VAULT_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-telegram-bot-api-secret-token": VAULT_WEBHOOK_SECRET,
            },
            body: JSON.stringify(update),
            cache: "no-store",
        });
        const text = await response.text();
        logger.info("VAULT UPDATE RELAY", {
            ok: response.ok,
            status: response.status,
            response: text.slice(0, 500),
        });
        return response.ok;
    }
    catch (error) {
        logger.error("VAULT UPDATE RELAY ERROR", {
            message: error?.message || null,
            stack: error?.stack || null,
        });
        return false;
    }
}
// ======================================================
// REQUIRED BOT TOKENS
// ======================================================
if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN is missing");
}
if (!ADMIN_BOT_TOKEN) {
    throw new Error("ADMIN_BOT_TOKEN is missing");
}
// ======================================================
// BOTS
// ======================================================
const bot = new Telegraf(BOT_TOKEN);
const adminBot = new Telegraf(ADMIN_BOT_TOKEN);
bot.telegram.webhookReply = false;
adminBot.telegram.webhookReply = false;
// ======================================================
// TOKEN VALIDATION
// ======================================================
async function validateBotTokens() {
    try {
        const userMe = await bot.telegram.getMe();
        logger.info("USER BOT TOKEN OK", {
            id: userMe.id,
            username: userMe.username,
            firstName: userMe.first_name,
        });
    }
    catch (error) {
        logger.error("USER BOT TOKEN INVALID", {
            errorCode: error?.response?.error_code || null,
            description: error?.response?.description || null,
            message: error?.message || null,
        });
    }
    try {
        const adminMe = await adminBot.telegram.getMe();
        logger.info("ADMIN BOT TOKEN OK", {
            id: adminMe.id,
            username: adminMe.username,
            firstName: adminMe.first_name,
        });
    }
    catch (error) {
        logger.error("ADMIN BOT TOKEN INVALID", {
            errorCode: error?.response?.error_code || null,
            description: error?.response?.description || null,
            message: error?.message || null,
        });
    }
}
void validateBotTokens();
// ======================================================
// ENV VALIDATION
// ======================================================
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
};
const missingEnv = Object.entries(requiredEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);
if (missingEnv.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
}
// ======================================================
// REDIS
// ======================================================
let redis = null;
logger.info("REDIS URL EXISTS", {
    exists: Boolean(REDIS_URL),
});
if (REDIS_URL) {
    try {
        redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 1,
            enableReadyCheck: false,
            connectTimeout: 3000,
            lazyConnect: true,
        });
        redis.on("connect", () => {
            logger.info("REDIS CONNECT");
        });
        redis.on("ready", () => {
            logger.info("REDIS READY");
        });
        redis.on("error", (error) => {
            logger.error("REDIS ERROR", {
                message: error?.message,
                stack: error?.stack,
            });
        });
        redis.on("close", () => {
            logger.warn("REDIS CLOSE");
        });
    }
    catch (error) {
        logger.error("REDIS INIT FAILED", {
            message: error?.message,
            stack: error?.stack,
        });
        redis = null;
    }
}
async function ensureRedis() {
    if (!redis)
        return null;
    try {
        const status = String(redis.status || "");
        if (status === "wait") {
            await redis.connect();
        }
    }
    catch (error) {
        logger.error("REDIS CONNECT ERROR", {
            message: error?.message,
        });
    }
    return redis;
}
// ======================================================
// REDIS HELPERS
// ======================================================
async function redisGetJson(key) {
    const client = await ensureRedis();
    if (!client)
        return null;
    try {
        const value = await client.get(key);
        if (!value)
            return null;
        return JSON.parse(value);
    }
    catch (error) {
        logger.error("REDIS GET ERROR", {
            key,
            message: error?.message,
        });
        return null;
    }
}
async function redisSetJson(key, value, ttl = null) {
    const client = await ensureRedis();
    if (!client)
        return false;
    try {
        const serialized = JSON.stringify(value);
        if (ttl) {
            await client.set(key, serialized, "EX", ttl);
        }
        else {
            await client.set(key, serialized);
        }
        return true;
    }
    catch (error) {
        logger.error("REDIS SET ERROR", {
            key,
            message: error?.message,
        });
        return false;
    }
}
async function redisDelete(key) {
    const client = await ensureRedis();
    if (!client)
        return;
    try {
        await client.del(key);
    }
    catch (error) {
        logger.error("REDIS DELETE ERROR", {
            key,
            message: error?.message,
        });
    }
}
async function scanKeys(pattern) {
    const client = await ensureRedis();
    if (!client)
        return [];
    const keys = [];
    let cursor = "0";
    try {
        do {
            const result = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
            cursor = String(result[0]);
            if (result[1]?.length) {
                keys.push(...result[1]);
            }
        } while (cursor !== "0");
        return keys;
    }
    catch (error) {
        logger.error("REDIS SCAN ERROR", {
            pattern,
            message: error?.message,
        });
        return [];
    }
}
// ======================================================
// USER DATA
// ======================================================
async function getPaidUser(userId) {
    return redisGetJson(`paid_user:${String(userId)}`);
}
async function setPaidUser(userId, data) {
    return redisSetJson(`paid_user:${String(userId)}`, data);
}
// ======================================================
// VIDEOCALL DATA
// ======================================================
const VIDEO_REQUEST_TTL = 60 * 60 * 6;
async function getVideoRequest(userId) {
    return redisGetJson(`video_request:${String(userId)}`);
}
async function setVideoRequest(userId, data) {
    return redisSetJson(`video_request:${String(userId)}`, data, VIDEO_REQUEST_TTL);
}
async function deleteVideoRequest(userId) {
    await redisDelete(`video_request:${String(userId)}`);
}
// ======================================================
// PAYMENT IDEMPOTENCY
// ======================================================
function getPaymentKey(chargeId) {
    return `processed_payment:${chargeId}`;
}
async function hasProcessedPayment(chargeId) {
    const client = await ensureRedis();
    if (!chargeId || !client)
        return false;
    try {
        return Boolean(await client.exists(getPaymentKey(chargeId)));
    }
    catch (error) {
        logger.error("PAYMENT CHECK ERROR", {
            chargeId,
            message: error?.message,
        });
        return false;
    }
}
async function claimPaymentProcessed(chargeId) {
    const client = await ensureRedis();
    if (!chargeId)
        return false;
    if (!client)
        return true;
    try {
        const created = await client.set(getPaymentKey(chargeId), "1", "EX", PAYMENT_TTL_SECONDS, "NX");
        return created === "OK";
    }
    catch (error) {
        logger.error("PAYMENT CLAIM ERROR", {
            chargeId,
            message: error?.message,
        });
        return false;
    }
}
async function markPaymentProcessed(chargeId) {
    const client = await ensureRedis();
    if (!chargeId || !client)
        return false;
    try {
        await client.set(getPaymentKey(chargeId), "1", "EX", PAYMENT_TTL_SECONDS);
        return true;
    }
    catch (error) {
        logger.error("PAYMENT MARK ERROR", {
            chargeId,
            message: error?.message,
        });
        return false;
    }
}
async function releasePaymentClaim(chargeId) {
    if (!chargeId)
        return;
    await redisDelete(getPaymentKey(chargeId));
}
// ======================================================
// PLAN CONSTANTS
// ======================================================
const BASIC_STARS_PRICE = 350;
const PRO_STARS_PRICE = 750;
const VIP_STARS_PRICE = 1500;
const STARS_130_PAYLOAD = "videocall_access_130";
const STARS_130_PRICE = 130;
const BASIC_PAYLOAD = "basic";
const PRO_PAYLOAD = "pro";
const VIP_PAYLOAD = "vip";
const TIER_BASIC = "ʙᴀsɪᴄ";
const TIER_PRO = "ᴘʀᴏ";
const TIER_VIP = "ᴠɪᴘ";
// ======================================================
// PLAN CONFIGURATION
// ======================================================
const PLAN_CONFIG = {
    basic: {
        id: "basic",
        name: "BASIC",
        prefix: "FX01",
        stars: BASIC_STARS_PRICE,
        days: 7,
        tier: TIER_BASIC,
    },
    pro: {
        id: "pro",
        name: "PRO",
        prefix: "AX01",
        stars: PRO_STARS_PRICE,
        days: 30,
        tier: TIER_PRO,
    },
    vip: {
        id: "vip",
        name: "VIP",
        prefix: "VIPX",
        stars: VIP_STARS_PRICE,
        days: 90,
        tier: TIER_VIP,
    },
};
// ======================================================
// REQUEST STATUS
// ======================================================
const REQUEST_STATUS = {
    WAITING_PHOTO: "waiting_photo",
    AWAITING_ADMIN: "awaiting_admin",
    AWAITING_PAYMENT: "awaiting_payment",
    PAID: "paid",
    APPROVED: "approved",
};
// ======================================================
// BUTTONS
// ======================================================
const BTN_VIDEOCALL = "ᴠɪᴅᴇᴏᴄᴀʟʟ";
const BTN_VIP = "👑 ᴠɪᴘ";
const BTN_BASIC = "🌹 ʙᴀꜱɪᴄ";
const BTN_PRO = "🔥 ᴘʀᴏ";
const BTN_CHANNELS = "ᴄʜᴀɴɴᴇʟꜱ";
const BTN_REFRESH = "↻ ʀᴇꜰʀᴇꜱʜ";
const BTN_ZOOM = "🟦 ᴢᴏᴏᴍ";
const BTN_TELEGRAM = "💬 ᴛᴇʟᴇɢʀᴀᴍ";
const BTN_CANCEL = "✖ ᴄᴀɴᴄᴇʟ";
const BTN_BACK_MENU = "↽ ʙᴀᴄᴋ";
const BTN_SMOKELANDIA = "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ";
const BTN_USERFX_SITE = "𝐔𝐬ᴇʀ 🜲∓ҳ";
const BTN_PENDING_REQUEST = "ʀᴇǫᴜᴇꜱᴛ";
const BTN_GET_CODE = "ɢᴇᴛ ᴄᴏᴅᴇ";
const BTN_OPEN_VAULT = "🔐 ᴏᴘᴇɴ ᴠᴀᴜʟᴛ";
// ======================================================
// UTILITIES
// ======================================================
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
    const fullName = `${firstName} ${lastName}`.trim() ||
        "No name";
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
function getErrorStack(error) {
    if (error instanceof Error) {
        return error.stack || null;
    }
    return null;
}
function getTelegramError(error) {
    return {
        errorCode: error?.response?.error_code ||
            null,
        description: error?.response?.description ||
            null,
        message: error?.message ||
            null,
        parameters: error?.response?.parameters ||
            null,
    };
}
function secureCompare(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !==
        bufB.length) {
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}
function isAdmin(ctx) {
    return (String(ctx.from?.id || "") ===
        String(ADMIN_USER_ID));
}
function getCommandArg(ctx, index = 0) {
    const parts = String(ctx.message?.text || "")
        .trim()
        .split(/\s+/)
        .slice(1);
    return parts[index] || "";
}
async function typing(ctx) {
    try {
        await ctx.sendChatAction("typing");
        await sleep(300);
    }
    catch {
        // ignore
    }
}
async function sendMediaSafe(ctx, kind, url, extra = {}) {
    try {
        if (kind === "video") {
            await ctx.replyWithVideo(url, extra);
            return;
        }
        await ctx.replyWithPhoto(url, extra);
    }
    catch (error) {
        logger.error("SEND MEDIA ERROR", {
            kind,
            url,
            ...getTelegramError(error),
        });
    }
}
// ======================================================
// BUTTON TRACKING
// ======================================================
async function trackButtonClick(ctx, buttonName) {
    try {
        const client = await ensureRedis();
        if (!client)
            return;
        const user = getUserMeta(ctx.from);
        if (!user.id)
            return;
        const data = {
            fullName: user.fullName,
            username: user.username,
            id: user.id,
            button: buttonName,
            clickedAt: new Date().toISOString(),
        };
        await client.set(`button_click:${user.id}:${Date.now()}`, JSON.stringify(data), "EX", 60 * 60 * 24 * 30);
    }
    catch (error) {
        logger.error("TRACK BUTTON ERROR", {
            message: error?.message,
        });
    }
}
// ======================================================
// RATE LIMIT
// ======================================================
async function checkRateLimit(userId, limit = 3, windowSeconds = 300) {
    const client = await ensureRedis();
    if (!client)
        return true;
    try {
        const key = `rate_limit:videocall:${userId}`;
        const count = await client.incr(key);
        if (count === 1) {
            await client.expire(key, windowSeconds);
        }
        return count <= limit;
    }
    catch (error) {
        logger.error("RATE LIMIT ERROR", {
            message: error?.message,
        });
        return true;
    }
}
// ======================================================
// CENTRAL CODE ENGINE
// ======================================================
function randomCodePart(length = 4) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        const index = crypto.randomInt(0, alphabet.length);
        result += alphabet[index];
    }
    return result;
}
function getPlanFromPayload(payload) {
    if (payload === BASIC_PAYLOAD) {
        return PLAN_CONFIG.basic;
    }
    if (payload === PRO_PAYLOAD) {
        return PLAN_CONFIG.pro;
    }
    if (payload === VIP_PAYLOAD) {
        return PLAN_CONFIG.vip;
    }
    return null;
}
function getCodeKey(code) {
    return `${CODE_ENGINE_NAMESPACE}:code:${code}`;
}
function getUserCodeIndexKey(userId) {
    return `${CODE_ENGINE_NAMESPACE}:user:${userId}:codes`;
}
async function generateAccessCode(planId, source, userId, chargeId = null) {
    const client = await ensureRedis();
    if (!client) {
        throw new Error("Redis is required for code generation");
    }
    const plan = PLAN_CONFIG[planId];
    if (!plan) {
        throw new Error(`Unknown plan: ${planId}`);
    }
    for (let attempt = 0; attempt < 20; attempt++) {
        const code = `${plan.prefix}-${randomCodePart(4)}`;
        const key = getCodeKey(code);
        const record = {
            code,
            planId: plan.id,
            plan: plan.name,
            prefix: plan.prefix,
            stars: plan.stars,
            days: plan.days,
            source,
            userId: String(userId),
            chargeId,
            status: "active",
            createdAt: new Date().toISOString(),
            redeemedAt: null,
            redeemedBy: null,
        };
        /*
         * NX makes the code creation atomic.
         * If another process somehow creates the same
         * code, Redis rejects this attempt and we retry.
         */
        const created = await client.set(key, JSON.stringify(record), "NX", "EX", PAYMENT_TTL_SECONDS);
        if (created === "OK") {
            await client.sadd(getUserCodeIndexKey(String(userId)), code);
            await client.expire(getUserCodeIndexKey(String(userId)), PAYMENT_TTL_SECONDS);
            logger.info("ACCESS CODE GENERATED", {
                code,
                planId: plan.id,
                source,
                userId,
            });
            return record;
        }
    }
    throw new Error("Unable to generate unique access code");
}
async function getAccessCode(code) {
    const normalized = String(code || "")
        .trim()
        .toUpperCase();
    if (!normalized) {
        return null;
    }
    return redisGetJson(getCodeKey(normalized));
}
async function validateAccessCode(code) {
    const record = await getAccessCode(code);
    if (!record) {
        return {
            valid: false,
            reason: "not_found",
        };
    }
    if (record.status !== "active") {
        return {
            valid: false,
            reason: "not_active",
            record,
        };
    }
    return {
        valid: true,
        record,
    };
}
// ======================================================
// VAULT BUTTON
// ======================================================
function getOpenVaultKeyboard() {
    const url = TELEGRAM_MINI_APP_URL;
    const isDirectHttps = /^https:\/\//i.test(url) &&
        !/^https:\/\/t\.me\//i.test(url);
    return Markup.inlineKeyboard([
        [
            isDirectHttps
                ? Markup.button.webApp(BTN_OPEN_VAULT, url)
                : Markup.button.url(BTN_OPEN_VAULT, url),
        ],
    ]);
}
// ======================================================
// KEYBOARDS
// ======================================================
function getMainKeyboard() {
    return Markup.keyboard([
        [
            BTN_VIDEOCALL,
            BTN_GET_CODE,
        ],
        [
            BTN_CHANNELS,
            BTN_REFRESH,
        ],
    ]).resize();
}
function getAccessKeyboard() {
    return Markup.keyboard([
        [
            BTN_BASIC,
            BTN_VIP,
        ],
        [
            BTN_PRO,
        ],
        [
            BTN_BACK_MENU,
        ],
    ]).resize();
}
function getPendingPhotoKeyboard() {
    return Markup.keyboard([
        [
            BTN_PENDING_REQUEST,
        ],
        [
            BTN_CANCEL,
        ],
    ]).resize();
}
function getApprovedVideocallKeyboard() {
    return Markup.keyboard([
        [
            BTN_ZOOM,
            BTN_TELEGRAM,
        ],
        [
            BTN_BACK_MENU,
        ],
    ]).resize();
}
function getVideocallInlineKeyboard() {
    return {
        inline_keyboard: [
            [
                {
                    text: BTN_ZOOM,
                    url: ZOOM_URL,
                },
                {
                    text: BTN_TELEGRAM,
                    url: TELEGRAM_CALL_URL,
                },
            ],
        ],
    };
}
function getStarsVipKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("❘ᴘᴀʏ ✪ 𝐕ɪᴘ❘", "pay_vip_stars"),
        ],
    ]);
}
function getStarsBasicKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("|ᴘᴀʏ ✪ 𝐁ᴀsɪᴄ|", "pay_basic_stars"),
        ],
    ]);
}
function getStarsProKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("| ᴘᴀʏ ✪ ᴘʀᴏ |", "pay_pro_stars"),
        ],
    ]);
}
function getChannelsKeyboard() {
    return Markup.keyboard([
        [
            BTN_SMOKELANDIA,
            BTN_USERFX_SITE,
        ],
        [
            BTN_BACK_MENU,
        ],
    ]).resize();
}
// ======================================================
// ACCESS STATE
// ======================================================
function tierRank(tier) {
    if (tier === TIER_VIP)
        return 3;
    if (tier === TIER_PRO)
        return 2;
    if (tier === TIER_BASIC)
        return 1;
    return 0;
}
async function getAccessState(userId) {
    const entry = await getPaidUser(userId);
    const tier = entry?.tier || null;
    return {
        hasVip: tierRank(tier) >= 3,
        hasPro: tierRank(tier) >= 2,
        hasBasic: tierRank(tier) >= 1,
        entry,
    };
}
// ======================================================
// PANELS
// ======================================================
async function sendMainPanel(ctx) {
    try {
        await typing(ctx);
        await sendMediaSafe(ctx, "video", ASSET_WELCOME_VIDEO);
        await ctx.reply(`𓂅 Ŧҳ🜲 |ᴇxᴄʟᴜꜱɪᴠᴇ ꜱᴘᴀᴄᴇ|
ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇꜱꜱ ᴘᴀɴᴇʟ.
ᴜꜱᴇ ᴛʜᴇ ʙᴜᴛᴛᴏɴꜱ ʙᴇʟᴏᴡ ᴛᴏ ɴᴀᴠɪɢᴀᴛᴇ ᴏᴜʀ ᴘʀɪᴠᴀᴛᴇ ꜱᴇᴄᴛɪᴏɴꜱ.`, getMainKeyboard());
    }
    catch (error) {
        logger.error("MAIN PANEL ERROR", {
            ...getTelegramError(error),
            userId: ctx.from?.id || null,
            chatId: ctx.chat?.id || null,
        });
        throw error;
    }
}
async function sendMembershipPanel(ctx) {
    await typing(ctx);
    await ctx.reply(`ᴀᴄᴄᴇꜱꜱ ᴄᴏᴅᴇ

⚡ ʙᴀꜱɪᴄ
🔥 ᴘʀᴏ
👑 ᴠɪᴘ`, getAccessKeyboard());
}
async function sendVipPanel(ctx) {
    try {
        await ctx.reply(`👑ᴛɪᴄᴋᴇᴛ ᴠɪᴘ
————————————
⇀ ᴄʜᴀɴɴᴇʟ ᴀᴄᴄᴇꜱꜱ
⇀ ʙᴇɴᴇғɪᴛs
⇀ ᴘʀᴇᴍɪᴜᴍ ꜱᴇᴄᴛɪᴏɴꜱ
⇀ ᴡᴇᴇᴋꜱ³ / ᴀʟʙᴜᴍꜱ³

✪ ${VIP_STARS_PRICE} Telegram Stars`, getStarsVipKeyboard());
    }
    catch (error) {
        logger.error("VIP PANEL ERROR", getTelegramError(error));
    }
}
async function sendBasicPanel(ctx) {
    try {
        await ctx.reply(`⚡ᴛɪᴄᴋᴇᴛ ʙᴀꜱɪᴄ
————————————
⇀ ᴘʀɪᴠᴀᴛᴇ ʀᴏᴏᴍ
⇀ ʙᴇɴᴇғɪᴛs
⇀ ᴡᴇᴇᴋ¹ / ᴀʟʙᴜᴍ¹

✪ ${BASIC_STARS_PRICE} Telegram Stars`, getStarsBasicKeyboard());
    }
    catch (error) {
        logger.error("BASIC PANEL ERROR", getTelegramError(error));
    }
}
async function sendProPanel(ctx) {
    try {
        await ctx.reply(`🔥ᴛɪᴄᴋᴇᴛ ᴘʀᴏ
————————————
⇀ ꜰᴜʟʟ ᴠᴀᴜʟᴛ ᴀᴄᴄᴇꜱꜱ
⇀ ᴠɪᴅᴇᴏ ᴄᴀʟʟꜱ
⇀ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀɴɴᴇʟꜱ
⇀ ᴡᴇᴇᴋ⁹ / ᴀʟʙᴜᴍ⁹

✪ ${PRO_STARS_PRICE} Telegram Stars`, getStarsProKeyboard());
    }
    catch (error) {
        logger.error("PRO PANEL ERROR", getTelegramError(error));
    }
}
// ======================================================
// CHANNELS
// ======================================================
async function sendChannelsPanel(ctx) {
    await sendMediaSafe(ctx, "video", ASSET_CHANNELS_VIDEO);
    await ctx.reply(`📺ᴄʜᴀɴɴᴇʟꜱ
ᴄʜᴏᴏꜱᴇ ᴡʜɪᴄʜ ʀᴏᴜᴛᴇ ʏᴏᴜ ᴡᴀɴᴛ ᴛᴏ ᴏᴘᴇɴ.`, getChannelsKeyboard());
}
// ======================================================
// REFRESH
// ======================================================
async function sendRefreshPanel(ctx) {
    const { hasVip, hasPro, hasBasic, } = await getAccessState(String(ctx.from?.id || ""));
    const tier = hasVip
        ? "👑 ᴠɪᴘ"
        : hasPro
            ? "🔥 ᴘʀᴏ"
            : hasBasic
                ? "🌹 ʙᴀꜱɪᴄ"
                : "ɴᴏ ᴘʟᴀɴ";
    await ctx.reply(`↻ ꜱᴛᴀᴛᴜꜱ ᴜᴘᴅᴀᴛᴇᴅ
ᴄᴜʀʀᴇɴᴛ ᴛɪᴇʀ: ${tier}`, getMainKeyboard());
}
// ======================================================
// SEND GENERATED CODE
// ======================================================
async function sendGeneratedCode(ctx, record) {
    const safeCode = escapeHtml(record.code);
    const safePlan = escapeHtml(record.plan);
    await ctx.reply(`✅ ᴀᴄᴄᴇꜱꜱ ᴜɴʟᴏᴄᴋᴇᴅ

ᴘʟᴀɴ: ${safePlan}
ᴄᴏᴅᴇ:

<code>${safeCode}</code>

ᴋᴇᴇᴘ ᴛʜɪꜱ ᴄᴏᴅᴇ ᴛᴏ ᴇɴᴛᴇʀ ᴛʜᴇ ᴠᴀᴜʟᴛ.`, {
        parse_mode: "HTML",
    });
    await ctx.reply(`🔐 ᴏᴘᴇɴ ᴛʜᴇ ᴠᴀᴜʟᴛ

ᴇɴᴛᴇʀ ʏᴏᴜʀ ᴄᴏᴅᴇ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ ᴛᴏ ᴜꜱᴇʀꜰx.`, getOpenVaultKeyboard());
}
// ======================================================
// VIDEOCALL FLOW
// ======================================================
async function openVideocallFlow(ctx) {
    const userId = String(ctx.from?.id || "");
    if (!userId)
        return;
    try {
        const allowed = await checkRateLimit(userId, 3, 300);
        if (!allowed) {
            await ctx.reply("⏳ Please wait before requesting again.");
            return;
        }
        const currentRequest = await getVideoRequest(userId);
        if (currentRequest?.status ===
            REQUEST_STATUS.WAITING_PHOTO ||
            currentRequest?.status ===
                REQUEST_STATUS.AWAITING_ADMIN ||
            currentRequest?.status ===
                REQUEST_STATUS.AWAITING_PAYMENT) {
            await ctx.reply(`⏳ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ʜᴀᴠᴇ ᴀɴ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ.

ʏᴏᴜʀ ᴄᴜʀʀᴇɴᴛ ʀᴇǫᴜᴇꜱᴛ ɪꜱ ꜱᴛɪʟʟ ᴘʀᴏᴄᴇꜱꜱɪɴɢ.`, getPendingPhotoKeyboard());
            return;
        }
        const user = getUserMeta(ctx.from);
        const request = {
            userId,
            fullName: user.fullName,
            username: user.username,
            status: REQUEST_STATUS.WAITING_PHOTO,
            invalidTextCount: 0,
            createdAt: Date.now(),
        };
        await setVideoRequest(userId, request);
        await ctx.reply(`ʜᴏʟᴅ ᴜᴘ...
ᴄᴀɴ ɪ ꜱᴇᴇ ᴡʜᴀᴛ ʏᴏᴜ ʟᴏᴏᴋ ʟɪᴋᴇ ғɪʀꜱᴛ👀

ꜱᴇɴᴅ ᴍᴇ ᴀ ᴘɪᴄ ᴀɴᴅ ɪ'ʟʟ ꜱᴇɴᴅ ᴏᴠᴇʀ ᴛʜᴇ ᴠɪᴅᴇᴏ ᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ.`, getPendingPhotoKeyboard());
        await adminBot.telegram.sendMessage(ADMIN_CHAT_ID, `📞 <b>ɴᴇᴡ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ</b>
Name: ${escapeHtml(user.fullName)}
Username: ${escapeHtml(user.username)}
ID: ${escapeHtml(user.id)}
Chat ID: ${escapeHtml(userId)}
⏳ᴡᴀɪᴛɪɴɢ ғᴏʀ ᴘʜᴏᴛᴏ...`, {
            parse_mode: "HTML",
        });
    }
    catch (error) {
        logger.error("OPEN VIDEOCALL FLOW ERROR", {
            userId,
            ...getTelegramError(error),
            stack: getErrorStack(error),
        });
    }
}
// ======================================================
// PENDING VIDEOCALL
// ======================================================
async function sendPendingVideocallPanel(ctx) {
    const userId = String(ctx.from?.id || "");
    if (!userId)
        return;
    try {
        const request = await getVideoRequest(userId);
        if (!request) {
            await ctx.reply(`⏳ ɴᴏ ᴘᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ.

ᴡʜᴇɴ ʏᴏᴜ ʀᴇǫᴜᴇꜱᴛ ᴀ ᴠɪᴅᴇᴏᴄᴀʟʟ, ɪᴛ ᴡɪʟʟ ᴀᴘᴘᴇᴀʀ ʜᴇʀᴇ.`, getMainKeyboard());
            return;
        }
        let message = "";
        let keyboard = getMainKeyboard();
        switch (request.status) {
            case REQUEST_STATUS.WAITING_PHOTO:
                message =
                    `📸ꜱᴛᴀᴛᴜꜱ: ᴡᴀɪᴛɪɴɢ ꜰᴏʀ ᴘʜᴏᴛᴏ📸

ɪ ɴᴇᴇᴅ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ.`;
                keyboard =
                    getPendingPhotoKeyboard();
                break;
            case REQUEST_STATUS.AWAITING_ADMIN:
                message =
                    `⏳ᴘᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ⏳

ꜱᴛᴀᴛᴜꜱ: ʏᴏᴜʀ ᴘʜᴏᴛᴏ ʜᴀꜱ ʙᴇᴇɴ ʀᴇᴄᴇɪᴠᴇᴅ.

ᴡᴀɪᴛɪɴɢ ғᴏʀ ᴀᴅᴍɪɴ ᴀᴘᴘʀᴏᴠᴀʟ.`;
                keyboard =
                    getPendingPhotoKeyboard();
                break;
            case REQUEST_STATUS.AWAITING_PAYMENT:
                message =
                    `ᴘᴇɴᴅɪɴɢ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ

ꜱᴛᴀᴛᴜꜱ: ✔️ ʏᴏᴜʀ ᴘʜᴏᴛᴏ ʜᴀꜱ ʙᴇᴇɴ ᴀᴘᴘʀᴏᴠᴇᴅ.

ᴘʟᴇᴀꜱᴇ ᴄᴏᴍᴘʟᴇᴛᴇ ᴛʜᴇ ✪𝟭𝟯𝟬 ᴘᴀʏᴍᴇɴᴛ.`;
                keyboard =
                    getPendingPhotoKeyboard();
                break;
            case REQUEST_STATUS.PAID:
                message =
                    `ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ

ꜱᴛᴀᴛᴜꜱ: ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇꜱꜱ ɪꜱ ᴜɴʟᴏᴄᴋᴇᴅ.`;
                keyboard =
                    getApprovedVideocallKeyboard();
                break;
            case REQUEST_STATUS.APPROVED:
                message =
                    `ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ

ꜱᴛᴀᴛᴜꜱ: 𝐀𝐏𝐏𝐑𝐎𝐕𝐄𝐃 ✔️

ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇꜱꜱ ɪꜱ ʀᴇᴀᴅʏ.`;
                keyboard =
                    getApprovedVideocallKeyboard();
                break;
            default:
                await ctx.reply("⏳ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ.", getMainKeyboard());
                return;
        }
        await ctx.reply(message, keyboard);
        logger.info("PENDING VIDEOCALL PANEL", {
            userId,
            status: request.status,
        });
    }
    catch (error) {
        logger.error("PENDING VIDEOCALL PANEL ERROR", {
            userId,
            ...getTelegramError(error),
            stack: getErrorStack(error),
        });
        await ctx.reply("❌ ᴜɴᴀʙʟᴇ ᴛᴏ ᴄʜᴇᴄᴋ ᴘᴇɴᴅɪɴɢ ʀᴇǫᴜᴇꜱᴛ.", getMainKeyboard());
    }
}
// ======================================================
// APPROVED VIDEOCALL
// ======================================================
async function sendApprovedVideocallFlow(userId) {
    const targetUserId = String(userId);
    try {
        await bot.telegram.sendMessage(targetUserId, `✔️︎ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ

ʏᴏᴜʀ ᴘʜᴏᴛᴏ ᴡᴀꜱ 𝐀𝐏𝐏𝐑𝐎𝐕𝐄𝐃.`);
        await bot.telegram.sendMessage(targetUserId, `📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.

ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ᴛᴏ ꜱᴛᴀʀᴛ ᴛʜᴇ 𝐕𝐈𝐃𝐄𝐎𝐂𝐀𝐋𝐋:`, {
            reply_markup: getVideocallInlineKeyboard(),
        });
        logger.info("VIDEOCALL OPTIONS SENT", {
            userId: targetUserId,
        });
    }
    catch (error) {
        logger.error("SEND APPROVED VIDEOCALL ERROR", {
            userId: targetUserId,
            ...getTelegramError(error),
        });
        throw error;
    }
}
// ======================================================
// INVOICES
// ======================================================
async function sendStarsInvoice(telegram, chatId, options) {
    if (!chatId)
        return;
    await telegram.callApi("sendInvoice", {
        chat_id: chatId,
        title: options.title,
        description: options.description,
        payload: options.payload,
        provider_token: "",
        currency: "XTR",
        prices: [
            {
                label: options.label,
                amount: options.amount,
            },
        ],
    });
}
async function sendVipInvoice(ctx) {
    const chatId = ctx.chat?.id ||
        ctx.callbackQuery?.message?.chat?.id;
    if (!chatId)
        return;
    await sendStarsInvoice(ctx.telegram, chatId, {
        title: "𝓥𝓘𝓟 ᴀᴄᴄᴇss",
        description: "𝓥𝓘𝓟 ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: VIP_PAYLOAD,
        label: "𝓥𝓘𝓟 ᴀᴄᴄᴇss",
        amount: VIP_STARS_PRICE,
    });
}
async function sendBasicInvoice(ctx) {
    const chatId = ctx.chat?.id ||
        ctx.callbackQuery?.message?.chat?.id;
    if (!chatId)
        return;
    await sendStarsInvoice(ctx.telegram, chatId, {
        title: "𝔹𝔸𝕊𝕀ℂ ᴀᴄᴄᴇss",
        description: "𝔹𝔸𝕊𝕀ℂ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: BASIC_PAYLOAD,
        label: "𝔹𝔸𝕊𝕀ℂ ᴀᴄᴄᴇss",
        amount: BASIC_STARS_PRICE,
    });
}
async function sendProInvoice(ctx) {
    const chatId = ctx.chat?.id ||
        ctx.callbackQuery?.message?.chat?.id;
    if (!chatId)
        return;
    await sendStarsInvoice(ctx.telegram, chatId, {
        title: "ℙℝ𝕆 ᴀᴄᴄᴇss",
        description: "ᴍᴇɴꜱᴜᴀʟ ᴀᴄᴄᴇꜱꜱ ᴡɪᴛʜ ᴛᴇʟᴇɢʀᴀᴍ ꜱᴛᴀʀꜱ.",
        payload: PRO_PAYLOAD,
        label: "ℙℝ𝕆 ᴀᴄᴄᴇss",
        amount: PRO_STARS_PRICE,
    });
}
async function sendStars130Invoice(userId) {
    await sendStarsInvoice(bot.telegram, String(userId), {
        title: "ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇss",
        description: "ᴀᴄᴄᴇꜱꜱ ᴛᴏ ᴛʜᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ꜱᴇʀᴠɪᴄᴇ.",
        payload: STARS_130_PAYLOAD,
        label: "ᴠɪᴅᴇᴏᴄᴀʟʟ ᴀᴄᴄᴇss",
        amount: STARS_130_PRICE,
    });
}
// ======================================================
// SUCCESSFUL PAYMENT
// ======================================================
async function handleSuccessfulPayment(ctx) {
    const payment = ctx.message?.successful_payment;
    if (!payment)
        return;
    const userId = String(ctx.from?.id || "");
    if (!userId)
        return;
    const chargeId = payment.telegram_payment_charge_id;
    const payload = payment.invoice_payload;
    logger.info("SUCCESSFUL PAYMENT", {
        userId,
        payload,
        chargeId,
    });
    /*
     * Vault-originated payloads are relayed to the
     * website system.
     */
    if (isVaultPayload(payload)) {
        const relayed = await relayVaultUpdate(ctx.update);
        if (relayed)
            return;
    }
    /*
     * Prevent duplicate Telegram payment processing.
     */
    const claimed = await claimPaymentProcessed(chargeId);
    if (!claimed) {
        logger.warn("DUPLICATE PAYMENT", {
            userId,
            payload,
            chargeId,
            alreadyProcessed: await hasProcessedPayment(chargeId),
        });
        return;
    }
    // ====================================================
    // VIDEOCALL
    // ====================================================
    if (payload ===
        STARS_130_PAYLOAD) {
        const request = await getVideoRequest(userId);
        if (!request ||
            request.status !==
                REQUEST_STATUS.AWAITING_PAYMENT) {
            await ctx.reply(`⚠️ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ, ʙᴜᴛ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴠɪᴅᴇᴏᴄᴀʟʟ ʀᴇǫᴜᴇꜱᴛ ᴡᴀꜱ ғᴏᴜɴᴅ.

ᴘʟᴇᴀꜱᴇ ᴄᴏɴᴛᴀᴄᴛ ꜱᴜᴘᴘᴏʀᴛ.`);
            return;
        }
        try {
            await setVideoRequest(userId, {
                ...request,
                status: REQUEST_STATUS.PAID,
                paidAt: Date.now(),
                telegramPaymentChargeId: chargeId,
            });
            await ctx.reply(`✅ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ

📞 ᴠɪᴅᴇᴏᴄᴀʟʟ ᴏᴘᴛɪᴏɴꜱ ᴜɴʟᴏᴄᴋᴇᴅ.`, {
                reply_markup: getVideocallInlineKeyboard(),
            });
        }
        catch (error) {
            await releasePaymentClaim(chargeId);
            logger.error("VIDEOCALL PAYMENT HANDLE ERROR", {
                userId,
                chargeId,
                ...getTelegramError(error),
            });
            throw error;
        }
        return;
    }
    // ====================================================
    // BASIC / PRO / VIP
    // ====================================================
    const plan = getPlanFromPayload(payload);
    if (plan) {
        try {
            /*
             * Generate one central Vault code.
             * Both Website and Telegram use the same
             * Redis-backed code namespace.
             */
            const record = await generateAccessCode(plan.id, "telegram", userId, chargeId);
            const existing = await getPaidUser(userId);
            /*
             * Never downgrade a user automatically.
             */
            const oldRank = tierRank(existing?.tier || null);
            const newRank = tierRank(plan.tier);
            const effectiveRecord = newRank >= oldRank
                ? {
                    ...existing,
                    telegramPaymentChargeId: chargeId,
                    paidAt: Date.now(),
                    tier: plan.tier,
                    planId: plan.id,
                    code: record.code,
                    codePrefix: plan.prefix,
                    source: "telegram",
                }
                : {
                    ...existing,
                    telegramPaymentChargeId: chargeId,
                    paidAt: Date.now(),
                    lastPurchasedPlan: plan.id,
                    lastPurchasedCode: record.code,
                    source: "telegram",
                };
            await setPaidUser(userId, effectiveRecord);
            await sendGeneratedCode(ctx, record);
            await ctx.reply(`✅ ${plan.name} ᴀᴄᴛɪᴠᴀᴛᴇᴅ

ʏᴏᴜʀ ${plan.name} ᴀᴄᴄᴇꜱꜱ ɪꜱ ɴᴏᴡ ʀᴇᴀᴅʏ.`, getMainKeyboard());
            return;
        }
        catch (error) {
            await releasePaymentClaim(chargeId);
            logger.error("ACCESS CODE GENERATION ERROR", {
                userId,
                payload,
                chargeId,
                ...getTelegramError(error),
                stack: getErrorStack(error),
            });
            await ctx.reply(`⚠️ ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ.

ᴡᴇ ᴄᴏᴜʟᴅ ɴᴏᴛ ɢᴇɴᴇʀᴀᴛᴇ ʏᴏᴜʀ ᴀᴄᴄᴇꜱꜱ ᴄᴏᴅᴇ ʏᴇᴛ.

ᴘʟᴇᴀꜱᴇ ᴄᴏɴᴛᴀᴄᴛ ꜱᴜᴘᴘᴏʀᴛ.`);
            return;
        }
    }
    logger.warn("UNKNOWN PAYMENT PAYLOAD", {
        userId,
        payload,
        chargeId,
    });
}
// ======================================================
// USER START
// ======================================================
     // ======================================================
// USER START
// ======================================================

async function handleUserStart(ctx) {
    try {
        const messageText =
            String(ctx.message?.text || "").trim();

        const textPayload =
            messageText
                .replace(/^\/start(?:@\w+)?\s*/i, "")
                .trim();

        const startPayload =
            String(
                ctx.startPayload ||
                textPayload ||
                ""
            ).trim().toLowerCase();

        logger.info("USER START RECEIVED", {
            userId: String(ctx.from?.id || ""),
            chatId: String(ctx.chat?.id || ""),
            startPayload: startPayload || null,
            messageText: messageText || null,
        });

        if (startPayload === "pay_basic") {
            logger.info("START BASIC PAYMENT");

            await sendBasicInvoice(ctx);
            return;
        }

        if (startPayload === "pay_pro") {
            logger.info("START PRO PAYMENT");

            await sendProInvoice(ctx);
            return;
        }

        if (startPayload === "pay_vip") {
            logger.info("START VIP PAYMENT");

            await sendVipInvoice(ctx);
            return;
        }

        if (isVaultPayload(startPayload)) {
            const relayed =
                await relayVaultUpdate(ctx.update);

            if (relayed) {
                return;
            }
        }

        await sendMainPanel(ctx);
    }
    catch (error) {
        logger.error("START ERROR", {
            ...getTelegramError(error),
            stack: getErrorStack(error),
        });

        await ctx.reply(
            "⚠️ Unable to open the payment. Please try again."
        ).catch(() => {});
    }
}


bot.start(handleUserStart);

// ======================================================
// PAYMENT SUPPORT
// ======================================================

bot.command("paysupport", async (ctx) => {
    await ctx.reply(`ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ

ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`);
});

// ======================================================
// PAYMENT SUPPORT
// ======================================================
bot.command("paysupport", async (ctx) => {
    await ctx.reply(`ᴘᴀʏᴍᴇɴᴛ ꜱᴜᴘᴘᴏʀᴛ

ꜰᴏʀ ᴘᴀʏᴍᴇɴᴛ ɪꜱꜱᴜᴇꜱ, ᴄᴏɴᴛᴀᴄᴛ @User18fx`);
});
// ======================================================
// PAYMENT ACTIONS
// ======================================================
bot.action("pay_vip_stars", async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await sendVipInvoice(ctx);
    }
    catch (error) {
        logger.error("PAY VIP ERROR", getTelegramError(error));
    }
});
bot.action("pay_pro_stars", async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await sendProInvoice(ctx);
    }
    catch (error) {
        logger.error("PAY PRO ERROR", getTelegramError(error));
    }
});
bot.action("pay_basic_stars", async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await sendBasicInvoice(ctx);
    }
    catch (error) {
        logger.error("PAY BASIC ERROR", getTelegramError(error));
    }
});
// ======================================================
// PRE CHECKOUT
// ======================================================
bot.on("pre_checkout_query", async (ctx) => {
    try {
        const payload = ctx.update
            ?.pre_checkout_query
            ?.invoice_payload || "";
        /*
         * Vault-originated invoices can be handled
         * by the website system.
         */
        if (isVaultPayload(payload)) {
            const relayed = await relayVaultUpdate(ctx.update);
            if (relayed)
                return;
        }
        await ctx.answerPreCheckoutQuery(true);
    }
    catch (error) {
        logger.error("PRE CHECKOUT ERROR", getTelegramError(error));
        try {
            await ctx.answerPreCheckoutQuery(false, "Unable to process payment right now.");
        }
        catch {
            // ignore
        }
    }
});
// ======================================================
// MEDIA / PHOTO
// ======================================================
function isAcceptableMedia(ctx) {
    if (ctx.message?.photo?.length) {
        return true;
    }
    if (ctx.message?.video) {
        return true;
    }
    const document = ctx.message?.document;
    if (!document) {
        return false;
    }
    const mime = String(document.mime_type || "");
    return (mime.startsWith("image/") ||
        mime.startsWith("video/"));
}
async function handleMedia(ctx) {
    const userId = String(ctx.from?.id || "");
    if (!userId)
        return;
    const pending = await getVideoRequest(userId);
    if (!pending ||
        pending.status !==
            REQUEST_STATUS.WAITING_PHOTO) {
        return;
    }
    if (!isAcceptableMedia(ctx)) {
        await ctx.reply("📸 ʜᴏʟᴅ ᴜᴘ... ꜱᴇɴᴅ ᴀ ᴘʜᴏᴛᴏ ғɪʀꜱᴛ.");
        return;
    }
    const user = getUserMeta(ctx.from);
    const updatedPending = {
        ...pending,
        status: REQUEST_STATUS.AWAITING_ADMIN,
        invalidTextCount: 0,
        photoReceivedAt: Date.now(),
    };
    await setVideoRequest(userId, updatedPending);
    try {
        const adminKeyboard = Markup.inlineKeyboard([
            [Markup.button.callback(
                "ᴘᴀʏ ✪𝟭𝟯𝟬 ꜱᴛᴀʀꜱ", `approve_stars_${user.id}`),
            ],
            [Markup.button.callback(
                "ꜱᴇɴᴅ ᴢᴏᴏᴍ + ᴛᴇʟᴇɢʀᴀᴍ", `approve_call_${user.id}`),
            ],
            [Markup.button.callback(
                "✘ ʀᴇᴊᴇᴄᴛ", `reject_video_${user.id}`),
            ],]);
        await adminBot.telegram.sendMessage(ADMIN_CHAT_ID, `
            📸 <b>NEW PHOTO RECEIVED</b>
        Username: ${escapeHtml(user.username)}
        ID: ${escapeHtml(user.id)}
        Chat ID: ${escapeHtml(userId)}
        📸 ᴜꜱᴇʀ ᴘʜᴏᴛᴏ ɪꜱ ᴀᴛᴛᴀᴄʜᴇᴅ ʙᴇʟᴏᴡ.`, {
            parse_mode: "HTML",
        });
        await bot.telegram.copyMessage(ADMIN_CHAT_ID, ctx.chat.id, ctx.message.message_id);
        await adminBot.telegram.sendMessage(ADMIN_CHAT_ID, "ᴄʜᴏᴏꜱᴇ ᴀɴ ᴀᴄᴛɪᴏɴ:", {
            reply_markup: adminKeyboard.reply_markup,
        });
        await ctx.reply(
            `📸 ᴘʜᴏᴛᴏ ʀᴇᴄᴇɪᴠᴇᴅ.
         ᴡᴀɪᴛ ᴡʜɪʟᴇ ᴡᴇ ʀᴇᴠɪᴇᴡ ɪᴛ.`);
       }
        catch (error) { logger.error("MEDIA HANDLER ERROR", { userId,
            ...getTelegramError(error),stack: getErrorStack(error),adminChatId: ADMIN_CHAT_ID || null,
       });
       }}
       bot.on("photo", handleMedia);
       bot.on("video", handleMedia);
       bot.on("document", handleMedia);
//// USER TEXT ROUTER // 
     //// USER TEXT ROUTER //

bot.on("text", async (ctx) => {
    const text =
        String(ctx.message?.text || "").trim();

    const userId =
        String(ctx.from?.id || "");

    logger.info("USER TEXT RECEIVED", {
        userId,
        text,
    });

    if (!userId) {
        return;
    }

    try {
        if (
            /^\/start(?:@\w+)?(?:\s|$)/i.test(text)
        ) {
            const startPayload =
                text
                    .replace(
                        /^\/start(?:@\w+)?\s*/i,
                        ""
                    )
                    .trim()
                    .toLowerCase();

            logger.info("USER START RECEIVED", {
                userId,
                startPayload:
                    startPayload || null,
            });

            if (startPayload === "pay_basic") {
                logger.info(
                    "START BASIC PAYMENT"
                );

                await sendBasicInvoice(ctx);
                return;
            }

            if (startPayload === "pay_pro") {
                logger.info(
                    "START PRO PAYMENT"
                );

                await sendProInvoice(ctx);
                return;
            }

            if (startPayload === "pay_vip") {
                logger.info(
                    "START VIP PAYMENT"
                );

                await sendVipInvoice(ctx);
                return;
            }

            await sendMainPanel(ctx);
            return;
        }

        if (text.startsWith("/")) {
            return;
        }
//// GET CODE //
    if (text === BTN_GET_CODE) {
        await trackButtonClick(ctx, "GET CODE");
        await sendMediaSafe(ctx, "photo", ASSET_GETCODE_IMAGE);
        return await ctx.reply("🔐 ᴄʜᴏᴏꜱᴇ ʏᴏᴜʀ ᴀᴄᴄᴇꜱꜱ:", getAccessKeyboard());
      }
//// VIDEOCALL // 
      if (text === BTN_VIDEOCALL) {
        await trackButtonClick(ctx, "VIDEOCALL");
        await sendMediaSafe(ctx, "photo", ASSET_VIDEOCALL_IMAGE);
        return await openVideocallFlow(ctx);
        }
//// PENDING REQUEST //
    if (text === BTN_PENDING_REQUEST) {
        await trackButtonClick(ctx, "PENDING VIDEOCALL REQUEST");
        return await sendPendingVideocallPanel(ctx);
        }
 //// VIP //
    if (text === BTN_VIP) {
        await trackButtonClick(ctx, "VIP");
        return await sendVipPanel(ctx);
        }
//// BASIC  //
    if (text === BTN_BASIC) {
        await trackButtonClick(ctx, "BASIC");
        return await sendBasicPanel(ctx);
        }
//// PRO //
    if (text === BTN_PRO) {
        await trackButtonClick(ctx, "PRO");
        return await sendProPanel(ctx);
        }
//// CHANNELS //
    if (text === BTN_CHANNELS) {
        await trackButtonClick(ctx, "CHANNELS");
        return await sendChannelsPanel(ctx);
     }
//// REFRESH //
    if (text === BTN_REFRESH) {
        await trackButtonClick(ctx, "REFRESH");
        return await sendRefreshPanel(ctx);
    }
//// CANCEL //
    if (text === BTN_CANCEL) {
        await deleteVideoRequest(userId);
        return await sendMainPanel(ctx);
    }
//// BACK //
    if (text === BTN_BACK_MENU) { return 
        await sendMainPanel(ctx);
    }
// // ZOOM // ================================================
    if (text === BTN_ZOOM) {
    return await ctx.reply("📞ᴢᴏᴏᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ", {
        reply_markup: {inline_keyboard: [
     [{ text: "📹 ᴜɴɪʀꜱᴇ ᴀ ᴢᴏᴏᴍ",
        url: ZOOM_URL,},],],},});
        }
//// TELEGRAM CALL // 
    if (text === BTN_TELEGRAM) {return await ctx.reply(
      "💬ᴛᴇʟᴇɢʀᴀᴍ ᴠɪᴅᴇᴏᴄᴀʟʟ", {reply_markup: { inline_keyboard: [
      [{text: "📹ɪɴɪᴄɪᴀʀ ᴠɪᴅᴇᴏᴄᴀʟʟ",
       url: TELEGRAM_CALL_URL,},],],},});
       }
//// SMOKELANDIA //
    if (text === BTN_SMOKELANDIA) {
    await sendMediaSafe(ctx, "video", ASSET_SMOKELANDIA_VIDEO);
    return await ctx.reply( "𝚜𝚞𝚋𝚖𝚒𝚝 𝚛𝚎𝚚𝚞𝚎𝚜𝚝", {reply_markup: {inline_keyboard:[[{ text: 
        "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
    url: SMOKELANDIA_GROUP_LINK,},],],},});
    }
//// USERFX SITE //
   if (text === BTN_USERFX_SITE) {
    await sendMediaSafe(ctx, "video", ASSET_USERFX_VIDEO);
    return await ctx.reply( "𝚜𝚞𝚋𝚖𝚒𝚝 𝚛𝚎𝚚𝚞𝚎𝚜𝚝", {reply_markup: { inline_keyboard: [
    [{ text: "𝐔𝐬ᴇʀ 🜲∓ҳ",
       url: USERFX_SITE_URL,},],],},});
     }
/// PHOTO WAITING // 
    const pending = await getVideoRequest(userId);
    if (pending?.status === REQUEST_STATUS.WAITING_PHOTO) {
    const invalidTextCount = Number(pending.invalidTextCount || 0) + 1;
    if (invalidTextCount >= 4) {
        await deleteVideoRequest(userId);
        await ctx.reply("✘ ʀᴇǫᴜᴇꜱᴛ ᴄʟᴏꜱᴇᴅ.");
        return await sendMainPanel(ctx);}
        await setVideoRequest(userId, {...pending, invalidTextCount,});
        await ctx.reply("📸 ʜᴏʟᴅ ᴜᴘ... ꜱᴇɴᴅ ᴀ ᴘʜᴏᴛᴏ ғɪʀꜱᴛ.");
        return;
    }
        return await sendMainPanel(ctx);
    }
    catch (error) {logger.error("TEXT HANDLER ERROR", {
        ...getTelegramError(error),
        stack: getErrorStack(error),
    });
    }});
//// SUCCESSFUL PAYMENT HANDLER // 
    bot.on("successful_payment", handleSuccessfulPayment);
//// ADMIN COMMANDS - USER BOT // 
    bot.command("clearvideo", async (ctx) => {
    if (!isAdmin(ctx))
    return;
    const targetId = getCommandArg(ctx) || String(ctx.from?.id || "");
    if (!targetId) return;
    await deleteVideoRequest(targetId);
    await ctx.reply(`✅ Videocall request cleared for ${targetId}.`);
    });
    
    bot.command("resetvc", async (ctx) => {
    if (!isAdmin(ctx)) {
        await ctx.reply("❌ Unauthorized.");
        return;
    }
    const targetId = getCommandArg(ctx) || String(ctx.from?.id || "");
    try { if (!targetId) return;
    const request = await getVideoRequest(targetId); if (!request) {
            await ctx.reply(`✅ No active videocall request found for ${targetId}.`);
            return;
        }
      await deleteVideoRequest(targetId);
      await ctx.reply(
                `✅ Videocall request reset for ${targetId}.
                 Previous status:
      ${request.status || "unknown"}
                 The user can now request a new videocall.`); logger.info("VIDEOCALL REQUEST RESET", {
      userId: targetId, previousStatus: request.status || null,
    });
    }
    catch (error) {logger.error("RESET VIDEOCALL ERROR", {
    userId: targetId,...getTelegramError(error),stack: getErrorStack(error),
    });
        await ctx.reply(
            "❌ Error resetting videocall request.");
    }});
//// REPORT // 
    bot.command("report", async (ctx) => {
    if (!isAdmin(ctx)) {
        await ctx.reply(
            "❌ Unauthorized.");
        return;
    }
    const client = await ensureRedis();
    if (!client) {
        await ctx.reply(
            "❌ Redis is not available.");
        return;
    }
    try {
        const keys = await scanKeys("button_click:*");
        if (!keys.length) {
            await ctx.reply("📊 No button clicks recorded yet.");
            return;
        }
    const values = await client.mget(...keys);
    const clicks = values .filter(Boolean)
                          .map((value) => {
    try {return JSON.parse(value); 
    }
    catch {            
    return null;
    }})
    .filter(Boolean)
    .sort((a, b) => new Date(b.clickedAt)
    .getTime() - new Date(a.clickedAt).getTime()); 
    let report = "📊 BUTTON CLICK REPORT\n\n";
    clicks.forEach((click, index) => {
    report += `<b>${index + 1}. ${escapeHtml(click.fullName)}</b>\n` +
              `Username: ${escapeHtml(click.username)}\n` +
              `ID: <code>${escapeHtml(click.id)}</code>\n` +
              `Button: <b>${escapeHtml(click.button)}</b>\n` + 
              `Date: ${escapeHtml(click.clickedAt)}\n\n`;
        });
        const chunks = [];
        while (report.length > 0) {
            chunks.push(report.slice(0, 3900));
            report = report.slice(3900);
        }
        for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: "HTML",
       });
       }}
    catch (error) { logger.error("REPORT ERROR", {
    ...getTelegramError(error),stack: getErrorStack(error),
    });
    await ctx.reply("❌ Error generating report.");
    }
    });
//// ADMIN BOT / MY ID  // 
    adminBot.command("myid", async (ctx) => {
    try {
    await ctx.reply(`chat_id: ${ctx.chat?.id} user_id: ${ctx.from?.id}`);
    }
    catch (error) { logger.error("ADMIN MYID ERROR", getTelegramError(error));
    }
    });
//// ADMIN: APPROVE STARS // 
    adminBot.action(/^approve_stars_(\d+)$/, async (ctx) => {
       const adminId = String(ctx.from?.id || "");
       if (adminId !== String(ADMIN_USER_ID)) {
       await ctx.answerCbQuery("❌ Unauthorized");
      return;
    }
    const requesterId = String(ctx.match[1]);
    const pending = await getVideoRequest(requesterId);
    if (!pending ||
        pending.status !== REQUEST_STATUS.AWAITING_ADMIN) {
        await ctx.answerCbQuery("Request not found");
        return;
    }
    try {
        await ctx.answerCbQuery("✪ Payment selected");
        await ctx
            .editMessageReplyMarkup({inline_keyboard: [],})
            .catch(() => { });
        await setVideoRequest(requesterId, {...pending,
        status: REQUEST_STATUS.AWAITING_PAYMENT,
        paymentRequestedAt: Date.now(),
        });
        await bot.telegram.sendMessage(requesterId, 
            `✔️ ᴘʜᴏᴛᴏ ᴀᴘᴘʀᴏᴠᴇᴅ
           ᴘʟᴇᴀꜱᴇ ᴄᴏᴍᴘʟᴇᴛᴇ ᴛʜᴇ ✪𝟭𝟯𝟬 ᴘᴀʏᴍᴇɴᴛ.`);
        await sendStars130Invoice(requesterId);
    }
        catch (error) { logger.error("APPROVE STARS ERROR", {requesterId,
        ...getTelegramError(error), stack: getErrorStack(error),
        });
        const current = await getVideoRequest(requesterId);
        if (current) {await setVideoRequest(requesterId, {...current,status: REQUEST_STATUS.AWAITING_ADMIN,
        });
        }
        try {
         await bot.telegram.sendMessage(requesterId, "❌ Unable to create the payment invoice. Please try again.");
        }
        catch {
        }
        }
        });
//// ADMIN: APPROVE CALL // 
    adminBot.action(/^approve_call_(\d+)$/, async (ctx) => {
      const adminId = String(ctx.from?.id || "");
      if (adminId !== String(ADMIN_USER_ID)) {
      await ctx.answerCbQuery(
        "❌ Unauthorized");
      return;}
    const requesterId = String(ctx.match[1]);
    const pending = await getVideoRequest(requesterId);
      if (!pending || pending.status !== REQUEST_STATUS.AWAITING_ADMIN) {
        await ctx.answerCbQuery("Request not found");
        return;
    }
    try {
        await ctx.answerCbQuery( 
            "📞 Videocall selected");
        await ctx .editMessageReplyMarkup({inline_keyboard: [],})
            .catch(() => { });
        await setVideoRequest(requesterId, {...pending,
            status: REQUEST_STATUS.APPROVED, approvedAt: Date.now(),});
        await sendApprovedVideocallFlow(requesterId);
       }
    catch (error) {logger.error("APPROVE CALL ERROR", {requesterId,...getTelegramError(error),stack: getErrorStack(error),
    });
    const current = await getVideoRequest(requesterId);
    if (current) {
    await setVideoRequest(requesterId, {...current,status: REQUEST_STATUS.AWAITING_ADMIN,
    });
    }
    }});
//// ADMIN: REJECT // ======================================================
    adminBot.action(/^reject_video_(\d+)$/, async (ctx) => {
    const adminId = String(ctx.from?.id || "");
    if (adminId !== String(ADMIN_USER_ID)) {
        await ctx.answerCbQuery("❌ Unauthorized");
        return;
    }
    const requesterId = String(ctx.match[1]);
    const pending = await getVideoRequest(requesterId);
    if (!pending) {
        await ctx.answerCbQuery("Request not found");
        return;
        }
    try {
        await ctx.answerCbQuery("❌ ʀᴇᴊᴇᴄᴛᴇᴅ");
        await ctx
            .editMessageReplyMarkup({
            inline_keyboard: [],
        })
            .catch(() => { });
        await deleteVideoRequest(requesterId);
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback("ʏᴇᴀ🔥, ʟᴇᴛ ᴍᴇ ᴋɴᴏᴡ.", `notify_me_${requesterId}`),
            ],]);
        await bot.telegram.sendMessage(
        requesterId, `⏳ ʏᴏᴜʀ ʀᴇǫᴜᴇꜱᴛ ᴡᴀꜱ ɴᴏᴛ ᴀᴘᴘʀᴏᴠᴇᴅ ᴀᴛ ᴛʜɪꜱ ᴛɪᴍᴇ.
          ᴡᴀɴᴛ ᴜꜱ ᴛᴏ ʟᴇᴛ ʏᴏᴜ ᴋɴᴏᴡ ᴡʜᴇɴ ꜱʟᴏᴛꜱ ᴏᴘᴇɴ ᴜᴘ ᴀɢᴀɪɴ?`, {
        reply_markup: keyboard.reply_markup,});
        }
    catch (error) { logger.error("REJECT ERROR", {requesterId, ...getTelegramError(error),
        });
        }});
/// NOTIFY ME // 
    bot.action(/^notify_me_(\d+)$/, async (ctx) => {
    const requesterId = String(ctx.match[1]);
    const clickedUserId = String(ctx.from?.id || "");
    if (clickedUserId !== requesterId) {
    await ctx.answerCbQuery(
      "❌ Unauthorized");
    return;
    }
    try {
        await ctx.answerCbQuery("👍");
        await ctx
            .editMessageReplyMarkup({
            inline_keyboard: [],})
            .catch(() => { });
        const user = getUserMeta(ctx.from);
        await adminBot.telegram.sendMessage(ADMIN_CHAT_ID, 
            `🔔 <b>NOTIFY REQUEST</b>
      Username: ${escapeHtml(user.username)}
      ID: ${escapeHtml(user.id)}
      Target: ${escapeHtml(requesterId)}`, { parse_mode: "HTML",});
        await bot.telegram.sendMessage(requesterId, 
            `📺 ɢᴏᴛ ɪᴛ!
          ꜱᴡɪɴɢ ʙʏ ᴏᴜʀ ᴄʜᴀɴɴᴇʟ ᴀɴᴅ ꜱᴇᴇ ᴡʜᴀᴛ'ꜱ ɴᴇᴡ.`, 
     { reply_markup: 
     { inline_keyboard: 
   [[{ text: "𝐔𝐬ᴇʀ 🜲∓ҳ",
       url: USER_GROUP_LINK,},],
    [{ text: "𝕊ᴍᴏᴋᴇʟᴀɴᴅɪᴀ",
       url: SMOKELANDIA_GROUP_LINK,
    },],],},});
    }
    catch (error) { logger.error("NOTIFY ERROR", { requesterId,...getTelegramError(error),
        });
        }});
// ======================================================
// ADMIN CODE LOOKUP
// ======================================================
adminBot.command("code", async (ctx) => {
    if (!isAdmin(ctx)) {
        await ctx.reply("❌ Unauthorized.");
        return;
    }
    const code = getCommandArg(ctx);
    if (!code) {
        await ctx.reply("Usage: /code FX01-XXXX");
        return;
    }
    const result = await validateAccessCode(code);
    if (!result.valid) {
        await ctx.reply(`❌ Code invalid.

Reason: ${result.reason}`);
        return;
    }
    const record = result.record;
    await ctx.reply(`✅ CODE FOUND

Code: ${record.code}
Plan: ${record.plan}
Plan ID: ${record.planId}
Source: ${record.source}
User ID: ${record.userId}
Status: ${record.status}
Created: ${record.createdAt}`);
});
// ======================================================
// ERROR HANDLERS
// ======================================================
bot.catch((error, ctx) => {
    logger.error("BOT ERROR", {
        updateId: ctx?.update?.update_id ??
            null,
        ...getTelegramError(error),
        stack: getErrorStack(error),
    });
});
adminBot.catch((error, ctx) => {
    logger.error("ADMIN BOT ERROR", {
        updateId: ctx?.update?.update_id ??
            null,
        chatId: ctx?.chat?.id ??
            null,
        userId: ctx?.from?.id ??
            null,
        ...getTelegramError(error),
        stack: getErrorStack(error),
    });
});
// ======================================================
// RAW BODY READER
// ======================================================
function readRawBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        let bytes = 0;
        if (typeof req.setEncoding === "function") {
            req.setEncoding("utf8");
        }
        req.on("data", (chunk) => {
            const piece = typeof chunk === "string"
                ? chunk
                : chunk.toString("utf8");
            bytes +=
                Buffer.byteLength(piece, "utf8");
            if (bytes >
                MAX_BODY_BYTES) {
                reject(new Error("payload_too_large"));
                if (typeof req.destroy === "function") {
                    req.destroy();
                }
                return;
            }
            body += piece;
        });
        req.on("end", () => resolve(body));
        req.on("error", (error) => reject(error));
    });
}
async function getRequestBody(req) {
    if (req.body !== undefined &&
        req.body !== null &&
        req.body !== "") {
        if (typeof req.body === "string") {
            return req.body;
        }
        if (Buffer.isBuffer(req.body)) {
            return req.body.toString("utf8");
        }
        if (typeof req.body === "object") {
            return req.body;
        }
    }
    return readRawBody(req);
}
function getQueryValue(req, key) {
    const value = req.query?.[key];
    if (Array.isArray(value)) {
        return String(value[0] || "");
    }
    return String(value || "");
}
// ======================================================
// TELEGRAM BODY PARSER
// ======================================================
function parseTelegramBody(rawBody) {
    if (rawBody === undefined ||
        rawBody === null) {
        throw new Error("Request body is empty");
    }
    if (typeof rawBody ===
        "object") {
        return rawBody;
    }
    const raw = String(rawBody)
        .replace(/^\uFEFF/, "")
        .trim();
    if (!raw) {
        throw new Error("Request body is empty");
    }
    return JSON.parse(raw);
}
// ======================================================
// WEBHOOK HANDLER
// ======================================================
export default async function handler(req, res) {
    logger.info("TELEGRAM WEBHOOK REQUEST", {
        method: req.method,
        contentType: req.headers["content-type"] || null,
        contentLength: req.headers["content-length"] || null,
        secretPresent: Boolean(req.headers["x-telegram-bot-api-secret-token"]),
    });
    // ====================================================
    // GET
    // ====================================================
    if (req.method === "GET") {
        return res
            .status(200)
            .json({
            ok: true,
            service: "telegram-webhook",
            status: "online",
        });
    }
    // ====================================================
    // METHOD
    // ====================================================
    if (req.method !== "POST") {
        return res
            .status(405)
            .json({
            ok: false,
            error: "method_not_allowed",
        });
    }
    // ====================================================
    // SECRET
    // ====================================================
    const incomingSecret = String(req.headers["x-telegram-bot-api-secret-token"] || "").trim();
    const userSecret = String(WEBHOOK_SECRET || "").trim();
    const adminSecret = String(ADMIN_WEBHOOK_SECRET ||
        "").trim();
    const requestedBot = getQueryValue(req, "bot")
        .trim()
        .toLowerCase();
    let isAdminWebhookRoute = incomingSecret.length > 0 &&
        adminSecret.length > 0 &&
        secureCompare(incomingSecret, adminSecret);
    let isUserWebhookRoute = incomingSecret.length > 0 &&
        userSecret.length > 0 &&
        secureCompare(incomingSecret, userSecret);
    if (isAdminWebhookRoute && isUserWebhookRoute) {
        if (requestedBot === "admin") {
            isUserWebhookRoute = false;
        }
        else {
            isAdminWebhookRoute = false;
        }
    }
    logger.info("TELEGRAM WEBHOOK SECRET CHECK", {
        incomingSecretPresent: Boolean(incomingSecret),
        isUser: isUserWebhookRoute,
        isAdmin: isAdminWebhookRoute,
        requestedBot: requestedBot || null,
    });
    if (!isAdminWebhookRoute &&
        !isUserWebhookRoute) {
        logger.warn("TELEGRAM WEBHOOK UNAUTHORIZED");
        return res
            .status(401)
            .json({
            ok: false,
            error: "unauthorized",
        });
    }
    // ====================================================
    // BODY
    // ====================================================
    let rawBody;
    try {
        rawBody =
            await getRequestBody(req);
        logger.info("TELEGRAM RAW BODY", {
            length: typeof rawBody ===
                "string"
                ? rawBody.length
                : null,
        });
    }
    catch (error) {
        logger.error("BODY READ ERROR", {
            message: error?.message ||
                null,
            stack: getErrorStack(error),
        });
        const status = error?.message ===
            "payload_too_large"
            ? 413
            : 400;
        return res
            .status(status)
            .json({
            ok: false,
            error: status === 413
                ? "payload_too_large"
                : "body_read_error",
            message: error?.message ||
                "Unable to read request body",
        });
    }
    // ====================================================
    // JSON
    // ====================================================
    let update;
    try {
        update =
            parseTelegramBody(rawBody);
    }
    catch (error) {
        logger.error("BODY JSON PARSE ERROR", {
            message: error?.message ||
                null,
        });
        return res
            .status(400)
            .json({
            ok: false,
            error: "invalid_json",
            message: error?.message ||
                "Invalid JSON",
        });
    }
    // ====================================================
    // UPDATE VALIDATION
    // ====================================================
    if (!update ||
        typeof update !==
            "object" ||
        Array.isArray(update)) {
        return res
            .status(400)
            .json({
            ok: false,
            error: "invalid_update",
        });
    }
    logger.info("TELEGRAM UPDATE RECEIVED", {
        bot: isAdminWebhookRoute
            ? "admin"
            : "user",
        updateId: update.update_id ??
            null,
        hasMessage: Boolean(update.message),
        hasCallback: Boolean(update.callback_query),
        hasPhoto: Boolean(update.message?.photo),
        hasPayment: Boolean(update.message
            ?.successful_payment),
    });
    // ====================================================
    // DISPATCH
    // ====================================================
    try {
        if (isAdminWebhookRoute) {
            await adminBot.handleUpdate(update);
            return res
                .status(200)
                .json({
                ok: true,
                bot: "admin",
            });
        }
        if (isUserWebhookRoute) {
            await bot.handleUpdate(update);
            return res
                .status(200)
                .json({
                ok: true,
                bot: "user",
            });
        }
        return res
            .status(401)
            .json({
            ok: false,
            error: "invalid_webhook_route",
        });
    }
    catch (error) {
        logger.error("BOT HANDLE UPDATE ERROR", {
            name: error?.name ??
                null,
            message: error?.message ??
                null,
            stack: getErrorStack(error),
            description: error?.response
                ?.description ??
                null,
        });
        return res
            .status(500)
            .json({
            ok: false,
            error: "telegram_handler_error",
            message: error?.message ??
                "unknown_error",
            description: error?.response
                ?.description ??
                null,
        });
       }}
