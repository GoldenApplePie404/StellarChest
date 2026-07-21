// VS Code-style status bar - bottom info bar
'use client';

import { Circle, Sparkles } from 'lucide-react';

interface StatusBarProps {
  language: string;
  cursorLine: number;
  cursorColumn: number;
  hasChanges: boolean;
  wordCount: number;
  aiReady: boolean;
  onToggleAI: () => void;
}

export default function StatusBar({
  language, cursorLine, cursorColumn, hasChanges, wordCount, aiReady, onToggleAI,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-3 h-6 text-xs flex-shrink-0 select-none"
      style={{ background: '#16161D', borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
      {/* Left */}
      <div className="flex items-center gap-3">
        <span>Ln {cursorLine}, Col {cursorColumn}</span>
        <span>{wordCount} words</span>
        {hasChanges && (
          <span className="flex items-center gap-1" style={{ color: '#FFD700' }}>
            <Circle size={8} fill="#FFD700" color="transparent" /> 未保存
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <span>{language === 'galgameScript' ? 'galgameScript' : language}</span>
        <button onClick={onToggleAI} className="flex items-center gap-1 hover:text-white transition-colors"
          style={{ color: aiReady ? '#98E8C8' : undefined }}>
          <Sparkles size={10} />
          <span>星灵 {aiReady ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
}
