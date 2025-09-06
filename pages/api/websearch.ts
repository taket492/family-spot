import type { NextApiRequest, NextApiResponse } from 'next';
import { webSearch } from '@/lib/webSearch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = ((req.query.q as string) || '').trim();
    if (!q) {
      res.status(400).json({ error: 'missing_query' });
      return;
    }
    const count = Math.min(Number(req.query.count) || 5, 10);
    const items = await webSearch(q, { count });
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}

