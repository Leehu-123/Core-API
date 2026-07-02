import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ── 1. Create Demo Company ──────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Demo Company',
      code: 'DEMO',
      taxCode: '0123456789',
      address: '123 Demo Street, District 1, Ho Chi Minh City',
      phone: '+84-28-1234-5678',
      email: 'contact@demo-company.com',
      isActive: true,
    },
  });
  console.log(`✅ Company created: ${company.name} (${company.code})`);

  // ── 2. Create Permissions ───────────────────────────────────────────
  const permissionDefinitions = [
    { name: 'adjustments.approve', description: 'Approve stock adjustments' },
    { name: 'adjustments.delete', description: 'Delete stock adjustments' },
    { name: 'adjustments.read', description: 'View stock adjustments' },
    { name: 'adjustments.write', description: 'Create and update stock adjustments' },
    { name: 'audit_logs.read', description: 'View audit logs' },
    { name: 'backups.read', description: 'View backup logs' },
    { name: 'backups.write', description: 'Create and manage backups' },
    { name: 'business_trips.read', description: 'View business trips' },
    { name: 'business_trips.write', description: 'Create and update business trips' },
    { name: 'customers.read', description: 'View customers' },
    { name: 'customers.write', description: 'Create, update, and delete customers' },
    { name: 'damage_reports.approve', description: 'Approve damage reports' },
    { name: 'damage_reports.delete', description: 'Delete damage reports' },
    { name: 'damage_reports.read', description: 'View damage reports' },
    { name: 'damage_reports.write', description: 'Create and update damage reports' },
    { name: 'goods_issues.approve', description: 'Approve goods issues' },
    { name: 'goods_issues.delete', description: 'Delete goods issues' },
    { name: 'goods_issues.read', description: 'View goods issues' },
    { name: 'goods_issues.write', description: 'Create and update goods issues' },
    { name: 'goods_receipts.approve', description: 'Approve goods receipts' },
    { name: 'goods_receipts.delete', description: 'Delete goods receipts' },
    { name: 'goods_receipts.read', description: 'View goods receipts' },
    { name: 'goods_receipts.write', description: 'Create and update goods receipts' },
    { name: 'interactions.read', description: 'View customer interactions' },
    { name: 'interactions.write', description: 'Create and update customer interactions' },
    { name: 'inventory.read', description: 'View inventory' },
    { name: 'inventory.write', description: 'Create and update inventory' },
    { name: 'kpis.read', description: 'View KPIs' },
    { name: 'kpis.write', description: 'Create and update KPIs' },
    { name: 'locations.delete', description: 'Delete locations' },
    { name: 'locations.read', description: 'View locations' },
    { name: 'locations.write', description: 'Create and update locations' },
    { name: 'opportunities.read', description: 'View opportunities' },
    { name: 'opportunities.write', description: 'Create and update opportunities' },
    { name: 'processing_orders.approve', description: 'Approve processing orders' },
    { name: 'processing_orders.delete', description: 'Delete processing orders' },
    { name: 'processing_orders.read', description: 'View processing orders' },
    { name: 'processing_orders.write', description: 'Create and update processing orders' },
    { name: 'products.delete', description: 'Delete products' },
    { name: 'products.read', description: 'View products' },
    { name: 'products.write', description: 'Create, update, and delete products' },
    { name: 'quotes.create', description: 'Create quotes' },
    { name: 'quotes.delete', description: 'Delete quotes' },
    { name: 'quotes.read', description: 'View quotes' },
    { name: 'quotes.update', description: 'Update quotes' },
    { name: 'sales_orders.delete', description: 'Delete sales orders' },
    { name: 'sales_orders.read', description: 'View sales orders' },
    { name: 'sales_orders.write', description: 'Create and update sales orders' },
    { name: 'sales_tasks.read', description: 'View sales tasks' },
    { name: 'sales_tasks.write', description: 'Create and update sales tasks' },
    { name: 'stocktakes.approve', description: 'Approve stocktakes' },
    { name: 'stocktakes.delete', description: 'Delete stocktakes' },
    { name: 'stocktakes.read', description: 'View stocktakes' },
    { name: 'stocktakes.write', description: 'Create and update stocktakes' },
    { name: 'suppliers.delete', description: 'Delete suppliers' },
    { name: 'suppliers.read', description: 'View suppliers' },
    { name: 'suppliers.write', description: 'Create and update suppliers' },
    { name: 'teams.delete', description: 'Delete teams' },
    { name: 'teams.read', description: 'View teams' },
    { name: 'teams.write', description: 'Create and update teams' },
    { name: 'users.read', description: 'View users' },
    { name: 'users.write', description: 'Create, update, and delete users' },
  ];
  const permissions: Record<string, { id: string; name: string }> = {};

  for (const perm of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: {
        name: perm.name,
        description: perm.description,
      },
    });
    permissions[perm.name] = permission;
  }
  console.log(`✅ Permissions created: ${Object.keys(permissions).length}`);

  // ── 3. Create Roles ─────────────────────────────────────────────────
  const allPermissionNames = permissionDefinitions.map((p) => p.name);
  const readPermissionNames = allPermissionNames.filter((p) =>
    p.endsWith('.read'),
  );

  const roleDefinitions = [
    {
      name: 'owner',
      description: 'Full system access with ownership privileges',
      isSystem: true,
      permissions: allPermissionNames,
    },
    {
      name: 'admin',
      description: 'Full administrative access',
      isSystem: true,
      permissions: allPermissionNames,
    },
    {
      name: 'sales',
      description: 'Sales team with customer and product view access',
      isSystem: false,
      permissions: ['products.read', 'customers.read', 'customers.write'],
    },
    {
      name: 'warehouse',
      description: 'Warehouse team with product management access',
      isSystem: false,
      permissions: allPermissionNames.filter(p => !p.startsWith('users.') && !p.startsWith('backups.') && p !== 'audit_logs.read'),
    },
    {
      name: 'viewer',
      description: 'Read-only access to all resources',
      isSystem: false,
      permissions: readPermissionNames,
    },
  ];

  const roles: Record<string, { id: string; name: string }> = {};

  for (const roleDef of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: roleDef.name,
        },
      },
      update: {
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
      create: {
        companyId: company.id,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });
    roles[roleDef.name] = role;

    // Assign permissions to role
    for (const permName of roleDef.permissions) {
      const perm = permissions[permName];
      if (!perm) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }
  console.log(`✅ Roles created: ${Object.keys(roles).length}`);

  // ── 4. Create Owner User ───────────────────────────────────────────
  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      companyId: company.id,
      email: 'owner@example.com',
      passwordHash: passwordHash,
      fullName: 'System Owner',
      phone: '+84-909-000-001',
      isActive: true,
    },
  });
  console.log(`✅ Owner user created: ${ownerUser.email}`);

  // Assign owner role to owner user
  const ownerRole = roles['owner'];
  if (ownerRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: ownerUser.id,
          roleId: ownerRole.id,
        },
      },
      update: {},
      create: {
        userId: ownerUser.id,
        roleId: ownerRole.id,
      },
    });
    console.log(`✅ Owner role assigned to ${ownerUser.email}`);
  }

  // ── 5. Create Sample Products ───────────────────────────────────────
  const productDefinitions = [
    {
      sku: 'PROD-001',
      name: 'Wireless Bluetooth Headphones',
      description: 'Premium over-ear wireless headphones with active noise cancellation and 30-hour battery life',
      unit: 'pcs',
      barcode: '8938500100001',
      costPrice: 450000,
      salePrice: 890000,
    },
    {
      sku: 'PROD-002',
      name: 'USB-C Charging Cable 2m',
      description: 'Durable braided USB-C to USB-C fast charging cable, 100W PD support',
      unit: 'pcs',
      barcode: '8938500100002',
      costPrice: 35000,
      salePrice: 79000,
    },
    {
      sku: 'PROD-003',
      name: 'Ergonomic Office Chair',
      description: 'Adjustable lumbar support office chair with breathable mesh back and armrests',
      unit: 'pcs',
      barcode: '8938500100003',
      costPrice: 2800000,
      salePrice: 4500000,
    },
    {
      sku: 'PROD-004',
      name: 'Mechanical Keyboard RGB',
      description: 'Full-size mechanical keyboard with Cherry MX Blue switches and per-key RGB lighting',
      unit: 'pcs',
      barcode: '8938500100004',
      costPrice: 1200000,
      salePrice: 1990000,
    },
    {
      sku: 'PROD-005',
      name: 'Portable Power Bank 20000mAh',
      description: 'Slim portable charger with dual USB-A and USB-C ports, 65W fast charging output',
      unit: 'pcs',
      barcode: '8938500100005',
      costPrice: 380000,
      salePrice: 650000,
    },
  ];

  for (const prod of productDefinitions) {
    await prisma.product.upsert({
      where: {
        companyId_sku: {
          companyId: company.id,
          sku: prod.sku,
        },
      },
      update: {
        name: prod.name,
        description: prod.description,
        unit: prod.unit,
        barcode: prod.barcode,
        costPrice: prod.costPrice,
        salePrice: prod.salePrice,
      },
      create: {
        companyId: company.id,
        sku: prod.sku,
        name: prod.name,
        description: prod.description,
        unit: prod.unit,
        barcode: prod.barcode,
        costPrice: prod.costPrice,
        salePrice: prod.salePrice,
        createdById: ownerUser.id,
      },
    });
  }
  console.log(`✅ Products created: ${productDefinitions.length}`);

  // ── 6. Create Sample Customers ──────────────────────────────────────
  const customerDefinitions = [
    {
      code: 'CUST-001',
      name: 'Nguyen Van An',
      phone: '+84-909-111-001',
      email: 'an.nguyen@techcorp.vn',
      address: '456 Nguyen Hue, District 1, Ho Chi Minh City',
      taxCode: '0301234567',
      note: 'Premium customer, preferred payment: bank transfer',
    },
    {
      code: 'CUST-002',
      name: 'Tran Thi Binh',
      phone: '+84-909-111-002',
      email: 'binh.tran@starcom.vn',
      address: '789 Le Loi, District 3, Ho Chi Minh City',
      taxCode: '0307654321',
      note: 'Wholesale buyer, monthly orders',
    },
    {
      code: 'CUST-003',
      name: 'Le Minh Cuong',
      phone: '+84-909-111-003',
      email: 'cuong.le@greenleaf.vn',
      address: '12 Tran Hung Dao, Hoan Kiem, Hanoi',
      taxCode: '0101234567',
      note: 'New customer since Q1 2026',
    },
    {
      code: 'CUST-004',
      name: 'Pham Hoang Dung',
      phone: '+84-909-111-004',
      email: 'dung.pham@bluewave.vn',
      address: '34 Bach Dang, Hai Chau, Da Nang',
      taxCode: '0401234567',
      note: 'Regional distributor for Central Vietnam',
    },
    {
      code: 'CUST-005',
      name: 'Vo Thanh Emi',
      phone: '+84-909-111-005',
      email: 'emi.vo@sunriseco.vn',
      address: '56 Nguyen Trai, Ninh Kieu, Can Tho',
      taxCode: '0901234567',
      note: 'Key account, quarterly review meetings',
    },
  ];

  for (const cust of customerDefinitions) {
    await prisma.customer.upsert({
      where: {
        companyId_code: {
          companyId: company.id,
          code: cust.code,
        },
      },
      update: {
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        address: cust.address,
        taxCode: cust.taxCode,
        note: cust.note,
      },
      create: {
        companyId: company.id,
        code: cust.code,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        address: cust.address,
        taxCode: cust.taxCode,
        note: cust.note,
        createdById: ownerUser.id,
      },
    });
  }
  console.log(`✅ Customers created: ${customerDefinitions.length}`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

