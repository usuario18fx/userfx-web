import crypto from "node:crypto";
import Redis from "ioredis";
import { readVaultSession } from "./vault-session.js";
import { getAccount } from "./account.js";
import { readRoomDirectory, updateRoomDirectory, roomSocial } from "./room-social.js";

const namespace = process.env.CODE_ENGINE_NAMESPACE || "userfx:vault";
const fail = (status, message) => Object.assign(new Error(message), { status });
const decode = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const clean = (value, length) => (typeof value === "string" ? value.trim().slice(0, length) : "");

function getRedis() {
  if (!process.env.REDIS_URL) throw fail(503, "The room service is temporarily unavailable.");
  if (!globalThis.__userfxRedis) {
    globalThis.__userfxRedis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 10000,
    });
    globalThis.__userfxRedis.on("error", () => {});
  }
  return globalThis.__userfxRedis;
}

// One serverless endpoint reuses the vault cookie and persistent accounts.
// Dependency injection allows isolated integration checks without production data.
export function createRoomLiveHandler(dependencies = {}) {
  const ns = dependencies.namespace || namespace;
  const key = (...parts) => `${ns}:roomfx:${parts.join(":")}`;
  const redisProvider = dependencies.getRedis || getRedis;
  const sessionReader = dependencies.readSession || readVaultSession;
  const accountReader = dependencies.getAccount || getAccount;

  return async function roomLive(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Cookie");
    if (!["GET", "POST", "DELETE"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST, DELETE");
      return res.status(405).json({ error: "Method not allowed." });
    }
    try {
      if (req.method !== "GET") {
        const origin = req.headers.origin;
        const host = String(req.headers.host || "");
        if (origin && new URL(origin).host !== host)
          throw fail(403, "Request origin is not allowed.");
        if (
          req.method === "POST" &&
          !String(req.headers["content-type"] || "").startsWith("application/json")
        )
          throw fail(415, "JSON is required.");
      }
      const session = await sessionReader(req);
      if (!session?.accountId) throw fail(401, "Unlock your access to enter RoomFX.");
      const redis = redisProvider();
      const account = await accountReader(redis, ns, session.accountId);
      if (!account) throw fail(401, "Your account session must be refreshed.");
      const query =
        req.query || Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
      const op = query.op;
      const clientId = String(query.client || "");
      if (!/^[a-f0-9-]{36}$/i.test(clientId)) throw fail(400, "Invalid device session.");
      const selfId = hash(`${account.accountId}:${clientId}`).slice(0, 32);
      const name =
        account.profile?.displayName ||
        (account.telegramUsername
          ? `@${account.telegramUsername}`
          : `Member ${account.accountId.slice(-4)}`);
      const paidChat = session.accessMode !== "telegram_identity";
      const profile = {
        id: selfId,
        accountId: account.accountId,
        name,
        bio: account.profile?.bio || "",
        location: account.profile?.location || "",
        interests: account.profile?.interests || "",
        visibility: account.profile?.visibility || "private",
        onlineVisibility: account.profile?.onlineVisibility || "members",
        planId: session.planId,
        paidChat,
      };
      const rateKey = key("rate", account.accountId, Math.floor(Date.now() / 60000));
      const count = await redis.incr(rateKey);
      if (count === 1) await redis.expire(rateKey, 65);
      if (count > 600) throw fail(429, "Please wait a moment before trying again.");
      let body = {};
      if (req.method === "POST") {
        try {
          body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
        } catch {
          throw fail(400, "Invalid JSON.");
        }
        if (JSON.stringify(body).length > 40000) throw fail(413, "This request is too large.");
      }
      const myRoomId = `room_${hash(account.accountId).slice(0, 24)}`;
      const myRoom = {
        id: myRoomId,
        ownerId: account.accountId,
        ownerName: name,
        createdAt: new Date().toISOString(),
      };
      await redis.set(key("room", myRoomId), JSON.stringify(myRoom), "EX", 90 * 86400);

      if (op === "bootstrap" || op === "profiles") await updateRoomDirectory(redis, key, account);
      if (op === "profiles") {
        if (req.method !== "GET") throw fail(405, "GET is required.");
        return res.status(200).json({ profiles: await readRoomDirectory(redis, key, accountReader, ns, account) });
      }

      if (op === "bootstrap") {
        const configured = decode(process.env.ROOMFX_ICE_SERVERS || "[]");
        const iceServers =
          Array.isArray(configured) && configured.length
            ? configured
            : [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
        return res
          .status(200)
          .json({ profile, myRoom: { ...myRoom, isOwner: true, approved: true }, iceServers });
      }

      async function inboxList() {
        const raw = await redis.lrange(key("inbox", account.accountId), 0, 99);
        const items = raw.map(decode).filter(Boolean);
        const statuses = items.length
          ? await redis.mget(...items.map((item) => key("request", item.roomId, item.accountId)))
          : [];
        return items.map((item, index) => ({
          ...item,
          status: decode(statuses[index])?.status || "expired",
        }));
      }
      if (op === "inbox") return res.status(200).json({ items: await inboxList(), paidChat });

      const roomId = String(query.room || "");
      if (!/^room_[a-f0-9]{24}$/.test(roomId) && roomId !== "stage")
        throw fail(400, "Invalid room link.");
      const room =
        roomId === "stage"
          ? { id: "stage", ownerId: null, ownerName: "UserFX", capacity: 6 }
          : decode(await redis.get(key("room", roomId)));
      if (!room) throw fail(404, "This room link has expired. Ask the host for a new invitation.");
      const isOwner = room.ownerId === account.accountId;
      const requestKey = key("request", roomId, account.accountId);
      const request = decode(await redis.get(requestKey));
      const approved = roomId === "stage" || isOwner || request?.status === "approved";
      const roomInfo = {
        id: roomId,
        ownerName: room.ownerName,
        isOwner,
        approved,
        status: approved ? "approved" : request?.status || "new",
        capacity: roomId === "stage" ? 6 : 5,
      };

      if (op === "request" && req.method === "POST") {
        if (roomId === "stage" || isOwner || approved)
          return res.status(200).json({ room: roomInfo });
        if (request?.status === "rejected") throw fail(403, "The host declined this request.");
        if (!request) {
          const item = {
            id: crypto.randomUUID(),
            roomId,
            accountId: account.accountId,
            name,
            hostName: room.ownerName,
            status: "pending",
            createdAt: new Date().toISOString(),
          };
          // NX prevents duplicate notifications from retries and multiple tabs.
          const inserted = await redis.set(requestKey, JSON.stringify(item), "EX", 86400, "NX");
          if (inserted) {
            await redis.sadd(key("waiting", roomId), account.accountId);
            await redis.expire(key("waiting", roomId), 86400);
            for (const owner of [room.ownerId, account.accountId]) {
              await redis.lpush(
                key("inbox", owner),
                JSON.stringify({
                  ...item,
                  direction: owner === account.accountId ? "outgoing" : "incoming",
                }),
              );
              await redis.ltrim(key("inbox", owner), 0, 99);
              await redis.expire(key("inbox", owner), 30 * 86400);
            }
          }
        }
        return res.status(200).json({ room: { ...roomInfo, status: "pending" } });
      }

      if (op === "approve" && req.method === "POST") {
        if (!isOwner) throw fail(403, "Only the host can manage this waiting room.");
        const target = clean(body.accountId, 64);
        const waiting = decode(await redis.get(key("request", roomId, target)));
        if (!waiting || waiting.status !== "pending")
          throw fail(404, "This request is no longer pending.");
        if (typeof body.approved !== "boolean") throw fail(400, "Choose approve or decline.");
        waiting.status = body.approved ? "approved" : "rejected";
        await redis.set(key("request", roomId, target), JSON.stringify(waiting), "EX", 86400);
        await redis.srem(key("waiting", roomId), target);
        return res.status(200).json({ ok: true });
      }

      if (op === "state") {
        let waiting = [];
        if (isOwner) {
          const ids = await redis.smembers(key("waiting", roomId));
          if (ids.length)
            waiting = (await redis.mget(...ids.map((id) => key("request", roomId, id))))
              .map(decode)
              .filter((item) => item?.status === "pending");
        }
        const now = Date.now();
        await redis.zremrangebyscore(key("presence", roomId), "-inf", now - 30000);
        const peers = approved ? await redis.zrange(key("presence", roomId), 0, -1) : [];
        const participants = peers.length
          ? (await redis.mget(...peers.map((id) => key("peer", roomId, id))))
              .map(decode)
              .filter(Boolean)
              .map(({ accountId: _accountId, ...person }) => person)
          : [];
        return res.status(200).json({ room: roomInfo, participants, waiting });
      }
      if (!approved) throw fail(403, "Wait for the host to approve your entrance.");

      if (["posts", "remove-post", "post-like", "post-comment"].includes(op)) {
        const result = await roomSocial({ redis, key, op, method: req.method, body, roomId, isOwner, profile, paidChat });
        return res.status(result.status).json(result.data);
      }

      if (op === "presence") {
        if (req.method === "DELETE") {
          await redis.zrem(key("presence", roomId), selfId);
          await redis.del(key("peer", roomId, selfId), key("signals", roomId, selfId));
          return res.status(200).json({ ok: true });
        }
        if (req.method !== "POST") throw fail(405, "POST is required.");
        const person = {
          id: selfId,
          accountId: account.accountId,
          name,
          cameraOn: body.cameraOn === true,
          micOn: body.micOn === true,
          isHost: isOwner,
          joinedAt: new Date().toISOString(),
        };
        // Atomic admission avoids exceeding mesh capacity on concurrent joins.
        const admitted = await redis.eval(
          `
          redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1] - 30000)
          if not redis.call('ZSCORE', KEYS[1], ARGV[2]) and redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[3]) then return 0 end
          redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2]); redis.call('EXPIRE', KEYS[1], 60)
          local person = cjson.decode(ARGV[4]); local previous = redis.call('GET', KEYS[2])
          if previous then person.joinedAt = cjson.decode(previous).joinedAt or person.joinedAt end
          redis.call('SET', KEYS[2], cjson.encode(person), 'EX', 35); return 1
        `,
          2,
          key("presence", roomId),
          key("peer", roomId, selfId),
          Date.now(),
          selfId,
          roomInfo.capacity,
          JSON.stringify(person),
        );
        if (!admitted) throw fail(409, "The room is full. Try again when a seat opens.");
        return res.status(200).json({ ok: true });
      }
      if (op === "messages") {
        if (!paidChat) throw fail(403, "Private chat requires a paid membership.");
        if (req.method === "GET")
          return res
            .status(200)
            .json({
              messages: (await redis.lrange(key("chat", roomId), 0, 99))
                .map(decode)
                .filter(Boolean)
                .reverse(),
            });
        if (req.method !== "POST") throw fail(405, "POST is required.");
        const content = clean(body.content, 500);
        if (!content) throw fail(400, "Write a message first.");
        const message = {
          id: crypto.randomUUID(),
          authorId: account.accountId,
          authorName: name,
          content,
          createdAt: new Date().toISOString(),
        };
        await redis.lpush(key("chat", roomId), JSON.stringify(message));
        await redis.ltrim(key("chat", roomId), 0, 99);
        await redis.expire(key("chat", roomId), 30 * 86400);
        return res.status(201).json({ message });
      }
      if (op === "signals") {
        if (req.method === "GET" && query.latest === "1")
          return res
            .status(200)
            .json({ cursor: Number(await redis.get(key("signal-sequence"))) || 0 });
        const ownPresence = decode(await redis.get(key("peer", roomId, selfId)));
        if (!ownPresence) throw fail(403, "Join this room before connecting devices.");
        if (req.method === "GET") {
          const after = Math.max(0, Number(query.after) || 0);
          const signals = (await redis.lrange(key("signals", roomId, selfId), 0, 119))
            .map(decode)
            .filter((item) => item && item.id > after)
            .reverse();
          return res.status(200).json({ signals });
        }
        if (req.method !== "POST") throw fail(405, "POST is required.");
        const toSession = clean(body.toSession, 32);
        if (
          !/^[a-f0-9]{32}$/.test(toSession) ||
          toSession === selfId ||
          !["offer", "answer", "ice"].includes(body.kind) ||
          typeof body.payload !== "string" ||
          body.payload.length > 35000 ||
          !decode(body.payload)
        )
          throw fail(400, "Invalid connection signal.");
        if (!(await redis.get(key("peer", roomId, toSession))))
          throw fail(409, "That participant has left the room.");
        const signal = {
          id: await redis.incr(key("signal-sequence")),
          fromSession: selfId,
          kind: body.kind,
          payload: body.payload,
        };
        await redis.lpush(key("signals", roomId, toSession), JSON.stringify(signal));
        await redis.ltrim(key("signals", roomId, toSession), 0, 119);
        await redis.expire(key("signals", roomId, toSession), 60);
        return res.status(201).json({ ok: true });
      }
      throw fail(400, "Unknown room action.");
    } catch (error) {
      if (!error.status) console.error("[roomfx]", error.name);
      return res
        .status(error.status || 503)
        .json({
          error: error.status ? error.message : "RoomFX is reconnecting. Please try again.",
        });
    }
  };
}
