// 存档/读档面板组件 - 8个存档槽位，支持保存和读取
// 每个槽位显示存档时间、当前章节、背景缩略图
// 空槽位显示"空"，点击保存到当前槽位或读取已有存档
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameSave } from '@/types/engine';
import Button from '@/components/ui/Button';

/** 存档槽位总数 */
const SLOT_COUNT = 8;

/** SaveLoadPanel属性 */
interface SaveLoadPanelProps {
  /** 面板模式：save（存档）或 load（读档） */
  mode: 'save' | 'load';
  /** 项目ID（用于存档key前缀） */
  projectId: string;
  /** 存档回调（传入槽位号） */
  onSave?: (slot: number) => void;
  /** 读档回调（传入存档数据） */
  onLoad?: (saveData: GameSave) => void;
  /** 关闭面板回调 */
  onClose: () => void;
  /** CSS类名 */
  className?: string;
}

/** 存档/读档面板组件 */
export default function SaveLoadPanel({
  mode,
  projectId,
  onSave,
  onLoad,
  onClose,
  className = '',
}: SaveLoadPanelProps): React.JSX.Element {
  /** 各槽位的存档数据 */
  const [saves, setSaves] = useState<Map<number, GameSave | null>>(new Map());

  /** 从localStorage读取所有槽位的存档数据 */
  const loadAllSaves = useCallback(() => {
    const saveMap = new Map<number, GameSave | null>();
    for (let i = 0; i < SLOT_COUNT; i++) {
      const storageKey = `galgame_save_${projectId}_${i}`;
      const rawData = localStorage.getItem(storageKey);
      if (rawData) {
        try {
          const saveData = JSON.parse(rawData) as GameSave;
          saveMap.set(i, saveData);
        } catch {
          saveMap.set(i, null);
        }
      } else {
        saveMap.set(i, null);
      }
    }
    setSaves(saveMap);
  }, [projectId]);

  /** 初始化时加载存档数据 */
  useEffect(() => {
    loadAllSaves();
  }, [loadAllSaves]);

  /** 处理槽位点击 */
  const handleSlotClick = useCallback((slot: number) => {
    const saveData = saves.get(slot);

    if (mode === 'save') {
      // 存档模式：保存到指定槽位
      if (onSave) onSave(slot);
      // 保存后重新读取存档数据更新面板
      setTimeout(loadAllSaves, 100);
    } else {
      // 读档模式：读取指定槽位
      if (saveData && onLoad) {
        onLoad(saveData);
      }
    }
  }, [mode, saves, onSave, onLoad, loadAllSaves]);

  /** 格式化存档时间显示 */
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hour}:${minute}`;
  };

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center ${className}`}
    >
      {/* 半透明遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 面板内容 */}
      <div
        className="relative w-full max-w-2xl bg-card rounded-xl shadow-hover p-6 animate-fade-in"
        style={{
          background: 'rgba(30, 30, 40, 0.95)',
          border: '1px solid var(--color-primary)',
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {mode === 'save' ? '存档' : '读档'}
          </h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl transition-colors"
            aria-label="关闭"
          >
            x
          </button>
        </div>

        {/* 存档槽位网格（2行4列） */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: SLOT_COUNT }, (_, i) => {
            const saveData = saves.get(i);
            const isEmpty = !saveData;

            return (
              <button
                key={`slot-${i}`}
                className={`p-3 rounded-lg text-left transition-all duration-150
                  ${isEmpty
                    ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                    : 'bg-white/10 border border-primary/40 hover:bg-primary/20 hover:border-primary'
                  }
                  ${mode === 'load' && isEmpty ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                `}
                onClick={() => handleSlotClick(i)}
                disabled={mode === 'load' && isEmpty}
              >
                {/* 槽位编号 */}
                <div className="text-xs text-primary/80 font-medium mb-1">
                  槽位 {i + 1}
                </div>

                {/* 存档内容 */}
                {isEmpty ? (
                  <div className="text-white/30 text-sm">空</div>
                ) : (
                  <>
                    {/* 背景缩略图占位 */}
                    <div
                      className="w-full h-16 rounded mb-2 bg-white/10 overflow-hidden"
                      style={{
                        background: saveData.currentBackground
                          ? `url(${saveData.currentBackground}) center/cover`
                          : 'rgba(0,0,0,0.3)',
                      }}
                    />
                    {/* 章节名 */}
                    <div className="text-white text-xs truncate">
                      {saveData.currentChapter || '未命名章节'}
                    </div>
                    {/* 存档时间 */}
                    <div className="text-white/40 text-xs">
                      {formatTime(saveData.savedAt)}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </div>
  );
}
