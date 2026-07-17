import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import {
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  QuerySalesOrderDto,
  AddPaymentDto,
  SalesOrderStatus,
} from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QuerySalesOrderDto) {
    const where: any = { companyId, deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.teamId) {
      where.assignedTo = {
        teamId: query.teamId
      };
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { projectName: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, fullName: true } },
          _count: { select: { items: true, payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id, companyId, deletedAt: null },
      include: {
        customer: true,
        opportunity: { select: { id: true, name: true, stage: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        payments: {
          include: {
            createdBy: { select: { id: true, fullName: true } },
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`SalesOrder with ID "${id}" not found`);
    }

    return order;
  }

  async create(companyId: string, userId: string, dto: CreateSalesOrderDto) {
    const code = 'DH-' + randomBytes(4).toString('hex').toUpperCase();

    const items = (dto.items || []).map((item, index) => {
      const qty = item.quantity ?? 1;
      const price = item.unitPrice ?? 0;
      const disc = item.discount ?? 0;
      const area = item.area ?? 0;
      const baseQty = area > 0 ? area : qty;
      const itemTotal = Math.round(baseQty * (price - disc));
      return {
        productId: item.productId,
        description: item.description,
        specification: item.specification,
        thickness: item.thickness,
        length: item.length,
        width: item.width,
        area: item.area,
        quantity: qty,
        unitPrice: price,
        discount: disc,
        total: itemTotal,
        sortOrder: item.sortOrder ?? index,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const orderDiscount = dto.discount ?? 0;
    const afterDiscount = subtotal - orderDiscount;
    const vatRate = dto.vatRate ?? 10;
    const vatAmount = afterDiscount * (vatRate / 100);
    const total = afterDiscount + vatAmount;

    const order = await this.prisma.salesOrder.create({
      data: {
        companyId,
        code,
        customerId: dto.customerId,
        assignedToId: dto.assignedToId,
        opportunityId: dto.opportunityId,
        quoteId: dto.quoteId,
        projectName: dto.projectName,
        status: 'NEW',
        paymentStatus: Math.round(total) > 0 ? 'UNPAID' : 'FULLY_PAID',
        subtotal,
        discount: orderDiscount,
        vatRate,
        vatAmount,
        total,
        paidAmount: 0,
        remainingAmount: total,
        signedDate: dto.signedDate ? new Date(dto.signedDate) : undefined,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
        notes: dto.notes,
        items: {
          create: items,
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, fullName: true } },
        items: true,
      },
    });

    if (dto.opportunityId) {
      try {
        await this.prisma.opportunity.update({
          where: { id: dto.opportunityId },
          data: { stage: 'WON' },
        });
      } catch (err) {}
    }

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'SalesOrder',
      entityId: order.id,
      newValue: JSON.stringify({ code: order.code, status: 'NEW', total }),
    });

    return order;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateSalesOrderDto) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`SalesOrder with ID "${id}" not found`);
    }

    if (!['NEW', 'CONFIRMED'].includes(existing.status)) {
      throw new BadRequestException('Can only update orders in NEW or CONFIRMED status');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      // Update basic fields
      const updateData: any = {};
      if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
      if (dto.assignedToId !== undefined) updateData.assignedToId = dto.assignedToId;
      if (dto.opportunityId !== undefined) updateData.opportunityId = dto.opportunityId;
      if (dto.quoteId !== undefined) updateData.quoteId = dto.quoteId;
      if (dto.projectName !== undefined) updateData.projectName = dto.projectName;
      if (dto.signedDate !== undefined) updateData.signedDate = dto.signedDate ? new Date(dto.signedDate) : null;
      if (dto.expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null;
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      // If items are provided, recalculate totals
      if (dto.items) {
        await tx.salesOrderItem.deleteMany({ where: { orderId: id } });

        const items = dto.items.map((item, index) => {
          const qty = item.quantity ?? 1;
          const price = item.unitPrice ?? 0;
          const disc = item.discount ?? 0;
          const area = item.area ?? 0;
          const baseQty = area > 0 ? area : qty;
          const itemTotal = Math.round(baseQty * (price - disc));
          return {
            orderId: id,
            productId: item.productId,
            description: item.description,
            specification: item.specification,
            thickness: item.thickness,
            length: item.length,
            width: item.width,
            area: item.area,
            quantity: qty,
            unitPrice: price,
            discount: disc,
            total: itemTotal,
            sortOrder: item.sortOrder ?? index,
          };
        });

        await tx.salesOrderItem.createMany({ data: items });

        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const orderDiscount = dto.discount ?? existing.discount;
        const afterDiscount = subtotal - orderDiscount;
        const vatRate = dto.vatRate ?? existing.vatRate;
        const vatAmount = afterDiscount * (vatRate / 100);
        const total = afterDiscount + vatAmount;

        updateData.subtotal = subtotal;
        updateData.discount = orderDiscount;
        updateData.vatRate = vatRate;
        updateData.vatAmount = vatAmount;
        updateData.total = total;
        updateData.remainingAmount = total - existing.paidAmount;

        // Recalculate payment status
        if (Math.round(total) === 0) {
          updateData.paymentStatus = 'FULLY_PAID';
        } else if (existing.paidAmount <= 0) {
          updateData.paymentStatus = 'UNPAID';
        } else if (Math.round(existing.paidAmount) >= Math.round(total)) {
          updateData.paymentStatus = 'FULLY_PAID';
        } else {
          updateData.paymentStatus = 'PARTIAL';
        }
      } else if (dto.discount !== undefined || dto.vatRate !== undefined) {
        // Recalc totals even if items didn't change but discount/vatRate did
        const subtotal = existing.subtotal;
        const orderDiscount = dto.discount ?? existing.discount;
        const afterDiscount = subtotal - orderDiscount;
        const vatRate = dto.vatRate ?? existing.vatRate;
        const vatAmount = afterDiscount * (vatRate / 100);
        const total = afterDiscount + vatAmount;

        updateData.discount = orderDiscount;
        updateData.vatRate = vatRate;
        updateData.vatAmount = vatAmount;
        updateData.total = total;
        updateData.remainingAmount = total - existing.paidAmount;

        if (existing.paidAmount <= 0) {
          updateData.paymentStatus = 'UNPAID';
        } else if (Math.round(existing.paidAmount) >= Math.round(total)) {
          updateData.paymentStatus = 'FULLY_PAID';
        } else {
          updateData.paymentStatus = 'PARTIAL';
        }
      }

      return tx.salesOrder.update({
        where: { id },
        data: updateData,
      });
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'SalesOrder',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(order),
    });

    return this.findOne(id, companyId);
  }

  async confirm(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`SalesOrder with ID "${id}" not found`);
    }

    if (existing.status !== 'NEW') {
      throw new BadRequestException('Can only confirm orders in NEW status');
    }

    const order = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CONFIRMED',
      entity: 'SalesOrder',
      entityId: id,
    });

    return order;
  }

  async addPayment(id: string, companyId: string, userId: string, dto: AddPaymentDto) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`SalesOrder with ID "${id}" not found`);
    }

    if (['CANCELLED'].includes(existing.status)) {
      throw new BadRequestException('Cannot add payment to a cancelled order');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.salesOrderPayment.create({
        data: {
          orderId: id,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          method: dto.method,
          reference: dto.reference,
          notes: dto.notes,
          createdById: userId,
        },
      });

      const newPaidAmount = existing.paidAmount + dto.amount;
      const newRemainingAmount = existing.total - newPaidAmount;

      let paymentStatus = 'UNPAID';
      if (Math.round(newPaidAmount) >= Math.round(existing.total)) {
        paymentStatus = 'FULLY_PAID';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'PARTIAL';
      }

      await tx.salesOrder.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          paymentStatus,
        },
      });

      return payment;
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'PAYMENT_ADDED',
      entity: 'SalesOrder',
      entityId: id,
      newValue: JSON.stringify({ amount: dto.amount, method: dto.method }),
    });

    return result;
  }

  async updateStatus(id: string, companyId: string, userId: string, status: string) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`SalesOrder with ID "${id}" not found`);
    }

    // Valid transitions
    const validTransitions: Record<string, string[]> = {
      NEW: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['DELIVERING', 'CANCELLED'],
      DELIVERING: ['DEBT_TRACKING', 'CANCELLED'],
      DEBT_TRACKING: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${existing.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    if (status === 'COMPLETED' && Math.round(existing.remainingAmount) > 0) {
      throw new BadRequestException('Cannot complete an order that is not fully paid');
    }

    const order = await this.prisma.salesOrder.update({
      where: { id },
      data: { status },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'STATUS_CHANGED',
      entity: 'SalesOrder',
      entityId: id,
      oldValue: JSON.stringify({ status: existing.status }),
      newValue: JSON.stringify({ status }),
    });

    return order;
  }

  async cancel(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`SalesOrder with ID "${id}" not found`);
    }

    if (['COMPLETED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException('Cannot cancel a completed or already cancelled order');
    }

    const order = await this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CANCELLED',
      entity: 'SalesOrder',
      entityId: id,
    });

    return order;
  }

  async softRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`SalesOrder with ID "${id}" not found`);
    }

    const order = await this.prisma.salesOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'SOFT_DELETED',
      entity: 'SalesOrder',
      entityId: id,
    });

    return order;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.salesOrder.findUnique({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`SalesOrder with ID "${id}" not found`);
    }

    if (!['NEW', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException('Can only hard delete orders in NEW or CANCELLED status');
    }

    await this.prisma.salesOrder.delete({ where: { id } });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'HARD_DELETED',
      entity: 'SalesOrder',
      entityId: id,
    });

    return { success: true };
  }
}
