import type { NextApiRequest, NextApiResponse } from 'next';
import { searchSpots } from '@/lib/search';


// Simple per-process in-memory cache (60s)
const cache = new Map<string, { ts: number; payload: any }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = (req.query.q as string) || '';
    const limit = parseInt(String(req.query.limit || '20'));
    const offset = parseInt(String(req.query.offset || '0'));
    const useFullTextSearch = req.query.fts !== 'false'; // Enable by default
    
    const key = `spots:${q}:${limit}:${offset}:${useFullTextSearch}`;
    const now = Date.now();
    const hit = cache.get(key);
    
    if (hit && now - hit.ts < 60_000) {
      res.setHeader('x-cache', 'HIT');
      return res.status(200).json(hit.payload);
    }

    const result = await searchSpots({
      query: q,
      limit,
      offset,
      useFullTextSearch,
    });

    cache.set(key, { ts: now, payload: result });
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=120');
    res.setHeader('x-cache', 'MISS');
    res.setHeader('x-search-method', useFullTextSearch ? 'fulltext' : 'legacy');
    
    res.status(200).json(result);
  } catch (e) {
    console.error('Search API error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
}
