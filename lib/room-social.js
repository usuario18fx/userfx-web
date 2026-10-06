import crypto from "node:crypto";

const fail = (status, message) => Object.assign(new Error(message), { status });
const decode = (raw) => { try { return JSON.parse(raw); } catch { return null; } };
const roomFor = (id) => `room_${crypto.createHash("sha256").update(id).digest("hex").slice(0, 24)}`;
const displayName = (account) => account.profile?.displayName || (account.telegramUsername ? `@${account.telegramUsername}` : `Member ${account.accountId.slice(-4)}`);

export async function updateRoomDirectory(redis, key, account) {
  if (["members", "public"].includes(account.profile?.visibility)) {
    await redis.zadd(key("directory"), Date.now(), account.accountId);
  } else {
    await redis.zrem(key("directory"), account.accountId);
  }
}

export async function readRoomDirectory(redis, key, accountReader, namespace, self) {
  await redis.zremrangebyscore(key("directory"), "-inf", Date.now() - 90 * 86400000);
  const ids = await redis.zrevrange(key("directory"), 0, 199);
  const accounts = (await Promise.all(ids.filter((id) => id !== self.accountId).map((id) => accountReader(redis, namespace, id))))
    .filter((account) => account && ["members", "public"].includes(account.profile?.visibility)).slice(0, 59);
  accounts.unshift(self);
  const profiles = await Promise.all(accounts.map(async (account) => {
    const roomId = roomFor(account.accountId);
    const showOnline = account.accountId === self.accountId || account.profile?.onlineVisibility !== "hidden";
    const ids = showOnline ? await redis.zrangebyscore(key("presence", roomId), Date.now() - 30000, "+inf") : [];
    const people = ids.length ? (await redis.mget(...ids.map((id) => key("peer", roomId, id)))).map(decode).filter(Boolean) : [];
    const hosts = people.filter((person) => person.accountId === account.accountId);
    return {
      roomId, name: displayName(account), bio: account.profile?.bio || "",
      location: account.profile?.location || "", interests: account.profile?.interests || "",
      isMine: account.accountId === self.accountId,
      isLive: hosts.length > 0, cameraOn: hosts.some((person) => person.cameraOn),
      viewers: hosts.length ? people.filter((person) => person.accountId !== account.accountId).length : 0,
    };
  }));
  profiles.sort((a, b) => Number(b.isLive) - Number(a.isLive) || Number(b.isMine) - Number(a.isMine));
  return profiles;
}

function imageUrl(value) {
  if (!value) return null;
  if (typeof value !== "string" || value.length > 1000) throw fail(400, "Use an HTTPS image link of at most 1000 characters.");
  let url;
  try { url = new URL(value.trim()); } catch { throw fail(400, "Use a valid HTTPS image link."); }
  if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local") || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":"))
    throw fail(400, "Use a public HTTPS image link.");
  return url.href;
}

// The caller has already checked the vault session and room approval.
export async function roomSocial({ redis, key, op, method, body, roomId, isOwner, profile, paidChat }) {
  if (roomId === "stage") throw fail(400, "Posts belong to MyRoom.");
  const postsKey = key("posts", roomId);
  const stored = await redis.lrange(postsKey, 0, 49);
  if (op === "posts" && method === "GET") {
    const posts = await Promise.all(stored.map(decode).filter(Boolean).map(async (post) => {
      const [likeCount, likedByMe, comments] = await Promise.all([
        redis.scard(key("likes", roomId, post.id)),
        redis.sismember(key("likes", roomId, post.id), profile.accountId),
        paidChat ? redis.lrange(key("comments", roomId, post.id), 0, 29) : Promise.resolve([]),
      ]);
      return { ...post, imageUrl: post.imageUrl || null, likeCount, likedByMe: !!likedByMe, comments: comments.map(decode).filter(Boolean).reverse() };
    }));
    return { status: 200, data: { posts } };
  }
  if (method !== "POST") throw fail(405, "POST is required.");
  if (op === "posts") {
    if (!isOwner) throw fail(403, "Only the host can publish room posts.");
    if (typeof body.content !== "string" || !body.content.trim() || body.content.trim().length > 2000)
      throw fail(400, "Write a post of at most 2000 characters.");
    const post = { id: crypto.randomUUID(), authorId: profile.accountId, authorName: profile.name, content: body.content.trim(), imageUrl: imageUrl(body.imageUrl), createdAt: new Date().toISOString() };
    const writes = await redis.multi().lpush(postsKey, JSON.stringify(post)).ltrim(postsKey, 0, 49).expire(postsKey, 90 * 86400).exec();
    if (writes.some(([error]) => error)) throw fail(503, "Your post could not be saved.");
    return { status: 201, data: { post: { ...post, likeCount: 0, likedByMe: false, comments: [] } } };
  }
  const raw = stored.find((value) => decode(value)?.id === body.id);
  if (!raw) throw fail(404, "This post is no longer available.");
  const id = decode(raw).id;
  const likesKey = key("likes", roomId, id), commentsKey = key("comments", roomId, id);
  // Membership of the parent list and each mutation are atomic, so concurrent
  // deletion cannot create orphan interactions. Likes are explicit/idempotent.
  const parentCheck = `local found = false
    for _, value in ipairs(redis.call('LRANGE', KEYS[1], 0, 49)) do if value == ARGV[1] then found = true; break end end
    if not found then return -1 end
    local ttl = math.max(1, redis.call('TTL', KEYS[1]))
  `;
  if (op === "remove-post") {
    if (!isOwner) throw fail(403, "Only the host can remove room posts.");
    const result = await redis.eval(parentCheck + `redis.call('LREM', KEYS[1], 1, ARGV[1]); redis.call('DEL', KEYS[2], KEYS[3]); return 1`, 3, postsKey, likesKey, commentsKey, raw);
    if (result === -1) throw fail(404, "This post is no longer available.");
    return { status: 200, data: { ok: true } };
  }
  if (op === "post-like") {
    if (typeof body.liked !== "boolean") throw fail(400, "Choose like or unlike.");
    const result = await redis.eval(parentCheck + `if ARGV[3] == '1' then redis.call('SADD', KEYS[2], ARGV[2]) else redis.call('SREM', KEYS[2], ARGV[2]) end
      redis.call('EXPIRE', KEYS[2], ttl); return redis.call('SCARD', KEYS[2])`, 2, postsKey, likesKey, raw, profile.accountId, body.liked ? "1" : "0");
    if (result === -1) throw fail(404, "This post is no longer available.");
    return { status: 200, data: { likeCount: result, likedByMe: body.liked } };
  }
  if (op === "post-comment") {
    if (!paidChat) throw fail(403, "Private comments require a paid membership.");
    if (typeof body.content !== "string" || !body.content.trim() || body.content.trim().length > 400)
      throw fail(400, "Write a comment of at most 400 characters.");
    const comment = { id: crypto.randomUUID(), authorId: profile.accountId, authorName: profile.name, content: body.content.trim(), createdAt: new Date().toISOString() };
    const result = await redis.eval(parentCheck + `redis.call('LPUSH', KEYS[2], ARGV[2]); redis.call('LTRIM', KEYS[2], 0, 29); redis.call('EXPIRE', KEYS[2], ttl); return 1`, 2, postsKey, commentsKey, raw, JSON.stringify(comment));
    if (result === -1) throw fail(404, "This post is no longer available.");
    return { status: 201, data: { comment } };
  }
  throw fail(400, "Unknown social action.");
}
