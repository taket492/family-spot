/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const now = new Date();
    const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const total = await prisma.event.count({
      where: {
        status: 'public',
        startAt: { gte: now, lte: to },
      },
    });
    console.log(`Events (now..+14d): ${total}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

