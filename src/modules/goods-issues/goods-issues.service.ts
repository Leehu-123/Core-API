import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateGoodsIssueDto, UpdateGoodsIssueDto, QueryGoodsIssueDto } from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class GoodsIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async findAll(companyId: string, query: QueryGoodsIssueDto) {
    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.issueType) where.issueType = query.issueType;
    if (query.customerId) where.customerId = query.customerId;
    
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = query.dateFrom;
      if (query.dateTo) where.date.lte = query.dateTo;
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { orderRef: { contains: query.search, mode: 'insensitive' } },
        { projectName: { contains: query.search, mode: 'insensitive' } },
        { receiverName: { contains: query.search, mode: 'insensitive' } },
        { note: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.goodsIssue.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          createdUser: { select: { id: true, fullName: true } },
          approvedUser: { select: { id: true, fullName: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.goodsIssue.count({ where }),
    ]);

    return {
      data,
      meta: new PaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const issue = await this.prisma.goodsIssue.findUnique({
      where: { id, companyId },
      include: {
        customer: true,
        createdUser: { select: { id: true, fullName: true, email: true } },
        approvedUser: { select: { id: true, fullName: true, email: true } },
        lines: {
          include: {
            product: { select: { id: true, code: true, name: true, unit: true, areaM2: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!issue) {
      throw new NotFoundException(`GoodsIssue with ID "${id}" not found`);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: { companyId, refType: 'goods_issue', refId: id },
      include: {
        product: { select: { code: true, name: true } },
        fromLocation: { select: { code: true, name: true } },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { ...issue, movements };
  }

  async create(companyId: string, userId: string, dto: CreateGoodsIssueDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Phiếu xuất phải có ít nhất 1 dòng chi tiết');
    }

    const code = 'XK-' + randomBytes(4).toString('hex').toUpperCase();

    const issue = await this.prisma.goodsIssue.create({
      data: {
        companyId,
        code,
        date: dto.date || new Date(),
        issueType: dto.issueType,
        customerId: dto.customerId,
        projectName: dto.projectName,
        requestedBy: dto.requestedBy,
        receiverName: dto.receiverName,
        orderRef: dto.orderRef,
        vehicleNo: dto.vehicleNo,
        status: 'nhap',
        note: dto.note,
        createdById: userId,
        lines: {
          create: dto.lines.map((line) => ({
            productId: line.productId,
            locationId: line.locationId,
            requestedQty: line.requestedQty,
            actualQty: line.actualQty || 0,
            condition: line.condition,
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
      entity: 'GoodsIssue',
      entityId: issue.id,
      newValue: JSON.stringify({ code: issue.code, status: 'nhap' }),
    });

    return issue;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateGoodsIssueDto) {
    const existing = await this.prisma.goodsIssue.findUnique({ where: { id, companyId } });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    }

    if (!['nhap', 'cho_duyet'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể sửa phiếu ở trạng thái Nháp hoặc Chờ duyệt');
    }

    const issue = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.goodsIssue.update({
        where: { id },
        data: {
          date: dto.date,
          issueType: dto.issueType,
          customerId: dto.customerId,
          projectName: dto.projectName,
          requestedBy: dto.requestedBy,
          receiverName: dto.receiverName,
          orderRef: dto.orderRef,
          vehicleNo: dto.vehicleNo,
          note: dto.note,
        },
      });

      if (dto.lines) {
        await tx.goodsIssueLine.deleteMany({ where: { issueId: id } });
        await tx.goodsIssueLine.createMany({
          data: dto.lines.map((line) => ({
            issueId: id,
            productId: line.productId,
            locationId: line.locationId,
            requestedQty: line.requestedQty,
            actualQty: line.actualQty || 0,
            condition: line.condition,
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
      entity: 'GoodsIssue',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(issue),
    });

    return this.findOne(id, companyId);
  }

  async submit(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsIssue.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    if (existing.status !== 'nhap') throw new BadRequestException('Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp');

    const issue = await this.prisma.goodsIssue.update({
      where: { id },
      data: { status: 'cho_duyet' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'SUBMITTED', entity: 'GoodsIssue', entityId: id });
    return issue;
  }

  async approve(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsIssue.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    if (existing.status !== 'cho_duyet') throw new BadRequestException('Chỉ có thể duyệt phiếu ở trạng thái Chờ duyệt');

    const issue = await this.prisma.goodsIssue.update({
      where: { id },
      data: { status: 'da_duyet', approvedById: userId },
    });

    await this.auditLogService.log({ companyId, userId, action: 'APPROVED', entity: 'GoodsIssue', entityId: id });
    return issue;
  }

  async confirm(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsIssue.findUnique({
      where: { id, companyId },
      include: { lines: true },
    });

    if (!existing) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    if (existing.status !== 'da_duyet') throw new BadRequestException('Chỉ có thể xác nhận xuất kho phiếu đã duyệt');

    const issue = await this.prisma.$transaction(async (tx) => {
      for (const line of existing.lines) {
        const qtyToIssue = line.actualQty > 0 ? line.actualQty : line.requestedQty;
        
        await this.stockMovementsService.applyMovement(tx, {
          companyId,
          type: 'xuat',
          refType: 'goods_issue',
          refId: id,
          productId: line.productId,
          fromLocationId: line.locationId,
          quantity: qtyToIssue,
          statusBefore: line.condition || 'tot',
          note: `Xuất kho từ phiếu ${existing.code}`,
          createdById: userId,
        });

        // Update actual qty if it wasn't set
        if (line.actualQty === 0) {
          await tx.goodsIssueLine.update({
            where: { id: line.id },
            data: { actualQty: qtyToIssue },
          });
        }
      }

      return tx.goodsIssue.update({
        where: { id },
        data: { status: 'da_xuat_kho' },
      });
    });

    await this.auditLogService.log({ companyId, userId, action: 'CONFIRMED', entity: 'GoodsIssue', entityId: id });
    return issue;
  }

  async cancel(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsIssue.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu xuất kho');
    if (existing.status === 'da_xuat_kho') throw new BadRequestException('Không thể hủy phiếu đã xuất kho');

    const issue = await this.prisma.goodsIssue.update({
      where: { id },
      data: { status: 'huy' },
    });

    await this.auditLogService.log({ companyId, userId, action: 'CANCELED', entity: 'GoodsIssue', entityId: id });
    return issue;
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.prisma.goodsIssue.findUnique({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Không tìm thấy phiếu');
    if (!['nhap', 'cho_duyet', 'huy'].includes(existing.status)) {
      throw new BadRequestException('Chỉ có thể xóa phiếu Nháp, Chờ duyệt hoặc Đã hủy');
    }

    await this.prisma.goodsIssue.delete({ where: { id } });
    await this.auditLogService.log({ companyId, userId, action: 'DELETED', entity: 'GoodsIssue', entityId: id });
    return { success: true };
  }
}
