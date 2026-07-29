import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class CronsService {
  private readonly logger = new Logger(CronsService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 8 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async handleDailyTaskReminders() {
    this.logger.log('Bắt đầu chạy Cron nhắc việc định kỳ...');
    await this.runDailyReminderLogic();
  }

  // Hàm public để có thể gọi test thủ công
  async runDailyReminderLogic(testUserId?: string) {
    try {
      // 1. Fetch companies to get bot tokens
      const companies = await this.prisma.company.findMany({
        where: { telegramBotToken: { not: null } },
        select: { id: true, telegramBotToken: true },
      });

      for (const company of companies) {
        // 2. Fetch users in this company with telegramChatId
        const userQuery: any = {
          companyId: company.id,
          telegramChatId: { not: null },
          deletedAt: null,
          isActive: true,
        };
        if (testUserId) {
          userQuery.id = testUserId;
        }

        const users = await this.prisma.user.findMany({
          where: userQuery,
          select: { id: true, fullName: true, telegramChatId: true },
        });

        for (const user of users) {
          // 3. Fetch tasks for this user (where user is an assignee)
          // Exclude DONE and CANCELLED
          const tasks = await this.prisma.task.findMany({
            where: {
              companyId: company.id,
              status: { not: 'DONE' },
              deletedAt: null,
              assignees: {
                some: { userId: user.id },
              },
            },
            select: { id: true, title: true, status: true, deadline: true },
          });

          if (tasks.length === 0) continue;

          let overdueTasks = [];
          let todayTasks = [];
          let inProgressTasks = [];

          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

          tasks.forEach((t) => {
            if (t.deadline && new Date(t.deadline) < todayStart) {
              overdueTasks.push(t);
            } else if (
              t.deadline &&
              new Date(t.deadline) >= todayStart &&
              new Date(t.deadline) <= todayEnd
            ) {
              todayTasks.push(t);
            } else {
              inProgressTasks.push(t);
            }
          });

          // Build message
          let message = `⏰ <b>NHẮC NHỞ CÔNG VIỆC HÀNG NGÀY</b>\n👤 Chào <b>${user.fullName}</b>, dưới đây là tình trạng công việc của bạn:\n\n`;

          message += `🔴 <b>Đã quá hạn:</b> ${overdueTasks.length} việc\n`;
          message += `🟡 <b>Đến hạn hôm nay:</b> ${todayTasks.length} việc\n`;
          message += `🔵 <b>Đang thực hiện:</b> ${inProgressTasks.length} việc\n\n`;

          if (overdueTasks.length > 0) {
            message += `<b>🔴 CÁC VIỆC QUÁ HẠN:</b>\n`;
            overdueTasks.forEach((t, i) => {
              message += `${i + 1}. ${t.title}\n`;
            });
            message += `\n`;
          }

          if (todayTasks.length > 0) {
            message += `<b>🟡 CÁC VIỆC ĐẾN HẠN HÔM NAY:</b>\n`;
            todayTasks.forEach((t, i) => {
              message += `${i + 1}. ${t.title}\n`;
            });
            message += `\n`;
          }

          message += `👉 Vui lòng truy cập DAFA Manager để xử lý công việc!`;

          // Gửi tin nhắn
          if (user.telegramChatId) {
            await fetch(`https://api.telegram.org/bot${company.telegramBotToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: user.telegramChatId,
                text: message,
                parse_mode: 'HTML',
              }),
            }).catch((err) => this.logger.error(`[TELEGRAM CRON ERR] ${user.id}`, err));
          }
        }
      }
    } catch (e) {
      this.logger.error('Error in daily reminder cron:', e);
    }
  }
}
