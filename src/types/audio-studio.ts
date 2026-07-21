// ============================================================
// Audio Studio — DAW 核心类型定义
// ============================================================

/** MIDI 音符原始数据 (低层) */
export type MidiNoteData = {
  midi: number;
  time: number;
  duration: number;
  velocity: number;
};

/** Pattern 中的音符 (带 id 便于选中/拖拽) */
export type PatternNote = {
  id: string;
  midi: number;
  start: number;     // beat 为单位
  duration: number;  // beat 为单位
  velocity: number;  // 0-127
};

/** 音频 Pattern (类似 FL Studio Pattern) */
export interface AudioPattern {
  id: string;
  name: string;
  length: number; // beats
  tracks: PatternTrack[];
}

/** Pattern 中的轨道 (每个轨道一种乐器) */
export interface PatternTrack {
  id: string;
  name: string;
  instrument: string;
  color: string;
  notes: PatternNote[];
  volume: number;   // -12 ~ +6 dB
  pan: number;      // 0 (L) ~ 1 (R), 0.5 = center
  muted: boolean;
  solo: boolean;
  /** 合成器参数 (仅 synth 类乐器有效) */
  synthConfig?: SynthConfig;
}

/** 合成器参数配置 */
export interface SynthConfig {
  oscillatorType: 'sine' | 'square' | 'triangle' | 'sawtooth';
  filterCutoff: number;   // 20-20000 Hz
  filterResonance: number; // 0.1-10
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  /** ADSR 包络 (秒) */
  attack: number;    // 0.001-2
  decay: number;     // 0.001-2
  sustain: number;   // 0-1
  release: number;   // 0.001-5
}

/** 混音台通道 */
export interface MixerChannel {
  id: string;
  label: string;
  volume: number;   // dB
  pan: number;      // 0~1
  meterLevel: number;
  muted: boolean;
  solo: boolean;
  effects: EffectSlot[];
}

/** 效果器插槽 */
export interface EffectSlot {
  id: string;
  type: 'reverb' | 'delay' | 'chorus' | 'compressor' | 'distortion' | 'filter';
  enabled: boolean;
  params: Record<string, number>;
}

/** Playlist 片段 (编排视图) */
export interface PlaylistClip {
  id: string;
  patternId: string;
  startBeat: number;
  trackIndex: number;
}

/** 乐器选项 */
export const INSTRUMENTS = [
  { value: 'piano', label: '钢琴' },
  { value: 'guitar', label: '吉他' },
  { value: 'bass', label: '贝斯' },
  { value: 'drums', label: '鼓' },
  { value: 'strings', label: '弦乐' },
  { value: 'synth', label: '合成器' },
] as const;

export type MusicInstrument = (typeof INSTRUMENTS)[number]['value'];

/** 轨道颜色映射 */
export const TRACK_COLORS: Record<MusicInstrument, string> = {
  piano: '#FF9BB5',
  guitar: '#8ECAE6',
  bass: '#C5B4E3',
  drums: '#FFEAA7',
  strings: '#8DD7B8',
  synth: '#FFD4B8',
};

/** 音符名称 */
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 获取 MIDI 音符名称 */
export function getNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  if (!name) return `${midi}`;
  return `${name}${octave}`;
}

/** 获取 MIDI 音符八度 */
export function getNoteOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/** 检测是否为黑键 */
export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

/** MIDI 音符号转频率 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 力度转透明度 (0-127 → 0.3-1.0) */
export function velocityToOpacity(velocity: number): number {
  return Math.max(0.3, Math.min(1, velocity / 127));
}

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 默认 Pattern 创建 */
export function createDefaultPattern(name?: string): AudioPattern {
  const patternId = generateId();
  return {
    id: patternId,
    name: name || `Pattern 1`,
    length: 16,
    tracks: [],
  };
}

/** 默认轨道创建 */
export function createDefaultTrack(instrument: MusicInstrument, name?: string): PatternTrack {
  return {
    id: generateId(),
    name: name || `${INSTRUMENTS.find((i) => i.value === instrument)?.label || instrument} 轨道`,
    instrument,
    color: TRACK_COLORS[instrument] || '#FF9BB5',
    notes: [],
    volume: 0,
    pan: 0.5,
    muted: false,
    solo: false,
    synthConfig: {
      oscillatorType: 'sine',
      filterCutoff: 20000,
      filterResonance: 0.1,
      filterType: 'lowpass',
      attack: 0.005,
      decay: 0.1,
      sustain: 0.3,
      release: 0.5,
    },
  };
}
