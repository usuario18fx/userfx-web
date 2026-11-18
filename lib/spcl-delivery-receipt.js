// Notify the administrator only after Telegram accepts the SPCL notice.
// Telegram's Bot API does not provide read receipts for these messages.
const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const DELIVERY_MODES = Object.freeze({
  when_active: "WHEN ACTIVE",
  scheduled: "SCHEDULE",
  immediate: "SEND NOTICE",
  resend: "RESEND",
});

export async function sendSpclDeliveryReceipt({ telegram, chatId, code, username, recipientId, mode, messageId, sentAt }) {
  if (!telegram || !chatId) return false;
  if (!/^SPCL-[A-HJ-NP-Z2-9]{4}$/.test(String(code || ""))) return false;
  const label = DELIVERY_MODES[mode] || "NOTICE";
  const stamp = sentAt || new Date().toISOString();
  const text = [
    "✅ <b>USER FX · SPCL ENVIADO</b>",
    "",
    "Usuario: @" + escapeHtml(username),
    "Código: <code>" + escapeHtml(code) + "</code>",
    "Acción: " + escapeHtml(label),
    "Fecha: " + escapeHtml(stamp),
    "Telegram ID: <code>" + escapeHtml(recipientId) + "</code>",
    "Message ID: <code>" + escapeHtml(messageId) + "</code>",
    "",
    "Estado: Telegram aceptó el mensaje. No confirma lectura.",
  ].join("\n");
  await telegram.sendMessage(chatId, text, { parse_mode: "HTML" });
  return true;
}
