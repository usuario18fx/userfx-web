import Redis from "ioredis";
import { Telegraf } from "telegraf";
import { processDueManualNotices } from "../../../lib/manual-spcl-notices.js";
import { sendSpclDeliveryReceipt } from "../../../lib/spcl-delivery-receipt.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  const expected = String(process.env.CRON_SECRET || "");
  if (!expected) return res.status(503).json({ ok: false, error: "cron_not_configured" });
  if (req.headers.authorization !== "Bearer " + expected) return res.status(401).json({ ok: false, error: "unauthorized" });
  if (!process.env.REDIS_URL || !process.env.BOT_TOKEN) return res.status(503).json({ ok: false, error: "missing_bot_configuration" });

  const redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 6000 });
  try {
    await redis.connect();
    const bot = new Telegraf(process.env.BOT_TOKEN);
    const adminBot = process.env.ADMIN_BOT_TOKEN ? new Telegraf(process.env.ADMIN_BOT_TOKEN) : null;
    const summary = await processDueManualNotices(
      redis,
      process.env.CODE_ENGINE_NAMESPACE || "userfx:vault",
      bot.telegram,
      process.env.USERFX_SITE_URL || "https://user18fx.com",
      12,
      (receipt) => sendSpclDeliveryReceipt({
        telegram: adminBot?.telegram,
        chatId: process.env.ADMIN_CHAT_ID,
        ...receipt,
      }),
    );
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    console.error("SPCL NOTICE CRON ERROR", error instanceof Error ? error.message : "unknown");
    return res.status(500).json({ ok: false, error: "notice_job_failed" });
  } finally {
    redis.disconnect();
  }
}
