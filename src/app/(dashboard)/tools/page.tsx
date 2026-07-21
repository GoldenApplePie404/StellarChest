// 星工坊 (Stellar Workshop) - 工具首页 (欢迎引导页)
// 展示所有可用工具分组的概览卡片, 引导用户进入对应工具
import Link from 'next/link';
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
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TOOL_NAV_TREE } from '@/lib/tools-constants';

/** 图标名称到组件的映射 */
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

/** 工具首页组件 */
export default function ToolsPage(): React.JSX.Element {
  return (
    <div className="p-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink mb-2">星工坊</h1>
        <p className="text-ink-light text-sm">
          一站式图片与音频工具集 — 裁剪、滤镜、波形编辑、AI 辅助处理, 让你的 galgame 素材创作更高效
        </p>
      </div>

      {/* 工具分组卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TOOL_NAV_TREE.map((section) => (
          <ToolSectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

/** 单个工具分组卡片 */
function ToolSectionCard({
  section,
}: {
  section: (typeof TOOL_NAV_TREE)[number];
}): React.JSX.Element {
  const SectionIcon = ICON_MAP[section.icon];

  return (
    <div
      className="rounded-default p-6 border border-lavender-pale bg-cloud shadow-sm"
    >
      {/* 分组标题 */}
      <div className="flex items-center gap-3 mb-4">
        {SectionIcon && (
          <div className="w-10 h-10 rounded-full bg-sakura-pale flex items-center justify-center">
            <SectionIcon size={20} className="text-sakura-dark" />
          </div>
        )}
        <h2 className="text-lg font-semibold text-ink m-0">
          {section.label}
        </h2>
      </div>

      {/* 子工具链接列表 */}
      <div className="flex flex-col gap-1.5">
        {section.children?.map((child) => {
          const ChildIcon = ICON_MAP[child.icon];
          return (
            <Link
              key={child.id}
              href={child.path}
              className="flex items-center gap-2.5 px-3 py-2 rounded-btn text-sm
                         text-ink-light hover:bg-sakura-pale/50 hover:text-sakura-dark
                         transition-colors duration-150 no-underline group"
            >
              {ChildIcon && (
                <ChildIcon
                  size={16}
                  className="flex-shrink-0 text-ink-muted group-hover:text-sakura-dark transition-colors"
                />
              )}
              <span className="flex-1">{child.label}</span>
              <ArrowRight
                size={14}
                className="text-ink-faint group-hover:text-sakura-dark transition-colors opacity-0 group-hover:opacity-100"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
