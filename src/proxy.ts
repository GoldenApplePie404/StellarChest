// Next.js 16 Proxy -- JWT用户信息注入 + 论坛认证拦截
// 所有请求自动注入x-user-id等头，仅论坛写操作需要强制登录
//
// 桌面化改造（2026-09-02）：
//   当 APP_MODE=desktop 且 CLOUD_API_BASE 有值时，
//   自动把 /api/auth /api/forum /api/assets /api/users /api/notifications
//   五个路由前缀的请求转发到云端服务器。
//   Web 版（默认 APP_MODE=web）走不到这个分支，所有原有逻辑零改动。

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, extractToken } from '@/lib/jwt';

// ==================== 运行模式检测（直接读 env，避免 import 带 Node path 的 config.ts） ====================
// Edge Runtime 不支持 Node.js 内置模块（path / fs 等），
// 所以 proxy.ts 不能 import 带这些模块的文件。
const IS_DESKTOP = (process.env.APP_MODE || 'web') === 'desktop';
const CLOUD_API_BASE = (process.env.CLOUD_API_BASE || '').replace(/\/$/, '');
const CLOUD_PROXY_ENABLED = IS_DESKTOP && CLOUD_API_BASE.length > 0;

// ==================== 云端转发相关 ====================

/** 需要转发到云端的 API 路由前缀（仅桌面模式生效） */
const CLOUD_API_PREFIXES = [
  '/api/auth',
  '/api/forum',
  '/api/assets',      // 注意：/api/projects/[id]/assets 走不到这里（路径以 /api/projects 开头）
  '/api/users',
  '/api/notifications',
];

/** 判断某个路径是否属于云端转发范围 */
function isCloudPath(pathname: string): boolean {
  return CLOUD_API_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/**
 * 将请求转发到云端服务器
 * 保留原始 method / headers / body，原样返回云端响应
 * Edge Runtime 原生支持 fetch，无需额外依赖
 */
async function forwardToCloud(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const cloudUrl = `${CLOUD_API_BASE}${pathname}${search}`;

  // 构造转发 headers —— 去掉 host（云端会重新设置）和 content-length（fetch 自动计算）
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  // GET / HEAD 没有 body，其余方法透传原始 ReadableStream
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const cloudResponse = await fetch(cloudUrl, init);

    // 把云端响应原样包装返回
    const responseHeaders = new Headers();
    cloudResponse.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    return new NextResponse(cloudResponse.body, {
      status: cloudResponse.status,
      statusText: cloudResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    // 云端不可达（网络断开、DNS 解析失败、超时等）
    const message = err instanceof Error ? err.message : '未知错误';
    console.warn(`[proxy] 云端转发失败 → ${cloudUrl}: ${message}`);
    return NextResponse.json(
      { code: 502, data: null, message: '云端服务不可达，请检查网络连接' },
      { status: 502 },
    );
  }
}

// ==================== 原有逻辑 ====================

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

  // ---------- 静态资源和Next内部路径跳过 ----------
  if (pathname.startsWith('/_next') || pathname.startsWith('/fonts') ||
      pathname.startsWith('/icons') || pathname.startsWith('/default-assets') ||
      (pathname.includes('.') && !pathname.startsWith('/api'))) {
    return NextResponse.next();
  }

  // ==============================================
  // 桌面版云端转发（Web 版 IS_DESKTOP=false，以下分支永远不会进入）
  // ==============================================
  if (IS_DESKTOP && CLOUD_PROXY_ENABLED && isCloudPath(pathname)) {
    return forwardToCloud(request);
  }

  // ---------- 以下全部为原有逻辑，一行未动 ----------

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
