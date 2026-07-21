// 登录接口 - POST /api/auth/login
// 接收邮箱/密码，验证后签发JWT

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/AuthService';
import { loginSchema } from '@/lib/validators';
import { fromZodError, AppError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { LoginResponse } from '@/types/user';

/** 登录接口处理函数 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<LoginResponse>>> {
  try {
    // 解析请求体
    const body = await request.json();

    // Zod参数验证
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    // 调用认证服务登录
    const result = await authService.login(validation.data);

    // 返回成功响应（含JWT令牌和用户信息）
    const response = NextResponse.json({
      code: 200,
      data: result,
      message: '登录成功',
    });

    // 设置Cookie供Proxy读取（确保同域/安全/7天有效期）
    response.cookies.set('galgame_token', result.token, {
      httpOnly: false,       // 客户端JS也可读
      secure: false,         // 开发环境不需要HTTPS
      sameSite: 'lax',       // 防止CSRF的同时允许页面导航携带
      path: '/',             // 全站可用
      maxAge: 7 * 24 * 60 * 60, // 7天（与JWT同步）
    });

    return response;
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
