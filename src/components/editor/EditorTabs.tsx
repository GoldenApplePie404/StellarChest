// VS Code-style editor tabs - horizontal tab bar for open files
'use client';

import { X, Circle } from 'lucide-react';

interface EditorTab {
  path: string;
  name: string;
  hasChanges: boolean;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTab: string;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

export default function EditorTabs({ tabs, activeTab, onTabClick, onTabClose }: EditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center overflow-x-auto flex-shrink-0"
      style={{ background: '#16161D', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 30 }}>
      {tabs.map(tab => {
        const isActive = tab.path === activeTab;
        return (
          <div
            key={tab.path}
            onClick={() => onTabClick(tab.path)}
            className="flex items-center gap-1.5 px-3 h-full cursor-pointer text-xs transition-all duration-100 select-none flex-shrink-0 border-r group"
            style={{
              color: isActive ? '#E2D0F5' : 'rgba(255,255,255,0.4)',
              background: isActive ? '#1E1E28' : 'transparent',
              borderColor: 'rgba(255,255,255,0.05)',
              borderBottom: isActive ? '2px solid #FF7EB3' : '2px solid transparent',
            }}>
            {tab.hasChanges && (
              <Circle size={8} fill="rgba(255,255,255,0.5)" color="transparent" />
            )}
            <span className="truncate max-w-[120px]">{tab.name}</span>
            <button
              onClick={e => { e.stopPropagation(); onTabClose(tab.path); }}
              className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 transition-all"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
