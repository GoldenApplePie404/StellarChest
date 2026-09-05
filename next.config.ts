import type { NextConfig } from 'next';

/** Next.js 配置 */
const nextConfig: NextConfig = {
  // MCP SDK 为 ESM-only，交由 Node 原生解析，避免 Turbopack 打包异常
  serverExternalPackages: ['@modelcontextprotocol/sdk'],
  // 图片域名白名单
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  // 图片域名白名单实验性功能
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // 沙箱环境会杀掉子进程（jest-worker 的 static-paths-worker 用 child_process.fork 起不来），
    // 改用 Worker 线程（同一进程内，不被沙箱拦截）以恢复 next dev 的 dynamic route 编译。
    workerThreads: true,
  },
};

export default nextConfig;
