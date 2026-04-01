const TRACK_SECRET = process.env.TRACK_SECRET;
export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  console.log("TRACK VISIT IP:", ip);

  return res.status(200).json({
    ok: true,
  });
}
export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  console.log("VISIT IP:", ip);

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    const safePrefix = String(body.prefix || "").trim().toUpperCase();
    const safeSuffix = String(body.suffix || "").trim().toUpperCase();

    if (!safePrefix || !safeSuffix) {
      return res.status(400).json({
        ok: false,
        error: "Missing code.",
      });
    }

    if (safeSuffix.length !== 4) {
      return res.status(400).json({
        ok: false,
        error: "The suffix must be 4 characters.",
      });
    }

    const fullCode = `${safePrefix}${safeSuffix}`;

    if (!TRACK_SECRET) {
      return res.status(500).json({
        ok: false,
        error: "Missing TRACK_SECRET on server.",
      });
    }

    if (fullCode === TRACK_SECRET.toUpperCase()) {
      return res.status(200).json({
        ok: true,
        code: fullCode,
        ip,
      });
    }

    return res.status(401).json({
      ok: false,
      error: "Invalid code.",
      ip,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      details: String(error?.message || error),
    });
  }
}
