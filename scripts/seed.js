/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.review.deleteMany({});
  await prisma.spot.deleteMany({});

  const spots = [
    {
      type: 'spot',
      name: '沼津港 親水公園',
      city: '沼津市',
      address: '静岡県沼津市千本港町',
      lat: 35.0899,
      lng: 138.8606,
      tags: JSON.stringify(['公園', '海', '散歩']),
      images: JSON.stringify([]),
      priceBand: 'free',
    },
    {
      type: 'spot',
      name: '楽寿園',
      city: '三島市',
      address: '静岡県三島市一番町19-3',
      lat: 35.1192,
      lng: 138.9198,
      tags: JSON.stringify(['公園', '動物', '汽車']),
      images: JSON.stringify([]),
      priceBand: '¥',
    },
    {
      type: 'restaurant',
      name: '炭焼きレストランさわやか 御殿場インター店',
      city: '御殿場市',
      address: '静岡県御殿場市東田中984-1',
      lat: 35.3088,
      lng: 138.9388,
      tags: JSON.stringify(['ハンバーグ', 'キッズメニュー']),
      images: JSON.stringify([]),
      priceBand: '¥¥',
    },
  ];

  for (const s of spots) await prisma.spot.create({ data: s });

  console.log('Seeded', spots.length, 'spots');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

