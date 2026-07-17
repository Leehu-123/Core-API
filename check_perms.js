const { PrismaClient } = require('@prisma/client');
async function main() {
  const prisma = new PrismaClient();
  const roles = await prisma.role.findMany({ include: { permissions: true } });
  console.log(JSON.stringify(roles, null, 2));
}
main();