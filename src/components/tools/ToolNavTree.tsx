// 星工坊 (Stellar Workshop) - 工具导航树组件
// 可折叠的树形结构, 按图片/音频工具分类展示子工具列表
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Image,
  Music,
  Crop,
  SlidersHorizontal,
  Paintbrush,
  WandSparkles,
  AudioLines,
  Equal,
  Music4,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TOOL_NAV_TREE } from '@/lib/tools-constants';
import type { ToolNavItem } from '@/types/tools';

/** Lucide 图标名称到组件的映射 */
const ICON_MAP: Record<string, LucideIcon> = {
  Image,
  Music,
  Crop,
  SlidersHorizontal,
  Paintbrush,
  WandSparkles,
  AudioLines,
  Equal,
  Music4,
  BrainCircuit,
};

/** 图标尺寸 (px) */
const ICON_SIZE = 16;

/** 单个导航项属性 */
interface NavTreeItemProps {
  /** 导航节点数据 */
  item: ToolNavItem;
  /** 当前激活路径 */
  activePath: string;
  /** 默认展开状态 */
  defaultExpanded?: boolean;
}

/** 工具导航树组件 */
export default function ToolNavTree(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 py-3 px-2" aria-label="工具导航">
      {TOOL_NAV_TREE.map((section) => (
        <NavTreeSection
          key={section.id}
          item={section}
          activePath={pathname}
          defaultExpanded
        />
      ))}
    </nav>
  );
}

/** 导航树分组节点 (可折叠) */
function NavTreeSection({
  item,
  activePath,
  defaultExpanded = false,
}: NavTreeItemProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const IconComponent = ICON_MAP[item.icon];
  const hasChildren = Boolean(item.children && item.children.length > 0);

  const isActive = activePath === item.path;
  const isChildActive = hasChildren
    ? item.children!.some(
        (child) => activePath === child.path || activePath.startsWith(child.path + '/')
      )
    : false;

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col">
      {/* 分组标题行 */}
      <button
        type="button"
        onClick={hasChildren ? handleToggle : undefined}
        className={`
          flex items-center gap-2 w-full px-3 py-2 rounded-btn text-sm
          transition-colors duration-150 text-left
          ${isActive || isChildActive
            ? 'bg-sakura-pale text-sakura-dark border-l-2 border-sakura-dark'
            : 'text-ink-light hover:bg-sakura-pale/50'
          }
        `}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        {/* 展开/折叠箭头 */}
        {hasChildren && (
          <span className="flex-shrink-0 text-ink-muted">
            {expanded ? (
              <ChevronDown size={ICON_SIZE} />
            ) : (
              <ChevronRight size={ICON_SIZE} />
            )}
          </span>
        )}

        {/* 图标 */}
        {IconComponent && (
          <IconComponent size={ICON_SIZE} className="flex-shrink-0" />
        )}

        {/* 标签 */}
        <span className="font-medium truncate">{item.label}</span>
      </button>

      {/* 子节点列表 */}
      {hasChildren && expanded && (
        <div className="ml-5 flex flex-col gap-0.5 mt-0.5">
          {item.children!.map((child) => (
            <NavTreeLeaf
              key={child.id}
              item={child}
              activePath={activePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 导航树叶子节点 (可点击跳转) */
function NavTreeLeaf({
  item,
  activePath,
}: NavTreeItemProps): React.JSX.Element {
  const IconComponent = ICON_MAP[item.icon];
  const isActive = activePath === item.path || activePath.startsWith(item.path + '/');

  return (
    <Link
      href={item.path}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-btn text-sm
        transition-colors duration-150 no-underline
        ${isActive
          ? 'bg-sakura-pale text-sakura-dark border-l-2 border-sakura-dark'
          : 'text-ink-light hover:bg-sakura-pale/50'
        }
      `}
    >
      {/* 图标 */}
      {IconComponent && (
        <IconComponent size={ICON_SIZE} className="flex-shrink-0" />
      )}

      {/* 标签 */}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
