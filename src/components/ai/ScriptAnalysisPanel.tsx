// 剧本分析面板 —— 上传/粘贴剧本 → AI 分析 → 素材需求卡片
'use client';

import { useState, useRef, useCallback } from 'react';
import Button from '@/components/ui/Button';
import StellarIcon from '@/components/StellarIcon';
import {
  SCENE_ANALYSIS_SYSTEM,
  buildAnalysisUserPrompt,
  parseAnalysisResponse,
  buildAssetRequirements,
  type SceneAnalysisResult,
} from '@/engine/scene-analysis';

/** 分析阶段 */
type AnalysisPhase = 'input' | 'analyzing' | 'done';

/** API 请求辅助 */
function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('galgame_token') || '' : '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

interface ScriptAnalysisPanelProps {
  /** 把提示词填入主输入框 */
  onInsertPrompt?: (text: string) => void;
  /** 获取当前选中的模型 */
  currentModel?: string;
}

export default function ScriptAnalysisPanel({
  onInsertPrompt,
  currentModel = 'deepseek-chat',
}: ScriptAnalysisPanelProps) {
  const [phase, setPhase] = useState<AnalysisPhase>('input');
  const [scriptText, setScriptText] = useState('');
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [result, setResult] = useState<SceneAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'characters' | 'backgrounds' | 'cgs' | 'bgm' | 'sfx' | 'choices'>('characters');
  const [showFullPrompt, setShowFullPrompt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- 上传剧本 ----
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['txt', 'md'].includes(ext)) {
      setError('仅支持 .txt / .md 格式');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      if (text.length < 50) {
        setError('剧本内容太短（至少 50 字）');
        return;
      }
      setScriptText(text);
      setUploadedName(file.name);
      setError(null);
    };
    reader.onerror = () => setError('文件读取失败');
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // ---- 开始分析 ----
  const startAnalysis = useCallback(async () => {
    const text = scriptText.trim();
    if (!text || text.length < 50) {
      setError('请先输入或上传剧本（至少 50 字）');
      return;
    }
    setPhase('analyzing');
    setError(null);
    setResult(null);

    const systemMsg = SCENE_ANALYSIS_SYSTEM;
    const userMsg = buildAnalysisUserPrompt(text);

    try {
      const controller = new AbortController();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
          ],
          model: currentModel,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ message: '请求失败' }));
        throw new Error(err.message || '分析请求失败');
      }

      // 读取流式响应
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

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
            if (o.error) throw new Error(o.error);
            if (o.delta) fullText += o.delta;
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // 解析 JSON
      const scenes = parseAnalysisResponse(fullText);
      if (!scenes.length) {
        throw new Error('AI 未返回有效的场景分析结果，请重试');
      }

      const analysisResult = buildAssetRequirements(scenes);
      setResult(analysisResult);
      setPhase('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '分析失败';
      setError(msg);
      setPhase('input');
    }
  }, [scriptText, currentModel]);

  // ---- 重置 ----
  const reset = useCallback(() => {
    setPhase('input');
    setScriptText('');
    setUploadedName(null);
    setResult(null);
    setError(null);
  }, []);

  // ---- 复制提示词 ----
  const copyPrompt = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }, []);

  // ==================== 输入阶段 JSX ====================
  if (phase === 'input') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center z-10 px-6 pb-16">
        <div className="animate-float mb-4">
          <div
            className="w-14 h-14 rounded-[22px] flex items-center justify-center text-white shadow-lg"
            style={{ background: 'var(--gradient-sakura)' }}
          >
            <i className="fas fa-book-open text-xl" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-[var(--ink)] mb-1">剧本分析</h2>
        <p className="text-[var(--ink-muted)] text-xs mb-6 text-center max-w-md">
          上传或粘贴剧本，AI 将自动分析场景、角色、表情、背景、BGM，并生成 AI 绘图/音乐提示词
        </p>

        {/* 上传按钮 */}
        <div className="flex items-center gap-3 mb-4">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md"
            hidden
            onChange={handleFileUpload}
          />
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            className="rounded-full text-xs gap-2"
          >
            <i className="fas fa-upload" /> 上传剧本 (.txt / .md)
          </Button>
          {uploadedName && (
            <span className="text-xs text-[var(--sakura-dark)] bg-[var(--sakura-pale)] px-2 py-1 rounded-full">
              <i className="fas fa-check-circle mr-1" />
              {uploadedName}
            </span>
          )}
        </div>

        {/* 粘贴区 */}
        <textarea
          value={scriptText}
          onChange={(e) => {
            setScriptText(e.target.value);
            setUploadedName(null);
            setError(null);
          }}
          placeholder={uploadedName
            ? '剧本已加载，可直接分析或继续编辑…'
            : '或直接粘贴剧本内容…\n\n示例格式：\n林川推开了教室的门，夕阳从窗外洒进来。\n"今天又留下来了啊。"\n小明抬起头，露出温和的笑容。"嗯，等你很久了。"'
          }
          rows={10}
          className="w-full max-w-lg rounded-xl p-4 text-sm text-[var(--ink)] bg-white/70 border border-[var(--sakura-light)]/30 outline-none resize-none placeholder:text-[var(--ink-muted)]/50 focus:border-[var(--sakura)] focus:ring-2 focus:ring-[var(--sakura)]/10 transition-all"
        />

        {error && (
          <p className="text-red-500 text-xs mt-2"><i className="fas fa-exclamation-circle mr-1" />{error}</p>
        )}

        <Button
          variant="primary"
          onClick={startAnalysis}
          disabled={!scriptText.trim() || scriptText.trim().length < 50}
          className="mt-4 rounded-full text-sm gap-2"
          style={{ background: 'var(--gradient-sakura)' }}
        >
          <i className="fas fa-magic" /> 开始分析
        </Button>

        <p className="text-[10px] text-[var(--ink-muted)] mt-2">
          分析使用模型：{currentModel}（可在参数中切换）
        </p>
      </div>
    );
  }

  // ==================== 分析中 JSX ====================
  if (phase === 'analyzing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center z-10 px-6 pb-16">
        <div className="animate-spin mb-4">
          <div
            className="w-14 h-14 rounded-[22px] flex items-center justify-center text-white shadow-lg"
            style={{ background: 'var(--gradient-sakura)' }}
          >
            <StellarIcon size={24} variant="white" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-[var(--ink)] mb-1">正在分析剧本…</h2>
        <p className="text-[var(--ink-muted)] text-xs text-center max-w-md">
          AI 正在逐章拆解场景、提取角色和背景信息。
          大段文本可能需要 1-3 分钟，请耐心等待。
        </p>
      </div>
    );
  }

  // ==================== 结果展示 JSX ====================
  if (phase === 'done' && result) {
    const tabs = [
      { key: 'characters' as const, label: '角色立绘', icon: 'fa-user', count: result.characters.length },
      { key: 'backgrounds' as const, label: '背景', icon: 'fa-image', count: result.backgrounds.length },
      { key: 'cgs' as const, label: '事件CG', icon: 'fa-star', count: result.cgs.length },
      { key: 'bgm' as const, label: 'BGM', icon: 'fa-music', count: result.bgm.length },
      { key: 'sfx' as const, label: '音效', icon: 'fa-volume-up', count: result.sfx.length },
      { key: 'choices' as const, label: '分支选项', icon: 'fa-code-branch', count: result.choices.length },
    ];

    return (
      <div className="flex-1 flex flex-col overflow-hidden z-10">
        {/* 摘要横幅 */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[var(--ink)] text-sm">
                <i className="fas fa-check-circle text-emerald-500 mr-1" />
                分析完成
              </h3>
              <Button variant="ghost" onClick={reset} className="text-[10px] !px-2 !py-1 rounded-full">
                <i className="fas fa-redo mr-1" /> 重新分析
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--ink-muted)]">
            <span><i className="fas fa-film mr-1" />{result.meta.totalScenes} 个场景</span>
            <span><i className="fas fa-users mr-1" />{result.meta.characterCount} 个角色</span>
            <span><i className="fas fa-comment mr-1" />{result.meta.totalLines} 句台词</span>
            <span><i className="fas fa-image mr-1" />{result.meta.bgCount} 个背景</span>
            <span><i className="fas fa-music mr-1" />{result.meta.bgmCount} 首 BGM</span>
            {result.meta.choiceSceneCount > 0 && (
              <span><i className="fas fa-code-branch mr-1" />{result.meta.choiceSceneCount} 个分支点</span>
            )}
          </div>
        </div>

        {/* Tab 栏 */}
        <div className="flex gap-1 px-4 border-b border-[var(--sakura-light)]/20 pb-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs transition-all ${
                activeTab === tab.key
                  ? 'bg-white border border-b-white border-[var(--sakura-light)]/30 text-[var(--sakura-dark)] font-medium -mb-[1.5px]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <i className={`fas ${tab.icon}`} />
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] bg-[var(--lavender-pale)] px-1.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {/* ---- 角色立绘 ---- */}
          {activeTab === 'characters' && result.characters.length > 0 && (
            result.characters.map((char) => (
              <div key={char.name} className="bg-white/80 rounded-xl border border-[var(--sakura-light)]/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm text-[var(--ink)]">{char.name}</span>
                    <span className="text-[10px] text-[var(--ink-muted)] ml-2">{char.role}</span>
                  </div>
                  <button
                    onClick={() => {
                      const p = char.sprites.map((s) => s.positivePrompt).join('\n\n---\n\n');
                      copyPrompt(p);
                    }}
                    className="text-[10px] text-[var(--lavender)] hover:text-[var(--sakura)] transition-colors"
                  >
                    <i className="fas fa-copy mr-1" />复制全部提示词
                  </button>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] mb-2">{char.appearance}</p>
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
                  {char.sprites.map((sprite) => (
                    <button
                      key={sprite.expression}
                      onClick={() => setShowFullPrompt(showFullPrompt === `${char.name}_${sprite.expression}` ? null : `${char.name}_${sprite.expression}`)}
                      className="text-left p-2 rounded-lg bg-[var(--lavender-pale)]/60 hover:bg-[var(--lavender-pale)] transition-colors"
                    >
                      <div className="text-[11px] font-medium text-[var(--ink)]">
                        {EXPR_LABEL[sprite.expression] ?? sprite.expression}
                      </div>
                      <div className="text-[9px] text-[var(--ink-muted)] mt-0.5">{sprite.bestUse}</div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyPrompt(sprite.positivePrompt); }}
                          className="text-[9px] px-2 py-0.5 rounded bg-[var(--sakura-pale)] text-[var(--sakura-dark)] hover:bg-[var(--sakura)] hover:text-white transition-colors"
                        >
                          <i className="fas fa-copy mr-0.5" />复制
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertPrompt?.(sprite.positivePrompt);
                          }}
                          className="text-[9px] px-2 py-0.5 rounded bg-[var(--lavender-pale)] text-[var(--lavender)] hover:bg-[var(--lavender)] hover:text-white transition-colors"
                        >
                          <i className="fas fa-paper-plane mr-0.5" />填入
                        </button>
                      </div>
                      {/* 完整 prompt 展示 */}
                      {showFullPrompt === `${char.name}_${sprite.expression}` && (
                        <div
                          className="mt-2 p-2 rounded bg-white/80 border border-[var(--sakura-light)]/20 text-[10px] text-[var(--ink-muted)] break-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {sprite.positivePrompt}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
          {activeTab === 'characters' && result.characters.length === 0 && (
            <EmptyHint text="AI 未识别到角色" />
          )}

          {/* ---- 背景 ---- */}
          {activeTab === 'backgrounds' && result.backgrounds.length > 0 && (
            result.backgrounds.map((bg) => (
              <div key={bg.location} className="bg-white/80 rounded-xl border border-[var(--sakura-light)]/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-[var(--ink)]">{bg.location}</span>
                  <span className="text-[10px] text-[var(--ink-muted)]">用于 {bg.usedInScenes.length} 个场景</span>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] mb-2">{bg.bgDescription}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyPrompt(bg.positivePrompt)}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--sakura-pale)] text-[var(--sakura-dark)] hover:bg-[var(--sakura)] hover:text-white transition-colors"
                  >
                    <i className="fas fa-copy mr-1" />复制提示词
                  </button>
                  <button
                    onClick={() => onInsertPrompt?.(bg.positivePrompt)}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--lavender-pale)] text-[var(--lavender)] hover:bg-[var(--lavender)] hover:text-white transition-colors"
                  >
                    <i className="fas fa-paper-plane mr-1" />填入输入框
                  </button>
                </div>
              </div>
            ))
          )}
          {activeTab === 'backgrounds' && result.backgrounds.length === 0 && (
            <EmptyHint text="AI 未识别到场景背景" />
          )}

          {/* ---- CG ---- */}
          {activeTab === 'cgs' && result.cgs.length > 0 && (
            result.cgs.map((cg) => (
              <div key={cg.cgId} className="bg-white/80 rounded-xl border border-[var(--sakura-light)]/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-[var(--ink)]">
                    {cg.cgId} — {cg.sceneTitle}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] mb-2">{cg.description}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyPrompt(cg.positivePrompt)}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--sakura-pale)] text-[var(--sakura-dark)] hover:bg-[var(--sakura)] hover:text-white transition-colors"
                  >
                    <i className="fas fa-copy mr-1" />复制提示词
                  </button>
                  <button
                    onClick={() => onInsertPrompt?.(cg.positivePrompt)}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--lavender-pale)] text-[var(--lavender)] hover:bg-[var(--lavender)] hover:text-white transition-colors"
                  >
                    <i className="fas fa-paper-plane mr-1" />填入输入框
                  </button>
                </div>
              </div>
            ))
          )}
          {activeTab === 'cgs' && result.cgs.length === 0 && (
            <EmptyHint text="AI 未建议事件 CG" />
          )}

          {/* ---- BGM ---- */}
          {activeTab === 'bgm' && result.bgm.length > 0 && (
            result.bgm.map((track) => (
              <div key={track.mood} className="bg-white/80 rounded-xl border border-[var(--sakura-light)]/20 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="font-semibold text-sm text-[var(--ink)]">{track.label}</span>
                    <span className="text-[10px] text-[var(--ink-muted)] ml-2">{track.mood}</span>
                  </div>
                  <span className="text-[10px] text-[var(--ink-muted)]">
                    用于 {track.sceneCount} 个场景 · {track.sunoGenre}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] mb-2">{track.aiPrompt}</p>
                {track.bestFor && (
                  <p className="text-[10px] text-[var(--ink-muted)] mb-2 italic">
                    <i className="fas fa-lightbulb mr-1 text-[var(--sakura)]" />
                    {track.bestFor}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyPrompt(track.aiPrompt)}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--sakura-pale)] text-[var(--sakura-dark)] hover:bg-[var(--sakura)] hover:text-white transition-colors"
                  >
                    <i className="fas fa-copy mr-1" />复制到 Suno
                  </button>
                  <button
                    onClick={() => onInsertPrompt?.(track.aiPrompt)}
                    className="text-[10px] px-2 py-1 rounded bg-[var(--lavender-pale)] text-[var(--lavender)] hover:bg-[var(--lavender)] hover:text-white transition-colors"
                  >
                    <i className="fas fa-paper-plane mr-1" />填入输入框
                  </button>
                </div>
              </div>
            ))
          )}
          {activeTab === 'bgm' && result.bgm.length === 0 && (
            <EmptyHint text="AI 未识别到 BGM 需求" />
          )}

          {/* ---- 音效 ---- */}
          {activeTab === 'sfx' && result.sfx.length > 0 && (
            <div className="bg-white/80 rounded-xl border border-[var(--sakura-light)]/20 p-3">
              <div className="grid grid-cols-3 gap-2">
                {result.sfx.map((sfx) => (
                  <div key={sfx.sfx} className="text-center p-2 rounded-lg bg-[var(--lavender-pale)]/60">
                    <div className="text-[11px] font-medium text-[var(--ink)]">{sfx.sfx}</div>
                    <div className="text-[9px] text-[var(--ink-muted)]">{sfx.sceneCount} 次</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'sfx' && result.sfx.length === 0 && (
            <EmptyHint text="AI 未识别到音效需求" />
          )}

          {/* ---- 分支选项 ---- */}
          {activeTab === 'choices' && result.choices.length > 0 && (
            result.choices.map((ch) => (
              <div key={ch.sceneId} className="bg-white/80 rounded-xl border border-[var(--sakura-light)]/20 p-3">
                <div className="font-semibold text-sm text-[var(--ink)] mb-2">
                  {ch.sceneId} — {ch.sceneTitle}
                </div>
                <div className="space-y-1.5">
                  {ch.choices.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-[11px] text-[var(--ink-muted)]">
                      <i className="fas fa-circle text-[6px] text-[var(--sakura)]" />
                      <code className="text-[var(--sakura-dark)]">{c.id}</code>
                      {c.text}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          {activeTab === 'choices' && result.choices.length === 0 && (
            <EmptyHint text="未检测到分支选项" />
          )}
        </div>
      </div>
    );
  }

  return null;
}

/** 空状态提示 */
function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-[var(--ink-muted)]">
      <i className="fas fa-inbox text-2xl mb-2 opacity-40" />
      <p className="text-xs">{text}</p>
    </div>
  );
}

/** 表情 key → 中文名速查 */
const EXPR_LABEL: Record<string, string> = {
  default: '默认', happy: '开心', sad: '悲伤', angry: '生气',
  shy: '害羞', surprised: '惊讶', serious: '认真', flustered: '慌张',
  gentle: '温柔', crying: '哭泣', evil: '邪恶笑', pout: '赌气', thinking: '思考',
};
