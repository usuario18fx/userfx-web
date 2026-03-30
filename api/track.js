const TRACK_SECRET = process.env.TRACK_SECRET;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const { prefix, suffix } =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const safePrefix = String(prefix || "").trim().toUpperCase();
    const safeSuffix = String(suffix || "").trim().toUpperCase();

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
      });
    }

    return res.status(401).json({
      ok: false,
      error: "Invalid code.",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      details: String(error?.message || error),
    });
  }
}
