// ============================================================
// SamplerPanel — 鼓机面板 (FL Studio FPC 风格)
// 9 个鼓垫, 上传采样, 发送到 Step Sequencer
// ============================================================
'use client';

import { useCallback, useRef, useState } from 'react';
import AudioEngine from '@/engine/AudioEngine';
import useAudioStudioStore from '@/store/useAudioStudioStore';

/** 鼓垫定义 */
interface DrumPadDef {
  id: string;
  label: string;
  synth: 'MembraneSynth' | 'NoiseSynth' | 'MetalSynth';
  note: string | null;
  midi: number;
  noiseType?: 'white' | 'brown';
  volume?: number;
  duration?: number;
}

/** 默认鼓垫配置 */
const DEFAULT_PADS: DrumPadDef[] = [
  { id: 'kick', label: 'Kick', synth: 'MembraneSynth', note: 'C2', midi: 36 },
  { id: 'snare', label: 'Snare', synth: 'MembraneSynth', note: 'D2', midi: 38 },
  { id: 'hihat-closed', label: 'HH Closed', synth: 'NoiseSynth', note: null, midi: 42, noiseType: 'white', volume: -10 },
  { id: 'hihat-open', label: 'HH Open', synth: 'NoiseSynth', note: null, midi: 46, noiseType: 'white', volume: -6, duration: 0.3 },
  { id: 'clap', label: 'Clap', synth: 'NoiseSynth', note: null, midi: 39, noiseType: 'white', volume: -8 },
  { id: 'cymbal', label: 'Cymbal', synth: 'MetalSynth', note: 'F#4', midi: 49 },
  { id: 'tom', label: 'Tom', synth: 'MembraneSynth', note: 'A2', midi: 47 },
  { id: 'shaker', label: 'Shaker', synth: 'NoiseSynth', note: null, midi: 52, noiseType: 'brown', volume: -12 },
  { id: 'claves', label: 'Claves', synth: 'MetalSynth', note: 'C5', midi: 51 },
];

export default function SamplerPanel(): React.JSX.Element {
  const addTrack = useAudioStudioStore((s) => s.addTrack);
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);

  const [samples, setSamples] = useState<Record<string, AudioBuffer | null>>({});
  const [loadingPad, setLoadingPad] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  /** 播放鼓垫 */
  const handlePlayPad = useCallback(
    async (pad: DrumPadDef) => {
      const customSample = samples[pad.id];
      if (customSample) {
        await AudioEngine.playSamplePreview(customSample);
        return;
      }

      try {
        const Tone = await import('tone');

        switch (pad.synth) {
          case 'MembraneSynth': {
            const synth = new Tone.MembraneSynth().toDestination();
            if (pad.note) {
              const freq = Tone.Frequency(pad.note).toFrequency();
              synth.triggerAttackRelease(freq, 0.2);
            }
            setTimeout(() => {
              try { synth.dispose(); } catch { /* ignore */ }
            }, 500);
            break;
          }
          case 'NoiseSynth': {
            const synth = new Tone.NoiseSynth({
              noise: { type: pad.noiseType || 'white' },
              envelope: {
                attack: 0.001,
                decay: pad.duration ? pad.duration : 0.1,
                sustain: 0,
                release: 0.02,
              },
            }).toDestination();
            synth.volume.value = pad.volume ?? -6;
            synth.triggerAttackRelease(pad.duration ?? 0.1);
            setTimeout(() => {
              try { synth.dispose(); } catch { /* ignore */ }
            }, 600);
            break;
          }
          case 'MetalSynth': {
            const synth = new Tone.MetalSynth({
              envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
            }).toDestination();
            if (pad.note) {
              const freq = Tone.Frequency(pad.note).toFrequency();
              synth.triggerAttackRelease(freq, 0.1);
            }
            setTimeout(() => {
              try { synth.dispose(); } catch { /* ignore */ }
            }, 500);
            break;
          }
        }
      } catch {
        // silent
      }
    },
    [samples],
  );

  /** 上传自定义采样 */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !uploadTargetId) return;

      // 检查文件类型
      if (!file.type.startsWith('audio/')) return;

      setLoadingPad(uploadTargetId);
      try {
        const audioBuffer = await AudioEngine.loadAudioFile(file);
        if (audioBuffer) {
          setSamples((prev) => ({ ...prev, [uploadTargetId]: audioBuffer }));
        }
      } catch {
        // silent
      }
      setLoadingPad(null);
      setUploadTargetId(null);
      // 重置 input 以便重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadTargetId],
  );

  /** 触发文件选择 */
  const handleUploadClick = useCallback(
    (padId: string) => {
      setUploadTargetId(padId);
      // 延迟触发文件选择
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 0);
    },
    [],
  );

  /** 发送到 Step Sequencer */
  const handleSendToSequencer = useCallback(
    (pad: DrumPadDef) => {
      // 在活跃 Pattern 中添加一个鼓轨道
      addTrack('drums', pad.label);
    },
    [addTrack],
  );

  return (
    <div className="flex flex-col h-full p-2 overflow-y-auto">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/wav,audio/mp3,audio/ogg,audio/mpeg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-ink">鼓机</span>
        <span className="text-[9px] text-ink-faint">点击播放 · 右键上传</span>
      </div>

      {/* 3x3 鼓垫网格 */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        {DEFAULT_PADS.map((pad) => {
          const hasCustomSample = !!samples[pad.id];
          const isLoading = loadingPad === pad.id;

          return (
            <div
              key={pad.id}
              className="relative group"
            >
              {/* 鼓垫按钮 */}
              <button
                onClick={() => handlePlayPad(pad)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleUploadClick(pad.id);
                }}
                disabled={isLoading}
                className={`w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  hasCustomSample
                    ? 'border-mint bg-mint-pale/20 text-mint-dark'
                    : 'border-lavender-pale bg-cloud/30 text-ink-light hover:bg-sakura-pale/20 hover:border-sakura-pale'
                } ${isLoading ? 'opacity-50 animate-pulse' : ''}`}
                title={`${pad.label} (${pad.midi})\n左键播放 · 右键上传采样`}
              >
                {/* MIDI 编号 */}
                <span className="text-[9px] font-mono text-ink-faint">
                  {pad.midi}
                </span>
                {/* 鼓垫名称 */}
                <span className="text-xs font-medium leading-tight text-center px-1">
                  {pad.label}
                </span>
                {/* 采样指示 */}
                {hasCustomSample && (
                  <span className="text-[8px] text-mint">采样</span>
                )}
              </button>

              {/* 右上角操作按钮 (悬停显示) */}
              <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* 上传 */}
                <button
                  onClick={() => handleUploadClick(pad.id)}
                  className="w-4 h-4 rounded-full bg-cloud border border-lavender-pale flex items-center justify-center hover:bg-lavender-pale text-ink-faint"
                  title="上传自定义采样"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                {/* 发送到音序器 */}
                <button
                  onClick={() => handleSendToSequencer(pad)}
                  className="w-4 h-4 rounded-full bg-cloud border border-lavender-pale flex items-center justify-center hover:bg-sakura-pale text-ink-faint"
                  title="发送到 Step Sequencer"
                >
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div className="mt-2 text-[9px] text-ink-faint text-center leading-tight">
        右键点击鼓垫上传 WAV/MP3/OGG 采样
      </div>
    </div>
  );
}
