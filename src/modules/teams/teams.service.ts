import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from './dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.team.findMany({
      where: { companyId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id, companyId },
      include: { users: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } } },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(companyId: string, dto: CreateTeamDto) {
    return this.prisma.team.create({ data: { companyId, ...dto } });
  }

  async update(id: string, companyId: string, dto: UpdateTeamDto) {
    await this.findOne(id, companyId);
    return this.prisma.team.update({ where: { id }, data: dto });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.prisma.team.delete({ where: { id } });
    return { success: true };
  }
}
