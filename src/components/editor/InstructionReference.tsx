// 指令速查手册 -- 深色主题浮动面板，支持点击填参插入
'use client';

import { useState, useCallback, useEffect } from 'react';
import DraggablePanel from '@/components/ui/DraggablePanel';
import { allInstructionHandlers } from '@/engine/instructions/index';
import type { InstructionCategory, InstructionHandler } from '@/types/engine';

const CATEGORY_LABELS: Record<InstructionCategory, string> = {
  narrative: '叙事',
  background: '背景与音频',
  character: '角色',
  effect: '特效',
  variable: '变量',
  gameSystem: '系统',
  webExtension: 'Web 扩展',
};

const CATEGORY_COLORS: Record<InstructionCategory, string> = {
  narrative: '#7EC8E3',
  background: '#FFD700',
  character: '#FF85AB',
  effect: '#FF6B7A',
  variable: '#98E8C8',
  gameSystem: '#7EC8E3',
  webExtension: '#C8A2E8',
};

const categories: InstructionCategory[] = [
  'narrative', 'background', 'character', 'effect',
  'variable', 'gameSystem', 'webExtension',
];

// Parsed parameter from format string
interface ParamDef {
  name: string;
  required: boolean;
  defaultValue: string;
  choices: string[];
}

// Parse a format string like "@bg <背景ID> [transition=fade]" into param definitions
function parseFormatParams(format: string): ParamDef[] {
  const params: ParamDef[] = [];

  // Match required params: <name> or <opt1|opt2>
  const requiredRegex = /<([^>]+)>/g;
  let match: RegExpExecArray | null;
  while ((match = requiredRegex.exec(format)) !== null) {
    const inner = match[1];
    if (!inner) continue;
    if (inner.includes('|')) {
      const parts = inner.split('|');
      params.push({ name: inner, required: true, defaultValue: parts[0] || '', choices: parts });
    } else {
      params.push({ name: inner, required: true, defaultValue: '', choices: [] });
    }
  }

  // Match optional params: [name=default] or [name]
  const optionalRegex = /\[(\w+)(?:=([^\]]+))?\]/g;
  while ((match = optionalRegex.exec(format)) !== null) {
    const name = match[1] || '';
    const defVal = match[2] || '';
    // Skip if already captured as required (unlikely but safe)
    if (!params.find(p => p.name === name)) {
      params.push({ name, required: false, defaultValue: defVal, choices: [] });
    }
  }

  return params;
}

// Generate the final command string from user input
function buildCommand(handler: InstructionHandler, filledParams: Record<string, string>): string {
  const parts: string[] = [];
  const required = parseFormatParams(handler.format).filter(p => p.required);

  for (const p of required) {
    const val = filledParams[p.name] || p.defaultValue || '';
    if (val) parts.push(val);
  }

  // Add optional params
  for (const p of parseFormatParams(handler.format).filter(p => !p.required)) {
    const val = filledParams[p.name];
    if (val && val !== p.defaultValue && val !== '') {
      parts.push(`${p.name}=${val}`);
    }
  }

  return `@${handler.name} ${parts.join(' ')}`.trim();
}

interface InstructionReferenceProps {
  onInsertInstruction?: (text: string) => void;
  className?: string;
}

export default function InstructionReference({
  onInsertInstruction,
  className = '',
}: InstructionReferenceProps): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<InstructionCategory | 'all'>('all');
  const [selectedHandler, setSelectedHandler] = useState<InstructionHandler | null>(null);
  const [filledParams, setFilledParams] = useState<Record<string, string>>({});
  const [generatedCommand, setGeneratedCommand] = useState('');

  const filteredHandlers = activeCategory === 'all'
    ? allInstructionHandlers
    : allInstructionHandlers.filter((h) => h.category === activeCategory);

  const handleInstructionClick = useCallback((handler: InstructionHandler) => {
    setSelectedHandler(handler);
    const params = parseFormatParams(handler.format);
    const initials: Record<string, string> = {};
    for (const p of params) {
      initials[p.name] = p.defaultValue;
    }
    setFilledParams(initials);
    setGeneratedCommand('');
  }, []);

  // Regenerate command preview when params change
  useEffect(() => {
    if (selectedHandler) {
      setGeneratedCommand(buildCommand(selectedHandler, filledParams));
    }
  }, [filledParams, selectedHandler]);

  const handleInsert = useCallback(() => {
    if (onInsertInstruction && generatedCommand) {
      onInsertInstruction(generatedCommand);
      setSelectedHandler(null);
    }
  }, [onInsertInstruction, generatedCommand]);

  const handleCloseModal = useCallback(() => {
    setSelectedHandler(null);
  }, []);

  const params = selectedHandler ? parseFormatParams(selectedHandler.format) : [];

  return (
    <DraggablePanel
      title="指令速查手册"
      defaultX={720}
      defaultY={60}
      defaultWidth={420}
      defaultHeight={480}
      className={className}>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-2">
        <button
          className="px-2.5 py-1 text-xs rounded-full font-bold transition-all"
          style={{
            background: activeCategory === 'all' ? '#FF7EB3' : 'rgba(255,255,255,0.06)',
            color: activeCategory === 'all' ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
          }}
          onClick={() => setActiveCategory('all')}>
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className="px-2.5 py-1 text-xs rounded-full font-bold transition-all"
            style={{
              background: activeCategory === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.06)',
              color: activeCategory === cat ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
            }}
            onClick={() => setActiveCategory(cat)}>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Instruction list */}
      <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 380 }}>
        {filteredHandlers.map((handler) => (
          <button
            key={handler.name}
            className="block w-full text-left p-2.5 rounded-lg transition-all group cursor-pointer"
            style={{
              background: selectedHandler?.name === handler.name
                ? 'rgba(255,126,179,0.15)'
                : 'rgba(255,255,255,0.03)',
              border: selectedHandler?.name === handler.name
                ? '1px solid rgba(255,126,179,0.3)'
                : '1px solid transparent',
            }}
            onClick={() => handleInstructionClick(handler)}
            onMouseEnter={e => {
              if (selectedHandler?.name !== handler.name) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,126,179,0.08)';
              }
            }}
            onMouseLeave={e => {
              if (selectedHandler?.name !== handler.name) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
              }
            }}>
            {/* Name + category badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: CATEGORY_COLORS[handler.category] }}>
                @{handler.name}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{
                color: 'rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.04)',
              }}>
                {CATEGORY_LABELS[handler.category]}
              </span>
            </div>
            {/* Format */}
            <div className="text-xs mt-1.5 opacity-60 group-hover:opacity-90 transition-opacity"
              style={{ color: '#E2D0F5' }}>
              {handler.format}
            </div>
            {/* Description */}
            <div className="text-xs mt-1 opacity-45" style={{ color: '#E2D0F5' }}>
              {handler.description}
            </div>
          </button>
        ))}
      </div>

      {/* Parameter input modal */}
      {selectedHandler && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={handleCloseModal}>
          <div
            className="rounded-2xl p-5 w-full max-w-sm shadow-xl animate-fade-up"
            style={{ background: '#232330', border: '1px solid rgba(255,126,179,0.15)' }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: CATEGORY_COLORS[selectedHandler.category] }}>
                  @{selectedHandler.name}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {selectedHandler.description}
                </p>
              </div>
              <button onClick={handleCloseModal}
                className="text-lg" style={{ color: 'rgba(255,255,255,0.3)' }}>
                x
              </button>
            </div>

            {/* Format preview */}
            <div className="text-xs mb-3 px-2 py-1 rounded"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)' }}>
              {selectedHandler.format}
            </div>

            {/* Parameter fields */}
            {params.length > 0 ? (
              <div className="space-y-3 mb-4">
                {params.map((p) => (
                  <div key={p.name}>
                    <label className="text-xs font-bold mb-1 block"
                      style={{ color: p.required ? '#FF85AB' : 'rgba(255,255,255,0.4)' }}>
                      {p.name}
                      {p.required ? ' *' : ' （可选）'}
                    </label>
                    {p.choices.length > 0 ? (
                      <select
                        value={filledParams[p.name] || ''}
                        onChange={e => setFilledParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg text-sm"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          outline: 'none',
                        }}>
                        {p.choices.map(c => (
                          <option key={c} value={c} style={{ background: '#1E1E28' }}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={filledParams[p.name] || ''}
                        onChange={e => setFilledParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                        placeholder={p.defaultValue || `请输入 ${p.name}...`}
                        className="w-full px-3 py-1.5 rounded-lg text-sm"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          outline: 'none',
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleInsert();
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
                该指令无需参数。
              </p>
            )}

            {/* Generated command preview */}
            <div className="mb-3 px-3 py-2 rounded-lg text-sm font-mono text-xs"
              style={{
                background: 'rgba(255,126,179,0.08)',
                color: '#FF85AB',
                border: '1px solid rgba(255,126,179,0.12)',
              }}>
              {generatedCommand || `@${selectedHandler.name}`}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleInsert}
                className="flex-1 px-4 py-2 rounded-full text-sm font-bold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #F07A9A, #FF9BB5)',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(255,155,181,0.25)',
                }}>
                插入
              </button>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-full text-sm transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.3)',
                }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </DraggablePanel>
  );
}
