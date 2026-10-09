import assert from "node:assert/strict";
import crypto from "node:crypto";
import Redis from "ioredis";
import { createAdminAccessHandler, isAdminOwner } from "../lib/admin-access.js";
import { accountBenefits } from "../lib/admin-benefits.js";
import { ensureAccount, getAccount, updateAccountProfile } from "../lib/account.js";
import { createRoomLiveHandler } from "../lib/room-live.js";

if (!process.env.ROOMFX_TEST_REDIS_URL) throw new Error("Set ROOMFX_TEST_REDIS_URL to a disposable Redis instance.");
const redis = new Redis(process.env.ROOMFX_TEST_REDIS_URL, { maxRetriesPerRequest: 1 });
redis.on("error", () => {});
const ns = `userfx:admin-test:${crypto.randomUUID()}`;
const sessions = {};
const authUsers = {
  ownerToken: { id: "auth-owner", email: "owner@example.test", email_confirmed_at: new Date().toISOString() },
  otherToken: { id: "auth-other", email: "other@example.test", email_confirmed_at: new Date().toISOString(), user_metadata: { role: "admin" } },
  unconfirmed: { id: "auth-unconfirmed", email: "pending@example.test" },
};
let oauthEnabled = false;
let pkceState = "";
const makeAuth = (storage = {}) => ({
  async getUser(token) { return { data: { user: authUsers[token] }, error: authUsers[token] ? null : new Error("Invalid token") }; },
  async signInWithPassword({ email, password }) {
    const token = email === "owner@example.test" ? "ownerToken" : email === "other@example.test" ? "otherToken" : "unconfirmed";
    return password === "correct-password" ? { data: { session: { access_token: token, expires_in: 3600 } } } : { error: new Error("Invalid password") };
  },
  async signUp() { return { data: { session: null } }; },
  async signInWithOAuth() { storage.verifier = crypto.randomUUID(); pkceState = storage.verifier; return { data: { url: "https://accounts.google.test/authorize" } }; },
  async exchangeCodeForSession(code) { return code === "valid-code" && storage.verifier === pkceState ? { data: { session: { access_token: "ownerToken", expires_in: 3600 } } } : { error: new Error("PKCE mismatch") }; },
});
const registered = ["user18fx", "member_one"];
const access = (username) => registered.includes(username) ? { username_normalized: username, username: `@${username}`, enabled: true, telegramfx_access: true } : null;
const handler = createAdminAccessHandler({ namespace: ns, getRedis: () => redis, readSession: async (req) => sessions[req.user], ownerId: "111",
  authClient: makeAuth, googleEnabled: async () => oauthEnabled, lookup: async (username) => access(username), search: async (q) => registered.filter((u) => u.startsWith(q)).map(access) });
async function call(user, op, body, cookie = "", extra = {}) {
  const out = { status: 200, headers: {} };
  const get = ["admin-session", "admin-users", "admin-callback"].includes(op);
  await handler({ user, method: get ? "GET" : "POST", query: { op, ...extra.query }, body,
    headers: { host: "localhost:5173", origin: "http://localhost:5173", "content-type": "application/json", cookie, ...extra.headers } },
    { getHeader(k) { return out.headers[k]; }, setHeader(k, v) { out.headers[k] = v; }, status(s) { out.status = s; return this; }, json(data) { out.data = data; return this; }, end() {} });
  return out;
}
const credentials = { email: "owner@example.test", password: "correct-password" };
const cookieOf = (result) => (Array.isArray(result.headers["Set-Cookie"]) ? result.headers["Set-Cookie"][0] : result.headers["Set-Cookie"]).split(";")[0];
try {
  await redis.ping();
  for (const [user, username, id] of [["owner", "user18fx", "111"], ["member", "member_one", "222"], ["spoof", "spoof_name", "333"]]) {
    const account = await ensureAccount(redis, ns, { userId: id, telegramUsername: username, planId: "basic", accessMode: "telegram_identity" });
    sessions[user] = { accountId: account.accountId, telegramUserId: id, telegramUsername: username, planId: "basic", accessMode: "telegram_identity" };
  }
  assert.equal(isAdminOwner({ ...sessions.member, telegramUsername: "USER18FX" }, "111"), false);
  assert.equal(isAdminOwner({ telegramUsername: "user18fx" }, "111"), false);
  assert.equal((await call("member", "admin-session")).data.ownerEligible, false);
  assert.equal((await call("member", "admin-login", credentials)).status, 403);
  assert.equal((await call("spoof", "admin-grant", { username: "member_one", scope: "membership", prefix: "VIPX" })).status, 403);
  assert.equal((await call("owner", "admin-users", undefined, "", { query: { q: "member" } })).status, 401);
  assert.equal((await call("owner", "admin-login", credentials, "", { headers: { origin: "https://evil.test" } })).status, 403);
  assert.equal((await call("owner", "admin-login", { email: "pending@example.test", password: "correct-password" })).status, 403);
  const login = await call("owner", "admin-login", credentials);
  assert.equal(login.status, 200);
  assert.equal(login.data.mode, "admin");
  const cookie = cookieOf(login);
  assert(login.headers["Set-Cookie"].includes("HttpOnly; SameSite=Lax"));
  assert(!JSON.stringify(login.data).includes("ownerToken"));
  assert.equal((await call("member", "admin-users", undefined, cookie, { query: { q: "member" } })).status, 403);
  assert.equal((await call("owner", "admin-login", { ...credentials, email: "other@example.test" })).status, 403);
  console.log("PASS verified Telegram owner + confirmed Auth account; spoofing, metadata roles, cookie theft and CSRF denied");

  const result = await call("owner", "admin-users", undefined, cookie, { query: { q: "member" } });
  assert.equal(result.data.users[0].username, "member_one");
  assert.equal((await call("owner", "admin-grant", { username: "unknown_user", scope: "membership", prefix: "VIPX" }, cookie)).status, 409);
  assert.equal((await call("owner", "admin-grant", { username: "member_one", scope: "danger", prefix: "VIPX" }, cookie)).status, 400);
  assert.equal((await call("owner", "admin-grant", { username: "member_one", scope: "chat", prefix: "ADMIN" }, cookie)).status, 400);
  for (const prefix of ["constructor", "__proto__", "toString"]) assert.equal((await call("owner", "admin-grant", { username: "member_one", scope: "chat", prefix }, cookie)).status, 400);
  for (const [scope, prefix] of [["chat", "PRX0"], ["gallery", "VIPX"]]) assert.equal((await call("owner", "admin-grant", { username: "member_one", scope, prefix }, cookie)).status, 200);
  const member = sessions.member;
  let account = await getAccount(redis, ns, member.accountId);
  let benefits = accountBenefits(account, member);
  assert.equal(benefits.accessPrefix, "SPCL");
  assert.equal(benefits.paidChat, true);
  assert.equal(benefits.galleryPlanId, "vip");
  assert.equal(Math.round((Date.parse(account.adminBenefits.gallery.expiresAt) - Date.parse(account.adminBenefits.gallery.grantedAt)) / 86400000), 7);
  await ensureAccount(redis, ns, { userId: "222", telegramUsername: "member_one", planId: "basic", accessMode: "telegram_identity" });
  await updateAccountProfile(redis, ns, member.accountId, { bio: "Kept", adminBenefits: { membership: { prefix: "VIPX", expiresAt: null } } });
  account = await getAccount(redis, ns, member.accountId);
  assert.equal(account.adminBenefits.gallery.prefix, "VIPX");
  assert.equal(account.adminBenefits.membership, undefined);
  assert.equal(account.profile.bio, "Kept");
  console.log("PASS scoped prefix benefits, duration, persistent relogin/profile edits and no client-side role assignment");

  const roomHandler = createRoomLiveHandler({ namespace: ns, getRedis: () => redis, readSession: async (req) => sessions[req.user] });
  async function room(op, body) {
    let status = 200, data;
    await roomHandler({ user: "member", method: body ? "POST" : "GET", query: { client: "11111111-1111-1111-1111-111111111111", op, room: "stage" }, body,
      headers: { host: "localhost:5173", origin: "http://localhost:5173", "content-type": "application/json" } },
      { setHeader() {}, status(s) { status = s; return this; }, json(d) { data = d; } });
    return { status, data };
  }
  assert.equal((await room("messages", { content: "Granted chat" })).status, 201);
  await call("owner", "admin-grant", { username: "member_one", scope: "chat", prefix: "SPCL" }, cookie);
  assert.equal((await room("messages", { content: "Must be blocked" })).status, 403);
  assert.equal((await room("bootstrap")).data.profile.galleryPlanId, "vip");
  assert.equal(accountBenefits(account, member, Date.now() + 8 * 86400000).galleryPlanId, null);
  console.log("PASS real room endpoint honors chat grants immediately; Gallery stays in its matching prefix and expired grants fall back");

  delete authUsers.ownerToken;
  assert.equal((await call("owner", "admin-users", undefined, cookie, { query: { q: "member" } })).status, 401);
  authUsers.ownerToken = { id: "auth-owner", email: "owner@example.test", email_confirmed_at: new Date().toISOString() };
  assert.equal((await call("owner", "admin-google", {})).status, 503);
  oauthEnabled = true;
  const oauth = await call("owner", "admin-google", {});
  assert.equal(oauth.status, 200);
  const oauthCookie = cookieOf(oauth);
  assert.equal((await call("member", "admin-callback", undefined, oauthCookie, { query: { code: "valid-code" } })).headers.Location, "/?admin=error#/private-room");
  const callback = await call("owner", "admin-callback", undefined, oauthCookie, { query: { code: "valid-code" } });
  assert.equal(callback.headers.Location, "/?admin=ready#/private-room");
  assert(callback.headers["Set-Cookie"].some((cookie) => cookie.startsWith("userfx_admin_oauth=;")));
  assert.equal((await call("owner", "admin-callback", undefined, oauthCookie, { query: { code: "valid-code" } })).headers.Location, "/?admin=error#/private-room");
  const newCookie = cookieOf(callback);
  await call("owner", "admin-user-mode", {}, newCookie);
  assert.equal((await call("owner", "admin-users", undefined, newCookie, { query: { q: "member" } })).status, 401);
  assert.equal((await redis.lrange(`${ns}:admin:audit`, 0, -1)).length, 3);
  console.log("PASS auth revocation, Google PKCE/account binding/replay prevention, User-mode logout and audit trail");
} finally {
  let cursor = "0";
  do { const [next, keys] = await redis.scan(cursor, "MATCH", `${ns}:*`, "COUNT", 200); cursor = next; if (keys.length) await redis.del(...keys); } while (cursor !== "0");
  await redis.quit();
}
