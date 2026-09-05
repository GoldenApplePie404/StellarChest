// ============================================================
// PlaylistView — FL Studio × tone style arrangement view
// 16-bar timeline, pattern clips on tracks, double-click to edit
// ============================================================
'use client';

import { useCallback, useMemo } from 'react';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import useAppStore from '@/store/useAppStore';
import { INSTRUMENTS, TRACK_COLORS } from '@/types/audio-studio';
import type { PlaylistClip } from '@/types/audio-studio';

const TOTAL_BARS = 16;
const BAR_WIDTH = 96;
const ROW_HEIGHT = 56;
const timelineWidth = TOTAL_BARS * BAR_WIDTH;

/** 小节:拍格式化 */
function formatBarBeat(beat: number): string {
  const bar = Math.floor(beat / 4) + 1;
  const b = Math.floor(beat % 4) + 1;
  return `${bar}.${b}`;
}

export default function PlaylistView(): React.JSX.Element {
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);
  const setActivePattern = useAudioStudioStore((s) => s.setActivePattern);
  const playlist = useAudioStudioStore((s) => s.playlist);
  const addClipToPlaylist = useAudioStudioStore((s) => s.addClipToPlaylist);
  const removeClipFromPlaylist = useAudioStudioStore((s) => s.removeClipFromPlaylist);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const isPlaying = useAudioStudioStore((s) => s.isPlaying);
  const transportPosition = useAudioStudioStore((s) => s.transportPosition);
  const bpm = useAudioStudioStore((s) => s.bpm);
  const currentBeat = useMemo(() => (transportPosition / 60) * bpm, [transportPosition, bpm]);

  const patternList = useMemo(() => {
    if (!patterns || patterns.length === 0) return [];
    return patterns.map((p) => ({
      pattern: p,
      trackCount: p.tracks.length,
      noteCount: p.tracks.reduce((s, t) => s + t.notes.length, 0),
    }));
  }, [patterns]);

  const isEmpty = patternList.length === 0;

  /** 双击 clip 进入钢琴卷帘编辑 */
  const handleClipDoubleClick = useCallback(
    (patternId: string) => {
      setActivePattern(patternId);
      setActiveView('piano-roll');
    },
    [setActivePattern, setActiveView],
  );

  /** 添加 pattern 到 playlist */
  const handleAddPatternToPlaylist = useCallback(
    (patternId: string, trackIndex: number, name: string, color: string) => {
      const existingClips = playlist.filter((c) => c.patternId === patternId && c.trackIndex === trackIndex);
      const startBeat = existingClips.length > 0
        ? Math.max(...existingClips.map((c) => c.startBeat + c.length))
        : 0;
      addClipToPlaylist(patternId, startBeat, trackIndex, name, 4, color);
    },
    [playlist, addClipToPlaylist],
  );

  const colorBg = 'var(--cloud)';
  const colorBorder = 'rgba(200,162,232,0.12)';
  const colorSubtle = 'rgba(200,162,232,0.06)';
  const colorText = 'var(--text-secondary)';
  const colorMuted = 'var(--ink-faint)';

  return (
    <div className="flex h-full w-full flex-col overflow-hidden select-none" style={{ color: 'var(--ink)' }}>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Pattern list (left column, 220px) */}
        <div className="w-[220px] flex-shrink-0 flex flex-col border-r overflow-y-auto studio-scrollbar" style={{ borderColor: colorBorder, background: `linear-gradient(180deg, ${colorBg}, ${colorSubtle})` }}>
          <div className="h-7 flex-shrink-0 border-b flex items-center px-3" style={{ borderColor: colorBorder }}>
            <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: colorMuted }}>Patterns</span>
          </div>

          {isEmpty ? (
            <div className="flex flex-1 items-center justify-center">
              <span className="text-xs" style={{ color: colorMuted }}>No patterns yet</span>
            </div>
          ) : (
            patternList.map(({ pattern }, idx) => {
              const trackClips = playlist.filter((c) => c.patternId === pattern.id);
              return (
                <div
                  key={pattern.id}
                  className="flex items-center justify-between px-3 border-b cursor-pointer transition-colors hover:bg-lavender-pale/30"
                  style={{ height: ROW_HEIGHT, borderColor: colorBorder, background: pattern.id === activePatternId ? 'rgba(255,107,157,0.08)' : 'transparent' }}
                  onClick={() => handleClipDoubleClick(pattern.id)}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[12px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                      {pattern.name}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: colorMuted }}>
                      PATTERN
                    </span>
                    <span className="text-[10px]" style={{ color: colorMuted }}>
                      {pattern.tracks.length} trk &middot; {trackClips.length} clip
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const firstTrack = pattern.tracks[0];
                      if (firstTrack) {
            const inst = INSTRUMENTS.find((i) => i.value === firstTrack.instrument);
            const color = (TRACK_COLORS as Record<string, string>)[firstTrack.instrument] ?? firstTrack.color;
                        handleAddPatternToPlaylist(pattern.id, idx, pattern.name, color);
                      }
                    }}
                    className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors hover:bg-lavender-pale"
                    style={{ color: colorMuted }}
                    title="Add to playlist"
                  >
                    +
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Timeline area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Bar ruler (sticky top) */}
          <div
            className="flex-shrink-0 flex border-b"
            style={{ borderColor: colorBorder, background: colorBg, height: '28px' }}
          >
            {Array.from({ length: TOTAL_BARS }).map((_, i) => {
              const isBarStart = (i + 1) % 4 === 1;
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-center text-[10px] font-semibold select-none"
                  style={{
                    width: BAR_WIDTH,
                    borderRight: `1px solid ${isBarStart ? 'rgba(200,162,232,0.3)' : 'rgba(200,162,232,0.08)'}`,
                    color: isBarStart ? colorText : colorMuted,
                  }}
                >
                  {i + 1}
                  {/* 播放头高亮 */}
                  {isPlaying && Math.floor(currentBeat / 4) === i && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent-pink)' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Clip grid (scrollable) */}
          <div className="flex-1 overflow-auto studio-scrollbar relative">
            <div className="relative" style={{ minWidth: timelineWidth }}>
              {/* Vertical bar grid */}
              {Array.from({ length: TOTAL_BARS }).map((_, i) => {
                const isBarStart = (i + 1) % 4 === 1;
                return (
                  <div
                    key={`grid-${i}`}
                    className="absolute top-0 pointer-events-none"
                    style={{
                      left: i * BAR_WIDTH,
                      width: BAR_WIDTH,
                      bottom: 0,
                      borderRight: `1px solid ${isBarStart ? 'rgba(200,162,232,0.15)' : 'rgba(200,162,232,0.05)'}`,
                    }}
                  />
                );
              })}

              {/* Rows (pattern tracks) */}
              {patternList.map(({ pattern }, rowIdx) => {
                const trackClips = playlist.filter((c) => c.patternId === pattern.id);
                return (
                  <div
                    key={pattern.id}
                    className="relative border-b"
                    style={{ height: ROW_HEIGHT, borderColor: colorSubtle }}
                  >
                    {trackClips.map((clip) => {
                      const clipW = Math.max(clip.length * BAR_WIDTH - 6, 60);
                      const color = clip.color || pattern.tracks[0]?.color || '#C5B4E3';
                      return (
                        <div
                          key={clip.id}
                          className="absolute rounded-md flex flex-col cursor-pointer transition-shadow hover:shadow-lg group"
                          style={{
                            left: clip.startBeat * BAR_WIDTH + 3,
                            top: 6,
                            height: ROW_HEIGHT - 12,
                            width: clipW,
                            background: `linear-gradient(135deg, ${color}CC, ${color}66)`,
                            border: `1px solid ${color}44`,
                            boxShadow: `0 1px 3px rgba(0,0,0,0.2)`,
                          }}
                          onDoubleClick={() => handleClipDoubleClick(clip.patternId)}
                        >
                          <div className="flex items-center justify-between px-2 pt-1.5">
                            <span className="text-xs font-semibold truncate text-white/90">{clip.label}</span>
                            <span className="text-[9px] uppercase tracking-wider text-white/50 font-mono">
                              {formatBarBeat(clip.startBeat)}
                            </span>
                          </div>
                          <div className="flex-1 px-2 flex items-end pb-1.5">
                            <div className="flex gap-0.5">
                              {Array.from({ length: Math.min(pattern.tracks.length, 8) }).map((_, ti) => (
                                <div
                                  key={ti}
                                  className="w-1 rounded-full"
                                  style={{
                                    height: `${12 + Math.random() * 12}px`,
                                    background: pattern.tracks[ti]?.color || color,
                                    opacity: pattern.tracks[ti]?.muted ? 0.3 : 0.7,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          {/* 删除按钮 */}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeClipFromPlaylist(clip.id); }}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}

                    {/* Empty state: click to add */}
                    {trackClips.length === 0 && (
                      <button
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const firstTrack = pattern.tracks[0];
                          if (firstTrack) {
                            const color = (TRACK_COLORS as Record<string, string>)[firstTrack.instrument] ?? firstTrack.color;
                            handleAddPatternToPlaylist(pattern.id, rowIdx, pattern.name, color);
                          }
                        }}
                      >
                        <span className="text-xs px-2 py-1 rounded" style={{ color: colorMuted, background: 'rgba(200,162,232,0.1)' }}>
                          + Add to playlist
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}

              {/* 播放头竖线 */}
              <div
                className="absolute top-0 bottom-0 w-0.5 pointer-events-none z-30"
                style={{
                  left: Math.max(0, currentBeat * BAR_WIDTH),
                  background: '#FF6B9D',
                  boxShadow: '0 0 8px rgba(255,107,157,0.6)',
                  opacity: isPlaying ? 1 : 0.4,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
