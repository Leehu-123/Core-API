import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const STATUS_VI_MAP: Record<string, string> = {
  TODO: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  REVIEW: 'Chờ duyệt',
  DONE: 'Hoàn thành',
  OVERDUE: 'Trễ hạn',
  CANCELLED: 'Đã hủy',
};

@Injectable()
export class DafaTasksService {
  private notificationQueue = new Map<string, any>();
  
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { assignees, followers, reportToId, deadline, departmentId, createdById, companyId, ...rest } = data;

    const createData: any = {
      ...rest,
      companyId,
    };

    if (departmentId && departmentId.trim() !== "") {
      createData.departmentId = departmentId;
    }

    if (reportToId && reportToId.trim() !== "") {
      createData.reportToId = reportToId;
    }

    if (deadline) {
      createData.deadline = new Date(deadline);
    }

    if (createdById) {
      createData.createdById = createdById;
    }

    if (Array.isArray(assignees) && assignees.length > 0) {
      createData.assignees = {
        create: assignees.map((userId: string) => ({ userId })),
      };
    }

    if (Array.isArray(followers) && followers.length > 0) {
      createData.followers = {
        create: followers.map((userId: string) => ({ userId })),
      };
    }

    const newTask = await this.prisma.task.create({
      data: createData,
      include: {
        assignees: {
          include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
        },
        followers: {
          include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
        },
        reportTo: { select: { id: true, fullName: true, email: true, avatar: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    this.sendTelegramNotification({
      companyId,
      taskId: newTask.id,
      actorUserId: createdById,
      type: 'TASK_CREATED',
      task: newTask,
    });

    return newTask;
  }

  async findAll(companyId: string, userId: string, role: string, query?: any) {
    const normRole = Array.isArray(role)
      ? (role[0] || '').toString().toUpperCase()
      : (role || '').toString().toUpperCase();

    const page = parseInt(query?.page) || 1;
    const limit = parseInt(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (normRole === 'ADMIN' || normRole === 'OWNER') {
      // Admin sees all tasks
    } else if (normRole === 'MANAGER') {
      const managerDepts = await this.prisma.departmentMember.findMany({
        where: { userId },
        select: { departmentId: true }
      });
      const deptIds = managerDepts.map(d => d.departmentId);
      where.OR = [
        { departmentId: { in: deptIds } },
        { assignees: { some: { userId } } },
        { followers: { some: { userId } } },
        { createdById: userId },
        { reportToId: userId }
      ];
    } else {
      // Non-admin (EMPLOYEE, ACCOUNTANT, SALES, etc.) ONLY sees assigned, followed, created, or reportTo
      where.OR = [
        { assignees: { some: { userId } } },
        { followers: { some: { userId } } },
        { createdById: userId },
        { reportToId: userId }
      ];
    }

    if (query?.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }
    if (query?.status) {
      if (query.status === 'OVERDUE') {
        const overdueCond = [
          { status: 'OVERDUE' },
          {
            deadline: { lt: new Date() },
            status: { notIn: ['DONE'] },
          },
        ];
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            { OR: overdueCond }
          ];
          delete where.OR;
        } else {
          where.OR = overdueCond;
        }
      } else {
        where.status = query.status;
      }
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
            include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
          },
          followers: {
            include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
          },
          reportTo: { select: { id: true, fullName: true, email: true, avatar: true } },
          department: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true, avatar: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardStats(companyId: string, userId: string, role: string) {
    const normRole = Array.isArray(role)
      ? (role[0] || '').toString().toUpperCase()
      : (role || '').toString().toUpperCase();

    let roleWhere: any = { companyId };
    if (normRole === 'ADMIN' || normRole === 'OWNER' || normRole === 'ADMINISTRATOR') {
      // Admin sees all tasks
    } else if (normRole === 'MANAGER') {
      const managerDepts = await this.prisma.departmentMember.findMany({
        where: { userId },
        select: { departmentId: true }
      });
      const deptIds = managerDepts.map(d => d.departmentId);
      roleWhere.OR = [
        { departmentId: { in: deptIds } },
        { assignees: { some: { userId } } },
        { followers: { some: { userId } } },
        { createdById: userId },
        { reportToId: userId }
      ];
    } else {
      // Non-admin non-manager (EMPLOYEE, ACCOUNTANT, SALES...) only see tasks they are involved in
      roleWhere.OR = [
        { assignees: { some: { userId } } },
        { followers: { some: { userId } } },
        { createdById: userId },
        { reportToId: userId }
      ];
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
      (normRole === 'ADMIN' || normRole === 'OWNER' || normRole === 'MANAGER')
        ? this.prisma.department.findMany({
            where: { isActive: true },
            include: {
              _count: { select: { tasks: true, members: true } },
              branch: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      this.prisma.user.count({ where: { companyId, deletedAt: null } }),
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
          include: { user: { select: { id: true, fullName: true, avatar: true } } },
        },
        followers: {
          include: { user: { select: { id: true, fullName: true, avatar: true } } },
        },
        reportTo: { select: { id: true, fullName: true, avatar: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, avatar: true } },
        attachments: true,
        comments: {
          include: { author: { select: { id: true, fullName: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        },
        histories: {
          include: { changedBy: { select: { id: true, fullName: true, avatar: true } } },
          orderBy: { changedAt: 'desc' },
        },
      },
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string, actorUserId?: string) {
    const item = await this.findOne(id, companyId);

    const { assignees, followers, reportToId, deadline, departmentId, ...rest } = data;

    const updateData: any = { ...rest };

    if (departmentId !== undefined) {
      updateData.departmentId = departmentId && departmentId.trim() !== '' ? departmentId : null;
    }

    if (reportToId !== undefined) {
      updateData.reportToId = reportToId && reportToId.trim() !== '' ? reportToId : null;
    }

    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null;
    }

    if (Array.isArray(assignees)) {
      await this.prisma.taskAssignee.deleteMany({ where: { taskId: id } });
      if (assignees.length > 0) {
        updateData.assignees = {
          create: assignees.map((userId: string) => ({ userId })),
        };
      }
    }

    if (Array.isArray(followers)) {
      await this.prisma.taskFollower.deleteMany({ where: { taskId: id } });
      if (followers.length > 0) {
        updateData.followers = {
          create: followers.map((userId: string) => ({ userId })),
        };
      }
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignees: {
          include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
        },
        followers: {
          include: { user: { select: { id: true, fullName: true, email: true, avatar: true } } },
        },
        reportTo: { select: { id: true, fullName: true, email: true, avatar: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    if (data.status && data.status !== item.status) {
      await this.prisma.taskHistory.create({
        data: {
          taskId: id,
          changedById: actorUserId || item.createdById,
          fieldChanged: 'status',
          oldValue: item.status,
          newValue: data.status,
        },
      });
    }

    this.sendTelegramNotification({
      companyId,
      taskId: id,
      actorUserId,
      type: 'TASK_UPDATED',
      task: updatedTask,
      extraInfo: data.status ? `Chuyển trạng thái sang: ${STATUS_VI_MAP[data.status] || data.status}` : 'Cập nhật thông tin',
    });

    return updatedTask;
  }

  async addComment(taskId: string, authorId: string, content: string, companyId: string) {
    const task = await this.findOne(taskId, companyId);

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId,
        authorId,
        content,
      },
      include: {
        author: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    this.sendTelegramNotification({
      companyId,
      taskId,
      actorUserId: authorId,
      type: 'COMMENT_ADDED',
      task,
      extraInfo: content,
      actorName: comment.author.fullName,
    });

    return comment;
  }

  async addAttachment(taskId: string, userId: string, fileData: any, companyId: string) {
    const task = await this.findOne(taskId, companyId);

    const attachment = await this.prisma.taskAttachment.create({
      data: {
        taskId,
        uploadedById: userId,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize || 0,
        fileType: fileData.fileType || '',
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });

    this.sendTelegramNotification({
      companyId,
      taskId,
      actorUserId: userId,
      type: 'ATTACHMENT_ADDED',
      task,
      extraInfo: fileData.fileName,
      actorName: user?.fullName || 'Nhân viên',
    });

    return attachment;
  }

  private async sendTelegramNotification(options: {
    companyId: string;
    taskId: string;
    actorUserId?: string;
    type: 'TASK_CREATED' | 'TASK_UPDATED' | 'COMMENT_ADDED' | 'ATTACHMENT_ADDED';
    task: any;
    extraInfo?: string;
    actorName?: string;
  }) {
    try {
      const { companyId, taskId, actorUserId, type, task, extraInfo, actorName } = options;

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { telegramBotToken: true, name: true },
      });

      if (!company || !company.telegramBotToken) return;

      const fullTask = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: {
          assignees: true,
          followers: true,
          createdBy: { select: { id: true, fullName: true } },
          reportTo: { select: { id: true, fullName: true } },
        },
      });

      if (!fullTask) return;

      const stakeholderIds = new Set<string>();
      if (fullTask.createdById) stakeholderIds.add(fullTask.createdById);
      if (fullTask.reportToId) stakeholderIds.add(fullTask.reportToId);
      fullTask.assignees.forEach((a) => stakeholderIds.add(a.userId));
      fullTask.followers.forEach((f) => stakeholderIds.add(f.userId));
      if (actorUserId) stakeholderIds.add(actorUserId);

      if (stakeholderIds.size === 0) return;

      const targetUsers = await this.prisma.user.findMany({
        where: { id: { in: Array.from(stakeholderIds) }, deletedAt: null },
        select: { id: true, fullName: true, telegramChatId: true },
      });

      let performer = actorName;
      if (!performer && actorUserId) {
        const actor = await this.prisma.user.findUnique({
          where: { id: actorUserId },
          select: { fullName: true },
        });
        if (actor) performer = actor.fullName;
      }
      if (!performer) {
        performer = fullTask.createdBy?.fullName || 'Hệ thống';
      }

      // Generate action snippet
      let actionSnippet = '';
      if (type === 'TASK_CREATED') {
        actionSnippet = `- Khởi tạo công việc (bởi ${performer})`;
      } else if (type === 'COMMENT_ADDED') {
        actionSnippet = `- Bình luận từ ${performer}: "${extraInfo}"`;
      } else if (type === 'ATTACHMENT_ADDED') {
        actionSnippet = `- Đính kèm file mới: ${extraInfo} (bởi ${performer})`;
      } else if (type === 'TASK_UPDATED') {
        actionSnippet = `- Cập nhật: ${extraInfo || 'Thay đổi thông tin'} (bởi ${performer})`;
      }

      // Add to debounce queue
      const queueKey = `${companyId}_${taskId}`;
      if (this.notificationQueue.has(queueKey)) {
        const existing = this.notificationQueue.get(queueKey);
        clearTimeout(existing.timeout);
        existing.updates.push(actionSnippet);
        // Merge target users to ensure all get notified
        targetUsers.forEach((u) => {
          if (!existing.targetUsers.find((tu) => tu.id === u.id)) {
            existing.targetUsers.push(u);
          }
        });
        
        // Reset timeout
        existing.timeout = setTimeout(() => {
          this.processNotificationQueue(queueKey);
        }, 20000);
      } else {
        const timeout = setTimeout(() => {
          this.processNotificationQueue(queueKey);
        }, 20000); // 20s debounce

        this.notificationQueue.set(queueKey, {
          timeout,
          companyBotToken: company.telegramBotToken,
          targetUsers: [...targetUsers],
          taskTitle: task.title,
          updates: [actionSnippet],
        });
      }
    } catch (e) {
      console.error('[TELEGRAM NOTIF ERR]', e);
    }
  }

  private async processNotificationQueue(queueKey: string) {
    try {
      const data = this.notificationQueue.get(queueKey);
      if (!data) return;
      this.notificationQueue.delete(queueKey);

      let message = `✏️ <b>CẬP NHẬT CÔNG VIỆC</b>\n\n📌 <b>Công việc:</b> ${data.taskTitle}\nℹ️ <b>Chi tiết các cập nhật mới:</b>\n`;
      data.updates.forEach((u) => {
        message += `${u}\n`;
      });
      message += `\n👉 Vui lòng truy cập DAFA Manager để xem chi tiết!`;

      for (const u of data.targetUsers) {
        if (u.telegramChatId) {
          fetch(`https://api.telegram.org/bot${data.companyBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: u.telegramChatId,
              text: message,
              parse_mode: 'HTML',
            }),
          }).catch((err) => console.error('[TELEGRAM ERR]', err));
        }
      }
    } catch (error) {
      console.error('[PROCESS QUEUE ERR]', error);
    }
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.task.delete({
      where: { id },
    });
  }
}