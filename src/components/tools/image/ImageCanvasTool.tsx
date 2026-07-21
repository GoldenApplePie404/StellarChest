// 画布绘图工具组件 — Canvas 绘画引擎集成, 画笔/橡皮/形状/图层/撤销
// 左侧工具栏 + 顶部参数栏 + 右侧图层面板, 日式标签风格
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Pen, Eraser, Square, Circle, Minus, ArrowRight, PaintBucket, Pipette,
  Undo2, Redo2, Plus, Eye, EyeOff, Download, Layers,
} from 'lucide-react';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import Button from '@/components/ui/Button';
import { useCanvasEngine } from '@/hooks/useCanvasEngine';
import type { CanvasTool } from '@/types/tools';

/** 工具按钮定义 */
interface ToolButtonDef {
  tool: CanvasTool;
  icon: typeof Pen;
  label: string;
}

/** 工具按钮列表 */
const TOOLS: ToolButtonDef[] = [
  { tool: 'brush', icon: Pen, label: '画笔' },
  { tool: 'eraser', icon: Eraser, label: '橡皮' },
  { tool: 'rect', icon: Square, label: '矩形' },
  { tool: 'circle', icon: Circle, label: '圆形' },
  { tool: 'line', icon: Minus, label: '直线' },
  { tool: 'arrow', icon: ArrowRight, label: '箭头' },
  { tool: 'fill', icon: PaintBucket, label: '填充' },
  { tool: 'eyedropper', icon: Pipette, label: '吸管' },
];

/** Canvas 默认尺寸 */
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

/** 画布绘图工具组件 */
export default function ImageCanvasTool(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const {
    layers,
    activeLayerIndex,
    setTool,
    setBrushSize,
    setBrushColor,
    setBrushOpacity,
    setActiveLayer,
    setLayerVisibility,
    undo,
    redo,
    canUndo,
    canRedo,
    addLayer,
    removeLayer,
    mergeAndExport,
  } = useCanvasEngine(canvasRef);

  const [activeTool, setActiveTool] = useState<CanvasTool>('brush');
  const [brushSize, setBrushSizeState] = useState<number>(4);
  const [brushColor, setBrushColorState] = useState<string>('#4A3F45');
  const [brushOpacity, setBrushOpacityState] = useState<number>(1);

  /** 工具切换 */
  const handleToolChange = useCallback(
    (tool: CanvasTool) => {
      setActiveTool(tool);
      setTool(tool);
    },
    [setTool],
  );

  /** 画笔大小变更 */
  const handleBrushSizeChange = useCallback(
    (size: number) => {
      setBrushSizeState(size);
      setBrushSize(size);
    },
    [setBrushSize],
  );

  /** 画笔颜色变更 */
  const handleBrushColorChange = useCallback(
    (color: string) => {
      setBrushColorState(color);
      setBrushColor(color);
    },
    [setBrushColor],
  );

  /** 画笔不透明度变更 */
  const handleBrushOpacityChange = useCallback(
    (opacity: number) => {
      setBrushOpacityState(opacity);
      setBrushOpacity(opacity);
    },
    [setBrushOpacity],
  );

  /** 导出画布 */
  const handleExport = useCallback(() => {
    const dataUrl = mergeAndExport('png', 1);
    if (!dataUrl) return;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'canvas_export.png';
    a.click();
  }, [mergeAndExport]);

  /** 键盘快捷键 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return (
    <ToolWorkspace title="画布绘图" icon={Pen}>
      <div className="flex h-full gap-0" ref={wrapperRef}>
        {/* 左侧工具栏 (w-12) */}
        <div className="w-12 flex-shrink-0 border-r border-lavender-pale bg-cloud/50 py-2 flex flex-col gap-1 items-center">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTool === t.tool;
            return (
              <button
                key={t.tool}
                onClick={() => handleToolChange(t.tool)}
                title={t.label}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-sakura text-cloud shadow-sm'
                    : 'text-ink-light hover:bg-lavender-pale hover:text-ink'
                }`}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>

        {/* 中央绘图区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 顶部参数栏 */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-lavender-pale bg-cloud/30">
            {/* 画笔大小 */}
            <div className="flex items-center gap-1.5">
              <Pen size={14} className="text-ink-light" />
              <input
                type="range"
                min={1}
                max={40}
                value={brushSize}
                onChange={(e) => handleBrushSizeChange(Number(e.target.value))}
                className="w-20 accent-sakura h-1"
              />
              <span className="text-ink-faint text-xs w-5">{brushSize}</span>
            </div>

            {/* 颜色选择器 */}
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full border border-ink-faint"
                style={{ backgroundColor: brushColor }}
              />
              <input
                type="color"
                value={brushColor}
                onChange={(e) => handleBrushColorChange(e.target.value)}
                className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
              />
            </div>

            {/* 不透明度 */}
            <div className="flex items-center gap-1.5">
              <span className="text-ink-light text-xs">不透明度</span>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(brushOpacity * 100)}
                onChange={(e) => handleBrushOpacityChange(Number(e.target.value) / 100)}
                className="w-16 accent-sakura h-1"
              />
              <span className="text-ink-faint text-xs w-7">{Math.round(brushOpacity * 100)}%</span>
            </div>

            <div className="flex-1" />

            {/* 撤销/重做 */}
            <button
              onClick={undo}
              disabled={!canUndo}
              title="撤销 (Ctrl+Z)"
              className="p-1.5 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-light"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="重做 (Ctrl+Shift+Z)"
              className="p-1.5 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-light"
            >
              <Redo2 size={16} />
            </button>

            {/* 导出 */}
            <Button variant="primary" size="sm" onClick={handleExport}>
              <Download size={14} className="mr-1 inline" />
              导出画布
            </Button>
          </div>

          {/* Canvas 绘图区域 (网格背景) */}
          <div className="flex-1 overflow-auto bg-[#f0edf5] flex items-center justify-center p-4">
            <div
              className="shadow-md rounded-sm overflow-hidden"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e0d6f2 25%, transparent 25%), linear-gradient(-45deg, #e0d6f2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0d6f2 75%), linear-gradient(-45deg, transparent 75%, #e0d6f2 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block"
                style={{ maxWidth: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* 右侧图层面板 (w-40) */}
        <div className="w-40 flex-shrink-0 border-l border-lavender-pale bg-cloud/50 flex flex-col">
          <div className="px-3 py-2 border-b border-lavender-pale flex items-center gap-1.5">
            <Layers size={14} className="text-ink-light" />
            <span className="text-ink text-xs font-medium">图层</span>
          </div>

          {/* 图层列表 */}
          <div className="flex-1 overflow-y-auto py-1">
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                onClick={() => setActiveLayer(index)}
                className={`px-3 py-1.5 flex items-center gap-1.5 cursor-pointer text-xs transition-colors ${
                  index === activeLayerIndex
                    ? 'bg-sakura-pale text-ink'
                    : 'text-ink-light hover:bg-lavender-pale/50'
                }`}
              >
                {/* 可见性切换 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayerVisibility(index, !layer.visible);
                  }}
                  className="text-ink-faint hover:text-ink"
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>

                <span className="flex-1 truncate">{layer.name}</span>

                {layers.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLayer(index);
                    }}
                    className="text-ink-faint hover:text-sakura-dark ml-auto"
                    title="删除图层"
                  >
                    <Minus size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 添加图层按钮 */}
          <div className="p-2 border-t border-lavender-pale">
            <button
              onClick={() => addLayer(`图层 ${layers.length + 1}`)}
              className="w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 bg-lavender-pale text-ink-light hover:bg-lavender-light hover:text-ink transition-all"
            >
              <Plus size={14} />
              添加图层
            </button>
          </div>
        </div>
      </div>
    </ToolWorkspace>
  );
}
