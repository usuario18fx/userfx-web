import crypto from 'crypto';

const TRACK_SECRET = process.env.TRACK_SECRET;

// Rate limit en memoria — se resetea en cada cold start de Vercel.
// Para persistencia real entre invocaciones, migrar a Upstash Redis
// o a una tabla Supabase (ip_hash, attempts, reset_at).
const attemptsCache = new Map();
const WINDOW_MS = 15 * 60_000; // 15 minutos
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = attemptsCache.get(ip);

  if (!entry || now > entry.resetAt) {
    attemptsCache.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;

  entry.count++;
  return true;
}

function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export default async function handler(req, res) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'too_many_attempts' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const safePrefix = String(body.prefix || '').trim().toUpperCase();
    const safeSuffix = String(body.suffix || '').trim().toUpperCase();

    if (!safePrefix || !safeSuffix) {
      return res.status(400).json({ ok: false, error: 'Missing code.' });
    }
    if (safeSuffix.length !== 4) {
      return res
        .status(400)
        .json({ ok: false, error: 'The suffix must be 4 characters.' });
    }
    if (!TRACK_SECRET) {
      return res
        .status(500)
        .json({ ok: false, error: 'Missing TRACK_SECRET on server.' });
    }

    const fullCode = `${safePrefix}${safeSuffix}`;
    const isValid = timingSafeCompare(fullCode, TRACK_SECRET.toUpperCase());

    if (isValid) {
      return res.status(200).json({ ok: true, code: fullCode });
    }

    return res.status(401).json({ ok: false, error: 'Invalid code.' });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'server_error',
      details: String(error?.message || error),
    });
  }
}