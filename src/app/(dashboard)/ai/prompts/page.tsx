// AI 提示词库页面 - 网格卡片 + 分类筛选 + 新建/编辑弹层 + 应用到对话
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';

interface Prompt {
  id: string;
  title: string;
  category: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('galgame_token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** 提取 {{变量}} 占位（去重、保序） */
function extractVars(content: string): string[] {
  const set = new Set<string>();
  const re = /\{\{\s*([\w一-龥]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) if (m[1]) set.add(m[1]);
  return Array.from(set);
}

/** 将 {{变量}} 替换为用户提供的值（未填则保留原占位） */
function interpolate(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{\s*([\w一-龥]+)\s*\}\}/g, (_, name: string) => values[name]?.trim() || `{{${name}}}`);
}

export default function PromptsPage(): React.JSX.Element {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState<string>('全部');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  /** 待填变量的应用请求（prompt + 动作） */
  const [pending, setPending] = useState<{ prompt: Prompt; action: 'system' | 'insert' } | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});

  const categories = useMemo(() => {
    const set = new Set(prompts.map((p) => p.category));
    return ['全部', ...Array.from(set)];
  }, [prompts]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/prompts', { headers: authHeaders() });
      const json = await res.json();
      if (json.code === 200) setPrompts(json.data as Prompt[]);
      else setToast({ message: json.message || '加载失败', type: 'error' });
    } catch {
      setToast({ message: '网络错误', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = category === '全部' ? prompts : prompts.filter((p) => p.category === category);

  const openNew = (): void => {
    setEditing({ id: '', title: '', category: '通用', content: '', isPublic: false, createdAt: '' });
    setShowEditor(true);
  };
  const openEdit = (p: Prompt): void => {
    setEditing(p);
    setShowEditor(true);
  };

  const handleSave = async (): Promise<void> => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content.trim()) {
      setToast({ message: '标题与内容必填', type: 'error' });
      return;
    }
    const isEdit = Boolean(editing.id);
    const res = await fetch(isEdit ? `/api/ai/prompts/${editing.id}` : '/api/ai/prompts', {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: editing.title, category: editing.category, content: editing.content }),
    });
    const json = await res.json();
    if (json.code === 200) {
      setToast({ message: isEdit ? '已更新' : '已创建', type: 'success' });
      setShowEditor(false);
      void load();
    } else setToast({ message: json.message || '保存失败', type: 'error' });
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('确定删除该提示词？')) return;
    const res = await fetch(`/api/ai/prompts/${id}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json();
    if (json.code === 200) { setToast({ message: '已删除', type: 'success' }); void load(); }
    else setToast({ message: json.message || '删除失败', type: 'error' });
  };

  /** 应用提示词：system=设为系统提示；insert=插入对话输入框 */
  const applyAction = (content: string, action: 'system' | 'insert', title: string): void => {
    if (action === 'system') {
      localStorage.setItem('stellar_pending_system_prompt', content);
      setToast({ message: `已就绪：「${title}」将作为对话系统提示`, type: 'success' });
    } else {
      localStorage.setItem('stellar_pending_insert', content);
      setToast({ message: '已插入到对话输入框，可编辑后发送', type: 'success' });
    }
    setPending(null);
    router.push('/ai');
  };

  /** 点击使用：有变量则弹填值表单，否则直接应用 */
  const handleUse = (p: Prompt, action: 'system' | 'insert'): void => {
    const vars = extractVars(p.content);
    if (vars.length) { setPending({ prompt: p, action }); setVarValues({}); }
    else applyAction(p.content, action, p.title);
  };

  /** 变量填值确认 */
  const confirmVars = (): void => {
    if (!pending) return;
    const resolved = interpolate(pending.prompt.content, varValues);
    applyAction(resolved, pending.action, pending.prompt.title);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] mb-1">提示词库</h1>
          <p className="text-[var(--ink-muted)] text-sm">沉淀你的剧本/角色/灵感提示词，一键应用到星灵对话</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/ai')}>返回星灵</Button>
          <Button variant="primary" onClick={openNew}><i className="fas fa-plus mr-1.5" /> 新建提示词</Button>
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2 mb-5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-xs transition-colors border ${
              category === c
                ? 'bg-[var(--sakura-pale)] border-[var(--sakura-light)] text-[var(--sakura-dark)]'
                : 'bg-white/50 border-[var(--sakura-light)]/30 text-[var(--ink-muted)] hover:bg-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-[var(--sakura)]/30 border-t-[var(--sakura)] rounded-full mx-auto mb-3" />
          <div className="text-[var(--ink-muted)] text-sm">加载中…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-[var(--ink-muted)] text-sm">
          暂无提示词，点击右上角「新建提示词」开始沉淀吧。
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="glass-card rounded-2xl p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-[var(--ink)] truncate">{p.title}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sakura-pale)] text-[var(--sakura-dark)] shrink-0 ml-2">
                  {p.category}
                </span>
              </div>
              <p className="text-xs text-[var(--ink-muted)] line-clamp-4 flex-1 whitespace-pre-wrap">{p.content}</p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--sakura-light)]/20">
                <Button variant="primary" className="flex-1 !py-1.5 !text-xs" onClick={() => handleUse(p, 'insert')}>
                  <i className="fas fa-reply mr-1" /> 插入输入框
                </Button>
                <Button variant="ghost" className="!py-1.5 !text-xs" onClick={() => handleUse(p, 'system')}>
                  <i className="fas fa-cog mr-1" /> 系统提示
                </Button>
                <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-white/60 hover:bg-white flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--sakura-dark)] transition-colors" title="编辑">
                  <i className="fas fa-edit text-xs" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-white/60 hover:bg-white flex items-center justify-center text-[var(--ink-muted)] hover:text-red-500 transition-colors" title="删除">
                  <i className="fas fa-trash-alt text-xs" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑/新建弹层 */}
      {showEditor && editing && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowEditor(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-[var(--sakura-light)]/40 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--ink)]">{editing.id ? '编辑提示词' : '新建提示词'}</h2>
                <button onClick={() => setShowEditor(false)} className="w-7 h-7 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-[var(--ink-muted)]">
                  <i className="fas fa-times text-xs" />
                </button>
              </div>
              <div className="space-y-3">
                <Input label="标题" value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} placeholder="例如：治愈系剧本开头" />
                <Input label="分类" value={editing.category} onChange={(v) => setEditing({ ...editing, category: v })} placeholder="剧本 / 角色 / 灵感 / 素材 / 通用" />
                <div>
                  <div className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5">内容</div>
                  <textarea
                    value={editing.content}
                    onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    rows={8}
                    placeholder="提示词正文，可含 {{变量}} 占位（应用时会弹出填值）"
                    className="w-full resize-none rounded-xl bg-white/70 border border-[var(--sakura-light)]/30 px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--sakura)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <Button variant="ghost" onClick={() => setShowEditor(false)}>取消</Button>
                <Button variant="primary" onClick={() => void handleSave()}>保存</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 变量填值弹层 */}
      {pending && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setPending(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-[var(--sakura-light)]/40 animate-fade-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--ink)]">填充变量</h2>
                <button onClick={() => setPending(null)} className="w-7 h-7 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-[var(--ink-muted)]">
                  <i className="fas fa-times text-xs" />
                </button>
              </div>
              <p className="text-xs text-[var(--ink-muted)] mb-3">「{pending.prompt.title}」含以下占位符，填写后将替换再{pending.action === 'system' ? '设为系统提示' : '插入输入框'}：</p>
              <div className="space-y-3">
                {extractVars(pending.prompt.content).map((v) => (
                  <div key={v}>
                    <label className="text-xs font-semibold text-[var(--ink-muted)]">{`{{${v}}}`}</label>
                    <Input value={varValues[v] ?? ''} onChange={(val) => setVarValues((prev) => ({ ...prev, [v]: val }))} placeholder={`填写 ${v}`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <Button variant="ghost" onClick={() => setPending(null)}>取消</Button>
                <Button variant="primary" onClick={() => void confirmVars()}>确定</Button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
