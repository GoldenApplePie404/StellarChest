// 双层Canvas游戏显示组件 - 背景层+立绘层
// 背景Canvas渲染场景图片，立绘Canvas渲染角色立绘
// 通过ref将Canvas元素传递给LayerManager初始化渲染管线
'use client';

import { useRef, useEffect, useCallback } from 'react';

/** GameCanvas属性 */
interface GameCanvasProps {
  /** Canvas宽度（像素） */
  width?: number;
  /** Canvas高度（像素） */
  height?: number;
  /** 背景Canvas ref回调 */
  onBgCanvasReady?: (canvas: HTMLCanvasElement) => void;
  /** 立绘Canvas ref回调 */
  onCharCanvasReady?: (canvas: HTMLCanvasElement) => void;
  /** 游戏画面点击回调（推进对话/旁白） */
  onCanvasClick?: () => void;
  /** CSS类名 */
  className?: string;
}

/** 双层Canvas游戏显示组件 */
export default function GameCanvas({
  width = 1280,
  height = 720,
  onBgCanvasReady,
  onCharCanvasReady,
  onCanvasClick,
  className = '',
}: GameCanvasProps): React.JSX.Element {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const charCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** 初始化Canvas尺寸并通知父组件 */
  const initCanvases = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const charCanvas = charCanvasRef.current;
    if (!bgCanvas || !charCanvas) return;

    // 设置Canvas实际绘制尺寸（内部像素分辨率）
    bgCanvas.width = width;
    bgCanvas.height = height;
    charCanvas.width = width;
    charCanvas.height = height;

    // 通知父组件Canvas已就绪
    if (onBgCanvasReady) onBgCanvasReady(bgCanvas);
    if (onCharCanvasReady) onCharCanvasReady(charCanvas);
  }, [width, height, onBgCanvasReady, onCharCanvasReady]);

  /** 组件挂载后初始化 */
  useEffect(() => {
    initCanvases();
  }, [initCanvases]);

  /** 处理Canvas区域点击事件 */
  const handleClick = useCallback(() => {
    if (onCanvasClick) onCanvasClick();
  }, [onCanvasClick]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        aspectRatio: `${width} / ${height}`,
        background: '#000',
      }}
      onClick={handleClick}
    >
      {/* 背景层Canvas - 绘制场景背景图片 */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />

      {/* 立绘层Canvas - 绘制角色立绘图片 */}
      <canvas
        id="char-canvas"
        ref={charCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 2 }}
      />

      {/* 效果层 - 闪屏/滤镜等CSS效果覆盖 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 3 }}
        id="effect-layer"
      />
    </div>
  );
}
