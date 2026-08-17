import { redis } from "./redis";
export async function getAdminData() {
  const userKeys = await redis.keys("user:*:plan");
  const codeKeys = await redis.keys("code:*");
  const users = await Promise.all(
    userKeys.map(async (key) => {
      const data = await redis.get(key);
      return { key, data: data ? JSON.parse(data) : null };
    }));
  const codes = await Promise.all(
    codeKeys.map(async (key) => {
      const data = await redis.get(key);
      return { key, data: data ? JSON.parse(data) : null };
    }));
  return { users, codes };
  }