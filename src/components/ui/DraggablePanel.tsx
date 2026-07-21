// 可拖拽浮动面板组件 - 指令速查手册底层
// 支持拖拽定位、展开/缩回、位置记忆
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/** 可拖拽浮动面板属性 */
interface DraggablePanelProps {
  /** 面板标题 */
  title: string;
  /** 默认位置X坐标 */
  defaultX?: number;
  /** 默认位置Y坐标 */
  defaultY?: number;
  /** 默认宽度 */
  defaultWidth?: number;
  /** 默认高度 */
  defaultHeight?: number;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 子元素 */
  children: React.ReactNode;
  /** 最小宽度 */
  minWidth?: number;
  /** 自定义CSS类名 */
  className?: string;
}

/** Galgame风格可拖拽浮动面板组件 */
export default function DraggablePanel({
  title,
  defaultX = 200,
  defaultY = 100,
  defaultWidth = 320,
  defaultHeight = 400,
  defaultExpanded = true,
  children,
  minWidth = 200,
  className = '',
}: DraggablePanelProps): React.JSX.Element {
  const [position, setPosition] = useState({ x: defaultX, y: defaultY });
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [dragging, setDragging] = useState<boolean>(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  /** 处理鼠标按下开始拖拽 */
  const handleMouseDown = useCallback((e: React.MouseEvent): void => {
    if (e.target instanceof HTMLElement && e.target.closest('.drag-handle')) {
      setDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    }
  }, [position]);

  /** 处理鼠标移动拖拽 */
  const handleMouseMove = useCallback((e: MouseEvent): void => {
    if (!dragging) return;
    const newX = Math.max(0, e.clientX - dragOffset.current.x);
    const newY = Math.max(0, e.clientY - dragOffset.current.y);
    setPosition({ x: newX, y: newY });
  }, [dragging]);

  /** 处理鼠标释放结束拖拽 */
  const handleMouseUp = useCallback((): void => {
    setDragging(false);
  }, []);

  /** 全局鼠标事件监听 */
  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  /** 处理展开/缩回切换 */
  const toggleExpanded = (): void => {
    setExpanded(!expanded);
  };

  return (
    <div
      ref={panelRef}
      onMouseDown={handleMouseDown}
      className={`fixed z-40 rounded-lg shadow-xl border ${className} ${
        dragging ? 'cursor-grabbing' : ''
      } ${expanded ? '' : 'h-auto'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        background: '#1E1E28',
        borderColor: 'rgba(255,126,179,0.12)',
        width: `${size.width}px`,
        ...(expanded ? { height: `${size.height}px` } : {}),
      }}
    >
      {/* 标题栏 - 可拖拽区域 */}
      <div className="drag-handle flex items-center justify-between px-4 py-3 bg-gradient-primary rounded-t-lg cursor-grab">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <div className="flex items-center gap-2">
          {/* 展开/缩回按钮 */}
          <button
            onClick={toggleExpanded}
            className="text-white/70 hover:text-white transition-colors text-xs"
            aria-label={expanded ? '缩回' : '展开'}
          >
            {expanded ? '[-]' : '[+]'}
          </button>
        </div>
      </div>

      {/* 内容区域 - 仅在展开时显示 */}
      {expanded && (
        <div className="p-4 overflow-y-auto" style={{ maxHeight: `${size.height - 50}px` }}>
          {children}
        </div>
      )}
    </div>
  );
}
