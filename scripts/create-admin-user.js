const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 12);

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'admin',
      },
    });

    console.log('Admin user created successfully:', adminUser.email);
    console.log('Login with: admin@example.com / admin123');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();