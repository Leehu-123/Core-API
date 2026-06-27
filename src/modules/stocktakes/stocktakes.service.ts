import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateStocktakeDto, UpdateStocktakeDto, QueryStocktakeDto, CompleteStocktakeDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class StocktakesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryStocktakeDto) {
    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.zone) where.zone = query.zone;
    
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = query.dateFrom;
      if (query.dateTo) where.date.lte = query.dateTo;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.stocktake.findMany({
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
      this.prisma.stocktake.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const stocktake = await this.prisma.stocktake.findUnique({
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

    if (!stocktake) {
      throw new NotFoundException(`Stocktake with ID "${id}" not found`);
    }

    return stocktake;
  }

  async create(companyId: string, userId: string, dto: CreateStocktakeDto) {
    const code = 'KK-' + randomBytes(4).toString('hex').toUpperCase();

    let stocktakeLines = dto.lines;

    // If lines not provided but zone is, auto-populate from inventory
    if ((!stocktakeLines || stocktakeLines.length === 0) && dto.zone) {
      const inventory = await this.prisma.inventory.findMany({
        where: {
          companyId,
          location: { zone: dto.zone },
          status: 'tot',
        },
      });

      stocktakeLines = inventory.map((inv) => ({
        productId: inv.productId,
        locationId: inv.locationId,
        systemQty: inv.quantity,
        actualQty: inv.quantity,
      }));
    }

    if (!stocktakeLines || stocktakeLines.length === 0) {
      throw new BadRequestException('Phiếu kiểm kê phải có ít nhất 1 dòng chi tiết hoặc chọn Khu vực để tự động điền');
    }

    const stocktake = await this.prisma.stocktake.create({
      data: {
        companyId,
        code,
        date: dto.date || new Date(),
        zone: dto.zone || null,
        status: 'dang_kiem',
        note: dto.note,
        createdById: userId,
        lines: {
          create: stocktakeLines.map((line) => ({
            productId: line.productId,
            locationId: line.locationId,
            systemQty: line.systemQty,
            actualQty: line.actualQty,
            difference: line.actualQty - line.systemQty,
            reason: line.reason,
            proposal: line.proposal,
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
      entity: 'Stocktake',
      entityId: stocktake.id,
      newValue: JSON.stringify({ code: stocktake.code, status: 'dang_kiem' }),
    });

    return stocktake;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateStocktakeDto) {
    const existing = await this.prisma.stocktake.findUnique({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    }

    if (existing.status !== 'dang_kiem') {
      throw new BadRequestException('Chỉ có thể sửa phiếu đang kiểm');
    }

    const stocktake = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.stocktake.update({
        where: { id },
        data: {
          note: dto.note !== undefined ? dto.note : existing.note,
        },
      });

      if (dto.lines) {
        await tx.stocktakeLine.deleteMany({ where: { stocktakeId: id } });
        await tx.stocktakeLine.createMany({
          data: dto.lines.map((line) => ({
            stocktakeId: id,
            productId: line.productId,
            locationId: line.locationId,
            systemQty: line.systemQty,
            actualQty: line.actualQty,
            difference: line.actualQty - line.systemQty,
            reason: line.reason,
            proposal: line.proposal,
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
      entity: 'Stocktake',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(stocktake),
    });

    return this.findOne(id, companyId);
  }

  async submit(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.stocktake.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    if (existing.status !== 'dang_kiem') throw new BadRequestException('Chỉ có thể gửi đối chiếu phiếu đang kiểm');

    const stocktake = await this.prisma.stocktake.update({
      where: { id },
      data: { status: 'cho_doi_chieu' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'SUBMITTED', entity: 'Stocktake', entityId: id });
    return stocktake;
  }

  async complete(id: string, companyId: string, userId: string, dto: CompleteStocktakeDto) {
    const existing = await this.prisma.stocktake.findUnique({
      where: { id, companyId },
      include: { lines: true },
    });

    if (!existing) throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    if (existing.status !== 'cho_doi_chieu') throw new BadRequestException('Chỉ có thể hoàn thành phiếu đang đối chiếu');

    const stocktake = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.stocktake.update({
        where: { id },
        data: { status: 'hoan_thanh', approvedById: userId },
      });

      if (dto.createAdjustment) {
        const linesWithDiff = existing.lines.filter((l) => l.difference !== 0);
        if (linesWithDiff.length > 0) {
          const adjCode = 'DC-' + randomBytes(4).toString('hex').toUpperCase();

          await tx.stockAdjustment.create({
            data: {
              companyId,
              code: adjCode,
              date: new Date(),
              reason: 'kiem_ke',
              status: 'cho_duyet',
              note: `Điều chỉnh theo kiểm kê ${existing.code}`,
              createdById: userId,
              lines: {
                create: linesWithDiff.map((line) => ({
                  productId: line.productId,
                  locationId: line.locationId,
                  qtyBefore: line.systemQty,
                  qtyAfter: line.actualQty,
                  difference: line.difference,
                  note: line.reason || null,
                })),
              },
            },
          });
        }
      }

      return updated;
    });

    await this.auditLogService.log({ companyId, userId, action: 'COMPLETED', entity: 'Stocktake', entityId: id });
    return this.findOne(id, companyId);
  }

  async cancel(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.stocktake.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    if (existing.status === 'hoan_thanh') throw new BadRequestException('Không thể hủy phiếu đã hoàn thành');

    const stocktake = await this.prisma.stocktake.update({
      where: { id },
      data: { status: 'huy' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'CANCELED', entity: 'Stocktake', entityId: id });
    return stocktake;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.stocktake.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu');
    if (!['dang_kiem', 'cho_doi_chieu', 'huy'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể xóa phiếu đang kiểm, chờ đối chiếu hoặc đã hủy');
    }

    await this.prisma.stocktake.delete({ where: { id } });
    await this.auditLogService.log({ companyId, userId, action: 'DELETED', entity: 'Stocktake', entityId: id });
    return { success: true };
  }
}
