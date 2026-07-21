// 素材卡片组件 - 图片缩略图+名称+分类+下载按钮
// 使用 Font Awesome 图标区分素材类型
'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { Asset } from '@/types/asset';

/** 素材分类颜色映射 */
const CATEGORY_COLORS: Record<string, string> = {
  ui_component: '#7EC8E3',
  background: '#7EC8E3',
  sprite: '#FF6B9D',
  character_sprite: '#FF6B9D',
  bgm: '#6BCB77',
  sfx: '#6BCB77',
  sound_effect: '#6BCB77',
  icon: '#FFD700',
  other: '#8E8E8E',
};

/** 素材分类 → Font Awesome 图标映射 */
const CATEGORY_ICON: Record<string, string> = {
  background: 'fa-image',
  sprite: 'fa-user',
  character_sprite: 'fa-user',
  ui_component: 'fa-cube',
  ui: 'fa-cube',
  bgm: 'fa-music',
  sfx: 'fa-volume-up',
  sound_effect: 'fa-volume-up',
  icon: 'fa-smile',
  texture: 'fa-palette',
};

/** 素材分类 → 背景色映射（图标区域） */
const CATEGORY_BG: Record<string, string> = {
  background: '#E8F4FA',
  sprite: '#FCE4EC',
  character_sprite: '#FCE4EC',
  ui_component: '#E8F0FE',
  ui: '#E8F0FE',
  bgm: '#E8F5E9',
  sfx: '#E8F5E9',
  sound_effect: '#E8F5E9',
  icon: '#FFF8E1',
  texture: '#FFF3E0',
};

/** 素材卡片属性 */
interface AssetCardProps {
  asset: Asset;
  onDownload?: (id: string) => void;
}

/** 素材卡片组件 */
export default function AssetCard({ asset, onDownload }: AssetCardProps): React.JSX.Element {
  const categoryColor = CATEGORY_COLORS[asset.category] || '#8E8E8E';
  const iconClass = CATEGORY_ICON[asset.category] || 'fa-file';
  const bgColor = CATEGORY_BG[asset.category] || '#F5F5F5';
  const assetFileUrl = asset.fileUrl || asset.url || '';
  const isImage = assetFileUrl.endsWith('.png') || assetFileUrl.endsWith('.jpg') || assetFileUrl.endsWith('.jpeg') || assetFileUrl.endsWith('.svg') || assetFileUrl.endsWith('.webp') || assetFileUrl.endsWith('.gif');

  return (
    <Card hoverable className="group">
      {/* 缩略图区域 */}
      <Link href={`/assets/${asset.id}`}>
        <div className="relative h-36 rounded-lg overflow-hidden mb-3" style={{ background: bgColor }}>
          {isImage ? (
            <img
              src={assetFileUrl}
              alt={asset.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i className={`fas ${iconClass} text-4xl opacity-40`}
                style={{ color: categoryColor }} />
            </div>
          )}
          {/* 分类标签 */}
          <span
            className="absolute top-2 left-2 px-2 py-1 rounded-btn text-xs font-bold"
            style={{ background: categoryColor, color: '#4A3045' }}
          >
            {asset.category === 'bgm' ? 'BGM' :
             asset.category === 'sfx' || asset.category === 'sound_effect' ? 'SFX' :
             asset.category === 'sprite' || asset.category === 'character_sprite' ? '立绘' :
             asset.category === 'background' ? '背景' :
             asset.category === 'icon' ? '图标' :
             asset.category === 'ui' || asset.category === 'ui_component' ? 'UI' :
             asset.category}
          </span>
        </div>
      </Link>

      {/* 素材名称 */}
      <Link href={`/assets/${asset.id}`}>
        <h3 className="text-base font-bold text-text-primary mb-1 truncate hover:text-primary transition-colors">
          {asset.name}
        </h3>
      </Link>

      {/* 素材描述 */}
      <p className="text-sm text-text-secondary mb-3 line-clamp-2">
        {asset.description || '暂无描述'}
      </p>

      {/* 标签列表 */}
      {asset.tags.length > 0 && (
        <div className="flex items-center gap-1 mb-3 overflow-hidden">
          {asset.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-btn text-xs bg-primary/5 text-primary truncate"
            >
              {tag}
            </span>
          ))}
          {asset.tags.length > 3 && (
            <span className="text-xs text-text-secondary">
              +{asset.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 底部信息行 */}
      <div className="flex items-center justify-between">
        {/* 下载次数 */}
        <span className="text-xs text-text-secondary">
          {asset.downloadCount} 次下载
        </span>
        {/* 下载按钮 */}
        {onDownload && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onDownload(asset.id)}
          >
            下载
          </Button>
        )}
      </div>
    </Card>
  );
}
