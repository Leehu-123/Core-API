import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateSalesTaskDto, UpdateSalesTaskDto, QuerySalesTaskDto } from './dto';

@Injectable()
export class SalesTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QuerySalesTaskDto) {
    const where: any = {
      companyId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.teamId) {
      where.assignedTo = {
        teamId: query.teamId
      };
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.dueDateFrom || query.dueDateTo) {
      where.dueDate = {};
      if (query.dueDateFrom) {
        where.dueDate.gte = new Date(query.dueDateFrom);
      }
      if (query.dueDateTo) {
        where.dueDate.lte = new Date(query.dueDateTo);
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.salesTask.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { dueDate: 'asc' },
        include: {
          customer: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.salesTask.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const salesTask = await this.prisma.salesTask.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        opportunity: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!salesTask) {
      throw new NotFoundException(`Sales task with ID "${id}" not found`);
    }

    return salesTask;
  }

  async create(companyId: string, userId: string, dto: CreateSalesTaskDto) {
    const salesTask = await this.prisma.salesTask.create({
      data: {
        ...dto,
        dueDate: new Date(dto.dueDate),
        companyId,
        createdById: userId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'SalesTask',
      entityId: salesTask.id,
      newValue: JSON.stringify(salesTask),
    });

    return salesTask;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateSalesTaskDto) {
    const existing = await this.findOne(id, companyId);

    const data: any = { ...dto };
    if (dto.dueDate) {
      data.dueDate = new Date(dto.dueDate);
    }

    const updated = await this.prisma.salesTask.update({
      where: { id },
      data,
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'SalesTask',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async complete(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.salesTask.update({
      where: { id },
      data: {
        status: 'DONE',
        completedAt: new Date(),
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'SalesTask',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async cancel(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.salesTask.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'SalesTask',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    await this.prisma.salesTask.delete({
      where: { id },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DELETED',
      entity: 'SalesTask',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return existing;
  }
}
