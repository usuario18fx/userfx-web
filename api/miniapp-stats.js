import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59');

  // Total de aperturas del Mini App
  const totalPromise = supabase
    .from('track_events')
    .select('*', { count: 'exact', head: true })
    .eq('event', 'miniapp_open');

  // Visitantes únicos por Telegram ID (usa la vista/función RPC de abajo)
  const uniquePromise = supabase.rpc('count_unique_visitors');

  const [{ count: total, error: totalError }, { data: uniqueData, error: uniqueError }] =
    await Promise.all([totalPromise, uniquePromise]);

  if (totalError || uniqueError) {
    console.error('stats_error', totalError || uniqueError);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }

  res.status(200).json({
    ok: true,
    visitors: total ?? 0,
    unique_visitors: uniqueData ?? 0,
  });
}