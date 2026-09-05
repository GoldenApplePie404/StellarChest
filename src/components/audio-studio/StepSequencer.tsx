// ============================================================
// StepSequencer — FL Studio Channel Rack 风格步进音序器
// ============================================================
'use client';

import { useCallback, useMemo } from 'react';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import { INSTRUMENTS } from '@/types/audio-studio';

const STEP_COUNT = 16;
const CELL_SIZE = 32;
const ROW_HEIGHT = 44;

export default function StepSequencer(): React.JSX.Element {
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);
  const addTrack = useAudioStudioStore((s) => s.addTrack);
  const removeTrack = useAudioStudioStore((s) => s.removeTrack);
  const addNote = useAudioStudioStore((s) => s.addNote);
  const removeNote = useAudioStudioStore((s) => s.removeNote);
  const toggleTrackMute = useAudioStudioStore((s) => s.toggleTrackMute);
  const toggleTrackSolo = useAudioStudioStore((s) => s.toggleTrackSolo);
  const activeTrackIndex = useAudioStudioStore((s) => s.activeTrackIndex);
  const setActiveTrackIndex = useAudioStudioStore((s) => s.setActiveTrackIndex);
  const isPlaying = useAudioStudioStore((s) => s.isPlaying);
  const transportPosition = useAudioStudioStore((s) => s.transportPosition);
  const bpm = useAudioStudioStore((s) => s.bpm);

  const activePattern = useMemo(
    () => patterns.find((p) => p.id === activePatternId),
    [patterns, activePatternId],
  );

  const currentBeat = useMemo(() => {
    const beatDuration = 60 / bpm;
    return transportPosition / beatDuration;
  }, [transportPosition, bpm]);

  /** 点击步进格子 */
  const handleStepClick = useCallback(
    (trackId: string, stepIndex: number) => {
      if (!activePattern) return;

      const track = activePattern.tracks.find((t) => t.id === trackId);
      if (!track) return;

      // 在步进网格中，MIDI 音符使用一个固定音高 (C4 = 60)
      const stepMidi = 60;
      const existingNote = track.notes.find(
        (n) => n.midi === stepMidi && Math.abs(n.start - stepIndex) < 0.01,
      );

      if (existingNote) {
        removeNote(activePattern.id, trackId, existingNote.id);
      } else {
        addNote(activePattern.id, trackId, stepMidi, stepIndex, 1, 100);
      }
    },
    [activePattern, addNote, removeNote],
  );

  /** 检查步进是否有音符 */
  const hasStepNote = useCallback(
    (trackId: string, stepIndex: number): boolean => {
      const track = activePattern?.tracks.find((t) => t.id === trackId);
      if (!track) return false;
      return track.notes.some(
        (n) => n.midi === 60 && Math.abs(n.start - stepIndex) < 0.01,
      );
    },
    [activePattern],
  );

  /** 添加新轨道 */
  const handleAddTrack = useCallback(() => {
    const trackIndex = (activePattern?.tracks.length || 0) + 1;
    const instrumentList = ['piano', 'guitar', 'bass', 'drums', 'strings', 'synth'] as const;
    const instrument = instrumentList[trackIndex % 6]!;
    addTrack(instrument, `${INSTRUMENTS.find((i) => i.value === instrument)?.label} ${trackIndex}`);
  }, [activePattern, addTrack]);

  if (!activePattern) {
    return (
      <div className="flex items-center justify-center h-full text-ink-faint text-sm">
        请先创建一个 Pattern
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 表头 — 步进数字 */}
      <div className="flex border-b border-lavender-pale bg-cloud/50 flex-shrink-0">
        {/* 轨道名称列头 */}
        <div className="w-36 flex-shrink-0 border-r border-lavender-pale px-2 py-1.5">
          <span className="text-xs font-medium text-ink-light">轨道</span>
        </div>
        {/* 步进头部 */}
        <div className="flex">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`flex items-center justify-center text-[10px] font-mono border-r border-lavender-pale/30 ${
                i % 4 === 0 ? 'text-ink-light font-medium' : 'text-ink-faint'
              } ${isPlaying && Math.floor(currentBeat) === i ? 'bg-sakura-pale/30' : ''}`}
              style={{ width: CELL_SIZE, height: 24 }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* 可滚动轨道列表 */}
      <div className="flex-1 overflow-y-auto relative">
        {/* 播放头竖线 (跨所有轨道行) */}
        {isPlaying && (
          <div
            className="playhead"
            style={{
              left: 144 + currentBeat * CELL_SIZE,
              height: activePattern.tracks.length * ROW_HEIGHT,
              opacity: 1,
            }}
          />
        )}

        {activePattern.tracks.map((track, trackIdx) => (
          <div
            key={track.id}
            className={`track-row relative flex border-b border-lavender-pale/40 transition-colors ${
              trackIdx === activeTrackIndex ? 'track-row-selected' : 'hover:bg-lavender-pale/10'
            }`}
            style={{ height: ROW_HEIGHT }}
            onClick={() => setActiveTrackIndex(trackIdx)}
          >
            {/* 轨道色条 */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px] z-10"
              style={{
                backgroundColor: track.color,
                boxShadow: trackIdx === activeTrackIndex ? `0 0 8px ${track.color}` : 'none',
                opacity: track.muted ? 0.35 : 1,
              }}
            />
            {/* 轨道信息栏 */}
            <div
              className="w-36 flex-shrink-0 border-r border-lavender-pale flex items-center gap-1 px-2 cursor-pointer"
            >
              {/* 颜色标记 */}
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: track.color }}
              />
              {/* 轨道名 */}
              <span className="text-xs text-ink truncate flex-1">{track.name}</span>
              {/* Mute / Solo */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleTrackMute(activePattern.id, track.id); }}
                className={`p-0.5 rounded text-[10px] font-mono leading-none ${
                  track.muted ? 'text-sakura-dark bg-sakura-pale' : 'text-ink-faint hover:text-ink'
                }`}
                title="静音"
              >
                M
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleTrackSolo(activePattern.id, track.id); }}
                className={`p-0.5 rounded text-[10px] font-mono leading-none ${
                  track.solo ? 'text-sky-dark bg-sky-pale' : 'text-ink-faint hover:text-ink'
                }`}
                title="独奏"
              >
                S
              </button>
            </div>

            {/* 步进网格 */}
            <div className="flex">
              {Array.from({ length: STEP_COUNT }).map((_, stepIdx) => {
                const hasNote = hasStepNote(track.id, stepIdx);
                const isCurrentStep = isPlaying && Math.floor(currentBeat) === stepIdx;
                return (
                  <button
                    key={stepIdx}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(track.id, stepIdx);
                    }}
                    className={`border-r border-lavender-pale/15 flex items-center justify-center transition-all ${
                      isCurrentStep ? 'bg-sakura-pale/20' : ''
                    }`}
                    style={{ width: CELL_SIZE, height: ROW_HEIGHT }}
                    title={`步进 ${stepIdx + 1}`}
                  >
                    {hasNote && (
                      <div
                        className="w-4 h-4 rounded-sm shadow-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: track.color, boxShadow: `0 0 8px ${track.color}77` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 底部添加轨道按钮 */}
      <div className="p-2 border-t border-lavender-pale bg-cloud/30 flex-shrink-0">
        <button
          onClick={handleAddTrack}
          className="w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 bg-lavender-pale text-ink-light hover:bg-lavender-light hover:text-ink transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加轨道
        </button>
      </div>
    </div>
  );
}
