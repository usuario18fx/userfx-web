const crypto = require("crypto");

function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const data = {};
  for (const [k, v] of params.entries()) data[k] = v;

  if (typeof data.user === "string") {
    try { data.user = JSON.parse(data.user); } catch {}
  }
  return data;
}

function validateInitData(initData, botToken, maxAgeSec = 60 * 60 * 24) {
  if (!initData || !botToken) return { ok: false, error: "missing_initData_or_botToken" };

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date") || "0");

  if (!receivedHash) return { ok: false, error: "missing_hash" };
  if (!authDate) return { ok: false, error: "missing_auth_date" };

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > maxAgeSec) return { ok: false, error: "initData_too_old" };

  const pairs = [];
  for (const [k, v] of params.entries()) {
    if (k === "hash") continue;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHashHex = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(computedHashHex, "hex");
  const b = Buffer.from(receivedHash, "hex");
  if (a.length !== b.length) return { ok: false, error: "hash_length_mismatch" };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, error: "hash_invalid" };

  return { ok: true, data: parseInitData(initData) };
}

module.exports = async (req, res) => {
  // CORS seguro (aunque si todo está en Vercel no molesta)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return res.status(500).json({ ok: false, error: "BOT_TOKEN_not_set" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const initData = body?.initData || "";
    const event = body?.event || "unknown_event";
    const meta = body?.meta || {};
    const ts = Number(body?.ts || Date.now());
    const href = body?.href || "";

    const check = validateInitData(initData, botToken);
    if (!check.ok) return res.status(401).json({ ok: false, error: check.error });

    const user = check.data?.user || null;

    const geo = {
      country: req.headers["x-vercel-ip-country"] || null,
      region: req.headers["x-vercel-ip-country-region"] || null,
      city: req.headers["x-vercel-ip-city"] || null,
    };

    const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || null;
    const ua = req.headers["user-agent"] || null;

    console.log(JSON.stringify({ event, meta, ts, href, user, geo, ip, ua }));

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "server_error", detail: String(e?.message || e) });
  }
};
