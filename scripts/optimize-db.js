// Optimize Postgres for faster search: create extensions and indexes if missing
// Usage: node scripts/optimize-db.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function hasRegClass(name) {
  const rows = await prisma.$queryRawUnsafe(`SELECT to_regclass($1)::text AS oid`, name);
  return rows && rows[0] && rows[0].oid !== null && rows[0].oid !== 'null';
}

async function detectSearchVectorColumn(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name IN ('search_vector', 'searchVector')`,
    table
  );
  return rows?.[0]?.column_name || 'search_vector';
}

async function run() {
  try {
    console.log('[optimize-db] Ensuring pg_trgm extension');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    const spotVecCol = await detectSearchVectorColumn('Spot');
    const eventVecCol = await detectSearchVectorColumn('Event');

    // GIN index on tsvector columns used by full-text search
    const ginIdx = [
      { name: 'spot_search_vec_idx', sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_search_vec_idx ON "Spot" USING GIN ("${spotVecCol}")` },
      { name: 'event_search_vec_idx', sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS event_search_vec_idx ON "Event" USING GIN ("${eventVecCol}")` },
    ];

    for (const idx of ginIdx) {
      const exists = await hasRegClass(idx.name);
      if (!exists) {
        console.log(`[optimize-db] Creating ${idx.name}...`);
        await prisma.$executeRawUnsafe(idx.sql);
      } else {
        console.log(`[optimize-db] ${idx.name} exists`);
      }
    }

    // Restaurant search optimization indexes
    const restaurantIdx = [
      { name: 'spot_type_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_type_idx ON "Spot" USING btree ("type")' },
      { name: 'spot_type_updated_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_type_updated_idx ON "Spot" ("type", "updatedAt" DESC)' },
      { name: 'spot_restaurant_search_idx', sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_restaurant_search_idx ON "Spot" USING gin ("${spotVecCol}") WHERE "type" = 'restaurant'` },
    ];

    for (const idx of restaurantIdx) {
      const exists = await hasRegClass(idx.name);
      if (!exists) {
        console.log(`[optimize-db] Creating ${idx.name}...`);
        await prisma.$executeRawUnsafe(idx.sql);
      } else {
        console.log(`[optimize-db] ${idx.name} exists`);
      }
    }

    // Trigram indexes to speed up ILIKE/contains filters
    const trgmIdx = [
      { name: 'spot_name_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_name_trgm_idx ON "Spot" USING GIN ("name" gin_trgm_ops)' },
      { name: 'spot_city_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_city_trgm_idx ON "Spot" USING GIN ("city" gin_trgm_ops)' },
      { name: 'spot_address_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS spot_address_trgm_idx ON "Spot" USING GIN ("address" gin_trgm_ops)' },
      { name: 'event_title_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS event_title_trgm_idx ON "Event" USING GIN ("title" gin_trgm_ops)' },
      { name: 'event_city_trgm_idx', sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS event_city_trgm_idx ON "Event" USING GIN ("city" gin_trgm_ops)' },
    ];

    for (const idx of trgmIdx) {
      const exists = await hasRegClass(idx.name);
      if (!exists) {
        console.log(`[optimize-db] Creating ${idx.name}...`);
        await prisma.$executeRawUnsafe(idx.sql);
      } else {
        console.log(`[optimize-db] ${idx.name} exists`);
      }
    }

    console.log('[optimize-db] Done');
  } catch (e) {
    console.error('[optimize-db] Error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
