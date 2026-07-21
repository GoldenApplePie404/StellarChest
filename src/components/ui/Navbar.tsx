// 导航栏组件 - galgame风格顶部导航 + 通知铃铛
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X, Bell } from 'lucide-react';
import Link from 'next/link';
import Button from './Button';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { NotificationItem } from '@/services/NotificationService';

/** 导航链接数据 -- 星之匣命名体系 */
const navLinks = [
  { label: '星之境', sub: '在线引擎', href: '/play', title: '星光舞台 -- 加载与游玩你的视觉小说作品' },
  { label: '星墨', sub: '脚本编辑器', href: '/editor', title: '星光之笔 -- 落笔即世界的脚本编辑器' },
  { label: '星尘库', sub: '素材大全', href: '/assets', title: '星尘的仓库 -- 浏览与下载创作素材' },
  { label: '星灵', sub: 'AI 工具', href: '/ai', title: '沉睡于匣中的精灵 -- AI 辅助创作' },
  { label: '星工坊', sub: '通用工具', href: '/tools', title: '星光工坊 -- 图片与音频处理工具' },
  { label: '星语', sub: '论坛社区', href: '/forum', title: '围坐星光下 -- 创作者交流社区' },
];

/** Galgame风格导航栏组件 */
export default function Navbar(): React.JSX.Element {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [nickname, setNickname] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState<boolean>(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  /** 检查登录状态 */
  useEffect(() => {
    const token = localStorage.getItem('galgame_token');
    const userStr = localStorage.getItem('galgame_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsLoggedIn(true);
        setNickname(user.nickname || '创作者');
      } catch {
        setIsLoggedIn(false);
      }
    }
  }, []);

  /** 获取认证头 */
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('galgame_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  /** 加载未读通知数量 */
  const loadUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/notifications?page=1&pageSize=1', {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<PaginatedData<NotificationItem> & { unreadCount: number }> = await response.json();
      if (result.code === 200 && result.data) {
        setUnreadCount(result.data.unreadCount);
      }
    } catch {
      // 静默失败
    }
  }, []);

  /** 加载最近通知 */
  const loadNotifications = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/notifications?page=1&pageSize=5', {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<PaginatedData<NotificationItem> & { unreadCount: number }> = await response.json();
      if (result.code === 200 && result.data) {
        setNotifications(result.data.items);
        setUnreadCount(result.data.unreadCount);
      }
    } catch {
      // 静默失败
    }
  }, []);

  /** 定时轮询通知 */
  useEffect(() => {
    if (!isLoggedIn) return;
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, loadUnreadCount]);

  /** 打开通知面板 */
  const handleOpenNotifPanel = (): void => {
    setShowNotifPanel(!showNotifPanel);
    if (!showNotifPanel) {
      loadNotifications();
    }
  };

  /** 标记全部已读 */
  const handleMarkAllRead = async (): Promise<void> => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // 静默失败
    }
  };

  /** 点击外部关闭通知面板 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    if (showNotifPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifPanel]);

  /** 处理退出登录 */
  const handleLogout = (): void => {
    localStorage.removeItem('galgame_token');
    localStorage.removeItem('galgame_user');
    setIsLoggedIn(false);
    setNickname('');
    setUnreadCount(0);
    window.location.href = '/';
  };

  /** 格式化时间 */
  const formatNotifTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    if (diffDay < 30) return `${diffDay}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <nav className="sticky top-0 z-40 border-b shadow-sm"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(255,126,179,0.1)',
      }}>
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="星之匣" className="w-9 h-9" />
            <span className="text-lg font-bold gradient-text" style={{ fontFamily: '"ZCOOL KuaiLe", "ZCOOL QingKe HuangYou", "Ma Shan Zheng", sans-serif', fontWeight: 400 }}>
              星之匣
            </span>
          </Link>

          {/* 导航链接 - 桌面端 */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={link.title}
                className="group px-3 py-2 rounded-full text-sm transition-all duration-200 hover:bg-sakura-pale"
                style={{ color: 'var(--ink-light)' }}
              >
                <span className="font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", "ZCOOL QingKe HuangYou", "Ma Shan Zheng", sans-serif', fontWeight: 400 }}>{link.label}</span>
                <span className="ml-1.5 opacity-50 text-xs">{link.sub}</span>
              </Link>
            ))}
          </div>

          {/* 用户操作区 */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* 通知铃铛 */}
                <div className="relative" ref={notifPanelRef}>
                  <button
                    onClick={handleOpenNotifPanel}
                    className="relative p-2 rounded-full hover:bg-sakura-pale transition-colors"
                    aria-label="通知"
                  >
                    <Bell size={18} style={{ color: 'var(--ink-light)' }} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-error text-white text-[10px] font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* 通知下拉面板 */}
                  {showNotifPanel && (
                    <div
                      className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl overflow-hidden animate-fade-in"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(255,126,179,0.15)',
                      }}
                    >
                      {/* 通知标题栏 */}
                      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,126,179,0.1)' }}>
                        <span className="text-sm font-bold text-text-primary">通知</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-primary hover:text-primary-dark transition-colors"
                          >
                            全部已读
                          </button>
                        )}
                      </div>

                      {/* 通知列表 */}
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className="px-4 py-3 border-b last:border-b-0 hover:bg-primary/5 transition-colors cursor-pointer"
                              style={{ borderColor: 'rgba(255,126,179,0.05)' }}
                              onClick={async () => {
                                if (!notif.isRead) {
                                  try {
                                    await fetch(`/api/notifications/${notif.id}/read`, {
                                      method: 'PUT',
                                      headers: getAuthHeaders(),
                                    });
                                    setUnreadCount((prev) => Math.max(0, prev - 1));
                                  } catch {
                                    // 静默失败
                                  }
                                }
                                if (notif.type === 'comment_reply' && notif.relatedId) {
                                  window.location.href = `/forum/${notif.relatedId}`;
                                }
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {!notif.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-error shrink-0" />
                                    )}
                                    <span className="text-xs font-bold text-text-primary truncate">
                                      {notif.title}
                                    </span>
                                  </div>
                                  {notif.content && (
                                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                                      {notif.content}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-text-secondary/60 mt-1">
                                    {formatNotifTime(notif.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <Bell size={24} className="mx-auto mb-2 opacity-30" style={{ color: '#FF9BB5' }} />
                            <p className="text-xs text-text-secondary">暂无通知</p>
                          </div>
                        )}
                      </div>

                      {/* 查看全部 */}
                      <Link
                        href="/profile?tab=notifications"
                        className="block text-center text-xs text-primary py-2.5 border-t hover:bg-primary/5 transition-colors"
                        style={{ borderColor: 'rgba(255,126,179,0.1)' }}
                      >
                        查看全部通知
                      </Link>
                    </div>
                  )}
                </div>

                <Link href="/profile" className="text-sm text-primary hover:text-primary-dark">
                  {nickname}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  退出
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">登录</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">注册</Button>
                </Link>
              </>
            )}
          </div>

          {/* 移动端菜单按钮 */}
          <button
            className="md:hidden text-text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="菜单"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* 移动端菜单展开 */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.title}
                  className="text-sm py-2 transition-colors"
                  style={{ color: 'var(--ink-light)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="font-bold" style={{ fontFamily: '"ZCOOL KuaiLe", "ZCOOL QingKe HuangYou", "Ma Shan Zheng", sans-serif', fontWeight: 400 }}>{link.label}</span>
                  <span className="ml-2 opacity-40 text-xs">{link.sub}</span>
                </Link>
              ))}
              <div className="flex gap-2 pt-2">
                {isLoggedIn ? (
                  <>
                    <Link href="/profile" className="text-sm text-primary py-2">{nickname}</Link>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>退出</Button>
                  </>
                ) : (
                  <>
                    <Link href="/login"><Button variant="ghost" size="sm">登录</Button></Link>
                    <Link href="/register"><Button variant="primary" size="sm">注册</Button></Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
