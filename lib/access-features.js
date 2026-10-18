const NONE = Object.freeze({ oncam: false, rec: false, chat: false, multimedia: false });
const PLANS = Object.freeze({
  basic: { oncam: true, rec: false, chat: true, multimedia: false },
  pro: { oncam: true, rec: true, chat: true, multimedia: true },
  vip: { oncam: true, rec: true, chat: true, multimedia: true },
  special: { oncam: true, rec: true, chat: false, multimedia: true },
});

// Only use a session read by the server, never request-body permissions.
export function getAccessFeatures(session) {
  if (!session) return { ...NONE };
  const plan = session.accessMode === "telegram_identity" ? "special" : session.planId;
  const defaults = PLANS[plan];
  if (!defaults) return { ...NONE };
  return Object.fromEntries(Object.keys(NONE).map((key) => [key,
    defaults[key] && (session.features?.[key] === undefined || session.features[key] === true),
  ]));
}

export function isSessionOwner(session, adminId) {
  const id = String(session?.telegramUserId || session?.userId || "").trim();
  return Boolean(adminId && id && id === String(adminId).trim());
}

export function sessionFeatures(session, adminId) {
  return isSessionOwner(session, adminId)
    ? { oncam: true, rec: true, chat: true, multimedia: true }
    : getAccessFeatures(session);
}
