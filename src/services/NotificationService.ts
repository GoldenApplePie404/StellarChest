// 通知服务 - 创建/查询/标记已读
// 支持 comment_reply 和 system 两种通知类型

import prisma from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import type { PaginatedData } from '@/types/api';

/** 通知数据模型 */
export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  relatedId: string | null;
  isRead: boolean;
  createdAt: string;
}

/** 通知服务类 */
export class NotificationService {
  /**
   * 创建通知
   * @param userId 接收通知的用户ID
   * @param type 通知类型
   * @param title 通知标题
   * @param content 通知内容
   * @param relatedId 关联的帖子/项目ID（可选）
   * @returns 创建的通知记录
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    content: string = '',
    relatedId?: string,
  ): Promise<NotificationItem> {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        relatedId: relatedId || null,
        isRead: false,
      },
    });

    return this.formatNotification(notification);
  }

  /**
   * 获取用户通知列表（分页，最新优先）
   * @param userId 用户ID
   * @param page 页码
   * @param pageSize 每页大小
   * @returns 分页通知列表
   */
  async getNotifications(userId: string, page: number, pageSize: number): Promise<PaginatedData<NotificationItem>> {
    const where = { userId };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      items: notifications.map((n) => this.formatNotification(n)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取用户未读通知数量
   * @param userId 用户ID
   * @returns 未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * 标记单条通知为已读
   * @param notificationId 通知ID
   * @param userId 用户ID（权限校验）
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('通知');
    }

    if (notification.userId !== userId) {
      throw new NotFoundError('通知');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * 标记用户所有通知为已读
   * @param userId 用户ID
   */
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /** 格式化通知记录 */
  private formatNotification(n: {
    id: string;
    userId: string;
    type: string;
    title: string;
    content: string;
    relatedId: string | null;
    isRead: boolean;
    createdAt: Date;
  }): NotificationItem {
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      content: n.content,
      relatedId: n.relatedId,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    };
  }
}

/** 导出通知服务单例 */
export const notificationService = new NotificationService();
