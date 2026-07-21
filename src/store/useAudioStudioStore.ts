// ============================================================
// Audio Studio — Zustand 全局状态管理
// ============================================================

import { create } from 'zustand';
import type {
  AudioPattern,
  PatternTrack,
  PatternNote,
  MixerChannel,
  EffectSlot,
  PlaylistClip,
  MusicInstrument,
  SynthConfig,
} from '@/types/audio-studio';
import { createDefaultPattern, createDefaultTrack, generateId } from '@/types/audio-studio';

// ============================================================
// Store 类型定义
// ============================================================

export interface AudioStudioState {
  // --- 数据 ---
  patterns: AudioPattern[];
  activePatternId: string;
  mixerChannels: MixerChannel[];
  playlist: PlaylistClip[];
  bpm: number;
  isPlaying: boolean;
  transportPosition: number;
  metronomeOn: boolean;
  selectedNoteIds: string[];
  activeTab: 'step' | 'piano' | 'sampler';
  showMixer: boolean;
  activeTrackIndex: number;

  // --- Actions ---
  // Pattern 操作
  addPattern: (name?: string) => void;
  removePattern: (id: string) => void;
  setActivePattern: (id: string) => void;
  duplicatePattern: (id: string) => void;

  // Track 操作
  addTrack: (instrument: MusicInstrument, name?: string) => void;
  removeTrack: (patternId: string, trackId: string) => void;
  setTrackVolume: (patternId: string, trackId: string, volume: number) => void;
  setTrackPan: (patternId: string, trackId: string, pan: number) => void;
  toggleTrackMute: (patternId: string, trackId: string) => void;
  toggleTrackSolo: (patternId: string, trackId: string) => void;
  updateSynthConfig: (patternId: string, trackId: string, config: Partial<SynthConfig>) => void;
  setActiveTrackIndex: (index: number) => void;

  // Note 操作
  addNote: (patternId: string, trackId: string, midi: number, start: number, duration?: number, velocity?: number) => void;
  removeNote: (patternId: string, trackId: string, noteId: string) => void;
  updateNote: (patternId: string, trackId: string, noteId: string, updates: Partial<PatternNote>) => void;
  toggleNoteSelection: (noteId: string) => void;
  clearNoteSelection: () => void;
  setSelectedNoteIds: (ids: string[]) => void;

  // Transport 操作
  setBpm: (bpm: number) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setTransportPosition: (position: number) => void;
  toggleMetronome: () => void;

  // Mixer 操作
  setMixerVolume: (channelId: string, volume: number) => void;
  setMixerPan: (channelId: string, pan: number) => void;
  toggleMixerMute: (channelId: string) => void;
  toggleMixerSolo: (channelId: string) => void;
  addEffectToChannel: (channelId: string, type: EffectSlot['type']) => void;
  removeEffectFromChannel: (channelId: string, effectId: string) => void;
  updateEffectParams: (channelId: string, effectId: string, params: Record<string, number>) => void;
  toggleEffectEnabled: (channelId: string, effectId: string) => void;

  // Playlist 操作
  addClipToPlaylist: (patternId: string, startBeat: number, trackIndex: number) => void;
  removeClipFromPlaylist: (clipId: string) => void;
  moveClipInPlaylist: (clipId: string, newStartBeat: number, newTrackIndex: number) => void;

  // UI 操作
  setActiveTab: (tab: 'step' | 'piano' | 'sampler') => void;
  toggleShowMixer: () => void;
}

// ============================================================
// Store 实现
// ============================================================

const useAudioStudioStore = create<AudioStudioState>()((set, get) => {
  // 初始化: 创建一个默认 Pattern，带一个默认钢琴轨道
  const defaultPattern = createDefaultPattern('Pattern 1');
  const defaultTrack = createDefaultTrack('piano', '钢琴');
  defaultPattern.tracks.push(defaultTrack);

  return {
    // --- 初始状态 ---
    patterns: [defaultPattern],
    activePatternId: defaultPattern.id,
    mixerChannels: [],
    playlist: [],
    bpm: 120,
    isPlaying: false,
    transportPosition: 0,
    metronomeOn: true,
    selectedNoteIds: [],
    activeTab: 'piano',
    showMixer: true,
    activeTrackIndex: 0,

    // ============================================================
    // Pattern 操作
    // ============================================================
    addPattern: (name?: string) => {
      const pattern = createDefaultPattern(name);
      set((s) => ({ patterns: [...s.patterns, pattern] }));
    },

    removePattern: (id: string) => {
      set((s) => {
        const filtered = s.patterns.filter((p) => p.id !== id);
        const newActiveId = s.activePatternId === id
          ? (filtered[0]?.id || '')
          : s.activePatternId;
        return { patterns: filtered, activePatternId: newActiveId };
      });
    },

    setActivePattern: (id: string) => {
      set({ activePatternId: id, selectedNoteIds: [] });
    },

    duplicatePattern: (id: string) => {
      const pattern = get().patterns.find((p) => p.id === id);
      if (!pattern) return;
      const clone: AudioPattern = JSON.parse(JSON.stringify(pattern));
      clone.id = generateId();
      clone.name = `${pattern.name} (副本)`;
      set((s) => ({ patterns: [...s.patterns, clone] }));
    },

    // ============================================================
    // Track 操作
    // ============================================================
    addTrack: (instrument: MusicInstrument, name?: string) => {
      const track = createDefaultTrack(instrument, name);
      const patternId = get().activePatternId;
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId ? { ...p, tracks: [...p.tracks, track] } : p,
        ),
      }));
    },

    removeTrack: (patternId: string, trackId: string) => {
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId
            ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
            : p,
        ),
      }));
    },

    setTrackVolume: (patternId: string, trackId: string, volume: number) => {
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId
            ? {
                ...p,
                tracks: p.tracks.map((t) =>
                  t.id === trackId ? { ...t, volume: Math.max(-12, Math.min(6, volume)) } : t,
                ),
              }
            : p,
        ),
      }));
    },

    setTrackPan: (patternId: string, trackId: string, pan: number) => {
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId
            ? {
                ...p,
                tracks: p.tracks.map((t) =>
                  t.id === trackId ? { ...t, pan: Math.max(0, Math.min(1, pan)) } : t,
                ),
              }
            : p,
        ),
      }));
    },

    toggleTrackMute: (patternId: string, trackId: string) => {
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId
            ? {
                ...p,
                tracks: p.tracks.map((t) =>
                  t.id === trackId ? { ...t, muted: !t.muted } : t,
                ),
              }
            : p,
        ),
      }));
    },

    toggleTrackSolo: (patternId: string, trackId: string) => {
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId
            ? {
                ...p,
                tracks: p.tracks.map((t) =>
                  t.id === trackId ? { ...t, solo: !t.solo } : t,
                ),
              }
            : p,
        ),
      }));
    },

    updateSynthConfig: (patternId: string, trackId: string, config: Partial<SynthConfig>) => {
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId ? {
            ...p,
            tracks: p.tracks.map((t) =>
              t.id === trackId ? { ...t, synthConfig: { ...t.synthConfig!, ...config } } : t,
            ),
          } : p,
        ),
      }));
    },

    setActiveTrackIndex: (index: number) => {
      set({ activeTrackIndex: index });
    },

    // ============================================================
    // Note 操作
    // ============================================================
    addNote: (patternId: string, trackId: string, midi: number, start: number, duration = 1, velocity = 100) => {
      const note: PatternNote = {
        id: generateId(),
        midi,
        start,
        duration,
        velocity,
      };
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId
            ? {
                ...p,
                tracks: p.tracks.map((t) =>
                  t.id === trackId
                    ? {
                        ...t,
                        notes: [
                          ...t.notes.filter((n) => !(n.midi === midi && Math.abs(n.start - start) < 0.01)),
                          note,
                        ],
                      }
                    : t,
                ),
              }
            : p,
        ),
      }));
    },

    removeNote: (patternId: string, trackId: string, noteId: string) => {
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId
            ? {
                ...p,
                tracks: p.tracks.map((t) =>
                  t.id === trackId
                    ? { ...t, notes: t.notes.filter((n) => n.id !== noteId) }
                    : t,
                ),
              }
            : p,
        ),
      }));
    },

    updateNote: (patternId: string, trackId: string, noteId: string, updates: Partial<PatternNote>) => {
      set((s) => ({
        patterns: s.patterns.map((p) =>
          p.id === patternId
            ? {
                ...p,
                tracks: p.tracks.map((t) =>
                  t.id === trackId
                    ? {
                        ...t,
                        notes: t.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
                      }
                    : t,
                ),
              }
            : p,
        ),
      }));
    },

    toggleNoteSelection: (noteId: string) => {
      set((s) => {
        const isSelected = s.selectedNoteIds.includes(noteId);
        return {
          selectedNoteIds: isSelected
            ? s.selectedNoteIds.filter((id) => id !== noteId)
            : [...s.selectedNoteIds, noteId],
        };
      });
    },

    clearNoteSelection: () => {
      set({ selectedNoteIds: [] });
    },

    setSelectedNoteIds: (ids: string[]) => {
      set({ selectedNoteIds: ids });
    },

    // ============================================================
    // Transport 操作
    // ============================================================
    setBpm: (bpm: number) => {
      set({ bpm: Math.max(20, Math.min(300, bpm)) });
    },

    togglePlay: () => {
      set((s) => ({ isPlaying: !s.isPlaying }));
    },

    setIsPlaying: (playing: boolean) => {
      set({ isPlaying: playing });
    },

    setTransportPosition: (position: number) => {
      set({ transportPosition: position });
    },

    toggleMetronome: () => {
      set((s) => ({ metronomeOn: !s.metronomeOn }));
    },

    // ============================================================
    // Mixer 操作
    // ============================================================
    setMixerVolume: (channelId: string, volume: number) => {
      set((s) => ({
        mixerChannels: s.mixerChannels.map((ch) =>
          ch.id === channelId ? { ...ch, volume: Math.max(-60, Math.min(6, volume)) } : ch,
        ),
      }));
    },

    setMixerPan: (channelId: string, pan: number) => {
      set((s) => ({
        mixerChannels: s.mixerChannels.map((ch) =>
          ch.id === channelId ? { ...ch, pan: Math.max(0, Math.min(1, pan)) } : ch,
        ),
      }));
    },

    toggleMixerMute: (channelId: string) => {
      set((s) => ({
        mixerChannels: s.mixerChannels.map((ch) =>
          ch.id === channelId ? { ...ch, muted: !ch.muted } : ch,
        ),
      }));
    },

    toggleMixerSolo: (channelId: string) => {
      set((s) => ({
        mixerChannels: s.mixerChannels.map((ch) =>
          ch.id === channelId ? { ...ch, solo: !ch.solo } : ch,
        ),
      }));
    },

    addEffectToChannel: (channelId: string, type: EffectSlot['type']) => {
      const effect: EffectSlot = {
        id: generateId(),
        type,
        enabled: true,
        params: getDefaultEffectParams(type),
      };
      set((s) => ({
        mixerChannels: s.mixerChannels.map((ch) =>
          ch.id === channelId ? { ...ch, effects: [...ch.effects, effect] } : ch,
        ),
      }));
    },

    removeEffectFromChannel: (channelId: string, effectId: string) => {
      set((s) => ({
        mixerChannels: s.mixerChannels.map((ch) =>
          ch.id === channelId
            ? { ...ch, effects: ch.effects.filter((e) => e.id !== effectId) }
            : ch,
        ),
      }));
    },

    updateEffectParams: (channelId: string, effectId: string, params: Record<string, number>) => {
      set((s) => ({
        mixerChannels: s.mixerChannels.map((ch) =>
          ch.id === channelId
            ? {
                ...ch,
                effects: ch.effects.map((e) =>
                  e.id === effectId ? { ...e, params: { ...e.params, ...params } } : e,
                ),
              }
            : ch,
        ),
      }));
    },

    toggleEffectEnabled: (channelId: string, effectId: string) => {
      set((s) => ({
        mixerChannels: s.mixerChannels.map((ch) =>
          ch.id === channelId
            ? {
                ...ch,
                effects: ch.effects.map((e) =>
                  e.id === effectId ? { ...e, enabled: !e.enabled } : e,
                ),
              }
            : ch,
        ),
      }));
    },

    // ============================================================
    // Playlist 操作
    // ============================================================
    addClipToPlaylist: (patternId: string, startBeat: number, trackIndex: number) => {
      const clip: PlaylistClip = {
        id: generateId(),
        patternId,
        startBeat,
        trackIndex,
      };
      set((s) => ({ playlist: [...s.playlist, clip] }));
    },

    removeClipFromPlaylist: (clipId: string) => {
      set((s) => ({ playlist: s.playlist.filter((c) => c.id !== clipId) }));
    },

    moveClipInPlaylist: (clipId: string, newStartBeat: number, newTrackIndex: number) => {
      set((s) => ({
        playlist: s.playlist.map((c) =>
          c.id === clipId ? { ...c, startBeat: newStartBeat, trackIndex: newTrackIndex } : c,
        ),
      }));
    },

    // ============================================================
    // UI 操作
    // ============================================================
    setActiveTab: (tab: 'step' | 'piano' | 'sampler') => {
      set({ activeTab: tab });
    },

    toggleShowMixer: () => {
      set((s) => ({ showMixer: !s.showMixer }));
    },
  };
});

// ============================================================
// 工具函数
// ============================================================

/** 获取效果器默认参数 */
function getDefaultEffectParams(type: EffectSlot['type']): Record<string, number> {
  switch (type) {
    case 'reverb':
      return { decay: 2, wet: 0.3, preDelay: 0.01 };
    case 'delay':
      return { delayTime: 0.25, feedback: 0.3, wet: 0.25 };
    case 'chorus':
      return { frequency: 1.5, delayTime: 3, depth: 0.5, wet: 0.3 };
    case 'compressor':
      return { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, gain: 0 };
    case 'distortion':
      return { distortion: 0.4, wet: 0.5 };
    case 'filter':
      return { frequency: 1000, Q: 1 };
    default:
      return {};
  }
}

export default useAudioStudioStore;
