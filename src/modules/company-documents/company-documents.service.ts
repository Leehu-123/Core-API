import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CompanyDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    companyId: string;
    title: string;
    content?: string;
    type: 'ANNOUNCEMENT' | 'DOCUMENT';
    fileUrl?: string;
    fileName?: string;
    createdById: string;
  }) {
    const doc = await this.prisma.companyDocument.create({
      data: {
        companyId: data.companyId,
        title: data.title,
        content: data.content,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        createdById: data.createdById,
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    // If announcement, send Telegram to ALL employees
    if (data.type === 'ANNOUNCEMENT') {
      this.broadcastTelegram(data.companyId, data.title, data.content).catch(
        (err: Error) => console.error('[BROADCAST ERR]', err),
      );
    }

    return doc;
  }

  async findAll(companyId: string, type?: string, page: number = 1, limit: number = 20) {
    const where: any = { companyId };
    if (type) where.type = type;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.companyDocument.findMany({
        where,
        include: {
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.companyDocument.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async remove(id: string, companyId: string) {
    const doc = await this.prisma.companyDocument.findFirst({
      where: { id, companyId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    return this.prisma.companyDocument.delete({ where: { id } });
  }

  private async broadcastTelegram(companyId: string, title: string, content?: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { telegramBotToken: true, name: true },
    });
    if (!company?.telegramBotToken) return;

    const users = await this.prisma.user.findMany({
      where: { companyId, isActive: true, deletedAt: null, telegramChatId: { not: null } },
      select: { telegramChatId: true },
    });

    const message = `📢 <b>THÔNG BÁO MỚI</b>\n\n<b>${title}</b>\n${content ? content.substring(0, 500) : ''}\n\n👉 Vui lòng truy cập DAFA Manager để xem chi tiết!`;

    for (const user of users) {
      if (user.telegramChatId) {
        fetch(`https://api.telegram.org/bot${company.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: user.telegramChatId,
            text: message,
            parse_mode: 'HTML',
          }),
        }).catch((err: Error) => console.error('[TELEGRAM BROADCAST ERR]', err));
      }
    }
  }
}
