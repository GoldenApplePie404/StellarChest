// 通知列表API - GET /api/notifications
// 需要认证：获取当前用户的通知列表
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/NotificationService';
import { paginationSchema } from '@/lib/validators';
import { UnauthorizedError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { NotificationItem } from '@/services/NotificationService';

/** GET - 获取通知列表（分页） */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<PaginatedData<NotificationItem> & { unreadCount: number }>>> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new UnauthorizedError('请先登录');
    }

    const { searchParams } = request.nextUrl;

    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
    });

    const [result, unreadCount] = await Promise.all([
      notificationService.getNotifications(userId, pagination.page, pagination.pageSize),
      notificationService.getUnreadCount(userId),
    ]);

    return NextResponse.json(
      successResponse({
        ...result,
        unreadCount,
      }),
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 },
    );
  }
}
