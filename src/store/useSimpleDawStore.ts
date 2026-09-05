// ============================================================
// useSimpleDawStore — simple-daw 移植 (MIT)
// channel 模型: steps[] + notes[] + volume/pan/mute/solo
// ============================================================

import { create } from 'zustand';

export interface SynthConfig {
  oscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth';
  attack: number; decay: number; sustain: number; release: number;
  filterCutoff: number; filterResonance: number; filterType: 'lowpass' | 'highpass' | 'bandpass';
}

export interface SimpleChannel {
  id: string;
  name: string;
  type: 'sampler' | 'synth';
  sampleUrl: string | null;
  steps: boolean[];
  notes: SimpleNote[];
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  rootNote: string;
  trimStart: number;
  trimEnd: number;
  color: string;
  synthConfig?: SynthConfig;
}

export interface SimpleNote {
  id: string;
  pitch: string;           // 'C3', 'D#4', etc.
  time: number;            // step index
  duration: number;        // steps
  velocity: number;        // 0-127
}

export interface PlaylistClip {
  id: string;
  channelId: string;
  blockIndex: number;      // position in blocks (1 block = sequenceLength steps)
  blockCount: number;      // how many blocks long
}

export interface SavedProject {
  id: string;
  name: string;
  date: string;
  channels: SimpleChannel[];
  playlistClips: PlaylistClip[];
  bpm: number;
  sequenceLength: number;
}

export interface SavedSound {
  id: string;
  name: string;
  username: string;
  url: string;
  date: string;
  previews?: Record<string, string>;
}

const COLORS = [
  '#FF3D3D', '#3DFF3D', '#3D3DFF', '#FFFF3D', '#FF3DFF', '#3DFFFF',
  '#FF853D', '#85FF3D', '#3D85FF', '#853DFF', '#FF3D85', '#FFD43D',
  '#3DFF85', '#D43DFF', '#3DFFD4', '#D4FF3D',
];

function getSavedProjects(): SavedProject[] {
  try {
    return JSON.parse(localStorage.getItem('fl_studio_projects_list') || '[]');
  } catch { return []; }
}

function getSavedSounds(): SavedSound[] {
  try {
    return JSON.parse(localStorage.getItem('fl_studio_saved_sounds') || '[]');
  } catch { return []; }
}

function genId(): string { return Math.random().toString(36).substring(2, 11); }

export interface SimpleDawState {
  isPlaying: boolean;
  bpm: number;
  currentStep: number;
  selectedChannelId: string | null;
  masterVolume: number;
  masterReverb: number;
  masterWidth: number;
  sequenceLength: number;
  isMixerOpen: boolean;
  isRecording: boolean;
  isSoundSearchOpen: boolean;
  channels: SimpleChannel[];
  playlistClips: PlaylistClip[];
  projects: SavedProject[];
  savedSounds: SavedSound[];

  setSequenceLength: (len: number) => void;
  togglePlay: () => void;
  setBpm: (bpm: number) => void;
  setSelectedChannelId: (id: string | null) => void;
  setCurrentStep: (step: number) => void;
  toggleStep: (channelId: string, stepIndex: number) => void;
  updateChannel: (channelId: string, updates: Partial<SimpleChannel>) => void;
  addClip: (clip: Omit<PlaylistClip, 'id'>) => void;
  moveClip: (clipId: string, blockIndex: number) => void;
  deleteClip: (clipId: string) => void;
  addChannel: (name: string, type: 'sampler' | 'synth', sampleUrl?: string | null) => void;
  deleteChannel: (channelId: string) => void;
  setSoundSearchOpen: (open: boolean) => void;
  setMixerOpen: (open: boolean) => void;
  setIsRecording: (rec: boolean) => void;
  saveSoundToLibrary: (sound: Omit<SavedSound, 'id' | 'date'>) => void;
  removeSoundFromLibrary: (id: string) => void;
  saveProject: (name: string) => void;
  loadProject: (project: SavedProject) => void;
  deleteProject: (id: string) => void;
  clearChannelNotes: (channelId: string) => void;
}

export const useSimpleDawStore = create<SimpleDawState>((set, get) => ({
  isPlaying: false,
  bpm: 128,
  currentStep: 0,
  selectedChannelId: null,
  masterVolume: 1,
  masterReverb: 0,
  masterWidth: 0,
  sequenceLength: 16,
  isMixerOpen: false,
  isRecording: false,
  isSoundSearchOpen: false,
  channels: [],
  playlistClips: [],
  projects: getSavedProjects(),
  savedSounds: getSavedSounds(),

  setSequenceLength: (len) => set({ sequenceLength: len }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setBpm: (bpm) => set({ bpm }),
  setSelectedChannelId: (id) => set({ selectedChannelId: id }),
  setCurrentStep: (step) => set({ currentStep: step }),

  toggleStep: (channelId, stepIndex) => set((s) => ({
    channels: s.channels.map((ch) =>
      ch.id === channelId
        ? { ...ch, steps: ch.steps.map((st, i) => (i === stepIndex ? !st : st)) }
        : ch
    ),
  })),

  updateChannel: (channelId, updates) => set((s) => ({
    channels: s.channels.map((ch) => (ch.id === channelId ? { ...ch, ...updates } : ch)),
  })),

  addClip: (clip) => set((s) => ({
    playlistClips: [...s.playlistClips, { ...clip, id: genId() }],
  })),

  moveClip: (clipId, blockIndex) => set((s) => ({
    playlistClips: s.playlistClips.map((c) =>
      c.id === clipId ? { ...c, blockIndex } : c
    ),
  })),

  deleteClip: (clipId) => set((s) => ({
    playlistClips: s.playlistClips.filter((c) => c.id !== clipId),
  })),

  addChannel: (name, type, sampleUrl = null) => set((s) => {
    const id = genId();
    const colorIdx = s.channels.length % COLORS.length;
    const ch: SimpleChannel = {
      id, name: name || `Synth ${s.channels.length + 1}`, type,
      sampleUrl, steps: Array(64).fill(false), notes: [],
      volume: 1, pan: 0, mute: false, solo: false,
      rootNote: 'C3', trimStart: 0, trimEnd: 0,
      color: COLORS[colorIdx]!,
    };
    if (!s.selectedChannelId) return { channels: [...s.channels, ch], selectedChannelId: id };
    return { channels: [...s.channels, ch] };
  }),

  deleteChannel: (channelId) => set((s) => ({
    channels: s.channels.filter((ch) => ch.id !== channelId),
    playlistClips: s.playlistClips.filter((c) => c.channelId !== channelId),
    selectedChannelId: s.selectedChannelId === channelId ? (s.channels[0]?.id ?? null) : s.selectedChannelId,
  })),

  setSoundSearchOpen: (open) => set({ isSoundSearchOpen: open }),
  setMixerOpen: (open) => set({ isMixerOpen: open }),
  setIsRecording: (rec) => set({ isRecording: rec }),

  saveSoundToLibrary: (sound) => set((s) => {
    const snd: SavedSound = { ...sound, id: genId(), date: new Date().toISOString() };
    const updated = [snd, ...s.savedSounds];
    localStorage.setItem('fl_studio_saved_sounds', JSON.stringify(updated));
    return { savedSounds: updated };
  }),

  removeSoundFromLibrary: (id) => set((s) => {
    const updated = s.savedSounds.filter((snd) => snd.id !== id);
    localStorage.setItem('fl_studio_saved_sounds', JSON.stringify(updated));
    return { savedSounds: updated };
  }),

  saveProject: (name) => {
    const state = get();
    const project: SavedProject = {
      id: genId(), name, date: new Date().toISOString(),
      channels: JSON.parse(JSON.stringify(state.channels)),
      playlistClips: JSON.parse(JSON.stringify(state.playlistClips)),
      bpm: state.bpm, sequenceLength: state.sequenceLength,
    };
    const updated = [...state.projects, project];
    set({ projects: updated });
    localStorage.setItem('fl_studio_projects_list', JSON.stringify(updated));
  },

  loadProject: (project) => {
    const channels = (project.channels || []).map((ch) => ({
      ...ch, rootNote: ch.rootNote || 'C3', trimStart: ch.trimStart || 0, trimEnd: ch.trimEnd || 0,
    }));
    set({
      channels,
      playlistClips: project.playlistClips || [],
      bpm: project.bpm || 128,
      sequenceLength: project.sequenceLength || 16,
      selectedChannelId: channels[0]?.id ?? null,
    });
  },

  deleteProject: (id) => set((s) => {
    const updated = s.projects.filter((p) => p.id !== id);
    localStorage.setItem('fl_studio_projects_list', JSON.stringify(updated));
    return { projects: updated };
  }),

  clearChannelNotes: (channelId) => set((s) => ({
    channels: s.channels.map((ch) => (ch.id === channelId ? { ...ch, notes: [] } : ch)),
  })),
}));
