// 通知条组件 - 顶部滑入式通知，支持info/warning/success/error四种类型
// 自动定时消失，带淡入淡出动画
// 由LayerManager的notify回调触发显示
'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { NotificationType } from '@/engine/types';

/** NotificationBar属性 */
interface NotificationBarProps {
  /** 通知文本 */
  text: string;
  /** 通知类型 */
  type?: NotificationType;
  /** 显示时长（毫秒） */
  duration?: number;
  /** 关闭回调 */
  onClose?: () => void;
  /** CSS类名 */
  className?: string;
}

/** 类型颜色映射 */
const TYPE_COLORS: Record<NotificationType, string> = {
  info: 'var(--color-secondary)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  error: 'var(--color-error)',
};

/** 类型背景映射 */
const TYPE_BG: Record<NotificationType, string> = {
  info: 'rgba(126, 200, 227, 0.15)',
  warning: 'rgba(255, 230, 109, 0.15)',
  success: 'rgba(107, 203, 119, 0.15)',
  error: 'rgba(255, 107, 107, 0.15)',
};

/** 类型图标映射 */
const TYPE_ICON: Record<NotificationType, React.ComponentType<{ size?: number; color?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: XCircle,
};

/** 通知条组件 */
export default function NotificationBar({
  text,
  type = 'info',
  duration = 3000,
  onClose,
  className = '',
}: NotificationBarProps): React.JSX.Element | null {
  /** 是否可见 */
  const [visible, setVisible] = useState(true);

  /** 自动消失计时 */
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // 消失动画完成后通知父组件
      setTimeout(() => {
        if (onClose) onClose();
      }, 300); // 等待淡出动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  /** 手动关闭 */
  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  }, [onClose]);

  if (!text) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 flex items-center justify-center
        transition-all duration-300 ease-out
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        ${className}`}
      style={{
        zIndex: 50,
        padding: '12px 20px',
        background: TYPE_BG[type],
        borderBottom: `2px solid ${TYPE_COLORS[type]}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* 类型图标 */}
      <span className="mr-2" style={{ color: TYPE_COLORS[type] }}>
        {React.createElement(TYPE_ICON[type] || Info, { size: 16 })}
      </span>

      {/* 通知文本 */}
      <span className="text-text-primary text-sm font-medium">
        {text}
      </span>

      {/* 手动关闭按钮 */}
      <button
        onClick={handleClose}
        className="ml-4 text-text-secondary hover:text-text-primary transition-colors text-sm"
        aria-label="关闭通知"
      >
        x
      </button>
    </div>
  );
}
