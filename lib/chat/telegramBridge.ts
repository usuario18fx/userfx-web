import {
  addMessage,
  linkTelegram,
  sessionByAdminMsg,
  sessionByTelegramChat,
  setAdminMsgId,
  type ChatSession,
} from "./chat";
/**
 * Puente web ↔ Telegram. Usa la Bot API por fetch (sin depender de grammy/telegraf).
 * Variables: TELEGRAM_BOT_TOKEN (o BOT_TOKEN), TELEGRAM_ADMIN_ID, TELEGRAM_BOT_USERNAME (opcional).
 */
const token = () => process.env.TELEGRAM_BOT_TOKEN ?? process.env.BOT_TOKEN ?? "";
const adminId = () => process.env.TELEGRAM_ADMIN_ID ?? process.env.ADMIN_USER_ID ?? "";
export const botUsername = () => process.env.TELEGRAM_BOT_USERNAME ?? "User18Fx_bot";
export const chatLinkUrl = (linkCode: string) => `https://t.me/${botUsername()}?start=chat_${encodeURIComponent(linkCode)}`;
async function tg<T = { message_id?: number }>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const t = token();
  if (!t) return null;
  const res = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? "error"}`);
  return data.result ?? null;
  }
/** Copia el mensaje del visitante al admin. El admin pulsa "Responder" sobre esa copia. */
export async function relayToAdmin(session: ChatSession, messageId: number, text: string) {
  const admin = adminId();
  if (!admin) return;
  const who = session.telegramUsername ? `@${session.telegramUsername}` : "visitante web";
  const sent = await tg("sendMessage", {
    chat_id: admin,
    text: `💬 Chat #${session.id} · ${who}\n\n${text}\n\n↩️ Responde a este mensaje para contestar.`,
  });
  if (sent?.message_id) await setAdminMsgId(messageId, String(sent.message_id));
  }
type Update = {
  message?: {
    chat?: { id?: number };
    from?: { id?: number; username?: string };
    text?: string;
    reply_to_message?: { message_id?: number };
  };
  };  
/**
 * Procesa un update de Telegram. Devuelve `true` si era del chat (ya está resuelto)
 * y `false` si no tiene nada que ver, para que tu webhook actual siga con su lógica.
 */
export async function handleChatUpdate(update: Update): Promise<boolean> {
  const m = update.message;
  const chatId = m?.chat?.id;
  const text = m?.text?.trim();
  if (!m || !chatId || !text) return false;
  const isAdmin = Boolean(adminId()) && String(m.from?.id) === String(adminId());
  // 1) /start chat_<código>  → vincula
  const start = text.match(/^\/start(?:@\w+)?\s+chat_([A-Za-z0-9]+)/);
  if (start) {
    const linked = await linkTelegram(start[1], String(chatId), m.from?.username);
    await tg("sendMessage", {
      chat_id: chatId,
      text: linked
        ? "🜲 USER FX · Chat vinculado.\nEscribe aquí y se verá en la web; las respuestas llegan a los dos lados."
        : "Este enlace de chat no es válido. Vuelve a la web y abre el chat de nuevo.",
  });
    return true;
  }
  // 2) el admin responde sobre la copia → llega a la web (y al Telegram del visitante)
  const replyTo = m.reply_to_message?.message_id;
  if (isAdmin && replyTo && !text.startsWith("/")) {
    const session = await sessionByAdminMsg(String(replyTo));
    if (session) {
      await addMessage(session.id, "bot", "telegram", text);
    if (session.telegramChatId) {
      await tg("sendMessage", { chat_id: session.telegramChatId, text: `USER FX · ${text}` }).catch(() => null);
    }
      return true;
    }}
  // 3) un visitante vinculado escribe desde Telegram → aparece en la web
  if (!isAdmin && !text.startsWith("/")) {
    const session = await sessionByTelegramChat(String(chatId));
    if (session) {
      const msg = await addMessage(session.id, "user", "telegram", text);
      await relayToAdmin(session, msg.id, text);
      return true;
    }}
  return false;
}