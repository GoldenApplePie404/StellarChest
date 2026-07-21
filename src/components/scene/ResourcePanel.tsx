// 资源面板组件 - 背景图和角色库选择
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Asset } from '@/types/asset';

/** 资源面板属性 */
interface ResourcePanelProps {
  /** 选择背景回调 */
  onSelectBg: (asset: Asset) => void;
  /** 拖拽角色开始回调 */
  onDragCharStart: (asset: Asset) => void;
  /** 当前选中的背景ID */
  selectedBgId?: string;
}

/** 从API获取素材列表 */
async function fetchAssets(category: string): Promise<Asset[]> {
  try {
    const response = await fetch(`/api/assets?category=${category}`);
    const result = await response.json();
    if (result.code === 200 && result.data?.items) {
      return result.data.items as Asset[];
    }
    return [];
  } catch {
    return [];
  }
}

/** 资源面板组件 */
export default function ResourcePanel({
  onSelectBg,
  onDragCharStart,
  selectedBgId,
}: ResourcePanelProps): React.JSX.Element {
  /** 当前激活的Tab: 'background' | 'character_sprite' */
  const [activeTab, setActiveTab] = useState<'background' | 'character_sprite'>('background');
  /** 背景图列表 */
  const [bgAssets, setBgAssets] = useState<Asset[]>([]);
  /** 角色素材列表 */
  const [charAssets, setCharAssets] = useState<Asset[]>([]);
  /** 加载状态 */
  const [loading, setLoading] = useState<Record<string, boolean>>({ background: false, character_sprite: false });

  /** 加载素材 */
  const loadAssets = useCallback(async (category: 'background' | 'character_sprite') => {
    setLoading(prev => ({ ...prev, [category]: true }));
    const assets = await fetchAssets(category);
    if (category === 'background') {
      setBgAssets(assets);
    } else {
      setCharAssets(assets);
    }
    setLoading(prev => ({ ...prev, [category]: false }));
  }, []);

  /** 首次加载背景图 */
  useEffect(() => {
    loadAssets('background');
  }, [loadAssets]);

  /** 切换Tab时按需加载角色素材 */
  const handleTabChange = useCallback((tab: 'background' | 'character_sprite') => {
    setActiveTab(tab);
    if (tab === 'character_sprite' && charAssets.length === 0) {
      loadAssets('character_sprite');
    }
  }, [charAssets.length, loadAssets]);

  /** 拖拽开始处理 */
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
    onDragCharStart(asset);
  }, [onDragCharStart]);

  return (
    <div
      className="rounded-lg flex flex-col overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Tab切换栏 */}
      <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button
          className={`flex-1 py-2.5 text-sm font-bold transition-all duration-200 ${
            activeTab === 'background' ? '' : 'hover:text-[#FF9BB5]'
          }`}
          style={
            activeTab === 'background'
              ? { color: '#FF9BB5', borderBottom: '2px solid #FF9BB5' }
              : { color: 'rgba(255,255,255,0.5)', borderBottom: '2px solid transparent' }
          }
          onClick={() => handleTabChange('background')}
        >
          背景图
        </button>
        <button
          className={`flex-1 py-2.5 text-sm font-bold transition-all duration-200 ${
            activeTab === 'character_sprite' ? '' : 'hover:text-[#FF9BB5]'
          }`}
          style={
            activeTab === 'character_sprite'
              ? { color: '#FF9BB5', borderBottom: '2px solid #FF9BB5' }
              : { color: 'rgba(255,255,255,0.5)', borderBottom: '2px solid transparent' }
          }
          onClick={() => handleTabChange('character_sprite')}
        >
          角色库
        </button>
      </div>

      {/* 内容区域 */}
      <div className="overflow-y-auto p-3" style={{ maxHeight: '260px' }}>
        {loading[activeTab] ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full" />
          </div>
        ) : activeTab === 'background' ? (
          /* 背景图网格 */
          <div className="grid grid-cols-2 gap-2">
            {bgAssets.map((asset) => (
              <div
                key={asset.id}
                className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 ${
                  selectedBgId === asset.id
                    ? 'border-[#FF9BB5] shadow-md'
                    : 'border-transparent hover:border-[#FF9BB5]/40'
                }`}
                onClick={() => onSelectBg(asset)}
              >
                <img
                  src={asset.url || asset.fileUrl || ''}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <span className="text-white text-xs truncate block">{asset.name}</span>
                </div>
              </div>
            ))}
            {bgAssets.length === 0 && (
              <div className="col-span-2 text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                暂无背景素材
              </div>
            )}
          </div>
        ) : (
          /* 角色库列表 */
          <div className="space-y-2">
            {charAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors duration-150 border border-transparent hover:border-[#FF9BB5]/20 hover:bg-[#FF9BB5]/10"
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
              >
                {/* 角色缩略图 */}
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <img
                    src={asset.url || asset.fileUrl || ''}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {/* 角色信息 */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#E2D0F5' }}>{asset.name}</div>
                  <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{asset.description}</div>
                </div>
                {/* 拖拽提示 */}
                <span className="text-xs" style={{ color: 'rgba(255,155,181,0.6)' }}>拖拽</span>
              </div>
            ))}
            {charAssets.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                暂无角色素材
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
