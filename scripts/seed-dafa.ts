import { PrismaClient, TaskPriority, TaskStatus, RecurrenceType, ReportFrequency, ReportStatus, EvaluationCycle, NotificationType, KpiStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data...');

  // 1. Get the company
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error('No company found!');
    return;
  }

  // 2. Create Branches
  const branch1 = await prisma.branch.upsert({
    where: { code: 'HN01' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Chi nhánh Hà Nội',
      code: 'HN01',
      city: 'Hà Nội',
      address: '123 Cầu Giấy',
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { code: 'HCM01' },
    update: {},
    create: {
      companyId: company.id,
      name: 'Chi nhánh Hồ Chí Minh',
      code: 'HCM01',
      city: 'Hồ Chí Minh',
      address: '456 Quận 1',
    },
  });

  // 3. Create Departments
  const deptIT = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: {
      branchId: branch1.id,
      name: 'Phòng Công nghệ',
      code: 'IT',
      description: 'Phòng IT phát triển phần mềm',
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { code: 'HR' },
    update: {},
    create: {
      branchId: branch1.id,
      name: 'Phòng Nhân sự',
      code: 'HR',
      description: 'Phòng hành chính nhân sự',
    },
  });

  // 4. Get some users
  const users = await prisma.user.findMany({ take: 3 });
  if (users.length === 0) {
    console.error('No users found!');
    return;
  }
  const user1 = users[0];
  const user2 = users.length > 1 ? users[1] : users[0];

  // Assign user to branch & department
  await prisma.user.update({
    where: { id: user1.id },
    data: { primaryBranchId: branch1.id, jobTitle: 'Manager' },
  });
  await prisma.departmentMember.upsert({
    where: { departmentId_userId: { departmentId: deptIT.id, userId: user1.id } },
    update: {},
    create: { departmentId: deptIT.id, userId: user1.id },
  });

  // 5. Create some Tasks
  const task1 = await prisma.task.create({
    data: {
      companyId: company.id,
      title: 'Thiết kế giao diện Dafa Manager',
      description: 'Lên wireframe và thiết kế UI',
      createdById: user1.id,
      departmentId: deptIT.id,
      branchId: branch1.id,
      priority: TaskPriority.HIGH,
      status: TaskStatus.IN_PROGRESS,
      deadline: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      assignees: {
        create: {
          userId: user2.id,
        },
      },
    },
  });

  const task2 = await prisma.task.create({
    data: {
      companyId: company.id,
      title: 'Báo cáo tuyển dụng tháng',
      description: 'Tổng hợp số lượng ứng viên',
      createdById: user2.id,
      departmentId: deptHR.id,
      branchId: branch1.id,
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      deadline: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      assignees: {
        create: {
          userId: user1.id,
        },
      },
    },
  });

  // 6. Create KPI Criteria
  const kpi1 = await prisma.kpiCriteria.create({
    data: {
      companyId: company.id,
      departmentId: deptIT.id,
      name: 'Số bug/feature',
      unit: 'bug',
      weightPercent: 30,
      targetValue: 2,
      evaluationCycle: EvaluationCycle.MONTHLY,
      comparisonType: 'LOWER_BETTER',
    },
  });

  const kpi2 = await prisma.kpiCriteria.create({
    data: {
      companyId: company.id,
      departmentId: deptHR.id,
      name: 'Số lượng tuyển dụng',
      unit: 'người',
      weightPercent: 40,
      targetValue: 5,
      evaluationCycle: EvaluationCycle.MONTHLY,
      comparisonType: 'HIGHER_BETTER',
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
