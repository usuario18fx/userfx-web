import { redis } from "./redis";

export async function getAdminMetrics() {
  const userKeys = await redis.keys("user:*:plan");
  const codeKeys = await redis.keys("code:*");

  let active = 0;
  let expired = 0;

  const users = await Promise.all(
    userKeys.map(async (key) => {
      const raw = await redis.get(key);
      if (!raw) return null;

      const data = JSON.parse(raw);

      const isExpired = Date.now() > data.expiresAt;

      if (isExpired) expired++;
      else active++;

      return {
        userId: key.split(":")[1],
        ...data,
        isExpired,
      };
    })
  );

  const codes = await Promise.all(
    codeKeys.map(async (key) => {
      const raw = await redis.get(key);
      return {
        code: key.replace("code:", ""),
        data: raw ? JSON.parse(raw) : null,
      };
    })
  );

  const fraudKeys = await redis.keys("user:*:flagged");

  return {
    totalUsers: userKeys.length,
    active,
    expired,
    totalCodes: codeKeys.length,
    flagged: fraudKeys.length,
    users: users.filter(Boolean),
    codes,
  };
}