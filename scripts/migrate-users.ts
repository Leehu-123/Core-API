import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const ROLE_MAPPING: Record<string, string> = {
  admin: 'ADMIN',
  thukho: 'STOCK_MANAGER',
  ketoan: 'ACCOUNTANT',
  kinhdoanh: 'SALES',
  giacong: 'PROCESSING',
};

async function main() {
  // Read dumped users
  const dumpPath = path.join(__dirname, 'stock_users_dump.json');
  if (!fs.existsSync(dumpPath)) {
    console.error('File stock_users_dump.json not found!');
    process.exit(1);
  }
  const stockUsers = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

  // Get the main company (assume the first one or DAFA)
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'DAFA Company',
        code: 'DAFA',
      },
    });
  }
  console.log(`Using company: ${company.name} (${company.id})`);

  for (const su of stockUsers) {
    const targetRoleName = ROLE_MAPPING[su.role] || 'STAFF';

    // Ensure role exists
    let role = await prisma.role.findFirst({
      where: { name: targetRoleName, companyId: company.id },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: targetRoleName,
          companyId: company.id,
          description: `Imported role for ${su.role}`,
        },
      });
      console.log(`Created role: ${role.name}`);
    }

    // Check if user already exists by username
    const existingUser = await prisma.user.findUnique({
      where: { username: su.username },
    });

    if (existingUser) {
      console.log(`User ${su.username} already exists, skipping.`);
      continue;
    }

    // Insert user
    const newUser = await prisma.user.create({
      data: {
        companyId: company.id,
        username: su.username,
        email: null,
        passwordHash: su.passwordHash,
        fullName: su.fullName,
        isActive: su.active,
        userRoles: {
          create: {
            roleId: role.id,
          },
        },
      },
    });
    console.log(`Imported user: ${newUser.username}`);
  }

  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
