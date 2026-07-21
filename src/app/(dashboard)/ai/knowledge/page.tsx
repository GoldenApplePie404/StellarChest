// AI 知识库页面 - 左右布局：左=知识库列表，右=选中库的文档与检索测试
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';

interface KB {
  id: string;
  name: string;
  desc: string | null;
  _count?: { docs: number };
  createdAt: string;
}
interface KBDoc {
  id: string;
  title: string;
  fileType: string;
  status: string;
  createdAt: string;
}
interface RetrievedChunk {
  docTitle: string;
  content: string;
  score: number;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('galgame_token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export default function KnowledgePage(): React.JSX.Element {
  const router = useRouter();
  const [kbs, setKbs] = useState<KB[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeLoading, setActiveLoading] = useState<boolean>(false);
  const [docs, setDocs] = useState<KBDoc[]>([]);
  const [newName, setNewName] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [retrieved, setRetrieved] = useState<RetrievedChunk[] | null>(null);
  const [retrieving, setRetrieving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadKbs = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/knowledge-bases', { headers: authHeaders() });
      const json = await res.json();
      if (json.code === 200) {
        const list = json.data as KB[];
        setKbs(list);
        setActiveId((cur) => cur && list.some((k) => k.id === cur) ? cur : (list[0]?.id ?? null));
      } else setToast({ message: json.message || '加载失败', type: 'error' });
    } catch {
      setToast({ message: '网络错误', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocs = useCallback(async (id: string): Promise<void> => {
    setActiveLoading(true);
    setRetrieved(null);
    try {
      const res = await fetch(`/api/ai/knowledge-bases/${id}/docs`, { headers: authHeaders() });
      const json = await res.json();
      if (json.code === 200) setDocs(json.data as KBDoc[]);
    } catch { /* ignore */ } finally {
      setActiveLoading(false);
    }
  }, []);

  useEffect(() => { void loadKbs(); }, [loadKbs]);
  useEffect(() => { if (activeId) void loadDocs(activeId); }, [activeId, loadDocs]);

  const createKb = async (): Promise<void> => {
    if (!newName.trim()) { setToast({ message: '请输入知识库名称', type: 'error' }); return; }
    const res = await fetch('/api/ai/knowledge-bases', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ name: newName.trim(), desc: newDesc.trim() || null }),
    });
    const json = await res.json();
    if (json.code === 200) {
      setNewName(''); setNewDesc('');
      setToast({ message: '已创建', type: 'success' });
      void loadKbs();
    } else setToast({ message: json.message || '创建失败', type: 'error' });
  };

  const deleteKb = async (id: string): Promise<void> => {
    if (!confirm('删除知识库将同时删除其全部文档，确定？')) return;
    const res = await fetch(`/api/ai/knowledge-bases/${id}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json();
    if (json.code === 200) { setToast({ message: '已删除', type: 'success' }); void loadKbs(); }
    else setToast({ message: json.message || '删除失败', type: 'error' });
  };

  const uploadDoc = async (file: File): Promise<void> => {
    if (!activeId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/ai/knowledge-bases/${activeId}/docs`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}` }, body: fd });
      const json = await res.json();
      if (json.code === 200) { setToast({ message: json.message || '已上传', type: 'success' }); void loadDocs(activeId); void loadKbs(); }
      else setToast({ message: json.message || '上传失败', type: 'error' });
    } catch { setToast({ message: '上传失败', type: 'error' }); } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (docId: string): Promise<void> => {
    if (!activeId || !confirm('确定删除该文档？')) return;
    const res = await fetch(`/api/ai/knowledge-bases/${activeId}/docs/${docId}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json();
    if (json.code === 200) { setToast({ message: '已删除', type: 'success' }); void loadDocs(activeId); void loadKbs(); }
    else setToast({ message: json.message || '删除失败', type: 'error' });
  };

  const runRetrieve = async (): Promise<void> => {
    if (!activeId || !query.trim()) { setToast({ message: '请输入检索内容', type: 'error' }); return; }
    setRetrieving(true);
    try {
      const res = await fetch(`/api/ai/knowledge-bases/${activeId}/retrieve`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ query: query.trim(), topK: 3 }),
      });
      const json = await res.json();
      if (json.code === 200) setRetrieved(json.data.chunks as RetrievedChunk[]);
      else setToast({ message: json.message || '检索失败', type: 'error' });
    } catch { setToast({ message: '检索失败', type: 'error' }); } finally {
      setRetrieving(false);
    }
  };

  const activeKb = kbs.find((k) => k.id === activeId) ?? null;

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] mb-1">知识库</h1>
          <p className="text-[var(--ink-muted)] text-sm">上传 txt/md 文档，挂载到星灵对话即可获得基于资料的回答（V1 关键词检索）</p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/ai')}>返回星灵</Button>
      </div>

      <div className="flex gap-6 max-w-5xl">
        {/* 左：知识库列表 */}
        <aside className="w-60 shrink-0">
          <div className="glass-card rounded-2xl p-3 space-y-3">
            <div className="space-y-1">
              {loading ? (
                <div className="text-center py-6 text-[var(--ink-muted)] text-xs">加载中…</div>
              ) : kbs.length === 0 ? (
                <div className="text-center py-6 text-[var(--ink-muted)] text-xs">还没有知识库</div>
              ) : (
                kbs.map((k) => (
                  <div
                    key={k.id}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                      activeId === k.id ? 'bg-[var(--sakura-pale)] border-[var(--sakura-light)]/50' : 'border-transparent hover:bg-white/60'
                    }`}
                    onClick={() => setActiveId(k.id)}
                  >
                    <i className={`fas fa-book text-sm ${activeId === k.id ? 'text-[var(--sakura-dark)]' : 'text-[var(--ink-muted)]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${activeId === k.id ? 'text-[var(--sakura-dark)]' : 'text-[var(--ink)]'}`}>{k.name}</div>
                      <div className="text-[10px] text-[var(--ink-muted)]">{k._count?.docs ?? 0} 篇文档</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); void deleteKb(k.id); }}
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
              <Input placeholder="新建知识库名称" value={newName} onChange={setNewName} />
              <Input placeholder="描述（可选）" value={newDesc} onChange={setNewDesc} />
              <Button variant="primary" fullWidth onClick={() => void createKb()}><i className="fas fa-plus mr-1.5" /> 新建</Button>
            </div>
          </div>
        </aside>

        {/* 右：选中库的文档与检索 */}
        <main className="flex-1 min-w-0">
          {!activeKb ? (
            <div className="glass-card rounded-2xl p-12 text-center text-[var(--ink-muted)] text-sm">
              从左侧选择或新建一个知识库
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <h2 className="text-xl font-bold text-[var(--ink)]">{activeKb.name}</h2>
                {activeKb.desc && <p className="text-xs text-[var(--ink-muted)] mt-1">{activeKb.desc}</p>}

                <label className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-[var(--sakura-light)]/50 text-[var(--sakura-dark)] text-sm cursor-pointer hover:bg-[var(--sakura-pale)]/40 transition-colors">
                  <i className="fas fa-upload" />
                  {uploading ? '上传切片中…' : '上传 .txt / .md 文档'}
                  <input
                    type="file"
                    accept=".txt,.md"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadDoc(f);
                      e.target.value = '';
                    }}
                  />
                </label>

                <div className="mt-4 space-y-2">
                  {activeLoading ? (
                    <div className="text-xs text-[var(--ink-muted)]">加载文档…</div>
                  ) : docs.length === 0 ? (
                    <div className="text-xs text-[var(--ink-muted)]">暂无文档，上传后将自动切片。</div>
                  ) : docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <i className="fas fa-file-alt text-[var(--sakura)] text-sm" />
                        <span className="text-sm text-[var(--ink)] truncate">{d.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sakura-pale)] text-[var(--sakura-dark)] shrink-0">{d.status}</span>
                      </div>
                      <button onClick={() => void deleteDoc(d.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--ink-muted)] hover:text-red-500 transition-colors" title="删除">
                        <i className="fas fa-trash-alt text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 检索测试 */}
              <div className="glass-card rounded-2xl p-5">
                <div className="text-sm font-semibold text-[var(--ink)] mb-3">检索测试（挂载到对话时自动执行）</div>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void runRetrieve(); }}
                    placeholder="输入要检索的问题…"
                    className="flex-1 rounded-xl bg-white/70 border border-[var(--sakura-light)]/30 px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--sakura)]"
                  />
                  <Button variant="primary" onClick={() => void runRetrieve()} loading={retrieving}>检索</Button>
                </div>
                {retrieved && (
                  <div className="mt-3 space-y-2">
                    {retrieved.length === 0 ? (
                      <div className="text-xs text-[var(--ink-muted)]">未命中相关片段。</div>
                    ) : retrieved.map((c, i) => (
                      <div key={i} className="rounded-xl bg-white/60 border border-[var(--sakura-light)]/20 p-3">
                        <div className="text-[10px] text-[var(--sakura-dark)] mb-1">资料：{c.docTitle} · 命中 {c.score}</div>
                        <div className="text-xs text-[var(--ink)] whitespace-pre-wrap leading-relaxed">{c.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
