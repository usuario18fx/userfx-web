const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function normalizeTelegramUsername(value) {
  const raw = String(value || "")
    .trim()
    .replace(/^@+/, "");

  if (!/^[A-Za-z0-9_]{3,32}$/.test(raw)) {
    return null;
  }

  return {
    display: `@${raw}`,
    normalized: raw.toLowerCase(),
  };
}

async function telegramFxLookup(params) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

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

    throw new Error(
      `Supabase TelegramFX lookup failed (${response.status}): ${detail.slice(0, 300)}`,
    );
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function getTelegramFxAccess(value) {
  const username = normalizeTelegramUsername(value);

  if (!username) {
    return null;
  }

  const select =
    "username,username_normalized,telegramfx_access,gallery_access,enabled";

  const normalizedParams = new URLSearchParams({
    username_normalized: `eq.${username.normalized}`,
    select,
    limit: "1",
  });

  const normalizedRow = await telegramFxLookup(normalizedParams);
  if (normalizedRow) {
    return normalizedRow;
  }

  for (const candidate of [`@${username.normalized}`, username.normalized]) {
    const legacyParams = new URLSearchParams({
      username: `ilike.${candidate}`,
      select,
      limit: "1",
    });

    const legacyRow = await telegramFxLookup(legacyParams);
    if (legacyRow) {
      return legacyRow;
    }
  }

  return null;
}

export function hasTelegramFxAccess(record) {
  return Boolean(
    record &&
      record.enabled === true &&
      record.telegramfx_access === true,
  );
}
