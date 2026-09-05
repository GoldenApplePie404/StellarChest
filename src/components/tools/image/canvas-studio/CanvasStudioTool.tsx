// 星墨画板（新版）— 主容器
// 全新 Konva 架构，与旧版 CanvasEngine 无任何代码关联
'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import type Konva from 'konva';
import { ArrowLeft, Pen } from 'lucide-react';
import CanvasStage from '@/components/tools/image/canvas-studio/CanvasStage';
import StudioDocumentBar from '@/components/tools/image/canvas-studio/StudioDocumentBar';
import StudioLayerPanel from '@/components/tools/image/canvas-studio/StudioLayerPanel';
import StudioPropertiesBar from '@/components/tools/image/canvas-studio/StudioPropertiesBar';
import StudioStatusBar from '@/components/tools/image/canvas-studio/StudioStatusBar';
import StudioToolbar from '@/components/tools/image/canvas-studio/StudioToolbar';
import { useCanvasStudioStore } from '@/store/useCanvasStudioStore';
import type { CanvasStudioTool } from '@/types/canvas-studio';

export default function CanvasStudioTool(): React.JSX.Element {
  const stageRef = useRef<Konva.Stage | null>(null);

  const tool = useCanvasStudioStore((s) => s.tool);
  const setTool = useCanvasStudioStore((s) => s.setTool);
  const undo = useCanvasStudioStore((s) => s.undo);
  const redo = useCanvasStudioStore((s) => s.redo);
  const pushHistory = useCanvasStudioStore((s) => s.pushHistory);
  const removeShape = useCanvasStudioStore((s) => s.removeShape);
  const selectShape = useCanvasStudioStore((s) => s.selectShape);
  const selectedShapeId = useCanvasStudioStore((s) => s.selectedShapeId);
  const copyShape = useCanvasStudioStore((s) => s.copyShape);
  const pasteShape = useCanvasStudioStore((s) => s.pasteShape);
  const duplicateShape = useCanvasStudioStore((s) => s.duplicateShape);

  const handleExportPng = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const scale = stage.scaleX();
    stage.scale({ x: 1, y: 1 });
    const url = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
    });
    stage.scale({ x: scale, y: scale });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stellar-canvas.png';
    a.click();
  }, []);

  /** 全局快捷键 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          return;
        }
        if (key === 'y') {
          e.preventDefault();
          redo();
          return;
        }
        if (key === 'c' && selectedShapeId) {
          e.preventDefault();
          copyShape(selectedShapeId);
          return;
        }
        if (key === 'v') {
          e.preventDefault();
          pasteShape();
          return;
        }
        if (key === 'd' && selectedShapeId) {
          e.preventDefault();
          duplicateShape(selectedShapeId);
          return;
        }
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const shortcutMap: Record<string, CanvasStudioTool> = {
        v: 'select',
        b: 'brush',
        e: 'eraser',
        r: 'rect',
        o: 'ellipse',
        l: 'line',
        a: 'arrow',
        t: 'text',
      };
      const next = shortcutMap[e.key.toLowerCase()];
      if (next) {
        e.preventDefault();
        setTool(next);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShapeId) {
          e.preventDefault();
          pushHistory();
          removeShape(selectedShapeId);
          selectShape(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        selectShape(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    copyShape,
    duplicateShape,
    pasteShape,
    pushHistory,
    redo,
    removeShape,
    selectShape,
    selectedShapeId,
    setTool,
    undo,
  ]);

  return (
    <div className="flex h-screen w-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-lavender-pale bg-cloud flex-shrink-0">
        <Pen size={20} className="text-sakura-dark flex-shrink-0" />
        <h2 className="text-lg font-semibold text-ink m-0">画布编辑（新版）</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-lavender-pale text-ink-light">
          Konva 引擎
        </span>
        <div className="flex-1" />
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-xs text-ink-light hover:text-sakura-dark transition-colors no-underline"
          title="返回星工坊"
        >
          <ArrowLeft size={13} />
          星工坊
        </Link>
      </div>
      <StudioDocumentBar />

      <div className="flex flex-1 min-h-0">
        <StudioToolbar />

        <div className="flex-1 flex flex-col min-w-0">
          <StudioPropertiesBar onExportPng={handleExportPng} />
          <CanvasStage stageRef={stageRef} />
          <StudioStatusBar />
        </div>

        <StudioLayerPanel />
      </div>
    </div>
  );
}
