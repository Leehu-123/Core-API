const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const permissionsToAdd = {
    'ketoan': ['sales_orders.write'],
    'accountant': ['sales_orders.write'],
    'sale_lead': ['customers.write', 'sales_orders.write'],
  };

  for (const [roleName, perms] of Object.entries(permissionsToAdd)) {
    const role = await prisma.role.findFirst({ where: { name: roleName } });
    if (!role) {
      console.log(`Role ${roleName} not found.`);
      continue;
    }

    for (const permCode of perms) {
      const permission = await prisma.permission.findUnique({ where: { name: permCode } });
      if (!permission) {
        console.log(`Permission ${permCode} not found.`);
        continue;
      }

      // Check if already assigned
      const existing = await prisma.rolePermission.findFirst({
        where: { roleId: role.id, permissionId: permission.id }
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id
          }
        });
        console.log(`Added ${permCode} to ${roleName}`);
      } else {
        console.log(`${roleName} already has ${permCode}`);
      }
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
