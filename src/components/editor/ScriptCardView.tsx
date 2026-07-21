// 卡片视图 —— 对标 LetsGal Studio 的「卡片编辑」视图
// 将整段脚本按行解析为可编辑卡片（指令 / 对话 / 章节 / 注释 / 空行），
// 编辑按行号写回整段文本，保证与纯文本视图共用同一份 scriptContent，互不丢失。
'use client';

import { useMemo } from 'react';
import { allInstructionHandlers } from '@/engine/instructions/index';
import {
  CATEGORY_COLORS,
  INSTRUCTION_FIELDS,
  parseSingleLine,
  buildLine,
  inferType,
  type FieldType,
  type FieldDef,
} from '@/components/editor/InstructionInspector';
import { Plus, Trash2, BookOpen, AtSign, MessageSquare, Hash } from 'lucide-react';

/** 输入框统一深色样式 */
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: '#E2D0F5',
  border: '1px solid rgba(255,255,255,0.08)',
};

/** 参数键转友好中文标签（通用兜底） */
function friendlyKey(k: string): string {
  const map: Record<string, string> = {
    id: '资源/目标',
    value: '值',
    arg1: '参数1',
    arg2: '参数2',
  };
  if (map[k]) return map[k];
  return k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

type RowType = 'instruction' | 'dialogue' | 'chapter' | 'chapterEnd' | 'comment' | 'blank';

interface Row {
  index: number;
  type: RowType;
  text: string;
}

/** 按行分类 */
function classify(lines: string[]): Row[] {
  return lines.map((text, index) => {
    const t = text.trim();
    if (t === '') return { index, type: 'blank', text };
    if (t.startsWith('//') || t.startsWith('#')) return { index, type: 'comment', text };
    if (t === '@chapter_end' || t.startsWith('@chapter_end')) return { index, type: 'chapterEnd', text };
    if (t.startsWith('@chapter')) return { index, type: 'chapter', text };
    if (t.startsWith('@')) return { index, type: 'instruction', text };
    return { index, type: 'dialogue', text };
  });
}

/** 替换指定行为新文本 */
function replaceLine(text: string, index: number, newText: string): string {
  const lines = text.split('\n');
  if (index < 0 || index >= lines.length) return text;
  lines[index] = newText;
  return lines.join('\n');
}

/** 删除指定行 */
function removeLine(text: string, index: number): string {
  const lines = text.split('\n');
  if (index < 0 || index >= lines.length) return text;
  lines.splice(index, 1);
  return lines.join('\n');
}

/** 末尾追加一行 */
function appendLine(text: string, newLine: string): string {
  const lines = text.split('\n');
  lines.push(newLine);
  return lines.join('\n');
}

const COMMON_INSTRUCTIONS = [
  'bg', 'perform', 'pose', 'expression', 'bgm', 'sfx', 'transition',
  'choice', 'set', 'label', 'jump', 'notify', 'wait',
  'char_fade', 'char_move', 'char_scale', 'char_flip', 'if',
];

interface Props {
  value: string;
  onChange: (next: string) => void;
}

export default function ScriptCardView({ value, onChange }: Props): React.JSX.Element {
  const rows = useMemo(() => classify(value.split('\n')), [value]);

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#1E1E28' }}>
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-2">
        {rows.map((row) => (
          <CardRow
            key={row.index}
            row={row}
            onReplace={(next) => onChange(replaceLine(value, row.index, next))}
            onRemove={() => onChange(removeLine(value, row.index))}
          />
        ))}

        {/* 底部插入工具栏 */}
        <div
          className="sticky bottom-0 mt-4 flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(22,22,29,0.92)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)' }}
        >
          <Plus size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>插入</span>
          <select
            className="px-2 py-1 rounded text-xs outline-none"
            style={inputStyle}
            defaultValue=""
            onChange={(e) => {
              const name = e.target.value;
              if (!name) return;
              onChange(appendLine(value, `@${name}`));
              e.target.value = '';
            }}
          >
            <option value="">+ 指令...</option>
            {COMMON_INSTRUCTIONS.map((n) => (
              <option key={n} value={n}>@{n}</option>
            ))}
          </select>
          <button
            className="px-2 py-1 rounded text-xs transition-all"
            style={inputStyle}
            onClick={() => onChange(appendLine(value, ''))}
          >
            + 对话
          </button>
        </div>
      </div>
    </div>
  );
}

/** 单行卡片 */
function CardRow({
  row,
  onReplace,
  onRemove,
}: {
  row: Row;
  onReplace: (next: string) => void;
  onRemove: () => void;
}): React.JSX.Element | null {
  if (row.type === 'blank') {
    return <div className="h-2" />;
  }

  if (row.type === 'comment') {
    return (
      <div
        className="group flex items-start gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}
      >
        <Hash size={14} className="mt-1 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
        <input
          className="flex-1 bg-transparent text-xs font-mono outline-none"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          value={row.text}
          onChange={(e) => onReplace(e.target.value)}
        />
        <RemoveBtn onRemove={onRemove} />
      </div>
    );
  }

  if (row.type === 'chapterEnd') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}
      >
        <BookOpen size={14} style={{ color: '#FFD700' }} />
        <span className="flex-1 text-xs font-semibold" style={{ color: '#FFD700' }}>章节结束</span>
        <RemoveBtn onRemove={onRemove} />
      </div>
    );
  }

  if (row.type === 'chapter') {
    const name = row.text.replace(/^@chapter\s*/, '').trim();
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}
      >
        <BookOpen size={16} className="flex-shrink-0" style={{ color: '#FFD700' }} />
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#FFD700' }}>章节</span>
        <input
          className="flex-1 px-2 py-1 rounded text-sm font-medium outline-none"
          style={inputStyle}
          value={name}
          placeholder="章节名"
          onChange={(e) => onReplace(`@chapter ${e.target.value}`)}
        />
        <RemoveBtn onRemove={onRemove} />
      </div>
    );
  }

  if (row.type === 'dialogue') {
    return (
      <div
        className="group flex items-start gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <MessageSquare size={14} className="mt-1 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
        <textarea
          className="flex-1 bg-transparent text-sm leading-relaxed outline-none resize-none"
          style={{ color: '#E2D0F5' }}
          rows={2}
          value={row.text}
          onChange={(e) => onReplace(e.target.value)}
        />
        <RemoveBtn onRemove={onRemove} />
      </div>
    );
  }

  // instruction
  return <InstructionCard row={row} onReplace={onReplace} onRemove={onRemove} />;
}

/** 指令卡片：复用 InstructionInspector 的解析与字段 schema */
function InstructionCard({
  row,
  onReplace,
  onRemove,
}: {
  row: Row;
  onReplace: (next: string) => void;
  onRemove: () => void;
}): React.JSX.Element {
  const parsed = useMemo(() => parseSingleLine(row.text.trim()), [row.text]);
  const handler = useMemo(
    () => (parsed ? allInstructionHandlers.find((h) => h.name === parsed.name) : undefined),
    [parsed],
  );
  const category = handler?.category;
  const color = category ? CATEGORY_COLORS[category] : '#FF9BB5';

  if (!parsed) {
    return (
      <div
        className="group flex items-start gap-2 px-3 py-2 rounded-lg"
        style={{ background: 'rgba(255,107,155,0.06)', border: '1px solid rgba(255,107,155,0.2)' }}
      >
        <AtSign size={14} className="mt-1 flex-shrink-0" style={{ color: '#FF6B9D' }} />
        <input
          className="flex-1 bg-transparent text-sm font-mono outline-none"
          style={{ color: '#E2D0F5' }}
          value={row.text}
          onChange={(e) => onReplace(e.target.value)}
        />
        <RemoveBtn onRemove={onRemove} />
      </div>
    );
  }

  const setParam = (key: string, raw: string, type: FieldType) => {
    const params = { ...parsed.params };
    if (raw === '') {
      if (key === 'id') params[key] = '';
      else delete params[key];
    } else if (type === 'number') {
      params[key] = raw === '' ? 0 : Number(raw);
    } else if (type === 'boolean') {
      params[key] = raw === 'true';
    } else {
      params[key] = raw;
    }
    onReplace(buildLine(parsed.name, params));
  };

  const setBool = (key: string, val: boolean) => {
    onReplace(buildLine(parsed.name, { ...parsed.params, [key]: val }));
  };

  const fields: FieldDef[] = useMemo(() => {
    const schema = INSTRUCTION_FIELDS[parsed.name] || null;
    const list: FieldDef[] = [];
    if (schema) {
      for (const f of schema) list.push(f);
      for (const k of Object.keys(parsed.params)) {
        if (k === 'value' || k === 'id') continue;
        if (schema.some((f) => f.key === k)) continue;
        list.push({ key: k, label: friendlyKey(k), type: inferType(parsed.params[k]) });
      }
    } else {
      for (const k of Object.keys(parsed.params)) {
        if (k === 'value' && parsed.params['id'] !== undefined) continue;
        list.push({
          key: k,
          label: k === 'id' ? '资源/目标' : friendlyKey(k),
          type: k === 'id' ? 'text' : inferType(parsed.params[k]),
        });
      }
    }
    return list;
  }, [parsed]);

  return (
    <div
      className="group px-3 py-2.5 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}33` }}
    >
      {/* 头部 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-sm font-bold" style={{ color }}>
          @{parsed.name}
        </span>
        {handler?.format && (
          <span className="text-[10px] font-mono opacity-50 truncate" style={{ color: '#E2D0F5' }}>{handler.format}</span>
        )}
        <div className="flex-1" />
        <RemoveBtn onRemove={onRemove} />
      </div>

      {/* 字段 */}
      {fields.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {fields.map((f) => {
            const raw = parsed.params[f.key];
            const strVal = raw === undefined || raw === null ? '' : String(raw);
            return (
              <div key={f.key}>
                <label className="block text-[11px] mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    className="w-full px-2 py-1 rounded text-xs outline-none"
                    style={inputStyle}
                    value={strVal}
                    onChange={(e) => setParam(f.key, e.target.value, 'select')}
                  >
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : f.type === 'boolean' ? (
                  <button
                    onClick={() => setBool(f.key, !(raw === true))}
                    className="flex items-center gap-2 px-2 py-1 rounded text-xs transition-all"
                    style={{
                      background: raw === true ? 'rgba(152,232,200,0.18)' : 'rgba(255,255,255,0.06)',
                      color: raw === true ? '#98E8C8' : 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      className="w-7 h-3.5 rounded-full relative transition-colors"
                      style={{ background: raw === true ? '#98E8C8' : 'rgba(255,255,255,0.2)' }}
                    >
                      <span
                        className="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform"
                        style={{ transform: raw === true ? 'translateX(14px)' : 'translateX(2px)' }}
                      />
                    </span>
                    {raw === true ? '开' : '关'}
                  </button>
                ) : f.type === 'number' ? (
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded text-xs outline-none"
                    style={inputStyle}
                    value={strVal}
                    onChange={(e) => setParam(f.key, e.target.value, 'number')}
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full px-2 py-1 rounded text-xs outline-none"
                    style={inputStyle}
                    value={strVal}
                    placeholder={f.key === 'id' ? '资源/角色ID' : ''}
                    onChange={(e) => setParam(f.key, e.target.value, 'text')}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <input
          className="w-full px-2 py-1 rounded text-xs font-mono outline-none"
          style={inputStyle}
          value={row.text}
          onChange={(e) => onReplace(e.target.value)}
        />
      )}
    </div>
  );
}

/** 删除按钮 */
function RemoveBtn({ onRemove }: { onRemove: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onRemove}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded flex-shrink-0"
      style={{ color: 'rgba(255,255,255,0.35)' }}
      title="删除该行"
    >
      <Trash2 size={13} />
    </button>
  );
}
