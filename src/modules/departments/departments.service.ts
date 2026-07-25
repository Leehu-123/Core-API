import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.department.create({ data });
  }

  async findAll(companyId: string) {
    return this.prisma.department.findMany({
      where: {
        branch: { companyId }
      },
      include: {
        branch: { select: { name: true, city: true } },
        members: { include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } } },
        manager: { select: { id: true, fullName: true } }
      }
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.department.findFirst({
      where: { id },
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.department.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.department.delete({
      where: { id },
    });
  }
}