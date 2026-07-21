// VS Code-style activity bar - far-left vertical icon navigation
'use client';

import { Files, Search, Sparkles, GitBranch, BookOpen, Keyboard } from 'lucide-react';

interface ActivityBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  referenceVisible: boolean;
  onToggleReference: () => void;
  shortcutsVisible?: boolean;
  onToggleShortcuts?: () => void;
}

const activities = [
  { id: 'files', icon: Files, label: '文件资源管理器 (Ctrl+Shift+E)' },
  { id: 'search', icon: Search, label: '搜索 (Ctrl+Shift+F)' },
  { id: 'ref', icon: BookOpen, label: '指令速查手册 (Ctrl+I)' },
  { id: 'shortcuts', icon: Keyboard, label: '快捷键手册 (Ctrl+?)' },
  { id: 'ai', icon: Sparkles, label: 'AI 助手 (Ctrl+Space)' },
  { id: 'flow', icon: GitBranch, label: '流程图 (Ctrl+Shift+G)' },
];

export default function ActivityBar({
  activeView,
  onViewChange,
  referenceVisible,
  onToggleReference,
  shortcutsVisible = false,
  onToggleShortcuts,
}: ActivityBarProps) {
  const isRefActive = activeView === 'ref' || referenceVisible;
  const isShortcutsActive = activeView === 'shortcuts' || shortcutsVisible;

  return (
    <div className="w-12 flex flex-col items-center py-2 gap-1 flex-shrink-0"
      style={{ background: '#16161D', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {activities.map(act => {
        let isActive = activeView === act.id;
        if (act.id === 'ref') isActive = isRefActive;
        if (act.id === 'shortcuts') isActive = isShortcutsActive;

        return (
          <button
            key={act.id}
            onClick={() => {
              if (act.id === 'ref') {
                onToggleReference();
              } else if (act.id === 'shortcuts') {
                if (onToggleShortcuts) onToggleShortcuts();
              } else {
                onViewChange(isActive ? '' : act.id);
              }
            }}
            title={act.label}
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 relative group"
            style={{
              color: isActive ? '#E2D0F5' : 'rgba(255,255,255,0.65)',
              background: isActive ? 'rgba(255,126,179,0.12)' : 'transparent',
            }}>
            <act.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                style={{ background: '#FF7EB3' }} />
            )}
          </button>
        );
      })}
      <div className="flex-1" />
    </div>
  );
}
