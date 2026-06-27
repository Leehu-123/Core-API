import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateSupplierDto, UpdateSupplierDto, QuerySupplierDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async generateCode(companyId: string): Promise<string> {
    const code = 'NCC-' + randomBytes(3).toString('hex').toUpperCase();
    const existing = await this.prisma.supplier.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });
    if (existing) {
      return this.generateCode(companyId);
    }
    return code;
  }

  async findAll(companyId: string, query: QuerySupplierDto) {
    const where: any = {
      companyId,
    };

    if (query.active !== undefined) {
      where.isActive = query.active === 'true';
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 50;

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true, deletedAt: null },
          select: { id: true, code: true, sku: true, name: true },
        },
        _count: {
          select: { goodsReceipts: true },
        },
      },
    });

    if (!supplier || supplier.companyId !== companyId) {
      throw new NotFoundException(`Supplier with ID "${id}" not found`);
    }

    return supplier;
  }

  async create(companyId: string, userId: string, dto: CreateSupplierDto) {
    const code = await this.generateCode(companyId);

    const supplier = await this.prisma.supplier.create({
      data: {
        ...dto,
        code,
        companyId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'Supplier',
      entityId: supplier.id,
      newValue: JSON.stringify(supplier),
    });

    return supplier;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateSupplierDto) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: dto,
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'Supplier',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    const deleted = await this.prisma.supplier.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DELETED',
      entity: 'Supplier',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return deleted;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    try {
      const deleted = await this.prisma.supplier.delete({
        where: { id },
      });

      await this.auditLogService.log({
        companyId,
        userId,
        action: 'HARD_DELETED',
        entity: 'Supplier',
        entityId: id,
        oldValue: JSON.stringify(existing),
      });

      return deleted;
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Không thể xóa vì nhà cung cấp này đã phát sinh giao dịch.');
      }
      throw error;
    }
  }
}
