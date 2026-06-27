import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateProcessingOrderDto, UpdateProcessingOrderDto, QueryProcessingOrderDto, CompleteProcessingOrderDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ProcessingOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async findAll(companyId: string, query: QueryProcessingOrderDto) {
    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.processType) where.processType = query.processType;
    if (query.customerId) where.customerId = query.customerId;
    
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = query.dateFrom;
      if (query.dateTo) where.date.lte = query.dateTo;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { projectName: { contains: query.search, mode: 'insensitive' } },
        { note: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.processingOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          createdUser: { select: { id: true, fullName: true } },
          approvedUser: { select: { id: true, fullName: true } },
          _count: { select: { inputs: true, outputs: true, wastes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.processingOrder.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const order = await this.prisma.processingOrder.findUnique({
      where: { id, companyId },
      include: {
        customer: true,
        createdUser: { select: { id: true, fullName: true, email: true } },
        approvedUser: { select: { id: true, fullName: true, email: true } },
        inputs: {
          include: {
            product: { select: { id: true, code: true, name: true, unit: true, areaM2: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
        outputs: {
          include: {
            location: { select: { id: true, code: true, name: true } },
            customer: { select: { id: true, name: true } },
          },
        },
        wastes: {
          include: {
            product: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`ProcessingOrder with ID "${id}" not found`);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: { companyId, refType: 'processing_order', refId: id },
      include: {
        product: { select: { code: true, name: true } },
        fromLocation: { select: { code: true, name: true } },
        toLocation: { select: { code: true, name: true } },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { ...order, movements };
  }

  async create(companyId: string, userId: string, dto: CreateProcessingOrderDto) {
    if (!dto.inputs || dto.inputs.length === 0) {
      throw new BadRequestException('Lệnh gia công phải có ít nhất 1 vật tư đầu vào');
    }

    const code = 'GC-' + randomBytes(4).toString('hex').toUpperCase();

    const order = await this.prisma.processingOrder.create({
      data: {
        companyId,
        code,
        date: dto.date || new Date(),
        customerId: dto.customerId,
        projectName: dto.projectName,
        requestedBy: dto.requestedBy,
        assignedTo: dto.assignedTo,
        dueDate: dto.dueDate,
        processType: dto.processType,
        status: 'nhap',
        note: dto.note,
        createdById: userId,
        inputs: {
          create: dto.inputs.map((input) => ({
            productId: input.productId,
            locationId: input.locationId,
            quantity: input.quantity,
            areaM2: input.areaM2,
            note: input.note,
          })),
        },
      },
      include: {
        inputs: {
          include: {
            product: { select: { id: true, code: true, name: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'ProcessingOrder',
      entityId: order.id,
      newValue: JSON.stringify({ code: order.code, status: 'nhap' }),
    });

    return order;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateProcessingOrderDto) {
    const existing = await this.prisma.processingOrder.findUnique({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy lệnh gia công');
    }

    if (!['nhap', 'cho_duyet'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể sửa lệnh ở trạng thái Nháp hoặc Chờ duyệt');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.processingOrder.update({
        where: { id },
        data: {
          date: dto.date,
          customerId: dto.customerId,
          projectName: dto.projectName,
          requestedBy: dto.requestedBy,
          assignedTo: dto.assignedTo,
          dueDate: dto.dueDate,
          processType: dto.processType,
          note: dto.note,
        },
      });

      if (dto.inputs) {
        await tx.processingInput.deleteMany({ where: { processingOrderId: id } });
        await tx.processingInput.createMany({
          data: dto.inputs.map((input) => ({
            processingOrderId: id,
            productId: input.productId,
            locationId: input.locationId,
            quantity: input.quantity,
            areaM2: input.areaM2,
            note: input.note,
          })),
        });
      }

      return updated;
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'ProcessingOrder',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(order),
    });

    return this.findOne(id, companyId);
  }

  async submit(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.processingOrder.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy lệnh gia công');
    if (existing.status !== 'nhap') throw new BadRequestException('Chỉ có thể gửi duyệt lệnh ở trạng thái Nháp');

    const order = await this.prisma.processingOrder.update({
      where: { id },
      data: { status: 'cho_duyet' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'SUBMITTED', entity: 'ProcessingOrder', entityId: id });
    return order;
  }

  async approve(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.processingOrder.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy lệnh gia công');
    if (existing.status !== 'cho_duyet') throw new BadRequestException('Chỉ có thể duyệt lệnh ở trạng thái Chờ duyệt');

    const order = await this.prisma.processingOrder.update({
      where: { id },
      data: { status: 'cho_vat_tu', approvedById: userId },
    });

    await this.auditLogService.log({ companyId, userId, action: 'APPROVED', entity: 'ProcessingOrder', entityId: id });
    return order;
  }

  async start(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.processingOrder.findUnique({
      where: { id, companyId },
      include: { inputs: true },
    });

    if (!existing) throw new NotFoundException('Không tìm thấy lệnh gia công');
    if (!['cho_vat_tu', 'da_duyet'].includes(existing.status) && existing.status !== 'cho_vat_tu') {
      throw new BadRequestException('Lệnh chưa sẵn sàng để bắt đầu gia công');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      // Move inputs to 'dang_gia_cong'
      for (const input of existing.inputs) {
        await this.stockMovementsService.applyMovement(tx, {
          companyId,
          type: 'gia_cong_xuat',
          refType: 'processing_order',
          refId: id,
          productId: input.productId,
          fromLocationId: input.locationId,
          toLocationId: input.locationId,
          quantity: input.quantity,
          statusBefore: 'tot',
          statusAfter: 'dang_gia_cong',
          note: `Xuất gia công cho lệnh ${existing.code}`,
          createdById: userId,
        });
      }

      return tx.processingOrder.update({
        where: { id },
        data: { status: 'dang_gia_cong' },
      });
    });

    await this.auditLogService.log({ companyId, userId, action: 'STARTED', entity: 'ProcessingOrder', entityId: id });
    return order;
  }

  async complete(id: string, companyId: string, userId: string, dto: CompleteProcessingOrderDto) {
    const existing = await this.prisma.processingOrder.findUnique({
      where: { id, companyId },
      include: { inputs: true },
    });

    if (!existing) throw new NotFoundException('Không tìm thấy lệnh gia công');
    if (existing.status !== 'dang_gia_cong') throw new BadRequestException('Chỉ có thể hoàn thành lệnh đang gia công');

    await this.prisma.$transaction(async (tx) => {
      // 1. Remove input materials from dang_gia_cong status completely
      for (const input of existing.inputs) {
        const inv = await tx.inventory.findUnique({
          where: {
            companyId_productId_locationId_status: {
              companyId,
              productId: input.productId,
              locationId: input.locationId,
              status: 'dang_gia_cong',
            },
          },
        });
        if (inv) {
          const newQty = inv.quantity - input.quantity;
          if (newQty <= 0) {
            await tx.inventory.delete({ where: { id: inv.id } });
          } else {
            await tx.inventory.update({ where: { id: inv.id }, data: { quantity: newQty } });
          }
        }
      }

      // 2. Create outputs
      if (dto.outputs && dto.outputs.length > 0) {
        for (const output of dto.outputs) {
          await tx.processingOutput.create({
            data: {
              processingOrderId: id,
              productCode: output.productCode,
              productName: output.productName,
              lengthMm: output.lengthMm,
              widthMm: output.widthMm,
              thickness: output.thickness,
              quantity: output.quantity,
              areaM2: output.areaM2,
              locationId: output.locationId,
              customerId: output.customerId,
              projectName: output.projectName,
              note: output.note,
            },
          });

          // If it maps to a specific productId and location, add to inventory as thanh_pham
          if (output.locationId && output.productId) {
            await this.stockMovementsService.applyMovement(tx, {
              companyId,
              type: 'gia_cong_nhap',
              refType: 'processing_order',
              refId: id,
              productId: output.productId,
              toLocationId: output.locationId,
              quantity: output.quantity,
              statusAfter: 'thanh_pham',
              note: `Thành phẩm từ lệnh ${existing.code}`,
              createdById: userId,
            });
          }
        }
      }

      // 3. Create wastes
      if (dto.wastes && dto.wastes.length > 0) {
        for (const waste of dto.wastes) {
          await tx.processingWaste.create({
            data: {
              processingOrderId: id,
              wasteType: waste.wasteType,
              productId: waste.productId,
              quantity: waste.quantity,
              areaM2: waste.areaM2,
              reason: waste.reason,
              reusable: waste.reusable || false,
              note: waste.note,
            },
          });
        }
      }

      // 4. Update status
      await tx.processingOrder.update({
        where: { id },
        data: { status: 'hoan_thanh' },
      });
    });

    await this.auditLogService.log({ companyId, userId, action: 'COMPLETED', entity: 'ProcessingOrder', entityId: id });
    return this.findOne(id, companyId);
  }

  async cancel(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.processingOrder.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy lệnh gia công');
    if (['hoan_thanh', 'huy'].includes(existing.status)) {
      throw new BadRequestException('Không thể hủy lệnh đã hoàn thành hoặc đã hủy');
    }

    const order = await this.prisma.processingOrder.update({
      where: { id },
      data: { status: 'huy' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'CANCELED', entity: 'ProcessingOrder', entityId: id });
    return order;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.processingOrder.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu');
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể xóa lệnh Nháp, Chờ duyệt hoặc Đã hủy');
    }

    await this.prisma.processingOrder.delete({ where: { id } });
    await this.auditLogService.log({ companyId, userId, action: 'DELETED', entity: 'ProcessingOrder', entityId: id });
    return { success: true };
  }
}
