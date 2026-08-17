import { redis } from "./redis";

export async function abuseScore(userId: string) {
  const raw = await redis.get(`user:${userId}:code_attempts`);
  const attempts = raw ? JSON.parse(raw) : [];

  const last1h = attempts.filter(
    (a: any) => Date.now() - a.time < 60 * 60 * 1000
  );

  let score = 0;

  if (last1h.length > 5) score += 40;
  if (last1h.length > 10) score += 80;

  const unique = new Set(last1h.map((a: any) => a.code));
  if (unique.size > 5) score += 30;

  return score;
}

export async function aiFraudDecision(userId: string) {
  const score = await abuseScore(userId);

  if (score >= 80) return "block";
  if (score >= 40) return "warn";

  return "ok";
}