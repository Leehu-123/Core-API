import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KpiCriteriaService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.kpiCriteria.create({ data });
  }

  async findAll(companyId: string) {
    return this.prisma.kpiCriteria.findMany({
      where: { companyId },
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