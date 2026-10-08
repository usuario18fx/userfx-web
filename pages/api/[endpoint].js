// One Next function for the existing JSON APIs; the Telegram webhook has its
// own raw-body route. Explicit imports keep tracing deterministic on Vercel.
const handlers = {
  account: () => import("../../api/account.js"),
  "room-live": () => import("../../api/account.js"),
  "access-session": () => import("../../api/access-session.js"),
  "admin-runtime": () => import("../../api/admin-runtime.js"),
  "create-stars-invoice": () => import("../../api/create-stars-invoice"),
  handoff: () => import("../../api/handoff.js"),
  identity: () => import("../../api/identity.js"),
  "miniapp-stats": () => import("../../api/miniapp-stats.js"),
  "miniapp-track": () => import("../../api/miniapp-track.js"),
  newsletter: () => import("../../api/newsletter.js"),
  "private-media": () => import("../../api/private-media.js"),
  "telegram-eligibility": () => import("../../api/telegram-eligibility.js"),
  verify: () => import("../../api/verify.js"),
};
export const config = { api: { bodyParser: false } };
export default async function api(req, res) {
  const endpoint = req.query.endpoint;
  if (typeof endpoint !== "string" || !Object.hasOwn(handlers, endpoint))
    return res.status(404).json({ error: "Not found" });
  if (["POST", "PATCH", "PUT"].includes(req.method)) {
    const chunks = [];
    let length = 0;
    const limit = endpoint === "newsletter" ? 2048 : 40000;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > limit) return res.status(413).json({ error: "Request too large" });
      chunks.push(chunk);
    }
    try {
      const body = Buffer.concat(chunks).toString("utf8");
      req.body = body ? JSON.parse(body) : {};
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }
  if (endpoint === "room-live") req.query.roomfx = "1";
  const { default: handler } = await handlers[endpoint]();
  return handler(req, res);
}
