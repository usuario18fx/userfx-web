import crypto from "crypto";
import Redis from "ioredis";

export const FX_CHAT_TERMS_VERSION = "2026-11-08-v1";
export const FX_CHAT_COOKIE = "userfx_chat_session";
const NAMESPACE = (process.env.CODE_ENGINE_NAMESPACE || "userfx:vault") + ":webchat";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const HISTORY_SECONDS = 30 * 24 * 60 * 60;
const LINK_SECONDS = 10 * 60;
const MAX_HISTORY = 100;
const PRIVATE_CODE = /\b(?:BSIC|PRX0|VIPX|SPCL|TGMX|VIP|PRX|COD)-[A-HJ-NP-Z0-9]{2,12}\b/i;

export function fxChatRedis() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required");
  if (!globalThis.__userfxRedis) {
    globalThis.__userfxRedis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 10000,
    });
    globalThis.__userfxRedis.on("error", (err) => console.error("[webchat/redis]", err.message));
  }
  return globalThis.__userfxRedis;
}

const sha = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const chatKey = (id) => NAMESPACE + ":messages:" + id;
const consentKey = (id) => NAMESPACE + ":consent:" + id;
const sessionKey = (token) => NAMESPACE + ":session:" + sha(token);
const linkKey = (code) => NAMESPACE + ":link:" + sha(code);

export function parseFxChatCookie(req) {
  const header = String(req.headers?.cookie || "");
  const part = header.split(";").map((p) => p.trim()).find((p) => p.startsWith(FX_CHAT_COOKIE + "="));
  if (!part) return "";
  try { return decodeURIComponent(part.slice(FX_CHAT_COOKIE.length + 1)); }
  catch { return ""; }
}

export function serializeFxChatCookie(req, token, maxAge = SESSION_SECONDS) {
  const forwarded = String(req.headers?.["x-forwarded-proto"] || "");
  const secure = process.env.NODE_ENV === "production" || forwarded === "https";
  return [
    FX_CHAT_COOKIE + "=" + encodeURIComponent(token),
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : null,
    "Max-Age=" + maxAge
  ].filter(Boolean).join("; ");
}

export function validChatUserId(id) {
  return /^[1-9][0-9]{4,19}$/.test(String(id || ""));
}

export async function issueFxChatLink(userId, chatId) {
  if (!validChatUserId(userId) || String(chatId) !== String(userId)) {
    throw new Error("Private Telegram chat required");
  }
  const redis = fxChatRedis();
  const rateKey = NAMESPACE + ":link-rate:" + userId;
  const permitted = await redis.set(rateKey, "1", "EX", 15, "NX");
  if (permitted !== "OK") return null;
  const code = "FXCHAT-" + crypto.randomBytes(10).toString("hex").toUpperCase();
  await redis.set(linkKey(code), JSON.stringify({ userId: String(userId), chatId: String(chatId) }), "EX", LINK_SECONDS);
  return code;
}

export async function claimFxChatLink(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^FXCHAT-[A-F0-9]{20}$/.test(normalized)) return null;
  const redis = fxChatRedis();
  const raw = await redis.getdel(linkKey(normalized));
  if (!raw) return null;
  let claim;
  try { claim = JSON.parse(raw); } catch { return null; }
  if (!validChatUserId(claim.userId) || String(claim.chatId) !== String(claim.userId)) return null;
  const token = crypto.randomBytes(32).toString("base64url");
  const acceptedAt = new Date().toISOString();
  const session = { userId: String(claim.userId), acceptedAt, termsVersion: FX_CHAT_TERMS_VERSION };
  await redis.multi()
    .set(consentKey(session.userId), JSON.stringify({ acceptedAt, termsVersion: FX_CHAT_TERMS_VERSION }))
    .set(sessionKey(token), JSON.stringify(session), "EX", SESSION_SECONDS)
    .exec();
  return { token, userId: session.userId, acceptedAt };
}

export async function hasFxChatConsent(userId) {
  if (!validChatUserId(userId)) return false;
  const raw = await fxChatRedis().get(consentKey(userId));
  if (!raw) return false;
  try { return JSON.parse(raw).termsVersion === FX_CHAT_TERMS_VERSION; }
  catch { return false; }
}

export async function getFxChatSession(req) {
  const token = parseFxChatCookie(req);
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return null;
  const raw = await fxChatRedis().get(sessionKey(token));
  if (!raw) return null;
  let session;
  try { session = JSON.parse(raw); } catch { return null; }
  if (!validChatUserId(session.userId) || session.termsVersion !== FX_CHAT_TERMS_VERSION) return null;
  if (!await hasFxChatConsent(session.userId)) return null;
  return session;
}

export async function revokeFxChat(req) {
  const session = await getFxChatSession(req);
  const token = parseFxChatCookie(req);
  if (session) {
    await fxChatRedis().del(sessionKey(token), consentKey(session.userId), chatKey(session.userId));
  } else if (token) {
    await fxChatRedis().del(sessionKey(token));
  }
}

export async function revokeFxChatByTelegram(userId) {
  if (!validChatUserId(userId)) return;
  await fxChatRedis().del(consentKey(userId), chatKey(userId));
}

export async function appendFxChatMessage(userId, role, text, source, dedupeId = "") {
  if (!validChatUserId(userId) || !await hasFxChatConsent(userId)) return null;
  if (!["user", "bot", "support"].includes(role)) return null;
  const value = String(text || "").trim().slice(0, 1500);
  if (!value || PRIVATE_CODE.test(value)) return null;
  const redis = fxChatRedis();
  if (dedupeId) {
    const unique = await redis.set(NAMESPACE + ":dedupe:" + sha(dedupeId), "1", "EX", HISTORY_SECONDS, "NX");
    if (unique !== "OK") return null;
  }
  const item = { id: crypto.randomUUID(), role, text: value, source, at: new Date().toISOString() };
  await redis.multi().rpush(chatKey(userId), JSON.stringify(item))
    .ltrim(chatKey(userId), -MAX_HISTORY, -1)
    .expire(chatKey(userId), HISTORY_SECONDS).exec();
  return item;
}

export async function readFxChatHistory(userId) {
  if (!await hasFxChatConsent(userId)) return [];
  const records = await fxChatRedis().lrange(chatKey(userId), -MAX_HISTORY, -1);
  return records.flatMap((item) => { try { return [JSON.parse(item)]; } catch { return []; } });
}

export async function allowFxChatMessage(userId) {
  const redis = fxChatRedis();
  const rateKey = NAMESPACE + ":send-rate:" + userId;
  const count = await redis.incr(rateKey);
  if (count === 1) await redis.expire(rateKey, 60);
  return count <= 8;
}

export async function setFxChatAdminReplyTarget(adminChatId, messageId, userId) {
  if (!validChatUserId(userId)) return;
  await fxChatRedis().set(NAMESPACE + ":adminreply:" + adminChatId + ":" + messageId, userId, "EX", HISTORY_SECONDS);
}

export async function getFxChatAdminReplyTarget(adminChatId, messageId) {
  const id = await fxChatRedis().get(NAMESPACE + ":adminreply:" + adminChatId + ":" + messageId);
  return validChatUserId(id) && await hasFxChatConsent(id) ? id : null;
}

export function fxChatReply(text) {
  const q = String(text || "").trim().toLowerCase();
  if (/^(?:\/?(?:getcode|code|codigo|código)|.*(?:comprar|obtener|conseguir).*(?:código|codigo|code))/.test(q))
    return "Puedes obtener tu código desde GET CODE en @User18Fx_bot. El pago real se confirma únicamente mediante Telegram Stars; nunca necesitas compartir tu clave aquí.";
  if (/(?:precio|precios|plans?|planes|basic|pro|vip|stars)/.test(q))
    return "Accesos disponibles: BASIC 350 ⭐, PRO 750 ⭐ y VIP 1500 ⭐. Para iniciar el pago abre @User18Fx_bot y selecciona GET CODE.";
  if (/(?:ayuda|help|support|soporte|persona|humano|problema)/.test(q))
    return "Tu mensaje quedó registrado para soporte. Cuando responda el equipo, verás la respuesta aquí y en Telegram.";
  if (/^(?:hola|hello|hi|buenas|hey|\/start)[!. ]*$/.test(q))
    return "Bienvenido a USER FX. Puedo ayudarte con los planes, cómo obtener tu código y solicitudes de soporte. Escribe tu pregunta.";
  return "Recibí tu mensaje. Puedes consultar planes, códigos o solicitar soporte. Si el equipo responde, la conversación se actualizará aquí y en Telegram.";
}
