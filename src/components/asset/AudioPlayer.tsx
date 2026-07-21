// 音频播放器 - 基于 wavesurfer.js 的波形播放器
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type WaveSurferType from 'wavesurfer.js';

interface AudioPlayerProps {
  /** 音频文件 URL */
  src: string;
  /** 文件名称（用于显示） */
  title?: string;
}

/** 时间格式化 mm:ss */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 音频播放器组件 */
export default function AudioPlayer({ src, title }: AudioPlayerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurferType | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ws: WaveSurferType | null = null;

    const init = async () => {
      if (!containerRef.current || !src) return;

      try {
        const WaveSurfer = (await import('wavesurfer.js')).default;

        ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: 'rgba(255,126,179,0.3)',
          progressColor: '#FF7EB3',
          cursorWidth: 0,
          barWidth: 2,
          barGap: 2,
          barRadius: 2,
          height: 64,
          backend: 'WebAudio',
          url: src,
        });

        ws.on('ready', () => {
          setIsReady(true);
          setDuration(ws!.getDuration());
          setError(null);
        });

        ws.on('play', () => setIsPlaying(true));
        ws.on('pause', () => setIsPlaying(false));
        ws.on('finish', () => setIsPlaying(false));
        ws.on('audioprocess', () => {
          setCurrentTime(ws!.getCurrentTime());
        });
        ws.on('error', (err: unknown) => {
          setError(typeof err === 'string' ? err : '加载音频失败');
        });

        wavesurferRef.current = ws;
      } catch (err) {
        setError('初始化播放器失败');
        console.error('WaveSurfer init error:', err);
      }
    };

    init();

    return () => {
      if (ws) {
        ws.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    if (!wavesurferRef.current || !isReady) return;
    wavesurferRef.current.playPause();
  }, [isReady]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wavesurferRef.current || !isReady || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    wavesurferRef.current.seekTo(ratio);
    setCurrentTime(ratio * duration);
  }, [isReady, duration]);

  return (
    <div className="w-full rounded-xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(255,126,179,0.08), rgba(200,162,232,0.08))',
        border: '1px solid rgba(255,126,179,0.12)',
      }}
    >
      {/* 标题 */}
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF7EB3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          <span className="text-sm font-medium text-text-primary truncate">{title}</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-sm text-error mb-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      {/* 波形图 / 进度条 */}
      <div
        ref={containerRef}
        className="w-full cursor-pointer mb-2"
        onClick={handleSeek}
        style={{ minHeight: '64px' }}
      />

      {/* 控制栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 播放/暂停按钮 */}
          <button
            onClick={togglePlay}
            disabled={!isReady || !!error}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isReady ? 'linear-gradient(135deg, #FF7EB3, #C8A2E8)' : 'rgba(255,255,255,0.1)',
              boxShadow: isReady ? '0 2px 8px rgba(255,126,179,0.3)' : 'none',
            }}
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
          </button>

          {/* 时间显示 */}
          <div className="text-xs text-text-secondary tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span className="mx-1 opacity-40">/</span>
            <span className="opacity-60">{formatTime(duration)}</span>
          </div>
        </div>

        {/* 加载/就绪状态 */}
        <div className="text-xs text-text-tertiary">
          {error ? '加载失败' : isReady ? '就绪' : '加载中...'}
        </div>
      </div>
    </div>
  );
}
