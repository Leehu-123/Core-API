import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { CreateBusinessTripDto, UpdateBusinessTripDto, QueryBusinessTripDto, AddDailyReportDto } from './dto';

@Injectable()
export class BusinessTripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
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
        },
      }),
      this.prisma.businessTrip.count({ where }),
    ]);

    return {
      data,
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

    return trip;
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

  async approve(id: string, companyId: string, userId: string) {
    const existing = await this.findOne(id, companyId);

    if (existing.status !== 'PROPOSED') {
      throw new BadRequestException('Only PROPOSED trips can be approved');
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

    if (existing.status !== 'PROPOSED') {
      throw new BadRequestException('Only PROPOSED trips can be rejected');
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
