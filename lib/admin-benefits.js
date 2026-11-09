// Prefixes are assigned by the server; display names and browser storage never grant access.
export const ACCESS_LEVELS = Object.freeze({
  SPCL: { planId: "basic", days: null, duration: "No membership expiry", label: "SPECIAL", chat: false, gallery: null },
  VIPX: { planId: "vip", days: 7, duration: "7 days", label: "VIP", chat: true, gallery: "vip" },
  PRX0: { planId: "pro", days: 1, duration: "24 hours", label: "PRO", chat: true, gallery: "pro" },
  BSIC: { planId: "basic", days: 0.5, duration: "12 hours", label: "BASIC", chat: true, gallery: "basic" },
});
export const BENEFIT_SCOPES = ["membership", "myroom", "stage", "gallery", "buzon", "profiles", "camera", "chat"];
export function activeGrant(grant, now = Date.now()) {
  return grant && Object.hasOwn(ACCESS_LEVELS, grant.prefix) &&
    (grant.expiresAt === null || Date.parse(grant.expiresAt) > now) ? grant : null;
}
export function accountBenefits(account, session, now = Date.now()) {
  const grants = account?.adminBenefits || {};
  const base = session.accessMode === "telegram_identity" ? "SPCL" :
    ({ basic: "BSIC", pro: "PRX0", vip: "VIPX" }[session.planId] || "SPCL");
  const membership = activeGrant(grants.membership, now)?.prefix || base;
  const prefixes = Object.fromEntries(BENEFIT_SCOPES.map((scope) => [scope,
    activeGrant(grants[scope], now)?.prefix || membership]));
  return {
    accessPrefix: membership,
    planId: ACCESS_LEVELS[membership].planId,
    paidChat: ACCESS_LEVELS[prefixes.chat].chat,
    galleryPlanId: ACCESS_LEVELS[prefixes.gallery].gallery,
    prefixes,
  };
}
export function benefitDescription(prefix, scope) {
  const level = ACCESS_LEVELS[prefix];
  if (!level) return "";
  if (scope === "chat") return level.chat ? "Private chat included" : "Identity only · no private chat";
  if (scope === "gallery") return level.gallery ? `Album ${prefix} · matching collection` : "Identity only · no private album";
  if (scope === "membership") return level.chat ? "Rooms, camera, chat, and matching album" : "Identity, rooms, and camera · no chat or private album";
  return "Access to this section · entrance approval still applies";
}
