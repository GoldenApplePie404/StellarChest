// 获取当前用户信息接口 - GET /api/auth/me
// 从JWT中提取用户ID，返回用户公开信息
// 需要认证：Authorization: Bearer <JWT_TOKEN>

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/AuthService';
import { UnauthorizedError, AppError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { UserProfile } from '@/types/user';

/** 获取当前用户信息处理函数 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<UserProfile>>> {
  try {
    // 从请求头获取用户ID（由中间件注入）
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new UnauthorizedError('请先登录');
    }

    // 调用认证服务获取用户信息
    const user = await authService.getCurrentUser(userId);

    // 返回成功响应
    return NextResponse.json({
      code: 200,
      data: user,
      message: 'ok',
    });
  } catch (error: unknown) {
    // 处理应用级错误
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    // 处理未知错误
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
