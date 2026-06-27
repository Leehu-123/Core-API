import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateGoodsReceiptDto, UpdateGoodsReceiptDto, QueryGoodsReceiptDto } from './dto';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async findAll(companyId: string, query: QueryGoodsReceiptDto) {
    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;
    
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = query.dateFrom;
      if (query.dateTo) where.date.lte = query.dateTo;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { documentNo: { contains: query.search, mode: 'insensitive' } },
        { note: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          createdUser: { select: { id: true, fullName: true } },
          approvedUser: { select: { id: true, fullName: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const receipt = await this.prisma.goodsReceipt.findUnique({
      where: { id, companyId },
      include: {
        supplier: true,
        createdUser: { select: { id: true, fullName: true, email: true } },
        approvedUser: { select: { id: true, fullName: true, email: true } },
        receivedUser: { select: { id: true, fullName: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, code: true, name: true, unit: true, areaM2: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException(`GoodsReceipt with ID "${id}" not found`);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: { companyId, refType: 'goods_receipt', refId: id },
      include: {
        product: { select: { code: true, name: true } },
        toLocation: { select: { code: true, name: true } },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { ...receipt, movements };
  }

  async create(companyId: string, userId: string, dto: CreateGoodsReceiptDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Phiếu nhập phải có ít nhất 1 dòng chi tiết');
    }

    const code = 'NK-' + randomBytes(4).toString('hex').toUpperCase();

    const receipt = await this.prisma.goodsReceipt.create({
      data: {
        companyId,
        code,
        date: dto.date || new Date(),
        supplierId: dto.supplierId,
        deliveredBy: dto.deliveredBy,
        vehicleNo: dto.vehicleNo,
        receivedById: dto.receivedById,
        documentNo: dto.documentNo,
        status: 'nhap',
        note: dto.note,
        createdById: userId,
        lines: {
          create: dto.lines.map((line) => ({
            productId: line.productId,
            locationId: line.locationId,
            quantity: line.quantity,
            condition: line.condition || 'tot',
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
      entity: 'GoodsReceipt',
      entityId: receipt.id,
      newValue: JSON.stringify({ code: receipt.code, status: 'nhap' }),
    });

    return receipt;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateGoodsReceiptDto) {
    const existing = await this.prisma.goodsReceipt.findUnique({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    }

    if (!['nhap', 'cho_duyet'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể sửa phiếu ở trạng thái Nháp hoặc Chờ duyệt');
    }

    const receipt = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.goodsReceipt.update({
        where: { id },
        data: {
          date: dto.date,
          supplierId: dto.supplierId,
          deliveredBy: dto.deliveredBy,
          vehicleNo: dto.vehicleNo,
          receivedById: dto.receivedById,
          documentNo: dto.documentNo,
          note: dto.note,
        },
      });

      if (dto.lines) {
        await tx.goodsReceiptLine.deleteMany({ where: { receiptId: id } });
        await tx.goodsReceiptLine.createMany({
          data: dto.lines.map((line) => ({
            receiptId: id,
            productId: line.productId,
            locationId: line.locationId,
            quantity: line.quantity,
            condition: line.condition || 'tot',
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
      entity: 'GoodsReceipt',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(receipt),
    });

    return this.findOne(id, companyId);
  }

  async submit(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsReceipt.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (existing.status !== 'nhap') throw new BadRequestException('Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp');

    const receipt = await this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'cho_duyet' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'SUBMITTED', entity: 'GoodsReceipt', entityId: id });
    return receipt;
  }

  async approve(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsReceipt.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (existing.status !== 'cho_duyet') throw new BadRequestException('Chỉ có thể duyệt phiếu ở trạng thái Chờ duyệt');

    const receipt = await this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'da_duyet', approvedById: userId },
    });

    await this.auditLogService.log({ companyId, userId, action: 'APPROVED', entity: 'GoodsReceipt', entityId: id });
    return receipt;
  }

  async confirm(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsReceipt.findUnique({
      where: { id, companyId },
      include: { lines: true },
    });

    if (!existing) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (existing.status !== 'da_duyet') throw new BadRequestException('Chỉ có thể xác nhận nhập kho phiếu đã duyệt');

    const receipt = await this.prisma.$transaction(async (tx) => {
      for (const line of existing.lines) {
        await this.stockMovementsService.applyMovement(tx, {
          companyId,
          type: 'nhap',
          refType: 'goods_receipt',
          refId: id,
          productId: line.productId,
          toLocationId: line.locationId,
          quantity: line.quantity,
          statusAfter: line.condition === 'tot' ? 'tot' : line.condition,
          note: `Nhập kho từ phiếu ${existing.code}`,
          createdById: userId,
        });
      }

      return tx.goodsReceipt.update({
        where: { id },
        data: { status: 'da_nhap_kho' },
      });
    });

    await this.auditLogService.log({ companyId, userId, action: 'CONFIRMED', entity: 'GoodsReceipt', entityId: id });
    return receipt;
  }

  async cancel(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsReceipt.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu nhập kho');
    if (existing.status === 'da_nhap_kho') throw new BadRequestException('Không thể hủy phiếu đã nhập kho');

    const receipt = await this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'huy' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'CANCELED', entity: 'GoodsReceipt', entityId: id });
    return receipt;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsReceipt.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu');
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy');
    }

    await this.prisma.goodsReceipt.delete({ where: { id } });
    await this.auditLogService.log({ companyId, userId, action: 'DELETED', entity: 'GoodsReceipt', entityId: id });
    return { success: true };
  }
}
