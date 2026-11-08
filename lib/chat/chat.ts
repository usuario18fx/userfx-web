import { randomBytes } from "crypto";
import { pool, ready } from "./db";

export const CHAT_COOKIE = "fx_chat";
export const CHAT_COOKIE_DAYS = 30;
/** Súbela cuando cambies los términos: obliga a aceptar de nuevo. */
export const CHAT_TERMS_VERSION = "2026-11";
export const MAX_TEXT = 1000;
export type ChatSession = {
  id: number;
  token: string;
  linkCode: string;
  consentVersion: string;
  telegramChatId: string | null;
  telegramUsername: string | null;
};
export type ChatMessage = {
  id: number;
  sender: "user" | "bot" | "system";
  source: "web" | "telegram";
  text: string;
  createdAt: string;
};
type SessionRow = {
  id: number;
  token: string;
  link_code: string;
  consent_version: string;
  telegram_chat_id: string | null;
  telegram_username: string | null;
};
const mapSession = (r: SessionRow): ChatSession => ({
  id: r.id,
  token: r.token,
  linkCode: r.link_code,
  consentVersion: r.consent_version,
  telegramChatId: r.telegram_chat_id,
  telegramUsername: r.telegram_username,
});
const rand = (n: number) => randomBytes(n).toString("hex");
/* ───────── sesiones ───────── */
export async function createChatSession(): Promise<ChatSession> {
  await ready();
  const { rows } = await pool().query<SessionRow>(
    `INSERT INTO fx_chat_sessions (token, link_code, consent_version)
     VALUES ($1, $2, $3) RETURNING *`,
    [rand(24), rand(5).toUpperCase(), CHAT_TERMS_VERSION],
  );
  const s = mapSession(rows[0]);
  await addMessage(s.id, "system", "web", "Chat iniciado. Escribe tu mensaje; te responderemos por aquí.");
  return s;
}
export async function getChatSession(token?: string | null): Promise<ChatSession | null> {
  if (!token) return null;
  await ready();
  const { rows } = await pool().query<SessionRow>(`SELECT * FROM fx_chat_sessions WHERE token = $1`, [token]);
  if (!rows[0] || rows[0].consent_version !== CHAT_TERMS_VERSION) return null;
  return mapSession(rows[0]);
}
export async function linkTelegram(linkCode: string, chatId: string, username?: string): Promise<ChatSession | null> {
  await ready();
  const { rows } = await pool().query<SessionRow>(
    `UPDATE fx_chat_sessions
        SET telegram_chat_id = $2, telegram_username = $3, linked_at = now()
      WHERE link_code = $1 RETURNING *`,
    [linkCode.toUpperCase(), chatId, username ?? null],
  );
  if (!rows[0]) return null;
  const s = mapSession(rows[0]);
  await addMessage(s.id, "system", "telegram", "✓ Telegram vinculado. Lo que escribas aquí o en Telegram se sincroniza.");
  return s;
}
export async function sessionByTelegramChat(chatId: string): Promise<ChatSession | null> {
  await ready();
  const { rows } = await pool().query<SessionRow>(
    `SELECT * FROM fx_chat_sessions WHERE telegram_chat_id = $1 ORDER BY id DESC LIMIT 1`,
    [chatId],
  );
  return rows[0] ? mapSession(rows[0]) : null;
}
export async function sessionByAdminMsg(adminMsgId: string): Promise<ChatSession | null> {
  await ready();
  const { rows } = await pool().query<SessionRow>(
    `SELECT s.* FROM fx_chat_messages m
       JOIN fx_chat_sessions s ON s.id = m.session_id
      WHERE m.admin_msg_id = $1 LIMIT 1`,
    [adminMsgId],
  );
  return rows[0] ? mapSession(rows[0]) : null;
}
/* ───────── mensajes ───────── */
type MsgRow = { id: number; sender: ChatMessage["sender"]; source: ChatMessage["source"]; text: string; created_at: Date };
const mapMsg = (r: MsgRow): ChatMessage => ({
  id: r.id,
  sender: r.sender,
  source: r.source,
  text: r.text,
  createdAt: new Date(r.created_at).toISOString(),
});
export async function addMessage(
  sessionId: number,
  sender: ChatMessage["sender"],
  source: ChatMessage["source"],
  text: string,
): Promise<ChatMessage> {
  await ready();
  const { rows } = await pool().query<MsgRow>(
    `INSERT INTO fx_chat_messages (session_id, sender, source, text)
     VALUES ($1, $2, $3, $4) RETURNING id, sender, source, text, created_at`,
    [sessionId, sender, source, text.slice(0, MAX_TEXT)],
  );
  return mapMsg(rows[0]);
}
export async function listMessages(sessionId: number, afterId = 0): Promise<ChatMessage[]> {
  await ready();
  const { rows } = await pool().query<MsgRow>(
    `SELECT id, sender, source, text, created_at FROM fx_chat_messages
      WHERE session_id = $1 AND id > $2 ORDER BY id ASC LIMIT 200`,
    [sessionId, afterId],
  );
  return rows.map(mapMsg);
}
export async function setAdminMsgId(messageId: number, adminMsgId: string) {
  await pool().query(`UPDATE fx_chat_messages SET admin_msg_id = $2 WHERE id = $1`, [messageId, adminMsgId]);
}
/* ───────── anti-spam (memoria; por instancia) ───────── */
const hits = new Map<number, number[]>();
export function allow(sessionId: number, limit = 15, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(sessionId) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) return false;
  arr.push(now);
  hits.set(sessionId, arr);
  return true;
}