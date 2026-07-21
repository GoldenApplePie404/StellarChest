// 通用拖拽Hook - 抽取DraggablePanel的拖拽逻辑为可复用Hook
// 支持鼠标拖拽定位和位置记忆（localStorage存储）
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/** 拖拽位置 */
interface DragPosition {
  /** X坐标 */
  x: number;
  /** Y坐标 */
  y: number;
}

/** useDraggable配置 */
interface UseDraggableOptions {
  /** 位置记忆的localStorage键名 */
  storageKey?: string;
  /** 默认X坐标 */
  defaultX?: number;
  /** 默认Y坐标 */
  defaultY?: number;
}

/** useDraggable返回值 */
interface UseDraggableReturn {
  /** 当前位置 */
  position: DragPosition;
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 拖拽开始处理函数（绑定到mousedown） */
  handleDragStart: (e: React.MouseEvent) => void;
  /** 拴拽容器ref */
  dragRef: React.RefObject<HTMLDivElement | null>;
}

/** 通用拖拽Hook */
export function useDraggable(options: UseDraggableOptions = {}): UseDraggableReturn {
  const { storageKey, defaultX = 0, defaultY = 0 } = options;

  /** 初始位置（从localStorage恢复或使用默认值） */
  const initialPosition = useCallback(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as DragPosition;
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        } catch {
          // 数据损坏，使用默认值
        }
      }
    }
    return { x: defaultX, y: defaultY };
  }, [storageKey, defaultX, defaultY]);

  /** 当前位置状态 */
  const [position, setPosition] = useState<DragPosition>(initialPosition);
  /** 是否正在拖拽 */
  const [isDragging, setIsDragging] = useState<boolean>(false);
  /** 拖拽偏移量ref */
  const dragOffset = useRef<DragPosition>({ x: 0, y: 0 });
  /** 拴拽容器ref */
  const dragRef = useRef<HTMLDivElement | null>(null);

  /** 保存位置到localStorage */
  const savePosition = useCallback((pos: DragPosition) => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    }
  }, [storageKey]);

  /** 拖拽开始处理 */
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  /** 拖拽移动处理 */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = Math.max(0, e.clientX - dragOffset.current.x);
    const newY = Math.max(0, e.clientY - dragOffset.current.y);
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  /** 拖拽结束处理 */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // 拖拽结束时保存位置
    savePosition(position);
  }, [position, savePosition]);

  /** 全局鼠标事件监听 */
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    isDragging,
    handleDragStart,
    dragRef,
  };
}

export default useDraggable;
