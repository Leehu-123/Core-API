import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkReportsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.workReport.create({ data });
  }

  async findAll(companyId: string) {
    return this.prisma.workReport.findMany({
      where: { companyId },
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.workReport.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.workReport.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.workReport.delete({
      where: { id },
    });
  }
}