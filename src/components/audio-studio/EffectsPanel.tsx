// ============================================================
// EffectsPanel — 效果器插槽面板 (每个 Mixer 通道可独立管理)
// ============================================================
'use client';

import { useCallback, useMemo } from 'react';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import type { EffectSlot } from '@/types/audio-studio';

/** 效果器中文名称映射 */
const EFFECT_LABELS: Record<EffectSlot['type'], string> = {
  reverb: '混响',
  delay: '延迟',
  chorus: '合唱',
  compressor: '压缩器',
  distortion: '失真',
  filter: '滤波器',
};

/** 效果器参数定义 (label, min, max, step) */
interface EffectParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

const EFFECT_PARAMS: Record<EffectSlot['type'], EffectParamDef[]> = {
  reverb: [
    { key: 'decay', label: '衰减', min: 0.1, max: 10, step: 0.1 },
    { key: 'wet', label: '湿声', min: 0, max: 1, step: 0.01 },
  ],
  delay: [
    { key: 'delayTime', label: '延迟时间', min: 0.05, max: 1, step: 0.01 },
    { key: 'feedback', label: '反馈', min: 0, max: 0.9, step: 0.01 },
    { key: 'wet', label: '湿声', min: 0, max: 1, step: 0.01 },
  ],
  chorus: [
    { key: 'frequency', label: '频率', min: 0.1, max: 10, step: 0.1 },
    { key: 'delayTime', label: '延迟时间', min: 1, max: 50, step: 1 },
    { key: 'depth', label: '深度', min: 0, max: 1, step: 0.01 },
  ],
  compressor: [
    { key: 'threshold', label: '阈值', min: -60, max: 0, step: 1 },
    { key: 'ratio', label: '比率', min: 1, max: 20, step: 0.5 },
    { key: 'attack', label: '启动', min: 0, max: 0.5, step: 0.001 },
    { key: 'release', label: '释放', min: 0, max: 0.5, step: 0.001 },
  ],
  distortion: [
    { key: 'distortion', label: '失真度', min: 0, max: 1, step: 0.01 },
  ],
  filter: [
    { key: 'frequency', label: '频率', min: 20, max: 20000, step: 1 },
    { key: 'Q', label: 'Q值', min: 0.1, max: 10, step: 0.1 },
  ],
};

interface EffectsPanelProps {
  /** 混音台通道 ID */
  channelId: string;
}

export default function EffectsPanel({ channelId }: EffectsPanelProps): React.JSX.Element {
  const mixerChannels = useAudioStudioStore((s) => s.mixerChannels);
  const addEffectToChannel = useAudioStudioStore((s) => s.addEffectToChannel);
  const removeEffectFromChannel = useAudioStudioStore((s) => s.removeEffectFromChannel);
  const updateEffectParams = useAudioStudioStore((s) => s.updateEffectParams);
  const toggleEffectEnabled = useAudioStudioStore((s) => s.toggleEffectEnabled);

  const channel = useMemo(
    () => mixerChannels.find((ch) => ch.id === channelId),
    [mixerChannels, channelId],
  );

  const effects = channel?.effects || [];

  /** 添加效果器 */
  const handleAddEffect = useCallback(
    (type: EffectSlot['type']) => {
      addEffectToChannel(channelId, type);
    },
    [addEffectToChannel, channelId],
  );

  /** 删除效果器 */
  const handleRemoveEffect = useCallback(
    (effectId: string) => {
      removeEffectFromChannel(channelId, effectId);
    },
    [removeEffectFromChannel, channelId],
  );

  /** 切换启用 */
  const handleToggleEffect = useCallback(
    (effectId: string) => {
      toggleEffectEnabled(channelId, effectId);
    },
    [toggleEffectEnabled, channelId],
  );

  /** 参数变更 */
  const handleParamChange = useCallback(
    (effectId: string, key: string, value: number) => {
      updateEffectParams(channelId, effectId, { [key]: value });
    },
    [updateEffectParams, channelId],
  );

  /** 上移效果器 */
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const store = useAudioStudioStore.getState();
      const ch = store.mixerChannels.find((c) => c.id === channelId);
      if (!ch) return;
      const newEffects = [...ch.effects];
      const a = newEffects[index];
      const b = newEffects[index - 1];
      if (!a || !b) return;
      newEffects[index - 1] = a;
      newEffects[index] = b;
      useAudioStudioStore.setState({
        mixerChannels: store.mixerChannels.map((c) =>
          c.id === channelId ? { ...c, effects: newEffects } : c,
        ),
      });
    },
    [channelId],
  );

  /** 下移效果器 */
  const handleMoveDown = useCallback(
    (index: number) => {
      const store = useAudioStudioStore.getState();
      const ch = store.mixerChannels.find((c) => c.id === channelId);
      if (!ch) return;
      const newEffects = [...ch.effects];
      if (index >= newEffects.length - 1) return;
      const a = newEffects[index];
      const b = newEffects[index + 1];
      if (!a || !b) return;
      newEffects[index + 1] = a;
      newEffects[index] = b;
      useAudioStudioStore.setState({
        mixerChannels: store.mixerChannels.map((c) =>
          c.id === channelId ? { ...c, effects: newEffects } : c,
        ),
      });
    },
    [channelId],
  );

  if (!channel) {
    return (
      <div className="px-2 py-3 text-ink-faint text-[10px] text-center">
        未选择通道
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* 添加效果器按钮 */}
      <div className="flex items-center gap-1 px-1">
        <span className="text-[10px] text-ink-faint">效果器</span>
        <div className="relative group ml-auto">
          <button className="px-1.5 py-0.5 rounded text-[10px] bg-lavender-pale text-ink-light hover:bg-lavender-light transition-colors">
            + 添加
          </button>
          <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block min-w-[120px]">
            <div className="bg-cloud border border-lavender-pale rounded-lg shadow-lg py-1 overflow-hidden">
              {(Object.keys(EFFECT_LABELS) as EffectSlot['type'][]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddEffect(type)}
                  className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-sakura-pale transition-colors"
                >
                  {EFFECT_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 效果器列表 */}
      <div className="flex flex-col gap-1 px-1 max-h-60 overflow-y-auto">
        {effects.length === 0 && (
          <div className="text-[9px] text-ink-faint text-center py-2">
            暂无效果器
          </div>
        )}

        {effects.map((effect, index) => {
          const params = EFFECT_PARAMS[effect.type] || [];
          return (
            <div
              key={effect.id}
              className={`border rounded-lg p-1.5 transition-colors ${
                effect.enabled
                  ? 'border-lavender-pale bg-cloud/50'
                  : 'border-lavender-pale/30 bg-cloud/20 opacity-50'
              }`}
            >
              {/* 效果器头部 */}
              <div className="flex items-center gap-1 mb-1">
                {/* 启用开关 */}
                <button
                  onClick={() => handleToggleEffect(effect.id)}
                  className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                    effect.enabled
                      ? 'bg-sakura border-sakura'
                      : 'bg-ink/5 border-lavender-pale'
                  }`}
                  title={effect.enabled ? '禁用' : '启用'}
                />
                {/* 名称 */}
                <span className="text-[10px] text-ink font-medium flex-1 truncate">
                  {EFFECT_LABELS[effect.type]}
                </span>
                {/* 排序按钮 */}
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-ink-faint hover:text-ink disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                  title="上移"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === effects.length - 1}
                  className="text-ink-faint hover:text-ink disabled:opacity-20 disabled:cursor-not-allowed p-0.5"
                  title="下移"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {/* 删除 */}
                <button
                  onClick={() => handleRemoveEffect(effect.id)}
                  className="text-ink-faint hover:text-sakura-dark p-0.5"
                  title="删除"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>

              {/* 参数控制 */}
              <div className="space-y-0.5">
                {params.map((param) => (
                  <div key={param.key} className="flex items-center gap-1">
                    <span className="text-[9px] text-ink-faint w-10 flex-shrink-0">
                      {param.label}
                    </span>
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      step={param.step}
                      value={effect.params[param.key] ?? param.min}
                      onChange={(e) =>
                        handleParamChange(effect.id, param.key, Number(e.target.value))
                      }
                      className="flex-1 h-1 accent-sakura cursor-pointer"
                      style={{ height: '3px' }}
                    />
                    <span className="text-[9px] text-ink-faint font-mono w-10 text-right">
                      {param.step < 1
                        ? Number(effect.params[param.key] ?? param.min).toFixed(
                            param.step < 0.01 ? 3 : param.step < 0.1 ? 2 : 1,
                          )
                        : Math.round(effect.params[param.key] ?? param.min)}
                    </span>
                  </div>
                ))}

                {/* Filter type select */}
                {effect.type === 'filter' && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] text-ink-faint w-10 flex-shrink-0">类型</span>
                    <select
                      value={(effect.params as any).type || 'lowpass'}
                      onChange={(e) => {
                        updateEffectParams(channelId, effect.id, { type: e.target.value } as any);
                      }}
                      className="flex-1 px-1 py-0.5 rounded text-[9px] border border-lavender-pale bg-cloud text-ink focus:outline-none"
                    >
                      <option value="lowpass">低通</option>
                      <option value="highpass">高通</option>
                      <option value="bandpass">带通</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
