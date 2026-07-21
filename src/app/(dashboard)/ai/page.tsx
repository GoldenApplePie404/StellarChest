// 星灵 · AI 主界面（千问风格 × 少女动漫视觉）
// 左：会话列表 + 创作入口；中：大标题首页 + 居中输入 + 模态工具 + 对话流
'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Card from '@/components/ui/Card';
import StellarIcon from '@/components/StellarIcon';
import { AI_PRESETS, AI_MODALITY_LABELS, getDefaultForModality, type AIModality } from '@/lib/ai-presets';
import type { AIChatMessage, AIMediaAttachment, AIGenerateProgress, RagSource } from '@/types/ai';

/** 会话 */
interface Session {
  id: string;
  title: string;
  messages: AIChatMessage[];
  updatedAt: number;
}

/** 产出模式 */
const MODES: { key: AIModality; label: string; icon: string; desc: string }[] = [
  { key: 'chat', label: '对话', icon: 'fa-comments', desc: '任意问题，我来回答' },
  { key: 'image', label: '文生图', icon: 'fa-image', desc: '描述画面，生成画作' },
  { key: 'music', label: '文生乐', icon: 'fa-music', desc: '描述风格，生成音乐' },
  { key: 'video', label: '文生视频', icon: 'fa-video', desc: '描述镜头，生成视频' },
  { key: 'voice', label: '语音', icon: 'fa-microphone', desc: '输入文本，生成语音' },
];

/** 各模态输入框占位符 */
const PLACEHOLDERS: Record<AIModality, string> = {
  chat: '输入消息，Enter 发送，Shift+Enter 换行',
  image: '描述你想要的画面，例如：星空下的少女，赛博朋克风格，4k',
  music: '描述音乐风格与主题，例如：治愈系钢琴曲，适合 galgame 清晨场景',
  video: '描述镜头与画面，例如：第一人称穿过森林，电影感，暖色调',
  voice: '输入要朗读的文本，例如：欢迎来到星辰下的约定',
};

/** 系统提示预设 */
const SYSTEM_PRESETS: { label: string; prompt: string }[] = [
  { label: '剧本生成', prompt: '你是资深 galgame 剧本作家，擅长用「一句话描述 + 角色台词 + 舞台提示」的结构产出治愈系/悬疑系视觉小说脚本。' },
  { label: '角色设定', prompt: '你是角色设计师，请为视觉小说生成详尽的角色卡：姓名、性格、外貌、背景故事、台词风格。' },
  { label: '灵感脑暴', prompt: '你是创意脑暴伙伴，给出天马行空但可落地的 galgame 企划点子与分支路线。' },
];

const SESSION_KEY = 'stellar_ai_sessions_v2';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('galgame_token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** 行内格式（**粗** *斜* `码`） */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<code key={key++} className="px-1 rounded bg-[var(--lavender-pale)] text-[var(--lavender)] text-[0.85em]">{m[3]}</code>);
    else if (m[4] !== undefined) nodes.push(<em key={key++}>{m[4]}</em>);
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** 富文本（标题/列表/行内） */
function renderRichText(text: string): ReactNode[] {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let listBuf: string[] = [];
  let key = 0;
  const flushList = (): void => {
    if (listBuf.length) {
      out.push(
        <ul key={key++} className="list-disc pl-5 my-1 space-y-0.5">
          {listBuf.map((it, i) => <li key={i}>{renderInline(it)}</li>)}
        </ul>,
      );
      listBuf = [];
    }
  };
  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (h) {
      flushList();
      const level = (h[1] ?? '').length;
      const cls = level === 1 ? 'text-lg font-bold mt-2' : level === 2 ? 'text-base font-semibold mt-2' : 'text-sm font-semibold mt-1';
      out.push(<div key={key++} className={cls}>{renderInline(h[2] ?? '')}</div>);
    } else if (li) {
      listBuf.push(li[1] ?? '');
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      out.push(<div key={key++} className="my-0.5">{renderInline(line)}</div>);
    }
  }
  flushList();
  return out;
}

/** 代码块渲染 */
function CodeBlock({ lang, code }: { lang: string; code: string }): ReactNode {
  return (
    <div className="my-2 rounded-lg overflow-hidden border border-[var(--sakura-light)]/30 bg-[#1E1E2E]">
      <div className="px-3 py-1 text-[11px] text-white/50 bg-white/5">{lang || 'code'}</div>
      <pre className="p-3 overflow-x-auto text-[13px] leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

/** Markdown 渲染（代码块 + 富文本） */
function renderMarkdown(text: string): ReactNode {
  const parts = text.split(/```(\w*)\n([\s\S]*?)```/g);
  const nodes: ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    const prose = parts[i] ?? '';
    if (prose.trim()) nodes.push(<div key={`p${i}`}>{renderRichText(prose)}</div>);
    const lang = parts[i + 1] ?? '';
    const code = parts[i + 2];
    if (code !== undefined) nodes.push(<CodeBlock key={`c${i}`} lang={lang} code={code} />);
  }
  return <div className="text-sm leading-relaxed">{nodes}</div>;
}

/** 多模态媒体渲染 */
function MediaBlock({ media }: { media: AIMediaAttachment[] }): ReactNode {
  if (!media.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {media.map((m, i) => {
        if (m.kind === 'image') {
          return <img key={i} src={m.url} alt={m.alt ?? '生成图'} className="rounded-xl max-w-full border border-[var(--sakura-light)]/20" />;
        }
        if (m.kind === 'audio') {
          return <audio key={i} src={m.url} controls className="w-full" />;
        }
        if (m.kind === 'video') {
          return <video key={i} src={m.url} controls className="w-full rounded-xl border border-[var(--sakura-light)]/20" />;
        }
        return null;
      })}
    </div>
  );
}

/** 星灵主界面 */
export default function AIPage(): React.JSX.Element {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  /** 待发送的图片附件（dataURL），仅 chat 模态可用 */
  const [attachments, setAttachments] = useState<AIMediaAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<AIModality>('chat');
  const [model, setModel] = useState<string>('deepseek-chat');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [showParams, setShowParams] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [genProgress, setGenProgress] = useState<{ value: number; message?: string } | null>(null);
  const [kbList, setKbList] = useState<{ id: string; name: string }[]>([]);
  const [knowledgeBaseId, setKnowledgeBaseId] = useState<string>('');
  const [agents, setAgents] = useState<{ id: string; name: string; model: string }[]>([]);
  const [agentId, setAgentId] = useState<string>('');
  const [agentToolCalls, setAgentToolCalls] = useState<{ name: string; args: string; result?: string }[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(true);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 加载会话 */
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const arr = JSON.parse(raw) as Session[];
        setSessions(arr);
        const first = arr[0];
        if (first) {
          setActiveId(first.id);
          setMessages(first.messages);
        }
        return;
      } catch { /* ignore */ }
    }
    const s: Session = { id: crypto.randomUUID(), title: '新对话', messages: [], updatedAt: Date.now() };
    setSessions([s]);
    setActiveId(s.id);
  }, []);

  /** 加载知识库列表 + 接收提示词库交接（系统提示 / 插入输入框） */
  useEffect(() => {
    const pending = localStorage.getItem('stellar_pending_system_prompt');
    if (pending) {
      setSystemPrompt(pending);
      localStorage.removeItem('stellar_pending_system_prompt');
    }
    const pendingInsert = localStorage.getItem('stellar_pending_insert');
    if (pendingInsert) {
      setInput(pendingInsert);
      localStorage.removeItem('stellar_pending_insert');
    }
    fetch('/api/ai/knowledge-bases', { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 200) setKbList((j.data as { id: string; name: string }[]).map((k) => ({ id: k.id, name: k.name })));
      })
      .catch(() => { /* ignore */ });
    fetch('/api/ai/agents', { headers: authHeaders() })
      .then((r) => r.json())
      .then((j) => {
        if (j.code === 200) setAgents((j.data as { id: string; name: string; model: string }[]).map((a) => ({ id: a.id, name: a.name, model: a.model })));
      })
      .catch(() => { /* ignore */ });
  }, []);

  /** 切换模态时重置模型为对应默认 */
  useEffect(() => {
    setModel(getDefaultForModality(mode).model);
    setGenProgress(null);
    setAttachments([]); // 附件仅 chat 多模态可用，切模态清空
    if (mode !== 'chat') setAgentId(''); // Agent 仅对话模态可用
  }, [mode]);

  /** 持久化 */
  const persist = useCallback((next: Session[]): void => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }, []);

  /** 更新当前会话消息 */
  const updateCurrent = useCallback((msgs: AIChatMessage[]): void => {
    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.id !== activeId) return s;
        const firstUser = msgs.find((m) => m.role === 'user');
        const title = s.title === '新对话' && firstUser ? firstUser.content.slice(0, 18) : s.title;
        return { ...s, messages: msgs, title, updatedAt: Date.now() };
      });
      persist(next);
      return next;
    });
    setMessages(msgs);
  }, [activeId, persist]);

  /** 自动滚动到底 */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, genProgress]);

  const newChat = (): void => {
    const s: Session = { id: crypto.randomUUID(), title: '新对话', messages: [], updatedAt: Date.now() };
    setSessions((prev) => { const next = [s, ...prev]; persist(next); return next; });
    setActiveId(s.id);
    setMessages([]);
    setInput('');
    setAttachments([]);
    setMode('chat');
    setAgentId('');
    setAgentToolCalls([]);
  };

  const selectSession = (id: string): void => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    setActiveId(id);
    setMessages(s.messages);
    setAgentId('');
    setAgentToolCalls([]);
  };

  const deleteSession = (id: string): void => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persist(next);
      if (id === activeId) {
        setActiveId(next[0]?.id ?? null);
        setMessages(next[0]?.messages ?? []);
      }
      return next;
    });
  };

  /** 把图片文件读成 dataURL 追加到附件 */
  const handleFiles = useCallback((files: FileList | File[]): void => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!arr.length) return;
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        if (url.startsWith('data:image/')) {
          setAttachments((prev) => [...prev, { kind: 'image', url, alt: f.name }]);
        }
      };
      reader.readAsDataURL(f);
    });
  }, []);

  /** 发送（chat 流式 / 其余生成模态 SSE） */
  const send = useCallback(async (): Promise<void> => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || streaming) return;
    const userMsg: AIChatMessage = {
      role: 'user',
      content: text,
      ...(attachments.length ? { media: attachments } : {}),
    };
    const withUser = [...messages, userMsg];
    updateCurrent(withUser);
    setInput('');
    setAttachments([]);
    setStreaming(true);
    setGenProgress(null);

    // ---- 对话模态：走 /api/ai/chat 文本流（支持 Agent 工具编排）----
    if (mode === 'chat') {
      const isAgent = Boolean(agentId);
      const assistantIdx = withUser.length;
      const withAssistant: AIChatMessage[] = [...withUser, { role: 'assistant', content: '' }];
      updateCurrent(withAssistant);
      const reqMessages: AIChatMessage[] = systemPrompt.trim() && !isAgent
        ? [{ role: 'system', content: systemPrompt.trim() }, ...withUser]
        : withUser;
      if (isAgent) setAgentToolCalls([]);
      const controller = new AbortController();
      abortRef.current = controller;
      const body: Record<string, unknown> = { messages: reqMessages, temperature };
      if (isAgent) body.agentId = agentId;
      else { body.model = model; if (knowledgeBaseId) body.knowledgeBaseId = knowledgeBaseId; }
      const tcRecords: { name: string; args: string; result?: string }[] = [];
      const syncToolCalls = (): void => setAgentToolCalls([...tcRecords]);
      let sources: RagSource[] | undefined;
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ message: '请求失败' }));
          throw new Error(err.message || '请求失败');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let acc = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const o = JSON.parse(payload);
              if (o.error) {
                acc += `\n[错误] ${o.error}`;
              } else if (o.delta) {
                acc += o.delta;
              } else if (o.tool_call) {
                const tc = o.tool_call as { name: string; args?: string };
                tcRecords.push({ name: tc.name, args: tc.args ?? '{}' });
                syncToolCalls();
              } else if (o.tool_result) {
                const tr = o.tool_result as { name: string; result?: string };
                const idx = tcRecords.findIndex((x) => x.name === tr.name && x.result === undefined);
                if (idx >= 0) {
                  const rec = tcRecords[idx];
                  if (rec) { rec.result = tr.result ?? ''; syncToolCalls(); }
                }
              } else if (o.sources) {
                sources = o.sources as RagSource[];
              }
            } catch { /* ignore */ }
          }
          const updated = withAssistant.slice();
          updated[assistantIdx] = { role: 'assistant', content: acc, toolCalls: isAgent ? [...tcRecords] : undefined, ...(sources ? { sources } : {}) };
          setMessages(updated);
          updateCurrent(updated);
        }
      } catch (e) {
        const isAbort = e instanceof DOMException && e.name === 'AbortError';
        if (!isAbort) {
          const msg = e instanceof Error ? e.message : '对话失败';
          const updated = withAssistant.slice();
          updated[assistantIdx] = { role: 'assistant', content: `[出错了] ${msg}`, toolCalls: isAgent ? [...tcRecords] : undefined, ...(sources ? { sources } : {}) };
          updateCurrent(updated);
        }
      } finally {
        abortRef.current = null;
        setStreaming(false);
      }
      return;
    }

    // ---- 生成模态：走 /api/ai/generate SSE ----
    const assistantIdx = withUser.length;
    const withAssistant: AIChatMessage[] = [...withUser, { role: 'assistant', content: '生成中…', media: [] }];
    updateCurrent(withAssistant);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ modality: mode, prompt: text, model, options: {} }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ message: '请求失败' }));
        throw new Error(err.message || '请求失败');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalMedia: AIMediaAttachment[] = [];
      let accText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const o = JSON.parse(payload) as AIGenerateProgress;
            if (o.error) {
              accText = `[出错了] ${o.error}`;
            } else if (o.phase === 'done' && o.result) {
              finalMedia = o.result;
              accText = '';
            } else if (o.phase === 'generating') {
              setGenProgress({ value: o.progress ?? 0, message: o.message });
              accText = o.message ?? '生成中…';
            }
          } catch { /* ignore */ }
        }
        const updated = withAssistant.slice();
        updated[assistantIdx] = { role: 'assistant', content: accText, media: finalMedia };
        setMessages(updated);
        updateCurrent(updated);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '生成失败';
      const updated = withAssistant.slice();
      updated[assistantIdx] = { role: 'assistant', content: `[出错了] ${msg}`, media: [] };
      updateCurrent(updated);
    } finally {
      setStreaming(false);
      setGenProgress(null);
    }
  }, [input, streaming, messages, systemPrompt, model, temperature, mode, attachments, updateCurrent]);

  const modelOptions = (AI_PRESETS[mode] ?? []).flatMap((p) =>
    p.models.map((m) => ({ value: m.value, label: `${p.label} · ${m.label}` })),
  );

  const isGenerateMode = mode !== 'chat';
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen bg-[var(--pearl)]">
      {/* 左：会话列表 */}
      <aside className="w-56 shrink-0 flex flex-col p-3 gap-2.5 overflow-y-auto bg-[var(--pearl)]/80 backdrop-blur-md border-r border-[var(--sakura-light)]/20">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--gradient-sakura)' }}>
            <StellarIcon size={18} variant="white" />
          </div>
          <div>
            <div className="font-[var(--font-anime)] font-semibold text-[var(--ink)] text-sm">星灵</div>
            <div className="text-[9px] text-[var(--ink-muted)]">AI 创作助手</div>
          </div>
        </div>

        <button
          onClick={newChat}
          className="gradient-btn flex items-center justify-center gap-2 text-xs py-2"
        >
          <i className="fas fa-plus text-[10px]" /> 新建对话
        </button>

        {/* 历史会话（可折叠，默认展开） */}
        <div className="rounded-xl border border-[var(--sakura-light)]/20 bg-white/40 overflow-hidden">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between px-2.5 py-2 text-[10px] font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <i className="fas fa-comment-alt" /> 历史会话
            </span>
            <i className={`fas ${historyOpen ? 'fa-chevron-down' : 'fa-chevron-right'} text-[9px] transition-transform`} />
          </button>
          {historyOpen && (
            <div className="space-y-1 px-1.5 pb-2 max-h-[42vh] overflow-y-auto">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`group flex items-center justify-between rounded-xl px-2.5 py-2 cursor-pointer text-xs transition-all border ${
                    s.id === activeId
                      ? 'bg-[var(--sakura-pale)] border-[var(--sakura-light)]/50 text-[var(--sakura-dark)] shadow-sm'
                      : 'bg-white/40 border-transparent hover:bg-white/70 text-[var(--ink)] hover:border-[var(--sakura-light)]/30'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <i className={`fas fa-comment-alt text-xs ${s.id === activeId ? 'text-[var(--sakura)]' : 'text-[var(--ink-muted)]'}`} />
                    <span className="truncate">{s.title || '新对话'}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                    title="删除"
                  >
                    <i className="fas fa-trash-alt text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 创作工具（可折叠，默认折叠，位置上移） */}
        <div className="rounded-xl border border-[var(--sakura-light)]/20 bg-white/40 overflow-hidden">
          <button
            onClick={() => setToolsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-2.5 py-2 text-[10px] font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <i className="fas fa-toolbox" /> 创作工具
            </span>
            <i className={`fas ${toolsOpen ? 'fa-chevron-down' : 'fa-chevron-right'} text-[9px] transition-transform`} />
          </button>
          {toolsOpen && (
            <div className="space-y-1 px-1.5 pb-2">
              <button onClick={() => router.push('/ai/prompts')} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--ink)] hover:bg-white/60 transition-colors">
                <i className="fas fa-bookmark text-[var(--sakura)]" /> 提示词库
              </button>
              <button onClick={() => router.push('/ai/knowledge')} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--ink)] hover:bg-white/60 transition-colors">
                <i className="fas fa-book text-[var(--lavender)]" /> 知识库
              </button>
              <button onClick={() => router.push('/ai/mcp')} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--ink)] hover:bg-white/60 transition-colors">
                <i className="fas fa-plug text-[var(--sky)]" /> MCP 连接器
              </button>
              <button onClick={() => router.push('/ai/agents')} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--ink)] hover:bg-white/60 transition-colors">
                <i className="fas fa-robot text-[var(--sakura)]" /> Agent
              </button>
              <button onClick={() => router.push('/ai/settings')} className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--ink)] hover:bg-white/60 transition-colors">
                <i className="fas fa-cog text-[var(--sky)]" /> 配置中心
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 中：主区域 */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* 背景装饰 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[var(--sakura-pale)]/40 blur-3xl" />
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-[var(--lavender-pale)]/40 blur-3xl" />
        </div>

        {/* 消息流（非空时显示） */}
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto px-4 py-6 z-10 ${isEmpty ? 'hidden' : 'block'}`}
        >
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white mr-2.5 shrink-0" style={{ background: 'var(--gradient-sakura)' }}>
                    <StellarIcon size={15} variant="white" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2.5 shadow-sm ${
                    m.role === 'user'
                      ? 'text-white rounded-br-md'
                      : 'bg-white/80 backdrop-blur-sm border border-[var(--sakura-light)]/20 text-[var(--ink)] rounded-bl-md'
                  }`}
                  style={m.role === 'user' ? { background: 'var(--gradient-sakura)' } : undefined}
                >
                  {m.role === 'user' ? (
                    <>
                      {m.media && m.media.length > 0 && <MediaBlock media={m.media} />}
                      {m.content && <span className="whitespace-pre-wrap text-sm">{m.content}</span>}
                    </>
                  ) : m.media && m.media.length ? (
                    <MediaBlock media={m.media} />
                  ) : (
                    renderMarkdown(
                      m.content || (streaming && i === messages.length - 1 && mode === 'chat' ? '思考中…' : ''),
                    )
                  )}
                  {m.role !== 'user' && m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--sakura-light)]/20 space-y-1.5">
                      <div className="text-[10px] font-semibold text-[var(--ink-muted)] flex items-center gap-1">
                        <i className="fas fa-robot" /> 工具调用
                      </div>
                      {m.toolCalls.map((t, ti) => (
                        <div key={ti} className="text-[11px] flex items-start gap-1.5">
                          <i className={`fas fa-wrench mt-0.5 shrink-0 ${t.result !== undefined ? 'text-emerald-500' : 'text-[var(--sakura)]'}`} />
                          <div className="min-w-0 flex-1">
                            <code className="text-[var(--sakura-dark)] break-all">{t.name}</code>
                            {t.result !== undefined && (
                              <details className="mt-0.5 group rounded-md bg-black/[0.03] border border-[var(--sakura-light)]/20">
                                <summary className="cursor-pointer list-none px-1.5 py-1 text-[10px] text-[var(--ink-muted)] flex items-center gap-1">
                                  <i className="fas fa-chevron-down text-[9px] opacity-50 group-open:hidden" />
                                  <i className="fas fa-chevron-up text-[9px] opacity-50 hidden group-open:block" />
                                  工具返回（{t.result.length} 字）
                                </summary>
                                <div className="px-1.5 pb-1.5 whitespace-pre-wrap break-all text-[10px] max-h-40 overflow-y-auto">{t.result}</div>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {m.role !== 'user' && m.sources && m.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--sakura-light)]/20">
                      <div className="text-[10px] font-semibold text-[var(--ink-muted)] flex items-center gap-1 mb-1.5">
                        <i className="fas fa-book-open" /> 引用来源
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {m.sources.map((s, si) => (
                          <details key={s.id || si} className="group rounded-lg bg-black/[0.03] border border-[var(--sakura-light)]/20 px-2 py-1.5">
                            <summary className="text-[11px] font-medium text-[var(--sakura-dark)] cursor-pointer list-none flex items-center gap-1.5">
                              <i className="fas fa-quote-right text-[10px] opacity-70" />
                              <span className="truncate">{s.docTitle}</span>
                              <i className="fas fa-chevron-down text-[9px] ml-auto opacity-50 group-open:hidden" />
                              <i className="fas fa-chevron-up text-[9px] ml-auto opacity-50 hidden group-open:block" />
                            </summary>
                            <p className="text-[10px] text-[var(--ink-muted)] mt-1 whitespace-pre-wrap break-all">{s.snippet}</p>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 异步生成进度条 */}
            {genProgress && isGenerateMode && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/80 backdrop-blur-sm border border-[var(--sakura-light)]/20">
                  <div className="text-xs text-[var(--ink-muted)] mb-1.5">{genProgress.message ?? '生成中…'}</div>
                  <div className="h-2 bg-[var(--sakura-pale)] rounded-full overflow-hidden w-64">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, Math.min(100, genProgress.value))}%`, background: 'var(--gradient-sakura)' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 空状态首页（千问风格） */}
        {isEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center z-10 px-6 pb-20">
            <div className="animate-float mb-4">
              <div className="w-14 h-14 rounded-[22px] flex items-center justify-center text-white shadow-lg" style={{ background: 'var(--gradient-sakura)' }}>
                <StellarIcon size={30} variant="white" />
              </div>
            </div>
            <h1 className="h1 text-2xl md:text-3xl mb-2" style={{ background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%', animation: 'gradientShift 6s ease infinite' }}>
              你好，我是星灵
            </h1>
            <p className="text-[var(--ink-muted)] text-xs md:text-sm mb-6">你的 Galgame 创作 AI 助手，陪你写剧本、画角色、谱音乐。</p>
          </div>
        )}

        {/* 输入区（底部固定） */}
        <div className={`z-20 px-4 pb-6 pt-2 ${isEmpty ? '' : 'bg-gradient-to-t from-[var(--pearl)] via-[var(--pearl)]/90 to-transparent'}`}>
          <div className="max-w-3xl mx-auto">
            {/* Agent 工具调用实时状态条 */}
            {agentToolCalls.length > 0 && (
              <div className="mb-2 glass-card rounded-xl px-3 py-2 flex flex-wrap gap-x-3 gap-y-1 items-center">
                <span className="text-[10px] font-semibold text-[var(--ink-muted)] flex items-center gap-1 shrink-0">
                  <i className="fas fa-robot text-[var(--sakura)]" /> 工具编排
                </span>
                {agentToolCalls.map((t, i) => (
                  <span key={i} className="text-[11px] flex items-center gap-1.5">
                    <i className={`fas ${t.result !== undefined ? 'fa-check-circle text-emerald-500' : 'fa-spinner fa-spin text-[var(--sakura)]'}`} />
                    <code className="text-[var(--sakura-dark)] break-all">{t.name}</code>
                  </span>
                ))}
              </div>
            )}

            {/* 模态工具按钮 */}
            <div className="flex justify-center gap-1.5 mb-2 flex-wrap">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border ${
                    mode === m.key
                      ? 'bg-white border-[var(--sakura)]/40 text-[var(--sakura-dark)] shadow-sm'
                      : 'bg-white/60 border-transparent text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)]'
                  }`}
                  title={m.desc}
                >
                  <i className={`fas ${m.icon} ${mode === m.key ? 'text-[var(--sakura)]' : ''}`} />
                  {m.label}
                </button>
              ))}
            </div>

            {/* 大输入框卡片 + 参数弹层（relative 锚定） */}
            <div className="relative">
              <div className="glass-card rounded-2xl p-1 shadow-lg hover:shadow-xl transition-shadow">
                <div className="bg-white/60 rounded-xl p-2.5 md:p-3">
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {attachments.map((a, i) => (
                        <div key={i} className="group relative w-14 h-14 rounded-lg overflow-hidden border border-[var(--sakura-light)]/30">
                          <img src={a.url} alt={a.alt ?? '附件'} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[9px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="移除"
                          >
                            <i className="fas fa-times" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items;
                      if (!items) return;
                      const imgs: File[] = [];
                      for (const it of items) {
                        if (it.type.startsWith('image/')) {
                          const f = it.getAsFile();
                          if (f) imgs.push(f);
                        }
                      }
                      if (imgs.length) { e.preventDefault(); handleFiles(imgs); }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
                    }}
                    rows={isEmpty ? 3 : 2}
                    placeholder={PLACEHOLDERS[mode]}
                    className="w-full resize-none bg-transparent outline-none text-[var(--ink)] text-sm placeholder:text-[var(--ink-muted)]/60"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
                  />
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-2">
                      {mode === 'chat' && (
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] transition-all border border-[var(--sakura-light)]/30 text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)]"
                          title="发送图片，让 AI 看图理解（视觉模型如 Echo-1.5-Pro）"
                        >
                          <i className="fas fa-image" /> 图片
                        </button>
                      )}
                      <button
                        onClick={() => setShowParams((v) => !v)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] transition-all border ${
                          showParams
                            ? 'bg-[var(--sakura-pale)] border-[var(--sakura)] text-[var(--sakura-dark)] ring-2 ring-[var(--sakura)]/30'
                            : 'bg-white/60 border-[var(--sakura-light)]/30 text-[var(--ink-muted)] hover:bg-white hover:text-[var(--ink)]'
                        }`}
                      >
                        <i className="fas fa-sliders-h" /> 参数
                      </button>
                      <span className="text-[10px] text-[var(--ink-muted)] hidden sm:inline">
                        当前：<strong className="text-[var(--sakura-dark)]">{AI_MODALITY_LABELS[mode]}</strong>
                      </span>
                    </div>
                    {mode === 'chat' && streaming ? (
                      <Button
                        variant="primary"
                        onClick={() => abortRef.current?.abort()}
                        className="rounded-full px-4 !bg-red-500 !border-red-500 hover:!bg-red-600"
                      >
                        <i className="fas fa-stop mr-1.5" /> 停止
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => void send()}
                        loading={streaming}
                        disabled={!input.trim() && attachments.length === 0}
                        className="rounded-full px-4"
                      >
                        <i className={`fas ${streaming ? 'fa-spinner fa-spin' : 'fa-paper-plane'} mr-1.5`} />
                        {streaming ? '生成中' : isGenerateMode ? '生成' : '发送'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 参数弹层：玻璃拟态 popover，锚定输入框上方滑出 */}
              {showParams && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowParams(false)} />
                  <div className="absolute bottom-full left-0 mb-3 z-40 w-[300px] max-w-[88vw] bg-white/85 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-[var(--sakura-light)]/40 animate-fade-up">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-[var(--sakura-dark)] font-semibold text-sm">
                        <i className="fas fa-sliders-h" /> 参数设置
                      </div>
                      <button
                        onClick={() => setShowParams(false)}
                        className="w-7 h-7 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                        title="关闭"
                      >
                        <i className="fas fa-times text-xs" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5">模型</div>
                        <Select options={modelOptions} value={model} onChange={setModel} />
                      </div>

                      {mode === 'chat' && (
                        <div>
                          <div className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5">Agent 智能体</div>
                          <Select
                            options={[{ value: '', label: '普通对话（不启用 Agent）' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
                            value={agentId}
                            onChange={(v) => setAgentId(v)}
                          />
                          {agentId && (
                            <div className="text-[10px] text-[var(--ink-muted)] mt-1">已启用 Agent：将按其角色与工具集进行多步编排，本会话的模型/知识库挂载由 Agent 配置接管。</div>
                          )}
                        </div>
                      )}

                      {mode === 'chat' && (
                        <div>
                          <div className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5">挂载知识库</div>
                          <Select
                            options={[{ value: '', label: '不挂载' }, ...kbList.map((k) => ({ value: k.id, label: k.name }))]}
                            value={knowledgeBaseId}
                            onChange={setKnowledgeBaseId}
                          />
                        </div>
                      )}

                      {mode === 'chat' && (
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-semibold text-[var(--ink)]">温度</span>
                            <span className="text-[var(--sakura-dark)] font-semibold">{temperature.toFixed(1)}</span>
                          </div>
                          <input
                            type="range" min={0} max={1} step={0.1}
                            value={temperature}
                            onChange={(e) => setTemperature(Number(e.target.value))}
                            className="w-full accent-[var(--sakura)]"
                          />
                          <div className="flex justify-between text-[10px] text-[var(--ink-muted)] mt-1">
                            <span>精确</span><span>创意</span>
                          </div>
                        </div>
                      )}

                      {mode === 'chat' && (
                        <div>
                          <div className="text-xs font-semibold text-[var(--ink-muted)] mb-1.5">系统提示预设</div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {SYSTEM_PRESETS.map((p) => (
                              <button
                                key={p.label}
                                onClick={() => setSystemPrompt(p.prompt)}
                                className="text-xs px-3 py-1.5 rounded-full bg-white/60 border border-[var(--sakura-light)]/30 text-[var(--ink-light)] hover:bg-[var(--sakura-pale)] hover:text-[var(--sakura-dark)] hover:border-[var(--sakura-light)] transition-colors"
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            rows={3}
                            placeholder="可选：为本次对话设定角色/风格（留空则无系统提示）"
                            className="w-full resize-none rounded-xl bg-white/70 border border-[var(--sakura-light)]/30 px-3 py-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--sakura)]"
                          />
                        </div>
                      )}

                      {isGenerateMode && (
                        <div className="text-xs text-[var(--ink-muted)] leading-relaxed bg-[var(--sakura-pale)]/50 rounded-xl p-3 border border-[var(--sakura-light)]/20">
                          当前为「{AI_MODALITY_LABELS[mode]}」生成模式。请先在 <button onClick={() => router.push('/ai/settings')} className="text-[var(--sakura)] hover:underline">配置中心</button> 填写对应 API Key，再输入提示词生成。
                          {mode === 'music' || mode === 'video' ? ' 该模态为异步生成，会实时显示进度。' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="text-center mt-3 text-[10px] text-[var(--ink-muted)]/60">
              多模态创作 · MCP 工具编排 · Agent 智能体编排已就绪
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
