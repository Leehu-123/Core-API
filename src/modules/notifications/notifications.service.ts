import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY || 'BEXPYUiWQQTtZ-GsLwTQ14byVl4eEWEtm5mOCKzXZkxLp_rTHtKRT7wL1W3Yp7BvldSkkzMa9KPyGl45REcZYpU';
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY || 'neN_LvlOWxxiJaMXNXQdhHyMMhz6giEECjqvp38T6UI';

webpush.setVapidDetails(
  'mailto:admin@dafa.vn',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

// Map từ role viết hoa (được truyền từ code) sang role thực tế trong DB (viết thường)
// Cho phép truyền bất kỳ tên role nào, so sánh case-insensitive
const ROLE_ALIASES: Record<string, string[]> = {
  ADMIN: ['admin', 'owner'],
  MANAGER: ['manager'],
  ACCOUNTANT: ['ketoan', 'accountant'],
  SALES: ['sales', 'sale_admin', 'sale_lead'],
};

function resolveRoleNames(roles: string[]): string[] {
  const resolved = new Set<string>();
  for (const r of roles) {
    const upper = r.toUpperCase();
    if (ROLE_ALIASES[upper]) {
      ROLE_ALIASES[upper].forEach(alias => resolved.add(alias));
    } else {
      // Truyền thẳng (lowercase)
      resolved.add(r.toLowerCase());
    }
  }
  return Array.from(resolved);
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribe(userId: string, subscription: any) {
    try {
      // Create or update subscription
      await this.prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
      return { success: true };
    } catch (e) {
      this.logger.error('Error saving subscription', e);
      throw e;
    }
  }

  async sendToUsersByRoles(roles: string[], payload: { title: string; body: string; url?: string }) {
    try {
      // Resolve role names to actual DB role names (case-insensitive)
      const resolvedRoleNames = resolveRoleNames(roles);

      const users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          userRoles: {
            some: {
              role: {
                name: { in: resolvedRoleNames, mode: 'insensitive' },
              },
            },
          },
        },
        select: {
          id: true,
          companyId: true,
          pushSubscriptions: true,
        },
      });

      if (users.length === 0) {
        this.logger.warn(`sendToUsersByRoles: No users found for roles [${roles.join(', ')}] → resolved to [${resolvedRoleNames.join(', ')}]`);
        return;
      }

      // 1. Lưu in-app notification vào DB cho mỗi user
      const notificationData = users.map(user => ({
        companyId: user.companyId,
        userId: user.id,
        title: payload.title,
        message: payload.body,
        type: 'SYSTEM' as const,
        linkUrl: payload.url || null,
        isRead: false,
      }));

      await this.prisma.notification.createMany({
        data: notificationData,
        skipDuplicates: true,
      });

      // 2. Gửi web push notification nếu user đã subscribe
      const promises = [];
      for (const user of users) {
        for (const sub of user.pushSubscriptions) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          promises.push(
            webpush.sendNotification(pushSubscription, JSON.stringify(payload))
              .catch(err => {
                this.logger.error(`Failed to send push to ${sub.endpoint}`, err.message);
                if (err.statusCode === 404 || err.statusCode === 410) {
                  this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
                }
              })
          );
        }
      }

      await Promise.allSettled(promises);
    } catch (e) {
      this.logger.error('Error in sendToUsersByRoles', e);
    }
  }

  // Gửi thông báo cho một user cụ thể theo userId
  async sendToUser(userId: string, companyId: string, payload: { title: string; body: string; url?: string }) {
    try {
      // Lưu in-app notification
      await this.prisma.notification.create({
        data: {
          companyId,
          userId,
          title: payload.title,
          message: payload.body,
          type: 'SYSTEM',
          linkUrl: payload.url || null,
          isRead: false,
        },
      });

      // Gửi web push nếu có subscription
      const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
      for (const sub of subs) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        webpush.sendNotification(pushSubscription, JSON.stringify(payload)).catch(err => {
          this.logger.error(`Failed push to user ${userId}`, err.message);
          if (err.statusCode === 404 || err.statusCode === 410) {
            this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        });
      }
    } catch (e) {
      this.logger.error('Error in sendToUser', e);
    }
  }

  // Lấy danh sách thông báo của user (mới nhất trước)
  async getMyNotifications(userId: string, limit = 30) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return { notifications, unreadCount };
  }

  // Đánh dấu một thông báo là đã đọc
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  // Đánh dấu tất cả thông báo là đã đọc
  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
