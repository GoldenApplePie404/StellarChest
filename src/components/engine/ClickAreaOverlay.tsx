// 可点击区域覆盖层组件 - 在游戏画面上渲染可交互的矩形区域
// 由@click_area指令触发，显示半透明矩形和提示文字
// 点击指定区域后触发跳转或事件
'use client';

import { useCallback } from 'react';
import type { ClickAreaDef } from '@/engine/types';

/** ClickAreaOverlay属性 */
interface ClickAreaOverlayProps {
  /** 可点击区域定义列表 */
  areas: ClickAreaDef[];
  /** 区域点击回调（传入区域ID） */
  onAreaClick: (areaId: string) => void;
  /** 容器宽度（用于百分比坐标计算） */
  containerWidth?: number;
  /** 容器高度（用于百分比坐标计算） */
  containerHeight?: number;
  /** CSS类名 */
  className?: string;
}

/** 可点击区域覆盖层组件 */
export default function ClickAreaOverlay({
  areas,
  onAreaClick,
  containerWidth = 1280,
  containerHeight = 720,
  className = '',
}: ClickAreaOverlayProps): React.JSX.Element | null {
  /** 处理区域点击 */
  const handleAreaClick = useCallback((areaId: string) => {
    onAreaClick(areaId);
  }, [onAreaClick]);

  /** 无区域时不渲染 */
  if (areas.length === 0) return null;

  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{ zIndex: 12 }}
    >
      {areas.map((area) => {
        // 百分比坐标转像素坐标
        const leftPx = (area.x / 100) * containerWidth;
        const topPx = (area.y / 100) * containerHeight;
        const widthPx = (area.width / 100) * containerWidth;
        const heightPx = (area.height / 100) * containerHeight;

        return (
          <button
            key={area.id}
            className="absolute border-2 border-primary/50 bg-primary/5 hover:bg-primary/20 hover:border-primary
              cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50
              group"
            style={{
              left: `${leftPx}px`,
              top: `${topPx}px`,
              width: `${widthPx}px`,
              height: `${heightPx}px`,
            }}
            onClick={() => handleAreaClick(area.id)}
            title={area.hint || area.id}
          >
            {/* 提示文字（悬浮时显示） */}
            {area.hint && (
              <div className="absolute inset-0 flex items-center justify-center
                text-white/0 group-hover:text-white/90 text-sm font-medium
                transition-colors duration-150"
              >
                {area.hint}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
