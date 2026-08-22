import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim();

  const { initData } = req.body || {};

  const isValid = verifyTelegramWebAppData(initData, process.env.BOT_TOKEN);
  if (!isValid) return res.status(401).json({ ok: false, error: 'invalid_signature' });

  let telegramUser = {};
  try {
    const params = new URLSearchParams(initData);
    telegramUser = JSON.parse(params.get('user') || '{}');
  } catch {
    telegramUser = {};
  }

  // Vercel inyecta estos headers automáticamente en cada request — sin costo, sin API externa
  const geo = {
    country: req.headers['x-vercel-ip-country'] || null,
    region: req.headers['x-vercel-ip-country-region'] || null,
    city: req.headers['x-vercel-ip-city']
      ? decodeURIComponent(req.headers['x-vercel-ip-city'])
      : null,
    timezone: req.headers['x-vercel-ip-timezone'] || null,
  };

  const { error } = await supabase.from('track_events').insert({
    event: 'miniapp_open',
    telegram: telegramUser, // jsonb: {id, username, first_name, ...}
    meta: {},
    geo,
    ip,
    ua: req.headers['user-agent'] || null,
    href: req.headers['referer'] || null,
    path: '/miniapp',
    host: req.headers['host'] || null,
    referer: req.headers['referer'] || null,
  });

  if (error) {
    console.error('track_insert_error', error);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }

  res.status(200).json({ ok: true });
}

function verifyTelegramWebAppData(initData, botToken) {
  if (!initData || !botToken) return false;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const a = Buffer.from(computedHash);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}