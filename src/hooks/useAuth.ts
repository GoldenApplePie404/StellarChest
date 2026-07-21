// 认证状态Hook - 管理用户登录状态
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '@/types/user';

/** 认证状态Hook返回值 */
interface UseAuthReturn {
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 当前用户信息 */
  user: UserProfile | null;
  /** 登录中状态 */
  loading: boolean;
  /** 退出登录 */
  logout: () => void;
  /** 刷新用户信息 */
  refreshUser: () => Promise<void>;
}

/** 认证状态Hook */
export function useAuth(): UseAuthReturn {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /** 从localStorage初始化用户状态 */
  const initFromStorage = useCallback((): void => {
    const token = localStorage.getItem('galgame_token');
    const userStr = localStorage.getItem('galgame_user');

    if (token && userStr) {
      try {
        const storedUser = JSON.parse(userStr) as UserProfile;
        setIsLoggedIn(true);
        setUser(storedUser);
      } catch {
        // 数据损坏，清除存储
        localStorage.removeItem('galgame_token');
        localStorage.removeItem('galgame_user');
        setIsLoggedIn(false);
        setUser(null);
      }
    } else {
      setIsLoggedIn(false);
      setUser(null);
    }
    setLoading(false);
  }, []);

  /** 组件加载时初始化 */
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  /** 退出登录 */
  const logout = useCallback((): void => {
    localStorage.removeItem('galgame_token');
    localStorage.removeItem('galgame_user');
    setIsLoggedIn(false);
    setUser(null);
    // 调用API清除Cookie（忽略失败）
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  }, []);

  /** 从服务器刷新用户信息 */
  const refreshUser = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('galgame_token');
    if (!token) {
      setIsLoggedIn(false);
      setUser(null);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.code === 200 && result.data) {
        setIsLoggedIn(true);
        setUser(result.data);
        localStorage.setItem('galgame_user', JSON.stringify(result.data));
      } else {
        // 令牌无效，清除登录状态
        logout();
      }
    } catch {
      // 网络错误，保持当前状态
    }
  }, [logout]);

  return { isLoggedIn, user, loading, logout, refreshUser };
}

export default useAuth;
