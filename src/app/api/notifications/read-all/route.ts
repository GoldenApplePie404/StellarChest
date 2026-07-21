// 全部已读API - PUT /api/notifications/read-all
// 需要认证：标记当前用户所有通知为已读
import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/services/NotificationService';
import { UnauthorizedError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** PUT - 标记所有通知为已读 */
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new UnauthorizedError('请先登录');
    }

    await notificationService.markAllAsRead(userId);

    return NextResponse.json(successResponse(null, '已全部标记为已读'));
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
