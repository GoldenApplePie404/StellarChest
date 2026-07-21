// 快捷键参考面板 -- 深色主题浮动面板
'use client';

import DraggablePanel from '@/components/ui/DraggablePanel';

interface ShortcutEntry {
  keys: string;
  action: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Ctrl+S', action: '保存文件' },
  { keys: 'Ctrl+Enter', action: '预览' },
  { keys: 'Ctrl+I', action: '切换指令速查手册' },
  { keys: 'Ctrl+Space', action: '切换 AI 助手' },
  { keys: 'Ctrl+Shift+A', action: 'AI 续写' },
  { keys: 'Ctrl+Shift+E', action: '文件资源管理器' },
  { keys: 'Ctrl+Shift+F', action: '搜索' },
  { keys: 'Ctrl+Shift+G', action: '流程图' },
  { keys: 'Ctrl+?', action: '切换快捷键手册' },
  { keys: 'Ctrl+C', action: '复制文件' },
  { keys: 'Ctrl+X', action: '剪切文件' },
  { keys: 'Ctrl+V', action: '粘贴文件' },
  { keys: 'Delete', action: '删除文件' },
  { keys: 'F2', action: '重命名文件' },
  { keys: 'Ctrl+Z', action: '撤销' },
  { keys: 'Ctrl+Shift+Z', action: '重做' },
  { keys: 'Ctrl+B', action: '插入 @bg' },
  { keys: 'Ctrl+D', action: '插入对话模板' },
];

export default function ShortcutReference(): React.JSX.Element {
  return (
    <DraggablePanel
      title="快捷键手册 (Ctrl+?)"
      defaultX={760}
      defaultY={60}
      defaultWidth={380}
      defaultHeight={440}>
      <div className="space-y-1">
        {SHORTCUTS.map((shortcut) => (
          <div
            key={shortcut.keys}
            className="flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Key badge */}
            <span
              className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold font-mono text-center min-w-[90px]"
              style={{
                background: 'rgba(255,155,181,0.12)',
                color: '#FF9BB5',
                border: '1px solid rgba(255,155,181,0.15)',
              }}>
              {shortcut.keys}
            </span>
            {/* Action description */}
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {shortcut.action}
            </span>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-3 pt-2 text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
        按 Ctrl+? 切换此面板
      </div>
    </DraggablePanel>
  );
}
