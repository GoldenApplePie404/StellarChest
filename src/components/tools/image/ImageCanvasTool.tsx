// 画布绘图工具组件 — Canvas 绘画引擎集成 (B1 专业工作台骨架)
// 左侧分组工具栏 + 顶部工具参数栏 + 底部状态栏(缩放/坐标) + 右侧图层面板
// 支持: 画笔/橡皮(硬度)/填充/吸管/形状/文本, 前景背景色切换, 快捷键, Ctrl+滚轮缩放
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Pen, Eraser, Square, Circle, Minus, ArrowRight, PaintBucket, Pipette, Type,
  Undo2, Redo2, Plus, Eye, EyeOff, Download, Layers,
  ZoomIn, ZoomOut, Maximize, ArrowUpDown,
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
  shortcut: string;
}

/** 工具分组定义 */
interface ToolGroupDef {
  id: string;
  label: string;
  tools: ToolButtonDef[];
}

/** 工具分组 (专业工作台布局) */
const TOOL_GROUPS: ToolGroupDef[] = [
  {
    id: 'draw',
    label: '绘图',
    tools: [
      { tool: 'brush', icon: Pen, label: '画笔', shortcut: 'B' },
      { tool: 'eraser', icon: Eraser, label: '橡皮', shortcut: 'E' },
      { tool: 'fill', icon: PaintBucket, label: '填充', shortcut: 'G' },
      { tool: 'eyedropper', icon: Pipette, label: '吸管', shortcut: 'I' },
    ],
  },
  {
    id: 'shape',
    label: '形状',
    tools: [
      { tool: 'rect', icon: Square, label: '矩形', shortcut: 'S' },
      { tool: 'circle', icon: Circle, label: '圆形', shortcut: 'C' },
      { tool: 'line', icon: Minus, label: '直线', shortcut: 'L' },
      { tool: 'arrow', icon: ArrowRight, label: '箭头', shortcut: 'A' },
    ],
  },
  {
    id: 'text',
    label: '文字',
    tools: [
      { tool: 'text', icon: Type, label: '文本', shortcut: 'T' },
    ],
  },
];

/** Canvas 默认尺寸 */
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

/** 缩放范围 */
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;

/** 颜色预设 (专业调色板) */
const COLOR_PRESETS: string[] = [
  '#4A3F45', '#E5533D', '#F07A9A', '#9B59B6', '#5B7BD5',
  '#4CAF85', '#F2A93B', '#D94848', '#FFFFFF', '#000000',
];

/** 画布绘图工具组件 */
export default function ImageCanvasTool(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    engine,
    layers,
    activeLayerIndex,
    cursorPos,
    setTool,
    setBrushSize,
    setBrushColor,
    setBrushOpacity,
    setBrushHardness,
    setBackgroundColor,
    swapColors,
    setTextContent,
    setTextFontSize,
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
  const [bgColor, setBgColorState] = useState<string>('#FFFFFF');
  const [brushOpacity, setBrushOpacityState] = useState<number>(1);
  const [brushHardness, setBrushHardnessState] = useState<number>(1);
  const [textContent, setTextContentState] = useState<string>('文本');
  const [textFontSize, setTextFontSizeState] = useState<number>(24);
  const [zoom, setZoom] = useState<number>(1);

  /** 工具切换 (含快捷键联动) */
  const handleToolChange = useCallback(
    (tool: CanvasTool) => {
      setActiveTool(tool);
      setTool(tool);
    },
    [setTool],
  );

  /** 笔刷大小 (上下限 1~100) */
  const handleBrushSizeChange = useCallback(
    (size: number) => {
      const s = Math.max(1, Math.min(100, size));
      setBrushSizeState(s);
      setBrushSize(s);
    },
    [setBrushSize],
  );

  /** 前景色 */
  const handleBrushColorChange = useCallback(
    (color: string) => {
      setBrushColorState(color);
      setBrushColor(color);
    },
    [setBrushColor],
  );

  /** 背景色 */
  const handleBgColorChange = useCallback(
    (color: string) => {
      setBgColorState(color);
      setBackgroundColor(color);
    },
    [setBackgroundColor],
  );

  /** 交换前景/背景色 */
  const handleSwapColors = useCallback(() => {
    setBrushColorState(bgColor);
    setBgColorState(brushColor);
    swapColors();
  }, [bgColor, brushColor, swapColors]);

  /** 不透明度 */
  const handleBrushOpacityChange = useCallback(
    (opacity: number) => {
      setBrushOpacityState(opacity);
      setBrushOpacity(opacity);
    },
    [setBrushOpacity],
  );

  /** 硬度 */
  const handleBrushHardnessChange = useCallback(
    (hardness: number) => {
      setBrushHardnessState(hardness);
      setBrushHardness(hardness);
    },
    [setBrushHardness],
  );

  /** 文本内容 */
  const handleTextContentChange = useCallback(
    (content: string) => {
      setTextContentState(content);
      setTextContent(content);
    },
    [setTextContent],
  );

  /** 文本字号 */
  const handleTextFontSizeChange = useCallback(
    (size: number) => {
      const s = Math.max(8, Math.min(200, size));
      setTextFontSizeState(s);
      setTextFontSize(s);
    },
    [setTextFontSize],
  );

  /** 缩放 (钳制范围) */
  const changeZoom = useCallback((next: number) => {
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)));
  }, []);

  /** 适合窗口 */
  const handleFitZoom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const availW = Math.max(100, el.clientWidth - 48);
    const availH = Math.max(100, el.clientHeight - 48);
    const z = Math.min(availW / CANVAS_WIDTH, availH / CANVAS_HEIGHT);
    setZoom(Math.max(ZOOM_MIN, Math.min(1, z)));
  }, []);

  /** 导出画布 */
  const handleExport = useCallback(() => {
    const dataUrl = mergeAndExport('png', 1);
    if (!dataUrl) return;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'canvas_export.png';
    a.click();
  }, [mergeAndExport]);

  /** Ctrl+滚轮缩放 */
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * factor)));
    },
    [],
  );

  /** 吸管取色后同步前景色状态 */
  const handleCanvasMouseUp = useCallback(() => {
    if (activeTool === 'eyedropper' && engine) {
      setBrushColorState(engine.getBrush().color);
    }
  }, [activeTool, engine]);

  /** 键盘快捷键 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // 撤销/重做
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      const key = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // 工具快捷键
      const shortcutMap: Record<string, CanvasTool> = {
        b: 'brush',
        e: 'eraser',
        g: 'fill',
        i: 'eyedropper',
        s: 'rect',
        c: 'circle',
        l: 'line',
        a: 'arrow',
        t: 'text',
      };
      if (shortcutMap[key]) {
        e.preventDefault();
        handleToolChange(shortcutMap[key]!);
        return;
      }

      // 交换前景/背景色
      if (key === 'x') {
        e.preventDefault();
        handleSwapColors();
        return;
      }

      // 笔刷大小调整
      if (key === '[') {
        e.preventDefault();
        handleBrushSizeChange(brushSize - 1);
        return;
      }
      if (key === ']') {
        e.preventDefault();
        handleBrushSizeChange(brushSize + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleToolChange, handleSwapColors, handleBrushSizeChange, brushSize]);

  /** 是否展示笔刷参数 (画笔/橡皮) */
  const showBrushParams = activeTool === 'brush' || activeTool === 'eraser';
  /** 是否展示硬度 */
  const showHardness = showBrushParams;
  /** 是否展示文本参数 */
  const showTextParams = activeTool === 'text';

  return (
    <ToolWorkspace title="画布编辑" icon={Pen}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-1 min-h-0">
          {/* ========== 左侧分组工具栏 ========== */}
          <div className="w-14 flex-shrink-0 border-r border-lavender-pale bg-cloud/50 py-2 flex flex-col items-center overflow-y-auto">
            {TOOL_GROUPS.map((group) => (
              <div key={group.id} className="w-full flex flex-col items-center gap-1 mb-2 last:mb-0">
                <span className="text-[9px] uppercase tracking-widest text-ink-faint select-none">{group.label}</span>
                {group.tools.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTool === t.tool;
                  return (
                    <button
                      key={t.tool}
                      onClick={() => handleToolChange(t.tool)}
                      title={`${t.label} (${t.shortcut})`}
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
            ))}

            {/* 前景/背景色块 */}
            <div className="mt-auto mb-1 flex flex-col items-center gap-1 pt-2 border-t border-lavender-pale w-full">
              <button
                onClick={handleSwapColors}
                title="交换前景/背景色 (X)"
                className="text-ink-faint hover:text-ink transition-colors mb-0.5"
              >
                <ArrowUpDown size={14} />
              </button>
              <div className="relative w-9 h-9" title="前景色">
                <div
                  className="absolute inset-0 rounded-lg border border-ink-faint"
                  style={{ backgroundColor: brushColor }}
                />
              </div>
              <div
                className="w-5 h-5 rounded border border-ink-faint -mt-2 mr-4"
                style={{ backgroundColor: bgColor }}
                title="背景色"
              />
            </div>
          </div>

          {/* ========== 中央区 ========== */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 顶部工具参数栏 */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-lavender-pale bg-cloud/30 flex-wrap">
              {/* 笔刷大小 */}
              {(showBrushParams || activeTool === 'rect' || activeTool === 'circle' || activeTool === 'line' || activeTool === 'arrow') && (
                <div className="flex items-center gap-1.5">
                  <Pen size={14} className="text-ink-light" />
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={brushSize}
                    onChange={(e) => handleBrushSizeChange(Number(e.target.value))}
                    className="w-20 accent-sakura h-1"
                  />
                  <span className="text-ink-faint text-xs w-5">{brushSize}px</span>
                </div>
              )}

              {/* 硬度 (仅画笔/橡皮) */}
              {showHardness && (
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-light text-xs">硬度</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(brushHardness * 100)}
                    onChange={(e) => handleBrushHardnessChange(Number(e.target.value) / 100)}
                    className="w-16 accent-sakura h-1"
                  />
                  <span className="text-ink-faint text-xs w-8">{Math.round(brushHardness * 100)}%</span>
                </div>
              )}

              {/* 不透明度 */}
              {(showBrushParams || activeTool === 'fill') && (
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
              )}

              {/* 颜色选择 (除吸管外的绘制类工具) */}
              {activeTool !== 'eyedropper' && activeTool !== 'text' && (
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
              )}

              {/* 文本参数 */}
              {showTextParams && (
                <>
                  <input
                    type="text"
                    value={textContent}
                    onChange={(e) => handleTextContentChange(e.target.value)}
                    placeholder="输入文本内容，点击画布放置"
                    className="flex-1 min-w-40 max-w-64 px-2 py-1 rounded-md border border-lavender-pale bg-cloud text-ink text-xs focus:outline-none focus:border-sakura"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-light text-xs">字号</span>
                    <input
                      type="range"
                      min={8}
                      max={120}
                      value={textFontSize}
                      onChange={(e) => handleTextFontSizeChange(Number(e.target.value))}
                      className="w-20 accent-sakura h-1"
                    />
                    <span className="text-ink-faint text-xs w-8">{textFontSize}px</span>
                  </div>
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
                </>
              )}

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

            {/* Canvas 绘图区 (网格背景 + 缩放) */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-auto bg-[#f0edf5]"
              onWheel={handleWheel}
            >
              <div
                className="min-w-full min-h-full flex items-center justify-center p-6"
                style={{ width: CANVAS_WIDTH * zoom + 48, height: CANVAS_HEIGHT * zoom + 48 }}
              >
                <div
                  className="shadow-md rounded-sm overflow-hidden flex-shrink-0"
                  style={{
                    width: CANVAS_WIDTH * zoom,
                    height: CANVAS_HEIGHT * zoom,
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
                    style={{ width: '100%', height: '100%' }}
                    onMouseUp={handleCanvasMouseUp}
                  />
                </div>
              </div>
            </div>

            {/* 底部状态栏 */}
            <div className="flex items-center gap-4 px-4 py-1.5 border-t border-lavender-pale bg-cloud/30 text-[11px] text-ink-light">
              {/* 缩放控制 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => changeZoom(zoom / 1.2)}
                  title="缩小"
                  className="p-0.5 rounded hover:bg-lavender-pale text-ink-light"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="w-11 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => changeZoom(zoom * 1.2)}
                  title="放大"
                  className="p-0.5 rounded hover:bg-lavender-pale text-ink-light"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  onClick={handleFitZoom}
                  title="适合窗口"
                  className="p-0.5 rounded hover:bg-lavender-pale text-ink-light ml-1"
                >
                  <Maximize size={13} />
                </button>
              </div>

              <span className="text-ink-faint">|</span>

              {/* 光标坐标 */}
              <span className="tabular-nums">
                X: {cursorPos.x} · Y: {cursorPos.y}
              </span>

              <span className="text-ink-faint">|</span>

              {/* 画布尺寸 */}
              <span>
                {CANVAS_WIDTH} × {CANVAS_HEIGHT} px
              </span>

              <div className="flex-1" />

              {/* 图层数 */}
              <span className="flex items-center gap-1">
                <Layers size={12} className="text-ink-light" />
                {layers.length} 图层 · 活动 {activeLayerIndex + 1}
              </span>

              {/* 当前工具提示 */}
              <span className="text-ink-faint">Ctrl+滚轮缩放</span>
            </div>
          </div>

          {/* ========== 右侧图层面板 ========== */}
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

            {/* 颜色预设 */}
            <div className="px-3 py-2 border-t border-lavender-pale">
              <span className="text-[10px] text-ink-faint">色板</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleBrushColorChange(c)}
                    title={c}
                    className={`w-4 h-4 rounded-sm border transition-transform hover:scale-110 ${
                      c === brushColor ? 'border-sakura ring-1 ring-sakura' : 'border-ink-faint/50'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
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
      </div>
    </ToolWorkspace>
  );
}
