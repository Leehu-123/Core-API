import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KpiRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.kpiRecord.create({ data });
  }

  async findAll(companyId: string, query?: any) {
    const where: any = {};
    
    // Check if the user wants to filter by companyId (via user relation)
    // KPI records belong to criteria and users, but we can verify company via user
    where.user = { companyId };

    if (query?.userId) {
      where.userId = query.userId;
    }
    
    if (query?.periodStart || query?.periodEnd) {
      where.periodStart = {};
      if (query?.periodStart) where.periodStart.gte = new Date(query.periodStart);
      if (query?.periodEnd) where.periodStart.lte = new Date(query.periodEnd);
    }

    return this.prisma.kpiRecord.findMany({
      where,
      include: {
        criteria: {
          include: { department: { select: { id: true, name: true } } }
        },
        user: { select: { id: true, fullName: true, avatarUrl: true } }
      },
      orderBy: { recordedAt: 'desc' }
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.kpiRecord.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.kpiRecord.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.kpiRecord.delete({
      where: { id },
    });
  }
}