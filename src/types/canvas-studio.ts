// 星墨画板（新版）— Konva 场景图数据类型定义
// 与旧版 CanvasEngine 完全独立，新版画板以矢量形状 + 图层模型为核心

/** 新版画板工具 */
export type CanvasStudioTool =
  | 'select'
  | 'brush'
  | 'eraser'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text';

/** 形状公共字段 */
interface StudioShapeBase {
  /** 形状唯一 ID */
  id: string;
  /** 所属图层 ID */
  layerId: string;
  /** 左上角 X 坐标 (文档坐标) */
  x: number;
  /** 左上角 Y 坐标 (文档坐标) */
  y: number;
  /** 不透明度 0~1 */
  opacity: number;
}

/** 自由画笔笔画 */
export interface FreehandStroke extends StudioShapeBase {
  kind: 'brush';
  /** 扁平坐标数组 [x0, y0, x1, y1, ...] */
  points: number[];
  /** 与 points 对应的逐点笔画宽度；旧版数据可能缺失，渲染时会回退 */
  widths?: number[];
  stroke: string;
  strokeWidth: number;
  tension: number;
}

/** 矩形 */
export interface StudioRect extends StudioShapeBase {
  kind: 'rect';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

/** 椭圆 */
export interface StudioEllipse extends StudioShapeBase {
  kind: 'ellipse';
  radiusX: number;
  radiusY: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

/** 直线 / 箭头 (points 为 [x0, y0, x1, y1]) */
export interface StudioLine extends StudioShapeBase {
  kind: 'line' | 'arrow';
  points: number[];
  stroke: string;
  strokeWidth: number;
}

/** 文本 */
export interface StudioText extends StudioShapeBase {
  kind: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  /** 文本换行宽度 */
  width: number;
}

/** 新版画板形状联合类型 */
export type StudioShape =
  | FreehandStroke
  | StudioRect
  | StudioEllipse
  | StudioLine
  | StudioText;

/** 画板图层 */
export interface StudioLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  shapes: StudioShape[];
}

/** 画板文档尺寸 */
export interface CanvasStudioSize {
  width: number;
  height: number;
}

/** 画板文档元信息 */
export interface CanvasDocument {
  name: string;
  width: number;
  height: number;
  /** 背景色；`transparent` 表示透明背景 */
  background: string;
  updatedAt: number;
}

/** 画板工程文件（可导入/导出/自动保存） */
export interface CanvasDocumentFile {
  app: 'stellar-canvas';
  schemaVersion: 1;
  document: CanvasDocument;
  layers: StudioLayer[];
}

/** 画笔 / 描边 / 文本默认设置 */
export interface BrushSettings {
  color: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
  text: string;
}
