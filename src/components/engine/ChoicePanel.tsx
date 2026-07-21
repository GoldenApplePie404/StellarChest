// 选择面板组件 - 支持普通选择/嵌入式选择/限时倒计时选择
// 选项以粉色边框按钮呈现，点击触发分支跳转
// 限时选择有倒计时进度条，超时自动选择默认选项
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChoiceOption } from '@/types/engine';

/** ChoicePanel属性 */
interface ChoicePanelProps {
  /** 选项列表 */
  options: ChoiceOption[];
  /** 选择提示语（问题文本） */
  prompt?: string;
  /** 是否限时选择 */
  timed?: boolean;
  /** 限时秒数 */
  timeLimit?: number;
  /** 默认选项索引（超时自动选择） */
  defaultIndex?: number;
  /** 选择回调（传入选项索引） */
  onChoice: (index: number) => void;
  /** CSS类名 */
  className?: string;
}

/** 选择面板组件 */
export default function ChoicePanel({
  options,
  prompt = '',
  timed = false,
  timeLimit = 10,
  defaultIndex = 0,
  onChoice,
  className = '',
}: ChoicePanelProps): React.JSX.Element | null {
  /** 剩余倒计时秒数 */
  const [remaining, setRemaining] = useState(timeLimit);
  /** 倒计时计时器 */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 限时模式倒计时逻辑 */
  useEffect(() => {
    if (!timed) return;

    setRemaining(timeLimit);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // 倒计时结束，自动选择默认选项
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          onChoice(defaultIndex);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timed, timeLimit, defaultIndex, onChoice]);

  /** 处理选项点击 */
  const handleOptionClick = useCallback((index: number) => {
    // 清除倒计时计时器
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onChoice(index);
  }, [onChoice]);

  /** 无选项时不渲染 */
  if (options.length === 0) return null;

  /** 倒计时进度百分比 */
  const progressPercent = timed ? (remaining / timeLimit) * 100 : 100;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${className}`}
      style={{ zIndex: 25 }}
    >
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 选项容器 */}
      <div className="relative flex flex-col items-center gap-4 px-8 py-8 max-w-lg max-h-[70vh] overflow-y-auto">
        {/* 选择提示语（问题文本） */}
        {prompt && (
          <div className="mb-2 text-center">
            <div className="text-white text-lg font-semibold leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {prompt}
            </div>
          </div>
        )}

        {/* 限时倒计时提示 */}
        {timed && (
          <div className="mb-2 text-center">
            <div className="text-white text-sm mb-2">
              剩余时间: {remaining}秒
            </div>
            {/* 倒计时进度条 */}
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${progressPercent}%`,
                  background: remaining <= 3
                    ? 'var(--color-error)'
                    : 'var(--color-primary)',
                }}
              />
            </div>
          </div>
        )}

        {/* 选项按钮列表 */}
        {options.map((option, index) => (
          <button
            key={`choice-${index}`}
            className="w-full py-3 px-6 text-center text-base font-medium rounded-lg
              border-2 border-primary/70 bg-black/50 text-white
              hover:bg-primary/20 hover:border-primary hover:text-white
              hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50"
            onClick={() => handleOptionClick(index)}
          >
            {option.text}
            {/* 默认选项标识（限时模式） */}
            {timed && option.isDefault && (
              <span className="ml-2 text-xs text-primary/60">(默认)</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
