-- Migration: Add search optimization indexes and full-text search support
-- This migration improves search performance for spots and events

-- Add indexes for basic text searches
CREATE INDEX IF NOT EXISTS "spot_name_idx" ON "Spot" USING btree ("name");
CREATE INDEX IF NOT EXISTS "spot_city_idx" ON "Spot" USING btree ("city");
CREATE INDEX IF NOT EXISTS "event_title_idx" ON "Event" USING btree ("title");
CREATE INDEX IF NOT EXISTS "event_city_idx" ON "Event" USING btree ("city");

-- Add GIN indexes for JSON tags (better for array-like searches)
CREATE INDEX IF NOT EXISTS "spot_tags_gin_idx" ON "Spot" USING gin ("tags" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "event_tags_gin_idx" ON "Event" USING gin ("tags" gin_trgm_ops);

-- Enable pg_trgm extension for fuzzy/partial text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add composite index for common search patterns
CREATE INDEX IF NOT EXISTS "spot_search_composite_idx" ON "Spot" USING btree ("city", "type");
CREATE INDEX IF NOT EXISTS "spot_location_idx" ON "Spot" USING btree ("lat", "lng");

-- Add full-text search support with tsvector columns
ALTER TABLE "Spot" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create function to update search vector for spots
CREATE OR REPLACE FUNCTION update_spot_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.city, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.address, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.tags, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update search vector for events
CREATE OR REPLACE FUNCTION update_event_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.city, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.tags, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update search vectors
DROP TRIGGER IF EXISTS spot_search_vector_trigger ON "Spot";
CREATE TRIGGER spot_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Spot"
  FOR EACH ROW EXECUTE FUNCTION update_spot_search_vector();

DROP TRIGGER IF EXISTS event_search_vector_trigger ON "Event";
CREATE TRIGGER event_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Event"
  FOR EACH ROW EXECUTE FUNCTION update_event_search_vector();

-- Create GIN indexes on search vectors for fast full-text search
CREATE INDEX IF NOT EXISTS "spot_search_vector_idx" ON "Spot" USING gin ("search_vector");
CREATE INDEX IF NOT EXISTS "event_search_vector_idx" ON "Event" USING gin ("search_vector");

-- Update existing records with search vectors
UPDATE "Spot" SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(city, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(address, '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(tags, '')), 'D')
WHERE search_vector IS NULL;

UPDATE "Event" SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(city, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(tags, '')), 'D')
WHERE search_vector IS NULL;