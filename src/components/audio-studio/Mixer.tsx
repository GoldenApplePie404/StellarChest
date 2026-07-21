// ============================================================
// Mixer — 混音台 (每轨道一条通道, 推子/声像/Mute/Solo/电平)
// ============================================================
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import useAudioStudioStore from '@/store/useAudioStudioStore';

interface MixerChannelUI {
  id: string;
  label: string;
  color: string;
  volume: number;
  pan: number;
  meterLevel: number;
  muted: boolean;
  solo: boolean;
}

export default function Mixer(): React.JSX.Element {
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);
  const setTrackVolume = useAudioStudioStore((s) => s.setTrackVolume);
  const setTrackPan = useAudioStudioStore((s) => s.setTrackPan);
  const toggleTrackMute = useAudioStudioStore((s) => s.toggleTrackMute);
  const toggleTrackSolo = useAudioStudioStore((s) => s.toggleTrackSolo);
  const isPlaying = useAudioStudioStore((s) => s.isPlaying);
  const bpm = useAudioStudioStore((s) => s.bpm);
  const transportPosition = useAudioStudioStore((s) => s.transportPosition);

  const activePattern = useMemo(
    () => patterns.find((p) => p.id === activePatternId),
    [patterns, activePatternId],
  );

  const [faderDragging, setFaderDragging] = useState<{
    trackId: string;
    startY: number;
    startVolume: number;
  } | null>(null);

  const faderContainerRef = useRef<HTMLDivElement>(null);

  /** 将 track 转为 mixer 通道 */
  const channels: MixerChannelUI[] = useMemo(() => {
    if (!activePattern) return [];
    return activePattern.tracks.map((t) => ({
      id: t.id,
      label: t.name,
      color: t.color,
      volume: t.volume,
      pan: t.pan,
      meterLevel: isPlaying ? 0.2 + Math.random() * 0.6 : 0,
      muted: t.muted,
      solo: t.solo,
    }));
  }, [activePattern, isPlaying]);

  /** 推子操作 — Pointer 事件 */
  const handleFaderPointerDown = useCallback(
    (e: React.PointerEvent, trackId: string, currentVolume: number) => {
      e.preventDefault();
      const container = faderContainerRef.current;
      if (!container) return;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setFaderDragging({
        trackId,
        startY: e.clientY,
        startVolume: currentVolume,
      });
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!faderDragging || !activePattern) return;
      const dy = faderDragging.startY - e.clientY;
      // 每 100px = 12dB
      const newVolume = Math.max(-12, Math.min(6, faderDragging.startVolume + (dy / 100) * 12));
      setTrackVolume(activePattern.id, faderDragging.trackId, Math.round(newVolume));
    },
    [faderDragging, activePattern, setTrackVolume],
  );

  const handlePointerUp = useCallback(() => {
    if (faderDragging) {
      setFaderDragging(null);
    }
  }, [faderDragging]);

  /** volume 转推子高度百分比 */
  const volumeToPercent = (vol: number): number => {
    // -12dB → 0%, 0dB → 75%, +6dB → 100%
    return ((vol + 12) / 18) * 100;
  };

  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-ink-faint text-xs px-2">
        暂无轨道
      </div>
    );
  }

  return (
    <div
      className="flex h-full overflow-x-auto bg-cloud/20"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {channels.map((ch) => (
        <div
          key={ch.id}
          className="flex-shrink-0 w-20 border-r border-lavender-pale/40 flex flex-col items-center pt-2 pb-1 bg-cloud/10"
        >
          {/* 标签 */}
          <div className="text-[9px] text-ink-light truncate w-full text-center px-1 mb-1">
            {ch.label}
          </div>

          {/* 电平表 */}
          <div className="w-3 h-16 bg-ink/5 rounded-sm overflow-hidden mb-1 relative border border-lavender-pale/20">
            <div
              className="absolute bottom-0 w-full transition-all duration-100 rounded-sm"
              style={{
                height: `${Math.min(100, ch.meterLevel * 100)}%`,
                background: ch.meterLevel > 0.7
                  ? 'linear-gradient(to top, #FF9BB5, #FF6B8A)'
                  : ch.meterLevel > 0.4
                    ? 'linear-gradient(to top, #8ECAE6, #4A9FC7)'
                    : 'linear-gradient(to top, #8DD7B8, #5AB88A)',
              }}
            />
          </div>

          {/* 推子容器 */}
          <div
            ref={faderContainerRef}
            className="w-5 h-24 bg-ink/5 rounded-md relative cursor-pointer border border-lavender-pale/20 mb-1"
            onPointerDown={(e) => handleFaderPointerDown(e, ch.id, ch.volume)}
          >
            {/* 推子滑块 */}
            <div
              className="absolute left-0.5 right-0.5 h-3 bg-cloud rounded-sm shadow-sm border border-lavender-pale/40 transition-all"
              style={{
                bottom: `${volumeToPercent(ch.volume)}%`,
                transform: 'translateY(50%)',
                backgroundColor: ch.muted ? '#ccc' : ch.color,
              }}
            />
          </div>

          {/* 音量数值 */}
          <div className="text-[9px] font-mono text-ink-faint mb-1">
            {ch.volume > 0 ? '+' : ''}{ch.volume} dB
          </div>

          {/* 声像旋钮 */}
          <div className="flex items-center gap-0.5 mb-1">
            <span className="text-[8px] text-ink-faint">L</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={ch.pan}
              onChange={(e) => {
                if (activePattern) {
                  setTrackPan(activePattern.id, ch.id, Number(e.target.value));
                }
              }}
              className="w-12 h-1 accent-sakura cursor-pointer"
              style={{ height: '3px' }}
            />
            <span className="text-[8px] text-ink-faint">R</span>
          </div>

          {/* Mute / Solo */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { if (activePattern) toggleTrackMute(activePattern.id, ch.id); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                ch.muted ? 'bg-sakura-pale text-sakura-dark' : 'text-ink-faint hover:text-ink bg-lavender-pale/30'
              }`}
            >
              M
            </button>
            <button
              onClick={() => { if (activePattern) toggleTrackSolo(activePattern.id, ch.id); }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none ${
                ch.solo ? 'bg-sky-pale text-sky-dark' : 'text-ink-faint hover:text-ink bg-lavender-pale/30'
              }`}
            >
              S
            </button>
          </div>
        </div>
      ))}

      {/* Master 通道 */}
      <div className="flex-shrink-0 w-20 border-r border-lavender-pale/40 flex flex-col items-center pt-2 pb-1 bg-sakura-pale/10">
        <div className="text-[9px] text-ink font-medium truncate w-full text-center px-1 mb-1">
          Master
        </div>
        <div className="w-3 h-16 bg-ink/5 rounded-sm overflow-hidden mb-1 relative border border-lavender-pale/20">
          <div
            className="absolute bottom-0 w-full transition-all duration-100 rounded-sm"
            style={{
              height: `${isPlaying ? 30 + Math.random() * 50 : 0}%`,
              background: 'linear-gradient(to top, #FF9BB5, #D4567A)',
            }}
          />
        </div>
        <div className="flex-1" />
        <div className="text-[9px] font-mono text-ink-faint mb-1">0 dB</div>
      </div>
    </div>
  );
}
