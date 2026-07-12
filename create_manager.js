const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
  if (!adminRole) return;
  const companyId = adminRole.companyId;
  const exists = await prisma.role.findFirst({ where: { companyId, name: 'manager' } });
  if (!exists) {
    await prisma.role.create({
      data: {
        companyId,
        name: 'manager',
        description: 'Manager role',
        isSystem: false
      }
    });
    console.log('Manager role created!');
  } else {
    console.log('Manager role already exists.');
  }
}
main().finally(() => prisma.$disconnect());
