import Redis from 'ioredis';
import { RATING_KEY, VOTE_SCRIPT, verifyVoter } from '../../lib/fx-rating.js';
let client;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  try {
    if (!process.env.REDIS_URL) throw new Error('Storage unavailable');
    client ||= new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
    const token = req.method === 'POST' ? req.body?.token : req.headers['x-fx-rating-token'];
    const voter = verifyVoter(token, process.env.BOT_TOKEN);
    if (req.method === 'POST') {
      if (!voter) return res.status(401).json({ error: 'Open your personal rating link from the bot.' });
      const value = req.body?.value;
      if (!Number.isInteger(value) || value < 1 || value > 5) return res.status(400).json({ error: 'Choose 1–5 crowns.' });
      await client.eval(VOTE_SCRIPT, 2, RATING_KEY, RATING_KEY + ':stats', voter, value);
    }
    const [stats, mine] = await Promise.all([client.hgetall(RATING_KEY + ':stats'), voter ? client.hget(RATING_KEY, voter) : null]);
    const count = Number(stats.count || 0);
    return res.status(200).json({ count, average: count ? Number(stats.total) / count : 0, mine: mine ? Number(mine) : null, canVote: Boolean(voter) });
  } catch { return res.status(503).json({ error: 'Ratings are temporarily unavailable. Please try again.' }); }
}
