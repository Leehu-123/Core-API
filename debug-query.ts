import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const companyId = "c2f8b502-d591-4952-b88d-a4174d825c9d"; // Any string
    const roleWhere = { companyId };
    
    // Simulate what getDashboardStats does
    await prisma.task.count({ where: roleWhere });
    console.log("Task count passed");
    
    await prisma.task.findMany({
      where: roleWhere,
      include: {
        assignees: { include: { user: { select: { fullName: true, avatar: true } } } },
        department: { select: { name: true, code: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    console.log("Task findMany passed");

    await prisma.department.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { tasks: true, members: true } },
        branch: { select: { name: true } },
      },
    });
    console.log("Department findMany passed");

  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
