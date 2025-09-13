const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    // Create regular user
    const existingUser = await prisma.user.findUnique({
      where: { email: 'user@example.com' }
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('user123', 12);
      const regularUser = await prisma.user.create({
        data: {
          email: 'user@example.com',
          name: 'Regular User',
          password: hashedPassword,
          role: 'user',
        },
      });
      console.log('Regular user created:', regularUser.email, '/ user123');
    } else {
      console.log('Regular user already exists:', existingUser.email);
    }

    // Show all users
    console.log('\nAll users in database:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
    console.table(users);

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();