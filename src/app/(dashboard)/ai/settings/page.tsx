// AI 模型配置页（左右布局：左=模态导航，右=选中模态的配置面板）
// 对接 GET|PUT /api/ai/config/[modality] 与 GET /api/ai/presets
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Toast from '@/components/ui/Toast';
import {
  AI_MODALITIES, AI_MODALITY_LABELS, AI_PRESETS,
  type AIModality, type ProviderPreset,
} from '@/lib/ai-presets';

/** 模态图标（与对话页一致） */
const MODALITY_ICONS: Record<AIModality, string> = {
  chat: 'fa-comments',
  image: 'fa-image',
  music: 'fa-music',
  video: 'fa-video',
  voice: 'fa-microphone',
  script_analyze: 'fa-book-open',
};

/** 单模态配置表单值 */
interface ModalityForm {
  provider: string;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  /** 推理思考档位（chat 模态推理模型：''|none=关闭，low/medium/high=开启） */
  reasoningEffort: string;
}

/** 兜底表单（forms 未就绪时避免 undefined） */
const DEFAULT_FORM: ModalityForm = {
  provider: 'deepseek',
  apiEndpoint: '',
  apiKey: '',
  model: '',
  enabled: true,
  reasoningEffort: 'none',
};

/** 推理档位选项 */
const REASONING_OPTIONS: { value: string; label: string }[] = [
  { value: 'low', label: '低（快）' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高（慢但深）' },
];

/** 鉴权头（proxy 会自动注入 x-user-id） */
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('galgame_token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** 单模态配置面板（受控于父级 active，父级用 key 强制 remount 以刷新内部状态） */
function ModalityConfigPanel({
  modality,
  presets,
  initial,
  onSaved,
}: {
  modality: AIModality;
  presets: ProviderPreset[];
  initial: ModalityForm;
  onSaved: (msg: string) => void;
}): React.JSX.Element {
  const [provider, setProvider] = useState<string>(initial.provider);
  const [apiEndpoint, setApiEndpoint] = useState<string>(initial.apiEndpoint);
  const [apiKey, setApiKey] = useState<string>(initial.apiKey);
  const [model, setModel] = useState<string>(initial.model);
  const [enabled, setEnabled] = useState<boolean>(initial.enabled);
  const [reasoningEffort, setReasoningEffort] = useState<string>(initial.reasoningEffort || 'none');
  const [useCustomModel, setUseCustomModel] = useState<boolean>(
    !presets.find((p) => p.provider === initial.provider)?.models.some((m) => m.value === initial.model),
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const currentPreset = presets.find((p) => p.provider === provider);

  /** 切换 Provider：自动带出默认端点、首个模型，及可选的预填 Key（如 Echo-1.5 开发测试 Key） */
  const handleProviderChange = (value: string): void => {
    setProvider(value);
    const preset = presets.find((p) => p.provider === value);
    if (preset) {
      setApiEndpoint(preset.defaultEndpoint);
      setModel(preset.models[0]?.value ?? '');
      if (preset.apiKey) setApiKey(preset.apiKey);
      setUseCustomModel(false);
    }
  };

  /** 填入默认端点 */
  const fillDefaultEndpoint = (): void => {
    if (currentPreset) setApiEndpoint(currentPreset.defaultEndpoint);
  };

  const handleSave = useCallback(async (): Promise<void> => {
    if (!apiEndpoint.trim()) {
      onSaved('请输入 API 端点地址');
      return;
    }
    if (!model.trim()) {
      onSaved('请输入/选择模型名称');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ai/config/${modality}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          provider,
          apiEndpoint: apiEndpoint.trim(),
          apiKey: apiKey.trim(),
          model: model.trim(),
          enabled,
          reasoningEffort,
        }),
      });
      const result = await res.json();
      if (result.code === 200) onSaved(`${AI_MODALITY_LABELS[modality]} 配置已保存`);
      else onSaved(result.message || '保存失败');
    } catch {
      onSaved('请求失败，请检查网络');
    } finally {
      setSaving(false);
    }
  }, [provider, apiEndpoint, apiKey, model, enabled, modality, onSaved]);

  /** 连接测试：用当前表单值（含未保存的 key）验证端点可达 + key 有效 */
  const handleTest = useCallback(async (): Promise<void> => {
    if (!apiEndpoint.trim() || !model.trim()) {
      setTestResult({ ok: false, message: '请先填写 API 端点与模型名称再测试' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`/api/ai/config/${modality}/test`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider,
          apiEndpoint: apiEndpoint.trim(),
          apiKey: apiKey.trim(),
          model: model.trim(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const result = await res.json();
      const data = result.data;
      if (data?.ok) {
        setTestResult({
          ok: true,
          message: `${AI_MODALITY_LABELS[modality]} 连接成功${data.sample ? `：${data.sample}` : ''}`,
        });
      } else {
        const errMsg = (data?.error || '未知错误').toString();
        setTestResult({
          ok: false,
          message: `连接失败：${errMsg.length > 180 ? `${errMsg.slice(0, 180)}…` : errMsg}`,
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setTestResult({ ok: false, message: '连接超时（15 秒），请检查端点地址或网络' });
      } else {
        setTestResult({ ok: false, message: '测试请求失败，请检查网络' });
      }
    } finally {
      setTesting(false);
    }
  }, [provider, apiEndpoint, apiKey, model, modality]);

  const modelOptions = [
    ...(currentPreset?.models.map((m) => ({ value: m.value, label: m.label })) ?? []),
    { value: '__custom__', label: '自定义模型…' },
  ];

  return (
    <div className="space-y-5">
      {/* 标题区 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm"
            style={{ background: 'var(--gradient-sakura)' }}
          >
            <i className={`fas ${MODALITY_ICONS[modality]}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">{AI_MODALITY_LABELS[modality]}</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--sakura-pale)] text-[var(--sakura-dark)]">
              {modality}
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-[var(--sakura)] w-4 h-4"
          />
          启用该模态
        </label>
      </div>

      <div className="h-px bg-[var(--sakura-light)]/20" />

      {/* 表单区 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Provider"
          options={presets.map((p) => ({ value: p.provider, label: p.label }))}
          value={provider}
          onChange={handleProviderChange}
        />

        <div className="sm:col-span-2">
          <Input
            label="API 端点地址"
            value={apiEndpoint}
            onChange={setApiEndpoint}
            placeholder="https://..."
          />
          <button
            type="button"
            onClick={fillDefaultEndpoint}
            className="mt-1 text-xs text-[var(--sakura)] hover:underline"
          >
            填入该 Provider 默认端点
          </button>
        </div>

        <div className="sm:col-span-2">
          <Input
            label="API 密钥"
            type="password"
            value={apiKey}
            onChange={setApiKey}
            placeholder="sk-...（仅你可见，服务端存储）"
          />
        </div>

        <div className="sm:col-span-2">
          {useCustomModel ? (
            <Input
              label="自定义模型名称"
              value={model}
              onChange={setModel}
              placeholder="例如 deepseek-chat"
            />
          ) : (
            <Select
              label="模型"
              options={modelOptions}
              value={model}
              onChange={(v: string) => {
                if (v === '__custom__') setUseCustomModel(true);
                else setModel(v);
              }}
            />
          )}
        </div>

        {/* 推理思考开关（仅 chat 模态的推理模型生效） */}
        {modality === 'chat' && (
          <div className="sm:col-span-2 rounded-xl border border-[var(--sakura-light)]/30 bg-white/40 p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <div className="text-sm font-medium text-[var(--ink)]">启用推理思考</div>
                <div className="text-[11px] text-[var(--ink-muted)]">
                  适用于推理模型（DeepSeek-R1 / 部分兼容端点）；关闭时直接回答更快
                </div>
              </div>
              <input
                type="checkbox"
                checked={reasoningEffort !== '' && reasoningEffort !== 'none'}
                onChange={(e) => setReasoningEffort(e.target.checked ? 'medium' : 'none')}
                className="accent-[var(--sakura)] w-4 h-4"
              />
            </label>
            {reasoningEffort !== '' && reasoningEffort !== 'none' && (
              <Select
                label="思考深度"
                options={REASONING_OPTIONS}
                value={reasoningEffort}
                onChange={setReasoningEffort}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="ghost"
          className="flex-1"
          loading={testing}
          loadingText="测试中…"
          disabled={saving}
          onClick={() => void handleTest()}
        >
          <i className={`fas ${testing ? 'fa-spinner fa-spin' : 'fa-plug'} mr-1.5`} />
          {testing ? '测试中…' : '测试连接'}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          loading={saving}
          disabled={testing}
          onClick={() => void handleSave()}
        >
          {saving ? '保存中…' : `保存「${AI_MODALITY_LABELS[modality]}」配置`}
        </Button>
      </div>

      {/* 连接测试结果（持久显示，不依赖右上角 Toast） */}
      {testResult && (
        <div
          className="mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
          style={
            testResult.ok
              ? { background: 'rgba(152,232,200,0.2)', color: '#157a52', border: '1px solid rgba(152,232,200,0.45)' }
              : { background: 'rgba(255,107,122,0.16)', color: '#c92a4b', border: '1px solid rgba(255,107,122,0.4)' }
          }
        >
          <i className={`fas ${testResult.ok ? 'fa-circle-check' : 'fa-circle-xmark'} mt-0.5`} />
          <span className="leading-relaxed">{testResult.message}</span>
        </div>
      )}
    </div>
  );
}

/** 五模态配置页（左右布局） */
export default function AISettingsPage(): React.JSX.Element {
  const router = useRouter();
  const [active, setActive] = useState<AIModality>('chat');
  const [presets, setPresets] = useState<Record<AIModality, ProviderPreset[]> | null>(null);
  const [forms, setForms] = useState<Record<string, ModalityForm>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const presetsRes = await fetch('/api/ai/presets', { headers: authHeaders() });
        const presetsJson = await presetsRes.json();
        if (presetsJson.code !== 200) throw new Error('预设加载失败');
        setPresets(presetsJson.data.presets);

        const configResults = await Promise.all(
          AI_MODALITIES.map((m) =>
            fetch(`/api/ai/config/${m}`, { headers: authHeaders() }).then((r) => r.json()),
          ),
        );

        const nextForms: Record<string, ModalityForm> = {};
        AI_MODALITIES.forEach((m, i) => {
          const cj = configResults[i];
          const c = cj?.data;
          const def = presetsJson.data.presets[m]?.[0];
          nextForms[m] = {
            provider: c?.provider ?? def?.provider ?? 'openai_compatible',
            apiEndpoint: c?.apiEndpoint ?? def?.defaultEndpoint ?? '',
            apiKey: c?.apiKey ?? def?.apiKey ?? '',
            model: c?.model ?? def?.models?.[0]?.value ?? '',
            enabled: c?.enabled ?? true,
            reasoningEffort: c?.reasoningEffort ?? 'none',
          };
        });
        setForms(nextForms);
      } catch {
        setToast({ message: '配置加载失败，请刷新重试', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="min-h-screen p-8">
      {/* 顶部标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)] mb-1">AI 模型配置</h1>
          <p className="text-[var(--ink-muted)] text-sm">
            为五种模态分别配置 Provider / 端点 / 密钥 / 模型（密钥由你填写，默认端点已预填）
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/ai')}>返回星灵</Button>
      </div>

      {/* 左右布局 */}
      <div className="flex gap-6 max-w-5xl">
        {/* 左：模态导航 */}
        <aside className="w-60 shrink-0">
          <div className="glass-card rounded-2xl p-2 space-y-1">
            {AI_MODALITIES.map((m) => {
              const f = forms[m];
              const enabled = f?.enabled ?? true;
              const isActive = active === m;
              return (
                <button
                  key={m}
                  onClick={() => setActive(m)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all border ${
                    isActive
                      ? 'bg-[var(--sakura-pale)] border-[var(--sakura-light)]/50'
                      : 'border-transparent hover:bg-white/60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                      isActive ? 'text-white' : 'text-[var(--ink-muted)] bg-white/60'
                    }`}
                    style={isActive ? { background: 'var(--gradient-sakura)' } : undefined}
                  >
                    <i className={`fas ${MODALITY_ICONS[m]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isActive ? 'text-[var(--sakura-dark)]' : 'text-[var(--ink)]'}`}>
                      {AI_MODALITY_LABELS[m]}
                    </div>
                    <div className="text-[10px] text-[var(--ink-muted)]">
                      {enabled ? '已启用' : '已停用'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 右：配置面板 */}
        <main className="flex-1 min-w-0">
          {loading || !presets ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-[var(--sakura)]/30 border-t-[var(--sakura)] rounded-full mx-auto mb-3" />
              <div className="text-[var(--ink-muted)] text-sm">加载配置…</div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6">
              <ModalityConfigPanel
                key={active}
                modality={active}
                presets={presets[active]}
                initial={forms[active] ?? DEFAULT_FORM}
                onSaved={(msg) => setToast({ message: msg, type: msg.includes('已保存') ? 'success' : 'error' })}
              />
            </div>
          )}
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
