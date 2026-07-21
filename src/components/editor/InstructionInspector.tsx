// 指令属性检查器 —— 对标 LetsGal Studio 的「属性检查器」
// 监听 galgame-cursor 拿到当前光标行，解析 @指令 参数并以表单字段编辑，
// 改动通过 galgame-replace-line 事件写回编辑器（由 ScriptEditor 用 model.applyEdits 替换整行）。
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { InstructionCategory } from '@/types/engine';
import { allInstructionHandlers } from '@/engine/instructions/index';

/** 字段类型 */
export type FieldType = 'text' | 'number' | 'boolean' | 'select';

/** 字段定义 */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

/** 指令分类配色（与 RightPanel 一致） */
export const CATEGORY_COLORS: Record<InstructionCategory, string> = {
  narrative: '#7EC8E3',
  background: '#FFD700',
  character: '#FF85AB',
  effect: '#FF6B7A',
  variable: '#98E8C8',
  gameSystem: '#7EC8E3',
  webExtension: '#C8A2E8',
};

/** 高频指令字段 schema：决定哪些参数用下拉/数字/开关，以及友好中文标签 */
export const INSTRUCTION_FIELDS: Record<string, FieldDef[]> = {
  bg: [
    { key: 'id', label: '背景资源', type: 'text' },
    { key: 'transition', label: '过渡方式', type: 'select', options: ['cover', 'fade', 'black', 'cut'] },
  ],
  perform: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'pose', label: '姿势', type: 'text' },
    { key: 'expression', label: '表情', type: 'text' },
    { key: 'position', label: '位置', type: 'select', options: ['left', 'right', 'center'] },
  ],
  pose: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'pose', label: '姿势', type: 'text' },
  ],
  expression: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'expression', label: '表情', type: 'text' },
  ],
  char_side: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'position', label: '位置', type: 'select', options: ['left', 'right', 'center'] },
  ],
  char_scale: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'scale', label: '缩放倍数', type: 'number' },
  ],
  char_flip: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'direction', label: '方向', type: 'select', options: ['horizontal', 'vertical'] },
  ],
  char_rotate: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'rotation', label: '旋转角度', type: 'number' },
  ],
  char_fade: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'opacity', label: '透明度(0-1)', type: 'number' },
    { key: 'duration', label: '时长(ms)', type: 'number' },
  ],
  char_move: [
    { key: 'id', label: '角色ID', type: 'text' },
    { key: 'position', label: '位置', type: 'select', options: ['left', 'right', 'center'] },
    { key: 'duration', label: '时长(ms)', type: 'number' },
  ],
  bgm: [{ key: 'id', label: '音频资源', type: 'text' }],
  sfx: [{ key: 'id', label: '音效资源', type: 'text' }],
  transition: [
    { key: 'type', label: '类型', type: 'select', options: ['cover', 'fade', 'black'] },
    { key: 'duration', label: '时长(ms)', type: 'number' },
  ],
  jump: [
    { key: 'label', label: '跳转标签', type: 'text' },
    { key: 'target', label: '目标', type: 'text' },
  ],
  choice: [
    { key: 'prompt', label: '提示语', type: 'text' },
    { key: 'text', label: '文本', type: 'text' },
  ],
  set: [
    { key: 'name', label: '变量名', type: 'text' },
    { key: 'value', label: '值', type: 'text' },
  ],
  label: [{ key: 'name', label: '标签名', type: 'text' }],
  chapter: [{ key: 'name', label: '章节名', type: 'text' }],
  if: [{ key: 'name', label: '条件表达式', type: 'text' }],
  wait: [{ key: 'duration', label: '时长(ms)', type: 'number' }],
  notify: [{ key: 'text', label: '通知文本', type: 'text' }],
};

/** 解析单个参数值的类型推断（与 ScriptParser.parseParamValue 一致） */
function parseVal(valueStr: string): string | number | boolean {
  if (valueStr === 'true') return true;
  if (valueStr === 'false') return false;
  const num = Number(valueStr);
  if (!isNaN(num) && valueStr !== '') return num;
  return valueStr;
}

/** 解析单行 @指令（内联版 ScriptParser.parseInstruction，避免整脚本解析） */
export function parseSingleLine(line: string): { name: string; params: Record<string, string | number | boolean> } | null {
  const m = line.match(/^@(\w+)(?:\s+(.*))?$/);
  if (!m) return null;
  const name = m[1] || '';
  const paramsStr = m[2] || '';
  const params: Record<string, string | number | boolean> = {};
  if (paramsStr) {
    const tokens = paramsStr.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    tokens.forEach((tok, i) => {
      const clean = tok.replace(/^["']|["']$/g, '');
      const eq = clean.indexOf('=');
      if (eq > 0) {
        params[clean.slice(0, eq)] = parseVal(clean.slice(eq + 1));
      } else if (i === 0) {
        params['id'] = parseVal(clean);
        params['value'] = parseVal(clean);
      } else {
        params[`arg${i}`] = parseVal(clean);
      }
    });
  }
  return { name, params };
}

/** 由 名称+参数 重建指令行文本（保证 round-trip：裸参数还原为裸、命名参数还原为 key=value） */
export function buildLine(name: string, params: Record<string, string | number | boolean>): string {
  const parts: string[] = [`@${name}`];
  for (const k of Object.keys(params)) {
    const v = params[k];
    if (k === 'value' && params['id'] !== undefined) continue; // value 是 id 的副本，跳过
    if (k === 'id') {
      if (v === '' || v === null || v === undefined) continue;
      parts.push(String(v));
      continue;
    }
    if (k.startsWith('arg')) {
      if (v === '' || v === null || v === undefined) continue;
      parts.push(String(v));
      continue;
    }
    if (v === '' || v === null || v === undefined) continue; // 空命名参数丢弃
    parts.push(`${k}=${String(v)}`);
  }
  return parts.join(' ');
}

/** 由值推断通用字段类型 */
export function inferType(v: string | number | boolean | undefined): FieldType {
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return 'number';
  return 'text';
}

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

/** 输入框统一深色样式 */
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: '#E2D0F5',
  border: '1px solid rgba(255,255,255,0.08)',
};

/** ===== 指令属性检查器 ===== */
export default function InstructionInspector({ scriptText }: { scriptText: string }): React.JSX.Element {
  const [cursorLine, setCursorLine] = useState<number>(-1);

  // 监听光标行变化
  useEffect(() => {
    const handler = (e: Event) => {
      const line = (e as CustomEvent).detail?.line;
      if (typeof line === 'number') setCursorLine(line);
    };
    window.addEventListener('galgame-cursor', handler);
    return () => window.removeEventListener('galgame-cursor', handler);
  }, []);

  const lineText = useMemo(() => {
    if (cursorLine < 1) return '';
    const lines = scriptText.split('\n');
    return lines[cursorLine - 1] ?? '';
  }, [scriptText, cursorLine]);

  const parsed = useMemo(() => parseSingleLine(lineText.trim()), [lineText]);

  const handler = useMemo(
    () => (parsed ? allInstructionHandlers.find((h) => h.name === parsed.name) : undefined),
    [parsed],
  );
  const category = handler?.category;

  /** 写回整行 */
  const replaceLine = (text: string) => {
    if (cursorLine < 1) return;
    window.dispatchEvent(new CustomEvent('galgame-replace-line', { detail: { lineNumber: cursorLine, text } }));
  };

  /** 更新某个参数并写回 */
  const updateParam = (key: string, raw: string, type: FieldType) => {
    if (!parsed) return;
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
    replaceLine(buildLine(parsed.name, params));
  };

  const setBool = (key: string, val: boolean) => {
    if (!parsed) return;
    const params = { ...parsed.params };
    params[key] = val;
    replaceLine(buildLine(parsed.name, params));
  };

  /** 计算需要渲染的字段列表 */
  const fields = useMemo<FieldDef[]>(() => {
    if (!parsed) return [];
    const schema = INSTRUCTION_FIELDS[parsed.name] || null;
    const list: FieldDef[] = [];
    if (schema) {
      for (const f of schema) list.push(f);
      // 渲染 schema 之外的额外参数（通用字段）
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

  // 未定位到指令行
  if (cursorLine < 1) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <div className="text-3xl mb-3" style={{ color: 'rgba(255,255,255,0.15)' }}>@</div>
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          将光标移到任意 <span style={{ color: '#FF9BB5' }}>@指令</span> 行
        </div>
        <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          即可在此表单化编辑其参数
        </div>
      </div>
    );
  }

  // 非指令行
  if (!lineText.trimStart().startsWith('@')) {
    return (
      <div className="h-full overflow-y-auto p-3">
        <div className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          当前行（第 {cursorLine} 行）不是 <span style={{ color: '#FF9BB5' }}>@指令</span>
          （可能是对话 / 旁白 / 注释 / 分支选项）。指令检查器仅支持 @指令 行。
        </div>
        <div
          className="p-2 rounded-lg text-xs font-mono break-all"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#E2D0F5', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {lineText || '（空行）'}
        </div>
      </div>
    );
  }

  // 指令无法解析（畸形）
  if (!parsed) {
    return (
      <div className="h-full overflow-y-auto p-3 space-y-3">
        <div className="text-xs" style={{ color: '#FF6B9D' }}>该 @指令 格式无法解析，可直接编辑原始文本。</div>
        <textarea
          className="w-full px-2 py-1.5 rounded-lg text-xs font-mono outline-none resize-none"
          style={inputStyle}
          rows={3}
          value={lineText}
          onChange={(e) => replaceLine(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      {/* 头部：分类色点 + 指令名 + 行号 */}
      <div>
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: category ? CATEGORY_COLORS[category] : '#FF9BB5' }}
          />
          <span className="text-base font-bold" style={{ color: category ? CATEGORY_COLORS[category] : '#FF9BB5' }}>
            @{parsed.name}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)' }}>
            第 {cursorLine} 行
          </span>
        </div>
        {handler?.format && (
          <div className="text-xs mt-1 font-mono opacity-60" style={{ color: '#E2D0F5' }}>{handler.format}</div>
        )}
        {handler?.description && (
          <div className="text-xs mt-0.5 opacity-45" style={{ color: '#E2D0F5' }}>{handler.description}</div>
        )}
      </div>

      {/* 参数表单 */}
      <div className="space-y-3">
        {fields.map((f) => {
          const raw = parsed.params[f.key];
          const strVal = raw === undefined || raw === null ? '' : String(raw);
          return (
            <div key={f.key}>
              <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{f.label}</label>
              {f.type === 'select' ? (
                <select
                  className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                  value={strVal}
                  onChange={(e) => updateParam(f.key, e.target.value, 'select')}
                >
                  {f.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : f.type === 'boolean' ? (
                <button
                  onClick={() => setBool(f.key, !(raw === true))}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all"
                  style={{
                    background: raw === true ? 'rgba(152,232,200,0.18)' : 'rgba(255,255,255,0.06)',
                    color: raw === true ? '#98E8C8' : 'rgba(255,255,255,0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    className="w-8 h-4 rounded-full relative transition-colors"
                    style={{ background: raw === true ? '#98E8C8' : 'rgba(255,255,255,0.2)' }}
                  >
                    <span
                      className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                      style={{ transform: raw === true ? 'translateX(16px)' : 'translateX(2px)' }}
                    />
                  </span>
                  {raw === true ? '开启' : '关闭'}
                </button>
              ) : f.type === 'number' ? (
                <input
                  type="number"
                  className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                  value={strVal}
                  onChange={(e) => updateParam(f.key, e.target.value, 'number')}
                />
              ) : (
                <input
                  type="text"
                  className="w-full px-2 py-1.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                  value={strVal}
                  placeholder={f.key === 'id' ? '资源路径 / 角色ID' : ''}
                  onChange={(e) => updateParam(f.key, e.target.value, 'text')}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 原始文本兜底编辑 */}
      <div>
        <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>原始文本</label>
        <textarea
          className="w-full px-2 py-1.5 rounded-lg text-xs font-mono outline-none resize-none"
          style={inputStyle}
          rows={2}
          value={lineText}
          onChange={(e) => replaceLine(e.target.value)}
        />
      </div>
    </div>
  );
}
