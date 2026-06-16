import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { success, error, paginate, HttpStatus } from '../utils/response';
import { paginationConfig } from '../config';
import { User } from '../entities/User';

interface AuthenticatedRequest extends Request {
  user?: User;
}

export class NotificationController {
  static async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || paginationConfig.defaultPage;
      const pageSize = parseInt(req.query.pageSize as string) || paginationConfig.defaultPageSize;

      const { items, total } = await NotificationService.getNotifications(userId, page, pageSize);

      res.json(paginate(items, total, page, pageSize, '获取通知列表成功'));
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取通知列表失败';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error(message, HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id;

      const result = await NotificationService.markAsRead(notificationId, userId);

      if (!result) {
        res.status(HttpStatus.NOT_FOUND).json(error('通知不存在', HttpStatus.NOT_FOUND));
        return;
      }

      res.json(success(null, '标记已读成功'));
    } catch (err) {
      const message = err instanceof Error ? err.message : '标记已读失败';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error(message, HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const count = await NotificationService.markAllAsRead(userId);

      res.json(success({ count }, `已将 ${count} 条通知标记为已读`));
    } catch (err) {
      const message = err instanceof Error ? err.message : '全部标记已读失败';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error(message, HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  static async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const count = await NotificationService.getUnreadCount(userId);

      res.json(success({ count }, '获取未读数量成功'));
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取未读数量失败';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error(message, HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  static async getNotificationDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id;

      const notification = await NotificationService.getNotificationDetail(notificationId, userId);

      if (!notification) {
        res.status(HttpStatus.NOT_FOUND).json(error('通知不存在', HttpStatus.NOT_FOUND));
        return;
      }

      if (!notification.isRead) {
        await NotificationService.markAsRead(notificationId, userId);
      }

      res.json(success(notification, '获取通知详情成功'));
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取通知详情失败';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error(message, HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }

  static async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const notificationId = req.params.id;

      const result = await NotificationService.deleteNotification(notificationId, userId);

      if (!result) {
        res.status(HttpStatus.NOT_FOUND).json(error('通知不存在', HttpStatus.NOT_FOUND));
        return;
      }

      res.json(success(null, '删除通知成功'));
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除通知失败';
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error(message, HttpStatus.INTERNAL_SERVER_ERROR));
    }
  }
}

export default NotificationController;
