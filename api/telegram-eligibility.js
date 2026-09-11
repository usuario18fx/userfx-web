const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function normalizeTelegramUsername(value) {
  const raw = String(value || "").trim().replace(/^@+/, "");
  if (!/^[A-Za-z0-9_]{3,32}$/.test(raw)) return null;
  return { display: `@${raw}`, normalized: raw.toLowerCase() };
}

async function getTelegramFxAccess(usernameNormalized) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const params = new URLSearchParams({
    username_normalized: `eq.${usernameNormalized}`,
    select: "username,username_normalized,telegramfx_access,enabled",
    limit: "1",
  });

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/telegramfx_access?${params.toString()}`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase eligibility lookup failed (${response.status}): ${detail.slice(0, 240)}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, eligible: false, error: "Method not allowed." });
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

    const row = await getTelegramFxAccess(username.normalized);
    const eligible = Boolean(
      row && row.enabled === true && row.telegramfx_access === true,
    );

    return res.status(200).json({
      ok: true,
      eligible,
      username: username.display,
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
