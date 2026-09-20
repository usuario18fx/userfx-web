import crypto from "crypto";

const DEFAULT_PROFILE = Object.freeze({
  displayName: "",
  bio: "",
  visibility: "private",
  onlineVisibility: "members",
  mediaVisibility: "private",
});

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function cleanUserId(value) {
  const userId = String(value || "").trim();
  return /^\d+$/.test(userId) ? userId : "";
}

function cleanCodeHash(value) {
  const codeHash = String(value || "").trim().toLowerCase();
  return /^[a-f0-9]{16,64}$/.test(codeHash) ? codeHash : "";
}

function accountKey(namespace, accountId) {
  return `${namespace}:account:${accountId}`;
}

function accountLinkKeys(namespace, { userId, telegramUsername, codeHash }) {
  const keys = [];

  if (userId) {
    keys.push(`${namespace}:account-link:telegram:${userId}`);
  }

  if (telegramUsername) {
    keys.push(`${namespace}:account-link:username:${telegramUsername}`);
  }

  if (codeHash) {
    keys.push(`${namespace}:account-link:code:${codeHash}`);
  }

  return keys;
}

function createAccountId() {
  return `usr_${crypto.randomBytes(12).toString("base64url")}`;
}

function normalizeProfile(profile) {
  const current = profile && typeof profile === "object" ? profile : {};

  return {
    ...DEFAULT_PROFILE,
    ...current,
  };
}

export async function getAccount(redis, namespace, accountId) {
  const safeAccountId = String(accountId || "").trim();

  if (!/^usr_[A-Za-z0-9_-]{12,40}$/.test(safeAccountId)) {
    return null;
  }

  const raw = await redis.get(accountKey(namespace, safeAccountId));
  if (!raw) return null;

  try {
    const account = JSON.parse(raw);

    if (account?.accountId !== safeAccountId) {
      return null;
    }

    return {
      ...account,
      profile: normalizeProfile(account.profile),
    };
  } catch {
    return null;
  }
}

export async function ensureAccount(
  redis,
  namespace,
  {
    userId: rawUserId,
    telegramUsername: rawTelegramUsername,
    codeHash: rawCodeHash,
    planId,
    accessMode,
  } = {},
) {
  const userId = cleanUserId(rawUserId);
  const telegramUsername = cleanUsername(rawTelegramUsername);
  const codeHash = cleanCodeHash(rawCodeHash);
  const linkKeys = accountLinkKeys(namespace, {
    userId,
    telegramUsername,
    codeHash,
  });

  let accountId = "";

  if (linkKeys.length) {
    const linkedIds = await redis.mget(...linkKeys);
    accountId = String(linkedIds.find(Boolean) || "").trim();
  }

  if (!/^usr_[A-Za-z0-9_-]{12,40}$/.test(accountId)) {
    accountId = createAccountId();
  }

  const existing = await getAccount(redis, namespace, accountId);
  const now = new Date().toISOString();
  const account = {
    accountId,
    telegramUserId: userId || existing?.telegramUserId || null,
    telegramUsername:
      telegramUsername || existing?.telegramUsername || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastAccessAt: now,
    lastPlanId: String(planId || existing?.lastPlanId || "basic"),
    lastAccessMode: String(
      accessMode || existing?.lastAccessMode || "code",
    ),
    memberAccess:
      accessMode === "telegram_identity" || existing?.memberAccess === true,
    profile: normalizeProfile(existing?.profile),
  };

  const pipeline = redis.multi();
  pipeline.set(accountKey(namespace, accountId), JSON.stringify(account));

  for (const key of linkKeys) {
    pipeline.set(key, accountId);
  }

  await pipeline.exec();
  return account;
}

function sanitizeProfilePatch(value) {
  const input = value && typeof value === "object" ? value : {};
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(input, "displayName")) {
    patch.displayName = String(input.displayName || "")
      .trim()
      .slice(0, 40);
  }

  if (Object.prototype.hasOwnProperty.call(input, "bio")) {
    patch.bio = String(input.bio || "")
      .trim()
      .slice(0, 280);
  }

  if (
    ["private", "members", "public"].includes(
      String(input.visibility || ""),
    )
  ) {
    patch.visibility = String(input.visibility);
  }

  if (
    ["hidden", "members", "public"].includes(
      String(input.onlineVisibility || ""),
    )
  ) {
    patch.onlineVisibility = String(input.onlineVisibility);
  }

  if (
    ["private", "members", "public"].includes(
      String(input.mediaVisibility || ""),
    )
  ) {
    patch.mediaVisibility = String(input.mediaVisibility);
  }

  return patch;
}

export async function updateAccountProfile(
  redis,
  namespace,
  accountId,
  profilePatch,
) {
  const account = await getAccount(redis, namespace, accountId);
  if (!account) return null;

  const now = new Date().toISOString();
  const updated = {
    ...account,
    updatedAt: now,
    profile: {
      ...normalizeProfile(account.profile),
      ...sanitizeProfilePatch(profilePatch),
    },
  };

  await redis.set(
    accountKey(namespace, accountId),
    JSON.stringify(updated),
  );

  return updated;
}
