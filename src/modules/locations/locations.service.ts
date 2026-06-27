import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateLocationDto, UpdateLocationDto, QueryLocationDto } from './dto';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(companyId: string, query: QueryLocationDto) {
    const where: any = { companyId };

    if (query.zone) {
      where.zone = query.zone;
    }

    if (query.active !== undefined) {
      where.isActive = query.active === 'true';
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 50;

    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { inventory: true } },
        },
        orderBy: { code: 'asc' },
      }),
      this.prisma.location.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            product: {
              select: { id: true, code: true, sku: true, name: true, glassType: true, thickness: true, color: true, unit: true },
            },
          },
        },
      },
    });

    if (!location || location.companyId !== companyId) {
      throw new NotFoundException(`Location with ID "${id}" not found`);
    }

    return location;
  }

  async create(companyId: string, userId: string, dto: CreateLocationDto) {
    // Check code unique
    const existing = await this.prisma.location.findUnique({
      where: { companyId_code: { companyId, code: dto.code } },
    });
    if (existing) {
      throw new ConflictException('Mã vị trí đã tồn tại');
    }

    const location = await this.prisma.location.create({
      data: {
        ...dto,
        companyId,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'Location',
      entityId: location.id,
      newValue: JSON.stringify(location),
    });

    return location;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateLocationDto) {
    const existing = await this.findOne(id, companyId);

    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.prisma.location.findUnique({
        where: { companyId_code: { companyId, code: dto.code } },
      });
      if (codeExists) {
        throw new ConflictException('Mã vị trí đã tồn tại');
      }
    }

    const updated = await this.prisma.location.update({
      where: { id },
      data: dto,
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'Location',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async remove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    const deleted = await this.prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DELETED',
      entity: 'Location',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return deleted;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    try {
      const deleted = await this.prisma.location.delete({
        where: { id },
      });

      await this.auditLogService.log({
        companyId,
        userId,
        action: 'HARD_DELETED',
        entity: 'Location',
        entityId: id,
        oldValue: JSON.stringify(existing),
      });

      return deleted;
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException('Không thể xóa vì vị trí này đã được sử dụng (tồn kho/phiếu nhập xuất).');
      }
      throw error;
    }
  }
}
