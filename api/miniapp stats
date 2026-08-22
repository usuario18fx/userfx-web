import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59');

  const { count, error } = await supabase
    .from('track_events')
    .select('*', { count: 'exact', head: true })
    .eq('event', 'miniapp_open');

  if (error) {
    console.error('stats_error', error);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }

  res.status(200).json({ ok: true, visitors: count ?? 0 });
}