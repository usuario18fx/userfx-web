import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // IP real detrás del proxy de Vercel
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim();

  const { initData } = req.body || {};

  // Verificación obligatoria del initData (evita eventos falseados)
  const isValid = verifyTelegramWebAppData(initData, process.env.BOT_TOKEN);
  if (!isValid) return res.status(401).json({ ok: false, error: 'invalid_signature' });

  let user = {};
  try {
    const params = new URLSearchParams(initData);
    user = JSON.parse(params.get('user') || '{}');
  } catch {
    user = {};
  }

  // Nunca se guarda el IP crudo — se hashea con salt para conteo único sin exponer PII
  const ipHash = crypto
    .createHash('sha256')
    .update(ip + process.env.IP_SALT)
    .digest('hex');

  const { error } = await supabase.from('track_events').insert({
    event_type: 'miniapp_open',
    telegram_id: user.id || null,
    ip_hash: ipHash,
    user_agent: req.headers['user-agent'],
    created_at: new Date().toISOString(),
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

  // Comparación en tiempo constante para evitar timing attacks
  const a = Buffer.from(computedHash);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}