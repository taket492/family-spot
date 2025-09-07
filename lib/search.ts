import { prisma } from '@/lib/db';
import { safeParseArray } from '@/lib/utils';

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  useFullTextSearch?: boolean;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  nextOffset: number | null;
}

export async function searchSpots(options: SearchOptions): Promise<SearchResult<any>> {
  const { query, limit = 20, offset = 0, useFullTextSearch = true } = options;
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const boundedOffset = Math.max(offset, 0);

  if (!query.trim()) {
    // Return all spots when no query
    const [raw, total] = await Promise.all([
      prisma.spot.findMany({
        orderBy: { updatedAt: 'desc' },
        take: boundedLimit,
        skip: boundedOffset,
      }),
      prisma.spot.count(),
    ]);

    const items = raw.map(transformSpot);
    const nextOffset = boundedOffset + items.length < total ? boundedOffset + items.length : null;
    return { items, total, nextOffset };
  }

  if (useFullTextSearch) {
    return searchSpotsWithFullText(query, boundedLimit, boundedOffset);
  } else {
    return searchSpotsLegacy(query, boundedLimit, boundedOffset);
  }
}

async function searchSpotsWithFullText(query: string, limit: number, offset: number): Promise<SearchResult<any>> {
  // Sanitize query for tsquery - escape special characters
  const sanitizedQuery = query
    .trim()
    .split(/\s+/)
    .map(term => term.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ''))
    .filter(Boolean)
    .join(' & ');

  if (!sanitizedQuery) {
    return { items: [], total: 0, nextOffset: null };
  }

  try {
    // Use raw SQL for full-text search with ranking
    const searchQuery = `
      SELECT 
        id, type, name, city, address, lat, lng, phone, tags, "openHours", 
        "priceBand", images, rating, "createdAt", "updatedAt",
        ts_rank(search_vector, to_tsquery('simple', $1)) as rank
      FROM "Spot" 
      WHERE search_vector @@ to_tsquery('simple', $1)
      ORDER BY rank DESC, "updatedAt" DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM "Spot" 
      WHERE search_vector @@ to_tsquery('simple', $1)
    `;

    const [rawResults, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(searchQuery, sanitizedQuery, limit, offset),
      prisma.$queryRawUnsafe(countQuery, sanitizedQuery),
    ]);

    const items = (rawResults as any[]).map(transformSpot);
    const total = Number((countResult as any[])[0]?.count || 0);
    const nextOffset = offset + items.length < total ? offset + items.length : null;

    return { items, total, nextOffset };
  } catch (error) {
    console.error('Full-text search error:', error);
    // Fallback to legacy search on error
    return searchSpotsLegacy(query, limit, offset);
  }
}

async function searchSpotsLegacy(query: string, limit: number, offset: number): Promise<SearchResult<any>> {
  const tokens = query.split(/\s+/).filter(Boolean);
  const tagConds = tokens.map(t => ({ tags: { contains: t } }));
  
  const where = {
    OR: [
      { name: { contains: query, mode: 'insensitive' as const } },
      { city: { contains: query, mode: 'insensitive' as const } },
      { address: { contains: query, mode: 'insensitive' as const } },
      ...tagConds,
    ],
  };

  const [raw, total] = await Promise.all([
    prisma.spot.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.spot.count({ where }),
  ]);

  const items = raw.map(transformSpot);
  const nextOffset = offset + items.length < total ? offset + items.length : null;
  return { items, total, nextOffset };
}

export async function searchEvents(options: SearchOptions): Promise<SearchResult<any>> {
  const { query, limit = 20, offset = 0, useFullTextSearch = true } = options;
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  const boundedOffset = Math.max(offset, 0);

  if (!query.trim()) {
    // Return upcoming events when no query
    const now = new Date();
    const [raw, total] = await Promise.all([
      prisma.event.findMany({
        where: { 
          status: 'public',
          startAt: { gte: now }
        },
        orderBy: { startAt: 'asc' },
        take: boundedLimit,
        skip: boundedOffset,
      }),
      prisma.event.count({ 
        where: { 
          status: 'public',
          startAt: { gte: now }
        }
      }),
    ]);

    const items = raw.map(transformEvent);
    const nextOffset = boundedOffset + items.length < total ? boundedOffset + items.length : null;
    return { items, total, nextOffset };
  }

  if (useFullTextSearch) {
    return searchEventsWithFullText(query, boundedLimit, boundedOffset);
  } else {
    return searchEventsLegacy(query, boundedLimit, boundedOffset);
  }
}

async function searchEventsWithFullText(query: string, limit: number, offset: number): Promise<SearchResult<any>> {
  const sanitizedQuery = query
    .trim()
    .split(/\s+/)
    .map(term => term.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ''))
    .filter(Boolean)
    .join(' & ');

  if (!sanitizedQuery) {
    return { items: [], total: 0, nextOffset: null };
  }

  try {
    const now = new Date();
    const searchQuery = `
      SELECT 
        id, title, description, city, venue, address, lat, lng, 
        "startAt", "endAt", "priceBand", tags, images, source, url, status,
        "createdAt", "updatedAt",
        ts_rank(search_vector, to_tsquery('simple', $1)) as rank
      FROM "Event" 
      WHERE search_vector @@ to_tsquery('simple', $1)
        AND status = 'public'
        AND "startAt" >= $2
      ORDER BY rank DESC, "startAt" ASC
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM "Event" 
      WHERE search_vector @@ to_tsquery('simple', $1)
        AND status = 'public'
        AND "startAt" >= $2
    `;

    const [rawResults, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(searchQuery, sanitizedQuery, now, limit, offset),
      prisma.$queryRawUnsafe(countQuery, sanitizedQuery, now),
    ]);

    const items = (rawResults as any[]).map(transformEvent);
    const total = Number((countResult as any[])[0]?.count || 0);
    const nextOffset = offset + items.length < total ? offset + items.length : null;

    return { items, total, nextOffset };
  } catch (error) {
    console.error('Event full-text search error:', error);
    return searchEventsLegacy(query, limit, offset);
  }
}

async function searchEventsLegacy(query: string, limit: number, offset: number): Promise<SearchResult<any>> {
  const now = new Date();
  const tokens = query.split(/\s+/).filter(Boolean);
  const tagConds = tokens.map(t => ({ tags: { contains: t } }));
  
  const where = {
    status: 'public' as const,
    startAt: { gte: now },
    OR: [
      { title: { contains: query, mode: 'insensitive' as const } },
      { city: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
      ...tagConds,
    ],
  };

  const [raw, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.event.count({ where }),
  ]);

  const items = raw.map(transformEvent);
  const nextOffset = offset + items.length < total ? offset + items.length : null;
  return { items, total, nextOffset };
}

function transformSpot(spot: any) {
  return {
    ...spot,
    tags: safeParseArray(spot.tags),
    images: safeParseArray(spot.images),
  };
}

function transformEvent(event: any) {
  return {
    ...event,
    tags: safeParseArray(event.tags),
    images: safeParseArray(event.images),
  };
}

// Helper function to highlight search terms in results (for future UI enhancement)
export function highlightSearchTerms(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const terms = query.split(/\s+/).filter(Boolean);
  let result = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  });
  
  return result;
}