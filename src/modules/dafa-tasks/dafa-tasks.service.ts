import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DafaTasksService {
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
    if (normRole === 'MANAGER') {
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
    } else if (normRole === 'EMPLOYEE' || normRole === 'SALES') {
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
      extraInfo: data.status ? `Chuyển trạng thái sang: ${data.status}` : 'Cập nhật thông tin',
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

      const priorityMap: Record<string, string> = {
        LOW: 'Thấp',
        MEDIUM: 'Trung bình',
        HIGH: 'Cao',
        URGENT: 'Khẩn cấp',
      };

      const statusMap: Record<string, string> = {
        TODO: 'Chưa bắt đầu',
        IN_PROGRESS: 'Đang thực hiện',
        REVIEW: 'Chờ duyệt',
        DONE: 'Hoàn thành',
        OVERDUE: 'Trễ hạn',
        CANCELLED: 'Đã hủy',
      };

      const deadlineStr = task.deadline
        ? new Date(task.deadline).toLocaleDateString('vi-VN')
        : 'Không có';

      let message = '';
      const performer = actorName || fullTask.createdBy?.fullName || 'Hệ thống';

      if (type === 'TASK_CREATED') {
        message = `🔔 <b>CÔNG VIỆC MỚI ĐƯỢC GIAO / NẮM THÔNG TIN</b>\n\n📌 <b>Công việc:</b> ${task.title}\n👤 <b>Người tạo:</b> ${performer}\n📝 <b>Mô tả:</b> ${task.description || 'Không có'}\n⚠️ <b>Độ ưu tiên:</b> ${priorityMap[task.priority] || task.priority}\n📅 <b>Hạn chót:</b> ${deadlineStr}\n\n👉 Vui lòng truy cập DAFA Manager để kiểm tra!`;
      } else if (type === 'COMMENT_ADDED') {
        message = `💬 <b>BÌNH LUẬN MỚI TRONG CÔNG VIỆC</b>\n\n📌 <b>Công việc:</b> ${task.title}\n👤 <b>Người bình luận:</b> ${performer}\n💬 <b>Nội dung:</b> "${extraInfo}"\n\n👉 Vui lòng truy cập DAFA Manager để phản hồi!`;
      } else if (type === 'ATTACHMENT_ADDED') {
        message = `📎 <b>FILE ĐÍNH KÈM MỚI</b>\n\n📌 <b>Công việc:</b> ${task.title}\n👤 <b>Người tải lên:</b> ${performer}\n📁 <b>Tên file:</b> ${extraInfo}\n\n👉 Vui lòng truy cập DAFA Manager để xem file!`;
      } else if (type === 'TASK_UPDATED') {
        const newStatus = statusMap[task.status] || task.status;
        message = `✏️ <b>CẬP NHẬT CÔNG VIỆC</b>\n\n📌 <b>Công việc:</b> ${task.title}\n👤 <b>Người cập nhật:</b> ${performer}\n📊 <b>Trạng thái:</b> ${newStatus}\nℹ️ <b>Chi tiết:</b> ${extraInfo || 'Cập nhật thông tin'}\n\n👉 Vui lòng truy cập DAFA Manager để xem chi tiết!`;
      }

      for (const u of targetUsers) {
        if (u.telegramChatId) {
          fetch(`https://api.telegram.org/bot${company.telegramBotToken}/sendMessage`, {
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
    } catch (e) {
      console.error('[TELEGRAM NOTIF ERR]', e);
    }
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.task.delete({
      where: { id },
    });
  }
}