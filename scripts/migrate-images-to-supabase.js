/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');

function assertEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const SUPABASE_URL = assertEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = assertEnv('SUPABASE_SERVICE_ROLE_KEY');
  const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'spots';

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const prisma = new PrismaClient();

  // Ensure bucket exists (idempotent)
  try {
    await supabase.storage.createBucket(SUPABASE_BUCKET, { public: true });
    console.log('Bucket created:', SUPABASE_BUCKET);
  } catch (e) {
    // ignore if exists
  }

  const dir = path.resolve(process.cwd(), 'public/images');
  if (!fs.existsSync(dir)) {
    console.error('No images dir:', dir);
    process.exit(1);
  }
  const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  console.log('Found files:', files.length);

  let uploaded = 0;
  for (const file of files) {
    const base = path.basename(file);
    const id = base.replace(/\.[^.]+$/, '');
    const full = path.join(dir, file);
    const contents = fs.readFileSync(full);
    const dest = `${id}/${base}`; // per-spot folder

    // Upload (upsert)
    const { error: upErr } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(dest, contents, { upsert: true, contentType: 'image/jpeg' });
    if (upErr) {
      console.warn('Upload failed for', base, upErr.message);
      continue;
    }

    // Public URL
    const { data: pub } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(dest);
    const url = pub.publicUrl;

    // Update DB
    try {
      const spot = await prisma.spot.findUnique({ where: { id } });
      if (!spot) {
        console.warn('No spot for id (skipping DB update):', id);
        continue;
      }
      let arr = [];
      try { arr = JSON.parse(spot.images || '[]'); } catch (_) { arr = []; }
      if (!Array.isArray(arr)) arr = [];
      if (!arr.includes(url)) arr.push(url);
      await prisma.spot.update({ where: { id }, data: { images: JSON.stringify(arr) } });
      uploaded++;
      console.log('Updated', id, '→', url);
    } catch (e) {
      console.warn('DB update failed for', id, e.message);
    }
  }

  console.log('Done. Uploaded/updated:', uploaded);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

