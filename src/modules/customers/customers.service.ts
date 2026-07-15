import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryCustomerDto) {
    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (query.code) {
      where.code = { contains: query.code, mode: 'insensitive' };
    }

    if (query.phone) {
      where.phone = { contains: query.phone, mode: 'insensitive' };
    }

    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.crmStatus = query.status;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.type) {
      where.customerType = query.type;
    }

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.teamId) {
      where.assignedTo = {
        teamId: query.teamId
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: { assignedTo: true },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: data.map(customer => ({
        ...customer,
        type: customer.customerType,
        status: customer.crmStatus,
        assignedTo: customer.assignedTo ? { id: customer.assignedTo.id, name: customer.assignedTo.fullName } : undefined,
      })),
      meta: new PaginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        assignedTo: true,
        interactions: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        opportunities: { orderBy: { createdAt: 'desc' } },
        quotes: { orderBy: { createdAt: 'desc' } },
        salesOrders: { orderBy: { createdAt: 'desc' } },
        salesTasks: { orderBy: { dueDate: 'asc' } },
      }
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    let productNeeds = [];
    if (customer.productNeeds) {
      try {
        productNeeds = typeof customer.productNeeds === 'string' ? JSON.parse(customer.productNeeds) : customer.productNeeds;
      } catch (e) {
        productNeeds = [customer.productNeeds];
      }
    }

    return {
      ...customer,
      type: customer.customerType,
      status: customer.crmStatus,
      productNeeds,
      orders: customer.salesOrders,
      tasks: customer.salesTasks,
      interactions: customer.interactions?.map((i: any) => ({
        ...i,
        user: i.user ? { name: i.user.fullName } : { name: 'Unknown' }
      })),
      assignedTo: customer.assignedTo ? { id: customer.assignedTo.id, name: customer.assignedTo.fullName } : undefined,
    };
  }

  private async generateCustomerCode(companyId: string) {
    const count = await this.prisma.customer.count({ where: { companyId } });
    return `CUST-${String(count + 1).padStart(4, '0')}`;
  }

  private mapCustomerDto(dto: CreateCustomerDto | UpdateCustomerDto, code?: string) {
    const source: any = dto;
    const data: any = {
      code: source.code || code,
      name: source.name,
      phone: source.phone,
      email: source.email,
      address: source.address,
      taxCode: source.taxCode,
      note: source.note ?? source.notes,
      isActive: source.isActive,
      customerType: source.type,
      contactPerson: source.contactPerson,
      province: source.province,
      projectName: source.projectName,
      source: source.source,
      crmStatus: source.status,
      productNeeds: Array.isArray(source.productNeeds) ? JSON.stringify(source.productNeeds) : source.productNeeds,
      estimatedArea: source.estimatedArea,
      estimatedBudget: source.estimatedBudget,
      nextFollowUpDate: source.nextFollowUpDate ? new Date(source.nextFollowUpDate) : undefined,
      assignedToId: source.assignedToId || null,
    };

    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
    return data;
  }

  async create(companyId: string, userId: string, dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        ...this.mapCustomerDto(dto, await this.generateCustomerCode(companyId)),
        companyId,
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'Customer',
      entityId: customer.id,
      newValue: JSON.stringify(customer),
    });

    return customer;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateCustomerDto) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...this.mapCustomerDto(dto),
        updatedById: userId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'Customer',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    const deleted = await this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: userId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DELETED',
      entity: 'Customer',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return deleted;
  }
}
