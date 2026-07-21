// 用户相关类型定义
// 对应架构文档3节类图中的User数据结构

/** 用户角色枚举 */
export type UserRole = 'user' | 'admin';

/** 用户数据模型 */
export interface User {
  /** 用户ID */
  id: string;
  /** 邮箱 */
  email: string;
  /** 密码哈希（仅服务端使用，前端不暴露） */
  passwordHash?: string;
  /** 昵称 */
  nickname: string;
  /** 头像URL */
  avatarUrl: string;
  /** 用户角色 */
  role: UserRole;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 用户公开信息（不含密码哈希等敏感字段） */
export interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  role: UserRole;
  createdAt: string;
}

/** 认证载荷（JWT payload） */
export interface AuthPayload {
  /** 用户ID */
  userId: string;
  /** 邮箱 */
  email: string;
  /** 角色 */
  role: UserRole;
  /** 昵称 */
  nickname: string;
}

/** 注册请求 */
export interface RegisterRequest {
  /** 邮箱 */
  email: string;
  /** 密码 */
  password: string;
  /** 昵称（可选） */
  nickname?: string;
}

/** 登录请求 */
export interface LoginRequest {
  /** 邮箱 */
  email: string;
  /** 密码 */
  password: string;
}

/** 登录响应（含JWT令牌和用户信息） */
export interface LoginResponse {
  /** JWT访问令牌 */
  token: string;
  /** 用户公开信息 */
  user: UserProfile;
}
