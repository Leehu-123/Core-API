const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.salesOrder.updateMany({
    where: { paymentStatus: 'PAID' },
    data: { paymentStatus: 'FULLY_PAID' }
  });
  
  await prisma.salesOrder.updateMany({
    where: { code: 'DH-3CD8793E' },
    data: { paymentStatus: 'FULLY_PAID' }
  });
  console.log('Fixed DB');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
