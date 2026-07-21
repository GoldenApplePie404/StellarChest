// 弹窗组件 - galgame风格模态弹窗
'use client';

import { useEffect, useCallback } from 'react';
import Button from './Button';

/** 弹窗属性 */
interface ModalProps {
  /** 是否显示 */
  visible: boolean;
  /** 标题 */
  title: string;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认回调（可选） */
  onConfirm?: () => void;
  /** 确认按钮文字 */
  confirmText?: string;
  /** 取消按钮文字 */
  cancelText?: string;
  /** 是否显示确认按钮 */
  showConfirm?: boolean;
  /** 子元素 */
  children: React.ReactNode;
  /** 弹窗宽度 */
  width?: string;
}

/** Galgame风格弹窗组件 */
export default function Modal({
  visible,
  title,
  onClose,
  onConfirm,
  confirmText = '确认',
  cancelText = '取消',
  showConfirm = true,
  children,
  width = 'max-w-md',
}: ModalProps): React.JSX.Element | null {
  /** 处理ESC键关闭 */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  /** 监听键盘事件 */
  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      // 阻止背景滚动
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* 半透明遮罩层 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* 弹窗内容 */}
      <div className={`relative ${width} rounded-2xl shadow-xl p-6 animate-fade-in mx-auto`}
        style={{ background: '#FFFFFF', border: '1px solid rgba(255,126,179,0.15)', margin: 'auto' }}>
        {/* 标题区域 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors duration-150 text-xl"
            aria-label="关闭"
          >
            x
          </button>
        </div>
        {/* 内容区域 */}
        <div className="mb-6">{children}</div>
        {/* 按钮区域 */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          {showConfirm && onConfirm && (
            <Button variant="primary" onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
