// 音频波形编辑器 — wavesurfer.js 波形显示 + 播放控制 + 区域选择裁剪
// 支持缩放、选区裁剪、格式导出
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioWaveform, Play, Pause, Square, Upload, Download, Scissors } from 'lucide-react';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import Button from '@/components/ui/Button';
import { useAudioProcessing } from '@/hooks/useAudioProcessing';
import type { AudioFormat } from '@/types/tools';

/** wavesurfer.js 实例最小类型 */
interface WaveSurferInstance {
  load(url: string): void;
  playPause(): void;
  stop(): void;
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, cb: (...args: any[]) => void): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  un(event: string, cb: (...args: any[]) => void): void;
}

/** 波形编辑器组件 */
export default function AudioWaveformTool(): React.JSX.Element {
  const { file, audioUrl, setFile, uploadFile, isUploading, error } = useAudioProcessing();

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurferInstance | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [selectedRegion, setSelectedRegion] = useState<{ start: number; end: number } | null>(null);
  const [exportFormat, setExportFormat] = useState<AudioFormat>('mp3');
  const [wavesurferLoaded, setWavesurferLoaded] = useState<boolean>(false);

  /** 初始化 wavesurfer.js */
  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    let instance: WaveSurferInstance | null = null;
    let cancelled = false;

    const init = async () => {
      const WaveSurfer = (await import('wavesurfer.js')).default;
      if (cancelled) return;

      // 清理旧实例
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }

      instance = WaveSurfer.create({
        container: waveformRef.current!,
        waveColor: '#C5B4E3',
        progressColor: '#FF9BB5',
        cursorColor: '#4A3F45',
        barWidth: 2,
        barGap: 1,
        barRadius: 3,
        height: 120,
        backend: 'WebAudio',
        plugins: [],
      }) as unknown as WaveSurferInstance;

      instance.load(audioUrl);
      wavesurferRef.current = instance;

      instance.on('ready', () => {
        if (cancelled || !instance) return;
        setTotalDuration(instance.getDuration());
        setWavesurferLoaded(true);
      });

      instance.on('audioprocess', (time: unknown) => {
        if (typeof time === 'number') {
          setCurrentTime(time);
        }
      });

      instance.on('play', () => {
        setIsPlaying(true);
      });

      instance.on('pause', () => {
        setIsPlaying(false);
      });

      instance.on('finish', () => {
        setIsPlaying(false);
      });
    };

    init();

    return () => {
      cancelled = true;
      if (instance) {
        instance.destroy();
      }
    };
  }, [audioUrl]);

  /** 播放/暂停 */
  const handlePlayPause = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.playPause();
  }, []);

  /** 停止 */
  const handleStop = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;
    ws.stop();
  }, []);

  /** 选择区域（当前位置前后各5秒） */
  const handleSelectRegion = useCallback(() => {
    const ws = wavesurferRef.current;
    if (!ws) return;

    const ct = ws.getCurrentTime();
    const dur = ws.getDuration();
    setSelectedRegion({
      start: Math.max(0, ct - 5),
      end: Math.min(dur, ct + 5),
    });
  }, []);

  /** 裁剪选区 */
  const handleCropRegion = useCallback(async () => {
    if (!selectedRegion || !file) return;

    const key = await uploadFile();
    if (!key) return;

    // 调用音频裁剪 API
    try {
      const response = await fetch('/api/tools/audio/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputPath: key,
          outputPath: key.replace(/(\.[^.]+)$/, '_trimmed$1'),
          startTime: selectedRegion.start,
          endTime: selectedRegion.end,
        }),
      });
      const result = await response.json();
      if (result.code === 200 && result.data) {
        const a = document.createElement('a');
        a.href = `/api/tools/download?key=${encodeURIComponent(result.data.outputPath)}`;
        a.download = 'cropped_audio.wav';
        a.click();
      }
    } catch {
      // 裁剪失败
    }
  }, [selectedRegion, file, uploadFile]);

  /** 格式转换导出 */
  const handleExport = useCallback(async () => {
    if (!file) return;

    const key = await uploadFile();
    if (!key) return;

    try {
      const response = await fetch('/api/tools/audio/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputPath: key,
          outputPath: key.replace(/(\.[^.]+)$/, `_converted.${exportFormat}`),
          format: exportFormat,
        }),
      });
      const result = await response.json();
      if (result.code === 200 && result.data) {
        const a = document.createElement('a');
        a.href = `/api/tools/download?key=${encodeURIComponent(result.data.outputPath)}`;
        a.download = `audio_export.${exportFormat}`;
        a.click();
      }
    } catch {
      // 导出失败
    }
  }, [file, uploadFile, exportFormat]);

  /** 格式化时间 */
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /** 拖放文件 */
  const handleFilesDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0 && files[0]) setFile(files[0]);
    },
    [setFile],
  );

  return (
    <ToolWorkspace title="波形编辑" icon={AudioWaveform} acceptMime="audio/*" onFilesDrop={handleFilesDrop}>
      <div className="flex flex-col gap-4">
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
            {/* 播放控制 */}
            <div className="flex items-center gap-2 p-3 bg-cloud rounded-lg border border-lavender-pale">
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full bg-sakura text-cloud flex items-center justify-center hover:bg-sakura-dark transition-colors shadow-sm"
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                onClick={handleStop}
                className="w-10 h-10 rounded-full bg-lavender-pale text-ink-light flex items-center justify-center hover:bg-lavender-light transition-colors"
                title="停止"
              >
                <Square size={16} />
              </button>

              <div className="ml-3 text-sm text-ink">
                <span className="font-mono">{formatTime(currentTime)}</span>
                <span className="text-ink-faint mx-1">/</span>
                <span className="font-mono text-ink-light">{formatTime(totalDuration)}</span>
              </div>

              <div className="flex-1" />

              {/* 选区裁剪 */}
              <Button variant="ghost" size="sm" onClick={handleSelectRegion}>
                <Scissors size={14} className="mr-1 inline" />
                选区
              </Button>
              {selectedRegion && (
                <Button variant="secondary" size="sm" onClick={handleCropRegion} loading={isUploading}>
                  裁剪选区
                </Button>
              )}

              {/* 导出格式 */}
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as AudioFormat)}
                className="px-3 py-1.5 rounded-full text-sm border border-lavender-pale bg-cloud text-ink focus:outline-none focus:border-sakura"
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="ogg">OGG</option>
              </select>
              <Button variant="secondary" size="sm" onClick={handleExport}>
                <Download size={14} className="mr-1 inline" />
                导出
              </Button>
            </div>

            {/* 波形显示区域 */}
            <div className="border border-lavender-pale rounded-lg overflow-hidden bg-cloud">
              {!wavesurferLoaded && (
                <div className="h-[120px] flex items-center justify-center text-ink-light text-sm">
                  加载中...
                </div>
              )}
              <div ref={waveformRef} className={wavesurferLoaded ? '' : 'hidden'} />
            </div>

            {/* 选区信息 */}
            {selectedRegion && (
              <div className="bg-mint-pale border border-mint-light rounded-lg px-3 py-2 text-sm text-ink flex items-center gap-2">
                <Scissors size={14} className="text-mint" />
                已选区域: {formatTime(selectedRegion.start)} - {formatTime(selectedRegion.end)}
                <button
                  onClick={() => setSelectedRegion(null)}
                  className="ml-auto text-ink-light hover:text-sakura-dark"
                >
                  清除
                </button>
              </div>
            )}

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
