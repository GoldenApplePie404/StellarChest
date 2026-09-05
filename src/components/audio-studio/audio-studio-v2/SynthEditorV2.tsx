// ============================================================
// SynthEditorV2 — ADSR + 滤波器 + 振荡器编辑器
// ============================================================
'use client';

import type { SynthConfig } from '@/store/useSimpleDawStore';
import { simpleAudioEngine } from '@/engine/SimpleAudioEngine';

interface Props {
  channelId: string;
  config: SynthConfig;
  onChange: (c: SynthConfig) => void;
}

export default function SynthEditorV2({ channelId, config, onChange }: Props): React.JSX.Element {
  const OSC_TYPES = ['sine','square','triangle','sawtooth'] as const;
  const FILTER_TYPES = ['lowpass','highpass','bandpass'] as const;
  const colors = { border: 'rgba(200,162,232,0.12)', accent: '#FF6B9D', text: '#F5E6FF', dim: '#C4B5D9', faint: '#6A5A7D' };

  const update = (patch: Partial<SynthConfig>) => {
    const next = { ...config, ...patch };
    onChange(next);
    simpleAudioEngine.applySynthConfig(channelId, next);
  };

  const slider = (label: string, key: keyof SynthConfig, min: number, max: number, step: number, log = false) => (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[9px]"><span className="uppercase" style={{ color: colors.faint }}>{label}</span><span className="tabular-nums" style={{ color: colors.dim }}>{log ? `${((config[key] as number)||0).toFixed(2)}s` : `${Math.round((config[key] as number)||0)}`}{key.startsWith('filter') ? (key==='filterCutoff'?'Hz':'') : ''}</span></div>
      <input type="range" min={min} max={max} step={step} value={config[key] as number}
        onChange={e => update({ [key]: parseFloat(e.target.value) } as any)}
        className="w-full h-1 accent-pink-400"/>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 p-3 text-[11px]" style={{ backgroundColor: '#120822', border: `1px solid ${colors.border}`, borderRadius: 6 }}>
      <div className="flex items-center justify-between">
        <span className="font-semibold tracking-wider uppercase text-white/40">Synth Editor</span>
        <select value={config.oscillatorType} onChange={e => update({ oscillatorType: e.target.value as any })}
          className="text-[10px] px-2 py-0.5 rounded border outline-none" style={{ background: '#1A0A2E', borderColor: colors.border, color: colors.text }}>
          {OSC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {slider('Attack', 'attack', 0.001, 1, 0.001, true)}
        {slider('Decay', 'decay', 0.001, 2, 0.001, true)}
        {slider('Sustain', 'sustain', 0, 1, 0.01)}
        {slider('Release', 'release', 0.001, 3, 0.001, true)}
      </div>

      <div className="border-t pt-3 grid grid-cols-3 gap-3" style={{ borderColor: colors.border }}>
        {slider('Cutoff', 'filterCutoff', 20, 20000, 1)}
        {slider('Resonance', 'filterResonance', 0.1, 20, 0.1)}
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase" style={{ color: colors.faint }}>Filter</span>
          <select value={config.filterType} onChange={e => update({ filterType: e.target.value as any })}
            className="text-[10px] px-2 py-0.5 rounded border outline-none" style={{ background: '#1A0A2E', borderColor: colors.border, color: colors.text }}>
            {FILTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
