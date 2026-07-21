// 素材详情页 - 显示素材信息+下载按钮+图片缩放查看/音频在线播放
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import ImageViewer from '@/components/asset/ImageViewer';
import AudioPlayer from '@/components/asset/AudioPlayer';
import { ASSET_CATEGORY_LABELS } from '@/lib/config';
import type { Asset } from '@/types/asset';
import type { ApiResponse } from '@/types/api';

/** 素材分类颜色映射 */
const CATEGORY_COLORS: Record<string, string> = {
  ui_component: '#7EC8E3',
  texture: '#FFE66D',
  sound_effect: '#6BCB77',
  character_sprite: '#FF6B9D',
  background: '#7EC8E3',
  other: '#8E8E8E',
};

/** 判断是否为图片类型 */
function isImageAsset(category: string, type?: string): boolean {
  if (type && type.startsWith('image/')) return true;
  return ['ui_component', 'texture', 'character_sprite', 'background', 'icon', 'sprite', 'ui'].includes(category);
}

/** 判断是否为音频类型 */
function isAudioAsset(category: string, type?: string): boolean {
  if (type && type.startsWith('audio/')) return true;
  return ['sound_effect', 'bgm', 'sfx'].includes(category);
}

/** 素材详情页组件 */
export default function AssetDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [showViewer, setShowViewer] = useState(false);

  const isImage = asset ? isImageAsset(asset.category, asset.type) : false;
  const isAudio = asset ? isAudioAsset(asset.category, asset.type) : false;

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('galgame_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const loadAsset = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<Asset> = await response.json();
      if (result.code === 200 && result.data) {
        setAsset(result.data);
      } else {
        throw new Error(result.message || '获取素材详情失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取素材详情失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    loadAsset();
  }, [loadAsset]);

  const handleDownload = async (): Promise<void> => {
    if (!asset) return;
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = asset.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToastMessage('素材下载成功');
        setToastType('success');
      } else {
        throw new Error('下载失败');
      }
    } catch {
      setToastMessage('下载失败，请稍后重试');
      setToastType('error');
    }
  };

  const handleBack = (): void => {
    router.push('/assets');
  };

  return (
    <div>
      <main className="max-w-4xl mx-auto p-8">
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          ← 返回素材库
        </Button>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="text-text-secondary">加载中...</span>
          </div>
        )}

        {error && !asset && (
          <Card className="text-center py-10">
            <p className="text-error mb-4">{error}</p>
            <Button variant="primary" size="sm" onClick={loadAsset}>重试</Button>
          </Card>
        )}

        {asset && (
          <div className="space-y-6">
            {/* 主卡片 */}
            <Card className="p-6">
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* 预览区域 */}
                <div
                  className={`w-full md:w-72 h-56 rounded-lg overflow-hidden bg-primary/5 shrink-0 ${isImage ? 'cursor-pointer group' : ''}`}
                  onClick={isImage ? () => setShowViewer(true) : undefined}
                >
                  {isImage ? (
                    <div className="relative w-full h-full">
                      <img
                        src={asset.url || asset.thumbnailUrl || ''}
                        alt={asset.name}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* 查看大图浮层提示 */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <span className="text-white text-sm font-medium flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          查看大图
                        </span>
                      </div>
                    </div>
                  ) : isAudio ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <AudioPlayer src={asset.url || ''} title={asset.name} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={CATEGORY_COLORS[asset.category] || '#8E8E8E'} strokeWidth="1.5" className="opacity-30">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* 素材信息 */}
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-3 py-1 rounded-btn text-xs font-medium text-ink mb-3"
                    style={{ background: CATEGORY_COLORS[asset.category] || '#8E8E8E' }}>
                    {ASSET_CATEGORY_LABELS[asset.category] || asset.category}
                  </span>
                  <h1 className="text-xl font-bold text-text-primary mb-2">{asset.name}</h1>
                  <p className="text-sm text-text-secondary mb-4">{asset.description || '暂无描述'}</p>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {asset.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded-btn text-xs bg-primary/5 text-primary">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                    <span>
                      授权类型:
                      <span className="ml-1 font-medium text-text-primary">{asset.licenseType}</span>
                    </span>
                    <span>
                      下载次数:
                      <span className="ml-1 font-medium text-text-primary">{asset.downloadCount}</span>
                    </span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="mt-6 pt-4 border-t border-primary/10 flex items-center gap-3 flex-wrap">
                    <Button variant="primary" size="md" onClick={handleDownload}>
                      下载素材
                    </Button>
                    <Button variant="ghost" size="md" onClick={handleBack}>
                      返回素材库
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* 如果为音频，额外展示完整播放器 */}
            {isAudio && (
              <Card className="p-6">
                <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF7EB3" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  在线试听
                </h3>
                <AudioPlayer src={asset.url || ''} title={asset.name} />
              </Card>
            )}
          </div>
        )}
      </main>

      {/* 图片查看器 */}
      {asset && isImage && (
        <ImageViewer
          src={asset.url || asset.thumbnailUrl || ''}
          alt={asset.name}
          visible={showViewer}
          onClose={() => setShowViewer(false)}
        />
      )}

      {/* Toast 通知 */}
      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
}
