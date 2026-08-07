import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateBusinessTripDto, UpdateBusinessTripDto, QueryBusinessTripDto, AddDailyReportDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class BusinessTripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly telegram: TelegramService,
  ) {}

  async findAll(companyId: string, query: QueryBusinessTripDto) {
    const where: any = {
      companyId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.teamId) {
      where.user = {
        teamId: query.teamId
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { destination: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.businessTrip.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          _count: {
            select: { reports: true }
          }
        },
      }),
      this.prisma.businessTrip.count({ where }),
    ]);

    return {
      data: data.map(trip => ({
        ...trip,
        user: trip.user ? { ...trip.user, name: trip.user.fullName } : null,
      })),
      meta: new PaginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(id: string, companyId: string) {
    const trip = await this.prisma.businessTrip.findFirst({
      where: { id, companyId },
      include: {
        user: true,
        reports: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Business trip with ID "${id}" not found`);
    }

    return {
      ...trip,
      user: trip.user ? { ...trip.user, name: trip.user.fullName } : null,
    };
  }

  async create(companyId: string, userId: string, dto: CreateBusinessTripDto) {
    const code = 'CT-' + randomBytes(4).toString('hex').toUpperCase();

    const trip = await this.prisma.businessTrip.create({
      data: {
        ...dto,
        code,
        companyId,
        userId,
        status: 'PROPOSED',
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'BusinessTrip',
      entityId: trip.id,
      newValue: JSON.stringify(trip),
    });

    // Thông báo cho Kế toán và Admin/Manager khi có đề xuất mới
    this.notifications.sendToUsersByRoles(['ADMIN', 'MANAGER', 'ACCOUNTANT'], {
      title: 'Đề xuất công tác mới',
      body: `Đề xuất công tác mới: ${trip.title} đang chờ Kế toán duyệt chi phí.`,
      url: `/trips/${trip.id}`,
    }).catch(console.error);

    return trip;
  }

  async update(id: string, companyId: string, userId: string, dto: UpdateBusinessTripDto) {
    const existing = await this.findOne(id, companyId);

    const updated = await this.prisma.businessTrip.update({
      where: { id },
      data: dto,
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'UPDATED',
      entity: 'BusinessTrip',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  // Bước 1: Kế toán duyệt chi phí (PROPOSED → ACCOUNTANT_APPROVED)
  async accountantApprove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    if (existing.status !== 'PROPOSED') {
      throw new BadRequestException('Chỉ phiếu ở trạng thái "Đề xuất" mới có thể được Kế toán duyệt');
    }

    const updated = await this.prisma.businessTrip.update({
      where: { id },
      data: { status: 'ACCOUNTANT_APPROVED' },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'ACCOUNTANT_APPROVED',
      entity: 'BusinessTrip',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    // Thông báo cho Admin/Manager biết KT đã duyệt, chờ LĐ phê duyệt
    this.notifications.sendToUsersByRoles(['ADMIN', 'MANAGER'], {
      title: 'Kế toán đã duyệt chi phí công tác',
      body: `Phiếu công tác "${existing.title}" đã được Kế toán duyệt chi phí. Chờ Lãnh đạo phê duyệt.`,
      url: `/trips/${id}`,
    }).catch(console.error);

    return updated;
  }

  // Bước 2: Lãnh đạo phê duyệt cuối (ACCOUNTANT_APPROVED → APPROVED)
  async approve(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    if (existing.status !== 'ACCOUNTANT_APPROVED') {
      throw new BadRequestException('Chỉ phiếu đã được Kế toán duyệt mới có thể được Lãnh đạo phê duyệt');
    }

    const updated = await this.prisma.businessTrip.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'APPROVED',
      entity: 'BusinessTrip',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async reject(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    // Cho phép từ chối từ cả PROPOSED (KT từ chối) lẫn ACCOUNTANT_APPROVED (LĐ từ chối)
    if (!['PROPOSED', 'ACCOUNTANT_APPROVED'].includes(existing.status)) {
      throw new BadRequestException('Chỉ phiếu ở trạng thái "Đề xuất" hoặc "KT đã duyệt" mới có thể bị từ chối');
    }

    const updated = await this.prisma.businessTrip.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'REJECTED',
      entity: 'BusinessTrip',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async start(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    if (existing.status !== 'APPROVED') {
      throw new BadRequestException('Only APPROVED trips can be started');
    }

    const updated = await this.prisma.businessTrip.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'STARTED',
      entity: 'BusinessTrip',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async complete(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    if (existing.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Only IN_PROGRESS trips can be completed');
    }

    const updated = await this.prisma.businessTrip.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'COMPLETED',
      entity: 'BusinessTrip',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return updated;
  }

  async addDailyReport(tripId: string, companyId: string, userId: string, dto: AddDailyReportDto) {
    const trip = await this.findOne(tripId, companyId);

    // Get user info for notification
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const report = await this.prisma.tripDailyReport.create({
      data: {
        ...dto,
        tripId,
      },
    });

    // Update trip totals
    const newClientsIncrement = dto.newClients || 0;
    const oldClientsIncrement = dto.oldClients || 0;

    await this.prisma.businessTrip.update({
      where: { id: tripId },
      data: {
        totalNewClients: { increment: newClientsIncrement },
        totalOldClients: { increment: oldClientsIncrement },
      },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'CREATED',
      entity: 'TripDailyReport',
      entityId: report.id,
      newValue: JSON.stringify(report),
    });

    // Push notification to admin/manager
    this.notifications.sendToUsersByRoles(['ADMIN', 'MANAGER'], {
      title: 'Báo cáo công tác mới',
      body: `${user?.fullName || 'Nhân viên'} vừa cập nhật báo cáo ngày cho chuyến "${trip.title}".`,
      url: `/trips/${tripId}`,
    }).catch(console.error);

    // Telegram notification to admin users
    const reportDate = dto.date ? new Date(dto.date).toLocaleDateString('vi-VN') : 'N/A';
    const contentPreview = (dto.content || '').substring(0, 100) + ((dto.content || '').length > 100 ? '...' : '');
    const telegramMsg = [
      '📋 *Báo cáo công tác mới*',
      `🧑 Nhân viên: ${user?.fullName || 'N/A'}`,
      `📍 Chuyến: ${trip.title}`,
      `🗓 Ngày: ${reportDate}`,
      `📝 Nội dung: ${contentPreview}`,
      `👥 KH mới: ${newClientsIncrement} | KH cũ: ${oldClientsIncrement}`,
    ].join('\n');
    this.telegram.notifyAdmins(companyId, telegramMsg).catch(console.error);

    return report;
  }

  async getDailyReports(tripId: string, companyId: string) {
    // Verify trip exists and belongs to company
    await this.findOne(tripId, companyId);

    return this.prisma.tripDailyReport.findMany({
      where: { tripId },
      orderBy: { date: 'asc' },
    });
  }

  async hardRemove(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    // Delete related daily reports first
    await this.prisma.tripDailyReport.deleteMany({
      where: { tripId: id },
    });

    await this.prisma.businessTrip.delete({
      where: { id },
    });

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'DELETED',
      entity: 'BusinessTrip',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });

    return existing;
  }
}
