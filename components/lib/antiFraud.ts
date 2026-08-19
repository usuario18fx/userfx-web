import { redis } from "./redis";

export async function registerSession(userId: string, ip: string) {
  const key = `user:${userId}:sessions`;

  const raw = await redis.get(key);
  const sessions = raw ? JSON.parse(raw) : [];

  sessions.push({
    ip,
    time: Date.now(),
  });

  await redis.set(key, JSON.stringify(sessions));
}

export async function detectFraud(userId: string) {
  const raw = await redis.get(`user:${userId}:sessions`);
  if (!raw) return false;

  const sessions = JSON.parse(raw);
  const ips = new Set(sessions.map((s: any) => s.ip));

  if (ips.size >= 3) {
    await redis.set(`user:${userId}:flagged`, "true");
    return true;
  }

  return false;
}