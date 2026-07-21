// ============================================================
// PianoRoll — 钢琴卷帘 (32 拍, C2-B5, 带力度颜色)
// ============================================================
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import type { PatternNote } from '@/types/audio-studio';
import {
  getNoteName,
  isBlackKey,
  velocityToOpacity,
} from '@/types/audio-studio';

const MIDI_MIN = 36; // C2
const MIDI_MAX = 83; // B5
const NOTE_COUNT = MIDI_MAX - MIDI_MIN + 1; // 48
const BEAT_COUNT = 32;
const CELL_WIDTH = 32;
const CELL_HEIGHT = 20;
const PIANO_KEY_WIDTH = 48;

/** 拖拽状态 */
interface DragResizeState {
  noteId: string;
  trackId: string;
  startX: number;
  originalDuration: number;
  originalStart: number;
}

export default function PianoRoll(): React.JSX.Element {
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);
  const addNote = useAudioStudioStore((s) => s.addNote);
  const removeNote = useAudioStudioStore((s) => s.removeNote);
  const updateNote = useAudioStudioStore((s) => s.updateNote);
  const activeTrackIndex = useAudioStudioStore((s) => s.activeTrackIndex);
  const setActiveTrackIndex = useAudioStudioStore((s) => s.setActiveTrackIndex);
  const isPlaying = useAudioStudioStore((s) => s.isPlaying);
  const transportPosition = useAudioStudioStore((s) => s.transportPosition);
  const bpm = useAudioStudioStore((s) => s.bpm);
  const selectedNoteIds = useAudioStudioStore((s) => s.selectedNoteIds);
  const toggleNoteSelection = useAudioStudioStore((s) => s.toggleNoteSelection);
  const clearNoteSelection = useAudioStudioStore((s) => s.clearNoteSelection);

  const scrollRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef<boolean>(false);
  const [dragState, setDragState] = useState<DragResizeState | null>(null);

  const activePattern = useMemo(
    () => patterns.find((p) => p.id === activePatternId),
    [patterns, activePatternId],
  );

  const activeTrack = useMemo(() => {
    if (!activePattern) return null;
    return activePattern.tracks[activeTrackIndex];
  }, [activePattern, activeTrackIndex]);

  const currentBeat = useMemo(() => {
    const beatDuration = 60 / bpm;
    return transportPosition / beatDuration;
  }, [transportPosition, bpm]);

  /** 点击网格空白处 — 添加音符 */
  const handleGridClick = useCallback(
    (midi: number, beat: number) => {
      if (!activePattern || !activeTrack) return;
      addNote(activePattern.id, activeTrack.id, midi, beat, 1, 100);
    },
    [activePattern, activeTrack, addNote],
  );

  /** 点击已有音符 — 删除或切换选中 */
  const handleNoteClick = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      e.stopPropagation();

      if (e.shiftKey) {
        toggleNoteSelection(noteId);
      } else if (!selectedNoteIds.includes(noteId)) {
        clearNoteSelection();
      }

      // 如果按住音符中间区域 (非右侧边)，删除音符
      // 我们让点击=删除，拖拽=调整时长
      if (!e.shiftKey && selectedNoteIds.length === 0) {
        if (activePattern && activeTrack) {
          removeNote(activePattern.id, activeTrack.id, noteId);
        }
      }
    },
    [activePattern, activeTrack, removeNote, toggleNoteSelection, clearNoteSelection, selectedNoteIds],
  );

  /** 拖拽调整时长 — 从音符右侧边缘开始 */
  const handleNotePointerDown = useCallback(
    (e: React.PointerEvent, noteId: string, start: number, duration: number) => {
      if (!activeTrack) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const xInNote = e.clientX - rect.left;
      // 只有在右侧 10px 范围内才触发拖拽
      if (xInNote < rect.width - 10) return;

      e.preventDefault();
      didDragRef.current = false;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({
        noteId,
        trackId: activeTrack.id,
        startX: e.clientX,
        originalDuration: duration,
        originalStart: start,
      });
    },
    [activeTrack],
  );

  /** 拖拽移动 */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState || !activePattern) return;
      didDragRef.current = true;

      const dx = e.clientX - dragState.startX;
      const beatDelta = dx / CELL_WIDTH;
      const newDuration = Math.max(0.25, Math.min(8, dragState.originalDuration + beatDelta));

      updateNote(activePattern.id, dragState.trackId, dragState.noteId, {
        duration: newDuration,
      });
    },
    [dragState, activePattern, updateNote],
  );

  /** 拖拽释放 */
  const handlePointerUp = useCallback(() => {
    if (dragState) {
      setDragState(null);
    }
  }, [dragState]);

  // 构建音符查找 Map
  const noteMap = useMemo(() => {
    const map = new Map<string, PatternNote>();
    if (!activeTrack) return map;
    for (const note of activeTrack.notes) {
      const key = `${note.midi}-${Math.round(note.start)}`;
      // 如果多个音符在同一拍，保留最后添加的
      map.set(key, note);
    }
    return map;
  }, [activeTrack]);

  if (!activePattern || !activeTrack) {
    return (
      <div className="flex items-center justify-center h-full text-ink-faint text-sm">
        {!activePattern ? '请先创建一个 Pattern' : '请先添加轨道'}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 节拍标尺 */}
      <div
        className="flex border-b border-lavender-pale bg-cloud/50 flex-shrink-0"
        style={{ marginLeft: PIANO_KEY_WIDTH }}
      >
        {Array.from({ length: BEAT_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`flex-shrink-0 text-[10px] flex items-end pb-0.5 pl-0.5 relative ${
              i % 4 === 0 ? 'font-medium text-ink-light' : 'text-ink-faint'
            }`}
            style={{ width: CELL_WIDTH, height: 22 }}
          >
            <span className="z-10">{i + 1}</span>
            {i % 4 === 0 && (
              <div className="absolute top-0 right-0 w-px h-full bg-lavender-pale/50" />
            )}
            {i % 4 !== 0 && (
              <div className="absolute top-1/2 right-0 w-px h-1/2 bg-lavender-pale/15" />
            )}
          </div>
        ))}
      </div>

      {/* 可滚动区域 */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex relative" style={{ minWidth: BEAT_COUNT * CELL_WIDTH + PIANO_KEY_WIDTH }}>
          {/* 钢琴键 (左侧) */}
          <div className="w-12 flex-shrink-0 sticky left-0 z-30 bg-cloud">
            {Array.from({ length: NOTE_COUNT }).map((_, rowIdx) => {
              const midi = MIDI_MAX - rowIdx;
              const blackKey = isBlackKey(midi);
              return (
                <div
                  key={midi}
                  className={`flex items-center justify-end pr-1 text-[9px] ${
                    blackKey ? 'bg-ink/5 text-ink-faint' : 'bg-cloud text-ink-light'
                  } border-b border-lavender-pale/20`}
                  style={{ height: CELL_HEIGHT }}
                >
                  {!blackKey && <span>{getNoteName(midi)}</span>}
                </div>
              );
            })}
          </div>

          {/* 音符网格 */}
          <div
            className="relative"
            style={{ minHeight: NOTE_COUNT * CELL_HEIGHT, width: BEAT_COUNT * CELL_WIDTH }}
          >
            {/* 行背景 + 列线 */}
            {Array.from({ length: NOTE_COUNT }).map((_, rowIdx) => {
              const midi = MIDI_MAX - rowIdx;
              const blackKey = isBlackKey(midi);
              return (
                <div
                  key={`row-${midi}`}
                  className={`relative ${blackKey ? 'bg-ink/[0.03]' : 'bg-cloud'} ${
                    rowIdx < NOTE_COUNT - 1 ? 'border-b border-lavender-pale/15' : ''
                  }`}
                  style={{ height: CELL_HEIGHT, width: BEAT_COUNT * CELL_WIDTH }}
                >
                  {/* 列线 */}
                  {Array.from({ length: BEAT_COUNT }).map((_, colIdx) => (
                    <div
                      key={`col-${colIdx}`}
                      className={`absolute top-0 h-full pointer-events-none ${
                        colIdx % 4 === 0
                          ? 'border-l border-lavender-pale/30'
                          : 'border-l border-lavender-pale/[0.08]'
                      }`}
                      style={{ left: colIdx * CELL_WIDTH, width: CELL_WIDTH }}
                    />
                  ))}

                  {/* 当前节拍高亮 */}
                  {isPlaying && (
                    <div
                      className="absolute top-0 h-full bg-sakura-pale/10 pointer-events-none transition-all duration-75"
                      style={{ left: Math.floor(currentBeat) * CELL_WIDTH, width: CELL_WIDTH }}
                    />
                  )}
                </div>
              );
            })}

            {/* 播放头 */}
            <div
              className="absolute top-0 w-0.5 bg-sakura-dark z-40 pointer-events-none transition-all duration-50"
              style={{
                left: currentBeat * CELL_WIDTH,
                height: NOTE_COUNT * CELL_HEIGHT,
                opacity: isPlaying ? 1 : 0.5,
                boxShadow: '0 0 6px rgba(240, 122, 154, 0.5)',
              }}
            />

            {/* 渲染音符 */}
            {activeTrack.notes.map((note) => {
              const rowIndex = MIDI_MAX - note.midi;
              const noteLeft = note.start * CELL_WIDTH + 1;
              const noteWidth = Math.max(CELL_WIDTH - 2, note.duration * CELL_WIDTH - 2);
              const noteTop = rowIndex * CELL_HEIGHT + 1;
              const opacity = velocityToOpacity(note.velocity);
              const isSelected = selectedNoteIds.includes(note.id);

              return (
                <div
                  key={note.id}
                  onPointerDown={(e) => handleNotePointerDown(e, note.id, note.start, note.duration)}
                  onClick={(e) => handleNoteClick(e, note.id)}
                  className={`absolute rounded-sm cursor-pointer select-none group ${
                    isSelected ? 'ring-2 ring-sakura-dark ring-offset-0 z-20' : 'z-10'
                  }`}
                  style={{
                    top: noteTop,
                    left: noteLeft,
                    width: noteWidth,
                    height: CELL_HEIGHT - 2,
                    backgroundColor: activeTrack.color,
                    opacity,
                    transition: 'opacity 0.1s, box-shadow 0.15s',
                  }}
                  title={`${getNoteName(note.midi)} | 力度: ${note.velocity} | 时长: ${note.duration.toFixed(1)}拍`}
                >
                  {/* 力度条 (白色渐变) */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 rounded-r-sm"
                    style={{
                      background: 'rgba(255,255,255,0.4)',
                      opacity: note.velocity / 127,
                    }}
                  />
                  {/* 拖拽手柄 */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-r-sm" />
                </div>
              );
            })}

            {/* 可点击的空格覆盖 (添加音符) */}
            {Array.from({ length: NOTE_COUNT }).map((_, rowIdx) => {
              const midi = MIDI_MAX - rowIdx;
              return Array.from({ length: BEAT_COUNT }).map((_, colIdx) => {
                const key = `${midi}-${colIdx}`;
                const hasNote = noteMap.has(key);
                if (hasNote) return null;

                return (
                  <button
                    key={`empty-${key}`}
                    onClick={() => handleGridClick(midi, colIdx)}
                    className="absolute opacity-0 hover:opacity-100 hover:bg-sakura-pale/40 rounded-sm transition-opacity cursor-cell z-5"
                    style={{
                      top: rowIdx * CELL_HEIGHT,
                      left: colIdx * CELL_WIDTH,
                      width: CELL_WIDTH,
                      height: CELL_HEIGHT,
                    }}
                  />
                );
              });
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
