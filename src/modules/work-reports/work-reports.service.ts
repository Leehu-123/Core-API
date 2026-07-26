import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkReportsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.workReport.create({ data });
  }

  async findAll(companyId: string, query?: any) {
    const where: any = {};
    where.template = { companyId };
    return this.prisma.workReport.findMany({
      where,
      include: {
        template: true,
        submittedBy: { select: { id: true, fullName: true, avatarUrl: true } },
        reviewedBy: { select: { id: true, fullName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.workReport.findFirst({
      where: { id, template: { companyId } },
      include: {
        template: true,
        submittedBy: { select: { id: true, fullName: true, avatarUrl: true } },
        reviewedBy: { select: { id: true, fullName: true, avatarUrl: true } }
      }
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