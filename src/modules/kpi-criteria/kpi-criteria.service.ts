import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KpiCriteriaService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.kpiCriteria.create({ data });
  }

  async findAll(companyId: string, query?: any) {
    const where: any = { companyId };
    
    if (query?.departmentId) {
      where.departmentId = query.departmentId;
    }
    
    // If a specific userId is provided, we might want to filter criteria based on their department
    if (query?.userId && !query?.departmentId) {
      const userDepts = await this.prisma.departmentMember.findMany({
        where: { userId: query.userId },
        select: { departmentId: true }
      });
      if (userDepts.length > 0) {
        where.departmentId = { in: userDepts.map(d => d.departmentId) };
      }
    }

    return this.prisma.kpiCriteria.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.kpiCriteria.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.kpiCriteria.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.kpiCriteria.delete({
      where: { id },
    });
  }
}