import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateOpportunityDto, UpdateOpportunityDto, QueryOpportunityDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryOpportunityDto) {
    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (query.stage) where.stage = query.stage;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.teamId) {
      where.assignedTo = {
        teamId: query.teamId
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { projectName: { contains: query.search, mode: 'insensitive' } },
        { products: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, fullName: true } },
        },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        customer: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
        quotes: true,
        salesOrders: true,
        salesTasks: true,
      },
    });

    if (!opportunity) {
      throw new NotFoundException(`Opportunity with ID "${id}" not found`);
    }

    return opportunity;
  }

  async create(companyId: string, userId: string, dto: CreateOpportunityDto) {
    const code = 'CH-' + randomBytes(4).toString('hex').toUpperCase();

    const opportunity = await this.prisma.opportunity.create({
      data: {
        ...dto,
        companyId,
        code,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'Opportunity',
      entityId: opportunity.id,
      newValue: JSON.stringify(opportunity),
    });

    return opportunity;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateOpportunityDto) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: {
        ...dto,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'Opportunity',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async softRemove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    const deleted = await this.prisma.opportunity.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DELETED',
      entity: 'Opportunity',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return deleted;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.opportunity.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Opportunity with ID "${id}" not found`);
    }

    await this.prisma.opportunity.delete({ where: { id } });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'HARD_DELETED',
      entity: 'Opportunity',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return { success: true };
  }
}
