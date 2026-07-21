// 编辑器右侧面板 -- 四合一标签面板
// Tab1: 指令速查 / Tab2: 快捷键 / Tab3: 流程图 / Tab4: 场景搭建器
'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { BookText, Keyboard, Workflow, Images, Clapperboard, SlidersHorizontal, FileSearch } from 'lucide-react';
import FlowChartView from '@/components/editor/FlowChartView';
import InstructionInspector from '@/components/editor/InstructionInspector';
import AssetReferencePanel from '@/components/editor/AssetReferencePanel';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import { allInstructionHandlers } from '@/engine/instructions/index';
import type { InstructionCategory, InstructionHandler } from '@/types/engine';

const TABS = [
  { key: '指令速查', icon: BookText, label: '指令' },
  { key: '快捷键', icon: Keyboard, label: '快捷键' },
  { key: '流程图', icon: Workflow, label: '流程' },
  { key: '素材库', icon: Images, label: '素材' },
  { key: '引用分析', icon: FileSearch, label: '引用' },
  { key: '场景搭建器', icon: Clapperboard, label: '场景' },
  { key: '指令检查器', icon: SlidersHorizontal, label: '检查' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const CATEGORY_LABELS: Record<InstructionCategory, string> = {
  narrative: '叙事',
  background: '背景与音频',
  character: '角色',
  effect: '特效',
  variable: '变量',
  gameSystem: '系统',
  webExtension: 'Web 扩展',
};

const CATEGORY_COLORS: Record<InstructionCategory, string> = {
  narrative: '#7EC8E3',
  background: '#FFD700',
  character: '#FF85AB',
  effect: '#FF6B7A',
  variable: '#98E8C8',
  gameSystem: '#7EC8E3',
  webExtension: '#C8A2E8',
};

const categories: InstructionCategory[] = [
  'narrative', 'background', 'character', 'effect',
  'variable', 'gameSystem', 'webExtension',
];

/** 快捷键条目 */
const SHORTCUTS = [
  { keys: 'Ctrl+S', action: '保存文件' },
  { keys: 'Ctrl+Enter', action: '预览' },
  { keys: 'Ctrl+I', action: '切换指令速查手册' },
  { keys: 'Ctrl+Space', action: '切换 AI 助手' },
  { keys: 'Ctrl+Shift+A', action: 'AI 续写' },
  { keys: 'Ctrl+Shift+E', action: '文件资源管理器' },
  { keys: 'Ctrl+Shift+F', action: '搜索' },
  { keys: 'Ctrl+Shift+G', action: '流程图' },
  { keys: 'Ctrl+?', action: '切换快捷键手册' },
  { keys: 'Ctrl+C', action: '复制文件' },
  { keys: 'Ctrl+X', action: '剪切文件' },
  { keys: 'Ctrl+V', action: '粘贴文件' },
  { keys: 'Delete', action: '删除文件' },
  { keys: 'F2', action: '重命名文件' },
  { keys: 'Ctrl+Z', action: '撤销' },
  { keys: 'Ctrl+Shift+Z', action: '重做' },
  { keys: 'Ctrl+B', action: '插入 @bg' },
  { keys: 'Ctrl+D', action: '插入对话模板' },
];

/** 惰性加载场景搭建器 */
const LazySceneBuilder = dynamic(
  () => import('@/components/scene/SceneBuilder'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin w-6 h-6 border-2 rounded-full"
          style={{ borderColor: 'rgba(255,155,181,0.2)', borderTopColor: '#FF9BB5' }} />
      </div>
    ),
  }
);

interface RightPanelProps {
  scriptText: string;
  projectId: string;
  onNodeClick?: (lineIndex: number) => void;
  onClose: () => void;
}

export default function RightPanel({
  scriptText,
  projectId,
  onNodeClick,
  onClose,
}: RightPanelProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('流程图');

  return (
    <div
      className="w-[420px] flex-shrink-0 border-l flex flex-col overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#16161D' }}
    >
      {/* Header with tabs (icon + short label) */}
      <div className="flex items-stretch h-12 text-xs font-semibold border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {TABS.map(({ key, icon: Icon, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              title={key}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 transition-all relative"
              style={{
                color: active ? '#FF9BB5' : 'rgba(255,255,255,0.45)',
                background: active ? 'rgba(255,155,181,0.06)' : 'transparent',
              }}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={16} strokeWidth={2} />
              <span className="text-[10px] leading-none">{label}</span>
              {active && (
                <div
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ background: '#FF9BB5' }}
                />
              )}
            </button>
          );
        })}
        <button
          onClick={onClose}
          className="px-3 flex items-center"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          ✕
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === '指令速查' && <InstructionTabContent />}
        {activeTab === '快捷键' && <ShortcutsTabContent />}
        {activeTab === '流程图' && (
          <FlowChartView
            scriptText={scriptText}
            onNodeClick={onNodeClick}
          />
        )}
        {activeTab === '场景搭建器' && (
          <div className="h-full overflow-y-auto min-h-[500px]">
            <LazySceneBuilder />
          </div>
        )}
        {activeTab === '素材库' && (
          <AssetLibraryTab projectId={projectId} />
        )}
        {activeTab === '引用分析' && (
          <AssetReferencePanel scriptText={scriptText} projectId={projectId} />
        )}
        {activeTab === '指令检查器' && (
          <InstructionInspector scriptText={scriptText} />
        )}
      </div>
    </div>
  );
}

/** ===== 指令速查 Tab 内容 ===== */
function InstructionTabContent(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<InstructionCategory | 'all'>('all');

  const filteredHandlers = useMemo(() => {
    if (activeCategory === 'all') return allInstructionHandlers;
    return allInstructionHandlers.filter((h) => h.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          className="px-2 py-1 text-xs rounded-full font-bold transition-all"
          style={{
            background: activeCategory === 'all' ? '#FF7EB3' : 'rgba(255,255,255,0.06)',
            color: activeCategory === 'all' ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
          }}
          onClick={() => setActiveCategory('all')}>
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className="px-2 py-1 text-xs rounded-full font-bold transition-all"
            style={{
              background: activeCategory === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.06)',
              color: activeCategory === cat ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
            }}
            onClick={() => setActiveCategory(cat)}>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Instruction list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredHandlers.map((handler) => (
          <div
            key={handler.name}
            className="block w-full text-left p-2 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid transparent',
            }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: CATEGORY_COLORS[handler.category] }}>
                @{handler.name}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded"
                style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}>
                {CATEGORY_LABELS[handler.category]}
              </span>
            </div>
            <div className="text-xs mt-1 opacity-60" style={{ color: '#E2D0F5' }}>
              {handler.format}
            </div>
            <div className="text-xs mt-1 opacity-45" style={{ color: '#E2D0F5' }}>
              {handler.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ===== 快捷键 Tab 内容 ===== */
function ShortcutsTabContent(): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto p-3 space-y-1">
      {SHORTCUTS.map((shortcut) => (
        <div
          key={shortcut.keys}
          className="flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span
            className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold font-mono text-center min-w-[90px]"
            style={{
              background: 'rgba(255,155,181,0.12)',
              color: '#FF9BB5',
              border: '1px solid rgba(255,155,181,0.15)',
            }}>
            {shortcut.keys}
          </span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {shortcut.action}
          </span>
        </div>
      ))}
      <div className="mt-3 pt-2 text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
        Press Ctrl+? to toggle this panel
      </div>
    </div>
  );
}

/** ===== 素材库 Tab 内容（项目本地素材：立绘/背景/音频） ===== */
type AssetKind = 'character' | 'background' | 'audio';
interface AssetItem {
  id: string;
  projectId: string;
  kind: AssetKind;
  name: string;
  fileKey: string;
  fileUrl: string;
  createdAt: string;
}

const KIND_LABELS: Record<AssetKind, string> = {
  character: '立绘',
  background: '背景',
  audio: '音频',
};
const KIND_COLORS: Record<AssetKind, string> = {
  character: '#FF85AB',
  background: '#FFD700',
  audio: '#6BCB77',
};

/** 由素材名生成角色ID（去扩展名、空白转下划线、仅保留词字符/中文） */
function toCharId(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return base.trim().replace(/\s+/g, '_').replace(/[^\w一-龥_-]/g, '') || 'char';
}

/** 由素材名生成资源ID（去扩展名、空白转下划线、仅保留词字符/中文/连字符） */
function toAssetId(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return base.trim().replace(/\s+/g, '_').replace(/[^\w一-龥_-]/g, '') || 'asset';
}

/** 根据素材种类生成插入脚本的指令文本（使用资源ID，保持脚本简洁） */
function buildInsertText(a: AssetItem): string {
  if (a.kind === 'audio') return `@bgm ${toAssetId(a.name)}`;
  if (a.kind === 'character') return `@perform ${toCharId(a.name)}`;
  return `@bg ${toAssetId(a.name)}`;
}
function buildInsertLabel(a: AssetItem): string {
  if (a.kind === 'audio') return '插入 @bgm';
  if (a.kind === 'character') return '插入 @perform';
  return '插入 @bg';
}

function AssetLibraryTab({ projectId }: { projectId: string }): React.JSX.Element {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [kind, setKind] = useState<string>('auto');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'info' } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/assets`);
      const data = await res.json();
      if (data.code === 200 && data.data) {
        setAssets(data.data as AssetItem[]);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleUpload = useCallback(async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (kind !== 'auto') fd.append('kind', kind);
      const res = await fetch(`/api/projects/${projectId}/assets`, { method: 'POST', body: fd });
      const result = await res.json();
      if (result.code === 200 && result.data) {
        const created = result.data as AssetItem;
        setAssets((prev) => [created, ...prev]);
        setMessage({ text: `已上传：${created.name}`, type: 'info' });
      } else {
        setMessage({ text: result.message || '上传失败', type: 'error' });
      }
    } catch {
      setMessage({ text: '上传失败，请重试', type: 'error' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [uploading, kind, projectId]);

  const handleDelete = useCallback(async (assetId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/assets/${assetId}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.code === 200) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
      } else {
        setMessage({ text: result.message || '删除失败', type: 'error' });
      }
    } catch {
      setMessage({ text: '删除失败', type: 'error' });
    }
  }, [projectId]);

  /** 将资源ID注册到项目资源映射表，使 @bg/@bgm/@perform 等指令能解析到真实URL
   *  需先 GET 当前配置再合并 PUT 全量（saveProjectConfig 会把未传字段重置为默认值） */
  const registerResourceMap = useCallback(async (resId: string, url: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (data.code !== 200 || !data.data?.config) return;
      const cfg = data.data.config;
      const newMap = { ...(cfg.resourceMap || {}), [resId]: url };
      await fetch(`/api/projects/${projectId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryScript: cfg.entryScript,
          characterIds: cfg.characterIds,
          resourceMap: newMap,
          dialogStyle: cfg.dialogStyle,
          textSpeed: cfg.textSpeed,
          autoSave: cfg.autoSave,
        }),
      });
      // 通知预览实时刷新资源映射（新插入素材的 @bg/@bgm/@perform 立即可解析）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('galgame-resourcemap-updated'));
      }
    } catch {
      // 注册失败不影响插入（仅 owner 可写配置；协作者插入的 @perform 需 owner 注册）
    }
  }, [projectId]);

  const handleInsert = useCallback((a: AssetItem) => {
    const text = `\n${buildInsertText(a)}\n`;
    window.dispatchEvent(new CustomEvent('galgame-insert', { detail: { text } }));
    setMessage({ text: `已插入 ${buildInsertLabel(a)}`, type: 'info' });
    // 自动注册到项目资源映射，使引擎能通过 ID 解析 URL（静态 URL 优先，避免走 /api/tools/download 触发编译）
    const resId = a.kind === 'character' ? toCharId(a.name) : toAssetId(a.name);
    void registerResourceMap(resId, normalizeAssetUrl(a.fileUrl));
  }, [registerResourceMap]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 上传区 */}
      <div className="p-3 border-b space-y-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#E2D0F5', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="auto">自动识别</option>
            <option value="character">立绘</option>
            <option value="background">背景</option>
            <option value="audio">音频</option>
          </select>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: uploading ? 'rgba(255,255,255,0.06)' : '#FF7EB3',
              color: uploading ? 'rgba(255,255,255,0.4)' : '#FFF',
            }}
          >
            {uploading ? '上传中...' : '上传素材'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
        </div>
        {message && (
          <div
            className="text-xs px-2 py-1 rounded"
            style={{
              color: message.type === 'error' ? '#FF6B9D' : 'rgba(255,255,255,0.6)',
              background: message.type === 'error' ? 'rgba(255,107,157,0.1)' : 'rgba(255,255,255,0.04)',
            }}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>加载中...</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            暂无素材，上传立绘 / 背景 / 音频
          </div>
        ) : (
          assets.map((a) => (
            <div
              key={a.id}
              className="p-2 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid transparent' }}
            >
              {/* 预览 */}
              <div
                className="w-full h-24 rounded-md overflow-hidden mb-2 flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.25)' }}
              >
                {a.kind === 'audio' ? (
                  <audio controls src={normalizeAssetUrl(a.fileUrl)} className="w-full px-2">
                    您的浏览器不支持音频播放
                  </audio>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={normalizeAssetUrl(a.fileUrl)} alt={a.name} className="w-full h-full object-contain" />
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                  style={{ background: KIND_COLORS[a.kind] + '22', color: KIND_COLORS[a.kind] }}
                >
                  {KIND_LABELS[a.kind]}
                </span>
                <span className="text-xs truncate flex-1" style={{ color: '#E2D0F5' }}>{a.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleInsert(a)}
                  className="flex-1 px-2 py-1 rounded text-xs font-bold transition-all"
                  style={{ background: 'rgba(255,126,179,0.18)', color: '#FF9BB5' }}
                >
                  {buildInsertLabel(a)}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="w-7 h-7 rounded flex items-center justify-center text-xs transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#FF6B9D' }}
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
