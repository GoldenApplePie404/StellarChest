// Canvas绘画引擎 — 命令模式 undo/redo + 多图层管理 + 绘图工具集
// 支持画笔/橡皮/矩形/圆形/直线/箭头/填充/吸管, 最多50步撤销历史
import type { CanvasTool } from '@/types/tools';

/** 绘图命令接口 */
interface DrawCommand {
  execute(): void;
  undo(): void;
}

/** 图层接口 */
export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  opacity: number;
}

/** 画布引擎状态 */
export interface CanvasEngineState {
  layers: Layer[];
  activeLayerIndex: number;
}

/** 画笔样式 */
interface BrushStyle {
  size: number;
  color: string;
  opacity: number;
  /** 笔刷硬度 0~1, 1 为硬边, 越小边缘越柔和 */
  hardness: number;
}

/** 文本工具设置 */
interface TextStyle {
  content: string;
  fontSize: number;
}

/** 光标坐标回调 */
type CursorMoveCallback = (x: number, y: number) => void;

/** 笔画命令 (快照式 undo) */
class StrokeSnapshotCommand implements DrawCommand {
  private before: ImageData;
  private after: ImageData;
  private layerCtx: CanvasRenderingContext2D;

  constructor(
    beforeSnapshot: ImageData,
    afterSnapshot: ImageData,
    ctx: CanvasRenderingContext2D,
  ) {
    this.before = beforeSnapshot;
    this.after = afterSnapshot;
    this.layerCtx = ctx;
  }

  execute(): void {
    this.layerCtx.putImageData(this.after, 0, 0);
  }

  undo(): void {
    this.layerCtx.putImageData(this.before, 0, 0);
  }
}

/** 画布引擎类 */
export class CanvasEngine {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private layers: Layer[] = [];
  private activeLayerIndex: number = -1;
  private tool: CanvasTool = 'brush';
  private brush: BrushStyle = { size: 4, color: '#4A3F45', opacity: 1, hardness: 1 };
  /** 背景色槽 (待用颜色, X 键与前景色交换) */
  private backgroundColor: string = '#FFFFFF';
  private textStyle: TextStyle = { content: '', fontSize: 24 };
  private isDrawing: boolean = false;
  private undoStack: DrawCommand[] = [];
  private redoStack: DrawCommand[] = [];
  private maxUndoSteps: number = 50;

  /** 光标移动回调 (供状态栏显示坐标) */
  private onCursorMove: CursorMoveCallback | null = null;
  /** 最近一次光标位置 (逻辑坐标) */
  private lastCursor: { x: number; y: number } = { x: 0, y: 0 };

  /** 软边笔刷上一绘制点 (用于插值) */
  private lastSoftPoint: { x: number; y: number } | null = null;

  // 矩形/圆/线/箭头 起点
  private shapeOrigin: { x: number; y: number } | null = null;
  private shapeBeforeSnapshot: ImageData | null = null;

  // 事件绑定引用 (用于销毁)
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;

  private layerIdCounter: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.mainCanvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.mainCtx = ctx;

    // 绑定事件
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);

    canvas.addEventListener('mousedown', this.boundMouseDown);
    canvas.addEventListener('mousemove', this.boundMouseMove);
    canvas.addEventListener('mouseup', this.boundMouseUp);
    canvas.addEventListener('mouseleave', this.boundMouseUp);

    // 初始化默认图层
    this.addLayer('默认图层');
  }

  // ============================================================
  // Layer Management
  // ============================================================

  /** 添加图层 */
  addLayer(name: string): Layer {
    this.layerIdCounter += 1;
    const id = `layer_${this.layerIdCounter}`;
    const offscreen = document.createElement('canvas');
    offscreen.width = this.mainCanvas.width;
    offscreen.height = this.mainCanvas.height;

    const layer: Layer = {
      id,
      name,
      canvas: offscreen,
      visible: true,
      opacity: 1,
    };

    this.layers.push(layer);
    this.activeLayerIndex = this.layers.length - 1;
    this.renderAll();
    return layer;
  }

  /** 移除图层 */
  removeLayer(index: number): void {
    if (this.layers.length <= 1) return; // 至少保留一个图层
    if (index < 0 || index >= this.layers.length) return;

    this.layers.splice(index, 1);

    if (this.activeLayerIndex >= this.layers.length) {
      this.activeLayerIndex = this.layers.length - 1;
    }
    if (this.activeLayerIndex < 0) {
      this.activeLayerIndex = 0;
    }

    // 删除图层后清理撤销栈 (引用可能失效)
    this.undoStack = [];
    this.redoStack = [];
    this.renderAll();
  }

  /** 设置活跃图层 */
  setActiveLayer(index: number): void {
    if (index < 0 || index >= this.layers.length) return;
    this.activeLayerIndex = index;
  }

  /** 重排图层顺序 */
  reorderLayer(from: number, to: number): void {
    if (from < 0 || from >= this.layers.length || to < 0 || to >= this.layers.length) return;
    const [layer] = this.layers.splice(from, 1);
    if (!layer) return;
    this.layers.splice(to, 0, layer);
    this.activeLayerIndex = to;
    this.renderAll();
  }

  /** 设置图层可见性 */
  setLayerVisibility(index: number, visible: boolean): void {
    const layer = this.layers[index];
    if (!layer) return;
    layer.visible = visible;
    this.renderAll();
  }

  /** 设置图层不透明度 */
  setLayerOpacity(index: number, opacity: number): void {
    const layer = this.layers[index];
    if (!layer) return;
    layer.opacity = Math.max(0, Math.min(1, opacity));
    this.renderAll();
  }

  // ============================================================
  // Tool Configuration
  // ============================================================

  /** 设置当前工具 */
  setTool(tool: CanvasTool): void {
    this.tool = tool;
    this.updateCursor();
  }

  /** 设置画笔大小 */
  setBrushSize(size: number): void {
    this.brush.size = Math.max(1, Math.min(100, size));
  }

  /** 设置画笔颜色 */
  setBrushColor(color: string): void {
    this.brush.color = color;
  }

  /** 设置画笔不透明度 */
  setBrushOpacity(opacity: number): void {
    this.brush.opacity = Math.max(0, Math.min(1, opacity));
  }

  /** 设置笔刷硬度 0~1 */
  setBrushHardness(hardness: number): void {
    this.brush.hardness = Math.max(0, Math.min(1, hardness));
  }

  /** 设置背景色槽 */
  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }

  /** 获取背景色槽 */
  getBackgroundColor(): string {
    return this.backgroundColor;
  }

  /** 交换前景色与背景色 (X 键) */
  swapColors(): void {
    const tmp = this.brush.color;
    this.brush.color = this.backgroundColor;
    this.backgroundColor = tmp;
  }

  /** 设置文本内容 */
  setTextContent(content: string): void {
    this.textStyle.content = content;
  }

  /** 设置文本字号 */
  setTextFontSize(size: number): void {
    this.textStyle.fontSize = Math.max(8, Math.min(200, size));
  }

  /** 获取文本设置 */
  getTextStyle(): TextStyle {
    return { ...this.textStyle };
  }

  /** 注册光标移动回调 */
  setCursorMoveCallback(cb: CursorMoveCallback | null): void {
    this.onCursorMove = cb;
  }

  /** 获取最近光标位置 (逻辑坐标) */
  getCursorPosition(): { x: number; y: number } {
    return { ...this.lastCursor };
  }

  /** 更新鼠标样式 */
  private updateCursor(): void {
    switch (this.tool) {
      case 'text':
        this.mainCanvas.style.cursor = 'text';
        break;
      case 'eyedropper':
      case 'fill':
      case 'brush':
      case 'eraser':
        this.mainCanvas.style.cursor = 'crosshair';
        break;
      default:
        this.mainCanvas.style.cursor = 'crosshair';
    }
  }

  // ============================================================
  // Drawing Operations
  // ============================================================

  /** 获取当前活跃图层的 2D 上下文 */
  private getActiveCtx(): CanvasRenderingContext2D | null {
    const layer = this.layers[this.activeLayerIndex];
    if (!layer) return null;
    return layer.canvas.getContext('2d');
  }

  /** 开始描画 */
  startStroke(x: number, y: number): void {
    const activeLayer = this.layers[this.activeLayerIndex];
    if (!activeLayer) return;

    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return;

    if (
      this.tool === 'rect' ||
      this.tool === 'circle' ||
      this.tool === 'line' ||
      this.tool === 'arrow'
    ) {
      // 形状工具: 保存起点和快照
      this.shapeOrigin = { x, y };
      this.shapeBeforeSnapshot = layerCtx.getImageData(
        0, 0,
        activeLayer.canvas.width,
        activeLayer.canvas.height,
      );
      return;
    }

    if (this.tool === 'fill') {
      this.floodFill(Math.round(x), Math.round(y));
      return;
    }

    if (this.tool === 'eyedropper') {
      this.pickColor(Math.round(x), Math.round(y));
      return;
    }

    if (this.tool === 'text') {
      this.placeText(Math.round(x), Math.round(y));
      return;
    }

    // 画笔/橡皮: 保存当前快照
    const beforeSnapshot = layerCtx.getImageData(
      0, 0,
      activeLayer.canvas.width,
      activeLayer.canvas.height,
    );

    this.isDrawing = true;
    this.lastSoftPoint = null;

    layerCtx.globalAlpha = this.brush.opacity;
    layerCtx.lineCap = 'round';
    layerCtx.lineJoin = 'round';

    if (this.tool === 'eraser') {
      layerCtx.globalCompositeOperation = 'destination-out';
      layerCtx.strokeStyle = '#000000';
    } else {
      layerCtx.globalCompositeOperation = 'source-over';
      layerCtx.strokeStyle = this.brush.color;
    }

    // 软边笔刷: 用径向渐变圆点绘制 (硬度 < 1)
    if (this.brush.hardness < 1) {
      this.drawSoftDab(layerCtx, x, y);
      this.lastSoftPoint = { x, y };
      this.renderAll();
      this._beforeSnapshot = beforeSnapshot;
      return;
    }

    layerCtx.lineWidth = this.brush.size;
    layerCtx.beginPath();
    layerCtx.moveTo(x, y);
    layerCtx.lineTo(x, y);
    layerCtx.stroke();

    // 存储快照用于 undo
    this._beforeSnapshot = beforeSnapshot;
  }

  private _beforeSnapshot: ImageData | null = null;

  /** 继续描画 */
  continueStroke(x: number, y: number): void {
    if (this.shapeOrigin && (
      this.tool === 'rect' ||
      this.tool === 'circle' ||
      this.tool === 'line' ||
      this.tool === 'arrow'
    )) {
      // 形状预览: 先恢复快照再绘制
      const activeLayer = this.layers[this.activeLayerIndex];
      if (!activeLayer || !this.shapeBeforeSnapshot) return;

      const layerCtx = activeLayer.canvas.getContext('2d');
      if (!layerCtx) return;

      layerCtx.putImageData(this.shapeBeforeSnapshot, 0, 0);
      this.drawShapePreview(layerCtx, this.shapeOrigin.x, this.shapeOrigin.y, x, y);
      this.renderAll();
      return;
    }

    if (!this.isDrawing) return;

    // 软边笔刷: 沿路径插值绘制渐变圆点, 避免断点
    if (this.brush.hardness < 1) {
      const layerCtx = this.getActiveCtx();
      if (!layerCtx) return;
      const last = this.lastSoftPoint;
      if (last) {
        const dist = Math.hypot(x - last.x, y - last.y);
        const step = Math.max(2, this.brush.size * 0.25);
        const count = Math.max(1, Math.floor(dist / step));
        for (let i = 1; i <= count; i += 1) {
          const t = i / count;
          this.drawSoftDab(
            layerCtx,
            last.x + (x - last.x) * t,
            last.y + (y - last.y) * t,
          );
        }
      } else {
        this.drawSoftDab(layerCtx, x, y);
      }
      this.lastSoftPoint = { x, y };
      this.renderAll();
      return;
    }

    const layerCtx = this.getActiveCtx();
    if (!layerCtx) return;

    layerCtx.lineTo(x, y);
    layerCtx.stroke();

    this.renderAll();
  }

  /** 结束描画 */
  endStroke(): void {
    if (this.shapeOrigin && this.shapeBeforeSnapshot) {
      // 形状工具: 提交最终形状
      const activeLayer = this.layers[this.activeLayerIndex];
      if (!activeLayer) {
        this.shapeOrigin = null;
        this.shapeBeforeSnapshot = null;
        return;
      }

      const layerCtx = activeLayer.canvas.getContext('2d');
      if (!layerCtx) {
        this.shapeOrigin = null;
        this.shapeBeforeSnapshot = null;
        return;
      }

      const before = this.shapeBeforeSnapshot;
      const after = layerCtx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);

      this.pushUndo(new StrokeSnapshotCommand(before, after, layerCtx));
      this.shapeOrigin = null;
      this.shapeBeforeSnapshot = null;
      this.renderAll();
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    const activeLayer = this.layers[this.activeLayerIndex];
    if (!activeLayer) return;

    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return;

    const afterSnapshot = layerCtx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);

    if (this._beforeSnapshot) {
      this.pushUndo(
        new StrokeSnapshotCommand(this._beforeSnapshot, afterSnapshot, layerCtx),
      );
      this._beforeSnapshot = null;
    }

    // 恢复默认合成模式
    layerCtx.globalCompositeOperation = 'source-over';
    layerCtx.globalAlpha = 1;
    this.renderAll();
  }

  /** 绘制形状预览 (矩形/圆/线/箭头) */
  private drawShapePreview(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void {
    ctx.globalAlpha = this.brush.opacity;
    ctx.strokeStyle = this.brush.color;
    ctx.lineWidth = this.brush.size;
    ctx.lineCap = 'round';

    if (this.tool === 'rect') {
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      ctx.strokeRect(x, y, w, h);
    } else if (this.tool === 'circle') {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.tool === 'line' || this.tool === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (this.tool === 'arrow') {
        // 绘制箭头
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowSize = this.brush.size * 3;
        const tip1X = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
        const tip1Y = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
        const tip2X = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
        const tip2Y = y2 - arrowSize * Math.sin(angle + Math.PI / 6);

        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(tip1X, tip1Y);
        ctx.moveTo(x2, y2);
        ctx.lineTo(tip2X, tip2Y);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  }

  /** 洪水填充算法 */
  async floodFill(startX: number, startY: number): Promise<void> {
    const activeLayer = this.layers[this.activeLayerIndex];
    if (!activeLayer) return;

    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return;

    const w = activeLayer.canvas.width;
    const h = activeLayer.canvas.height;

    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const beforeSnapshot = layerCtx.getImageData(0, 0, w, h);
    const imageData = layerCtx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const idx = (startY * w + startX) * 4;
    const targetR = data[idx]!;
    const targetG = data[idx! + 1]!;
    const targetB = data[idx! + 2]!;
    const targetA = data[idx! + 3]!;

    // 解析填充颜色
    const fillColor = this.brush.color;
    const rgb = this.parseColor(fillColor);
    if (!rgb) return;

    const fillR = rgb.r;
    const fillG = rgb.g;
    const fillB = rgb.b;
    const fillA = Math.round(this.brush.opacity * 255);

    // 如果目标颜色和填充颜色相同，跳过
    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    // BFS 洪水填充
    const visited = new Uint8Array(w * h);
    const queue: number[] = [startX, startY];
    visited[startY * w + startX] = 1;

    const tolerance = 8;

    while (queue.length > 0) {
      const px = queue.shift()!;
      const py = queue.shift()!;

      const pi = (py * w + px) * 4;
      data[pi] = fillR;
      data[pi + 1] = fillG;
      data[pi + 2] = fillB;
      data[pi + 3] = fillA;

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx!;
        const ny = py + dy!;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const ni = (ny * w + nx) * 4;
        if (visited[ny * w + nx]) continue;

        const dr = Math.abs(data[ni]! - targetR);
        const dg = Math.abs(data[ni! + 1]! - targetG);
        const db = Math.abs(data[ni! + 2]! - targetB);
        const da = Math.abs(data[ni! + 3]! - targetA);

        if (dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance) {
          visited[ny * w + nx] = 1;
          queue.push(nx, ny);
        }
      }
    }

    layerCtx.putImageData(imageData, 0, 0);
    const afterSnapshot = layerCtx.getImageData(0, 0, w, h);
    this.pushUndo(new StrokeSnapshotCommand(beforeSnapshot, afterSnapshot, layerCtx));
    this.renderAll();
  }

  /** 解析 CSS 颜色为 RGB */
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    const ctx = this.mainCtx;
    // 使用 canvas 来解析
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 1;
    dummyCanvas.height = 1;
    const dc = dummyCanvas.getContext('2d');
    if (!dc) return null;
    dc.fillStyle = color;
    dc.fillRect(0, 0, 1, 1);
    const [r, g, b] = dc.getImageData(0, 0, 1, 1).data as Uint8ClampedArray;
    return { r: r!, g: g!, b: b! };
  }

  /** 吸管取色 */
  pickColor(x: number, y: number): string {
    const activeLayer = this.layers[this.activeLayerIndex];
    if (!activeLayer) return this.brush.color;

    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return this.brush.color;

    const pixel = layerCtx.getImageData(x, y, 1, 1).data;
    const r = pixel[0]!;
    const g = pixel[1]!;
    const b = pixel[2]!;
    const a = pixel[3]!;

    if (a === 0) return this.brush.color; // 透明像素，保持原色

    this.brush.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return this.brush.color;
  }

  /** 放置文本 (点击画布在指定位置写入文本内容) */
  private placeText(x: number, y: number): void {
    const activeLayer = this.layers[this.activeLayerIndex];
    if (!activeLayer) return;

    const layerCtx = activeLayer.canvas.getContext('2d');
    if (!layerCtx) return;

    const text = this.textStyle.content;
    if (!text.trim()) return;

    const beforeSnapshot = layerCtx.getImageData(
      0, 0,
      activeLayer.canvas.width,
      activeLayer.canvas.height,
    );

    layerCtx.save();
    layerCtx.globalAlpha = this.brush.opacity;
    layerCtx.fillStyle = this.brush.color;
    layerCtx.font = `${this.textStyle.fontSize}px system-ui, "Segoe UI", "Microsoft YaHei", sans-serif`;
    layerCtx.textBaseline = 'top';

    const lines = text.split('\n');
    const lineHeight = this.textStyle.fontSize * 1.25;
    lines.forEach((line, i) => {
      layerCtx.fillText(line, x, y + i * lineHeight);
    });

    layerCtx.restore();

    const afterSnapshot = layerCtx.getImageData(
      0, 0,
      activeLayer.canvas.width,
      activeLayer.canvas.height,
    );

    this.pushUndo(new StrokeSnapshotCommand(beforeSnapshot, afterSnapshot, layerCtx));
    this.renderAll();
  }

  /** 绘制软边圆点 (径向渐变, 用于硬度 < 1 的笔刷/橡皮) */
  private drawSoftDab(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
  ): void {
    const radius = Math.max(1, this.brush.size / 2);
    const color = this.tool === 'eraser' ? '#000000' : this.brush.color;
    const rgb = this.parseColor(color);
    if (!rgb) return;

    const inner = radius * this.brush.hardness;
    const grad = ctx.createRadialGradient(x, y, inner, x, y, radius);
    const alpha = this.brush.opacity;
    grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
    grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ============================================================
  // Undo / Redo
  // ============================================================

  private pushUndo(cmd: DrawCommand): void {
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): void {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
    this.renderAll();
  }

  redo(): void {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute();
    this.undoStack.push(cmd);
    this.renderAll();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // ============================================================
  // Rendering
  // ============================================================

  /** 渲染所有可见图层到主画布 */
  private renderAll(): void {
    const ctx = this.mainCtx;
    ctx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

    for (const layer of this.layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0);
    }
    ctx.globalAlpha = 1;
  }

  /** 手动触发渲染 (供外部调用) */
  render(): void {
    this.renderAll();
  }

  // ============================================================
  // Export
  // ============================================================

  /** 合并所有可见图层导出为 base64 dataURL */
  mergeVisible(format: string = 'png', quality: number = 0.92): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.mainCanvas.width;
    tempCanvas.height = this.mainCanvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    for (const layer of this.layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0);
    }
    ctx.globalAlpha = 1;

    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    const mime = mimeMap[format] || 'image/png';
    return tempCanvas.toDataURL(mime, quality);
  }

  // ============================================================
  // State Accessors
  // ============================================================

  /** 获取图层列表 */
  getLayers(): Layer[] {
    return this.layers;
  }

  /** 获取当前活跃图层索引 */
  getActiveLayerIndex(): number {
    return this.activeLayerIndex;
  }

  /** 获取当前工具 */
  getTool(): CanvasTool {
    return this.tool;
  }

  /** 获取画笔设置 */
  getBrush(): BrushStyle {
    return { ...this.brush };
  }

  // ============================================================
  // Mouse Event Handlers
  // ============================================================

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.mainCanvas.getBoundingClientRect();
    const scaleX = this.mainCanvas.width / rect.width;
    const scaleY = this.mainCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e);
    this.startStroke(x, y);
  }

  private onMouseMove(e: MouseEvent): void {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e);
    this.lastCursor = { x: Math.round(x), y: Math.round(y) };
    this.onCursorMove?.(this.lastCursor.x, this.lastCursor.y);
    this.continueStroke(x, y);
  }

  private onMouseUp(e: MouseEvent): void {
    e.preventDefault();
    this.endStroke();
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  /** 销毁引擎，移除事件监听 */
  destroy(): void {
    this.mainCanvas.removeEventListener('mousedown', this.boundMouseDown);
    this.mainCanvas.removeEventListener('mousemove', this.boundMouseMove);
    this.mainCanvas.removeEventListener('mouseup', this.boundMouseUp);
    this.mainCanvas.removeEventListener('mouseleave', this.boundMouseUp);

    this.undoStack = [];
    this.redoStack = [];
    this.layers = [];
  }
}
