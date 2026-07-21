// AI MCP 连接器页面 - 左右布局：左=服务器列表 + 新增；右=选中服务器配置 / 测试 / 删除
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';

interface McpServer {
  id: string;
  name: string;
  command: string | null;
  url: string | null;
  status: string;
  createdAt: string;
}
interface McpTool {
  name: string;
  description?: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('galgame_token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  idle: { dot: 'bg-gray-300', text: '未连接' },
  connected: { dot: 'bg-emerald-400', text: '已连接' },
  error: { dot: 'bg-red-400', text: '连接失败' },
};

const FALLBACK_STATUS: { dot: string; text: string } = { dot: 'bg-gray-300', text: '未连接' };
function statusInfo(s: string): { dot: string; text: string } {
  return STATUS_STYLE[s] ?? FALLBACK_STATUS;
}

export default function McpPage(): React.JSX.Element {
  const router = useRouter();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 新增表单
  const [newName, setNewName] = useState<string>('');
  const [createType, setCreateType] = useState<'stdio' | 'url'>('stdio');
  const [newCommand, setNewCommand] = useState<string>('');
  const [newArgs, setNewArgs] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newEnv, setNewEnv] = useState<string>('');

  // 编辑表单（选中服务器）
  const [editName, setEditName] = useState<string>('');
  const [editCommand, setEditCommand] = useState<string>('');
  const [editArgs, setEditArgs] = useState<string>('');
  const [editUrl, setEditUrl] = useState<string>('');
  const [editEnv, setEditEnv] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // 测试连接
  const [testing, setTesting] = useState<boolean>(false);
  const [testTools, setTestTools] = useState<McpTool[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const loadServers = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/mcp', { headers: authHeaders() });
      const json = await res.json();
      if (json.code === 200) {
        const list = json.data as McpServer[];
        setServers(list);
        setActiveId((cur) => (cur && list.some((s) => s.id === cur) ? cur : (list[0]?.id ?? null)));
      } else setToast({ message: json.message || '加载失败', type: 'error' });
    } catch {
      setToast({ message: '网络错误', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadServers(); }, [loadServers]);

  // 选中服务器变化时，把字段载入编辑表单
  const activeServer = servers.find((s) => s.id === activeId) ?? null;
  useEffect(() => {
    if (!activeServer) {
      setEditName(''); setEditCommand(''); setEditArgs(''); setEditUrl(''); setEditEnv('');
      setTestTools(null); setTestError(null);
      return;
    }
    setEditName(activeServer.name);
    setEditCommand(activeServer.command ?? '');
    setEditArgs(''); // 服务端不回传 args 明文，编辑时重新填
    setEditUrl(activeServer.url ?? '');
    setEditEnv(''); // 服务端不回传 env 明文，编辑时重新填
    setTestTools(null);
    setTestError(null);
  }, [activeServer]);

  const createServer = async (): Promise<void> => {
    if (!newName.trim()) { setToast({ message: '请输入服务器名称', type: 'error' }); return; }
    if (createType === 'stdio' && !newCommand.trim()) { setToast({ message: 'stdio 模式需填写启动命令', type: 'error' }); return; }
    if (createType === 'url' && !newUrl.trim()) { setToast({ message: 'url 模式需填写地址', type: 'error' }); return; }
    const body: Record<string, unknown> = {
      name: newName.trim(),
      command: createType === 'stdio' ? newCommand.trim() : null,
      args: createType === 'stdio' && newArgs.trim() ? newArgs.trim() : null,
      url: createType === 'url' ? newUrl.trim() : null,
      env: newEnv.trim() ? newEnv.trim() : null,
    };
    const res = await fetch('/api/ai/mcp', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
    const json = await res.json();
    if (json.code === 200) {
      setNewName(''); setNewCommand(''); setNewArgs(''); setNewUrl(''); setNewEnv('');
      setToast({ message: '已创建，记得点「测试连接」', type: 'success' });
      void loadServers();
    } else setToast({ message: json.message || '创建失败', type: 'error' });
  };

  const deleteServer = async (id: string): Promise<void> => {
    if (!confirm('删除该 MCP 服务器连接？')) return;
    const res = await fetch(`/api/ai/mcp/${id}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json();
    if (json.code === 200) { setToast({ message: '已删除', type: 'success' }); void loadServers(); }
    else setToast({ message: json.message || '删除失败', type: 'error' });
  };

  const saveServer = async (): Promise<void> => {
    if (!activeServer) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      name: editName.trim() || activeServer.name,
      command: editCommand.trim() || null,
      args: editArgs.trim() || null,
      url: editUrl.trim() || null,
      env: editEnv.trim() || null,
    };
    try {
      const res = await fetch(`/api/ai/mcp/${activeServer.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) });
      const json = await res.json();
      if (json.code === 200) { setToast({ message: '已保存', type: 'success' }); void loadServers(); }
      else setToast({ message: json.message || '保存失败', type: 'error' });
    } finally { setSaving(false); }
  };

  const testConnection = async (): Promise<void> => {
    if (!activeServer) return;
    setTesting(true);
    setTestTools(null);
    setTestError(null);
    try {
      const res = await fetch(`/api/ai/mcp/${activeServer.id}/test`, { method: 'POST', headers: authHeaders() });
      const json = await res.json();
      if (json.code === 200 && json.data?.ok) setTestTools(json.data.tools as McpTool[]);
      else setTestError(json.data?.error || json.message || '连接失败');
    } catch {
      setTestError('网络错误');
    } finally {
      setTesting(false);
      void loadServers();
    }
  };

  const serverType = (s: McpServer): 'stdio' | 'url' => (s.url ? 'url' : 'stdio');
  const editType = editUrl.trim() ? 'url' : 'stdio';

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] mb-1">MCP 连接器</h1>
          <p className="text-[var(--ink-muted)] text-sm">接入标准 MCP 服务器（stdio 本地进程 / url 远程服务），挂载到 Agent 即可调用其工具</p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/ai')}>返回星灵</Button>
      </div>

      <div className="flex gap-6 max-w-5xl">
        {/* 左：服务器列表 + 新增 */}
        <aside className="w-64 shrink-0">
          <div className="glass-card rounded-2xl p-3 space-y-3">
            <div className="space-y-1">
              {loading ? (
                <div className="text-center py-6 text-[var(--ink-muted)] text-xs">加载中…</div>
              ) : servers.length === 0 ? (
                <div className="text-center py-6 text-[var(--ink-muted)] text-xs">还没有 MCP 服务器</div>
              ) : (
                servers.map((s) => {
                  const st = statusInfo(s.status);
                  return (
                    <div
                      key={s.id}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                        activeId === s.id ? 'bg-[var(--sakura-pale)] border-[var(--sakura-light)]/50' : 'border-transparent hover:bg-white/60'
                      }`}
                      onClick={() => setActiveId(s.id)}
                    >
                      <i className={`fas ${serverType(s) === 'url' ? 'fa-globe' : 'fa-terminal'} text-sm ${activeId === s.id ? 'text-[var(--sakura-dark)]' : 'text-[var(--ink-muted)]'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${activeId === s.id ? 'text-[var(--sakura-dark)]' : 'text-[var(--ink)]'}`}>{s.name}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--ink-muted)]">
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /> {st.text}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); void deleteServer(s.id); }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-[var(--ink-muted)] hover:text-red-500 transition-all"
                        title="删除"
                      >
                        <i className="fas fa-trash-alt text-xs" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="h-px bg-[var(--sakura-light)]/20" />
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[var(--ink-muted)]">新增服务器</div>
              <Input placeholder="名称" value={newName} onChange={setNewName} />
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCreateType('stdio')}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                    createType === 'stdio' ? 'bg-[var(--sakura-pale)] border-[var(--sakura-light)] text-[var(--sakura-dark)]' : 'border-[var(--sakura-light)]/30 text-[var(--ink-muted)] hover:bg-white/60'
                  }`}
                >
                  <i className="fas fa-terminal mr-1" /> 本地进程
                </button>
                <button
                  onClick={() => setCreateType('url')}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                    createType === 'url' ? 'bg-[var(--sakura-pale)] border-[var(--sakura-light)] text-[var(--sakura-dark)]' : 'border-[var(--sakura-light)]/30 text-[var(--ink-muted)] hover:bg-white/60'
                  }`}
                >
                  <i className="fas fa-globe mr-1" /> 远程地址
                </button>
              </div>
              {createType === 'stdio' ? (
                <>
                  <Input placeholder="启动命令（如 npx）" value={newCommand} onChange={setNewCommand} />
                  <Input placeholder="参数（空格分隔，可选）" value={newArgs} onChange={setNewArgs} />
                </>
              ) : (
                <Input placeholder="URL（如 https://host/mcp）" value={newUrl} onChange={setNewUrl} />
              )}
              <textarea
                value={newEnv}
                onChange={(e) => setNewEnv(e.target.value)}
                rows={2}
                placeholder='环境变量 JSON（可选）：{"KEY":"VALUE"}'
                className="w-full resize-none rounded-xl bg-white/70 border border-[var(--sakura-light)]/30 px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--sakura)]"
              />
              <Button variant="primary" fullWidth onClick={() => void createServer()}><i className="fas fa-plus mr-1.5" /> 新建</Button>
            </div>
          </div>
        </aside>

        {/* 右：选中服务器配置 / 测试 */}
        <main className="flex-1 min-w-0">
          {!activeServer ? (
            <div className="glass-card rounded-2xl p-12 text-center text-[var(--ink-muted)] text-sm">
              从左侧选择或新建一个 MCP 服务器
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[var(--ink)]">{activeServer.name}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      statusInfo(activeServer.status).dot === 'bg-emerald-400'
                        ? 'bg-emerald-50 text-emerald-600'
                        : statusInfo(activeServer.status).dot === 'bg-red-400'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {statusInfo(activeServer.status).text}
                    </span>
                  </div>
                  <Button variant="ghost" onClick={() => void deleteServer(activeServer.id)} className="text-red-500 hover:bg-red-50"><i className="fas fa-trash-alt mr-1.5" /> 删除</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-[var(--ink-muted)]">名称</label>
                    <Input value={editName} onChange={setEditName} />
                  </div>
                  {editType === 'stdio' ? (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-[var(--ink-muted)]">启动命令</label>
                        <Input value={editCommand} onChange={setEditCommand} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--ink-muted)]">参数（空格分隔）</label>
                        <Input value={editArgs} onChange={setEditArgs} placeholder="留空沿用现有" />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-[var(--ink-muted)]">URL</label>
                      <Input value={editUrl} onChange={setEditUrl} />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-[var(--ink-muted)]">环境变量 JSON（留空沿用现有）</label>
                    <textarea
                      value={editEnv}
                      onChange={(e) => setEditEnv(e.target.value)}
                      rows={2}
                      placeholder='{"KEY":"VALUE"}'
                      className="w-full resize-none rounded-xl bg-white/70 border border-[var(--sakura-light)]/30 px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--sakura)]"
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="primary" onClick={() => void saveServer()} loading={saving}><i className="fas fa-save mr-1.5" /> 保存</Button>
                  <Button variant="secondary" onClick={() => void testConnection()} loading={testing}><i className="fas fa-plug mr-1.5" /> 测试连接</Button>
                </div>
              </div>

              {/* 测试连接结果 */}
              <div className="glass-card rounded-2xl p-5">
                <div className="text-sm font-semibold text-[var(--ink)] mb-3">连接测试 / 工具清单</div>
                {testing ? (
                  <div className="text-xs text-[var(--ink-muted)]">正在连接…</div>
                ) : testError ? (
                  <div className="text-xs text-red-500">连接失败：{testError}</div>
                ) : testTools === null ? (
                  <div className="text-xs text-[var(--ink-muted)]">点击「测试连接」查看该服务器暴露的工具。</div>
                ) : testTools.length === 0 ? (
                  <div className="text-xs text-[var(--ink-muted)]">连接成功，但未发现工具。</div>
                ) : (
                  <div className="space-y-2">
                    {testTools.map((t) => (
                      <div key={t.name} className="rounded-xl bg-white/60 border border-[var(--sakura-light)]/20 p-3">
                        <div className="text-sm font-medium text-[var(--sakura-dark)] flex items-center gap-2">
                          <i className="fas fa-wrench text-xs" /> {t.name}
                        </div>
                        {t.description && <div className="text-xs text-[var(--ink-muted)] mt-1 leading-relaxed">{t.description}</div>}
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
