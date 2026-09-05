// 新版画板 — 底部状态栏
// 缩放控制、光标坐标与文档统计
'use client';

import { Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { useCanvasStudioStore } from '@/store/useCanvasStudioStore';

export default function StudioStatusBar(): React.JSX.Element {
  const zoom = useCanvasStudioStore((s) => s.zoom);
  const setZoom = useCanvasStudioStore((s) => s.setZoom);
  const cursor = useCanvasStudioStore((s) => s.cursor);
  const layers = useCanvasStudioStore((s) => s.layers);
  const document = useCanvasStudioStore((s) => s.document);

  const shapeCount = layers.reduce((sum, layer) => sum + layer.shapes.length, 0);

  const handleFitZoom = () => {
    const availableWidth = Math.max(100, window.innerWidth - 320);
    const availableHeight = Math.max(100, window.innerHeight - 280);
    const fit = Math.min(
      availableWidth / document.width,
      availableHeight / document.height,
      1,
    );
    setZoom(Math.max(0.1, fit));
  };

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 border-t border-lavender-pale bg-cloud/30 text-[11px] text-ink-light">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setZoom(zoom / 1.2)}
          title="缩小"
          className="p-0.5 rounded hover:bg-lavender-pale text-ink-light"
        >
          <ZoomOut size={13} />
        </button>
        <span className="w-11 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom(zoom * 1.2)}
          title="放大"
          className="p-0.5 rounded hover:bg-lavender-pale text-ink-light"
        >
          <ZoomIn size={13} />
        </button>
        <button
          type="button"
          onClick={handleFitZoom}
          title="适合窗口"
          className="p-0.5 rounded hover:bg-lavender-pale text-ink-light ml-1"
        >
          <Maximize size={13} />
        </button>
      </div>

      <span className="text-ink-faint">|</span>

      <span className="tabular-nums">
        X: {cursor.x} · Y: {cursor.y}
      </span>

      <span className="text-ink-faint">|</span>

      <span>
        {document.width} × {document.height} px
      </span>

      <div className="flex-1" />

      <span>
        {layers.length} 图层 · {shapeCount} 对象
      </span>

      <span className="text-ink-faint">Ctrl+滚轮缩放 · 空格拖动(规划)</span>
    </div>
  );
}
