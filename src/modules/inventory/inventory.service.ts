import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { QueryInventoryDto, TransferStockDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryInventoryDto) {
    const where: any = { companyId };

    if (query.locationId) {
      where.locationId = String(query.locationId);
    }
    if (query.status) {
      where.status = query.status;
    }

    const productWhere: any = { isActive: true };
    let hasProductFilter = false;

    if (query.search) {
      productWhere.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
      hasProductFilter = true;
    }
    if (query.glassType) {
      productWhere.glassType = query.glassType;
      hasProductFilter = true;
    }
    if (query.thickness) {
      productWhere.thickness = query.thickness;
      hasProductFilter = true;
    }
    if (query.color) {
      productWhere.color = query.color;
      hasProductFilter = true;
    }

    if (hasProductFilter) {
      where.product = productWhere;
    } else {
      where.product = { isActive: true };
    }

    const page = query.page || 1;
    const limit = query.limit || 50;

    const [data, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              glassType: true,
              thickness: true,
              color: true,
              standardSize: true,
              areaM2: true,
              unit: true,
              salePrice: true,
              minStock: true,
            },
          },
          location: {
            select: {
              id: true,
              code: true,
              name: true,
              zone: true,
            },
          },
        },
        orderBy: [{ product: { code: 'asc' } }, { location: { code: 'asc' } }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async getLowStockItems(companyId: string) {
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true, minStock: { gt: 0 } },
      include: {
        inventory: {
          where: { status: 'tot' },
        },
        supplier: { select: { name: true } },
      },
    });

    return products
      .map((product) => {
        const totalQty = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        return {
          id: product.id,
          code: product.code,
          name: product.name,
          glassType: product.glassType,
          thickness: product.thickness,
          color: product.color,
          unit: product.unit,
          minStock: product.minStock,
          currentStock: totalQty,
          shortage: product.minStock - totalQty,
          supplier: product.supplier?.name || null,
        };
      })
      .filter((product) => product.currentStock < product.minStock)
      .sort((a, b) => b.shortage - a.shortage);
  }

  async getDashboardStats(companyId: string) {
    const [
      totalSKUs,
      inventoryAgg,
      pendingReceipts,
      pendingIssues,
      pendingProcessing,
      damageCount,
      lowStockItems,
      recentMovements,
    ] = await Promise.all([
      this.prisma.product.count({ where: { companyId, isActive: true } }),
      this.prisma.inventory.aggregate({
        where: { companyId, product: { isActive: true }, location: { isActive: true } },
        _sum: { quantity: true },
      }),
      this.prisma.goodsReceipt.count({ where: { companyId, status: { in: ['nhap', 'cho_duyet', 'da_duyet'] } } }),
      this.prisma.goodsIssue.count({ where: { companyId, status: { in: ['nhap', 'cho_duyet', 'da_duyet'] } } }),
      this.prisma.processingOrder.count({ where: { companyId, status: { in: ['nhap', 'cho_duyet', 'cho_vat_tu', 'dang_gia_cong'] } } }),
      this.prisma.inventory.aggregate({
        where: { 
          companyId,
          status: { in: ['vo', 'xuoc', 'me', 'loi', 'cho_xu_ly'] },
          product: { isActive: true }, 
          location: { isActive: true } 
        },
        _sum: { quantity: true },
      }),
      this.getLowStockItems(companyId),
      this.prisma.stockMovement.findMany({
        where: { companyId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { code: true, name: true } },
          user: { select: { fullName: true } },
        },
      }),
    ]);

    const inventoryWithArea = await this.prisma.inventory.findMany({
      where: { companyId, product: { isActive: true }, location: { isActive: true } },
      include: { product: { select: { areaM2: true } } },
    });
    const totalAreaM2 = inventoryWithArea.reduce(
      (sum, inv) => sum + inv.quantity * (inv.product.areaM2 || 0),
      0
    );

    const finishedProducts = await this.prisma.inventory.aggregate({
      where: { 
        companyId,
        status: 'thanh_pham',
        product: { isActive: true },
        location: { isActive: true }
      },
      _sum: { quantity: true },
    });

    return {
      totalSKUs,
      totalQuantity: inventoryAgg._sum.quantity || 0,
      totalAreaM2: Math.round(totalAreaM2 * 100) / 100,
      pendingReceipts,
      pendingIssues,
      pendingProcessing,
      finishedProducts: finishedProducts._sum.quantity || 0,
      damagedItems: damageCount._sum.quantity || 0,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 10),
      recentMovements,
    };
  }

  async getHistory(productId: string, companyId: string) {
    const [inventory, movements] = await Promise.all([
      this.prisma.inventory.findMany({
        where: { productId, companyId },
        include: {
          location: { select: { id: true, code: true, name: true, zone: true } },
        },
        orderBy: { location: { code: 'asc' } },
      }),
      this.prisma.stockMovement.findMany({
        where: { productId, companyId },
        include: {
          fromLocation: { select: { code: true, name: true } },
          toLocation: { select: { code: true, name: true } },
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { inventory, movements };
  }

  async transferStock(companyId: string, userId: string, dto: TransferStockDto) {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Vị trí nguồn và đích phải khác nhau');
    }

    const itemStatus = dto.status || 'tot';

    const result = await this.prisma.$transaction(async (tx) => {
      const code = 'DC-' + randomBytes(4).toString('hex').toUpperCase();
      const adjustment = await tx.stockAdjustment.create({
        data: {
          companyId,
          code,
          date: new Date(),
          reason: 'chuyen_vi_tri',
          status: 'da_duyet',
          note: dto.note || 'Chuyển vị trí nhanh',
          createdById: userId,
          approvedById: userId,
        }
      });

      const fromInv = await tx.inventory.findFirst({
        where: { companyId, productId: dto.productId, locationId: dto.fromLocationId, status: itemStatus }
      });
      const toInv = await tx.inventory.findFirst({
        where: { companyId, productId: dto.productId, locationId: dto.toLocationId, status: itemStatus }
      });

      const qtyBeforeFrom = fromInv?.quantity || 0;
      const qtyBeforeTo = toInv?.quantity || 0;

      if (qtyBeforeFrom < dto.quantity) {
        throw new BadRequestException(`Kho nguồn không đủ số lượng. Tồn hiện tại: ${qtyBeforeFrom}`);
      }

      await tx.stockAdjustmentLine.create({
        data: {
          adjustmentId: adjustment.id,
          productId: dto.productId,
          locationId: dto.fromLocationId,
          qtyBefore: qtyBeforeFrom,
          qtyAfter: qtyBeforeFrom - dto.quantity,
          difference: -dto.quantity,
          note: 'Xuất chuyển vị trí',
        }
      });

      await tx.stockAdjustmentLine.create({
        data: {
          adjustmentId: adjustment.id,
          productId: dto.productId,
          locationId: dto.toLocationId,
          qtyBefore: qtyBeforeTo,
          qtyAfter: qtyBeforeTo + dto.quantity,
          difference: dto.quantity,
          note: 'Nhập chuyển vị trí',
        }
      });

      // Actual inventory update
      await tx.inventory.update({
        where: { id: fromInv!.id },
        data: { quantity: qtyBeforeFrom - dto.quantity },
      });

      if (toInv) {
        await tx.inventory.update({
          where: { id: toInv.id },
          data: { quantity: qtyBeforeTo + dto.quantity },
        });
      } else {
        await tx.inventory.create({
          data: {
            companyId,
            productId: dto.productId,
            locationId: dto.toLocationId,
            quantity: dto.quantity,
            status: itemStatus,
          }
        });
      }

      await tx.stockMovement.create({
        data: {
          companyId,
          type: 'chuyen_vi_tri',
          refType: 'stock_adjustment',
          refId: adjustment.id,
          productId: dto.productId,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          quantity: dto.quantity,
          statusBefore: itemStatus,
          statusAfter: itemStatus,
          note: dto.note || 'Chuyển vị trí nhanh',
          createdById: userId,
        }
      });

      return adjustment;
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'StockTransfer',
      entityId: result.id,
      newValue: JSON.stringify(dto),
    });

    return result;
  }
}
