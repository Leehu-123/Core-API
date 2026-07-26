import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DafaTasksService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.task.create({ data });
  }

  async findAll(companyId: string, query?: any) {
    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    
    if (query?.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.priority) {
      where.priority = query.priority;
    }
    if (query?.departmentId) {
      where.departmentId = query.departmentId;
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignees: {
            include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } }
          },
          department: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true, avatarUrl: true } }
        }
      }),
      this.prisma.task.count({ where })
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getDashboardStats(companyId: string, userId: string, role: string) {
    let roleWhere: any = { companyId };
    if (role === 'MANAGER') {
      const managerDepts = await this.prisma.departmentMember.findMany({
        where: { userId },
        select: { departmentId: true }
      });
      const deptIds = managerDepts.map(d => d.departmentId);
      if (deptIds.length > 0) {
        roleWhere.OR = [
          { departmentId: { in: deptIds } },
          { assignees: { some: { user: { departmentMember: { some: { departmentId: { in: deptIds } } } } } } },
          { createdById: userId }
        ];
      } else {
        roleWhere.assignees = { some: { userId } };
      }
    } else if (role === 'EMPLOYEE' || role === 'SALES') {
      roleWhere.assignees = { some: { userId } };
    }

    const [
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      overdueTasks,
      reviewTasks,
      recentTasks,
      departments,
      userCount,
    ] = await Promise.all([
      this.prisma.task.count({ where: roleWhere }),
      this.prisma.task.count({ where: { ...roleWhere, status: 'TODO' } }),
      this.prisma.task.count({ where: { ...roleWhere, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { ...roleWhere, status: 'DONE' } }),
      this.prisma.task.count({ where: { ...roleWhere, status: 'OVERDUE' } }),
      this.prisma.task.count({ where: { ...roleWhere, status: 'REVIEW' } }),
      this.prisma.task.findMany({
        where: roleWhere,
        include: {
          assignees: { include: { user: { select: { fullName: true, avatar: true } } } },
          department: { select: { name: true, code: true } },
          createdBy: { select: { fullName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      (role === 'ADMIN' || role === 'OWNER')
        ? this.prisma.department.findMany({
            where: { isActive: true },
            include: {
              _count: { select: { tasks: true, members: true } },
              branch: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      (role === 'ADMIN' || role === 'OWNER')
        ? this.prisma.user.count({ where: { isActive: true, companyId } })
        : Promise.resolve(0),
    ]);

    const overdueByDeadline = await this.prisma.task.count({
      where: {
        ...roleWhere,
        deadline: { lt: new Date() },
        status: { notIn: ['DONE', 'OVERDUE'] },
      },
    });

    return {
      stats: {
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks,
        overdueTasks: overdueTasks + overdueByDeadline,
        reviewTasks,
        userCount,
        completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      },
      recentTasks,
      departments,
    };
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.task.findFirst({
      where: { id, companyId },
      include: {
        assignees: {
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } }
        },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, avatarUrl: true } },
        attachments: true,
        comments: {
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' }
        },
        history: {
          include: { changedBy: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { changedAt: 'desc' }
        }
      }
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.task.delete({
      where: { id },
    });
  }
}