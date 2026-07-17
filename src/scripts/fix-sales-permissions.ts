import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing sales role permissions...');
  
  // Find all permissions we want to add
  const salesPermissions = [
    'products.read', 
    'customers.read', 
    'customers.write', 
    'quotes.read', 
    'quotes.write', 
    'sales_tasks.read', 
    'sales_tasks.write', 
    'business_trips.read', 
    'business_trips.write', 
    'opportunities.read', 
    'opportunities.write', 
    'reports.read',
    'sales_orders.read',
    'sales_orders.write'
  ];
  
  const permissions = await prisma.permission.findMany({
    where: { name: { in: salesPermissions } }
  });
  
  const permissionIds = permissions.map(p => ({ id: p.id }));
  
  // Find all 'sales' roles
  const salesRoles = await prisma.role.findMany({
    where: { name: 'sales' }
  });
  
  console.log(`Found ${salesRoles.length} sales roles.`);
  
  for (const role of salesRoles) {
    // Delete existing permissions for this role first
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id }
    });

    // Insert new ones
    for (const pId of permissionIds) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: pId.id
        }
      });
    }
    console.log(`Updated permissions for role: ${role.id}`);
  }
  
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
