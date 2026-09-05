// 星墨画板（新版）— 纯逻辑引擎层
// 负责形状工厂、图层创建、文档快照与恢复；渲染和交互由 react-konva 组件层负责

import type {
  BrushSettings,
  CanvasDocument,
  CanvasDocumentFile,
  CanvasStudioSize,
  FreehandStroke,
  StudioEllipse,
  StudioLayer,
  StudioLine,
  StudioRect,
  StudioShape,
  StudioText,
} from '@/types/canvas-studio';

/** 新版画板默认尺寸 */
export const CANVAS_STUDIO_SIZE: CanvasStudioSize = {
  width: 960,
  height: 640,
};

/** 工程文件标识与当前 Schema 版本 */
export const CANVAS_STUDIO_APP_ID = 'stellar-canvas';
export const CANVAS_STUDIO_SCHEMA_VERSION = 1;

/** 创建画板文档 */
export function createDocument(
  width = CANVAS_STUDIO_SIZE.width,
  height = CANVAS_STUDIO_SIZE.height,
  name = '未命名画布',
  background = '#FFFFFF',
): CanvasDocument {
  return {
    name,
    width,
    height,
    background,
    updatedAt: Date.now(),
  };
}

/** 构建画板工程文件 */
export function createDocumentFile(
  document: CanvasDocument,
  layers: StudioLayer[],
): CanvasDocumentFile {
  return {
    app: CANVAS_STUDIO_APP_ID,
    schemaVersion: CANVAS_STUDIO_SCHEMA_VERSION,
    document: {
      ...document,
      updatedAt: Date.now(),
    },
    layers: cloneLayers(layers),
  };
}

/** 解析并校验画板工程文件；兼容旧版纯图层数组 JSON */
export function parseCanvasDocumentFile(raw: string): CanvasDocumentFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('JSON 解析失败，文件可能已损坏');
  }

  if (isCanvasDocumentFile(parsed)) return parsed;

  if (Array.isArray(parsed) && parsed.every(isLayerLike)) {
    return {
      app: CANVAS_STUDIO_APP_ID,
      schemaVersion: CANVAS_STUDIO_SCHEMA_VERSION,
      document: createDocument(),
      layers: parsed as StudioLayer[],
    };
  }

  throw new Error('不是有效的星墨画板工程文件');
}

/** 校验画板工程文件结构 */
export function isCanvasDocumentFile(
  value: unknown,
): value is CanvasDocumentFile {
  if (!value || typeof value !== 'object') return false;
  const file = value as Partial<CanvasDocumentFile>;
  if (
    file.app !== CANVAS_STUDIO_APP_ID ||
    file.schemaVersion !== CANVAS_STUDIO_SCHEMA_VERSION
  ) {
    return false;
  }

  const doc = file.document;
  const layers = file.layers;
  if (!doc || typeof doc !== 'object') return false;
  if (
    typeof doc.width !== 'number' ||
    typeof doc.height !== 'number' ||
    !Number.isFinite(doc.width) ||
    !Number.isFinite(doc.height) ||
    doc.width <= 0 ||
    doc.height <= 0
  ) {
    return false;
  }
  if (typeof doc.name !== 'string' || typeof doc.background !== 'string') {
    return false;
  }
  return Array.isArray(layers) && layers.length > 0 && layers.every(isLayerLike);
}

/** 图层结构的最小校验 */
function isLayerLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const layer = value as Partial<StudioLayer>;
  if (typeof layer.id !== 'string' || !Array.isArray(layer.shapes)) {
    return false;
  }
  return layer.shapes.every(
    (shape) =>
      shape &&
      typeof shape === 'object' &&
      typeof (shape as Partial<StudioShape>).id === 'string' &&
      typeof (shape as Partial<StudioShape>).kind === 'string',
  );
}

/** 生成简单唯一 ID */
export function generateId(prefix = 'node'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 创建空白图层 */
export function createLayer(name?: string, index = 0): StudioLayer {
  return {
    id: generateId('layer'),
    name: name ?? `图层 ${index + 1}`,
    visible: true,
    opacity: 1,
    shapes: [],
  };
}

/** 创建自由画笔笔画 */
export function createFreehandStroke(
  layerId: string,
  x: number,
  y: number,
  brush: BrushSettings,
  initialWidth = brush.strokeWidth,
): FreehandStroke {
  return {
    id: generateId('stroke'),
    kind: 'brush',
    layerId,
    x: 0,
    y: 0,
    points: [x, y],
    widths: [Math.max(1, initialWidth)],
    stroke: brush.color,
    strokeWidth: brush.strokeWidth,
    opacity: brush.opacity,
    tension: 0.4,
  };
}

/** 创建矩形 */
export function createRectShape(
  layerId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  brush: BrushSettings,
): StudioRect {
  return {
    id: generateId('rect'),
    kind: 'rect',
    layerId,
    x,
    y,
    width,
    height,
    fill: brush.fillColor,
    stroke: brush.color,
    strokeWidth: brush.strokeWidth,
    opacity: brush.opacity,
    cornerRadius: 0,
  };
}

/** 创建椭圆 */
export function createEllipseShape(
  layerId: string,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  brush: BrushSettings,
): StudioEllipse {
  return {
    id: generateId('ellipse'),
    kind: 'ellipse',
    layerId,
    x,
    y,
    radiusX,
    radiusY,
    fill: brush.fillColor,
    stroke: brush.color,
    strokeWidth: brush.strokeWidth,
    opacity: brush.opacity,
  };
}

/** 创建直线 / 箭头 */
export function createLineShape(
  layerId: string,
  kind: 'line' | 'arrow',
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  brush: BrushSettings,
): StudioLine {
  return {
    id: generateId(kind),
    kind,
    layerId,
    x: 0,
    y: 0,
    points: [x0, y0, x1, y1],
    stroke: brush.color,
    strokeWidth: brush.strokeWidth,
    opacity: brush.opacity,
  };
}

/** 创建文本形状 */
export function createTextShape(
  layerId: string,
  x: number,
  y: number,
  brush: BrushSettings,
): StudioText {
  return {
    id: generateId('text'),
    kind: 'text',
    layerId,
    x,
    y,
    text: brush.text || '文本',
    fontSize: brush.fontSize,
    fontFamily: brush.fontFamily,
    fill: brush.color,
    opacity: brush.opacity,
    width: 320,
  };
}

/** 将图层集合序列化为历史快照 */
export function snapshotLayers(layers: StudioLayer[]): string {
  return JSON.stringify(layers);
}

/** 从历史快照恢复图层集合 */
export function restoreLayers(snapshot: string): StudioLayer[] {
  return JSON.parse(snapshot) as StudioLayer[];
}

/** 深度克隆图层集合 (用于预览等临时场景) */
export function cloneLayers(layers: StudioLayer[]): StudioLayer[] {
  return restoreLayers(snapshotLayers(layers));
}

/** 克隆形状；画笔/直线需要整体偏移坐标点，其他形状偏移左上角 */
export function cloneShape(
  shape: StudioShape,
  layerId?: string,
  offsetX = 0,
  offsetY = 0,
): StudioShape {
  const cloned = JSON.parse(JSON.stringify(shape)) as StudioShape;
  cloned.id = generateId(cloned.kind);
  if (layerId) cloned.layerId = layerId;

  if ('points' in cloned && Array.isArray(cloned.points)) {
    cloned.points = cloned.points.map((value, index) =>
      index % 2 === 0 ? value + offsetX : value + offsetY,
    );
  } else {
    cloned.x = (cloned.x ?? 0) + offsetX;
    cloned.y = (cloned.y ?? 0) + offsetY;
  }
  return cloned;
}

/** 按 ID 查找形状 */
export function findShape(
  layers: StudioLayer[],
  shapeId: string,
): StudioShape | null {
  for (const layer of layers) {
    const shape = layer.shapes.find((s) => s.id === shapeId);
    if (shape) return shape;
  }
  return null;
}

/** 替换形状 (返回新图层数组) */
export function patchShape(
  layers: StudioLayer[],
  shapeId: string,
  patch: Partial<StudioShape>,
): StudioLayer[] {
  return layers.map((layer) => ({
    ...layer,
    shapes: layer.shapes.map((shape) =>
      shape.id === shapeId ? ({ ...shape, ...patch } as StudioShape) : shape,
    ),
  }));
}
