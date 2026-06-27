import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateQuoteDto, QueryQuoteDto, UpdateQuoteDto } from './dto';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryQuoteDto) {
    const { status, customerId, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        include: {
          customer: true,
          createdBy: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quote.count({ where }),
    ]);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return { data, meta };
  }

  async findOne(id: string, companyId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        customer: true,
        createdBy: true,
        opportunity: true,
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async create(companyId: string, userId: string, dto: CreateQuoteDto) {
    const code = 'BG-' + randomBytes(4).toString('hex').toUpperCase();

    const items = (dto.items || []).map((item, index) => {
      const quantity = item.quantity || 1;
      const unitPrice = item.unitPrice || 0;
      const discount = item.discount || 0;
      const total = quantity * unitPrice - discount;

      return {
        ...item,
        quantity,
        unitPrice,
        discount,
        total,
        sortOrder: index,
      };
    });

    const shippingCost = dto.shippingCost || 0;
    const installationCost = dto.installationCost || 0;
    const vatRate = dto.vatRate || 0;

    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
    const subtotal = itemsTotal + shippingCost + installationCost;
    const vatAmount = (subtotal * vatRate) / 100;
    const total = subtotal + vatAmount;

    const quote = await this.prisma.quote.create({
      data: {
        code,
        companyId,
        customerId: dto.customerId,
        opportunityId: dto.opportunityId,
        createdById: userId,
        status: dto.status || 'DRAFT',
        expiryDate: dto.expiryDate,
        shippingCost,
        installationCost,
        vatRate,
        subtotal,
        vatAmount,
        total,
        terms: dto.terms,
        notes: dto.notes,
        items: {
          create: items,
        },
      },
      include: {
        customer: true,
        createdBy: true,
        items: true,
      },
    });

    await this.auditLog.log({
      action: 'CREATE',
      entity: 'Quote',
      entityId: quote.id,
      userId,
      companyId,
      newValue: JSON.stringify(quote),
    });

    return quote;
  }

  async update(
    id: string,
    companyId: string,
    userId: string,
    dto: UpdateQuoteDto,
  ) {
    const existing = await this.findOne(id, companyId);

    const { items: itemsDto, ...updateData } = dto;

    let itemsUpdate: any = {};
    let subtotal = existing.subtotal as number;
    let vatAmount = existing.vatAmount as number;
    let total = existing.total as number;

    if (itemsDto) {
      // Delete old items and recreate
      await this.prisma.quoteItem.deleteMany({ where: { quoteId: id } });

      const items = itemsDto.map((item, index) => {
        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || 0;
        const discount = item.discount || 0;
        const itemTotal = quantity * unitPrice - discount;

        return {
          ...item,
          quantity,
          unitPrice,
          discount,
          total: itemTotal,
          sortOrder: index,
        };
      });

      const shippingCost =
        dto.shippingCost ?? (existing.shippingCost as number) ?? 0;
      const installationCost =
        dto.installationCost ?? (existing.installationCost as number) ?? 0;
      const vatRate = dto.vatRate ?? (existing.vatRate as number) ?? 0;

      const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
      subtotal = itemsTotal + shippingCost + installationCost;
      vatAmount = (subtotal * vatRate) / 100;
      total = subtotal + vatAmount;

      itemsUpdate = {
        items: {
          create: items,
        },
      };
    } else if (
      dto.shippingCost !== undefined ||
      dto.installationCost !== undefined ||
      dto.vatRate !== undefined
    ) {
      // Recalculate totals if cost fields changed but no items provided
      const currentItems = await this.prisma.quoteItem.findMany({
        where: { quoteId: id },
      });

      const shippingCost =
        dto.shippingCost ?? (existing.shippingCost as number) ?? 0;
      const installationCost =
        dto.installationCost ?? (existing.installationCost as number) ?? 0;
      const vatRate = dto.vatRate ?? (existing.vatRate as number) ?? 0;

      const itemsTotal = currentItems.reduce(
        (sum, item) => sum + (item.total as number),
        0,
      );
      subtotal = itemsTotal + shippingCost + installationCost;
      vatAmount = (subtotal * vatRate) / 100;
      total = subtotal + vatAmount;
    }

    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        ...updateData,
        subtotal,
        vatAmount,
        total,
        ...itemsUpdate,
      },
      include: {
        customer: true,
        createdBy: true,
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.auditLog.log({
      action: 'UPDATE',
      entity: 'Quote',
      entityId: quote.id,
      userId,
      companyId,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(quote),
    });

    return quote;
  }

  async send(id: string, companyId: string, userId: string) {
    const quote = await this.findOne(id, companyId);

    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only quotes with DRAFT status can be sent',
      );
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: 'SENT' },
      include: {
        customer: true,
        createdBy: true,
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    await this.auditLog.log({
      action: 'UPDATE',
      entity: 'Quote',
      entityId: id,
      userId,
      companyId,
      oldValue: JSON.stringify({ status: 'DRAFT' }),
      newValue: JSON.stringify({ status: 'SENT' }),
    });

    return updated;
  }

  async softRemove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    return this.prisma.quote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardRemove(id: string, companyId: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    await this.prisma.quoteItem.deleteMany({ where: { quoteId: id } });
    return this.prisma.quote.delete({ where: { id } });
  }
}
