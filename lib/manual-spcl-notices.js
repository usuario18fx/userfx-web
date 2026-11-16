import crypto from "node:crypto";
import { sendAccessNotice } from "./access-notices.js";

const TTL_SECONDS = 60 * 60 * 24 * 30;
const QUEUE_SUFFIX = ":manual-notice:due";
const STATE_SUFFIX = ":manual-notice:task:";
const USER_SUFFIX = ":manual-notice:waiting:";
const CODE_PATTERN = /^(?:SPCL|BSIC|PRX0|VIPX)-[A-HJ-NP-Z2-9]{4}$/;

export const scheduledNoticeKey = (namespace, code) => namespace + STATE_SUFFIX + code;
export const scheduledNoticeQueue = (namespace) => namespace + QUEUE_SUFFIX;
const waitingKey = (namespace, recipientId) => namespace + USER_SUFFIX + recipientId;

export async function getManualNotice(redis, namespace, code) {
  if (!CODE_PATTERN.test(String(code || ""))) return null;
  try {
    return JSON.parse(await redis.get(scheduledNoticeKey(namespace, code)) || "null");
  } catch {
    return null;
  }
}

export async function queueManualNotice(redis, namespace, { code, username, recipientId, mode, delayDays = 0 }) {
  if (!CODE_PATTERN.test(String(code)) || !/^[A-Za-z0-9_]{3,32}$/.test(username) || !/^\d{5,20}$/.test(String(recipientId)) || !["scheduled", "when_active"].includes(mode)) {
    throw new Error("invalid_notice");
  }
  if (mode === "scheduled" && (![1, 3, 7].includes(delayDays))) throw new Error("invalid_schedule");
  const old = await getManualNotice(redis, namespace, code);
  if (old?.status === "sending") return "busy";
  const runAt = mode === "scheduled" ? Date.now() + delayDays * 86400000 : null;
  const task = { code, username, recipientId: String(recipientId), mode, status: "queued", runAt, nonce: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const tx = redis.multi();
  tx.zrem(scheduledNoticeQueue(namespace), code);
  if (old?.recipientId) tx.del(waitingKey(namespace, old.recipientId));
  tx.set(scheduledNoticeKey(namespace, code), JSON.stringify(task), "EX", TTL_SECONDS);
  if (mode === "scheduled") tx.zadd(scheduledNoticeQueue(namespace), runAt, code);
  else tx.set(waitingKey(namespace, recipientId), code, "EX", TTL_SECONDS);
  await tx.exec();
  return task;
}

export async function cancelManualNotice(redis, namespace, code) {
  const key = scheduledNoticeKey(namespace, code);
  const task = await getManualNotice(redis, namespace, code);
  if (!task) return "none";
  if (task.status !== "queued") return task.status;
  const result = await redis.eval(
    "local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local task=cjson.decode(raw); if task.status~='queued' or task.nonce~=ARGV[1] then return 0 end; task.status='cancelled'; redis.call('SET',KEYS[1],cjson.encode(task),'EX',ARGV[2]); redis.call('ZREM',KEYS[2],task.code); if task.mode=='when_active' and redis.call('GET',KEYS[3])==task.code then redis.call('DEL',KEYS[3]) end; return 1",
    3, key, scheduledNoticeQueue(namespace), waitingKey(namespace, task.recipientId), task.nonce, String(TTL_SECONDS)
  );
  return result === 1 ? "cancelled" : "busy";
}

export async function processManualNotice(redis, namespace, code, telegram, siteUrl, { recipientId = null, now = Date.now() } = {}) {
  const key = scheduledNoticeKey(namespace, code);
  const task = await getManualNotice(redis, namespace, code);
  if (!task || task.status !== "queued") return "not_pending";
  if (task.mode === "scheduled" && (!Number.isFinite(task.runAt) || task.runAt > now)) return "not_due";
  if (task.mode === "when_active" && String(recipientId) !== task.recipientId) return "not_due";

  const claimed = await redis.eval(
    "local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local task=cjson.decode(raw); if task.status~='queued' or task.nonce~=ARGV[1] then return 0 end; task.status='sending'; redis.call('SET',KEYS[1],cjson.encode(task),'EX',ARGV[2]); return 1",
    1, key, task.nonce, String(TTL_SECONDS)
  );
  if (claimed !== 1) return "busy";
  let result = "failed";
  try {
    const record = JSON.parse(await redis.get(namespace + ":code:" + code) || "null");
    const optedOut = await redis.exists(namespace + ":bot-contacts:optout:" + task.recipientId);
    if (!record || record.source !== "admin_manual" || record.planId !== "special" || record.status !== "active" || String(record.telegramUsername || "").toLowerCase() !== task.username || optedOut) {
      result = "cancelled";
    } else {
      const chat = await telegram.getChat(task.recipientId);
      if (chat?.type !== "private" || String(chat.username || "").toLowerCase() !== task.username || String(chat.id) !== task.recipientId) {
        result = "unreachable";
      } else {
        result = await sendAccessNotice({
          redis, telegram, namespace, username: task.username,
          access: { enabled: true, telegramfx_access: true },
          siteUrl, noticeId: code + ":scheduled:" + task.nonce, identityKey: false,
          text: "USER FX · SPECIAL ACCESS\n\nYour personal code: " + record.code + "\nOpen USER FX and enter your code to continue.",
          resolveRecipient: async () => task.recipientId,
        });
      }
    }
  } catch {
    result = "uncertain";
  }
  const finished = { ...task, status: result === "sent" ? "sent" : result, processedAt: new Date().toISOString() };
  await redis.eval(
    "local raw=redis.call('GET',KEYS[1]); if not raw then return 0 end; local task=cjson.decode(raw); if task.nonce~=ARGV[1] or task.status~='sending' then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); redis.call('ZREM',KEYS[2],ARGV[4]); if redis.call('GET',KEYS[3])==ARGV[4] then redis.call('DEL',KEYS[3]) end; return 1",
    3, key, scheduledNoticeQueue(namespace), waitingKey(namespace, task.recipientId),
    task.nonce, JSON.stringify(finished), String(TTL_SECONDS), code
  );
  return result;
}

export async function processWaitingNotice(redis, namespace, recipientId, telegram, siteUrl) {
  const code = await redis.get(waitingKey(namespace, recipientId));
  if (!code) return null;
  return processManualNotice(redis, namespace, code, telegram, siteUrl, { recipientId });
}

export async function processDueManualNotices(redis, namespace, telegram, siteUrl, limit = 12) {
  const due = await redis.zrangebyscore(scheduledNoticeQueue(namespace), "-inf", Date.now(), "LIMIT", 0, limit);
  const summary = { checked: due.length, sent: 0, other: {} };
  for (const code of due) {
    const status = await processManualNotice(redis, namespace, code, telegram, siteUrl);
    if (status === "sent") summary.sent++;
    else summary.other[status] = (summary.other[status] || 0) + 1;
  }
  return summary;
}
