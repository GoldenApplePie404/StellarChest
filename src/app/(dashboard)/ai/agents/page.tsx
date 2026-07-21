// AI Agent 编排页面 - 左右布局：左=Agent 列表 + 新增；右=选中 Agent 编辑（角色 / 模型 / 工具集）
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import type { AIAgentToolset } from '@/types/ai';

interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  toolset: string; // JSON 字符串
  createdAt: string;
}
interface NamedItem { id: string; name: string; }
interface PromptItem { id: string; title: string; }

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('galgame_token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const DEFAULT_ROLE = '你是一个乐于助人的 AI 助手，擅长 galgame 创作相关任务。';

/** 新建 Agent 快速模板（点击预填名称与角色，可再编辑） */
const AGENT_TEMPLATES: { name: string; role: string }[] = [
  { name: '剧本续写', role: '你是一位 galgame 剧本作家，擅长在给定情节后续写符合人物性格的对话与场景描写，保持风格统一。' },
  { name: '素材生成', role: '你擅长根据文字描述生成图像 / 音乐 / 视频的提示词，并调用对应工具产出可用素材。' },
  { name: '知识问答', role: '你基于用户的知识库回答问题，先检索相关资料再回答，不编造未提及的内容。' },
];

/** 解析 toolset（兼容空/损坏） */
function parseToolset(raw: string): AIAgentToolset {
  try {
    const o = JSON.parse(raw || '{}') as Partial<AIAgentToolset>;
    return { prompts: o.prompts ?? [], kb: o.kb ?? [], mcp: o.mcp ?? [], web: Boolean(o.web) };
  } catch {
    return { prompts: [], kb: [], mcp: [], web: false };
  }
}

export default function AgentsPage(): React.JSX.Element {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 工具集源
  const [mcpServers, setMcpServers] = useState<NamedItem[]>([]);
  const [kbs, setKbs] = useState<NamedItem[]>([]);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);

  // 新增表单
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<string>(DEFAULT_ROLE);

  // 编辑表单
  const [editName, setEditName] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('');
  const [editModel, setEditModel] = useState<string>('');
  const [toolset, setToolset] = useState<AIAgentToolset>({ prompts: [], kb: [], mcp: [], web: false });
  const [saving, setSaving] = useState<boolean>(false);

  const loadAgents = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/agents', { headers: authHeaders() });
      const json = await res.json();
      if (json.code === 200) {
        const list = json.data as Agent[];
        setAgents(list);
        setActiveId((cur) => (cur && list.some((a) => a.id === cur) ? cur : (list[0]?.id ?? null)));
      } else setToast({ message: json.message || '加载失败', type: 'error' });
    } catch {
      setToast({ message: '网络错误', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  /** 加载工具集源（MCP / KB / Prompts） */
  const loadToolSources = useCallback(async (): Promise<void> => {
    try {
      const [m, k, p] = await Promise.all([
        fetch('/api/ai/mcp', { headers: authHeaders() }).then((r) => r.json()),
        fetch('/api/ai/knowledge-bases', { headers: authHeaders() }).then((r) => r.json()),
        fetch('/api/ai/prompts', { headers: authHeaders() }).then((r) => r.json()),
      ]);
      if (m.code === 200) setMcpServers((m.data as { id: string; name: string }[]).map((x) => ({ id: x.id, name: x.name })));
      if (k.code === 200) setKbs((k.data as { id: string; name: string }[]).map((x) => ({ id: x.id, name: x.name })));
      if (p.code === 200) setPrompts((p.data as { id: string; title: string }[]).map((x) => ({ id: x.id, title: x.title })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadAgents(); void loadToolSources(); }, [loadAgents, loadToolSources]);

  const activeAgent = agents.find((a) => a.id === activeId) ?? null;
  useEffect(() => {
    if (!activeAgent) {
      setEditName(''); setEditRole(''); setEditModel('');
      setToolset({ prompts: [], kb: [], mcp: [], web: false });
      return;
    }
    setEditName(activeAgent.name);
    setEditRole(activeAgent.role);
    setEditModel(activeAgent.model);
    setToolset(parseToolset(activeAgent.toolset));
  }, [activeAgent]);

  const createAgent = async (): Promise<void> => {
    if (!newName.trim()) { setToast({ message: '请输入 Agent 名称', type: 'error' }); return; }
    const res = await fetch('/api/ai/agents', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: newName.trim(), role: newRole.trim(), toolset: { prompts: [], kb: [], mcp: [], web: false } }),
    });
    const json = await res.json();
    if (json.code === 200) {
      setNewName(''); setNewRole(DEFAULT_ROLE);
      setToast({ message: '已创建', type: 'success' });
      void loadAgents();
    } else setToast({ message: json.message || '创建失败', type: 'error' });
  };

  const deleteAgent = async (id: string): Promise<void> => {
    if (!confirm('删除该 Agent？')) return;
    const res = await fetch(`/api/ai/agents/${id}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json();
    if (json.code === 200) { setToast({ message: '已删除', type: 'success' }); void loadAgents(); }
    else setToast({ message: json.message || '删除失败', type: 'error' });
  };

  const saveAgent = async (): Promise<void> => {
    if (!activeAgent) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ai/agents/${activeAgent.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: editName.trim() || activeAgent.name,
          role: editRole,
          model: editModel.trim(),
          toolset,
        }),
      });
      const json = await res.json();
      if (json.code === 200) { setToast({ message: '已保存', type: 'success' }); void loadAgents(); }
      else setToast({ message: json.message || '保存失败', type: 'error' });
    } finally { setSaving(false); }
  };

  const toggle = (key: 'prompts' | 'kb' | 'mcp', id: string): void => {
    setToolset((prev) => {
      const cur = prev[key];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...prev, [key]: next };
    });
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] mb-1">Agent 智能体</h1>
          <p className="text-[var(--ink-muted)] text-sm">定义角色与系统提示，勾选可调用工具（MCP / 知识库 / 提示词 / 联网），在星灵对话中一键启用多步编排</p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/ai')}>返回星灵</Button>
      </div>

      <div className="flex gap-6 max-w-5xl">
        {/* 左：Agent 列表 + 新增 */}
        <aside className="w-64 shrink-0">
          <div className="glass-card rounded-2xl p-3 space-y-3">
            <div className="space-y-1">
              {loading ? (
                <div className="text-center py-6 text-[var(--ink-muted)] text-xs">加载中…</div>
              ) : agents.length === 0 ? (
                <div className="text-center py-6 text-[var(--ink-muted)] text-xs">还没有 Agent</div>
              ) : (
                agents.map((a) => (
                  <div
                    key={a.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                      activeId === a.id ? 'bg-[var(--sakura-pale)] border-[var(--sakura-light)]/50' : 'border-transparent hover:bg-white/60'
                    }`}
                    onClick={() => setActiveId(a.id)}
                  >
                    <i className={`fas fa-robot text-sm ${activeId === a.id ? 'text-[var(--sakura-dark)]' : 'text-[var(--ink-muted)]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${activeId === a.id ? 'text-[var(--sakura-dark)]' : 'text-[var(--ink)]'}`}>{a.name}</div>
                      <div className="text-[10px] text-[var(--ink-muted)] truncate">{a.model || '沿用默认模型'}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); void deleteAgent(a.id); }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-[var(--ink-muted)] hover:text-red-500 transition-all"
                      title="删除"
                    >
                      <i className="fas fa-trash-alt text-xs" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="h-px bg-[var(--sakura-light)]/20" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[var(--ink-muted)]">新增 Agent</div>
              <div className="flex flex-wrap gap-1.5">
                {AGENT_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => { setNewName(t.name); setNewRole(t.role); }}
                    className="text-[10px] px-2 py-1 rounded-full border border-[var(--sakura-light)]/30 text-[var(--ink-muted)] hover:bg-[var(--sakura-pale)] hover:text-[var(--sakura-dark)] transition-colors"
                    title="点击预填名称与角色，可再编辑"
                  >
                    <i className="fas fa-wand-magic-sparkles mr-1 opacity-70" />{t.name}
                  </button>
                ))}
              </div>
              <Input placeholder="名称" value={newName} onChange={setNewName} />
              <textarea
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                rows={3}
                placeholder="角色 / 系统提示（system prompt）"
                className="w-full resize-none rounded-xl bg-white/70 border border-[var(--sakura-light)]/30 px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--sakura)]"
              />
              <Button variant="primary" fullWidth onClick={() => void createAgent()}><i className="fas fa-plus mr-1.5" /> 新建</Button>
            </div>
          </div>
        </aside>

        {/* 右：选中 Agent 编辑 */}
        <main className="flex-1 min-w-0">
          {!activeAgent ? (
            <div className="glass-card rounded-2xl p-12 text-center text-[var(--ink-muted)] text-sm">
              从左侧选择或新建一个 Agent
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <h2 className="text-xl font-bold text-[var(--ink)] mb-4">基础信息</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[var(--ink-muted)]">名称</label>
                    <Input value={editName} onChange={setEditName} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--ink-muted)]">模型（留空沿用对话默认）</label>
                    <Input value={editModel} onChange={setEditModel} placeholder="如 deepseek-chat" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-[var(--ink-muted)]">角色 / 系统提示</label>
                    <textarea
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-xl bg-white/70 border border-[var(--sakura-light)]/30 px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--sakura)]"
                    />
                  </div>
                </div>
              </div>

              {/* 工具集 */}
              <div className="glass-card rounded-2xl p-5">
                <div className="text-sm font-semibold text-[var(--ink)] mb-3">工具集</div>

                <ToolSection
                  icon="fa-plug"
                  title="MCP 服务器"
                  emptyHint="还没有 MCP 服务器，先到「MCP 连接器」添加"
                  items={mcpServers}
                  selected={toolset.mcp}
                  onToggle={(id) => toggle('mcp', id)}
                />
                <ToolSection
                  icon="fa-book"
                  title="知识库"
                  emptyHint="还没有知识库，先到「知识库」添加"
                  items={kbs}
                  selected={toolset.kb}
                  onToggle={(id) => toggle('kb', id)}
                />
                <ToolSection
                  icon="fa-bookmark"
                  title="提示词库"
                  emptyHint="还没有提示词"
                  items={prompts.map((p) => ({ id: p.id, name: p.title }))}
                  selected={toolset.prompts}
                  onToggle={(id) => toggle('prompts', id)}
                />

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="web-toggle"
                    checked={toolset.web}
                    onChange={(e) => setToolset((prev) => ({ ...prev, web: e.target.checked }))}
                    className="w-4 h-4 accent-[var(--sakura)]"
                  />
                  <label htmlFor="web-toggle" className="text-sm text-[var(--ink)] flex items-center gap-2 cursor-pointer">
                    <i className="fas fa-globe text-[var(--lavender)]" /> 启用联网搜索（占位，需配置搜索 API）
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="primary" onClick={() => void saveAgent()} loading={saving}><i className="fas fa-save mr-1.5" /> 保存</Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

/** 工具勾选分区 */
function ToolSection({
  icon,
  title,
  items,
  selected,
  onToggle,
  emptyHint,
}: {
  icon: string;
  title: string;
  items: NamedItem[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyHint: string;
}): React.JSX.Element {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)] mb-2">
        <i className={`fas ${icon} text-[var(--sakura)]`} /> {title}
        {selected.length > 0 && <span className="text-[var(--sakura-dark)]">已选 {selected.length}</span>}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-[var(--ink-muted)]">{emptyHint}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((it) => {
            const on = selected.includes(it.id);
            return (
              <button
                key={it.id}
                onClick={() => onToggle(it.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  on
                    ? 'bg-[var(--sakura-pale)] border-[var(--sakura)] text-[var(--sakura-dark)]'
                    : 'bg-white/60 border-[var(--sakura-light)]/30 text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)]'
                }`}
              >
                {on && <i className="fas fa-check mr-1" />}
                {it.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
