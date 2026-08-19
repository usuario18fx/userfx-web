import { redis } from "./redis";

const ORDER = ["basic", "pro", "vip"];

export async function upgradePlan(userId: string, newPlan: string) {
  const raw = await redis.get(`user:${userId}:plan`);
  if (!raw) return { ok: false };

  const data = JSON.parse(raw);

  const remaining = data.expiresAt - Date.now();

  const currentIndex = ORDER.indexOf(data.plan);
  const newIndex = ORDER.indexOf(newPlan);

  if (newIndex <= currentIndex) {
    return { ok: false, reason: "not_upgrade" };
  }

  const updated = {
    plan: newPlan,
    expiresAt: Date.now() + remaining,
  };

  await redis.set(`user:${userId}:plan`, JSON.stringify(updated));

  return { ok: true, updated };
}