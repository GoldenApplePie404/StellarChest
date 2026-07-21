// 星灵 · 品牌图标组件
// 设计：主四角星（星）+ 右上小星（灵），填充品牌渐变 樱粉(#FF9BB5)→薰衣草(#C5B4E3)
// 支持 variant: 'gradient'（默认，自含渐变，可独立作为 logo）| 'white'（用于渐变底卡片上）

import { useId, type SVGProps } from 'react';

type StellarIconProps = {
  /** 像素尺寸（正方形），默认 24 */
  size?: number;
  /** 渲染变体：渐变填充 或 纯白（叠在渐变底上） */
  variant?: 'gradient' | 'white';
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>;

export default function StellarIcon({
  size = 24,
  variant = 'gradient',
  className,
  ...rest
}: StellarIconProps): React.JSX.Element {
  const gid = useId().replace(/:/g, '');
  const fill = variant === 'white' ? '#FFFFFF' : `url(#${gid})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF9BB5" />
          <stop offset="100%" stopColor="#C5B4E3" />
        </linearGradient>
      </defs>

      {/* 主星（星） */}
      <path
        d="M14 3 C15.5 11 21 16.5 29 16 C21 15.5 15.5 21 14 29 C12.5 21 7 15.5 3 16 C7 16.5 12.5 11 14 3 Z"
        fill={fill}
      />
      {/* 伴生小星（灵） */}
      <path
        d="M23.5 4 C24.2 6.8 25.2 7.8 28 8.5 C25.2 9.2 24.2 10.2 23.5 13 C22.8 10.2 21.8 9.2 19 8.5 C21.8 7.8 22.8 6.8 23.5 4 Z"
        fill={fill}
        opacity={variant === 'white' ? 0.85 : 0.6}
      />
    </svg>
  );
}
