// 可视化流程图组件 - 基于ReactFlow将脚本解析为节点图
// 使用 dagre 自动布局，支持 @chapter/@label/@choice/@jump 节点与边
// 支持无效跳转检测、孤立标签检测、节点悬停提示
'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow as ReactFlowBase,
  type Node,
  type Edge,
  type NodeTypes,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

// @xyflow/react 12.x has JSX type compatibility issue with some TypeScript configs
const ReactFlow = ReactFlowBase as unknown as React.ComponentType<Record<string, unknown>>;
import { ScriptParser } from '@/engine/ScriptParser';
import type { ParsedLine } from '@/types/engine';
import type { ChoiceBlock } from '@/engine/types';

/** 流程图节点数据 */
interface FlowNodeData {
  /** 节点标签文字 */
  label: string;
  /** 节点类型标识 */
  nodeType: 'chapter' | 'label' | 'start' | 'end' | 'choice' | 'free';
  /** 对应脚本行号 */
  lineIndex: number;
  /** 内容预览（悬停提示用） */
  contentPreview?: string;
}

/** FlowChartView属性 */
interface FlowChartViewProps {
  /** 脚本文本内容 */
  scriptText: string;
  /** 节点点击回调（定位到编辑器行号） */
  onNodeClick?: (lineIndex: number) => void;
  /** 自定义CSS类名 */
  className?: string;
}

/** 节点颜色映射 */
const NODE_COLOR_MAP: Record<string, string> = {
  chapter: '#FFE66D',
  label: '#7EC8E3',
  start: '#6BCB77',
  end: '#FF6B6B',
  choice: '#C8A2E8',
  free: '#8E8E8E',
};

/** 节点默认尺寸（dagre 布局用） */
const NODE_DEFAULT_WIDTH = 160;
const NODE_DEFAULT_HEIGHT = 50;

/** 自定义节点组件 */
function CustomFlowNode({ data }: { data: FlowNodeData }): React.JSX.Element {
  const bgColor = NODE_COLOR_MAP[data.nodeType] || '#7EC8E3';
  const isChapter = data.nodeType === 'chapter';
  const isFree = data.nodeType === 'free';

  return (
    <div
      className="px-3 py-2 rounded-lg text-xs font-medium shadow-soft border border-white/10"
      style={{
        background: bgColor,
        color: isChapter || isFree ? '#2D2D2D' : '#FFFFFF',
        minWidth: 120,
        textAlign: 'center',
      }}
    >
      {/* 连接点：ReactFlow 边需挂载到节点 Handle 上，缺失会导致 #008 错误并使页面崩溃 */}
      <Handle type="target" position={Position.Top} />
      <div className="font-bold truncate max-w-[140px]" title={data.label}>
        {data.nodeType === 'start' && '▶ '}
        {data.nodeType === 'choice' && '◇ '}
        {data.nodeType === 'free' && '○ '}
        {data.label}
      </div>
      <div className="text-[10px] opacity-70">行 {data.lineIndex + 1}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

/** 自定义节点类型注册 */
const nodeTypes: NodeTypes = {
  customNode: CustomFlowNode,
};

/**
 * 构建 dagre 有向图并计算节点位置
 */
function layoutWithDagre(
  nodes: { id: string; width: number; height: number }[],
  edges: { source: string; target: string }[],
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40, marginx: 40, marginy: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    const dagreNode = g.node(node.id);
    if (dagreNode) {
      positions.set(node.id, {
        x: dagreNode.x - node.width / 2,
        y: dagreNode.y - node.height / 2,
      });
    }
  }
  return positions;
}

/**
 * 从脚本行中提取 @jump 的目标标签名
 */
function extractJumpTarget(line: ParsedLine): string {
  if (line.type === 'instruction' && line.instruction) {
    const inst = line.instruction;
    if (inst.name === 'jump') {
      return (inst.params['label'] as string) || (inst.params['target'] as string) || '';
    }
  }
  return '';
}

/**
 * 从脚本行中提取 @jump 附近的内容预览（用于 tooltip）
 */
function extractContentPreview(lines: ParsedLine[], lineIndex: number): string {
  // 向前搜索最近的非指令、非空行作为上下文
  for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
    const l = lines[i];
    if (!l) continue;
    if (l.type === 'dialog' || l.type === 'narration') {
      const text = l.content || '';
      return text.length > 40 ? text.slice(0, 40) + '...' : text;
    }
  }
  return '';
}

/** 可视化流程图组件 */
export default function FlowChartView({
  scriptText,
  onNodeClick,
  className = '',
}: FlowChartViewProps): React.JSX.Element {
  // 悬停状态
  const [hoveredNode, setHoveredNode] = useState<{ id: string; data: FlowNodeData } | null>(null);

  /** 解析脚本为节点和边 */
  const { nodes, edges } = useMemo(() => {
    const parser = new ScriptParser();
    const lines = parser.parse(scriptText);
    const labelMap = parser.getLabelMap();
    const chapterMap = parser.getChapterMap();
    const choiceBlocks = parser.getChoiceBlocks();

    // ---- Step 1: 收集所有被引用的标签名 ----
    const referencedLabels = new Set<string>();

    for (const line of lines) {
      if (line.type === 'instruction' && line.instruction) {
        const inst = line.instruction;
        if (inst.name === 'jump') {
          const target = extractJumpTarget(line);
          if (target) referencedLabels.add(target);
        }
      }
    }

    // 同时从 @choice 块中收集
    choiceBlocks.forEach((block) => {
      for (const opt of block.options) {
        if (opt.jumpTarget) referencedLabels.add(opt.jumpTarget);
      }
    });

    // ---- Step 2: 构建 dagre 图节点列表 ----
    interface DagreNodeDef {
      id: string;
      width: number;
      height: number;
    }

    interface DagreEdgeDef {
      source: string;
      target: string;
    }

    const dagreNodes: DagreNodeDef[] = [];
    const dagreEdges: DagreEdgeDef[] = [];

    // ---- Step 3: 无效跳转检测 ----
    const invalidJumps: { sourceId: string; targetLabel: string; lineIndex: number }[] = [];

    // 存储节点元数据 (id -> metadata for ReactFlow node construction)
    const nodeMetaMap = new Map<string, {
      label: string;
      nodeType: FlowNodeData['nodeType'];
      lineIndex: number;
      contentPreview?: string;
    }>();

    // ---- 添加 start 节点 ----
    const startId = 'start';
    nodeMetaMap.set(startId, { label: '脚本开始', nodeType: 'start', lineIndex: 0 });
    dagreNodes.push({ id: startId, width: NODE_DEFAULT_WIDTH, height: NODE_DEFAULT_HEIGHT });

    let previousNodeId: string = startId;
    let firstChapterId: string | null = null;

    // ---- 添加 @chapter 节点 ----
    chapterMap.forEach((lineIndex, chapterName) => {
      const id = `chapter_${chapterName}`;
      nodeMetaMap.set(id, {
        label: `章节: ${chapterName}`,
        nodeType: 'chapter',
        lineIndex,
      });
      dagreNodes.push({ id, width: NODE_DEFAULT_WIDTH, height: NODE_DEFAULT_HEIGHT });

      if (!firstChapterId) {
        firstChapterId = id;
        dagreEdges.push({ source: startId, target: id });
      } else {
        // 章节间顺序连接
        dagreEdges.push({ source: previousNodeId, target: id });
      }
      previousNodeId = id;
    });

    // ---- 添加 @label 节点（含孤立标签检测） ----
    const labelNodeIds: string[] = [];
    labelMap.forEach((lineIndex, labelName) => {
      const isReferenced = referencedLabels.has(labelName);
      const id = `label_${labelName}`;
      const nodeType: FlowNodeData['nodeType'] = isReferenced ? 'label' : 'free';

      nodeMetaMap.set(id, {
        label: `标签: ${labelName}`,
        nodeType,
        lineIndex,
      });
      dagreNodes.push({ id, width: NODE_DEFAULT_WIDTH, height: NODE_DEFAULT_HEIGHT });
      labelNodeIds.push(id);

      // 连接上一个节点到当前标签
      dagreEdges.push({ source: previousNodeId, target: id });
      previousNodeId = id;
    });

    // ---- 添加 @choice 节点 ----
    const choiceNodeIds: string[] = [];
    choiceBlocks.forEach((block, startLine) => {
      const id = `choice_${startLine}`;
      const choiceLabel = `@choice (${block.options.length}选项)`;
      nodeMetaMap.set(id, {
        label: choiceLabel,
        nodeType: 'choice',
        lineIndex: startLine,
        contentPreview: block.promptText
          ? (block.promptText.length > 30 ? block.promptText.slice(0, 30) + '...' : block.promptText)
          : undefined,
      });
      dagreNodes.push({ id, width: NODE_DEFAULT_WIDTH + 20, height: NODE_DEFAULT_HEIGHT });
      choiceNodeIds.push(id);

      // 连接上一个节点到当前 choice
      dagreEdges.push({ source: previousNodeId, target: id });
      previousNodeId = id;
    });

    // ---- 处理 @jump 指令 ----
    const jumpEdgeMeta: { sourceId: string; targetLabel: string; lineIndex: number; isInvalid: boolean }[] = [];

    for (const line of lines) {
      if (line.type !== 'instruction' || !line.instruction) continue;
      const inst = line.instruction;
      if (inst.name !== 'jump') continue;

      const targetLabel = extractJumpTarget(line);
      if (!targetLabel) continue;

      // 找到最近的节点作为跳转源
      const targetNodeId = `label_${targetLabel}`;
      const jumpSourceId = `jump_src_${line.lineNumber}`;

      const preview = extractContentPreview(lines, line.lineNumber);
      const isInvalid = !labelMap.has(targetLabel);

      nodeMetaMap.set(jumpSourceId, {
        label: `@jump → ${targetLabel}`,
        nodeType: isInvalid ? 'free' : 'label',
        lineIndex: line.lineNumber,
        contentPreview: preview,
      });
      dagreNodes.push({ id: jumpSourceId, width: NODE_DEFAULT_WIDTH, height: NODE_DEFAULT_HEIGHT });

      // 连接上一个节点到 jump 源节点
      dagreEdges.push({ source: previousNodeId, target: jumpSourceId });
      previousNodeId = jumpSourceId;

      jumpEdgeMeta.push({
        sourceId: jumpSourceId,
        targetLabel,
        lineIndex: line.lineNumber,
        isInvalid,
      });

      if (isInvalid) {
        invalidJumps.push({ sourceId: jumpSourceId, targetLabel, lineIndex: line.lineNumber });
      }
    }

    // ---- 执行 dagre 布局 ----
    const positionMap = layoutWithDagre(dagreNodes, dagreEdges);

    // ---- 构建 ReactFlow 节点 ----
    const flowNodes: Node[] = [];
    const nodeIdSet = new Set<string>();

    for (const def of dagreNodes) {
      if (nodeIdSet.has(def.id)) continue;
      nodeIdSet.add(def.id);

      const meta = nodeMetaMap.get(def.id);
      if (!meta) continue;

      const pos = positionMap.get(def.id);
      flowNodes.push({
        id: def.id,
        type: 'customNode',
        position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
        data: {
          label: meta.label,
          nodeType: meta.nodeType,
          lineIndex: meta.lineIndex,
          contentPreview: meta.contentPreview,
        } satisfies FlowNodeData,
      });
    }

    // ---- 构建 ReactFlow 边 ----
    const flowEdges: Edge[] = [];
    const edgeIdSet = new Set<string>();

    // 1. dagre 布局边（顺序流）
    for (const def of dagreEdges) {
      const edgeId = `edge_seq_${def.source}_${def.target}`;
      if (edgeIdSet.has(edgeId)) continue;
      edgeIdSet.add(edgeId);

      flowEdges.push({
        id: edgeId,
        source: def.source,
        target: def.target,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        style: { stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1.5 },
        animated: false,
      });
    }

    // 2. @jump 边（含无效跳转检测）
    for (const jump of jumpEdgeMeta) {
      const targetNodeId = `label_${jump.targetLabel}`;
      const edgeId = `edge_jump_${jump.sourceId}`;
      if (edgeIdSet.has(edgeId)) continue;
      edgeIdSet.add(edgeId);

      if (jump.isInvalid) {
        // 无效跳转：红色虚线 + 动画
        flowEdges.push({
          id: edgeId,
          source: jump.sourceId,
          target: jump.sourceId, // 自环，表示跳转目标不存在
          label: '无效跳转',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#FF6B6B' },
          style: { stroke: '#FF6B6B', strokeDasharray: '5,5', strokeWidth: 2 },
          animated: true,
        });
      } else if (nodeIdSet.has(targetNodeId)) {
        // 有效跳转
        flowEdges.push({
          id: edgeId,
          source: jump.sourceId,
          target: targetNodeId,
          label: `→ ${jump.targetLabel}`,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#FF6B9D' },
          style: { stroke: '#FF6B9D', strokeWidth: 2 },
          animated: false,
        });
      }
    }

    // 3. @choice 边
    choiceBlocks.forEach((block, startLine) => {
      const sourceId = `choice_${startLine}`;
      for (let optIndex = 0; optIndex < block.options.length; optIndex++) {
        const opt = block.options[optIndex];
        if (!opt) continue;
        if (!opt.jumpTarget) continue;

        const targetNodeId = `label_${opt.jumpTarget}`;
        const edgeId = `edge_choice_${startLine}_${optIndex}`;
        if (edgeIdSet.has(edgeId)) continue;
        edgeIdSet.add(edgeId);

        const labelText = opt.text || opt.jumpTarget;
        if (nodeIdSet.has(targetNodeId)) {
          flowEdges.push({
            id: edgeId,
            source: sourceId,
            target: targetNodeId,
            label: labelText.length > 12 ? labelText.slice(0, 12) + '...' : labelText,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#FFE66D' },
            style: { stroke: '#FFE66D', strokeWidth: 1.5 },
            animated: false,
          });
        }
      }
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [scriptText]);

  /** 节点点击回调 */
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as unknown as FlowNodeData;
      if (onNodeClick && data.lineIndex !== undefined) {
        onNodeClick(data.lineIndex);
      }
    },
    [onNodeClick],
  );

  /** 悬停进入 */
  const handleNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as unknown as FlowNodeData;
      setHoveredNode({ id: node.id, data });
    },
    [],
  );

  /** 悬停离开 */
  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  return (
    <div className={`relative ${className}`} style={{ height: '100%', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#FF6B9D22" gap={20} size={1} />
        <Controls
          showInteractive={false}
          style={{
            background: 'rgba(30,30,40,0.8)',
            borderRadius: '8px',
            border: '1px solid #FF6B9D33',
          }}
        />
        <MiniMap
          position="bottom-right"
          style={{
            background: 'rgba(22,22,29,0.85)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          nodeColor={(node) => {
            const d = node.data as unknown as FlowNodeData;
            return NODE_COLOR_MAP[d.nodeType] || '#7EC8E3';
          }}
          maskColor="rgba(0,0,0,0.3)"
        />
      </ReactFlow>

      {/* 悬停提示 tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-50 pointer-events-none px-3 py-2 rounded-lg text-xs shadow-xl"
          style={{
            background: 'rgba(22,22,29,0.95)',
            border: '1px solid rgba(255,126,179,0.2)',
            color: '#E2D0F5',
            left: '50%',
            top: '8px',
            transform: 'translateX(-50%)',
            maxWidth: 260,
          }}
        >
          <div className="font-bold mb-1" style={{ color: '#FF9BB5' }}>
            {hoveredNode.data.label}
          </div>
          <div className="text-[10px] opacity-60 mb-1">
            行 {hoveredNode.data.lineIndex + 1}
          </div>
          {hoveredNode.data.contentPreview && (
            <div className="text-[10px] opacity-80 border-t pt-1 mt-1"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              {hoveredNode.data.contentPreview}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
