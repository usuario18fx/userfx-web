const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const referer = req.headers["referer"] || req.headers["referrer"] || "direct";
  const userAgent = req.headers["user-agent"] || "unknown";

  console.log("TRACK VISIT IP:", ip);

  if (BOT_TOKEN && ADMIN_CHAT_ID) {
    try {
      const text =
        `👁 <b>New visit</b>\n\n` +
        `IP: <code>${ip}</code>\n` +
        `Referer: ${referer}\n` +
        `UA: ${userAgent.slice(0, 120)}`;

      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text,
            parse_mode: "HTML",
          }),
        }
      );
    } catch {
      // notification failure is non-fatal
    }
  }

  return res.status(200).json({ ok: true });
}
