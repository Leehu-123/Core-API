import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateProductDto, UpdateProductDto, QueryProductDto, GenerateCodeDto } from './dto';

const GLASS_TYPE_MAP: Record<string, string> = {
  kinh_thuong: 'KT',
  kinh_cuong_luc: 'KCL',
  kinh_dan: 'KD',
  kinh_hop: 'KH',
  kinh_phan_quang: 'KPQ',
  kinh_mau: 'KM',
  kinh_low_e: 'KLE',
  khac: 'K',
};

const COLOR_MAP: Record<string, string> = {
  trang: 'TR',
  xanh: 'XD',
  tra: 'TRA',
  xam: 'XAM',
  den: 'DEN',
  nau: 'NAU',
  hong: 'HON',
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryProductDto) {
    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (query.sku) {
      where.sku = { contains: query.sku, mode: 'insensitive' };
    }

    if (query.barcode) {
      where.barcode = { contains: query.barcode, mode: 'insensitive' };
    }

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.glassType) {
      where.glassType = query.glassType;
    }

    if (query.active !== undefined) {
      where.isActive = query.active === 'true';
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 50;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  generateItemCode(dto: GenerateCodeDto): string {
    const typeCode = GLASS_TYPE_MAP[dto.glassType] || 'K';
    const colorCode = COLOR_MAP[dto.color] || dto.color.toUpperCase().substring(0, 3);
    const thicknessStr = String(dto.thickness);
    return `DAFA-${typeCode}-${thicknessStr}-${colorCode}-${dto.size}`;
  }

  async create(companyId: string, userId: string, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        ...dto,
        code: dto.code || dto.sku, // Default code to sku if not provided
        companyId,
        createdById: userId,
        updatedById: userId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'Product',
      entityId: product.id,
      newValue: JSON.stringify(product),
    });

    return product;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateProductDto) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'Product',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    const deleted = await this.prisma.product.update({
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
      entity: 'Product',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return deleted;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    try {
      const deleted = await this.prisma.product.delete({
        where: { id },
      });

      await this.auditLogService.log({
        companyId,
        userId,
        action: 'HARD_DELETED',
        entity: 'Product',
        entityId: id,
        oldValue: JSON.stringify(existing),
      });

      return deleted;
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new Error('Không thể xóa vì sản phẩm/vật tư này đã phát sinh giao dịch/tồn kho.');
      }
      throw error;
    }
  }
}
