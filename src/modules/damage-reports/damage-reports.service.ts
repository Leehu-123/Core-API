import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateDamageReportDto, UpdateDamageReportDto, QueryDamageReportDto, ProcessDamageReportDto } from './dto';
import { randomBytes } from 'crypto';

const damageInventoryStatusMap: Record<string, string> = {
  vo: 'vo',
  xuoc: 'xuoc',
  me: 'me',
  sai_quy_cach: 'loi',
  loi_gia_cong: 'loi',
  loi_van_chuyen: 'loi',
  loi_nha_cung_cap: 'loi',
  khac: 'cho_xu_ly',
};

@Injectable()
export class DamageReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async findAll(companyId: string, query: QueryDamageReportDto) {
    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.damageType) where.damageType = query.damageType;
    
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = query.dateFrom;
      if (query.dateTo) where.date.lte = query.dateTo;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        { note: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.damageReport.findMany({
        where,
        include: {
          reporter: { select: { id: true, fullName: true } },
          approver: { select: { id: true, fullName: true } },
          product: { select: { id: true, code: true, name: true, unit: true } },
          location: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.damageReport.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const report = await this.prisma.damageReport.findUnique({
      where: { id, companyId },
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        approver: { select: { id: true, fullName: true, email: true } },
        product: { select: { id: true, code: true, name: true, unit: true, areaM2: true } },
        location: { select: { id: true, code: true, name: true, zone: true } },
      },
    });

    if (!report) {
      throw new NotFoundException(`DamageReport with ID "${id}" not found`);
    }

    return report;
  }

  async create(companyId: string, userId: string, dto: CreateDamageReportDto) {
    const code = 'BL-' + randomBytes(4).toString('hex').toUpperCase();
    const damageStatus = damageInventoryStatusMap[dto.damageType] || 'cho_xu_ly';

    const fZoneLocation = await this.prisma.location.findFirst({
      where: { companyId, zone: 'F', isActive: true },
    });
    const destLocationId = fZoneLocation?.id || dto.locationId;

    const report = await this.prisma.$transaction(async (tx) => {
      // Create report first to get ID
      const r = await tx.damageReport.create({
        data: {
          companyId,
          code,
          date: dto.date || new Date(),
          reportedById: userId,
          productId: dto.productId,
          locationId: dto.locationId,
          quantity: dto.quantity,
          damageType: dto.damageType,
          reason: dto.reason,
          imagePath: dto.imagePath,
          handlingPlan: dto.handlingPlan,
          status: 'cho_xu_ly',
          note: dto.note,
        },
        include: {
          product: { select: { id: true, code: true, name: true } },
          location: { select: { id: true, code: true, name: true } },
        },
      });

      // Move to F zone with damaged status
      await this.stockMovementsService.applyMovement(tx, {
        companyId,
        type: 'dieu_chinh',
        refType: 'damage_report',
        refId: r.id,
        productId: dto.productId,
        fromLocationId: dto.locationId,
        toLocationId: destLocationId,
        quantity: dto.quantity,
        statusBefore: 'tot',
        statusAfter: damageStatus,
        note: `Báo lỗi: ${dto.reason || dto.damageType}`,
        createdById: userId,
      });

      return r;
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'DamageReport',
      entityId: report.id,
      newValue: JSON.stringify({ code: report.code, status: 'cho_xu_ly' }),
    });

    return report;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateDamageReportDto) {
    const existing = await this.prisma.damageReport.findUnique({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy biên bản lỗi');
    }

    if (existing.status !== 'cho_xu_ly') {
      throw new BadRequestException('Chỉ có thể sửa biên bản chờ xử lý');
    }

    const report = await this.prisma.damageReport.update({
      where: { id },
      data: {
        reason: dto.reason,
        handlingPlan: dto.handlingPlan,
        note: dto.note,
        imagePath: dto.imagePath,
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'DamageReport',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(report),
    });

    return this.findOne(id, companyId);
  }

  async resolve(id: string, companyId: string, userId: string, dto: ProcessDamageReportDto) {
    const existing = await this.prisma.damageReport.findUnique({ where: { id, companyId } });

    if (!existing) throw new NotFoundException('Không tìm thấy biên bản lỗi');
    if (existing.status !== 'cho_xu_ly') throw new BadRequestException('Biên bản đã được xử lý');

    const handlingPlan = dto.handlingPlan || existing.handlingPlan;

    const report = await this.prisma.$transaction(async (tx) => {
      if (handlingPlan === 'huy') {
        const fZoneLocation = await tx.location.findFirst({ where: { companyId, zone: 'F', isActive: true } });
        if (fZoneLocation) {
          const damageStatus = damageInventoryStatusMap[existing.damageType] || 'cho_xu_ly';
          
          try {
            await this.stockMovementsService.applyMovement(tx, {
              companyId,
              type: 'huy',
              refType: 'damage_report',
              refId: id,
              productId: existing.productId,
              fromLocationId: fZoneLocation.id,
              quantity: existing.quantity,
              statusBefore: damageStatus,
              note: `Hủy hàng lỗi theo biên bản ${existing.code}`,
              createdById: userId,
            });
          } catch (e) {
            // Ignore if already removed
          }
        }
      }

      return tx.damageReport.update({
        where: { id },
        data: {
          status: 'da_xu_ly',
          handlingPlan,
          note: dto.note || existing.note,
          approvedById: userId,
        },
      });
    });

    await this.auditLogService.log({ companyId, userId, action: 'RESOLVED', entity: 'DamageReport', entityId: id });
    return report;
  }

  async approve(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.damageReport.findUnique({ where: { id, companyId } });

    if (!existing) throw new NotFoundException('Không tìm thấy biên bản lỗi');
    if (existing.status !== 'cho_xu_ly') throw new BadRequestException('Biên bản đã được xử lý');

    const damageStatus = damageInventoryStatusMap[existing.damageType] || 'cho_xu_ly';
    const fZoneLocation = await this.prisma.location.findFirst({ where: { companyId, zone: 'F', isActive: true } });
    const fromLocationId = fZoneLocation?.id || existing.locationId;

    const report = await this.prisma.$transaction(async (tx) => {
      await this.stockMovementsService.applyMovement(tx, {
        companyId,
        type: 'huy',
        refType: 'damage_report',
        refId: id,
        productId: existing.productId,
        fromLocationId,
        quantity: existing.quantity,
        statusBefore: damageStatus,
        note: `Duyệt và trừ tồn kho hàng lỗi theo biên bản ${existing.code}`,
        createdById: userId,
      });

      return tx.damageReport.update({
        where: { id },
        data: {
          status: 'da_xu_ly',
          handlingPlan: 'huy',
          approvedById: userId,
        },
      });
    });

    await this.auditLogService.log({ companyId, userId, action: 'APPROVED', entity: 'DamageReport', entityId: id });
    return report;
  }

  async reject(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.damageReport.findUnique({ where: { id, companyId } });

    if (!existing) throw new NotFoundException('Không tìm thấy biên bản lỗi');
    if (existing.status !== 'cho_xu_ly') throw new BadRequestException('Biên bản đã được xử lý');

    const damageStatus = damageInventoryStatusMap[existing.damageType] || 'cho_xu_ly';
    const fZoneLocation = await this.prisma.location.findFirst({ where: { companyId, zone: 'F', isActive: true } });
    const fromLocationId = fZoneLocation?.id || existing.locationId;

    const report = await this.prisma.$transaction(async (tx) => {
      await this.stockMovementsService.applyMovement(tx, {
        companyId,
        type: 'dieu_chinh',
        refType: 'damage_report',
        refId: id,
        productId: existing.productId,
        fromLocationId,
        toLocationId: existing.locationId,
        quantity: existing.quantity,
        statusBefore: damageStatus,
        statusAfter: 'tot',
        note: `Hủy biên bản lỗi và hoàn tồn kho ${existing.code}`,
        createdById: userId,
      });

      return tx.damageReport.update({
        where: { id },
        data: {
          status: 'huy',
          approvedById: userId,
        },
      });
    });

    await this.auditLogService.log({ companyId, userId, action: 'REJECTED', entity: 'DamageReport', entityId: id });
    return report;
  }

  async cancel(id: string, companyId: string, userId: string) {
    return this.reject(id, companyId, userId);
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.damageReport.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu');
    if (!['cho_xu_ly', 'huy'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể xóa biên bản chờ xử lý hoặc đã hủy');
    }

    await this.prisma.damageReport.delete({ where: { id } });
    await this.auditLogService.log({ companyId, userId, action: 'DELETED', entity: 'DamageReport', entityId: id });
    return { success: true };
  }
}
