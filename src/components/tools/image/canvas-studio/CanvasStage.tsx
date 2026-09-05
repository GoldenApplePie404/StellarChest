// 新版画板 — Konva 舞台与全部绘制交互
// 工具按文档坐标工作；缩放只作用于 Stage 的 scale，保证交互坐标简单稳定
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import {
  Arrow,
  Ellipse,
  Group,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
  Transformer,
} from 'react-konva';
import {
  useCanvasStudioStore,
} from '@/store/useCanvasStudioStore';
import {
  createEllipseShape,
  createFreehandStroke,
  createLineShape,
  createRectShape,
  createTextShape,
  findShape,
} from '@/engine/canvas-studio/engine';
import type {
  BrushSettings,
  CanvasStudioTool,
  StudioLayer,
  StudioShape,
} from '@/types/canvas-studio';

/** 可参与 Transform 变换的形状类型 */
const TRANSFORMABLE_KINDS = new Set(['rect', 'ellipse', 'text']);

/** 笔触平滑使用的采样点数 */
const SMOOTH_SAMPLE_POINTS = 3;

interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export default function CanvasStage({
  stageRef,
}: CanvasStageProps): React.JSX.Element {
  const layers = useCanvasStudioStore((s) => s.layers);
  const activeLayerId = useCanvasStudioStore((s) => s.activeLayerId);
  const document = useCanvasStudioStore((s) => s.document);
  const tool = useCanvasStudioStore((s) => s.tool);
  const brush = useCanvasStudioStore((s) => s.brush);
  const zoom = useCanvasStudioStore((s) => s.zoom);
  const selectedShapeId = useCanvasStudioStore((s) => s.selectedShapeId);
  const setCursor = useCanvasStudioStore((s) => s.setCursor);
  const pushHistory = useCanvasStudioStore((s) => s.pushHistory);
  const addShape = useCanvasStudioStore((s) => s.addShape);
  const updateShape = useCanvasStudioStore((s) => s.updateShape);
  const removeShape = useCanvasStudioStore((s) => s.removeShape);
  const selectShape = useCanvasStudioStore((s) => s.selectShape);

  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeNodesRef = useRef<Record<string, Konva.Node>>({});
  const drawingRef = useRef(false);
  const erasingRef = useRef(false);
  const historyPushedRef = useRef(false);
  const draftRef = useRef<StudioShape | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const smoothQueueRef = useRef<number[]>([]);

  const [draft, setDraft] = useState<StudioShape | null>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const { width, height, background } = document;
  const selectedShape = selectedShapeId
    ? findShape(layers, selectedShapeId)
    : null;

  const updateDraft = useCallback((next: StudioShape | null) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const beginGesture = useCallback(() => {
    if (!historyPushedRef.current) {
      pushHistory();
      historyPushedRef.current = true;
    }
  }, [pushHistory]);

  const endGesture = useCallback(() => {
    historyPushedRef.current = false;
  }, []);

  /** 获取文档坐标系下的指针位置 */
  const getDocPointer = useCallback((): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY(),
    };
  }, [stageRef]);

  /** 命中测试并擦除形状 */
  const eraseAt = useCallback(
    (pos: { x: number; y: number }) => {
      const layer = layerRef.current;
      if (!layer) return;
      const hit = layer.getIntersection(pos);
      const hitId = hit?.id() || hit?.getParent()?.id();
      if (hitId && hitId !== 'canvas-bg') {
        removeShape(hitId);
      }
    },
    [removeShape],
  );

  const handlePointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
    const pos = getDocPointer();
    if (!pos || !activeLayer) return;

    if (tool === 'select') {
      const layer = layerRef.current;
      const hit = layer?.getIntersection(pos);
      const hitId = hit?.id() || hit?.getParent()?.id();
      if (hitId && hitId !== 'canvas-bg') {
        selectShape(hitId);
      } else {
        selectShape(null);
      }
      return;
    }

    if (tool === 'eraser') {
      erasingRef.current = true;
      beginGesture();
      eraseAt(pos);
      return;
    }

    if (tool === 'text') {
      const shape = createTextShape(activeLayer.id, pos.x, pos.y, brush);
      beginGesture();
      addShape(shape);
      selectShape(shape.id);
      endGesture();
      return;
    }

    drawingRef.current = true;
    lastPointRef.current = pos;
    smoothQueueRef.current = [pos.x, pos.y];

    if (tool === 'brush') {
      const width = pointerStrokeWidth(brush.strokeWidth, e);
      updateDraft(
        createFreehandStroke(activeLayer.id, pos.x, pos.y, brush, width),
      );
      return;
    }

    if (tool === 'rect' || tool === 'ellipse') {
      const width = 0;
      const height = 0;
      const shape =
        tool === 'rect'
          ? createRectShape(activeLayer.id, pos.x, pos.y, width, height, brush)
          : createEllipseShape(activeLayer.id, pos.x, pos.y, 0, 0, brush);
      updateDraft(shape);
      return;
    }

    if (tool === 'line' || tool === 'arrow') {
      updateDraft(
        createLineShape(activeLayer.id, tool, pos.x, pos.y, pos.x, pos.y, brush),
      );
    }
    },
    [
      activeLayer,
      addShape,
      beginGesture,
      brush,
      endGesture,
      eraseAt,
      getDocPointer,
      removeShape,
      selectShape,
      tool,
      updateDraft,
    ],
  );

  const handlePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const pos = getDocPointer();
      if (!pos) return;
      setCursor({ x: Math.round(pos.x), y: Math.round(pos.y) });

      if (tool === 'eraser' && erasingRef.current) {
        eraseAt(pos);
        return;
      }

      if (!drawingRef.current || !draftRef.current) return;

      const current = draftRef.current;

      if (current.kind === 'brush') {
        const last = lastPointRef.current;
        if (!last) return;
        smoothQueueRef.current.push(pos.x, pos.y);
        if (smoothQueueRef.current.length > SMOOTH_SAMPLE_POINTS * 2 + 2) {
          smoothQueueRef.current.splice(0, 2);
        }
        const smoothed = smoothBrushPoint(smoothQueueRef.current);
        const dx = smoothed.x - last.x;
        const dy = smoothed.y - last.y;
        if (Math.hypot(dx, dy) < 0.8) return;
        lastPointRef.current = smoothed;
        updateDraft({
          ...current,
          points: [...current.points, smoothed.x, smoothed.y],
          widths: [
            ...(current.widths ?? [current.strokeWidth]),
            pointerStrokeWidth(current.strokeWidth, e),
          ],
        });
        return;
      }

      if (current.kind === 'rect') {
        const x = Math.min(current.x, pos.x);
        const y = Math.min(current.y, pos.y);
        updateDraft({
          ...current,
          x,
          y,
          width: Math.abs(pos.x - current.x),
          height: Math.abs(pos.y - current.y),
        });
        return;
      }

      if (current.kind === 'ellipse') {
        const radiusX = Math.abs(pos.x - current.x) / 2;
        const radiusY = Math.abs(pos.y - current.y) / 2;
        updateDraft({
          ...current,
          x: Math.min(current.x, pos.x) + radiusX,
          y: Math.min(current.y, pos.y) + radiusY,
          radiusX,
          radiusY,
        });
        return;
      }

      if (current.kind === 'line' || current.kind === 'arrow') {
        const startX = current.points[0]!;
        const startY = current.points[1]!;
        updateDraft({
          ...current,
          points: [startX, startY, pos.x, pos.y],
        });
      }
    },
    [eraseAt, getDocPointer, setCursor, tool, updateDraft],
  );

  const finishDraft = useCallback(() => {
    if (!drawingRef.current || !draftRef.current) return;
    const current = draftRef.current;
    if (current.kind === 'brush' && current.points.length < 4) {
      const x = current.points[0]!;
      const y = current.points[1]!;
      current.points = [x, y, x + 0.1, y];
      current.widths = [
        current.widths?.[0] ?? current.strokeWidth,
        current.widths?.[0] ?? current.strokeWidth,
      ];
    }
    beginGesture();
    addShape(current);
    updateDraft(null);
    drawingRef.current = false;
    lastPointRef.current = null;
    smoothQueueRef.current = [];
    endGesture();
  }, [addShape, beginGesture, endGesture, updateDraft]);

  const handlePointerUp = useCallback(() => {
    if (drawingRef.current) {
      finishDraft();
      return;
    }
    if (erasingRef.current) {
      erasingRef.current = false;
      endGesture();
    }
  }, [endGesture, finishDraft]);

  /** 选中变化时同步 Transformer */
  useEffect(() => {
    const transformer = transformerRef.current;
    const node = selectedShapeId
      ? shapeNodesRef.current[selectedShapeId]
      : undefined;
    if (!transformer) return;
    if (node && selectedShape && TRANSFORMABLE_KINDS.has(selectedShape.kind)) {
      transformer.nodes([node]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedShape, selectedShapeId]);

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<unknown>) => {
      const node = e.target as Konva.Node;
      const shape = selectedShapeId
        ? findShape(useCanvasStudioStore.getState().layers, selectedShapeId)
        : null;
      if (!shape) return;
      const patch: Record<string, unknown> = {
        x: node.x(),
        y: node.y(),
      };
      if (shape.kind === 'rect') {
        const rectNode = node as Konva.Rect;
        patch.width = Math.max(1, Math.round(rectNode.width() * rectNode.scaleX()));
        patch.height = Math.max(1, Math.round(rectNode.height() * rectNode.scaleY()));
      } else if (shape.kind === 'ellipse') {
        const ellipseNode = node as Konva.Ellipse;
        patch.radiusX = Math.max(1, Math.abs(ellipseNode.radiusX() * ellipseNode.scaleX()));
        patch.radiusY = Math.max(1, Math.abs(ellipseNode.radiusY() * ellipseNode.scaleY()));
      } else if (shape.kind === 'text') {
        const textNode = node as Konva.Text;
        patch.fontSize = Math.max(8, Math.round(textNode.fontSize() * textNode.scaleY()));
      }
      updateShape(shape.id, patch as Partial<StudioShape>);
      node.scale({ x: 1, y: 1 });
    },
    [selectedShapeId, updateShape],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      useCanvasStudioStore
        .getState()
        .setZoom(useCanvasStudioStore.getState().zoom * factor);
    },
    [],
  );

  return (
    <div
      className="flex-1 overflow-auto bg-[#f0edf5]"
      onWheel={handleWheel}
    >
      <div
        className="min-w-full min-h-full flex items-center justify-center p-6"
        style={{
          width: width * zoom + 48,
          height: height * zoom + 48,
        }}
      >
        <div
          className="flex-shrink-0 rounded-sm overflow-hidden"
          style={{
            width: width * zoom,
            height: height * zoom,
            backgroundImage:
              'linear-gradient(45deg, #e0d6f2 25%, transparent 25%), linear-gradient(-45deg, #e0d6f2 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0d6f2 75%), linear-gradient(-45deg, transparent 75%, #e0d6f2 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
          }}
        >
          <Stage
            ref={stageRef}
            width={width}
            height={height}
            scaleX={zoom}
            scaleY={zoom}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: 'none' }}
          >
            <Layer ref={layerRef}>
              <Rect
                id="canvas-bg"
                x={0}
                y={0}
                width={width}
                height={height}
                fill={background === 'transparent' ? 'rgba(255,255,255,0)' : background}
                shadowColor="#4A3F45"
                shadowBlur={14}
                shadowOpacity={0.12}
                shadowOffsetY={4}
                listening={false}
              />

              {layers.map((layer) =>
                layer.visible
                  ? layer.shapes.map((shape) => (
                      <StudioShapeNode
                        key={shape.id}
                        shape={shape}
                        layerOpacity={layer.opacity}
                        tool={tool}
                        selected={shape.id === selectedShapeId}
                        onNodeRef={(node) => {
                          if (node) {
                            shapeNodesRef.current[shape.id] = node;
                          } else {
                            delete shapeNodesRef.current[shape.id];
                          }
                        }}
                        onDragStart={beginGesture}
                        onDragMove={(e) =>
                          updateShape(shape.id, {
                            x: e.target.x(),
                            y: e.target.y(),
                          })
                        }
                        onDragEnd={endGesture}
                      />
                    ))
                  : null,
              )}

              {draft && <DraftShape shape={draft} />}

              {selectedShape && tool === 'select' && (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={selectedShape.kind !== 'text'}
                  keepRatio={false}
                  anchorSize={8}
                  borderStroke="#FF9BB5"
                  borderDash={[4, 4]}
                  anchorStroke="#FF9BB5"
                  anchorFill="#FFFFFF"
                  anchorCornerRadius={2}
                  onTransformEnd={handleTransformEnd}
                  onDragStart={beginGesture}
                  onDragEnd={endGesture}
                />
              )}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}

/** 单个形状节点渲染 */
function StudioShapeNode({
  shape,
  layerOpacity,
  tool,
  selected,
  onNodeRef,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  shape: StudioShape;
  layerOpacity: number;
  tool: CanvasStudioTool;
  selected: boolean;
  onNodeRef: (node: Konva.Node | null) => void;
  onDragStart: () => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: () => void;
}): React.JSX.Element {
  const common = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    opacity: layerOpacity * shape.opacity,
    draggable: tool === 'select' && selected,
    ref: onNodeRef,
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  switch (shape.kind) {
    case 'brush':
      return (
        <BrushStroke
          x={common.x}
          y={common.y}
          points={shape.points}
          widths={shape.widths}
          fallbackWidth={shape.strokeWidth}
          stroke={shape.stroke}
          opacity={common.opacity}
          id={common.id}
          draggable={common.draggable}
          onNodeRef={common.ref}
          onDragStart={common.onDragStart}
          onDragMove={common.onDragMove}
          onDragEnd={common.onDragEnd}
        />
      );
    case 'rect':
      return (
        <Rect
          {...common}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          cornerRadius={shape.cornerRadius}
        />
      );
    case 'ellipse':
      return (
        <Ellipse
          {...common}
          radiusX={shape.radiusX}
          radiusY={shape.radiusY}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
        />
      );
    case 'line':
      return (
        <Line
          {...common}
          points={shape.points}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      );
    case 'arrow':
      return (
        <Arrow
          {...common}
          points={shape.points}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          lineCap="round"
          lineJoin="round"
          pointerLength={Math.max(10, shape.strokeWidth * 3)}
          pointerWidth={Math.max(10, shape.strokeWidth * 3)}
        />
      );
    case 'text':
      return (
        <Text
          {...common}
          text={shape.text}
          fontSize={shape.fontSize}
          fontFamily={shape.fontFamily}
          fill={shape.fill}
          width={shape.width}
          wrap="word"
        />
      );
  }
}

/** 拖拽中的草稿形状 (不参与命中测试) */
function DraftShape({ shape }: { shape: StudioShape }): React.JSX.Element | null {
  const common = { listening: false, opacity: shape.opacity };
  switch (shape.kind) {
    case 'brush':
      return (
        <BrushStroke
          x={shape.x}
          y={shape.y}
          points={shape.points}
          widths={shape.widths}
          fallbackWidth={shape.strokeWidth}
          stroke={shape.stroke}
          opacity={common.opacity}
          listening={false}
        />
      );
    case 'rect':
      return (
        <Rect
          {...common}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          cornerRadius={shape.cornerRadius}
        />
      );
    case 'ellipse':
      return (
        <Ellipse
          {...common}
          x={shape.x}
          y={shape.y}
          radiusX={shape.radiusX}
          radiusY={shape.radiusY}
          fill={shape.fill}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
        />
      );
    case 'line':
    case 'arrow':
      return (
        <Line
          {...common}
          points={shape.points}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      );
    case 'text':
      return null;
  }
}

/** 压感画笔：按逐点宽度绘制带状路径，鼠标走基础宽度，数位板/触控走压力 */
function BrushStroke({
  x,
  y,
  points,
  widths,
  fallbackWidth,
  stroke,
  opacity,
  listening = true,
  id,
  draggable = false,
  onNodeRef,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  x: number;
  y: number;
  points: number[];
  widths?: number[];
  fallbackWidth: number;
  stroke: string;
  opacity: number;
  listening?: boolean;
  id?: string;
  draggable?: boolean;
  onNodeRef?: (node: Konva.Node | null) => void;
  onDragStart?: () => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: () => void;
}): React.JSX.Element {
  const resolvedWidths = resolveStrokeWidths(points, widths, fallbackWidth);
  const pointCount = Math.floor(points.length / 2);
  const segments: Array<{ points: number[]; width: number }> = [];

  if (pointCount === 1) {
    segments.push({
      points: [
        points[0] ?? 0,
        points[1] ?? 0,
        (points[0] ?? 0) + 0.1,
        points[1] ?? 0,
      ],
      width: resolvedWidths[0] ?? fallbackWidth,
    });
  } else {
    for (let i = 0; i < pointCount - 1; i++) {
      segments.push({
        points: [
          points[i * 2] ?? 0,
          points[i * 2 + 1] ?? 0,
          points[i * 2 + 2] ?? 0,
          points[i * 2 + 3] ?? 0,
        ],
        width: Math.max(
          1,
          ((resolvedWidths[i] ?? fallbackWidth) +
            (resolvedWidths[i + 1] ?? fallbackWidth)) /
            2,
        ),
      });
    }
  }

  return (
    <Group
      id={id}
      x={x}
      y={y}
      opacity={opacity}
      listening={listening}
      draggable={draggable}
      ref={(node) => onNodeRef?.(node)}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      {segments.map((segment, index) => (
        <Line
          key={index}
          points={segment.points}
          stroke={stroke}
          strokeWidth={segment.width}
          lineCap="round"
          lineJoin="round"
          perfectDrawEnabled={false}
          listening={false}
        />
      ))}
    </Group>
  );
}

/** 从 PointerEvent 计算当前笔画宽度 */
function pointerStrokeWidth(
  baseWidth: number,
  e: Konva.KonvaEventObject<PointerEvent>,
): number {
  const pressure = e.evt.pressure;
  if (
    e.evt.pointerType === 'mouse' ||
    !Number.isFinite(pressure) ||
    pressure <= 0
  ) {
    return baseWidth;
  }
  const normalized = Math.min(1, Math.max(0, pressure));
  return Math.max(1, baseWidth * (0.35 + 0.65 * normalized));
}

/** 对最近几个采样点取平均，得到平滑后的笔触点 */
function smoothBrushPoint(queue: number[]): { x: number; y: number } {
  if (queue.length < 4) {
    return { x: queue[queue.length - 2] ?? 0, y: queue[queue.length - 1] ?? 0 };
  }
  const count = Math.min(SMOOTH_SAMPLE_POINTS, Math.floor(queue.length / 2));
  let x = 0;
  let y = 0;
  for (let i = 0; i < count; i++) {
    const offset = (i + 1) * 2;
    x += queue[queue.length - offset] ?? 0;
    y += queue[queue.length - offset + 1] ?? 0;
  }
  return { x: x / count, y: y / count };
}

/** 补齐逐点宽度，兼容旧版没有 widths 的笔画 */
function resolveStrokeWidths(
  points: number[],
  widths: number[] | undefined,
  fallback: number,
): number[] {
  const count = Math.max(1, Math.floor(points.length / 2));
  return Array.from(
    { length: count },
    (_, index) => widths?.[index] ?? fallback,
  );
}

export type { BrushSettings, StudioLayer };
