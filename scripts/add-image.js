/* eslint-disable no-console */
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const [, , spotIdArg, imageArg] = process.argv;
  if (!spotIdArg || !imageArg) {
    console.error('Usage: npm run add:image -- <spotId> <imagePathOrUrl>');
    console.error('Example: npm run add:image -- cmf6... /images/cmf6....jpg');
    process.exit(1);
  }
  // Normalize to web path if a local path under public/ is given
  let src = imageArg;
  const parts = imageArg.replace(/\\/g, '/');
  const idx = parts.indexOf('/public/');
  if (idx >= 0) {
    src = parts.slice(idx + '/public'.length);
  } else if (parts.includes('/images/')) {
    const i = parts.lastIndexOf('/images/');
    src = parts.slice(i);
  }

  const prisma = new PrismaClient();
  try {
    const spot = await prisma.spot.findUnique({ where: { id: spotIdArg } });
    if (!spot) {
      console.error('Spot not found:', spotIdArg);
      process.exit(2);
    }
    let arr = [];
    try { arr = JSON.parse(spot.images || '[]'); } catch (_) { arr = []; }
    if (!Array.isArray(arr)) arr = [];
    if (!arr.includes(src)) arr.push(src);
    await prisma.spot.update({ where: { id: spotIdArg }, data: { images: JSON.stringify(arr) } });
    console.log('Updated images for', spotIdArg, '→', arr);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

