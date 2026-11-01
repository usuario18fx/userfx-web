import crypto from "node:crypto";

export const ACCESS_NOTICE_TEXT = "You've been granted access to USER FX. Your website access is ready. Open the website, verify your Telegram username, and request your Special identity key from this bot.";
export async function sendAccessNotice({ redis, telegram, namespace, username, access, resolveRecipient, siteUrl }) {
  if (access?.enabled !== true || access?.telegramfx_access !== true) return "inactive";
  const recipient = await resolveRecipient(username);
  if (!recipient) return "unreachable";
  const key = namespace + ":access-notice:v1:" + recipient;
  const claim = crypto.randomUUID();
  if (await redis.set(key, "sending:" + claim, "NX") !== "OK") return "already";
  try {
    const result = await telegram.sendMessage(recipient, ACCESS_NOTICE_TEXT, {
      reply_markup: { inline_keyboard: [
        [{ text: "OPEN WEBSITE", url: siteUrl.replace(/\/$/, "") + "/#/private-room-access" }],
        [{ text: "GET SPECIAL KEY", url: "https://t.me/User18Fx_bot?start=identity" }]
      ] }
    });
    await redis.set(key, JSON.stringify({ status: "sent", username, messageId: result.message_id, sentAt: new Date().toISOString() }));
    return "sent";
  } catch (error) {
    // Explicit Telegram rejection did not deliver a message. A transport timeout is
    // ambiguous: retain the claim to prevent a duplicate delivery on retry.
    if (error?.response?.error_code) {
      await redis.del(key);
      return error.response.error_code === 403 ? "blocked" : "failed";
    }
    return "uncertain";
  }
}
