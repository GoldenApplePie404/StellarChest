// 认证服务 - JWT签发/验证/用户注册登录
// 遵循架构文档3节类图中的AuthService定义

import prisma from '@/lib/db';
import { hash, compare } from 'bcryptjs';
import { signToken } from '@/lib/jwt';
import { ConflictError, UnauthorizedError, NotFoundError } from '@/lib/errors';
import type { AuthPayload, LoginResponse, UserProfile } from '@/types/user';
import type { RegisterRequest, LoginRequest } from '@/types/user';

/** 认证服务类 */
export class AuthService {
  /**
   * 用户注册
   * @param data 注册请求数据
   * @returns JWT令牌和用户信息
   */
  async register(data: RegisterRequest): Promise<LoginResponse> {
    // 检查邮箱是否已注册
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('该邮箱已注册');
    }

    // 对密码进行哈希处理
    const passwordHash = await hash(data.password, 10);

    // 创建用户记录
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: passwordHash,
        nickname: data.nickname || '创作者',
        avatarUrl: '',
        role: 'user',
      },
    });

    // 构造认证载荷并签发JWT
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
      nickname: user.nickname,
    };

    const token = await signToken(payload);

    // 返回用户公开信息
    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || '',
      role: user.role as 'user' | 'admin',
      createdAt: user.createdAt.toISOString(),
    };

    return { token, user: userProfile };
  }

  /**
   * 用户登录
   * @param data 登录请求数据
   * @returns JWT令牌和用户信息
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('邮箱或密码不正确');
    }

    // 验证密码
    const isPasswordValid = await compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('邮箱或密码不正确');
    }

    // 构造认证载荷并签发JWT
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'user' | 'admin',
      nickname: user.nickname,
    };

    const token = await signToken(payload);

    // 返回用户公开信息
    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || '',
      role: user.role as 'user' | 'admin',
      createdAt: user.createdAt.toISOString(),
    };

    return { token, user: userProfile };
  }

  /**
   * 获取当前用户信息
   * @param userId 用户ID（从JWT中提取）
   * @returns 用户公开信息
   */
  async getCurrentUser(userId: string): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('用户');
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || '',
      role: user.role as 'user' | 'admin',
      createdAt: user.createdAt.toISOString(),
    };
  }
}

/** 导出认证服务单例 */
export const authService = new AuthService();
