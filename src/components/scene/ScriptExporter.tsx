// 脚本导出工具 - 将场景配置转为Galgame脚本片段
'use client';

import { useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { SceneCharacter } from './SceneBuilder';

/** 脚本导出器属性 */
interface ScriptExporterProps {
  /** 是否可见 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 场景名称 */
  sceneName: string;
  /** 背景图ID */
  backgroundId: string;
  /** 角色列表 */
  characters: SceneCharacter[];
  /** 对话说话者 */
  dialogSpeaker: string;
  /** 对话文本 */
  dialogText: string;
}

/** 将场景配置导出为脚本片段 */
function generateScript(
  sceneName: string,
  backgroundId: string,
  characters: SceneCharacter[],
  dialogSpeaker: string,
  dialogText: string,
): string {
  const lines: string[] = [];

  // 场景注释
  if (sceneName.trim()) {
    lines.push(`# 场景: ${sceneName.trim()}`);
    lines.push('');
  }

  // 背景指令
  if (backgroundId) {
    lines.push(`@bg ${backgroundId}`);
  }

  // 角色登场指令
  for (const char of characters) {
    const parts: string[] = [`@perform ${char.name || char.charId}`];
    parts.push(`position=${char.position}`);
    parts.push(`scale=${char.scale.toFixed(1)}`);
    if (char.flip) {
      parts.push('flip=true');
    }
    if (char.expression) {
      parts.push(`expression=${char.expression}`);
    }
    lines.push(parts.join(' '));
  }

  // 对话文本
  if (dialogText.trim()) {
    lines.push('');
    if (dialogSpeaker.trim()) {
      lines.push(`${dialogSpeaker.trim()}: ${dialogText.trim()}`);
    } else {
      lines.push(dialogText.trim());
    }
  }

  return lines.join('\n');
}

/** 脚本导出器组件 */
export default function ScriptExporter({
  visible,
  onClose,
  sceneName,
  backgroundId,
  characters,
  dialogSpeaker,
  dialogText,
}: ScriptExporterProps): React.JSX.Element {
  /** 复制到剪贴板 */
  const handleCopy = useCallback(async () => {
    const script = generateScript(sceneName, backgroundId, characters, dialogSpeaker, dialogText);
    try {
      await navigator.clipboard.writeText(script);
    } catch {
      // 降级方案: 使用textarea复制
      const textarea = document.createElement('textarea');
      textarea.value = script;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, [sceneName, backgroundId, characters, dialogSpeaker, dialogText]);

  const scriptContent = generateScript(sceneName, backgroundId, characters, dialogSpeaker, dialogText);

  return (
    <Modal
      visible={visible}
      title="导出脚本片段"
      onClose={onClose}
      onConfirm={handleCopy}
      confirmText="复制到剪贴板"
      cancelText="关闭"
      width="max-w-2xl"
    >
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">
          以下是当前场景配置导出的Gal脚本片段，可直接复制到脚本编辑器中使用。
        </p>
        <pre
          className="bg-gray-50 rounded-btn p-4 text-sm font-mono leading-relaxed overflow-auto max-h-80 border border-primary/5"
          style={{ color: '#4A3F45' }}
        >
          {scriptContent || '（场景为空，无脚本可导出）'}
        </pre>
      </div>
    </Modal>
  );
}
