// 画板文档栏 — 新建、尺寸、背景、导入导出与自动保存状态
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileInput,
  FileOutput,
  FilePlus,
  LayoutGrid,
} from 'lucide-react';
import { parseCanvasDocumentFile } from '@/engine/canvas-studio/engine';
import { useCanvasStudioAutosave } from '@/hooks/useCanvasStudioAutosave';
import {
  exportCanvasDocumentFile,
  useCanvasStudioStore,
} from '@/store/useCanvasStudioStore';
import Toast from '@/components/ui/Toast';

interface SizePreset {
  key: string;
  label: string;
  width: number;
  height: number;
}

const SIZE_PRESETS: SizePreset[] = [
  { key: '960x640', label: '通用 960×640', width: 960, height: 640 },
  { key: '1024x1024', label: '立绘 1024×1024', width: 1024, height: 1024 },
  { key: '1920x1080', label: '背景 1920×1080', width: 1920, height: 1080 },
  { key: '2560x1440', label: 'CG 2560×1440', width: 2560, height: 1440 },
  { key: '512x512', label: 'UI 512×512', width: 512, height: 512 },
];

type ToastState = {
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function StudioDocumentBar(): React.JSX.Element {
  const document = useCanvasStudioStore((s) => s.document);
  const layers = useCanvasStudioStore((s) => s.layers);
  const setDocumentName = useCanvasStudioStore((s) => s.setDocumentName);
  const setDocumentSize = useCanvasStudioStore((s) => s.setDocumentSize);
  const setDocumentBackground = useCanvasStudioStore(
    (s) => s.setDocumentBackground,
  );
  const newDocument = useCanvasStudioStore((s) => s.newDocument);
  const loadDocumentFile = useCanvasStudioStore((s) => s.loadDocumentFile);

  const { savedAt, restored } = useCanvasStudioAutosave();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (restored) {
      setToast({ message: '已恢复上次自动保存的画布', type: 'info' });
    }
  }, [restored]);

  const isDirty = useCallback(
    () => layers.some((layer) => layer.shapes.length > 0) || layers.length > 1,
    [layers],
  );

  const handleNewDocument = useCallback(() => {
    if (isDirty() && !window.confirm('新建文档会清空当前画布，确定继续？')) {
      return;
    }
    newDocument({
      width: document.width,
      height: document.height,
      background: document.background,
    });
    setToast({ message: '已新建空白画布', type: 'success' });
  }, [document.background, document.height, document.width, isDirty, newDocument]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = parseCanvasDocumentFile(text);
        if (isDirty() && !window.confirm('导入工程会替换当前画布，确定继续？')) {
          return;
        }
        loadDocumentFile(parsed);
        setToast({ message: '画布工程已导入', type: 'success' });
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : '导入失败',
          type: 'error',
        });
      }
    },
    [isDirty, loadDocumentFile],
  );

  const handlePresetChange = useCallback(
    (key: string) => {
      const preset = SIZE_PRESETS.find((item) => item.key === key);
      if (preset) setDocumentSize(preset.width, preset.height);
    },
    [setDocumentSize],
  );

  const currentPreset =
    SIZE_PRESETS.find(
      (preset) =>
        preset.width === document.width && preset.height === document.height,
    )?.key ?? 'custom';

  const transparent = document.background === 'transparent';

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-lavender-pale bg-cloud/40 flex-wrap">
      <label className="flex items-center gap-1.5 text-xs text-ink-light whitespace-nowrap">
        文档
        <input
          type="text"
          value={document.name}
          onChange={(e) => setDocumentName(e.target.value)}
          className="w-36 px-2 py-1 rounded-md border border-lavender-pale bg-cloud text-ink text-xs focus:outline-none focus:border-sakura"
        />
      </label>

      <label className="flex items-center gap-1.5 text-xs text-ink-light whitespace-nowrap">
        <LayoutGrid size={13} />
        <select
          value={currentPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="px-2 py-1 rounded-md border border-lavender-pale bg-cloud text-ink text-xs focus:outline-none focus:border-sakura"
        >
          {SIZE_PRESETS.map((preset) => (
            <option key={preset.key} value={preset.key}>
              {preset.label}
            </option>
          ))}
          <option value="custom">自定义</option>
        </select>
      </label>

      <label className="flex items-center gap-1 text-xs text-ink-light whitespace-nowrap">
        宽
        <input
          type="number"
          min={64}
          max={8192}
          value={document.width}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (Number.isFinite(value) && value > 0) {
              setDocumentSize(value, document.height);
            }
          }}
          className="w-20 px-2 py-1 rounded-md border border-lavender-pale bg-cloud text-ink text-xs tabular-nums focus:outline-none focus:border-sakura"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-ink-light whitespace-nowrap">
        高
        <input
          type="number"
          min={64}
          max={8192}
          value={document.height}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (Number.isFinite(value) && value > 0) {
              setDocumentSize(document.width, value);
            }
          }}
          className="w-20 px-2 py-1 rounded-md border border-lavender-pale bg-cloud text-ink text-xs tabular-nums focus:outline-none focus:border-sakura"
        />
      </label>

      {!transparent && (
        <label className="flex items-center gap-1.5 text-xs text-ink-light whitespace-nowrap">
          背景
          <input
            type="color"
            value={document.background}
            onChange={(e) => setDocumentBackground(e.target.value)}
            className="w-6 h-6 border-0 p-0 cursor-pointer bg-transparent"
          />
        </label>
      )}
      <label className="flex items-center gap-1 text-xs text-ink-light whitespace-nowrap cursor-pointer">
        <input
          type="checkbox"
          checked={transparent}
          onChange={(e) =>
            setDocumentBackground(e.target.checked ? 'transparent' : '#FFFFFF')
          }
          className="accent-sakura"
        />
        透明
      </label>

      <div className="flex-1" />

      <button
        type="button"
        onClick={handleNewDocument}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-ink-light hover:text-sakura-dark hover:bg-lavender-pale transition-colors"
      >
        <FilePlus size={14} />
        新建
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-ink-light hover:text-sakura-dark hover:bg-lavender-pale transition-colors"
      >
        <FileInput size={14} />
        导入
      </button>
      <button
        type="button"
        onClick={() => exportCanvasDocumentFile(document, layers)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-ink-light hover:text-sakura-dark hover:bg-lavender-pale transition-colors"
      >
        <FileOutput size={14} />
        导出
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = '';
        }}
      />

      <span
        className={`inline-flex items-center gap-1 text-[10px] whitespace-nowrap ${
          savedAt ? 'text-emerald-700' : 'text-ink-faint'
        }`}
        title={savedAt ? `自动保存于 ${formatTime(savedAt)}` : '自动保存'}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            savedAt ? 'bg-emerald-500' : 'bg-amber-400'
          }`}
        />
        {savedAt ? '已自动保存' : '自动保存'}
      </span>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
