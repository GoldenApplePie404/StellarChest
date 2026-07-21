// Next.js 16 Proxy -- JWT用户信息注入 + 论坛认证拦截
// 所有请求自动注入x-user-id等头，仅论坛写操作需要强制登录

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, extractToken } from '@/lib/jwt';

/** 需要强制登录的论坛写操作 */
const WRITE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
const WRITE_API_PATHS = ['/api/forum/posts', '/api/forum/comments', '/api/forum'];

/** 需要强制登录的页面路由 */
const PAGE_AUTH_REQUIRED = ['/forum/create', '/forum/edit', '/profile'];

/** 从Cookie中提取JWT令牌 */
function extractTokenFromCookie(request: NextRequest): string | null {
  const cookie = request.cookies.get('galgame_token');
  return cookie?.value ?? null;
}

/** Proxy 主函数 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // 静态资源和Next内部路径跳过
  if (pathname.startsWith('/_next') || pathname.startsWith('/fonts') ||
      pathname.startsWith('/icons') || pathname.startsWith('/default-assets') ||
      (pathname.includes('.') && !pathname.startsWith('/api'))) {
    return NextResponse.next();
  }

  // 从Authorization Header或Cookie中提取令牌
  const authHeader = request.headers.get('Authorization');
  let token = extractToken(authHeader);
  if (!token) {
    token = extractTokenFromCookie(request);
  }
  let payload = null;

  // 尝试解析JWT（如果存在）
  if (token) {
    payload = await verifyToken(token);
  }

  // 需要强制登录的路径（写操作 + 页面路由）
  const needsAuth = (WRITE_METHODS.includes(method) && WRITE_API_PATHS.some(p => pathname.startsWith(p))) ||
                    PAGE_AUTH_REQUIRED.some(p => pathname.startsWith(p));

  if (needsAuth && !payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { code: 401, data: null, message: '请先登录' },
        { status: 401 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 注入用户信息到请求头
  const requestHeaders = new Headers(request.headers);
  if (payload) {
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);
    // 中文昵称需编码，Edge Runtime 仅支持 ASCII header 值
    requestHeaders.set('x-user-nickname', encodeURIComponent(payload.nickname));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
