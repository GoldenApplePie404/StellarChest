// 音频效果处理组件 — 变调/变速/音量/淡入淡出 + 客户端实时预览
// 滑块控制面板 + 音频预览 + 服务端处理
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { SlidersHorizontal, Upload, Play, Pause, Square, Download, Check } from 'lucide-react';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import Button from '@/components/ui/Button';
import { useAudioProcessing } from '@/hooks/useAudioProcessing';

/** 滑块定义 */
interface SliderDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  colorClass: string;
  onChange: (v: number) => void;
}

/** 音频效果处理组件 */
export default function AudioEffectsTool(): React.JSX.Element {
  const { file, audioUrl, setFile, uploadFile, effects, setEffects, applyEffects, isUploading, isProcessing, error } =
    useAudioProcessing();

  const [resultUrl, setResultUrl] = useState<string>('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  /** 加载音频到 AudioBuffer */
  useEffect(() => {
    if (!audioUrl) {
      bufferRef.current = null;
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (!cancelled) {
          bufferRef.current = audioBuffer;
        }
      } catch {
        // 加载失败
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  /** 客户端实时预览 (使用 AudioBufferSourceNode.playbackRate + detune) */
  const handlePreview = useCallback(() => {
    const ctx = audioCtxRef.current;
    const buffer = bufferRef.current;
    if (!ctx || !buffer) return;

    // 停止之前的播放
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* noop */ }
    }

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = effects.speed;
    source.detune.value = effects.pitch * 100; // semitones → cents

    const gainNode = ctx.createGain();
    gainNode.gain.value = Math.pow(10, effects.volume / 20);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
    sourceRef.current = source;
    setIsPreviewPlaying(true);

    source.onended = () => {
      setIsPreviewPlaying(false);
      sourceRef.current = null;
    };
  }, [effects.speed, effects.pitch, effects.volume]);

  /** 停止预览 */
  const handleStopPreview = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* noop */ }
      sourceRef.current = null;
    }
    setIsPreviewPlaying(false);
  }, []);

  /** 拖放文件 */
  const handleFilesDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0 && files[0]) setFile(files[0]);
    },
    [setFile],
  );

  /** 应用效果 */
  const handleApplyEffects = useCallback(async () => {
    const result = await applyEffects();
    if (result) {
      setResultUrl(result.downloadUrl);
    }
  }, [applyEffects]);

  /** 下载 */
  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'processed_audio.wav';
    a.click();
  }, [resultUrl]);

  /** 滑块定义 */
  const sliders: SliderDef[] = [
    {
      key: 'pitch',
      label: '变调',
      min: -12,
      max: 12,
      step: 1,
      value: effects.pitch,
      displayValue: effects.pitch > 0 ? `+${effects.pitch}` : `${effects.pitch}`,
      colorClass: 'accent-sakura',
      onChange: (v: number) => setEffects({ pitch: v }),
    },
    {
      key: 'speed',
      label: '变速',
      min: 0.5,
      max: 2.0,
      step: 0.05,
      value: effects.speed,
      displayValue: `${effects.speed.toFixed(2)}x`,
      colorClass: 'accent-sky',
      onChange: (v: number) => setEffects({ speed: v }),
    },
    {
      key: 'volume',
      label: '音量',
      min: -20,
      max: 20,
      step: 1,
      value: effects.volume,
      displayValue: effects.volume > 0 ? `+${effects.volume}dB` : `${effects.volume}dB`,
      colorClass: 'accent-lavender',
      onChange: (v: number) => setEffects({ volume: v }),
    },
    {
      key: 'fadeIn',
      label: '淡入',
      min: 0,
      max: 5,
      step: 0.1,
      value: effects.fadeIn,
      displayValue: `${effects.fadeIn.toFixed(1)}s`,
      colorClass: 'accent-mint',
      onChange: (v: number) => setEffects({ fadeIn: v }),
    },
    {
      key: 'fadeOut',
      label: '淡出',
      min: 0,
      max: 5,
      step: 0.1,
      value: effects.fadeOut,
      displayValue: `${effects.fadeOut.toFixed(1)}s`,
      colorClass: 'accent-mint',
      onChange: (v: number) => setEffects({ fadeOut: v }),
    },
  ];

  return (
    <ToolWorkspace title="音效处理" icon={SlidersHorizontal} acceptMime="audio/*" onFilesDrop={handleFilesDrop}>
      <div className="flex flex-col gap-5">
        {/* 上传区域 */}
        {!audioUrl && (
          <div className="border-2 border-dashed border-lavender-pale rounded-lg p-12 text-center bg-cloud hover:border-sakura transition-colors">
            <Upload size={36} className="text-sakura mx-auto mb-3" />
            <p className="text-ink font-medium">拖放音频文件到此处或点击上传</p>
            <p className="text-ink-light text-sm mt-1">支持 MP3 / WAV / OGG / FLAC</p>
            <label className="mt-4 inline-block cursor-pointer">
              <Button variant="primary" size="sm" onClick={() => {}}>
                选择文件
              </Button>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </label>
          </div>
        )}

        {audioUrl && (
          <>
            {/* 音频文件信息 + 预览 */}
            <div className="flex items-center gap-3 p-3 bg-cloud rounded-lg border border-lavender-pale">
              <span className="text-ink text-sm font-medium truncate flex-1">
                {file?.name || '音频文件'}
              </span>

              <button
                onClick={isPreviewPlaying ? handleStopPreview : handlePreview}
                className="w-9 h-9 rounded-full bg-sakura text-cloud flex items-center justify-center hover:bg-sakura-dark transition-colors shadow-sm"
                title={isPreviewPlaying ? '停止预览' : '试听效果'}
              >
                {isPreviewPlaying ? <Square size={16} /> : <Play size={16} />}
              </button>

              <div className="h-6 flex items-center">
                <div className="flex items-end gap-0.5 h-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-lavender rounded-t-sm animate-pulse"
                      style={{
                        height: `${8 + Math.random() * 8}px`,
                        animationDelay: `${i * 0.08}s`,
                        opacity: isPreviewPlaying ? 1 : 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 效果控制面板 (2列网格) */}
            <div className="grid grid-cols-2 gap-4">
              {sliders.map((s) => (
                <div
                  key={s.key}
                  className="bg-cloud border border-lavender-pale rounded-lg p-3 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-ink text-sm font-medium">{s.label}</label>
                    <span className="text-ink-light text-xs font-mono">{s.displayValue}</span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.value}
                    onChange={(e) => s.onChange(Number(e.target.value))}
                    className={`w-full ${s.colorClass} h-1.5`}
                  />
                  <div className="flex justify-between text-ink-faint text-xs">
                    <span>{s.label === 'speed' ? '0.5x' : s.min}</span>
                    <span>{s.label === 'speed' ? '2.0x' : s.max}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 保持原调勾选 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="preservePitch"
                checked={effects.preservePitch}
                onChange={(e) => setEffects({ preservePitch: e.target.checked })}
                className="w-4 h-4 accent-sakura rounded"
              />
              <label htmlFor="preservePitch" className="text-ink text-sm cursor-pointer select-none">
                保持原调 (变速时维持原有音高)
              </label>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleApplyEffects}
                loading={isUploading || isProcessing}
              >
                <Check size={16} className="mr-1.5 inline" />
                应用特效
              </Button>

              {resultUrl && (
                <Button variant="secondary" onClick={handleDownload}>
                  <Download size={16} className="mr-1.5 inline" />
                  下载结果
                </Button>
              )}

              <button
                onClick={() => {
                  setFile(null);
                  setResultUrl('');
                }}
                className="text-ink-light text-sm hover:text-sakura-dark transition-colors"
              >
                重新选择
              </button>
            </div>

            {error && (
              <div className="bg-rose/30 text-sakura-dark px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </ToolWorkspace>
  );
}
