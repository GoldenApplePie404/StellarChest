// 音乐工作室 Hook — Tone.js 播放/录制/MIDI/撤销
// 管理轨道、BPM、播放状态、节拍器、录制、循环、音量和声像
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { MusicTrack, MusicInstrument, MIDINote } from '@/types/tools';

/** 轨道颜色映射 */
const TRACK_COLORS: Record<MusicInstrument, string> = {
  piano: '#FF9BB5',
  guitar: '#8ECAE6',
  bass: '#C5B4E3',
  drums: '#FFEAA7',
  strings: '#8DD7B8',
  synth: '#FFD4B8',
};

/** MIDI 程序号映射 (GM) */
const GM_PROGRAMS: Record<MusicInstrument, number> = {
  piano: 0,
  guitar: 24,
  bass: 33,
  drums: 0,    // drums use channel 9 (separate)
  strings: 48,
  synth: 80,
};

/** MIDI 通道映射 */
const CHANNEL_MAP: Record<MusicInstrument, number> = {
  piano: 0,
  guitar: 1,
  bass: 2,
  drums: 9,
  strings: 4,
  synth: 5,
};

/** 最大撤销步数 */
const MAX_UNDO = 50;

/** 项目数据格式 (保存/加载) */
export interface ProjectData {
  bpm: number;
  version: number;
  tracks: Array<{
    id: string;
    name: string;
    instrument: MusicInstrument;
    muted: boolean;
    solo: boolean;
    volume: number;
    pan: number;
    color: string;
    notes: MIDINote[];
  }>;
}

/** 轨道定义 (含播放状态、音量、声像) */
interface StudioTrack extends MusicTrack {
  color: string;
  volume: number;   // -12 ~ +6 dB
  pan: number;      // 0 (L) ~ 1 (R), 0.5 = center
}

/** useMusicStudio 返回值 */
interface UseMusicStudioReturn {
  tracks: StudioTrack[];
  setTracks: React.Dispatch<React.SetStateAction<StudioTrack[]>>;
  bpm: number;
  setBpm: (bpm: number) => void;
  isPlaying: boolean;
  isRecording: boolean;
  metronomeOn: boolean;
  toggleMetronome: () => void;
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  toggleLoop: () => void;
  setLoopStart: (beat: number) => void;
  setLoopEnd: (beat: number) => void;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  addTrack: (name: string, instrument: MusicInstrument) => void;
  removeTrack: (index: number) => void;
  toggleMute: (index: number) => void;
  toggleSolo: (index: number) => void;
  setTrackVolume: (index: number, volume: number) => void;
  setTrackPan: (index: number, pan: number) => void;
  record: () => Promise<void>;
  stopRecording: () => void;
  exportWAV: (fileKey: string) => Promise<string>;
  exportMIDI: () => Uint8Array;
  transportPosition: number;
  addNote: (trackIndex: number, note: MIDINote) => void;
  removeNote: (trackIndex: number, time: number, midi: number) => void;
  updateNoteDuration: (trackIndex: number, time: number, midi: number, newDuration: number) => void;
  updateNoteVelocity: (trackIndex: number, time: number, midi: number) => void;
  setNoteVelocity: (trackIndex: number, time: number, midi: number, velocity: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveProject: () => ProjectData;
  loadProject: (data: ProjectData) => void;
}

/** 音乐工作室 Hook */
export function useMusicStudio(): UseMusicStudioReturn {
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [metronomeOn, setMetronomeOn] = useState<boolean>(true);
  const [transportPosition, setTransportPosition] = useState<number>(0);
  const [loopEnabled, setLoopEnabled] = useState<boolean>(false);
  const [loopStart, setLoopStart] = useState<number>(0);
  const [loopEnd, setLoopEnd] = useState<number>(16);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const toneRef = useRef<typeof import('tone') | null>(null);
  const synthsRef = useRef<Map<string, { synth: import('tone').Synth; panner: import('tone').Panner }>>(new Map());
  const metronomeRef = useRef<import('tone').MembraneSynth | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const undoStackRef = useRef<StudioTrack[][]>([]);
  const redoStackRef = useRef<StudioTrack[][]>([]);

  /** 保存当前状态快照 (撤销) */
  const saveSnapshot = useCallback(() => {
    const snapshot = JSON.parse(JSON.stringify(tracks)) as StudioTrack[];
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [tracks]);

  /** 撤销 */
  const undo = useCallback(() => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    redoStackRef.current.push(JSON.parse(JSON.stringify(tracks)) as StudioTrack[]);
    setTracks(snapshot);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, [tracks]);

  /** 重做 */
  const redo = useCallback(() => {
    const snapshot = redoStackRef.current.pop();
    if (!snapshot) return;
    undoStackRef.current.push(JSON.parse(JSON.stringify(tracks)) as StudioTrack[]);
    setTracks(snapshot);
    setCanRedo(redoStackRef.current.length > 0);
    setCanUndo(true);
  }, [tracks]);

  /** 初始化 Tone.js (需要用户手势触发) */
  const initTone = useCallback(async () => {
    if (toneRef.current) return toneRef.current;
    const Tone = await import('tone');
    toneRef.current = Tone;
    await Tone.start();
    Tone.Transport.bpm.value = bpm;
    return Tone;
  }, [bpm]);

  /** 清理合成器 */
  const clearSynths = useCallback(() => {
    synthsRef.current.forEach(({ synth, panner }) => {
      synth.dispose();
      panner.dispose();
    });
    synthsRef.current.clear();
    if (metronomeRef.current) {
      metronomeRef.current.dispose();
      metronomeRef.current = null;
    }
  }, []);

  /** 构建播放调度 */
  const buildSchedule = useCallback(
    (Tone: typeof import('tone')) => {
      clearSynths();
      Tone.Transport.cancel();

      const hasSolo = tracks.some((t) => t.solo);
      const beatDuration = 60 / bpm;

      // 处理循环
      if (loopEnabled) {
        Tone.Transport.loop = true;
        Tone.Transport.loopStart = loopStart * beatDuration;
        Tone.Transport.loopEnd = loopEnd * beatDuration;
      } else {
        Tone.Transport.loop = false;
      }

      for (const track of tracks) {
        if (track.muted && !track.solo) continue;
        if (hasSolo && !track.solo) continue;

        const synth = new Tone.Synth({
          oscillator: { type: track.instrument === 'drums' ? 'square' : 'triangle' },
          envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
        });

        // 音量 (dB 值)
        synth.volume.value = track.volume;

        // 声像 (0~1 -> -1~1)
        const panValue = (track.pan - 0.5) * 2;
        const panner = new Tone.Panner(panValue);

        synth.chain(panner, Tone.Destination);
        synthsRef.current.set(track.id, { synth, panner });

        for (const note of track.notes) {
          // 循环模式下只调度循环范围内的音符
          if (loopEnabled) {
            if (note.time < loopStart || note.time >= loopEnd) continue;
          }

          const freq = 440 * Math.pow(2, (note.midi - 69) / 12);
          Tone.Transport.schedule((time) => {
            synth.triggerAttackRelease(freq, note.duration * beatDuration, time);
          }, note.time * beatDuration);
        }
      }

      // 节拍器
      if (metronomeOn) {
        const metro = new Tone.MembraneSynth({
          pitchDecay: 0.02,
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.02 },
        }).toDestination();
        metronomeRef.current = metro;

        const totalBeats = loopEnabled ? loopEnd : 128;
        for (let i = loopEnabled ? loopStart : 0; i < totalBeats; i++) {
          Tone.Transport.schedule((time) => {
            metro.triggerAttackRelease(i % 4 === 0 ? 'C3' : 'C4', 0.05, time);
          }, i * beatDuration);
        }
      }

      // 位置更新
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
      positionIntervalRef.current = setInterval(() => {
        setTransportPosition(Tone.Transport.seconds);

        // 检测循环结束 — 如果 loop 模式且播放已停止 (回调)
        if (loopEnabled && Tone.Transport.state === 'stopped') {
          // Transport 会在 loopEnd 自动跳回 loopStart
        }
      }, 50);
    },
    [tracks, bpm, metronomeOn, loopEnabled, loopStart, loopEnd, clearSynths],
  );

  /** 播放 */
  const play = useCallback(async () => {
    const Tone = await initTone();
    buildSchedule(Tone);

    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }
    setIsPlaying(true);
  }, [initTone, buildSchedule]);

  /** 暂停 */
  const pause = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;
    Tone.Transport.pause();
    setIsPlaying(false);
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }
  }, []);

  /** 停止 (回到起点) */
  const stop = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setIsPlaying(false);
    setTransportPosition(0);
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }
  }, []);

  /** 节拍器开关 */
  const toggleMetronome = useCallback(() => {
    setMetronomeOn((prev) => !prev);
  }, []);

  /** 循环开关 */
  const toggleLoop = useCallback(() => {
    setLoopEnabled((prev) => !prev);
  }, []);

  /** 添加轨道 */
  const addTrack = useCallback((name: string, instrument: MusicInstrument) => {
    saveSnapshot();
    const id = `track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTrack: StudioTrack = {
      id,
      name,
      instrument,
      muted: false,
      solo: false,
      volume: 0,      // 0 dB (默认)
      pan: 0.5,       // 中央
      notes: [],
      color: TRACK_COLORS[instrument],
    };
    setTracks((prev) => [...prev, newTrack]);
  }, [saveSnapshot]);

  /** 移除轨道 */
  const removeTrack = useCallback((index: number) => {
    saveSnapshot();
    setTracks((prev) => prev.filter((_, i) => i !== index));
  }, [saveSnapshot]);

  /** 切换静音 */
  const toggleMute = useCallback((index: number) => {
    saveSnapshot();
    setTracks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, muted: !t.muted } : t)),
    );
  }, [saveSnapshot]);

  /** 切换独奏 */
  const toggleSolo = useCallback((index: number) => {
    saveSnapshot();
    setTracks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, solo: !t.solo } : t)),
    );
  }, [saveSnapshot]);

  /** 设置轨道音量 */
  const setTrackVolume = useCallback((index: number, volume: number) => {
    setTracks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, volume: Math.max(-12, Math.min(6, volume)) } : t)),
    );
  }, []);

  /** 设置轨道声像 */
  const setTrackPan = useCallback((index: number, pan: number) => {
    setTracks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, pan: Math.max(0, Math.min(1, pan)) } : t)),
    );
  }, []);

  /** 录音 (浏览器麦克风) */
  const record = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // 同时开始播放
      await play();
    } catch {
      // 无麦克风权限时仅播放
      setIsRecording(true);
      await play();
    }
  }, [play]);

  /** 停止录制 */
  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    setIsRecording(false);
    stop();
  }, [stop]);

  /** 导出 WAV (调用服务端 API) */
  const exportWAV = useCallback(
    async (fileKey: string): Promise<string> => {
      try {
        const response = await fetch('/api/tools/audio/studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileKey,
            tracks: tracks.map(({ color, ...rest }) => rest),
            bpm,
            format: 'wav',
          }),
        });

        const result = await response.json();
        if (result.code === 200 && result.data) {
          return result.data.downloadUrl;
        }
        return '';
      } catch {
        return '';
      }
    },
    [tracks, bpm],
  );

  /** 添加音符到轨道 */
  const addNote = useCallback((trackIndex: number, note: MIDINote) => {
    saveSnapshot();
    setTracks((prev) =>
      prev.map((t, i) => {
        if (i !== trackIndex) return t;
        // 去除同一位置同一音高的重复音符
        const filtered = t.notes.filter(
          (n) => !(n.time === note.time && n.midi === note.midi),
        );
        return { ...t, notes: [...filtered, note] };
      }),
    );
  }, [saveSnapshot]);

  /** 移除轨道中的音符 */
  const removeNote = useCallback((trackIndex: number, time: number, midi: number) => {
    saveSnapshot();
    setTracks((prev) =>
      prev.map((t, i) => {
        if (i !== trackIndex) return t;
        return {
          ...t,
          notes: t.notes.filter(
            (n) => !(Math.abs(n.time - time) < 0.01 && n.midi === midi),
          ),
        };
      }),
    );
  }, [saveSnapshot]);

  /** 更新音符时长 (拖拽调整) */
  const updateNoteDuration = useCallback((trackIndex: number, time: number, midi: number, newDuration: number) => {
    saveSnapshot();
    setTracks((prev) =>
      prev.map((t, i) => {
        if (i !== trackIndex) return t;
        return {
          ...t,
          notes: t.notes.map((n) =>
            Math.abs(n.time - time) < 0.01 && n.midi === midi
              ? { ...n, duration: Math.max(0.25, Math.min(8, newDuration)) }
              : n,
          ),
        };
      }),
    );
  }, [saveSnapshot]);

  /** 循环切换音符力度 (100→80→60→100) */
  const updateNoteVelocity = useCallback((trackIndex: number, time: number, midi: number) => {
    saveSnapshot();
    setTracks((prev) =>
      prev.map((t, i) => {
        if (i !== trackIndex) return t;
        return {
          ...t,
          notes: t.notes.map((n) => {
            if (Math.abs(n.time - time) < 0.01 && n.midi === midi) {
              const nextVelocity = n.velocity >= 100 ? 60 : n.velocity >= 80 ? 100 : n.velocity >= 60 ? 80 : 100;
              return { ...n, velocity: nextVelocity };
            }
            return n;
          }),
        };
      }),
    );
  }, [saveSnapshot]);

  /** 设置音符力度为指定值 */
  const setNoteVelocity = useCallback((trackIndex: number, time: number, midi: number, velocity: number) => {
    saveSnapshot();
    setTracks((prev) =>
      prev.map((t, i) => {
        if (i !== trackIndex) return t;
        return {
          ...t,
          notes: t.notes.map((n) =>
            Math.abs(n.time - time) < 0.01 && n.midi === midi
              ? { ...n, velocity: Math.max(1, Math.min(127, velocity)) }
              : n,
          ),
        };
      }),
    );
  }, [saveSnapshot]);

  /** ==================== MIDI 导出 ==================== */

  /** 写入 16 位大端整数 */
  function writeU16(value: number): number[] {
    return [(value >> 8) & 0xFF, value & 0xFF];
  }

  /** 写入 32 位大端整数 */
  function writeU32(value: number): number[] {
    return [
      (value >> 24) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 8) & 0xFF,
      value & 0xFF,
    ];
  }

  /** MIDI 变长编码 */
  function writeVarLen(value: number): number[] {
    const bytes: number[] = [];
    bytes.push(value & 0x7F);
    value >>= 7;
    while (value > 0) {
      bytes.unshift((value & 0x7F) | 0x80);
      value >>= 7;
    }
    return bytes;
  }

  /** 导出 MIDI 文件 (Uint8Array) */
  const exportMIDI = useCallback((): Uint8Array => {
    const ppq = 480; // ticks per quarter note
    const chunks: number[][] = [];

    // Header: "MThd"
    const header = [
      ...'MThd'.split('').map((c) => c.charCodeAt(0)),
      ...writeU32(6),          // chunk length
      ...writeU16(1),          // format 1 (multiple tracks)
      ...writeU16(0),          // ntrks (placeholder, will update)
      ...writeU16(ppq),        // ticks per quarter
    ];

    // Track data builder
    const trackChunks: number[][] = [];

    // --- Tempo Track (Track 0) ---
    const tempoEvents: number[] = [];
    // Set tempo: microseconds per quarter = 60,000,000 / BPM
    const usPerQ = Math.round(60000000 / bpm);
    const tempoMsg = [0x00, 0xFF, 0x51, 0x03, (usPerQ >> 16) & 0xFF, (usPerQ >> 8) & 0xFF, usPerQ & 0xFF];
    tempoEvents.push(...tempoMsg);

    // Time signature: 4/4
    tempoEvents.push(0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

    // End of Track
    tempoEvents.push(0x00, 0xFF, 0x2F, 0x00);

    const tempoTrack = [
      ...'MTrk'.split('').map((c) => c.charCodeAt(0)),
      ...writeU32(tempoEvents.length),
      ...tempoEvents,
    ];
    trackChunks.push(tempoTrack);

    // --- Instrument Tracks ---
    for (const track of tracks) {
      if (track.notes.length === 0) continue;

      const events: number[] = [];
      const channel = CHANNEL_MAP[track.instrument];
      const program = GM_PROGRAMS[track.instrument];

      // Program Change (set instrument)
      events.push(0x00, 0xC0 | channel, program);

      // Note On/Off events sorted by time
      const sortedNotes = [...track.notes].sort((a, b) => a.time - b.time);
      let lastTick = 0;

      for (const note of sortedNotes) {
        const startTick = Math.round(note.time * ppq);
        const durTick = Math.max(1, Math.round(note.duration * ppq));
        const vel = Math.max(1, Math.min(127, Math.round(note.velocity)));

        // Delta from last event
        const deltaOn = startTick - lastTick;
        events.push(...writeVarLen(deltaOn));
        events.push(0x90 | channel, note.midi, vel);

        // Note Off
        const deltaOff = durTick;
        events.push(...writeVarLen(deltaOff));
        events.push(0x80 | channel, note.midi, 64);

        lastTick = startTick;
      }

      // End of Track
      events.push(0x00, 0xFF, 0x2F, 0x00);

      const trackData = [
        ...'MTrk'.split('').map((c) => c.charCodeAt(0)),
        ...writeU32(events.length),
        ...events,
      ];
      trackChunks.push(trackData);
    }

    // Update track count in header
    header[14] = 0;  // high byte
    header[15] = trackChunks.length; // low byte (assuming < 256)

    // Combine everything
    chunks.push(header);
    chunks.push(...trackChunks);

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }, [tracks, bpm]);

  /** ==================== 保存/加载项目 ==================== */

  /** 保存项目为 ProjectData */
  const saveProject = useCallback((): ProjectData => {
    return {
      version: 1,
      bpm,
      tracks: tracks.map((t) => ({
        id: t.id,
        name: t.name,
        instrument: t.instrument,
        muted: t.muted,
        solo: t.solo,
        volume: t.volume,
        pan: t.pan,
        color: t.color,
        notes: t.notes.map((n) => ({ ...n })),
      })),
    };
  }, [tracks, bpm]);

  /** 从 ProjectData 加载项目 */
  const loadProject = useCallback((data: ProjectData) => {
    saveSnapshot();
    setBpm(data.bpm);
    const loadedTracks: StudioTrack[] = data.tracks.map((t) => ({
      id: t.id || `track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: t.name,
      instrument: t.instrument,
      muted: t.muted ?? false,
      solo: t.solo ?? false,
      volume: t.volume ?? 0,
      pan: t.pan ?? 0.5,
      color: t.color || TRACK_COLORS[t.instrument] || '#FF9BB5',
      notes: (t.notes || []).map((n) => ({
        time: n.time,
        duration: n.duration,
        midi: n.midi,
        velocity: n.velocity ?? 100,
      })),
    }));
    setTracks(loadedTracks);
  }, [saveSnapshot]);

  /** 清理 */
  useEffect(() => {
    return () => {
      clearSynths();
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
      if (toneRef.current) {
        toneRef.current.Transport.cancel();
      }
    };
  }, [clearSynths]);

  return {
    tracks,
    setTracks,
    bpm,
    setBpm,
    isPlaying,
    isRecording,
    metronomeOn,
    toggleMetronome,
    loopEnabled,
    loopStart,
    loopEnd,
    toggleLoop,
    setLoopStart,
    setLoopEnd,
    play,
    pause,
    stop,
    addTrack,
    removeTrack,
    toggleMute,
    toggleSolo,
    setTrackVolume,
    setTrackPan,
    record,
    stopRecording,
    exportWAV,
    exportMIDI,
    transportPosition,
    addNote,
    removeNote,
    updateNoteDuration,
    updateNoteVelocity,
    setNoteVelocity,
    undo,
    redo,
    canUndo,
    canRedo,
    saveProject,
    loadProject,
  };
}

/** 导出轨道颜色映射 (供组件使用) */
export { TRACK_COLORS };
export type { StudioTrack };
