// 星工坊 (Stellar Workshop) - 工具工作区统一布局
// 左侧导航树 + 右侧内容区, 全屏高度适配
'use client';

import ToolNavTree from '@/components/tools/ToolNavTree';

/** 工具工作区布局组件 */
export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className="flex h-[calc(100vh-64px)]"
      style={{ backgroundColor: '#FFFAF5' }}
    >
      {/* 左侧导航树 */}
      <aside
        className="w-64 flex-shrink-0 overflow-y-auto bg-cloud shadow-sm border-r border-lavender-pale"
        aria-label="工具导航侧栏"
      >
        <ToolNavTree />
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-y-auto bg-pearl">
        {children}
      </main>
    </div>
  );
}
