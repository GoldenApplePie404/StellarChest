// 新版画板 — 左侧工具条
'use client';

import {
  ArrowRight,
  Circle,
  Eraser,
  Minus,
  MousePointer2,
  Pen,
  Plus,
  RotateCcw,
  Square,
  Type,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCanvasStudioStore } from '@/store/useCanvasStudioStore';
import type { CanvasStudioTool } from '@/types/canvas-studio';

interface ToolButtonDef {
  tool: CanvasStudioTool;
  label: string;
  shortcut: string;
  icon: LucideIcon;
}

const DRAW_GROUP: ToolButtonDef[] = [
  { tool: 'brush', label: '画笔', shortcut: 'B', icon: Pen },
  { tool: 'eraser', label: '擦除', shortcut: 'E', icon: Eraser },
];

const SHAPE_GROUP: ToolButtonDef[] = [
  { tool: 'rect', label: '矩形', shortcut: 'R', icon: Square },
  { tool: 'ellipse', label: '椭圆', shortcut: 'O', icon: Circle },
  { tool: 'line', label: '直线', shortcut: 'L', icon: Minus },
  { tool: 'arrow', label: '箭头', shortcut: 'A', icon: ArrowRight },
];

const TEXT_GROUP: ToolButtonDef[] = [
  { tool: 'text', label: '文本', shortcut: 'T', icon: Type },
];

const SELECT_TOOL: ToolButtonDef = {
  tool: 'select',
  label: '选择',
  shortcut: 'V',
  icon: MousePointer2,
};

export default function StudioToolbar(): React.JSX.Element {
  const tool = useCanvasStudioStore((s) => s.tool);
  const setTool = useCanvasStudioStore((s) => s.setTool);
  const setBrush = useCanvasStudioStore((s) => s.setBrush);
  const brush = useCanvasStudioStore((s) => s.brush);
  const palette = useCanvasStudioStore((s) => s.palette);
  const addPaletteColor = useCanvasStudioStore((s) => s.addPaletteColor);
  const removePaletteColor = useCanvasStudioStore((s) => s.removePaletteColor);
  const resetPalette = useCanvasStudioStore((s) => s.resetPalette);

  return (
    <div className="w-14 flex-shrink-0 border-r border-lavender-pale bg-cloud/50 py-2 flex flex-col items-center overflow-y-auto">
      <ToolButton button={SELECT_TOOL} active={tool === 'select'} onSelect={setTool} />

      <GroupDivider />
      {DRAW_GROUP.map((button) => (
        <ToolButton
          key={button.tool}
          button={button}
          active={tool === button.tool}
          onSelect={setTool}
        />
      ))}

      <GroupDivider />
      {SHAPE_GROUP.map((button) => (
        <ToolButton
          key={button.tool}
          button={button}
          active={tool === button.tool}
          onSelect={setTool}
        />
      ))}

      <GroupDivider />
      {TEXT_GROUP.map((button) => (
        <ToolButton
          key={button.tool}
          button={button}
          active={tool === button.tool}
          onSelect={setTool}
        />
      ))}

      <div className="mt-auto mb-1 flex flex-col items-center gap-1 pt-2 border-t border-lavender-pale w-full">
        <span className="text-[9px] uppercase tracking-widest text-ink-faint select-none">
          色板
        </span>
        <div className="flex flex-wrap justify-center gap-1 px-1">
          {palette.map((color) => (
            <div key={color} className="relative group">
              <button
                type="button"
                onClick={() => setBrush({ color })}
                title={color}
                className="w-4 h-4 rounded-sm border border-ink-faint/40 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              />
              <button
                type="button"
                onClick={() => removePaletteColor(color)}
                title="移除颜色"
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ink text-cloud items-center justify-center hidden group-hover:flex"
              >
                <X size={8} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-1 px-1">
          <input
            type="color"
            value={brush.color}
            onChange={(e) => setBrush({ color: e.target.value })}
            title="选择自定义颜色"
            className="w-5 h-5 border-0 p-0 cursor-pointer bg-transparent"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => addPaletteColor(brush.color)}
              disabled={palette.includes(brush.color) || palette.length >= 24}
              title="添加到色板"
              className="p-0.5 rounded hover:bg-lavender-pale text-ink-light disabled:opacity-30"
            >
              <Plus size={13} />
            </button>
            <button
              type="button"
              onClick={resetPalette}
              title="重置色板"
              className="p-0.5 rounded hover:bg-lavender-pale text-ink-light"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  button,
  active,
  onSelect,
}: {
  button: ToolButtonDef;
  active: boolean;
  onSelect: (tool: CanvasStudioTool) => void;
}): React.JSX.Element {
  const Icon = button.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(button.tool)}
      title={`${button.label} (${button.shortcut})`}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
        active
          ? 'bg-sakura text-cloud shadow-sm'
          : 'text-ink-light hover:bg-lavender-pale hover:text-ink'
      }`}
    >
      <Icon size={18} />
    </button>
  );
}

function GroupDivider(): React.JSX.Element {
  return <div className="w-9 h-px my-2 bg-lavender-pale" />;
}
