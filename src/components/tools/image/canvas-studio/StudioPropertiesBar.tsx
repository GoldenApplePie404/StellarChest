// 新版画板 — 顶部属性栏
// 按当前工具动态展示参数：画笔/形状/文本/选择；并提供撤销、重做与导出
'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  FileJson,
  Pen,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  exportCanvasDocumentFile,
  useCanvasStudioStore,
} from '@/store/useCanvasStudioStore';
import type { StudioShape } from '@/types/canvas-studio';

export default function StudioPropertiesBar({
  onExportPng,
}: {
  onExportPng: () => void;
}): React.JSX.Element {
  const tool = useCanvasStudioStore((s) => s.tool);
  const brush = useCanvasStudioStore((s) => s.brush);
  const setBrush = useCanvasStudioStore((s) => s.setBrush);
  const document = useCanvasStudioStore((s) => s.document);
  const layers = useCanvasStudioStore((s) => s.layers);
  const selectedShapeId = useCanvasStudioStore((s) => s.selectedShapeId);
  const updateShape = useCanvasStudioStore((s) => s.updateShape);
  const removeShape = useCanvasStudioStore((s) => s.removeShape);
  const selectShape = useCanvasStudioStore((s) => s.selectShape);
  const pushHistory = useCanvasStudioStore((s) => s.pushHistory);
  const undo = useCanvasStudioStore((s) => s.undo);
  const redo = useCanvasStudioStore((s) => s.redo);
  const past = useCanvasStudioStore((s) => s.past);
  const future = useCanvasStudioStore((s) => s.future);
  const clipboard = useCanvasStudioStore((s) => s.clipboard);
  const copyShape = useCanvasStudioStore((s) => s.copyShape);
  const pasteShape = useCanvasStudioStore((s) => s.pasteShape);
  const duplicateShape = useCanvasStudioStore((s) => s.duplicateShape);
  const bringShapeForward = useCanvasStudioStore((s) => s.bringShapeForward);
  const sendShapeBackward = useCanvasStudioStore((s) => s.sendShapeBackward);

  const selectedShape = findSelectedShape(layers, selectedShapeId);
  const shapeLayer = selectedShapeId
    ? layers.find((layer) => layer.shapes.some((shape) => shape.id === selectedShapeId))
    : undefined;
  const shapeIndex = shapeLayer?.shapes.findIndex(
    (shape) => shape.id === selectedShapeId,
  ) ?? -1;

  const propertyHistoryPushedRef = useRef(false);

  useEffect(() => {
    propertyHistoryPushedRef.current = false;
  }, [selectedShapeId]);

  const handleSelectedShapeChange = useCallback(
    (patch: Partial<StudioShape>) => {
      if (!selectedShapeId) return;
      if (!propertyHistoryPushedRef.current) {
        pushHistory();
        propertyHistoryPushedRef.current = true;
      }
      updateShape(selectedShapeId, patch);
    },
    [pushHistory, selectedShapeId, updateShape],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedShapeId) return;
    useCanvasStudioStore.getState().pushHistory();
    removeShape(selectedShapeId);
    selectShape(null);
  }, [selectedShapeId, removeShape, selectShape]);

  const showStroke = ['brush', 'rect', 'ellipse', 'line', 'arrow'].includes(tool);
  const showFill = tool === 'rect' || tool === 'ellipse';
  const showText = tool === 'text';

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-lavender-pale bg-cloud/30 flex-wrap">
      {showStroke && (
        <>
          <ParamBlock label="粗细">
            <input
              type="range"
              min={1}
              max={60}
              value={brush.strokeWidth}
              onChange={(e) => setBrush({ strokeWidth: Number(e.target.value) })}
              className="w-20 accent-sakura h-1"
            />
            <span className="text-ink-faint text-xs w-9 tabular-nums">
              {brush.strokeWidth}px
            </span>
          </ParamBlock>

          <ParamBlock label="颜色">
            <input
              type="color"
              value={brush.color}
              onChange={(e) => setBrush({ color: e.target.value })}
              className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
            />
          </ParamBlock>

          <ParamBlock label="不透明度">
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(brush.opacity * 100)}
              onChange={(e) => setBrush({ opacity: Number(e.target.value) / 100 })}
              className="w-16 accent-sakura h-1"
            />
            <span className="text-ink-faint text-xs w-8 tabular-nums">
              {Math.round(brush.opacity * 100)}%
            </span>
          </ParamBlock>
        </>
      )}

      {showFill && (
        <ParamBlock label="填充">
          <input
            type="color"
            value={brush.fillColor}
            onChange={(e) => setBrush({ fillColor: e.target.value })}
            className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
          />
        </ParamBlock>
      )}

      {showText && (
        <>
          <ParamBlock label="文本">
            <input
              type="text"
              value={brush.text}
              onChange={(e) => setBrush({ text: e.target.value })}
              placeholder="输入文本，点击画布放置"
              className="w-56 px-2 py-1 rounded-md border border-lavender-pale bg-cloud text-ink text-xs focus:outline-none focus:border-sakura"
            />
          </ParamBlock>
          <ParamBlock label="字号">
            <input
              type="range"
              min={8}
              max={120}
              value={brush.fontSize}
              onChange={(e) => setBrush({ fontSize: Number(e.target.value) })}
              className="w-20 accent-sakura h-1"
            />
            <span className="text-ink-faint text-xs w-8 tabular-nums">
              {brush.fontSize}px
            </span>
          </ParamBlock>
        </>
      )}

      {tool === 'select' && selectedShape && (
        <>
          {'strokeWidth' in selectedShape && (
            <ParamBlock label="粗细">
              <input
                type="range"
                min={1}
                max={80}
                value={selectedShape.strokeWidth}
                onChange={(e) =>
                  handleSelectedShapeChange({
                    strokeWidth: Number(e.target.value),
                  })
                }
                className="w-20 accent-sakura h-1"
              />
              <span className="text-ink-faint text-xs w-9 tabular-nums">
                {selectedShape.strokeWidth}px
              </span>
            </ParamBlock>
          )}

          {selectedShape.kind === 'text' && (
            <>
              <ParamBlock label="文本">
                <input
                  type="text"
                  value={selectedShape.text}
                  onChange={(e) =>
                    handleSelectedShapeChange({ text: e.target.value })
                  }
                  className="w-40 px-2 py-1 rounded-md border border-lavender-pale bg-cloud text-ink text-xs focus:outline-none focus:border-sakura"
                />
              </ParamBlock>
              <ParamBlock label="字号">
                <input
                  type="range"
                  min={8}
                  max={200}
                  value={selectedShape.fontSize}
                  onChange={(e) =>
                    handleSelectedShapeChange({
                      fontSize: Number(e.target.value),
                    })
                  }
                  className="w-20 accent-sakura h-1"
                />
                <span className="text-ink-faint text-xs w-8 tabular-nums">
                  {selectedShape.fontSize}px
                </span>
              </ParamBlock>
              <ParamBlock label="颜色">
                <input
                  type="color"
                  value={selectedShape.fill}
                  onChange={(e) =>
                    handleSelectedShapeChange({ fill: e.target.value })
                  }
                  className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
                />
              </ParamBlock>
            </>
          )}

          {selectedShape.kind !== 'text' && 'stroke' in selectedShape && (
            <ParamBlock label="颜色">
              <input
                type="color"
                value={selectedShape.stroke}
                onChange={(e) =>
                  handleSelectedShapeChange({ stroke: e.target.value })
                }
                className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
              />
            </ParamBlock>
          )}

          {selectedShape.kind !== 'text' &&
            selectedShape.kind !== 'brush' &&
            'fill' in selectedShape && (
              <ParamBlock label="填充">
                <input
                  type="color"
                  value={selectedShape.fill}
                  onChange={(e) =>
                    handleSelectedShapeChange({ fill: e.target.value })
                  }
                  className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
                />
              </ParamBlock>
            )}

          {selectedShape.kind === 'rect' && (
            <ParamBlock label="圆角">
              <input
                type="range"
                min={0}
                max={100}
                value={selectedShape.cornerRadius}
                onChange={(e) =>
                  handleSelectedShapeChange({
                    cornerRadius: Number(e.target.value),
                  })
                }
                className="w-20 accent-sakura h-1"
              />
              <span className="text-ink-faint text-xs w-8 tabular-nums">
                {selectedShape.cornerRadius}px
              </span>
            </ParamBlock>
          )}

          <ParamBlock label="不透明度">
            <input
              type="range"
              min={5}
              max={100}
              value={Math.round(selectedShape.opacity * 100)}
              onChange={(e) =>
                handleSelectedShapeChange({
                  opacity: Number(e.target.value) / 100,
                })
              }
              className="w-16 accent-sakura h-1"
            />
            <span className="text-ink-faint text-xs w-8 tabular-nums">
              {Math.round(selectedShape.opacity * 100)}%
            </span>
          </ParamBlock>

          <div className="flex items-center gap-1 border-l border-lavender-pale pl-3">
            <button
              type="button"
              onClick={() => copyShape(selectedShape.id)}
              title="复制 (Ctrl+C)"
              className="p-1.5 rounded hover:bg-lavender-pale text-ink-light"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={pasteShape}
              disabled={!clipboard}
              title="粘贴 (Ctrl+V)"
              className="p-1.5 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-light"
            >
              <ClipboardPaste size={14} />
            </button>
            <button
              type="button"
              onClick={() => duplicateShape(selectedShape.id)}
              title="复制一份 (Ctrl+D)"
              className="p-1.5 rounded hover:bg-lavender-pale text-ink-light"
            >
              <CopyPlus size={14} />
            </button>
            <button
              type="button"
              onClick={() => bringShapeForward(selectedShape.id)}
              disabled={
                shapeLayer ? shapeIndex >= shapeLayer.shapes.length - 1 : true
              }
              title="上移一层"
              className="p-1.5 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-light"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => sendShapeBackward(selectedShape.id)}
              disabled={shapeIndex <= 0}
              title="下移一层"
              className="p-1.5 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-light"
            >
              <ArrowDown size={14} />
            </button>
            <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
              <Trash2 size={14} className="mr-1 inline" />
              删除
            </Button>
          </div>
        </>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={undo}
        disabled={past.length === 0}
        title="撤销 (Ctrl+Z)"
        className="p-1.5 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-light"
      >
        <Undo2 size={16} />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={future.length === 0}
        title="重做 (Ctrl+Shift+Z)"
        className="p-1.5 rounded hover:bg-lavender-pale disabled:opacity-30 text-ink-light"
      >
        <Redo2 size={16} />
      </button>

      <Button variant="ghost" size="sm" onClick={onExportPng}>
        <Download size={14} className="mr-1 inline" />
        PNG
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => exportCanvasDocumentFile(document, layers)}
      >
        <FileJson size={14} className="mr-1 inline" />
        工程
      </Button>
    </div>
  );
}

function ParamBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <Pen size={13} className="text-ink-light" />
      <span className="text-ink-light text-xs whitespace-nowrap">{label}</span>
      {children}
    </div>
  );
}

function findSelectedShape(
  layers: ReturnType<typeof useCanvasStudioStore.getState>['layers'],
  shapeId: string | null,
): StudioShape | null {
  if (!shapeId) return null;
  for (const layer of layers) {
    const shape = layer.shapes.find((s) => s.id === shapeId);
    if (shape) return shape;
  }
  return null;
}
