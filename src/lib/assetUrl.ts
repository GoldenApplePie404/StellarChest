// 资源 URL 规范化工具（客户端安全，不依赖 Node.js 模块）
// 用于把旧版 /api/tools/download?key=... 转换为 /uploads/... 静态 URL，
// 避免 dev 模式下走 dynamic route 触发全局 Compiling 覆盖层。

/** 兼容旧数据：把 /api/tools/download?key=... 转换为 /uploads/... 静态 URL */
export function normalizeAssetUrl(fileUrl: string): string {
  if (!fileUrl) return fileUrl;
  if (fileUrl.startsWith('/uploads/')) return fileUrl;
  try {
    const url = new URL(fileUrl, 'http://localhost');
    if (url.pathname === '/api/tools/download') {
      const key = url.searchParams.get('key');
      if (key) return `/uploads/${key}`;
    }
  } catch {
    // 非法 URL 原样返回
  }
  return fileUrl;
}
