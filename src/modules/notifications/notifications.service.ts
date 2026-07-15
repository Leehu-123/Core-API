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

  async sendToUsersByRoles(roles: string[], payload: any) {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: { in: roles }
              }
            }
          }
        },
        include: {
          pushSubscriptions: true
        }
      });

      const promises = [];
      for (const user of users) {
        for (const sub of user.pushSubscriptions) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            }
          };

          promises.push(
            webpush.sendNotification(pushSubscription, JSON.stringify(payload))
              .catch(err => {
                this.logger.error(`Failed to send notification to ${sub.endpoint}`, err);
                if (err.statusCode === 404 || err.statusCode === 410) {
                  // Subscription expired or unsubscribed
                  this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
                }
              })
          );
        }
      }

      await Promise.allSettled(promises);
    } catch (e) {
      this.logger.error('Error sending push notifications', e);
    }
  }
}
