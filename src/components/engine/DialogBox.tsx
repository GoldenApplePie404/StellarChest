// 对话框组件 - 半透明面板显示角色名和对话文本
// 支持逐字显示动画（文字逐个出现）、粉色边框装饰
// 点击推进时完成全文显示
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/** DialogBox属性 */
interface DialogBoxProps {
  /** 角色名（空为旁白） */
  speaker: string;
  /** 对话文本内容 */
  text: string;
  /** 逐字显示速度（毫秒/字，fast=30/normal=50/slow=80） */
  textSpeed?: 'fast' | 'normal' | 'slow' | number;
  /** 对话框样式 */
  dialogStyle?: 'normal' | 'none' | 'fullscreen';
  /** 文字特效类型 */
  textEffect?: string;
  /** 是否等待用户点击推进 */
  isWaiting?: boolean;
  /** 点击回调（推进对话） */
  onAdvance?: () => void;
  /** CSS类名 */
  className?: string;
}

/** 速度映射表（毫秒/字） */
const SPEED_MAP: Record<string, number> = {
  fast: 30,
  normal: 50,
  slow: 80,
};

/** 对话框组件 */
export default function DialogBox({
  speaker,
  text,
  textSpeed = 'normal',
  dialogStyle = 'normal',
  textEffect = '',
  isWaiting = true,
  onAdvance,
  className = '',
}: DialogBoxProps): React.JSX.Element | null {
  /** 当前已显示的字符数 */
  const [visibleCount, setVisibleCount] = useState(0);
  /** 是否已完成全文显示 */
  const [isComplete, setIsComplete] = useState(false);
  /** 逐字计时器ref */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 容器ref */
  const containerRef = useRef<HTMLDivElement>(null);

  /** 计算逐字间隔时间 */
  const intervalMs = typeof textSpeed === 'number' ? textSpeed : SPEED_MAP[textSpeed] || 50;

  /** 启动逐字显示动画 */
  useEffect(() => {
    setVisibleCount(0);
    setIsComplete(false);

    if (text.length === 0) {
      setIsComplete(true);
      return;
    }

    timerRef.current = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 1;
        if (next >= text.length) {
          // 全文显示完毕，清除计时器
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsComplete(true);
          return text.length;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, intervalMs]);

  /** 点击对话框区域 */
  const handleClick = useCallback(() => {
    if (!isComplete) {
      // 未完成逐字显示时，点击立即显示全文
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setVisibleCount(text.length);
      setIsComplete(true);
      return;
    }

    // 全文已显示且处于等待状态时，点击推进下一行
    if (isWaiting && onAdvance) {
      onAdvance();
    }
  }, [isComplete, isWaiting, onAdvance, text.length]);

  /** fullscreen样式 - 全屏覆盖 */
  if (dialogStyle === 'none') return null;

  if (dialogStyle === 'fullscreen') {
    return (
      <div
        ref={containerRef}
        className={`absolute inset-0 flex items-center justify-center cursor-pointer ${className}`}
        onClick={handleClick}
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
        }}
      >
        {/* 角色名 */}
        {speaker && (
          <div
            className="text-primary font-bold mb-3 text-center text-lg"
            style={{ color: 'var(--color-primary)' }}
          >
            {speaker}
          </div>
        )}
        {/* 对话文本 */}
        <div className="text-white text-center text-xl leading-relaxed max-w-3xl px-8">
          {text.slice(0, visibleCount)}
          {!isComplete && (
            <span className="inline-block w-2 h-5 bg-white/80 animate-pulse ml-1" />
          )}
        </div>
      </div>
    );
  }

  /** normal样式 - 底部半透明面板 */
  const visibleText = text.slice(0, visibleCount);
  const textEffectClass = textEffect === 'shake' ? 'animate-bounce-light'
    : textEffect === 'wave' ? 'animate-fade-in'
    : textEffect === 'glow' ? 'gradient-text'
    : '';

  return (
    <div
      ref={containerRef}
      className={`galgame-dialog cursor-pointer ${className}`}
      onClick={handleClick}
      style={{
        position: 'absolute',
        bottom: 56,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: '16px 24px 80px',
      }}
    >
      {/* 角色名标签 */}
      {speaker && (
        <div
          className="inline-block px-3 py-1 rounded-t-md mb-2 font-bold text-sm"
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            marginTop: '-20px',
          }}
        >
          {speaker}
        </div>
      )}

      {/* 旁白标识 */}
      {!speaker && text && (
        <div className="text-text-secondary text-xs mb-1 italic">
          (旁白)
        </div>
      )}

      {/* 对话文本区域 */}
      <div className={`text-white text-base leading-relaxed ${textEffectClass}`}>
        {visibleText}
        {!isComplete && (
          <span className="inline-block w-1.5 h-4 bg-primary/80 animate-pulse ml-0.5" />
        )}
      </div>

      {/* 等待推进指示器 */}
      {isComplete && isWaiting && (
        <div className="absolute bottom-2 right-6 text-primary/60 animate-pulse text-xs">
          (点击继续)
        </div>
      )}
    </div>
  );
}
