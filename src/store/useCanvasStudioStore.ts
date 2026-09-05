// 星墨画板（新版）— Zustand 全局状态
// 文档数据、工具状态、视口缩放、选择与撤销/重做历史全部在此管理

import { create } from 'zustand';
import type {
  BrushSettings,
  CanvasDocument,
  CanvasDocumentFile,
  CanvasStudioTool,
  StudioLayer,
  StudioShape,
} from '@/types/canvas-studio';
import {
  CANVAS_STUDIO_SIZE,
  createLayer,
  createDocument,
  createDocumentFile,
  cloneShape,
  findShape,
  generateId,
  patchShape,
  restoreLayers,
  snapshotLayers,
} from '@/engine/canvas-studio/engine';

/** 最大历史步数 */
const MAX_HISTORY = 60;

/** 默认画笔设置 */
export const DEFAULT_BRUSH: BrushSettings = {
  color: '#4A3F45',
  fillColor: '#FFFFFF',
  strokeWidth: 4,
  opacity: 1,
  fontSize: 24,
  fontFamily: '"Microsoft YaHei", "Noto Sans SC", sans-serif',
  text: '文本',
};

/** 默认色板 */
export const DEFAULT_PALETTE = [
  '#4A3F45',
  '#E5533D',
  '#F07A9A',
  '#9B59B6',
  '#5B7BD5',
  '#4CAF85',
  '#F2A93B',
  '#D94848',
  '#FFFFFF',
  '#000000',
];

const PALETTE_STORAGE_KEY = 'stellar-canvas-studio:palette:v1';

interface CanvasStudioStore {
  document: CanvasDocument;
  layers: StudioLayer[];
  activeLayerId: string;
  tool: CanvasStudioTool;
  brush: BrushSettings;
  selectedShapeId: string | null;
  zoom: number;
  cursor: { x: number; y: number };
  past: string[];
  future: string[];
  palette: string[];

  setTool: (tool: CanvasStudioTool) => void;
  setBrush: (patch: Partial<BrushSettings>) => void;
  setZoom: (zoom: number) => void;
  setCursor: (cursor: { x: number; y: number }) => void;
  setDocumentName: (name: string) => void;
  setDocumentSize: (width: number, height: number) => void;
  setDocumentBackground: (background: string) => void;
  newDocument: (document?: Partial<CanvasDocument>) => void;
  loadDocumentFile: (file: CanvasDocumentFile) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  addLayer: () => void;
  removeLayer: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  setLayerVisible: (layerId: string, visible: boolean) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  moveLayer: (layerId: string, direction: -1 | 1) => void;
  setActiveLayer: (layerId: string) => void;

  addShape: (shape: StudioShape) => void;
  updateShape: (shapeId: string, patch: Partial<StudioShape>) => void;
  removeShape: (shapeId: string) => void;
  selectShape: (shapeId: string | null) => void;
  clipboard: StudioShape | null;
  copyShape: (shapeId: string) => void;
  pasteShape: () => void;
  duplicateShape: (shapeId: string) => void;
  bringShapeForward: (shapeId: string) => void;
  sendShapeBackward: (shapeId: string) => void;
  addPaletteColor: (color: string) => void;
  removePaletteColor: (color: string) => void;
  resetPalette: () => void;
}

const initialLayer = createLayer(undefined, 0);
const initialDocument = createDocument();

export const useCanvasStudioStore = create<CanvasStudioStore>()((set, get) => ({
  document: initialDocument,
  layers: [initialLayer],
  activeLayerId: initialLayer.id,
  tool: 'select',
  brush: DEFAULT_BRUSH,
  selectedShapeId: null,
  zoom: 1,
  cursor: { x: 0, y: 0 },
  past: [],
  future: [],
  clipboard: null,
  palette: loadPersistedPalette(),

  setTool: (tool) => set({ tool, selectedShapeId: null }),

  setBrush: (patch) =>
    set((state) => ({
      brush: {
        ...state.brush,
        ...patch,
        strokeWidth: clampNumber(patch.strokeWidth ?? state.brush.strokeWidth, 1, 80),
        opacity: clampNumber(patch.opacity ?? state.brush.opacity, 0.05, 1),
        fontSize: clampNumber(patch.fontSize ?? state.brush.fontSize, 8, 200),
      },
    })),

  setZoom: (zoom) => set({ zoom: clampNumber(zoom, 0.1, 4) }),

  setCursor: (cursor) => set({ cursor }),

  setDocumentName: (name) =>
    set((state) => ({
      document: { ...state.document, name, updatedAt: Date.now() },
    })),

  setDocumentSize: (width, height) =>
    set((state) => ({
      document: {
        ...state.document,
        width: clampDimension(width),
        height: clampDimension(height),
        updatedAt: Date.now(),
      },
    })),

  setDocumentBackground: (background) =>
    set((state) => ({
      document: { ...state.document, background, updatedAt: Date.now() },
    })),

  newDocument: (patch = {}) => {
    const document = createDocument(
      patch.width ?? CANVAS_STUDIO_SIZE.width,
      patch.height ?? CANVAS_STUDIO_SIZE.height,
      patch.name ?? '未命名画布',
      patch.background ?? '#FFFFFF',
    );
    const layer = createLayer(undefined, 0);
    set({
      document,
      layers: [layer],
      activeLayerId: layer.id,
      selectedShapeId: null,
      past: [],
      future: [],
      clipboard: null,
      zoom: 1,
    });
  },

  loadDocumentFile: (file) => {
    const layers = file.layers.length > 0 ? file.layers : [createLayer(undefined, 0)];
    const activeLayer = layers[layers.length - 1]!;
    set({
      document: file.document,
      layers,
      activeLayerId: activeLayer.id,
      selectedShapeId: null,
      past: [],
      future: [],
      clipboard: null,
      zoom: 1,
    });
  },

  pushHistory: () => {
    const { layers, past, future } = get();
    set({
      past: [...past, snapshotLayers(layers)].slice(-MAX_HISTORY),
      future: [],
    });
  },

  undo: () => {
    const { past, future, layers } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({
      layers: restoreLayers(prev),
      past: past.slice(0, -1),
      future: [snapshotLayers(layers), ...future].slice(0, MAX_HISTORY),
      selectedShapeId: null,
    });
  },

  redo: () => {
    const { past, future, layers } = get();
    const next = future[0];
    if (!next) return;
    set({
      layers: restoreLayers(next),
      past: [...past, snapshotLayers(layers)].slice(-MAX_HISTORY),
      future: future.slice(1),
      selectedShapeId: null,
    });
  },

  addLayer: () => {
    const { layers } = get();
    get().pushHistory();
    const layer = createLayer(undefined, layers.length);
    set({
      layers: [...layers, layer],
      activeLayerId: layer.id,
      selectedShapeId: null,
    });
  },

  removeLayer: (layerId) => {
    const { layers, activeLayerId } = get();
    if (layers.length <= 1) return;
    const target = layers.find((l) => l.id === layerId);
    if (!target) return;
    get().pushHistory();
    const next = layers.filter((l) => l.id !== layerId);
    set({
      layers: next,
      activeLayerId:
        activeLayerId === layerId ? next[next.length - 1]!.id : activeLayerId,
      selectedShapeId: null,
    });
  },

  renameLayer: (layerId, name) => {
    const { layers } = get();
    get().pushHistory();
    set({
      layers: layers.map((l) =>
        l.id === layerId ? { ...l, name: name || l.name } : l,
      ),
    });
  },

  setLayerVisible: (layerId, visible) => {
    const { layers } = get();
    get().pushHistory();
    set({
      layers: layers.map((l) =>
        l.id === layerId ? { ...l, visible } : l,
      ),
    });
  },

  setLayerOpacity: (layerId, opacity) => {
    const { layers } = get();
    get().pushHistory();
    set({
      layers: layers.map((l) =>
        l.id === layerId
          ? { ...l, opacity: clampNumber(opacity, 0, 1) }
          : l,
      ),
    });
  },

  moveLayer: (layerId, direction) => {
    const { layers, activeLayerId } = get();
    const index = layers.findIndex((l) => l.id === layerId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= layers.length) return;
    get().pushHistory();
    const next = [...layers];
    [next[index], next[target]] = [next[target]!, next[index]!];
    set({ layers: next, activeLayerId });
  },

  setActiveLayer: (layerId) =>
    set({ activeLayerId: layerId, selectedShapeId: null }),

  addShape: (shape) => {
    const { layers } = get();
    set({
      layers: layers.map((layer) =>
        layer.id === shape.layerId
          ? { ...layer, shapes: [...layer.shapes, shape] }
          : layer,
      ),
    });
  },

  updateShape: (shapeId, patch) => {
    const { layers } = get();
    set({ layers: patchShape(layers, shapeId, patch) });
  },

  removeShape: (shapeId) => {
    const { layers } = get();
    set({
      layers: layers.map((layer) => ({
        ...layer,
        shapes: layer.shapes.filter((s) => s.id !== shapeId),
      })),
      selectedShapeId: get().selectedShapeId === shapeId ? null : get().selectedShapeId,
    });
  },

  selectShape: (shapeId) => set({ selectedShapeId: shapeId }),

  copyShape: (shapeId) => {
    const shape = findShape(get().layers, shapeId);
    if (!shape) return;
    set({ clipboard: cloneShape(shape) });
  },

  pasteShape: () => {
    const { clipboard, activeLayerId } = get();
    if (!clipboard) return;
    const targetLayer = get().layers.find((layer) => layer.id === activeLayerId);
    if (!targetLayer) return;
    const cloned = cloneShape(clipboard, activeLayerId, 24, 24);
    get().pushHistory();
    get().addShape(cloned);
    set({ selectedShapeId: cloned.id });
  },

  duplicateShape: (shapeId) => {
    const shape = findShape(get().layers, shapeId);
    if (!shape) return;
    const cloned = cloneShape(shape, shape.layerId, 24, 24);
    get().pushHistory();
    get().addShape(cloned);
    set({ selectedShapeId: cloned.id });
  },

  bringShapeForward: (shapeId) => {
    const next = reorderShape(get().layers, shapeId, 1);
    if (next === get().layers) return;
    get().pushHistory();
    set({ layers: next });
  },

  sendShapeBackward: (shapeId) => {
    const next = reorderShape(get().layers, shapeId, -1);
    if (next === get().layers) return;
    get().pushHistory();
    set({ layers: next });
  },

  addPaletteColor: (color) => {
    const { palette } = get();
    if (palette.includes(color) || palette.length >= 24) return;
    const next = [...palette, color];
    persistPalette(next);
    set({ palette: next });
  },

  removePaletteColor: (color) => {
    const next = get().palette.filter((item) => item !== color);
    persistPalette(next);
    set({ palette: next });
  },

  resetPalette: () => {
    persistPalette(DEFAULT_PALETTE);
    set({ palette: [...DEFAULT_PALETTE] });
  },
}));

/** 在同一图层内前后移动形状 */
function reorderShape(
  layers: StudioLayer[],
  shapeId: string,
  direction: -1 | 1,
): StudioLayer[] {
  return layers.map((layer) => {
    const index = layer.shapes.findIndex((shape) => shape.id === shapeId);
    if (index < 0) return layer;
    const target = index + direction;
    if (target < 0 || target >= layer.shapes.length) return layer;
    const shapes = [...layer.shapes];
    [shapes[index], shapes[target]] = [shapes[target]!, shapes[index]!];
    return { ...layer, shapes };
  });
}

/** 读取持久化色板；无保存或损坏时回退默认色板 */
function loadPersistedPalette(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_PALETTE];
  try {
    const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
    if (!raw) return [...DEFAULT_PALETTE];
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((color) => typeof color === 'string')
    ) {
      return parsed.slice(0, 24);
    }
  } catch {
    // 忽略损坏的色板缓存
  }
  return [...DEFAULT_PALETTE];
}

/** 持久化色板到 localStorage */
function persistPalette(colors: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(colors));
}

/** 数值钳制 */
function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 画布尺寸钳制：保证画布仍有可操作空间且不会把 Stage 撑爆 */
function clampDimension(value: number): number {
  return clampNumber(Math.round(value), 64, 8192);
}

/** 画板尺寸常量 (组件层复用) */
export const CANVAS_STUDIO_WIDTH = CANVAS_STUDIO_SIZE.width;
export const CANVAS_STUDIO_HEIGHT = CANVAS_STUDIO_SIZE.height;

/** 导出当前画板工程文件 */
export function exportCanvasDocumentFile(
  doc: CanvasDocument,
  layers: StudioLayer[],
): void {
  const file = createDocumentFile(doc, layers);
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  const safeName = doc.name.trim().replace(/[\\/:*?"<>|]/g, '-') || 'stellar-canvas';
  a.download = `${safeName}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 生成新的形状 ID (供组件使用) */
export { generateId };
