'use client';

import Link from 'next/link';
import { useRef, type ComponentType } from 'react';
import { Wrench, Package, Pen, Sparkles, Gamepad2, MessageCircle } from 'lucide-react';

type IconType = ComponentType<{ size?: number; strokeWidth?: number; color?: string; className?: string }>;

// 图标在客户端组件内解析，避免把 forwardRef 对象从 Server Component 传入 Client Component
const ICON_MAP: Record<string, IconType> = {
  Wrench,
  Package,
  Pen,
  Sparkles,
  Gamepad2,
  MessageCircle,
};

type ModuleCardProps = {
  title: string;
  titleCn: string;
  desc: string;
  href: string;
  /** tailwind gradient stops e.g. "from-sakura to-sakura-light" */
  color: string;
  /** icon name key, resolved via ICON_MAP */
  icon: string;
};

export default function ModuleCard({ title, titleCn, desc, href, color, icon }: ModuleCardProps) {
  const Icon = ICON_MAP[icon] ?? Wrench;
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mx', `${x}%`);
    el.style.setProperty('--my', `${y}%`);
    // 轻微 3D 倾斜，营造磁性悬浮感
    el.style.setProperty('--rx', `${(y - 50) / 7}deg`);
    el.style.setProperty('--ry', `${(50 - x) / 7}deg`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <Link href={href} className="group block card-stagger" style={{ perspective: '900px' }}>
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="module-card relative p-6 rounded-2xl h-full will-change-transform"
        style={{
          '--rx': '0deg',
          '--ry': '0deg',
          transform: 'rotateX(var(--rx)) rotateY(var(--ry))',
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(145deg, #FFFFFF 0%, #FFF5F9 50%, #F2EDF9 100%)',
          border: '1px solid rgba(255,126,179,0.1)',
          boxShadow: '0 2px 8px rgba(255,126,179,0.08)',
          transition: 'transform 0.3s var(--ease-out), box-shadow 0.4s ease, border-color 0.4s ease',
        } as React.CSSProperties}
      >
        {/* 光标跟随的高光 */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(240px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.6), transparent 60%)' }}
        />
        {/* 悬浮渐变晕染 */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'linear-gradient(145deg, rgba(255,126,179,0.05) 0%, rgba(200,162,232,0.08) 100%)' }}
        />
        {/* 顶部彩色线 */}
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${color} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
        {/* 高光扫过 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="module-shine absolute top-0 bottom-0 -left-1/2 w-1/2 skew-x-12" />
        </div>

        <div className="relative z-10" style={{ transform: 'translateZ(24px)' }}>
          {/* 图标 */}
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1`}
            style={{ boxShadow: '0 4px 16px rgba(255,126,179,0.18)' }}>
            <Icon size={24} strokeWidth={2} color="#4A3045" />
          </div>

          <h3 className="text-lg font-bold mb-1 transition-colors duration-300 group-hover:[color:var(--sakura)]"
            style={{ fontFamily: 'var(--font-zen-maru)', color: 'var(--ink)' }}>
            {title}
          </h3>
          <p className="text-xs mb-2 opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
            {titleCn}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-light)' }}>
            {desc}
          </p>

          {/* 悬浮下划线 */}
          <div className="mt-5 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded"
            style={{ background: 'linear-gradient(90deg, var(--sakura), var(--lavender))' }} />
        </div>
      </div>
    </Link>
  );
}
