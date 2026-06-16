import { AppDataSource } from '../config/database';
import { Notification, NotificationType, RelatedType } from '../entities/Notification';
import { User, UserRole } from '../entities/User';
import { SocketService } from './socket.service';
import { In } from 'typeorm';

const notificationRepository = AppDataSource.getRepository(Notification);
const userRepository = AppDataSource.getRepository(User);

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: RelatedType;
}

export interface BatchCreateNotificationData {
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: RelatedType;
}

export class NotificationService {
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    content: string,
    relatedId?: string,
    relatedType?: RelatedType
  ): Promise<Notification> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('用户不存在');
    }

    const notification = notificationRepository.create({
      userId,
      type,
      title,
      content,
      relatedId,
      relatedType,
      isRead: false,
    });

    const savedNotification = await notificationRepository.save(notification);

    await this.pushNotification(userId, savedNotification);

    return savedNotification;
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true, readAt: new Date() }
    );
    return result.affected !== undefined && result.affected > 0;
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const result = await notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result.affected || 0;
  }

  static async getNotifications(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ items: Notification[]; total: number }> {
    const [items, total] = await notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  static async pushNotification(userId: string, notification: Notification): Promise<void> {
    SocketService.sendToUser(userId, 'notification', notification);
  }

  static async batchCreateNotifications(
    userIds: string[],
    notificationData: BatchCreateNotificationData
  ): Promise<Notification[]> {
    const users = await userRepository.find({
      where: { id: In(userIds) },
    });

    const validUserIds = users.map((u) => u.id);
    if (validUserIds.length === 0) {
      return [];
    }

    const notifications: Notification[] = [];
    for (const userId of validUserIds) {
      const notification = notificationRepository.create({
        userId,
        type: notificationData.type,
        title: notificationData.title,
        content: notificationData.content,
        relatedId: notificationData.relatedId,
        relatedType: notificationData.relatedType,
        isRead: false,
      });
      notifications.push(notification);
    }

    const savedNotifications = await notificationRepository.save(notifications);

    for (const notification of savedNotifications) {
      await this.pushNotification(notification.userId, notification);
    }

    return savedNotifications;
  }

  static async createNotificationForRole(
    role: UserRole,
    type: NotificationType,
    title: string,
    content: string,
    relatedId?: string,
    relatedType?: RelatedType
  ): Promise<Notification[]> {
    const users = await userRepository.find({ where: { role } });
    const userIds = users.map((u) => u.id);

    return this.batchCreateNotifications(userIds, {
      type,
      title,
      content,
      relatedId,
      relatedType,
    });
  }

  static async getNotificationDetail(
    id: string,
    userId: string
  ): Promise<Notification | null> {
    return notificationRepository.findOne({
      where: { id, userId },
    });
  }

  static async deleteNotification(id: string, userId: string): Promise<boolean> {
    const result = await notificationRepository.delete({ id, userId });
    return result.affected !== undefined && result.affected !== null && result.affected > 0;
  }
}

export default NotificationService;
