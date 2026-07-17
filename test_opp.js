const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const opps = await prisma.opportunity.findMany();
  console.log(opps.length);
  console.log(opps.map(o => ({stage: o.stage, val: o.estimatedValue})));
}
main().catch(console.error);
