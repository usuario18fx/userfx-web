import {
  getTelegramFxAccess,
  hasTelegramFxAccess,
  normalizeTelegramUsername,
} from "../lib/telegram/access.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      eligible: false,
      error: "Method not allowed.",
    });
  }

  try {
    const username = normalizeTelegramUsername(req.query?.username);

    if (!username) {
      return res.status(400).json({
        ok: false,
        eligible: false,
        error: "ENTER A VALID TELEGRAM USERNAME",
      });
    }

    const record = await getTelegramFxAccess(username.normalized);
    const eligible = hasTelegramFxAccess(record);

    let reason = null;

    if (!record) {
      reason = "not_registered";
    } else if (record.enabled !== true) {
      reason = "disabled";
    } else if (record.telegramfx_access !== true) {
      reason = "telegramfx_disabled";
    }

    return res.status(200).json({
      ok: true,
      eligible,
      username: username.display,
      reason,
    });
  } catch (error) {
    console.error("[api/telegram-eligibility]", error);
    return res.status(500).json({
      ok: false,
      eligible: false,
      error: "TELEGRAMFX CHECK FAILED",
    });
  }
}
