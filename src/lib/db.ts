// Prisma客户端单例
// 避免在开发环境热重载时创建过多连接

import { PrismaClient } from '@prisma/client';

/** 全局Prisma客户端单例变量 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** 创建Prisma客户端实例 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

/** 导出Prisma客户端单例 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// 开发环境将实例挂到全局，防止热重载时重复创建连接
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** 默认导出 */
export default prisma;
