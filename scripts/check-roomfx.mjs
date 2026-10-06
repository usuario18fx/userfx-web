import assert from "node:assert/strict";
import crypto from "node:crypto";
import Redis from "ioredis";
import { createRoomLiveHandler } from "../lib/room-live.js";

const redisUrl = process.env.ROOMFX_TEST_REDIS_URL;
if (!redisUrl) throw new Error("Set ROOMFX_TEST_REDIS_URL to a disposable Redis instance.");
const ns = `userfx:roomfx-check:${crypto.randomUUID()}`;
const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
redis.on("error", () => {});
const users = new Map();
for (const label of ["host", "guest", "stranger", "spcl", "seat4", "seat5", "seat6", "seat7"]) {
  const accountId = `usr_${crypto.randomBytes(12).toString("base64url")}`;
  users.set(label, {
    accountId,
    profile: { displayName: label },
    client: crypto.randomUUID(),
    planId: "vip",
    accessMode: label === "spcl" ? "telegram_identity" : "code",
  });
}
const handler = createRoomLiveHandler({
  namespace: ns,
  getRedis: () => redis,
  readSession: async (req) => users.get(req.user) || null,
  getAccount: async (_redis, _ns, id) => [...users.values()].find((user) => user.accountId === id),
});
async function call(user, room, op, method = "GET", body = undefined, query = {}, headers = {}) {
  let status = 200,
    data;
  await handler(
    {
      user,
      method,
      query: { client: users.get(user)?.client || crypto.randomUUID(), room, op, ...query },
      body,
      headers: {
        host: "localhost",
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...headers,
      },
    },
    {
      setHeader() {},
      status(value) {
        status = value;
        return this;
      },
      json(value) {
        data = value;
      },
    },
  );
  return { status, data };
}
const passed = (text) => console.log(`PASS ${text}`);
try {
  await redis.ping();
  assert.equal((await call(undefined, "", "bootstrap")).status, 401);
  const host = (await call("host", "", "bootstrap")).data;
  const guest = (await call("guest", "", "bootstrap")).data;
  const room = host.myRoom.id;
  assert.equal((await call("host", "", "bootstrap")).data.myRoom.id, room);
  passed("vault session required; personal room identity is stable");

  for (const op of ["messages", "posts", "signals", "presence"]) {
    assert.equal(
      (
        await call(
          "guest",
          room,
          op,
          ["messages", "posts"].includes(op) ? "GET" : "POST",
          ["messages", "posts"].includes(op) ? undefined : {},
        )
      ).status,
      403,
    );
  }
  assert.equal((await call("guest", room, "state")).data.participants.length, 0);
  passed("unapproved visitors cannot read chat, connect devices or join");

  await call("guest", room, "request", "POST", {});
  await call("guest", room, "request", "POST", {});
  assert.equal((await call("host", "", "inbox")).data.items.length, 1);
  assert.equal((await call("host", room, "state")).data.waiting.length, 1);
  assert.equal(
    (
      await call("stranger", room, "approve", "POST", {
        accountId: guest.profile.accountId,
        approved: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("host", room, "approve", "POST", {
        accountId: guest.profile.accountId,
        approved: true,
      })
    ).status,
    200,
  );
  assert.equal((await call("guest", room, "state")).data.room.approved, true);
  assert.equal((await call("guest", "", "inbox")).data.items[0].status, "approved");
  passed("waiting room approval is host-only; duplicate requests do not duplicate inbox entries");

  await call("stranger", room, "request", "POST", {});
  await call("host", room, "approve", "POST", {
    accountId: users.get("stranger").accountId,
    approved: false,
  });
  assert.equal((await call("stranger", room, "request", "POST", {})).status, 403);
  assert.equal((await call("stranger", room, "messages")).status, 403);
  passed("declined guests remain blocked");

  const sent = await call("guest", room, "messages", "POST", {
    content: "Hello <script>literal text</script>",
  });
  assert.equal(sent.status, 201);
  assert.equal(
    (await call("host", room, "messages")).data.messages[0].content,
    sent.data.message.content,
  );
  assert.equal((await call("host", "stage", "messages")).data.messages.length, 0);
  assert.equal((await call("host", room, "messages", "POST", { content: " " })).status, 400);
  assert.equal(
    (
      await call(
        "host",
        room,
        "messages",
        "POST",
        { content: "CSRF" },
        {},
        { origin: "https://unrelated.invalid" },
      )
    ).status,
    403,
  );
  assert.equal((await call("spcl", "stage", "messages")).status, 403);
  passed("chat is room-scoped, validates content/origin, and enforces the SPCL membership rule");

  const post = await call("host", room, "posts", "POST", { content: "A moment for my private circle." });
  assert.equal(post.status, 201);
  assert.equal((await call("guest", room, "posts")).data.posts[0].id, post.data.post.id);
  assert.equal((await call("guest", guest.myRoom.id, "posts")).data.posts.length, 0);
  assert.equal((await call("stranger", room, "posts")).status, 403);
  assert.equal((await call("guest", room, "posts", "POST", { content: "Not the host" })).status, 403);
  assert.equal((await call("guest", room, "remove-post", "POST", { id: post.data.post.id })).status, 403);
  assert.equal((await call("host", "stage", "posts")).status, 400);
  assert.equal((await call("host", room, "posts", "POST", { content: " " })).status, 400);
  assert.equal((await call("host", room, "posts", "POST", { content: "x".repeat(2001) })).status, 400);
  assert.equal((await call("host", room, "posts", "POST", { content: "CSRF" }, {}, { origin: "https://unrelated.invalid" })).status, 403);
  assert.ok((await redis.ttl(`${ns}:roomfx:posts:${room}`)) > 89 * 86400);
  const id = post.data.post.id;
  assert.equal((await call("stranger", room, "post-like", "POST", { id, liked: true })).status, 403);
  assert.equal((await call("host", guest.myRoom.id, "post-like", "POST", { id, liked: true })).status, 403);
  assert.equal((await call("guest", room, "post-like", "POST", { id, liked: true })).data.likeCount, 1);
  assert.equal((await call("guest", room, "post-like", "POST", { id, liked: true }, { client: crypto.randomUUID() })).data.likeCount, 1);
  assert.equal((await call("host", room, "post-like", "POST", { id, liked: true })).data.likeCount, 2);
  assert.equal((await call("guest", room, "post-like", "POST", { id, liked: false })).data.likeCount, 1);
  assert.equal((await call("guest", room, "post-like", "POST", { id })).status, 400);
  assert.equal((await call("guest", room, "post-comment", "POST", { id, content: "Lovely moment" })).status, 201);
  assert.equal((await call("guest", room, "post-comment", "POST", { id, content: "x".repeat(401) })).status, 400);
  assert.equal((await call("stranger", room, "post-comment", "POST", { id, content: "blocked" })).status, 403);
  await call("spcl", room, "request", "POST", {});
  await call("host", room, "approve", "POST", { accountId: users.get("spcl").accountId, approved: true });
  assert.equal((await call("spcl", room, "post-comment", "POST", { id, content: "blocked" })).status, 403);
  assert.equal((await call("spcl", room, "posts")).data.posts[0].comments.length, 0);
  assert.equal((await call("host", room, "posts")).data.posts[0].comments[0].content, "Lovely moment");
  assert.equal((await call("host", room, "posts", "POST", { content: "image", imageUrl: "javascript:alert(1)" })).status, 400);
  assert.equal((await call("host", room, "posts", "POST", { content: "image", imageUrl: "https://127.0.0.1/test.png" })).status, 400);
  const image = await call("host", room, "posts", "POST", { content: "image", imageUrl: "https://images.example.com/photo.png" });
  assert.equal(image.status, 201);
  assert.equal(image.data.post.imageUrl, "https://images.example.com/photo.png");
  await call("host", room, "remove-post", "POST", { id: image.data.post.id });
  assert.equal((await call("host", room, "remove-post", "POST", { id: post.data.post.id })).status, 200);
  assert.equal((await call("guest", room, "posts")).data.posts.length, 0);
  assert.equal(await redis.exists(`${ns}:roomfx:likes:${room}:${id}`), 0);
  assert.equal(await redis.exists(`${ns}:roomfx:comments:${room}:${id}`), 0);
  assert.equal((await call("guest", room, "post-like", "POST", { id, liked: true })).status, 404);
  passed("account-level likes are idempotent; comments enforce membership; deletion cleans interactions; image URLs are validated");
  passed("MyRoom posts persist with retention, remain private, and only the host can publish/delete");

  await call("host", room, "presence", "POST", { cameraOn: true, micOn: false });
  await call("guest", room, "presence", "POST", { cameraOn: false, micOn: true });
  assert.equal(
    (
      await call("host", room, "signals", "POST", {
        toSession: guest.profile.id,
        kind: "offer",
        payload: JSON.stringify({ type: "offer", sdp: "test" }),
      })
    ).status,
    201,
  );
  const signals = (await call("guest", room, "signals")).data.signals;
  assert.equal(signals.length, 1);
  assert.equal(signals[0].fromSession, host.profile.id);
  assert.equal((await call("host", room, "signals")).data.signals.length, 0);
  assert.equal(
    (await call("guest", room, "signals", "GET", undefined, { after: String(signals[0].id) })).data
      .signals.length,
    0,
  );
  assert.ok((await redis.ttl(`${ns}:roomfx:signals:${room}:${guest.profile.id}`)) <= 60);
  await call("guest", room, "presence", "DELETE");
  assert.equal(
    (
      await call("host", room, "signals", "POST", {
        toSession: guest.profile.id,
        kind: "ice",
        payload: "{}",
      })
    ).status,
    409,
  );
  passed("signaling is recipient-scoped, cursor-based, temporary and requires active peers");

  const joinedAt = (await call("host", room, "state")).data.participants[0].joinedAt;
  await call("host", room, "presence", "POST", { cameraOn: true });
  assert.equal((await call("host", room, "state")).data.participants[0].joinedAt, joinedAt);
  assert.equal((await call("guest", "", "profiles")).data.profiles.some((person) => person.roomId === room), false);
  users.get("host").profile = { displayName: "host", visibility: "members", location: "Madrid", interests: "Music, Cinema", onlineVisibility: "members" };
  await call("host", "", "profiles");
  const listed = (await call("guest", "", "profiles")).data.profiles.find((person) => person.roomId === room);
  assert.equal(listed.location, "Madrid");
  assert.equal(listed.isLive, true);
  assert.equal(listed.cameraOn, true);
  assert.equal(listed.viewers, 0);
  assert.equal(listed.accountId, undefined);
  users.get("host").profile.onlineVisibility = "hidden";
  assert.equal((await call("guest", "", "profiles")).data.profiles.find((person) => person.roomId === room).isLive, false);
  users.get("host").profile.visibility = "private";
  // Even a stale directory entry cannot reveal a profile after opting out.
  assert.equal((await call("guest", "", "profiles")).data.profiles.some((person) => person.roomId === room), false);
  assert.equal((await call("host", "", "profiles")).data.profiles.find((person) => person.isMine).isLive, true);
  assert.equal((await call(undefined, "", "profiles")).status, 401);
  passed("directory opt-in and hidden online status are respected; authenticated self-view remains available; session duration survives heartbeat");

  const seats = await Promise.all(
    [...users.keys()].slice(0, 7).map((user) => call(user, "stage", "presence", "POST", {})),
  );
  assert.equal(seats.filter((seat) => seat.status === 200).length, 6);
  assert.equal(seats.filter((seat) => seat.status === 409).length, 1);
  const joinedUser = [...users.keys()]
    .slice(0, 7)
    .find((_user, index) => seats[index].status === 200);
  const blockedUser = [...users.keys()]
    .slice(0, 7)
    .find((_user, index) => seats[index].status === 409);
  await call(joinedUser, "stage", "presence", "DELETE");
  assert.equal((await call(blockedUser, "stage", "presence", "POST", {})).status, 200);
  passed("atomic six-seat Stage capacity; leaving frees a seat");

  await redis.zadd(`${ns}:roomfx:presence:stage`, Date.now() - 31000, "expired-peer");
  const state = (await call("host", "stage", "state")).data;
  assert.ok(!state.participants.some((person) => person.id === "expired-peer"));
  passed("stale presence is removed");
} finally {
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", `${ns}:*`, "COUNT", 100);
    cursor = next;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== "0");
  await redis.quit();
}
