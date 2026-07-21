// 图片查看器 - 支持缩放、拖拽、全屏模态预览
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageViewerProps {
  /** 图片 URL */
  src: string;
  /** 图片 alt 文本 */
  alt: string;
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/** 图片查看器组件 */
export default function ImageViewer({ src, alt, visible, onClose }: ImageViewerProps): React.JSX.Element | null {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [posStart, setPosStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 关闭时重置状态
  useEffect(() => {
    if (!visible) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [visible]);

  // ESC 关闭
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => {
      const next = Math.min(5, Math.max(0.5, prev + delta));
      return next;
    });
  }, []);

  // 拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPosStart({ ...position });
  }, [scale, position]);

  // 拖拽移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPosition({
      x: posStart.x + dx,
      y: posStart.y + dy,
    });
  }, [isDragging, dragStart, posStart]);

  // 拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 重置缩放/位置
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 点击背景关闭
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none"
      onClick={handleBackdropClick}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 工具栏 */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={handleReset}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all text-sm"
          title="重置缩放"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
        <span className="text-white/60 text-xs min-w-[48px] text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          title="关闭 (ESC)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* 缩放提示 */}
      {scale > 1 && !isDragging && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-xs pointer-events-none animate-fade-in">
          拖拽移动 · 滚轮缩放
        </div>
      )}

      {/* 图片容器 */}
      <div
        ref={containerRef}
        className="max-w-[90vw] max-h-[90vh] overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.15s ease',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          draggable={false}
          style={{
            imageRendering: scale > 2 ? 'pixelated' : 'auto',
          }}
        />
      </div>
    </div>
  );
}
