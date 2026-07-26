import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function calculateScore(actual: number, target: number, weight: number, comparisonType?: string, unit?: string): number {
  const normalizedUnit = (unit || '').toLowerCase().trim();
  
  const isLowerBetter =
    comparisonType === 'LOWER_BETTER' ||
    normalizedUnit.includes('lỗi') ||
    normalizedUnit.includes('lần') ||
    normalizedUnit.includes('sự cố') ||
    normalizedUnit.includes('khiếu nại') ||
    (target === 0 && !normalizedUnit.includes('%'));

  if (isLowerBetter) {
    if (target === 0) {
      return actual <= 0 ? weight : 0;
    } else {
      if (actual <= target) return weight;
      const ratio = actual / target;
      const score = (2 - ratio) * weight;
      return Math.max(0, Math.min(score, weight));
    }
  } else {
    if (target === 0) {
      return actual >= 0 ? weight : 0;
    }
    if (actual >= target) {
      return weight;
    }
    const score = (actual / target) * weight;
    return Math.max(0, Math.min(score, weight));
  }
}

@Injectable()
export class KpiRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { userId, criteriaId, periodStart, periodEnd, actual, note, score, companyId } = data;

    const criteria = await this.prisma.kpiCriteria.findUnique({
      where: { id: criteriaId },
    });

    const actVal = typeof actual === 'number' ? actual : parseFloat(actual || '0');
    let computedScore = score;

    if (criteria && (computedScore === undefined || computedScore === null)) {
      computedScore = calculateScore(
        actVal,
        criteria.targetValue || 0,
        criteria.weightPercent || 0,
        criteria.comparisonType,
        criteria.unit
      );
    }

    const pStart = periodStart ? new Date(periodStart) : new Date();
    const pEnd = periodEnd ? new Date(periodEnd) : new Date();

    const existing = await this.prisma.kpiRecord.findFirst({
      where: {
        userId,
        criteriaId,
        periodStart: pStart,
      },
    });

    if (existing) {
      return this.prisma.kpiRecord.update({
        where: { id: existing.id },
        data: {
          actualValue: actVal,
          score: computedScore,
          notes: note || existing.notes,
        },
      });
    }

    return this.prisma.kpiRecord.create({
      data: {
        companyId,
        userId,
        criteriaId,
        periodStart: pStart,
        periodEnd: pEnd,
        actualValue: actVal,
        score: computedScore || 0,
        notes: note || '',
      },
    });
  }

  async bulkSave(dto: { userId: string; periodStart: string; periodEnd: string; records: any[] }, companyId: string) {
    const { userId, periodStart, periodEnd, records } = dto;
    const pStart = periodStart ? new Date(periodStart) : new Date();
    const pEnd = periodEnd ? new Date(periodEnd) : new Date();

    const savedRecords = [];
    for (const r of records) {
      const criteria = await this.prisma.kpiCriteria.findUnique({
        where: { id: r.criteriaId },
      });

      const actVal = typeof r.actual === 'number' ? r.actual : parseFloat(r.actual || '0');
      let computedScore = r.score;

      if (criteria && (computedScore === undefined || computedScore === null)) {
        computedScore = calculateScore(
          actVal,
          criteria.targetValue || 0,
          criteria.weightPercent || 0,
          criteria.comparisonType,
          criteria.unit
        );
      }

      const existing = await this.prisma.kpiRecord.findFirst({
        where: {
          userId,
          criteriaId: r.criteriaId,
          periodStart: pStart,
        },
      });

      if (existing) {
        const updated = await this.prisma.kpiRecord.update({
          where: { id: existing.id },
          data: {
            actualValue: actVal,
            score: computedScore,
            notes: r.note || existing.notes,
          },
        });
        savedRecords.push(updated);
      } else {
        const created = await this.prisma.kpiRecord.create({
          data: {
            companyId,
            userId,
            criteriaId: r.criteriaId,
            periodStart: pStart,
            periodEnd: pEnd,
            actualValue: actVal,
            score: computedScore || 0,
            notes: r.note || '',
          },
        });
        savedRecords.push(created);
      }
    }

    // Trigger EXACTLY 1 Telegram notification to Admins/Managers for approval
    this.notifyAdminsForKpiApproval(companyId, userId, pStart, pEnd);

    return { count: savedRecords.length };
  }

  private async notifyAdminsForKpiApproval(companyId: string, userId: string, periodStart: Date, periodEnd: Date) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { telegramBotToken: true },
      });
      if (!company || !company.telegramBotToken) return;

      const [targetUser, adminUsers, records] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            fullName: true,
            departmentMember: { include: { department: { select: { name: true } } } },
          },
        }),
        this.prisma.user.findMany({
          where: {
            companyId,
            telegramChatId: { not: null },
            deletedAt: null,
          },
          select: { telegramChatId: true },
        }),
        this.prisma.kpiRecord.findMany({
          where: { userId, periodStart },
          include: { criteria: true },
        }),
      ]);

      if (!targetUser || adminUsers.length === 0) return;

      const deptName = targetUser.departmentMember?.[0]?.department?.name || 'N/A';
      const pStartStr = new Date(periodStart).toLocaleDateString('vi-VN');
      const pEndStr = new Date(periodEnd).toLocaleDateString('vi-VN');

      const totalScore = records.reduce((sum, r) => sum + (r.score || 0), 0);
      const maxScore = records.reduce((sum, r) => sum + (r.criteria?.weightPercent || 0), 0);

      const message = `📊 <b>PHIẾU ĐÁNH GIÁ KPI MỚI CẦN PHÊ DUYỆT</b>\n\n👤 <b>Nhân viên:</b> ${targetUser.fullName}\n🏢 <b>Phòng ban:</b> ${deptName}\n📅 <b>Kỳ đánh giá:</b> ${pStartStr} đến ${pEndStr}\n⭐ <b>Điểm ước tính:</b> ${totalScore.toFixed(1)} / ${maxScore}\n\n👉 Vui lòng truy cập DAFA Manager (mục Duyệt Phiếu KPI) để kiểm tra và phê duyệt!`;

      for (const admin of adminUsers) {
        if (admin.telegramChatId) {
          fetch(`https://api.telegram.org/bot${company.telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: admin.telegramChatId,
              text: message,
              parse_mode: 'HTML',
            }),
          }).catch((err) => console.error('[TELEGRAM KPI NOTIF ERR]', err));
        }
      }
    } catch (e) {
      console.error('[TELEGRAM KPI ERR]', e);
    }
  }

  async findPendingSheets(companyId: string, userId: string, role: string, query?: any) {
    const normRole = (role || '').toString().toUpperCase();
    const userWhere: any = { companyId };

    if (normRole === 'ADMIN' || normRole === 'OWNER' || normRole === 'ACCOUNTANT') {
      // Full visibility across company
    } else if (normRole === 'MANAGER') {
      const managerDepts = await this.prisma.departmentMember.findMany({
        where: { userId },
        select: { departmentId: true }
      });
      const deptIds = managerDepts.map(d => d.departmentId);
      userWhere.OR = [
        { id: userId },
        { departmentMember: { some: { departmentId: { in: deptIds } } } }
      ];
    } else {
      userWhere.id = userId;
    }

    if (query?.departmentId) {
      userWhere.departmentMember = { some: { departmentId: query.departmentId } };
    }

    const where: any = { user: userWhere };

    if (query?.status) {
      where.status = query.status;
    }

    const records = await this.prisma.kpiRecord.findMany({
      where,
      include: {
        criteria: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            jobTitle: true,
            avatar: true,
            departmentMember: {
              include: { department: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
    });

    const sheetMap = new Map<string, any>();

    for (const r of records) {
      const pStart = new Date(r.periodStart).toISOString().split('T')[0];
      const pEnd = new Date(r.periodEnd).toISOString().split('T')[0];
      const key = `${r.userId}_${pStart}_${pEnd}`;

      if (!sheetMap.has(key)) {
        sheetMap.set(key, {
          key,
          userId: r.userId,
          user: r.user,
          periodStart: pStart,
          periodEnd: pEnd,
          status: r.status,
          recordedAt: r.recordedAt,
          totalScore: 0,
          maxScore: 0,
          criteriaCount: 0,
        });
      }

      const sheet = sheetMap.get(key);
      sheet.totalScore += r.score || 0;
      sheet.maxScore += r.criteria?.weightPercent || 0;
      sheet.criteriaCount += 1;
      if (r.status === 'DRAFT') {
        sheet.status = 'DRAFT';
      }
    }

    return Array.from(sheetMap.values());
  }

  async approve(dto: { userId: string; periodStart: string; periodEnd: string; action?: 'APPROVE' | 'REJECT' }, companyId: string) {
    const { userId, periodStart, periodEnd, action } = dto;
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'DRAFT';

    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    const updated = await this.prisma.kpiRecord.updateMany({
      where: {
        userId,
        periodStart: { gte: pStart },
        periodEnd: { lte: pEnd },
        user: { companyId },
      },
      data: {
        status: newStatus as any,
      },
    });

    return { count: updated.count, newStatus };
  }

  async deleteSheet(dto: { userId: string; periodStart: string; periodEnd: string }, companyId: string) {
    const { userId, periodStart, periodEnd } = dto;
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    const deleted = await this.prisma.kpiRecord.deleteMany({
      where: {
        userId,
        periodStart: { gte: pStart },
        periodEnd: { lte: pEnd },
        user: { companyId },
      },
    });

    return { count: deleted.count };
  }

  async findAll(companyId: string, userId: string, role: string, query?: any) {
    const normRole = (role || '').toString().toUpperCase();
    const userWhere: any = { companyId };

    if (normRole === 'ADMIN' || normRole === 'OWNER' || normRole === 'ACCOUNTANT') {
      // Full visibility
    } else if (normRole === 'MANAGER') {
      const managerDepts = await this.prisma.departmentMember.findMany({
        where: { userId },
        select: { departmentId: true }
      });
      const deptIds = managerDepts.map(d => d.departmentId);
      userWhere.OR = [
        { id: userId },
        { departmentMember: { some: { departmentId: { in: deptIds } } } }
      ];
    } else {
      userWhere.id = userId;
    }

    const where: any = { user: userWhere };

    if (query?.userId) {
      where.userId = query.userId;
    }
    
    if (query?.periodStart || query?.periodEnd) {
      where.periodStart = {};
      if (query?.periodStart) where.periodStart.gte = new Date(query.periodStart);
      if (query?.periodEnd) where.periodStart.lte = new Date(query.periodEnd);
    }

    return this.prisma.kpiRecord.findMany({
      where,
      include: {
        criteria: {
          include: { department: { select: { id: true, name: true } } }
        },
        user: { select: { id: true, fullName: true, avatar: true } }
      },
      orderBy: { recordedAt: 'desc' }
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.kpiRecord.findFirst({
      where: { id, user: { companyId } },
    });
    if (!item) throw new NotFoundException('Not found');
    return item;
  }

  async update(id: string, data: any, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.kpiRecord.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, companyId: string) {
    const item = await this.findOne(id, companyId);
    return this.prisma.kpiRecord.delete({
      where: { id },
    });
  }
}