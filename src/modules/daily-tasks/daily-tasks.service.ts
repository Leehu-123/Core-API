import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DailyTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findByDate(userId: string, companyId: string, date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.prisma.dailyTask.findMany({
      where: {
        userId,
        companyId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(data: { userId: string; companyId: string; date: string; title: string }) {
    const targetDate = new Date(data.date);
    targetDate.setUTCHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    const maxTask = await this.prisma.dailyTask.findFirst({
      where: {
        userId: data.userId,
        companyId: data.companyId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { sortOrder: 'desc' },
    });
    const nextSortOrder = maxTask ? maxTask.sortOrder + 1 : 0;

    return this.prisma.dailyTask.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        date: startOfDay,
        title: data.title,
        sortOrder: nextSortOrder,
      },
    });
  }

  async toggleComplete(id: string, userId: string) {
    const task = await this.prisma.dailyTask.findFirst({
      where: { id, userId },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.dailyTask.update({
      where: { id },
      data: { isCompleted: !task.isCompleted },
    });
  }

  async update(id: string, userId: string, data: { title?: string }) {
    const task = await this.prisma.dailyTask.findFirst({
      where: { id, userId },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.dailyTask.update({
      where: { id },
      data: { title: data.title },
    });
  }

  async remove(id: string, userId: string) {
    const task = await this.prisma.dailyTask.findFirst({
      where: { id, userId },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.dailyTask.delete({
      where: { id },
    });
  }

  async reorder(userId: string, date: string, orderedIds: string[]) {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      await this.prisma.dailyTask.updateMany({
        where: { id, userId },
        data: { sortOrder: i },
      });
    }
    
    return { success: true };
  }
}
