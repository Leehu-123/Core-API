import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.branch.create({ data });
  }

  async findAll(companyId: string) {
    return this.prisma.branch.findMany({
      where: { companyId },
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.branch.findFirst({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.branch.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.branch.delete({
      where: { id },
    });
  }
}