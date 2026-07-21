// ============================================================
// BrowserPanel — 左侧可折叠浏览器面板
// 采样库 + 预设乐器 标签切换
// ============================================================
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Music, Folder } from 'lucide-react';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import { INSTRUMENTS } from '@/types/audio-studio';

type BrowserTab = 'samples' | 'presets';

/** 音频资源项 */
interface AssetItem {
  id: string;
  name: string;
  url: string;
  duration?: number;
}

/** 预设乐器 */
interface PresetItem {
  id: string;
  label: string;
  instrument: string;
  icon: string;
}

const PRESETS: PresetItem[] = [
  { id: 'piano', label: '钢琴', instrument: 'piano', icon: 'piano' },
  { id: 'guitar', label: '吉他', instrument: 'guitar', icon: 'guitar' },
  { id: 'bass', label: '贝斯', instrument: 'bass', icon: 'guitar' },
  { id: 'strings', label: '弦乐', instrument: 'strings', icon: 'strings' },
  { id: 'synth', label: '合成器', instrument: 'synth', icon: 'synth' },
  { id: 'drums', label: '鼓组', instrument: 'drums', icon: 'drums' },
];

interface BrowserPanelProps {
  /** 折叠状态 */
  collapsed: boolean;
  /** 切换折叠 */
  onToggleCollapse: () => void;
  /** 宽度 (px, 展开时) */
  width?: number;
}

export default function BrowserPanel({
  collapsed,
  onToggleCollapse,
  width = 200,
}: BrowserPanelProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<BrowserTab>('presets');
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const addTrack = useAudioStudioStore((s) => s.addTrack);
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);

  /** 获取音频素材列表 */
  useEffect(() => {
    if (activeTab !== 'samples') return;
    if (assets.length > 0) return;

    const fetchAssets = async () => {
      setLoadingAssets(true);
      try {
        const res = await fetch('/api/assets?category=audio');
        const data = await res.json();
        if (data.code === 200 && Array.isArray(data.data)) {
          setAssets(
            data.data.map((item: any) => ({
              id: item.id || String(Math.random()),
              name: item.name || '未命名采样',
              url: item.url || '',
              duration: item.duration,
            })),
          );
        } else {
          // 如果 API 不可用，展示空列表
          setAssets([]);
        }
      } catch {
        setAssets([]);
      }
      setLoadingAssets(false);
    };

    fetchAssets();
  }, [activeTab, assets.length]);

  /** 双击采样 — 添加到当前轨道 */
  const handleSampleDoubleClick = useCallback(
    (asset: AssetItem) => {
      // 添加一个新轨道作为采样轨道
      const trackIndex = (patterns.find((p) => p.id === activePatternId)?.tracks.length || 0) + 1;
      addTrack('synth', asset.name);
    },
    [addTrack, patterns, activePatternId],
  );

  /** 点击预设乐器 */
  const handlePresetClick = useCallback(
    (preset: PresetItem) => {
      const trackIndex = (patterns.find((p) => p.id === activePatternId)?.tracks.length || 0) + 1;
      addTrack(preset.instrument as any, preset.label);
    },
    [addTrack, patterns, activePatternId],
  );

  /** 过滤采样 */
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter((a) => a.name.toLowerCase().includes(q));
  }, [assets, searchQuery]);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-2 border-r border-lavender-pale bg-cloud/30">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-lavender-pale transition-colors"
          title="展开浏览器"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col border-r border-lavender-pale bg-cloud/30 flex-shrink-0"
      style={{ width }}
    >
      {/* 标题栏 */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-lavender-pale">
        <Folder size={12} className="text-ink-light" />
        <span className="text-xs font-medium text-ink flex-1">浏览器</span>
        <button
          onClick={onToggleCollapse}
          className="p-0.5 rounded text-ink-faint hover:text-ink hover:bg-lavender-pale transition-colors"
          title="折叠"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-lavender-pale">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-1 text-[10px] font-medium transition-colors ${
            activeTab === 'presets'
              ? 'text-sakura-dark border-b-2 border-sakura'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          预设乐器
        </button>
        <button
          onClick={() => setActiveTab('samples')}
          className={`flex-1 py-1 text-[10px] font-medium transition-colors ${
            activeTab === 'samples'
              ? 'text-sakura-dark border-b-2 border-sakura'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          采样库
        </button>
      </div>

      {/* 搜索框 (采样库) */}
      {activeTab === 'samples' && (
        <div className="px-2 py-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索采样..."
            className="w-full px-2 py-1 rounded-lg border border-lavender-pale text-[10px] text-ink bg-cloud focus:outline-none focus:border-sakura placeholder:text-ink-faint"
          />
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'presets' && (
          <div className="p-1.5 space-y-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sakura-pale/20 transition-colors text-left group"
              >
                {preset.icon === 'piano' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><line x1="6" y1="10" x2="6" y2="20"/><line x1="10" y1="10" x2="10" y2="20"/><line x1="14" y1="10" x2="14" y2="20"/><line x1="18" y1="10" x2="18" y2="20"/><line x1="22" y1="10" x2="22" y2="20"/></svg>
                ) : preset.icon === 'guitar' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 3c3-2 8 0 10 2l-5 5c0 6-4 9-4 9l-8-8s3-4 9-4l3-3z"/><path d="M8 17l-6 6"/><circle cx="14" cy="14" r="2"/></svg>
                ) : preset.icon === 'strings' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20"/><path d="M4 4c0 4 8 6 8 6s-8 2-8 6"/><path d="M20 4c0 4-8 6-8 6s8 2 8 6"/></svg>
                ) : preset.icon === 'synth' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="18" rx="2"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/><line x1="8" y1="12" x2="8" y2="7"/><line x1="16" y1="12" x2="16" y2="7"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-ink truncate">{preset.label}</div>
                  <div className="text-[9px] text-ink-faint truncate">
                    {INSTRUMENTS.find((i) => i.value === preset.instrument)?.label || preset.instrument}
                  </div>
                </div>
                <span className="text-[9px] text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity">
                  添加
                </span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'samples' && (
          <div className="p-1.5">
            {loadingAssets ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-4 h-4 border-2 border-sakura border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-[10px] text-ink-faint text-center py-4">
                {searchQuery ? '未找到匹配的采样' : '暂无音频素材'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onDoubleClick={() => handleSampleDoubleClick(asset)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-lavender-pale/30 transition-colors text-left group"
                    title={`双击 "${asset.name}" 添加到轨道`}
                  >
                    <Music size={12} className="text-ink-faint flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-ink truncate">{asset.name}</div>
                      {asset.duration && (
                        <div className="text-[8px] text-ink-faint">
                          {asset.duration.toFixed(1)}s
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity">
                      双击添加
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
