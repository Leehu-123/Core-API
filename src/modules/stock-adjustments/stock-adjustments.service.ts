import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateStockAdjustmentDto, UpdateStockAdjustmentDto, QueryStockAdjustmentDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class StockAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async findAll(companyId: string, query: QueryStockAdjustmentDto) {
    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.reason) where.reason = query.reason;
    
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = query.dateFrom;
      if (query.dateTo) where.date.lte = query.dateTo;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.stockAdjustment.findMany({
        where,
        include: {
          createdUser: { select: { id: true, fullName: true } },
          approvedUser: { select: { id: true, fullName: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockAdjustment.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const adjustment = await this.prisma.stockAdjustment.findUnique({
      where: { id, companyId },
      include: {
        createdUser: { select: { id: true, fullName: true, email: true } },
        approvedUser: { select: { id: true, fullName: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
            location: { select: { id: true, code: true, name: true, zone: true } },
          },
        },
      },
    });

    if (!adjustment) {
      throw new NotFoundException(`StockAdjustment with ID "${id}" not found`);
    }

    return adjustment;
  }

  async create(companyId: string, userId: string, dto: CreateStockAdjustmentDto) {
    const code = 'DC-' + randomBytes(4).toString('hex').toUpperCase();

    const adjustment = await this.prisma.stockAdjustment.create({
      data: {
        companyId,
        code,
        date: dto.date || new Date(),
        reason: dto.reason,
        status: 'nhap',
        note: dto.note,
        createdById: userId,
        lines: {
          create: dto.lines.map((line) => ({
            productId: line.productId,
            locationId: line.locationId,
            qtyBefore: line.qtyBefore,
            qtyAfter: line.qtyAfter,
            difference: line.qtyAfter - line.qtyBefore,
            note: line.note,
          })),
        },
      },
      include: {
        lines: {
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
      entity: 'StockAdjustment',
      entityId: adjustment.id,
      newValue: JSON.stringify({ code: adjustment.code, status: 'nhap' }),
    });

    return adjustment;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateStockAdjustmentDto) {
    const existing = await this.prisma.stockAdjustment.findUnique({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy phiếu điều chỉnh');
    }

    if (!['nhap', 'cho_duyet'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể sửa phiếu ở trạng thái Nháp hoặc Chờ duyệt');
    }

    const adjustment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.stockAdjustment.update({
        where: { id },
        data: {
          reason: dto.reason || existing.reason,
          note: dto.note !== undefined ? dto.note : existing.note,
        },
      });

      if (dto.lines) {
        await tx.stockAdjustmentLine.deleteMany({ where: { adjustmentId: id } });
        await tx.stockAdjustmentLine.createMany({
          data: dto.lines.map((line) => ({
            adjustmentId: id,
            productId: line.productId,
            locationId: line.locationId,
            qtyBefore: line.qtyBefore,
            qtyAfter: line.qtyAfter,
            difference: line.qtyAfter - line.qtyBefore,
            note: line.note,
          })),
        });
      }

      return updated;
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'StockAdjustment',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(adjustment),
    });

    return this.findOne(id, companyId);
  }

  async submit(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.stockAdjustment.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu điều chỉnh');
    if (existing.status !== 'nhap') throw new BadRequestException('Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp');

    const adjustment = await this.prisma.stockAdjustment.update({
      where: { id },
      data: { status: 'cho_duyet' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'SUBMITTED', entity: 'StockAdjustment', entityId: id });
    return adjustment;
  }

  async approve(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.stockAdjustment.findUnique({
      where: { id, companyId },
      include: { lines: true },
    });

    if (!existing) throw new NotFoundException('Không tìm thấy phiếu điều chỉnh');
    if (existing.status !== 'cho_duyet') throw new BadRequestException('Chỉ có thể duyệt phiếu ở trạng thái Chờ duyệt');

    const adjustment = await this.prisma.$transaction(async (tx) => {
      // Apply each adjustment line to inventory
      for (const line of existing.lines) {
        if (line.difference > 0) {
          // Increase: add to inventory
          await this.stockMovementsService.applyMovement(tx, {
            companyId,
            type: 'dieu_chinh',
            refType: 'stock_adjustment',
            refId: id,
            productId: line.productId,
            toLocationId: line.locationId,
            quantity: line.difference,
            statusAfter: 'tot',
            note: `Điều chỉnh tăng theo phiếu ${existing.code}`,
            createdById: userId,
          });
        } else if (line.difference < 0) {
          // Decrease: remove from inventory
          await this.stockMovementsService.applyMovement(tx, {
            companyId,
            type: 'dieu_chinh',
            refType: 'stock_adjustment',
            refId: id,
            productId: line.productId,
            fromLocationId: line.locationId,
            quantity: Math.abs(line.difference),
            statusBefore: 'tot',
            note: `Điều chỉnh giảm theo phiếu ${existing.code}`,
            createdById: userId,
          });
        }
      }

      return tx.stockAdjustment.update({
        where: { id },
        data: { status: 'da_duyet', approvedById: userId },
      });
    });

    await this.auditLogService.log({ companyId, userId, action: 'APPROVED', entity: 'StockAdjustment', entityId: id });
    return adjustment;
  }

  async cancel(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.stockAdjustment.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu điều chỉnh');
    if (existing.status === 'da_duyet') throw new BadRequestException('Không thể hủy phiếu đã duyệt');

    const adjustment = await this.prisma.stockAdjustment.update({
      where: { id },
      data: { status: 'huy' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'CANCELED', entity: 'StockAdjustment', entityId: id });
    return adjustment;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.stockAdjustment.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu');
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy');
    }

    await this.prisma.stockAdjustment.delete({ where: { id } });
    await this.auditLogService.log({ companyId, userId, action: 'DELETED', entity: 'StockAdjustment', entityId: id });
    return { success: true };
  }
}
