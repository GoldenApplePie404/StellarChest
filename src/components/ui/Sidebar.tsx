// 侧边栏组件 - galgame风格侧边导航
'use client';

import Link from 'next/link';

/** 侧边栏链接数据 */
interface SidebarLink {
  label: string;
  href: string;
  iconLetter?: string;  // 使用文字代替emoji/图标
}

/** 侧边栏属性 */
interface SidebarProps {
  /** 链接列表 */
  links: SidebarLink[];
  /** 当前激活路径 */
  activePath?: string;
  /** 标题 */
  title?: string;
}

/** Galgame风格侧边栏组件 */
export default function Sidebar({ links, activePath, title }: SidebarProps): React.JSX.Element {
  return (
    <aside className="w-64 min-h-screen bg-card/50 border-r border-primary/10 p-4">
      {/* 侧边栏标题 */}
      {title && (
        <h3 className="text-sm font-bold text-primary mb-4 px-2">
          {title}
        </h3>
      )}
      {/* 导航链接列表 */}
      <nav className="space-y-1">
        {links.map((link) => {
          const isActive = activePath === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium active-pink'
                  : 'text-text-secondary hover:bg-primary/5 hover:text-primary'
              }`}
            >
              {/* 文字图标标识 */}
              {link.iconLetter && (
                <span className={`w-6 h-6 rounded-btn flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                }`}>
                  {link.iconLetter}
                </span>
              )}
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
