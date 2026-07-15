const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function patchRoles() {
  const company = await prisma.company.findFirst({ where: { code: 'DAFA' } });
  if (!company) {
    console.log('Company DAFA not found');
    return;
  }

  const allPermissions = await prisma.permission.findMany();
  const permissionsByName = {};
  allPermissions.forEach(p => permissionsByName[p.name] = p);

  const salesPerms = ['products.read', 'customers.read', 'customers.write', 'quotes.read', 'quotes.write', 'sales_orders.read', 'sales_orders.write', 'opportunities.read', 'opportunities.write', 'customer_interactions.read', 'customer_interactions.write', 'sales_tasks.read', 'sales_tasks.write', 'dashboard.read'];
  
  const roleDefinitions = [
    {
      name: 'accountant',
      description: 'Accountant team with reporting and orders access',
      permissions: ['sales_orders.read', 'sales_orders.write', 'dashboard.read', 'kpis.read']
    },
    {
      name: 'sale_lead',
      description: 'Sales Lead team',
      permissions: [...salesPerms, 'business_trips.read', 'business_trips.write', 'business_trips.approve']
    },
    {
      name: 'sale_admin',
      description: 'Sales Admin team',
      permissions: [...salesPerms, 'users.read']
    }
  ];

  for (const roleDef of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: {
        companyId_name: { companyId: company.id, name: roleDef.name },
      },
      update: { description: roleDef.description },
      create: {
        companyId: company.id,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: false,
      },
    });

    for (const permName of roleDef.permissions) {
      const perm = permissionsByName[permName];
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    console.log('Role added:', roleDef.name);
  }
}

patchRoles().catch(console.error).finally(() => prisma.$disconnect());
