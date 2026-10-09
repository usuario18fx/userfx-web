import { normalizeTelegramUsername } from "./telegram/access.js";
import { accountProfileImages } from "./account.js";
const fail = (status, message) => Object.assign(new Error(message), { status });
const normalized = (value) => normalizeTelegramUsername(value)?.normalized;

export async function savedBotContacts() {
  const url = process.env.SUPABASE_URL, secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("Bot contacts are unavailable.");
  const names = new Set();
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/telegramfx_access?select=username,username_normalized&order=username_normalized.asc&limit=1000&offset=${offset}`, {
      headers: { apikey: secret, Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(5000), cache: "no-store",
    });
    if (!response.ok) throw new Error("Bot contacts are unavailable.");
    const rows = await response.json();
    for (const row of rows) { const name = normalized(row.username_normalized || row.username); if (name) names.add(name); }
    if (rows.length < 1000) break;
  }
  return [...names];
}

// Site presence is independent of cameras and rooms, and scoped to confirmed friends.
export async function roomContacts({ redis, key, ns, account, session, clientId, method, body, accountReader, importContacts = savedBotContacts, now = Date.now() }) {
  const self = normalized(account.telegramUsername);
  if (!self || normalized(session.telegramUsername) !== self) throw fail(403, "Verifica tu identidad de Telegram para usar amigos.");
  const friendsKey = (user) => key("friends", user);
  const pendingKey = (user) => key("friend-requests", user);
  const presenceKey = (user) => key("site-presence", user);
  const readAccount = async (user) => {
    const id = await redis.get(`${ns}:account-link:username:${user}`);
    return id ? accountReader(redis, ns, id) : null;
  };
  const action = body.action || "heartbeat";
  if (method === "DELETE") {
    await redis.zrem(presenceKey(self), clientId);
    return { ok: true };
  }
  if (method === "POST" && action !== "heartbeat") {
    const target = normalized(body.username);
    if (!target || target === self) throw fail(400, "Introduce otro usuario de Telegram.");
    const rate = key("friend-rate", self, Math.floor(now / 3600000));
    const count = await redis.incr(rate); if (count === 1) await redis.expire(rate, 3600);
    if (count > 30) throw fail(429, "Espera antes de enviar más solicitudes.");
    if (action === "request") {
      if (!(await readAccount(target))) throw fail(404, "Ese usuario todavía no tiene cuenta en UserFX.");
      if (await redis.sismember(friendsKey(self), target)) throw fail(409, "Ya son amigos.");
      if (await redis.scard(pendingKey(target)) >= 200) throw fail(429, "Ese usuario tiene demasiadas solicitudes pendientes.");
      await redis.sadd(pendingKey(target), self);
    } else if (action === "accept") {
      if (!(await redis.sismember(pendingKey(self), target))) throw fail(404, "Solicitud no disponible.");
      await redis.multi().sadd(friendsKey(self), target).sadd(friendsKey(target), self).srem(pendingKey(self), target).srem(pendingKey(target), self).exec();
    } else if (action === "reject") {
      await redis.srem(pendingKey(self), target);
    } else throw fail(400, "Acción no disponible.");
  }
  let syncPending = false;
  if (self === "user18fx" && method === "POST" && action === "heartbeat") {
    // A shared lock prevents one import per tab; failed imports remain retryable.
    if (await redis.set(key("bot-friends-sync"), "1", "EX", 120, "NX")) {
      try {
        const names = await importContacts();
        const tx = redis.multi();
        for (const user of names.filter((user) => user !== self)) {
          tx.sadd(friendsKey(self), user).sadd(friendsKey(user), self);
        }
        await tx.exec();
      } catch { syncPending = true; await redis.del(key("bot-friends-sync")); }
    }
  }
  if (method === "POST" && action === "heartbeat") {
    const previous = await redis.eval(`redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1]); local n=redis.call('ZCARD', KEYS[1]); redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3]); redis.call('EXPIRE', KEYS[1], 45); return n`, 1, presenceKey(self), now - 30000, now, clientId);
    if (!previous && account.profile?.onlineVisibility !== "hidden") {
      const names = await redis.smembers(friendsKey(self));
      const event = JSON.stringify({ id: `${self}:${now}`, username: self, at: now });
      const tx = redis.multi();
      for (const friend of names) tx.lpush(key("friend-notices", friend), event).ltrim(key("friend-notices", friend), 0, 49).expire(key("friend-notices", friend), 86400);
      await tx.exec();
    }
  }
  const names = (await redis.smembers(friendsKey(self))).sort();
  const friends = await Promise.all(names.map(async (username) => {
    const friend = await readAccount(username);
    const visible = friend?.profile?.onlineVisibility !== "hidden";
    const online = !!friend && visible && (await redis.zcount(presenceKey(username), now - 30000, "+inf")) > 0;
    return { username, name: friend?.profile?.displayName || `@${username}`, avatarUrl: friend ? accountProfileImages(friend).avatarUrl : null, online };
  }));
  friends.sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username));
  const notices = (await redis.lrange(key("friend-notices", self), 0, 49)).map((raw) => JSON.parse(raw)).filter((event) => names.includes(event.username));
  return { self, friends, notices, requests: (await redis.smembers(pendingKey(self))).sort(), syncPending };
}
