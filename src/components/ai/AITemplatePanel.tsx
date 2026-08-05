// AI 提示词模板面板 — 选项卡式网格选择器
// 数据来自 src/engine/ai-templates.ts
'use client';

import { useState, useCallback } from 'react';
import {
  STYLE_TEMPLATES,
  EXPRESSION_PROMPTS,
  BGM_MOODS,
  PROJECT_TEMPLATES,
  TOOL_RECOMMENDATIONS,
  SYSTEM_PROMPT_PRESETS,
  type ExpressionPrompt,
  type StyleTemplate,
  type BGMMood,
  type ProjectTemplate,
  type ToolCategory,
} from '@/engine/ai-templates';

// ============================================================
// 面板 Tab 定义
// ============================================================

type PanelTab = 'style' | 'expression' | 'bgm' | 'template' | 'tools' | 'system';

const TABS: { key: PanelTab; label: string; faIcon: string }[] = [
  { key: 'style', label: '画风', faIcon: 'fa-palette' },
  { key: 'expression', label: '表情', faIcon: 'fa-face-smile' },
  { key: 'bgm', label: 'BGM', faIcon: 'fa-music' },
  { key: 'template', label: '项目模板', faIcon: 'fa-layer-group' },
  { key: 'tools', label: '工具推荐', faIcon: 'fa-screwdriver-wrench' },
  { key: 'system', label: '系统提示', faIcon: 'fa-sliders' },
];

// ============================================================
// 主组件 Props
// ============================================================

export interface AITemplatePanelProps {
  onSelect?: (content: string) => void;
  onSetSystem?: (prompt: string) => void;
}

export default function AITemplatePanel({ onSelect, onSetSystem }: AITemplatePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('style');

  const handleSelect = useCallback(
    (text: string) => { onSelect?.(text); },
    [onSelect],
  );

  const handleSetSystem = useCallback(
    (prompt: string) => { onSetSystem?.(prompt); },
    [onSetSystem],
  );

  return (
    <div>
      {/* Tab 栏 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--sakura)] text-white'
                : 'bg-[var(--sakura-pale)] text-[var(--ink-muted)] hover:bg-[var(--sakura)]/20'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={`fas ${tab.faIcon}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="overflow-y-auto space-y-3 pr-1">
        {activeTab === 'style' && <StyleTab onSelect={handleSelect} />}
        {activeTab === 'expression' && <ExpressionTab onSelect={handleSelect} />}
        {activeTab === 'bgm' && <BGMTab onSelect={handleSelect} />}
        {activeTab === 'template' && <TemplateTab onSelect={handleSelect} />}
        {activeTab === 'tools' && <ToolsTab />}
        {activeTab === 'system' && <SystemTab onSetSystem={handleSetSystem} />}
      </div>
    </div>
  );
}

// ============================================================
// Tab 子组件
// ============================================================

function StyleTab({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <p className="col-span-full text-xs text-[var(--ink-muted)]">
        <i className="fas fa-info-circle mr-1" />
        点击复制完整 positive prompt 到输入框
      </p>
      {Object.entries(STYLE_TEMPLATES).map(([key, s]: [string, StyleTemplate]) => (
        <button
          key={key}
          type="button"
          className="text-left p-3 rounded-xl bg-white/60 border border-[var(--sakura-light)]/20 hover:bg-white hover:shadow-sm transition-all"
          onClick={() => onSelect(s.basePrompt)}
          title={`negative: ${s.negativePrompt.slice(0, 80)}...`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-[var(--ink)]">{s.name}</span>
            <span className="text-[10px] text-[var(--ink-muted)] font-mono">{key}</span>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] line-clamp-2">{s.bestFor}</p>
        </button>
      ))}
    </div>
  );
}

function ExpressionTab({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--ink-muted)]">
        <i className="fas fa-info-circle mr-1" />
        点击表情生成文生图 prompt（1girl solo sprite 格式）
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {EXPRESSION_PROMPTS.map((e: ExpressionPrompt) => (
          <button
            key={e.expression}
            type="button"
            className="p-2.5 rounded-xl bg-white/60 border border-[var(--sakura-light)]/20 hover:bg-white hover:shadow-sm transition-all text-center"
            onClick={() => onSelect(`Generate a character sprite with ${e.emotion}`)}
            title={e.bestUse}
          >
            <div className="text-xs font-semibold text-[var(--ink)]">{e.label}</div>
            <div className="text-[10px] text-[var(--ink-muted)] mt-0.5">{e.expression}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BGMTab({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--ink-muted)]">
        <i className="fas fa-info-circle mr-1" />
        点击复制 AI 音乐生成 prompt
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BGM_MOODS.map((b: BGMMood) => (
          <button
            key={b.mood}
            type="button"
            className="text-left p-3 rounded-xl bg-white/60 border border-[var(--sakura-light)]/20 hover:bg-white hover:shadow-sm transition-all"
            onClick={() => onSelect(b.prompt)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-[var(--ink)]">{b.label}</span>
              <span className="text-[10px] text-[var(--ink-muted)]">{b.sunoGenre}</span>
            </div>
            <p className="text-[11px] text-[var(--ink-muted)] line-clamp-2">{b.bestFor}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TemplateTab({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--ink-muted)]">
        <i className="fas fa-info-circle mr-1" />
        点击模板生成角色设定 / 场景描述提示词
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(PROJECT_TEMPLATES).map(([key, t]: [string, ProjectTemplate]) => (
          <button
            key={key}
            type="button"
            className="text-left p-3 rounded-xl bg-white/60 border border-[var(--sakura-light)]/20 hover:bg-white hover:shadow-sm transition-all"
            onClick={() =>
              onSelect(
                `为 "${t.nameCn}" 模板生成角色设定卡。风格: ${t.defaultStyle}。场景类型: ${t.sceneTypes.join(' / ')}`,
              )
            }
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm font-semibold text-[var(--ink)]">{t.nameCn}</span>
              <span className="text-[10px] text-[var(--ink-muted)]">{t.defaultStyle}</span>
            </div>
            <p className="text-[11px] text-[var(--ink-muted)] line-clamp-2">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolsTab() {
  const cats = Object.entries(TOOL_RECOMMENDATIONS) as [string, ToolCategory][];
  return (
    <div className="space-y-5">
      <p className="text-xs text-[var(--ink-muted)]">
        <i className="fas fa-info-circle mr-1" />
        AI 工具推荐
      </p>
      {cats.map(([key, cat]: [string, ToolCategory]) => (
        <div key={key} className="space-y-2">
          <h4 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
            <i className="fas fa-star text-[var(--sakura)]" />
            {cat.title}
          </h4>
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-[var(--sakura-dark)]">
              <i className="fas fa-crown mr-1" />
              付费方案
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cat.paid.map((t) => (
                <div key={t.name} className="p-2.5 rounded-lg border-l-[3px] border-l-[var(--sakura)] bg-[var(--sakura-pale)]/30">
                  <div className="text-xs font-semibold text-[var(--ink)]">{t.name}</div>
                  <div className="text-[10px] text-[var(--ink-muted)] mt-0.5">{t.price} · {t.bestFor}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-medium text-green-700">
              <i className="fas fa-leaf mr-1" />
              免费方案
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {cat.free.map((t) => (
                <div key={t.name} className="p-2.5 rounded-lg border-l-[3px] border-l-green-400 bg-green-50/50">
                  <div className="text-xs font-semibold text-[var(--ink)]">{t.name}</div>
                  <div className="text-[10px] text-[var(--ink-muted)] mt-0.5">{t.price} · {t.bestFor}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-[var(--ink-muted)] italic whitespace-pre-wrap">{cat.guide}</p>
        </div>
      ))}
    </div>
  );
}

function SystemTab({ onSetSystem }: { onSetSystem?: (prompt: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--ink-muted)]">
        <i className="fas fa-info-circle mr-1" />
        点击设置为当前会话的系统提示词
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SYSTEM_PROMPT_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="text-left p-3 rounded-xl bg-white/60 border border-[var(--sakura-light)]/20 hover:bg-white hover:shadow-sm transition-all"
            onClick={() => onSetSystem?.(p.prompt)}
          >
            <div className="text-sm font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <i className="fas fa-sliders text-[var(--sakura)]" />
              {p.label}
            </div>
            <p className="text-[11px] text-[var(--ink-muted)] mt-1 line-clamp-2">{p.prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
