// 底部控制栏组件 - 存档/读档/自动播放/历史回看/菜单按钮
// 固定在游戏画面底部，提供游戏操作入口
// 每个按钮点击触发对应面板或引擎功能切换
'use client';

import { useCallback } from 'react';
import type { UIPanelType } from '@/types/engine';

/** ControlBar属性 */
interface ControlBarProps {
  /** 是否自动播放模式 */
  isAutoPlay?: boolean;
  /** 引擎运行状态 */
  runState?: 'idle' | 'running' | 'paused' | 'finished' | 'error';
  /** 点击存档按钮回调 */
  onSaveClick?: () => void;
  /** 点击读档按钮回调 */
  onLoadClick?: () => void;
  /** 点击自动播放按钮回调（切换开关） */
  onAutoPlayToggle?: () => void;
  /** 点击历史回看按钮回调 */
  onHistoryClick?: () => void;
  /** 点击菜单按钮回调 */
  onMenuClick?: () => void;
  /** CSS类名 */
  className?: string;
}

/** 控制按钮定义 */
interface ControlButtonDef {
  /** 按钮标签 */
  label: string;
  /** 按钮图标（文字替代） */
  icon: string;
  /** 是否激活状态 */
  isActive?: boolean;
  /** 是否在空闲/完成状态下可用 */
  alwaysEnabled?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/** 底部控制栏组件 */
export default function ControlBar({
  isAutoPlay = false,
  runState = 'paused',
  onSaveClick,
  onLoadClick,
  onAutoPlayToggle,
  onHistoryClick,
  onMenuClick,
  className = '',
}: ControlBarProps): React.JSX.Element {
  /** 是否引擎正在运行/暂停中（可操作状态） */
  const isOperable = runState === 'running' || runState === 'paused';

  /** 构建按钮列表 */
  const buttons: ControlButtonDef[] = [
    {
      label: '存档',
      icon: 'S',
      alwaysEnabled: false,
      onClick: onSaveClick,
    },
    {
      label: '读档',
      icon: 'L',
      alwaysEnabled: false,
      onClick: onLoadClick,
    },
    {
      label: isAutoPlay ? '停止' : '自动',
      icon: isAutoPlay ? 'A!' : 'A',
      isActive: isAutoPlay,
      alwaysEnabled: false,
      onClick: onAutoPlayToggle,
    },
    {
      label: '历史',
      icon: 'H',
      alwaysEnabled: false,
      onClick: onHistoryClick,
    },
    {
      label: '菜单',
      icon: 'M',
      alwaysEnabled: true,
      onClick: onMenuClick,
    },
  ];

  /** 处理按钮点击 */
  const handleButtonClick = useCallback((btn: ControlButtonDef) => {
    if (!btn.alwaysEnabled && !isOperable) return;
    if (btn.onClick) btn.onClick();
  }, [isOperable]);

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 py-2
        ${className}`}
      style={{
        zIndex: 20,
        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
      }}
    >
      {buttons.map((btn) => {
        const disabled = !btn.alwaysEnabled && !isOperable;
        return (
          <button
            key={btn.label}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150
              ${btn.isActive
                ? 'bg-primary text-white shadow-soft'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }
              ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-primary/30
            `}
            onClick={() => handleButtonClick(btn)}
            disabled={disabled}
            title={btn.label}
          >
            <span className="inline-block w-5 h-5 text-center leading-5 mr-1 font-bold">
              {btn.icon}
            </span>
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}
