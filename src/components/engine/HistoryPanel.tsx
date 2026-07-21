// 对话历史回看面板 - 滚动显示过去的对话/旁白记录
// 按时间顺序从上到下排列，每条记录显示角色名和文本
// 支持关闭按钮返回游戏
'use client';

import { useCallback, useRef, useEffect } from 'react';

/** 单条历史记录 */
interface HistoryEntry {
  /** 角色名（空为旁白） */
  speaker: string;
  /** 对话文本 */
  text: string;
  /** 行号 */
  lineIndex?: number;
}

/** HistoryPanel属性 */
interface HistoryPanelProps {
  /** 历史记录列表 */
  history: HistoryEntry[];
  /** 关闭面板回调 */
  onClose: () => void;
  /** CSS类名 */
  className?: string;
}

/** 对话历史回看面板组件 */
export default function HistoryPanel({
  history,
  onClose,
  className = '',
}: HistoryPanelProps): React.JSX.Element {
  /** 滚动容器ref */
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 自动滚动到底部 */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  /** 处理关闭 */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /** 处理ESC键关闭 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center ${className}`}
    >
      {/* 半透明遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 面板内容 */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] rounded-xl animate-fade-in overflow-hidden"
        style={{
          background: 'rgba(30, 30, 40, 0.95)',
          border: '1px solid var(--color-primary)',
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">对话历史</h3>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white text-xl transition-colors"
            aria-label="关闭"
          >
            x
          </button>
        </div>

        {/* 历史记录滚动区域 */}
        <div
          ref={scrollRef}
          className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-3"
        >
          {history.length === 0 ? (
            <div className="text-white/40 text-center py-8">暂无对话记录</div>
          ) : (
            history.map((entry, index) => (
              <div
                key={`history-${index}`}
                className="py-2 border-b border-white/5 last:border-b-0"
              >
                {/* 角色名 */}
                {entry.speaker && (
                  <div
                    className="text-sm font-bold mb-1"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {entry.speaker}
                  </div>
                )}
                {/* 旁白标识 */}
                {!entry.speaker && (
                  <div className="text-white/40 text-xs mb-1 italic">旁白</div>
                )}
                {/* 对话文本 */}
                <div className="text-white/90 text-sm leading-relaxed">
                  {entry.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-white/10">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-white/10 text-white/80 rounded-md hover:bg-white/20 transition-all"
          >
            返回游戏
          </button>
        </div>
      </div>
    </div>
  );
}

/** 导出历史记录类型供useEngine使用 */
export type { HistoryEntry };
