import crypto from "node:crypto";
import Redis from "ioredis";
let client;
export default async function newsletter(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host)
        return res.status(403).json({ error: "Origin not allowed" });
    } catch {
      return res.status(403).json({ error: "Origin not allowed" });
    }
  }
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return res.status(400).json({ error: "Invalid email" });
  if (!process.env.REDIS_URL)
    return res.status(503).json({ error: "Subscriptions are temporarily unavailable" });
  try {
    if (!client) {
      client = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
      });
      client.on("error", () => {});
    }
    const namespace = process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
    const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
    const ip = String(
      req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
    ).split(",")[0];
    const key = `${namespace}:newsletter:rate:${digest(ip)}`;
    const count = Number(
      await client.eval(
        "local c=redis.call('INCR',KEYS[1]); if c==1 then redis.call('EXPIRE',KEYS[1],3600) end; return c",
        1,
        key,
      ),
    );
    if (count > 5) {
      res.setHeader("Retry-After", "3600");
      return res.status(429).json({ error: "Please try again later" });
    }
    await client.set(
      `${namespace}:newsletter:subscriber:${digest(email)}`,
      JSON.stringify({ email, subscribedAt: new Date().toISOString() }),
      "NX",
    );
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ error: "Subscriptions are temporarily unavailable" });
  }
}
