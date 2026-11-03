import crypto from 'node:crypto';
export const RATING_KEY = 'userfx:ratings:v1';
export function signVoter(id, secret, now = Date.now()) {
  if (!secret) throw new Error('BOT_TOKEN missing');
  const payload = Buffer.from(JSON.stringify({ id: String(id), exp: Math.floor(now / 1000) + 2592000 })).toString('base64url');
  return payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}
export function verifyVoter(token, secret, now = Date.now()) {
  if (!secret || typeof token !== 'string' || token.length > 1000) return null;
  try {
    const [payload, signature, extra] = token.split('.');
    if (extra || !signature) return null;
    const actual = Buffer.from(signature, 'base64url');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest();
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!/^\d{5,20}$/.test(value.id) || !Number.isInteger(value.exp) || value.exp <= now / 1000) return null;
    return crypto.createHmac('sha256', secret).update('rating:' + value.id).digest('hex');
  } catch { return null; }
}
// Atomic replacement: one field per contact, with a running total and count.
export const VOTE_SCRIPT = `
local old = redis.call('HGET', KEYS[1], ARGV[1])
local score = tonumber(ARGV[2])
if old then redis.call('HINCRBY', KEYS[2], 'total', score - tonumber(old))
else redis.call('HINCRBY', KEYS[2], 'total', score); redis.call('HINCRBY', KEYS[2], 'count', 1) end
redis.call('HSET', KEYS[1], ARGV[1], score)
return 1`;
