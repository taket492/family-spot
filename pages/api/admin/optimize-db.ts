import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function regclassExists(name: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT to_regclass($1) AS oid`, name);
  return rows?.[0]?.oid !== null;
}

async function detectSearchVectorColumn(table: 'Spot' | 'Event') {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name IN ('search_vector', 'searchVector')`,
    table
  );
  return rows?.[0]?.column_name || 'search_vector';
}

async function optimize() {
  const created: string[] = [];
  const existed: string[] = [];

  // Ensure extension
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // Full-text search vector indexes (GIN)
  const spotVecCol = await detectSearchVectorColumn('Spot');
  const eventVecCol = await detectSearchVectorColumn('Event');
  const gin = [
    { name: 'spot_search_vec_idx', sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_search_vec_idx ON "Spot" USING GIN ("${spotVecCol}")` },
    { name: 'event_search_vec_idx', sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS event_search_vec_idx ON "Event" USING GIN ("${eventVecCol}")` },
  ];
  for (const idx of gin) {
    if (await regclassExists(idx.name)) existed.push(idx.name);
    else { await prisma.$executeRawUnsafe(idx.sql); created.push(idx.name); }
  }

  // Trigram indexes to speed up ILIKE/contains
  const trgm = [
    { name: 'spot_name_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_name_trgm_idx ON "Spot" USING GIN ("name" gin_trgm_ops)' },
    { name: 'spot_city_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_city_trgm_idx ON "Spot" USING GIN ("city" gin_trgm_ops)' },
    { name: 'spot_address_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_address_trgm_idx ON "Spot" USING GIN ("address" gin_trgm_ops)' },
    { name: 'event_title_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS event_title_trgm_idx ON "Event" USING GIN ("title" gin_trgm_ops)' },
    { name: 'event_city_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS event_city_trgm_idx ON "Event" USING GIN ("city" gin_trgm_ops)' },
  ];
  for (const idx of trgm) {
    if (await regclassExists(idx.name)) existed.push(idx.name);
    else { await prisma.$executeRawUnsafe(idx.sql); created.push(idx.name); }
  }

  return { created, existed };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const token = req.headers['x-admin-token'];
  const expected = process.env.ADMIN_OPS_TOKEN;
  if (!expected || token !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const startedAt = new Date().toISOString();
    const result = await optimize();
    const finishedAt = new Date().toISOString();
    res.status(200).json({ ok: true, startedAt, finishedAt, ...result });
  } catch (e: any) {
    console.error('optimize-db api error:', e);
    res.status(500).json({ error: 'optimize_failed', message: e?.message || String(e) });
  } finally {
    await prisma.$disconnect();
  }
}
