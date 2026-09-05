// 新版画板 — 右侧图层面板
'use client';

import { useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCanvasStudioStore } from '@/store/useCanvasStudioStore';

export default function StudioLayerPanel(): React.JSX.Element {
  const layers = useCanvasStudioStore((s) => s.layers);
  const activeLayerId = useCanvasStudioStore((s) => s.activeLayerId);
  const addLayer = useCanvasStudioStore((s) => s.addLayer);
  const removeLayer = useCanvasStudioStore((s) => s.removeLayer);
  const setActiveLayer = useCanvasStudioStore((s) => s.setActiveLayer);
  const setLayerVisible = useCanvasStudioStore((s) => s.setLayerVisible);
  const setLayerOpacity = useCanvasStudioStore((s) => s.setLayerOpacity);
  const moveLayer = useCanvasStudioStore((s) => s.moveLayer);

  const handleAddLayer = useCallback(() => {
    addLayer();
  }, [addLayer]);

  return (
    <div className="w-52 flex-shrink-0 border-l border-lavender-pale bg-cloud/50 flex flex-col">
      <div className="px-3 py-2 border-b border-lavender-pale flex items-center gap-1.5">
        <Layers size={14} className="text-ink-light" />
        <span className="text-ink text-xs font-medium">图层</span>
        <span className="ml-auto text-[10px] text-ink-faint tabular-nums">
          {layers.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {layers.map((layer, index) => {
          const active = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`px-3 py-2 cursor-pointer text-xs transition-colors border-b border-lavender-pale/40 ${
                active ? 'bg-sakura-pale text-ink' : 'text-ink-light hover:bg-lavender-pale/50'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayerVisible(layer.id, !layer.visible);
                  }}
                  className="text-ink-faint hover:text-ink"
                  title={layer.visible ? '隐藏图层' : '显示图层'}
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <span className="flex-1 truncate">{layer.name}</span>
                <span className="text-[10px] text-ink-faint tabular-nums">
                  {layer.shapes.length}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) =>
                    setLayerOpacity(layer.id, Number(e.target.value) / 100)
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 accent-sakura h-1"
                  title="图层不透明度"
                />
                <span className="text-[10px] text-ink-faint w-8 text-right tabular-nums">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === layers.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, 1);
                  }}
                  className="p-1 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-faint"
                  title="上移图层"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayer(layer.id, -1);
                  }}
                  className="p-1 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-faint"
                  title="下移图层"
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  type="button"
                  disabled={layers.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                  className="ml-auto p-1 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-faint hover:text-sakura-dark"
                  title="删除图层"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-lavender-pale">
        <button
          type="button"
          onClick={handleAddLayer}
          className="w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 bg-lavender-pale text-ink-light hover:bg-lavender-light hover:text-ink transition-all"
        >
          <Plus size={14} />
          添加图层
        </button>
      </div>
    </div>
  );
}
