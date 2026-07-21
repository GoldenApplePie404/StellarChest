// 编辑器工具栏组件 - 新建/保存/预览按钮 + AI续写按钮 + 指令速查开关 + 流程图开关
// 固定在编辑器顶部，提供编辑器操作入口
'use client';

import { useCallback } from 'react';
import Button from '@/components/ui/Button';

/** EditorToolbar属性 */
interface EditorToolbarProps {
  /** 脚本是否有未保存修改 */
  hasUnsavedChanges?: boolean;
  /** 保存回调 */
  onSave?: () => void;
  /** 预览回调 */
  onPreview?: () => void;
  /** AI续写回调 */
  onAIContinue?: () => void;
  /** 指令速查面板开关回调 */
  onToggleReference?: () => void;
  /** 指令速查面板是否显示 */
  referenceVisible?: boolean;
  /** 流程图开关回调 */
  onToggleFlow?: () => void;
  /** 流程图是否显示 */
  flowVisible?: boolean;
  /** 自定义CSS类名 */
  className?: string;
}

/** 编辑器工具栏组件 */
export default function EditorToolbar({
  hasUnsavedChanges = false,
  onSave,
  onPreview,
  onAIContinue,
  onToggleReference,
  referenceVisible = false,
  onToggleFlow,
  flowVisible = false,
  className = '',
}: EditorToolbarProps): React.JSX.Element {
  /** 保存按钮点击 */
  const handleSave = useCallback(() => {
    if (onSave) onSave();
  }, [onSave]);

  /** 预览按钮点击 */
  const handlePreview = useCallback(() => {
    if (onPreview) onPreview();
  }, [onPreview]);

  /** AI续写按钮点击 */
  const handleAIContinue = useCallback(() => {
    if (onAIContinue) onAIContinue();
  }, [onAIContinue]);

  /** 指令速查开关 */
  const handleToggleReference = useCallback(() => {
    if (onToggleReference) onToggleReference();
  }, [onToggleReference]);

  /** 流程图开关 */
  const handleToggleFlow = useCallback(() => {
    if (onToggleFlow) onToggleFlow();
  }, [onToggleFlow]);

  return (
    <div
      className={`flex items-center justify-between px-4 py-2 border-b border-primary/10 bg-white ${className}`}
    >
      {/* 左侧操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 保存按钮 */}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          className={hasUnsavedChanges ? 'ring-2 ring-accent' : ''}
        >
          保存
        </Button>

        {/* 预览按钮 */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePreview}
        >
          预览运行
        </Button>

        {/* AI续写按钮 */}
        <Button
          variant="accent"
          size="sm"
          onClick={handleAIContinue}
        >
          AI续写
        </Button>
      </div>

      {/* 右侧功能开关 */}
      <div className="flex items-center gap-2">
        {/* 指令速查开关 */}
        <Button
          variant={referenceVisible ? 'primary' : 'ghost'}
          size="sm"
          onClick={handleToggleReference}
        >
          {referenceVisible ? '指令速查(已开)' : '指令速查'}
        </Button>

        {/* 流程图开关 */}
        <Button
          variant={flowVisible ? 'primary' : 'ghost'}
          size="sm"
          onClick={handleToggleFlow}
        >
          {flowVisible ? '流程图(已开)' : '流程图'}
        </Button>
      </div>
    </div>
  );
}
