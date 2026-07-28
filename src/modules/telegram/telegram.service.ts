import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly warehouseAppUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.warehouseAppUrl = process.env.WAREHOUSE_APP_URL || 'https://warehouse.ldhuy.name.vn';
  }

  async sendMessage(chatId: string, text: string, customToken?: string): Promise<boolean> {
    const token = customToken || this.botToken;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not configured');
      return false;
    }
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        this.logger.warn(`Failed to send Telegram message to ${chatId}: ${JSON.stringify(errorData)}`);
        return false;
      }
      return true;
    } catch (error: any) {
      this.logger.warn(`Error sending Telegram message: ${error.message}`);
      return false;
    }
  }

  async notifyAdmins(companyId: string, message: string): Promise<void> {
    try {
      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      const customToken = company?.telegramBotToken || undefined;

      const adminUsers = await this.prisma.user.findMany({
        where: {
          companyId,
          telegramChatId: { not: null },
          isActive: true,
          deletedAt: null,
          userRoles: {
            some: {
              role: {
                name: { in: ['admin', 'ketoan', 'owner'] },
              },
            },
          },
        },
      });
      const sendPromises = adminUsers
        .filter((u) => u.telegramChatId)
        .map((u) => this.sendMessage(u.telegramChatId!, message, customToken));
      await Promise.allSettled(sendPromises);
    } catch (error: any) {
      this.logger.warn(`Error notifying admins: ${error.message}`);
    }
  }

  async notifyUser(userId: string, message: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ 
        where: { id: userId },
        include: { company: true }
      });
      if (user?.telegramChatId) {
        const customToken = user.company?.telegramBotToken || undefined;
        await this.sendMessage(user.telegramChatId, message, customToken);
      }
    } catch (error: any) {
      this.logger.warn(`Error notifying user ${userId}: ${error.message}`);
    }
  }

  getReceiptLink(id: string): string {
    return `${this.warehouseAppUrl}/goods-receipts/${id}/edit`;
  }

  getIssueLink(id: string): string {
    return `${this.warehouseAppUrl}/goods-issues/${id}/edit`;
  }
}
