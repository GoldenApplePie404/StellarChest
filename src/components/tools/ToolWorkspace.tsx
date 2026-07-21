// 星工坊 (Stellar Workshop) - 工具工作区容器组件
// 统一的工具操作区域, 包含面包屑标题栏、内容插槽和拖放上传区域
'use client';

import { useState, useCallback, useRef, type DragEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Upload } from 'lucide-react';

/** ToolWorkspace 组件属性 */
interface ToolWorkspaceProps {
  /** 工具标题 */
  title: string;
  /** 标题旁的图标组件 */
  icon: LucideIcon;
  /** 子内容 */
  children: React.ReactNode;
  /** 额外的 CSS 类名 */
  className?: string;
  /** 文件拖放回调 (可选) */
  onFilesDrop?: (files: File[]) => void;
  /** 接受的 MIME 类型 (可选, 如 "image/*") */
  acceptMime?: string;
}

/** 工具工作区容器组件 */
export default function ToolWorkspace({
  title,
  icon: IconComponent,
  children,
  className = '',
  onFilesDrop,
  acceptMime,
}: ToolWorkspaceProps): React.JSX.Element {
  /** 拖放悬停状态 */
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  /** 拖放计数器 (处理子元素冒泡) */
  const dragCounter = useRef<number>(0);

  /** 处理拖入 */
  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true);
      }
    },
    []
  );

  /** 处理拖离 */
  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragOver(false);
      }
    },
    []
  );

  /** 处理拖放悬停 (阻止默认行为以允许放置) */
  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  /** 处理文件放置 */
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;

      if (onFilesDrop && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        onFilesDrop(files);
      }
    },
    [onFilesDrop]
  );

  return (
    <div
      className={`flex flex-col h-full ${className}`}
      onDragEnter={onFilesDrop ? handleDragEnter : undefined}
      onDragLeave={onFilesDrop ? handleDragLeave : undefined}
      onDragOver={onFilesDrop ? handleDragOver : undefined}
      onDrop={onFilesDrop ? handleDrop : undefined}
    >
      {/* 面包屑标题栏 */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-lavender-pale bg-cloud">
        <IconComponent size={22} className="text-sakura-dark flex-shrink-0" />
        <h2 className="text-lg font-semibold text-ink m-0">{title}</h2>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {children}

        {/* 拖放覆盖层 */}
        {isDragOver && (
          <div className="absolute inset-0 bg-sakura-pale/80 flex flex-col items-center justify-center gap-3 z-50 border-2 border-dashed border-sakura-dark rounded-default m-6">
            <Upload size={48} className="text-sakura-dark" />
            <p className="text-ink text-lg font-medium">拖放文件到此处</p>
            {acceptMime && (
              <p className="text-ink-light text-sm">
                支持格式: {acceptMime}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
