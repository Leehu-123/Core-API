const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { userRoles: { include: { role: true } } } });
  console.log(users.map(u => ({ id: u.id, roles: u.userRoles.map(ur => ur.role.name) })));
}
main().catch(console.error);
