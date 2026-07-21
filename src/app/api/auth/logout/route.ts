// 登出接口 - POST /api/auth/logout
// 清除Cookie中的JWT令牌

import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';

export async function POST(): Promise<NextResponse<ApiResponse<null>>> {
  const response = NextResponse.json({
    code: 200,
    data: null,
    message: '已登出',
  });

  // 清除Cookie
  response.cookies.set('galgame_token', '', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 立即过期
  });

  return response;
}
