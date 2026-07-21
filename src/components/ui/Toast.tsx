// 提示通知组件 - galgame风格浮动提示
'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

/** Toast属性 */
interface ToastProps {
  /** 提示消息 */
  message: string;
  /** 提示类型 */
  type?: 'success' | 'error' | 'warning' | 'info';
  /** 自动关闭时间（毫秒） */
  duration?: number;
  /** 关闭回调 */
  onClose?: () => void;
}

/** 类型样式映射 */
const typeStyles: Record<string, React.CSSProperties> = {
  success: { background: '#98E8C8', color: '#4A3045', boxShadow: '0 4px 16px rgba(152,232,200,0.3)' },
  error:   { background: '#FF6B7A', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(255,107,122,0.3)' },
  warning: { background: '#FFD700', color: '#4A3045', boxShadow: '0 4px 16px rgba(255,215,0,0.3)' },
  info:    { background: '#C8A2E8', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(200,162,232,0.3)' },
};

const typeIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

/** Galgame风格提示通知组件 */
export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps): React.JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(true);

  /** 自动关闭 */
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="rounded-2xl px-4 py-3 flex items-center gap-2 min-w-[200px]" style={typeStyles[type]}>
        {React.createElement(typeIcons[type] || Info, { size: 16 })}
        <span className="text-sm">{message}</span>
        {/* 手动关闭按钮 */}
        <button
          onClick={() => {
            setVisible(false);
            if (onClose) onClose();
          }}
          className="ml-auto opacity-70 hover:opacity-100 transition-opacity font-bold"
          aria-label="关闭提示"
        >
          x
        </button>
      </div>
    </div>
  );
}
