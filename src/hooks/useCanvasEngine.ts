// Canvas 引擎 React Hook — 管理引擎生命周期, 暴露状态给组件
// 初始化/销毁引擎, 响应画布尺寸变化, 导出 layer 状态和方法
'use client';

import { useRef, useState, useEffect, useCallback, type RefObject } from 'react';
import { CanvasEngine, type Layer } from '@/engine/CanvasEngine';
import type { CanvasTool } from '@/types/tools';

/** useCanvasEngine 返回值 */
interface UseCanvasEngineReturn {
  engine: CanvasEngine | null;
  layers: Layer[];
  activeLayerIndex: number;
  setTool: (tool: CanvasTool) => void;
  setBrushSize: (size: number) => void;
  setBrushColor: (color: string) => void;
  setBrushOpacity: (opacity: number) => void;
  setActiveLayer: (index: number) => void;
  setLayerVisibility: (index: number, visible: boolean) => void;
  setLayerOpacity: (index: number, opacity: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  addLayer: (name: string) => void;
  removeLayer: (index: number) => void;
  mergeAndExport: (format?: string, quality?: number) => string;
}

/** Canvas 引擎 React Hook */
export function useCanvasEngine(
  canvasRef: RefObject<HTMLCanvasElement | null>,
): UseCanvasEngineReturn {
  const engineRef = useRef<CanvasEngine | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerIndex, setActiveLayerIndex] = useState<number>(0);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  /** 初始化引擎 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new CanvasEngine(canvas);
    engineRef.current = engine;
    setLayers(engine.getLayers());
    setActiveLayerIndex(engine.getActiveLayerIndex());

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [canvasRef]);

  /** 刷新状态 */
  const refreshState = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setLayers([...engine.getLayers()]);
    setActiveLayerIndex(engine.getActiveLayerIndex());
    setCanUndo(engine.canUndo());
    setCanRedo(engine.canRedo());
  }, []);

  /** 设置工具 */
  const setTool = useCallback(
    (tool: CanvasTool) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setTool(tool);
      refreshState();
    },
    [refreshState],
  );

  /** 设置画笔大小 */
  const setBrushSize = useCallback(
    (size: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setBrushSize(size);
    },
    [],
  );

  /** 设置画笔颜色 */
  const setBrushColor = useCallback(
    (color: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setBrushColor(color);
    },
    [],
  );

  /** 设置画笔不透明度 */
  const setBrushOpacity = useCallback(
    (opacity: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setBrushOpacity(opacity);
    },
    [],
  );

  /** 设置活跃图层 */
  const setActiveLayer = useCallback(
    (index: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setActiveLayer(index);
      refreshState();
    },
    [refreshState],
  );

  /** 设置图层可见性 */
  const setLayerVisibility = useCallback(
    (index: number, visible: boolean) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setLayerVisibility(index, visible);
      refreshState();
    },
    [refreshState],
  );

  /** 设置图层不透明度 */
  const setLayerOpacity = useCallback(
    (index: number, opacity: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setLayerOpacity(index, opacity);
      refreshState();
    },
    [refreshState],
  );

  /** 撤销 */
  const undo = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.undo();
    refreshState();
  }, [refreshState]);

  /** 重做 */
  const redo = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.redo();
    refreshState();
  }, [refreshState]);

  /** 添加图层 */
  const addLayer = useCallback(
    (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.addLayer(name);
      refreshState();
    },
    [refreshState],
  );

  /** 移除图层 */
  const removeLayer = useCallback(
    (index: number) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.removeLayer(index);
      refreshState();
    },
    [refreshState],
  );

  /** 合并导出 */
  const mergeAndExport = useCallback(
    (format: string = 'png', quality: number = 0.92): string => {
      const engine = engineRef.current;
      if (!engine) return '';
      return engine.mergeVisible(format, quality);
    },
    [],
  );

  return {
    engine: engineRef.current,
    layers,
    activeLayerIndex,
    setTool,
    setBrushSize,
    setBrushColor,
    setBrushOpacity,
    setActiveLayer,
    setLayerVisibility,
    setLayerOpacity,
    undo,
    redo,
    canUndo,
    canRedo,
    addLayer,
    removeLayer,
    mergeAndExport,
  };
}
