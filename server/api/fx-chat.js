import {
  FX_CHAT_TERMS_VERSION,
  appendFxChatMessage,
  allowFxChatMessage,
  claimFxChatLink,
  fxChatRedis,
  fxChatReply,
  getFxChatSession,
  readFxChatHistory,
  revokeFxChat,
  serializeFxChatCookie,
  setFxChatAdminReplyTarget,
} from "../../lib/fx-chat.js";

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
    return parsed.host === host && ["https:", "http:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function telegramApi(token, method, body) {
  if (!token) throw new Error("Telegram bot is not configured");
  const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true) throw new Error("Telegram delivery failed");
  return result.result;
}

async function informAdmin(userId, message) {
  if (!process.env.ADMIN_BOT_TOKEN || !process.env.ADMIN_CHAT_ID) return;
  try {
    const adminChatId = String(process.env.ADMIN_CHAT_ID);
    const sent = await telegramApi(process.env.ADMIN_BOT_TOKEN, "sendMessage", {
      chat_id: adminChatId,
      text: "USER FX WEB CHAT\nUser ID: " + userId + "\n\n" + message +
        "\n\nResponde a este mensaje desde Telegram para contestar al usuario.",
    });
    if (sent?.message_id) await setFxChatAdminReplyTarget(adminChatId, sent.message_id, userId);
  } catch (error) {
    console.error("[fx-chat/admin] Admin notification failed:", error?.message || "unknown");
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Vary", "Cookie");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (req.method !== "GET" && !sameOrigin(req)) {
    return res.status(403).json({ error: "origin_rejected" });
  }
  try {
    if (req.method === "DELETE") {
      await revokeFxChat(req);
      res.setHeader("Set-Cookie", serializeFxChatCookie(req, "", 0));
      return res.status(200).json({ ok: true, linked: false });
    }

    if (req.method === "GET") {
      const session = await getFxChatSession(req);
      if (!session) return res.status(200).json({ ok: true, linked: false, termsVersion: FX_CHAT_TERMS_VERSION });
      return res.status(200).json({
        ok: true,
        linked: true,
        termsVersion: FX_CHAT_TERMS_VERSION,
        messages: await readFxChatHistory(session.userId),
      });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (body.action === "link") {
      if (body.accepted !== true || body.termsVersion !== FX_CHAT_TERMS_VERSION) {
        return res.status(400).json({ error: "consent_required" });
      }
      const rawIp = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
      const ipKey = "fxchat:link-attempt:" + (await import("crypto")).createHash("sha256").update(rawIp).digest("hex");
      const redis = fxChatRedis();
      const attempts = await redis.incr(ipKey);
      if (attempts === 1) await redis.expire(ipKey, 600);
      if (attempts > 12) return res.status(429).json({ error: "too_many_attempts" });
      const claimed = await claimFxChatLink(body.code);
      if (!claimed) return res.status(401).json({ error: "invalid_or_expired_link_code" });
      res.setHeader("Set-Cookie", serializeFxChatCookie(req, claimed.token));
      return res.status(200).json({ ok: true, linked: true });
    }

    if (body.action !== "send") return res.status(400).json({ error: "invalid_action" });
    const session = await getFxChatSession(req);
    if (!session) return res.status(401).json({ error: "link_required" });
    const message = String(body.message || "").trim();
    if (!message || message.length > 1000) return res.status(400).json({ error: "message_length" });
    if (/\b(?:BSIC|PRX0|VIPX|SPCL|TGMX|FXCHAT)-[A-HJ-NP-Z0-9]{4,24}\b/i.test(message)) {
      return res.status(400).json({ error: "do_not_share_codes" });
    }
    if (!await allowFxChatMessage(session.userId)) {
      return res.status(429).json({ error: "rate_limit" });
    }

    const answer = fxChatReply(message);
    await telegramApi(process.env.BOT_TOKEN, "sendMessage", {
      chat_id: session.userId,
      text: "WEBCHAT · Tu mensaje:\n" + message + "\n\nFX BOT:\n" + answer,
    });
    await appendFxChatMessage(session.userId, "user", message, "web");
    await appendFxChatMessage(session.userId, "bot", answer, "web");
    await informAdmin(session.userId, message);
    return res.status(200).json({ ok: true, messages: await readFxChatHistory(session.userId) });
  } catch (error) {
    console.error("[fx-chat]", error?.message || "request_failed");
    return res.status(500).json({ error: "chat_unavailable" });
  }
}
