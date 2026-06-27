import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateKpiDto, UpdateKpiDto, QueryKpiDto } from './dto';

@Injectable()
export class KpisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryKpiDto) {
    const where: any = {
      companyId,
    };

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.month) {
      where.month = query.month;
    }

    if (query.year) {
      where.year = query.year;
    }

    const [data, total] = await Promise.all([
      this.prisma.kPI.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          user: true,
        },
      }),
      this.prisma.kPI.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const kpi = await this.prisma.kPI.findFirst({
      where: { id, companyId },
      include: {
        user: true,
      },
    });

    if (!kpi) {
      throw new NotFoundException(`KPI with ID "${id}" not found`);
    }

    return kpi;
  }

  async findByUser(userId: string, companyId: string) {
    return this.prisma.kPI.findMany({
      where: { userId, companyId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        user: true,
      },
    });
  }

  async upsert(companyId: string, userId: string, dto: CreateKpiDto) {
    const kpi = await this.prisma.kPI.upsert({
      where: {
        companyId_userId_month_year: {
          companyId,
          userId: dto.userId,
          month: dto.month,
          year: dto.year,
        },
      },
      create: {
        ...dto,
        companyId,
      },
      update: {
        targetRevenue: dto.targetRevenue,
        targetNewCustomers: dto.targetNewCustomers,
        targetInteractions: dto.targetInteractions,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPSERTED',
      entity: 'KPI',
      entityId: kpi.id,
      newValue: JSON.stringify(kpi),
    });

    return kpi;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateKpiDto) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.kPI.update({
      where: { id },
      data: dto,
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'KPI',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    await this.prisma.kPI.delete({
      where: { id },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DELETED',
      entity: 'KPI',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return existing;
  }
}
