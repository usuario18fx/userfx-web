import type { NextApiRequest, NextApiResponse } from 'next';

type Data = { invoiceLink?: string; error?: string };

const PRICING: Record<string, { stars: number; days: number; title: string }> = {
  basic: { stars: 100, days: 7, title: 'BASIC' },
  pro: { stars: 250, days: 30, title: 'PRO' },
  vip: { stars: 500, days: 90, title: 'VIP' },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { planId } = req.body as { planId?: string; initData?: string };
  const plan = PRICING[planId || ''];

  if (!plan) {
    return res.status(400).json({ error: 'plan invalido' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'BOT_TOKEN missing' });
  }

  const payload = `stars_${planId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `USER FX — ${plan.title} VAULT`,
          description: `${plan.days} días de acceso privado. Código personal e intransferible.`,
          payload,
          currency: 'XTR',
          prices: [{ label: `${plan.title} ${plan.days}d`, amount: plan.stars }],
        }),
      }
    ).then((r) => r.json() as Promise<any>);

    if (!tgRes.ok) {
      return res.status(500).json({ error: tgRes.description || 'Telegram error' });
    }

    return res.status(200).json({ invoiceLink: tgRes.result as string });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}