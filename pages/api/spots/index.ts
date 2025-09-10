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
    const isRestaurantPage = req.query.restaurant === 'true'; // Restaurant search page flag
    
    // Enhanced caching for restaurant searches
    const cacheTime = isRestaurantPage ? 120_000 : 60_000; // 2min for restaurants, 1min for general
    const key = `spots:${q}:${limit}:${offset}:${useFullTextSearch}:${isRestaurantPage}`;
    const now = Date.now();
    const hit = cache.get(key);
    
    if (hit && now - hit.ts < cacheTime) {
      res.setHeader('x-cache', 'HIT');
      res.setHeader('x-restaurant-optimized', isRestaurantPage ? 'true' : 'false');
      return res.status(200).json(hit.payload);
    }

    const result = await searchSpots({
      query: q,
      limit,
      offset,
      useFullTextSearch,
    });

    cache.set(key, { ts: now, payload: result });
    const maxAge = isRestaurantPage ? 120 : 60;
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`);
    res.setHeader('x-cache', 'MISS');
    res.setHeader('x-search-method', useFullTextSearch ? 'fulltext' : 'legacy');
    res.setHeader('x-restaurant-optimized', isRestaurantPage ? 'true' : 'false');
    
    res.status(200).json(result);
  } catch (e) {
    console.error('Search API error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
}
