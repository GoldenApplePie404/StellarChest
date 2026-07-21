// JWT工具函数
// 使用jose库进行JWT签发与验证

import { SignJWT, jwtVerify } from 'jose';
import type { AuthPayload } from '@/types/user';

/** JWT密钥（从环境变量读取） */
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'default-secret-key-for-development';
  return new TextEncoder().encode(secret);
}

/** JWT过期时间 */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 签发JWT令牌
 * @param payload 认证载荷数据
 * @returns 签发后的JWT字符串
 */
export async function signToken(payload: AuthPayload): Promise<string> {
  const secretKey = getSecretKey();
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .setIssuer('galgame-toolkit')
    .sign(secretKey);
  return token;
}

/**
 * 验证JWT令牌
 * @param token JWT字符串
 * @returns 解码后的载荷数据，验证失败返回null
 */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: 'galgame-toolkit',
    });
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * 从Authorization Header中提取JWT令牌
 * @param authHeader Authorization请求头值
 * @returns JWT令牌字符串，格式不正确返回null
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1] ?? null;
}
