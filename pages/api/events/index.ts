import type { NextApiRequest, NextApiResponse } from 'next';
import { searchEvents } from '@/lib/search';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = (req.query.q as string) || '';
    const limit = parseInt(String(req.query.limit || '50'));
    const offset = parseInt(String(req.query.offset || '0'));
    const useFullTextSearch = req.query.fts !== 'false';
    
    // For backward compatibility, handle from/to parameters
    // Note: Full search implementation now focuses on upcoming events
    // Legacy date filtering can be added back if needed
    
    const result = await searchEvents({
      query: q,
      limit,
      offset,
      useFullTextSearch,
    });

    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    res.setHeader('x-search-method', useFullTextSearch ? 'fulltext' : 'legacy');
    
    res.status(200).json(result);
  } catch (e) {
    console.error('Event search API error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
}

