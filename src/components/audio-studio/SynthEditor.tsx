// ============================================================
// SynthEditor — 合成器参数编辑器 (振荡器/滤波器/ADSR 包络)
// FL Studio 深紫 × 二次元粉嫩风格
// ============================================================
'use client';

import { useCallback, useMemo } from 'react';
import type { SynthConfig } from '@/types/audio-studio';
import useAudioStudioStore from '@/store/useAudioStudioStore';

interface SynthEditorProps {
  patternId: string;
  trackId: string;
  config: SynthConfig;
}

// ─── OSCILLATOR TYPES ───
const OSC_TYPES: { value: SynthConfig['oscillatorType']; label: string }[] = [
  { value: 'sine', label: '正弦' },
  { value: 'square', label: '方波' },
  { value: 'triangle', label: '三角' },
  { value: 'sawtooth', label: '锯齿' },
];

// ─── FILTER TYPES ───
const FILTER_TYPES: { value: SynthConfig['filterType']; label: string }[] = [
  { value: 'lowpass', label: '低通' },
  { value: 'highpass', label: '高通' },
  { value: 'bandpass', label: '带通' },
];

// ============================================================
// ADSR 包络曲线 SVG 生成
// ============================================================
function EnvelopeCurve({ config }: { config: SynthConfig }) {
  const W = 200;
  const H = 40;
  const pad = 4;
  const maxTime = Math.max(config.attack + config.decay + config.release + 0.1, 1);

  const path = useMemo(() => {
    const x0 = pad;
    const y0 = H - pad;
    const totalWidth = W - pad * 2;

    // Attack: ramp up from 0 to 1
    const attackEndX = x0 + (config.attack / maxTime) * totalWidth;
    const attackEndY = pad;

    // Decay: ramp down from 1 to sustain
    const decayEndX = attackEndX + (config.decay / maxTime) * totalWidth;
    const sustainY = H - pad - (config.sustain * (H - pad * 2));

    // Sustain: hold (horizontal line)
    const releaseStartX = decayEndX + ((maxTime - config.attack - config.decay - config.release) / maxTime) * totalWidth;
    // If sustain hold is negative, use decayEndX as releaseStartX
    const releaseStartXFinal = Math.max(releaseStartX, decayEndX);

    // Release: ramp down from sustain to 0
    const releaseEndX = releaseStartXFinal + (config.release / maxTime) * totalWidth;

    return `M ${x0},${y0} L ${attackEndX},${attackEndY} L ${decayEndX},${sustainY} L ${releaseStartXFinal},${sustainY} L ${releaseEndX},${y0}`;
  }, [config, W, H, pad, maxTime]);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      {/* 背景 */}
      <rect x={0} y={0} width={W} height={H} rx={4} fill="rgba(26,10,46,0.6)" />
      {/* 网格线 */}
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(200,162,232,0.15)" strokeWidth={1} />
      <line x1={pad} y1={pad} x2={W - pad} y2={pad} stroke="rgba(200,162,232,0.15)" strokeWidth={1} />
      {/* 包络曲线 */}
      <path
        d={path}
        fill="none"
        stroke="url(#envGrad)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 渐变定义 */}
      <defs>
        <linearGradient id="envGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C8A2E8" />
          <stop offset="50%" stopColor="#FF6B9D" />
          <stop offset="100%" stopColor="#7EC8E3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ============================================================
// 滑块组件 (带标签和数值)
// ============================================================
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  displayFn?: (v: number) => string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, unit, displayFn, onChange }: SliderRowProps) {
  const display = displayFn ? displayFn(value) : value.toFixed(step < 0.01 ? 3 : step < 0.1 ? 2 : 1);

  return (
    <div className="flex items-center gap-2 min-h-[22px]">
      <span className="text-[10px] font-medium w-10 text-right flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-range flex-1"
      />
      <span className="studio-mono text-[10px] w-12 text-right flex-shrink-0" style={{ color: 'var(--accent-pink)' }}>
        {display}{unit || ''}
      </span>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================
export default function SynthEditor({ patternId, trackId, config }: SynthEditorProps) {
  const updateSynthConfig = useAudioStudioStore((s) => s.updateSynthConfig);

  const update = useCallback(
    (partial: Partial<SynthConfig>) => {
      updateSynthConfig(patternId, trackId, partial);
    },
    [patternId, trackId, updateSynthConfig],
  );

  // 频率 → 对数刻度显示
  const freqDisplay = useCallback((v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toFixed(0);
  }, []);

  // 频率滑块: 对数映射 (20-20000 → 0-1)
  const freqToSlider = (freq: number) => Math.log2(freq / 20) / Math.log2(20000 / 20);
  const sliderToFreq = (slider: number) => Math.round(20 * Math.pow(20000 / 20, slider));

  return (
    <div
      className="flex flex-col gap-2.5 p-3 rounded-lg"
      style={{
        background: 'rgba(45,27,78,0.5)',
        border: '1px solid rgba(200,162,232,0.1)',
      }}
    >
      {/* ─── 振荡器 ─── */}
      <div>
        <div className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--accent-purple)' }}>振荡器</div>
        <div className="flex gap-1">
          {OSC_TYPES.map((ot) => (
            <button
              key={ot.value}
              onClick={() => update({ oscillatorType: ot.value })}
              className="flex-1 px-1.5 py-1 rounded text-[10px] font-medium transition-all"
              style={{
                background: config.oscillatorType === ot.value
                  ? 'rgba(255,107,157,0.2)'
                  : 'rgba(200,162,232,0.06)',
                border: config.oscillatorType === ot.value
                  ? '1px solid rgba(255,107,157,0.35)'
                  : '1px solid rgba(200,162,232,0.1)',
                color: config.oscillatorType === ot.value
                  ? 'var(--accent-pink)'
                  : 'var(--text-secondary)',
              }}
            >
              {ot.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 滤波器 ─── */}
      <div>
        <div className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--accent-purple)' }}>滤波器</div>

        {/* 截止频率 */}
        <SliderRow
          label="截止"
          value={freqToSlider(config.filterCutoff)}
          min={0}
          max={1}
          step={0.001}
          displayFn={(v) => freqDisplay(sliderToFreq(v))}
          onChange={(v) => update({ filterCutoff: sliderToFreq(v) })}
        />

        {/* 共振 */}
        <SliderRow
          label="共振"
          value={config.filterResonance}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => update({ filterResonance: v })}
        />

        {/* 滤波器类型 */}
        <div className="flex gap-1 mt-1">
          {FILTER_TYPES.map((ft) => (
            <button
              key={ft.value}
              onClick={() => update({ filterType: ft.value })}
              className="flex-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all"
              style={{
                background: config.filterType === ft.value
                  ? 'rgba(126,200,227,0.2)'
                  : 'rgba(200,162,232,0.06)',
                border: config.filterType === ft.value
                  ? '1px solid rgba(126,200,227,0.35)'
                  : '1px solid rgba(200,162,232,0.1)',
                color: config.filterType === ft.value
                  ? 'var(--accent-blue)'
                  : 'var(--text-secondary)',
              }}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── ADSR 包络 ─── */}
      <div>
        <div className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--accent-purple)' }}>ADSR 包络</div>
        <SliderRow
          label="Attack"
          value={config.attack}
          min={0.001}
          max={2}
          step={0.001}
          unit="s"
          onChange={(v) => update({ attack: v })}
        />
        <SliderRow
          label="Decay"
          value={config.decay}
          min={0.001}
          max={2}
          step={0.001}
          unit="s"
          onChange={(v) => update({ decay: v })}
        />
        <SliderRow
          label="Sustain"
          value={config.sustain}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => update({ sustain: v })}
        />
        <SliderRow
          label="Release"
          value={config.release}
          min={0.001}
          max={5}
          step={0.001}
          unit="s"
          onChange={(v) => update({ release: v })}
        />
      </div>

      {/* ─── 包络曲线可视化 ─── */}
      <div className="flex justify-center">
        <EnvelopeCurve config={config} />
      </div>

      {/* ─── 参数预设提示 ─── */}
      <div className="flex gap-1 justify-center">
        {[
          { label: '钢琴', preset: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 0.8 } as Partial<SynthConfig> },
          { label: '弦乐', preset: { attack: 0.5, decay: 0.4, sustain: 0.7, release: 1.2 } as Partial<SynthConfig> },
          { label: '鼓', preset: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 } as Partial<SynthConfig> },
          { label: '贝斯', preset: { attack: 0.01, decay: 0.15, sustain: 0.8, release: 0.3 } as Partial<SynthConfig> },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => update(p.preset)}
            className="px-2 py-0.5 rounded text-[9px] transition-all"
            style={{
              background: 'rgba(200,162,232,0.06)',
              border: '1px solid rgba(200,162,232,0.1)',
              color: 'var(--text-secondary)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,107,157,0.15)';
              e.currentTarget.style.color = 'var(--accent-pink)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(200,162,232,0.06)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
