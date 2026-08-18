import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findFirst({ where: { name: 'accountant' } });
  if (!role) {
    console.log('Accountant role not found');
    return;
  }
  
  const perms = ['business_trips.read', 'business_trips.write'];
  for (const p of perms) {
    const perm = await prisma.permission.findUnique({ where: { name: p } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id }
        },
        update: {},
        create: { roleId: role.id, permissionId: perm.id }
      });
      console.log('Added ' + p);
    }
  }
  console.log('Done');
}

main().finally(() => prisma.$disconnect());
