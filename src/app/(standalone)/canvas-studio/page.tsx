// 画布编辑（新版）— 全屏独立画板，不带全局导航与工具侧栏
'use client';

import dynamic from 'next/dynamic';

const CanvasStudioTool = dynamic(
  () => import('@/components/tools/image/canvas-studio/CanvasStudioTool'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-screen flex items-center justify-center text-ink-light text-sm">
        正在加载新版画板...
      </div>
    ),
  },
);

export default function CanvasStudioPage(): React.JSX.Element {
  return <CanvasStudioTool />;
}
