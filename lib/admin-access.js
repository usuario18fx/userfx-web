import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { readVaultSession } from "./vault-session.js";
import { ensureAccount, getAccount, accountProfileImages } from "./account.js";
import { getTelegramFxAccess, hasTelegramFxAccess, normalizeTelegramUsername } from "./telegram/access.js";
import { ACCESS_LEVELS, BENEFIT_SCOPES, accountBenefits } from "./admin-benefits.js";

const COOKIE = "userfx_admin_session";
const OAUTH_COOKIE = "userfx_admin_oauth";
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fail = (status, message) => Object.assign(new Error(message), { status });
const decode = (value) => { try { return JSON.parse(value); } catch { return null; } };
function cookieValue(req, name) {
  const value = String(req.headers.cookie || "").split(";").find((part) => part.trim().startsWith(`${name}=`));
  return value ? value.trim().slice(name.length + 1) : "";
}
function setCookie(req, res, name, token, seconds) {
  const previous = res.getHeader?.("Set-Cookie");
  const cookie = `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${process.env.NODE_ENV === "production" || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : ""}`;
  res.setHeader("Set-Cookie", previous ? [...(Array.isArray(previous) ? previous : [previous]), cookie] : cookie);
}
function requestOrigin(req) {
  return `${process.env.NODE_ENV === "production" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http"}://${req.headers.host}`;
}
export function isAdminOwner(session, ownerId = process.env.ADMIN_USER_ID) {
  return Boolean(ownerId && String(session?.telegramUserId || session?.userId || "") === String(ownerId).trim() &&
    normalizeTelegramUsername(session?.telegramUsername)?.normalized === "user18fx");
}
function authClient(storage = {}) {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key || /^\[SENSITIVE\]$/i.test(key)) throw fail(503, "El acceso por correo todavía no está configurado.");
  // Each request owns its auth client and PKCE storage. No browser receives this key.
  return createClient(url, key, { auth: {
    autoRefreshToken: false, persistSession: true, detectSessionInUrl: false, flowType: "pkce", storageKey: "userfx-admin-auth",
    storage: { getItem: (key) => storage[key] ?? null, setItem: (key, value) => { storage[key] = value; }, removeItem: (key) => { delete storage[key]; } },
  } }).auth;
}
async function googleEnabled() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/settings`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY }, signal: AbortSignal.timeout(8000),
  });
  return response.ok && (await response.json()).external?.google === true;
}
async function searchRegistered(query) {
  const params = new URLSearchParams({ select: "username,username_normalized,enabled,telegramfx_access", username_normalized: `ilike.${query}*`, limit: "20" });
  const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/telegramfx_access?${params}`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw fail(503, "No se pudo consultar el directorio de usuarios.");
  return response.json();
}

export function createAdminAccessHandler(dependencies) {
  const ns = dependencies.namespace || process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
  const key = (...parts) => `${ns}:admin:${parts.join(":")}`;
  const readSession = dependencies.readSession || readVaultSession;
  const readAccount = dependencies.getAccount || getAccount;
  const createAccount = dependencies.ensureAccount || ensureAccount;
  const makeAuth = dependencies.authClient || authClient;
  const lookup = dependencies.lookup || getTelegramFxAccess;
  const search = dependencies.search || searchRegistered;
  const owner = (session) => isAdminOwner(session, dependencies.ownerId ?? process.env.ADMIN_USER_ID);

  async function verifiedAdmin(req, redis, session) {
    if (!owner(session)) throw fail(403, "Solo @User18Fx puede activar Admin.");
    const token = cookieValue(req, COOKIE);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw fail(401, "Inicia sesión como administrador.");
    const record = decode(await redis.get(key("session", hash(token))));
    if (!record || record.accountId !== session.accountId || record.expiresAt <= Date.now()) throw fail(401, "La sesión de administrador venció.");
    const { data, error } = await makeAuth().getUser(record.accessToken);
    const link = decode(await redis.get(key("owner-auth")));
    if (error || !data?.user?.email_confirmed_at || data.user.id !== record.authUserId || link?.authUserId !== data.user.id || link?.accountId !== session.accountId)
      throw fail(401, "Vuelve a verificar tu acceso de administrador.");
    return record;
  }
  async function establish(req, res, redis, session, authSession) {
    if (!authSession?.access_token) throw fail(401, "Correo o contraseña incorrectos.");
    const { data, error } = await makeAuth().getUser(authSession.access_token);
    const user = data?.user;
    if (error || !user?.email_confirmed_at) throw fail(403, "Confirma tu correo antes de activar Admin.");
    // First verified owner login binds an immutable Auth user ID. Subsequent emails cannot replace it.
    const link = { accountId: session.accountId, authUserId: user.id, email: user.email, linkedAt: new Date().toISOString() };
    await redis.set(key("owner-auth"), JSON.stringify(link), "NX");
    const saved = decode(await redis.get(key("owner-auth")));
    if (saved?.authUserId !== user.id || saved?.accountId !== session.accountId) throw fail(403, "Usa el correo vinculado a tu cuenta Admin.");
    const token = crypto.randomBytes(32).toString("base64url");
    const ttl = Math.max(1, Math.min(3600, Number(authSession.expires_in) || 3600));
    const previous = cookieValue(req, COOKIE);
    if (/^[A-Za-z0-9_-]{43}$/.test(previous)) await redis.del(key("session", hash(previous)));
    await redis.set(key("session", hash(token)), JSON.stringify({ accountId: session.accountId, authUserId: user.id, email: user.email, accessToken: authSession.access_token, expiresAt: Date.now() + ttl * 1000 }), "EX", ttl);
    setCookie(req, res, COOKIE, token, ttl);
    return { ok: true, ownerEligible: true, mode: "admin", email: user.email };
  }
  const handler = async function adminAccess(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");
    res.setHeader("Referrer-Policy", "no-referrer");
    const query = req.query || Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
    const op = query.op;
    const callback = op === "admin-callback";
    try {
      const getOps = ["admin-session", "admin-users", "admin-callback"];
      if (req.method !== (getOps.includes(op) ? "GET" : "POST")) throw fail(405, "Método no permitido.");
      if (req.method === "POST") {
        if (!req.headers.origin || new URL(req.headers.origin).host !== req.headers.host) throw fail(403, "Origen no permitido.");
        if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw fail(415, "Se requiere JSON.");
      }
      const session = await readSession(req);
      const eligible = owner(session);
      if (op === "admin-session" && !eligible) return res.status(200).json({ ok: true, ownerEligible: false, mode: "user" });
      if (!eligible || !session?.accountId) throw fail(403, "Solo @User18Fx puede activar Admin.");
      const redis = dependencies.getRedis();
      let body = {};
      if (req.method === "POST") {
        try { body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}; } catch { throw fail(400, "Solicitud inválida."); }
        if (JSON.stringify(body).length > 6000) throw fail(413, "Solicitud demasiado grande.");
      }
      if (op === "admin-session") {
        let admin = null;
        try { admin = await verifiedAdmin(req, redis, session); } catch (error) { if (![401, 403].includes(error.status)) throw error; }
        const linked = decode(await redis.get(key("owner-auth")));
        return res.status(200).json({ ok: true, ownerEligible: true, mode: admin ? "admin" : "user", email: admin?.email || linked?.email || "", linked: Boolean(linked), googleEnabled: await (dependencies.googleEnabled || googleEnabled)().catch(() => false) });
      }
      if (op === "admin-user-mode") {
        const token = cookieValue(req, COOKIE);
        if (/^[A-Za-z0-9_-]{43}$/.test(token)) await redis.del(key("session", hash(token)));
        setCookie(req, res, COOKIE, "", 0);
        return res.status(200).json({ ok: true, ownerEligible: true, mode: "user" });
      }
      if (["admin-login", "admin-signup", "admin-google"].includes(op)) {
        const rate = key("login-rate", session.accountId, Math.floor(Date.now() / 900000));
        const count = await redis.incr(rate);
        if (count === 1) await redis.expire(rate, 901);
        if (count > 8) throw fail(429, "Espera 15 minutos antes de volver a intentar.");
        if (op === "admin-google") {
          if (!await (dependencies.googleEnabled || googleEnabled)()) throw fail(503, "Google todavía no está habilitado para UserFX.");
          const state = crypto.randomBytes(32).toString("base64url");
          const storage = {};
          const origin = requestOrigin(req);
          const { data, error } = await makeAuth(storage).signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/api/admin-runtime?op=admin-callback`, skipBrowserRedirect: true } });
          if (error || !data?.url) throw fail(503, "No se pudo abrir Google.");
          await redis.set(key("oauth", hash(state)), JSON.stringify({ accountId: session.accountId, storage }), "EX", 300);
          setCookie(req, res, OAUTH_COOKIE, state, 300);
          return res.status(200).json({ url: data.url });
        }
        const email = String(body.email || "").trim().toLowerCase();
        const password = typeof body.password === "string" ? body.password : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 256) throw fail(400, "Escribe tu correo y contraseña.");
        if (op === "admin-signup") {
          if (await redis.get(key("owner-auth"))) throw fail(403, "Tu cuenta Admin ya está vinculada.");
          if (password.length < 12) throw fail(400, "Usa una contraseña de al menos 12 caracteres.");
          const { data, error } = await makeAuth().signUp({ email, password, options: { emailRedirectTo: `${requestOrigin(req)}/#/private-room` } });
          if (error) throw fail(400, "No se pudo crear el acceso. Revisa tu correo o intenta iniciar sesión.");
          if (data?.session) return res.status(200).json(await establish(req, res, redis, session, data.session));
          return res.status(200).json({ ok: true, confirmationRequired: true });
        }
        const { data, error } = await makeAuth().signInWithPassword({ email, password });
        if (error) throw fail(401, "Correo o contraseña incorrectos, o correo sin confirmar.");
        return res.status(200).json(await establish(req, res, redis, session, data?.session));
      }
      if (callback) {
        const state = cookieValue(req, OAUTH_COOKIE);
        if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !query.code || query.error) throw fail(401, "No se completó Google.");
        const pending = decode(await redis.getdel(key("oauth", hash(state))));
        if (pending?.accountId !== session.accountId) throw fail(403, "La verificación de Google venció.");
        const { data, error } = await makeAuth(pending.storage).exchangeCodeForSession(String(query.code));
        if (error) throw fail(401, "No se completó Google.");
        await establish(req, res, redis, session, data?.session);
        setCookie(req, res, OAUTH_COOKIE, "", 0);
        res.setHeader("Location", "/?admin=ready#/private-room");
        return res.status(303).end();
      }
      const admin = await verifiedAdmin(req, redis, session);
      if (op === "admin-users") {
        const searchTerm = normalizeTelegramUsername(query.q)?.normalized;
        if (!searchTerm) return res.status(200).json({ users: [] });
        const registered = await search(searchTerm);
        const users = await Promise.all(registered.slice(0, 20).map(async (entry) => {
          const username = normalizeTelegramUsername(entry.username_normalized || entry.username)?.normalized;
          if (!username) return null;
          const id = await redis.get(`${ns}:account-link:username:${username}`);
          const account = id ? await readAccount(redis, ns, id) : null;
          return { username, name: account?.profile?.displayName || `@${username}`, avatarUrl: account ? accountProfileImages(account).avatarUrl : "", grants: account?.adminBenefits || {}, active: hasTelegramFxAccess(entry) };
        }));
        return res.status(200).json({ users: users.filter(Boolean) });
      }
      if (op === "admin-grant") {
        const username = normalizeTelegramUsername(body.username)?.normalized;
        const scope = String(body.scope || "");
        const prefix = String(body.prefix || "");
        if (!username || !BENEFIT_SCOPES.includes(scope) || !Object.hasOwn(ACCESS_LEVELS, prefix)) throw fail(400, "Selecciona un usuario, una sección y un prefijo válido.");
        if (!hasTelegramFxAccess(await lookup(username))) throw fail(409, "Activa primero la identidad de este usuario en TelegramFX.");
        const linkedId = await redis.get(`${ns}:account-link:username:${username}`);
        const existing = linkedId ? await readAccount(redis, ns, linkedId) : null;
        const account = existing || await createAccount(redis, ns, { telegramUsername: username });
        const level = ACCESS_LEVELS[prefix];
        const grant = { prefix, grantedAt: new Date().toISOString(), expiresAt: level.days ? new Date(Date.now() + level.days * 86400000).toISOString() : null, adminUserId: admin.authUserId };
        // Atomically merge just one benefit; never overwrite concurrent profile edits or other scopes.
        const saved = await redis.eval(`local raw = redis.call('GET', KEYS[1]); if not raw then return 0 end
          local a = cjson.decode(raw); a.adminBenefits = a.adminBenefits or {}; a.adminBenefits[ARGV[1]] = cjson.decode(ARGV[2]); a.updatedAt = ARGV[3];
          redis.call('SET', KEYS[1], cjson.encode(a)); return 1`, 1, `${ns}:account:${account.accountId}`, scope, JSON.stringify(grant), grant.grantedAt);
        if (!saved) throw fail(409, "La cuenta cambió. Busca el usuario otra vez.");
        await redis.lpush(key("audit"), JSON.stringify({ username, scope, prefix, grantedAt: grant.grantedAt, expiresAt: grant.expiresAt, adminUserId: admin.authUserId }));
        await redis.ltrim(key("audit"), 0, 999);
        const updated = await readAccount(redis, ns, account.accountId);
        return res.status(200).json({ ok: true, username, scope, grant, benefits: accountBenefits(updated, { accessMode: updated.lastAccessMode, planId: updated.lastPlanId }) });
      }
      throw fail(400, "Acción desconocida.");
    } catch (error) {
      if (callback) { res.setHeader("Location", "/?admin=error#/private-room"); return res.status(303).end(); }
      if (!error.status) console.error("[admin-access]", error.name);
      return res.status(error.status || 503).json({ error: error.status ? error.message : "Admin no está disponible. Inténtalo de nuevo." });
    }
  };
  handler.requireAdmin = verifiedAdmin;
  return handler;
}
