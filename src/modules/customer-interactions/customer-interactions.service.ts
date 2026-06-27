import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateCustomerInteractionDto, QueryCustomerInteractionDto } from './dto';

@Injectable()
export class CustomerInteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryCustomerInteractionDto) {
    const where: any = {
      companyId,
    };

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { content: { contains: query.search, mode: 'insensitive' } },
        { result: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customerInteraction.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.customerInteraction.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(query.page, query.limit, total),
    };
  }

  async findByCustomer(customerId: string, companyId: string) {
    const interactions = await this.prisma.customerInteraction.findMany({
      where: { customerId, companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    return interactions;
  }

  async create(companyId: string, userId: string, dto: CreateCustomerInteractionDto) {
    const interaction = await this.prisma.customerInteraction.create({
      data: {
        ...dto,
        nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
        companyId,
        userId,
      },
    });

    if (dto.nextFollowUpDate) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: {
          nextFollowUpDate: new Date(dto.nextFollowUpDate),
        },
      });
    }

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'CustomerInteraction',
      entityId: interaction.id,
      newValue: JSON.stringify(interaction),
    });

    return interaction;
  }

  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.customerInteraction.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Customer interaction with ID "${id}" not found`);
    }

    await this.prisma.customerInteraction.delete({
      where: { id },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DELETED',
      entity: 'CustomerInteraction',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return existing;
  }
}
