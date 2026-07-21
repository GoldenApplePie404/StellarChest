// 注册接口 - POST /api/auth/register
// 接收邮箱/密码/昵称，创建用户并签发JWT

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/AuthService';
import { registerSchema } from '@/lib/validators';
import { fromZodError, AppError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { LoginResponse } from '@/types/user';

/** 注册接口处理函数 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<LoginResponse>>> {
  try {
    // 解析请求体
    const body = await request.json();

    // Zod参数验证
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    // 调用认证服务注册
    const result = await authService.register(validation.data);

    // 返回成功响应（含JWT令牌和用户信息）
    return NextResponse.json({
      code: 200,
      data: result,
      message: '注册成功',
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
