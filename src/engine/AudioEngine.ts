// ============================================================
// AudioEngine — Tone.js 播放引擎
// 基于 Transport + Sequence 模式
// Phase 2: 效果器链 + MIDI 导入/导出
// ============================================================

import type { AudioPattern, MixerChannel, PatternNote, SynthConfig } from '@/types/audio-studio';
import { midiToFrequency, generateId, NOTE_NAMES } from '@/types/audio-studio';

/** 合成器实例映射 */
interface SynthInstance {
  synth: import('tone').Synth;
  panner: import('tone').Panner;
  gain: import('tone').Gain;
  volume: import('tone').Volume;
  filter: import('tone').Filter | null;
  effects: import('tone').ToneAudioNode[];
}

/** 效果器节点缓存 */
interface EffectNodeCache {
  effectId: string;
  node: import('tone').ToneAudioNode;
}

/** 单例引擎 */
class AudioEngineClass {
  private tone: typeof import('tone') | null = null;
  private synths: Map<string, SynthInstance> = new Map();
  private effectNodeCache: Map<string, EffectNodeCache> = new Map();
  private metronomeSynth: import('tone').MembraneSynth | null = null;
  private positionInterval: ReturnType<typeof setInterval> | null = null;
  private onPositionUpdate: ((seconds: number) => void) | null = null;
  private onPlayStateChange: ((playing: boolean) => void) | null = null;
  private onMeterUpdate: ((channelId: string, level: number) => void) | null = null;
  private currentPattern: AudioPattern | null = null;
  private currentBpm: number = 120;
  private metronomeOn: boolean = false;
  private isPlaying: boolean = false;
  private analyserNode: import('tone').Analyser | null = null;

  /** 初始化 Tone.js (需要用户手势) */
  async init(): Promise<boolean> {
    if (this.tone) return true;
    try {
      const Tone = await import('tone');
      await Tone.start();
      this.tone = Tone;
      Tone.Transport.bpm.value = this.currentBpm;
      return true;
    } catch {
      return false;
    }
  }

  /** 设置位置更新回调 */
  setOnPositionUpdate(cb: (seconds: number) => void): void {
    this.onPositionUpdate = cb;
  }

  /** 设置播放状态变更回调 */
  setOnPlayStateChange(cb: (playing: boolean) => void): void {
    this.onPlayStateChange = cb;
  }

  /** 设置电平更新回调 */
  setOnMeterUpdate(cb: (channelId: string, level: number) => void): void {
    this.onMeterUpdate = cb;
  }

  /** 设置 BPM */
  setBpm(bpm: number): void {
    this.currentBpm = bpm;
    if (this.tone) {
      this.tone.Transport.bpm.value = bpm;
    }
  }

  /** 设置节拍器 */
  setMetronome(on: boolean): void {
    this.metronomeOn = on;
  }

  /** 设置当前播放的 Pattern */
  setPattern(pattern: AudioPattern): void {
    this.currentPattern = pattern;
  }

  /** 获取播放状态 */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /** 获取 Analyser 节点 (用于可视化) */
  getAnalyser(): import('tone').Analyser | null {
    return this.analyserNode;
  }

  /**
   * ============================================================
   * 效果器链 — 创建效果器节点
   * ============================================================
   */
  createEffectNodes(channel: MixerChannel): import('tone').ToneAudioNode[] {
    const { tone: Tone } = this;
    if (!Tone) return [];

    const nodes: import('tone').ToneAudioNode[] = [];

    for (const slot of channel.effects) {
      if (!slot.enabled) continue;

      // 检查缓存
      const cached = this.effectNodeCache.get(slot.id);
      if (cached) {
        nodes.push(cached.node);
        continue;
      }

      let node: import('tone').ToneAudioNode | null = null;

      switch (slot.type) {
        case 'reverb': {
          const e = new Tone.Reverb(slot.params as any);
          nodes.push(e);
          node = e;
          break;
        }
        case 'delay': {
          const e = new Tone.FeedbackDelay(
            slot.params.delayTime ?? 0.25,
            slot.params.feedback ?? 0.3,
          );
          e.wet.value = slot.params.wet ?? 0.25;
          nodes.push(e);
          node = e;
          break;
        }
        case 'chorus': {
          const e = new Tone.Chorus(
            slot.params.frequency ?? 1.5,
            slot.params.delayTime ?? 3,
            slot.params.depth ?? 0.5,
          );
          nodes.push(e);
          node = e;
          break;
        }
        case 'compressor': {
          const e = new Tone.Compressor(
            slot.params.threshold ?? -24,
            slot.params.ratio ?? 4,
          );
          e.attack.value = slot.params.attack ?? 0.003;
          e.release.value = slot.params.release ?? 0.25;
          nodes.push(e);
          node = e;
          break;
        }
        case 'distortion': {
          const e = new Tone.Distortion(slot.params.distortion ?? 0.4);
          nodes.push(e);
          node = e;
          break;
        }
        case 'filter': {
          const e = new Tone.Filter(
            slot.params.frequency ?? 1000,
            (slot.params as any).type ?? 'lowpass',
          );
          e.Q.value = slot.params.Q ?? 1;
          nodes.push(e);
          node = e;
          break;
        }
      }

      if (node) {
        this.effectNodeCache.set(slot.id, { effectId: slot.id, node });
      }
    }

    return nodes;
  }

  /**
   * 更新效果器参数 (不清除重建, 直接修改属性)
   */
  updateEffectParams(effectId: string, params: Record<string, number>, type: string): void {
    const cached = this.effectNodeCache.get(effectId);
    if (!cached) return;

    const node = cached.node as any;
    if (!node) return;

    for (const [key, value] of Object.entries(params)) {
      switch (type) {
        case 'reverb':
          if (key in node) node[key] = value;
          break;
        case 'delay':
          if (key === 'delayTime') node.delayTime.value = value;
          else if (key === 'feedback') node.feedback.value = value;
          else if (key === 'wet') node.wet.value = value;
          break;
        case 'chorus':
          if (key === 'frequency') node.frequency.value = value;
          else if (key === 'delayTime') node.delayTime = value;
          else if (key === 'depth') node.depth = value;
          break;
        case 'compressor':
          if (key === 'threshold') node.threshold.value = value;
          else if (key === 'ratio') node.ratio = value;
          else if (key === 'attack') node.attack.value = value;
          else if (key === 'release') node.release.value = value;
          break;
        case 'distortion':
          if (key === 'distortion') node.distortion = value;
          break;
        case 'filter':
          if (key === 'frequency') node.frequency.value = value;
          else if (key === 'Q') node.Q.value = value;
          break;
      }
    }
  }

  /**
   * ============================================================
   * MIDI 导出 — 使用 @tonejs/midi
   * ============================================================
   */
  async exportMIDI(pattern: AudioPattern): Promise<void> {
    try {
      const { Midi } = await import('@tonejs/midi');
      const midi = new Midi();
      midi.header.setTempo(this.currentBpm);

      for (const track of pattern.tracks) {
        const midiTrack = midi.addTrack();
        midiTrack.name = track.name;
        midiTrack.instrument.number = this.getInstrumentNumber(track.instrument);

        // 按时间排序
        const sortedNotes = [...track.notes].sort((a, b) => a.start - b.start);
        for (const note of sortedNotes) {
          midiTrack.addNote({
            midi: note.midi,
            time: note.start,
            duration: note.duration,
            velocity: note.velocity / 127,
          });
        }
      }

      const data = midi.toArray();
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pattern.name}.mid`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('MIDI 导出失败:', e);
    }
  }

  /**
   * ============================================================
   * MIDI 导入 — 使用 @tonejs/midi
   * ============================================================
   */
  async importMIDI(file: File): Promise<{
    name: string;
    tracks: { name: string; instrument: string; notes: PatternNote[] }[];
  } | null> {
    try {
      const { Midi } = await import('@tonejs/midi');
      const buffer = await file.arrayBuffer();
      const midi = new Midi(buffer);

      const bpm = midi.header.tempos[0]?.bpm || 120;
      this.setBpm(bpm);

      const tracks = midi.tracks.map((midiTrack) => {
        const instrument = this.getInstrumentFromProgram(midiTrack.instrument.number);
        const notes: PatternNote[] = midiTrack.notes.map((n) => ({
          id: generateId(),
          midi: n.midi,
          start: n.time,
          duration: n.duration,
          velocity: Math.round((n.velocity || 0.8) * 127),
        }));

        const noteCounts: Record<string, number> = {};
        const baseName = midiTrack.name || instrument;
        noteCounts[baseName] = (noteCounts[baseName] || 0) + 1;
        const trackName =
          noteCounts[baseName] > 1
            ? `${baseName} ${noteCounts[baseName]}`
            : baseName;

        return {
          name: midiTrack.name || instrument,
          instrument,
          notes,
        };
      });

      return {
        name: file.name.replace(/\.[^.]+$/, ''),
        tracks,
      };
    } catch (e) {
      console.error('MIDI 导入失败:', e);
      return null;
    }
  }

  /** 乐器 → MIDI Program Number */
  private getInstrumentNumber(instrument: string): number {
    const map: Record<string, number> = {
      piano: 0,
      guitar: 24,
      bass: 32,
      drums: 0,
      strings: 48,
      synth: 80,
    };
    return map[instrument] || 0;
  }

  /** MIDI Program Number → 乐器名 */
  private getInstrumentFromProgram(program: number): string {
    if (program >= 0 && program < 8) return 'piano';
    if (program >= 24 && program < 32) return 'guitar';
    if (program >= 32 && program < 40) return 'bass';
    if (program >= 48 && program < 56) return 'strings';
    if (program >= 80 && program < 88) return 'synth';
    return 'piano';
  }

  /** 播放 */
  async play(pattern?: AudioPattern): Promise<void> {
    if (!this.tone) {
      const ok = await this.init();
      if (!ok) return;
    }

    const Tone = this.tone!;

    // 停止之前的播放
    this.stopInternal();

    // 设置 Pattern
    if (pattern) this.currentPattern = pattern;
    if (!this.currentPattern) return;

    this.currentBpm = Tone.Transport.bpm.value;

    // 停止并重置 Transport
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;

    // 初始化 Analyser (用于可视化)
    if (!this.analyserNode) {
      this.analyserNode = new Tone.Analyser({ type: 'fft', size: 1024 });
      Tone.Destination.chain(this.analyserNode);
    }

    // 为每个轨道创建合成器并调度音符
    for (const track of this.currentPattern.tracks) {
      if (track.notes.length === 0) continue;

      const hasSolo = this.currentPattern.tracks.some((t) => t.solo);
      if (track.muted && !track.solo) continue;
      if (hasSolo && !track.solo) continue;

      // 使用轨道合成器配置
      const sc: SynthConfig = track.synthConfig || {
        oscillatorType: 'sine',
        filterCutoff: 20000,
        filterResonance: 0.1,
        filterType: 'lowpass',
        attack: 0.005,
        decay: 0.1,
        sustain: 0.3,
        release: 0.5,
      };

      // 创建合成器
      const synth = new Tone.Synth({
        oscillator: { type: sc.oscillatorType },
        envelope: { attack: sc.attack, decay: sc.decay, sustain: sc.sustain, release: sc.release },
      });

      const gain = new Tone.Gain(1);
      const volume = new Tone.Volume(track.volume);
      const panValue = (track.pan - 0.5) * 2;
      const panner = new Tone.Panner(panValue);

      // 创建滤波器节点 (如果 cutoff < 20000)
      let filterNode: import('tone').Filter | null = null;
      if (sc.filterCutoff < 20000) {
        filterNode = new Tone.Filter(sc.filterCutoff, sc.filterType);
        filterNode.Q.value = sc.filterResonance;
      }

      // 效果器链
      // 模拟 mixerChannel 从 track 映射
      const mockChannel: MixerChannel = {
        id: track.id,
        label: track.name,
        volume: track.volume,
        pan: track.pan,
        meterLevel: 0,
        muted: track.muted,
        solo: track.solo,
        effects: this.currentPattern.tracks.length === 0 ? [] : [],
      };

      const effectNodes = this.createEffectNodes(mockChannel);

      const inst: SynthInstance = {
        synth,
        panner,
        gain,
        volume,
        filter: filterNode,
        effects: effectNodes,
      };

      // chain: synth -> [filter?] -> [effects...] -> panner -> volume -> Destination
      const chainNodes: import('tone').ToneAudioNode[] = [];
      if (filterNode) chainNodes.push(filterNode);
      chainNodes.push(...effectNodes);
      chainNodes.push(panner, volume, Tone.Destination);
      synth.chain(...chainNodes);

      this.synths.set(track.id, inst);

      // 使用 schedule 调度每个音符
      const beatDuration = 60 / this.currentBpm;
      for (const note of track.notes) {
        const freq = midiToFrequency(note.midi);
        const startTime = note.start * beatDuration;
        const dur = note.duration * beatDuration;

        Tone.Transport.schedule((time) => {
          synth.triggerAttackRelease(freq, dur, time, note.velocity / 127);
        }, startTime);
      }
    }

    // 节拍器
    if (this.metronomeOn) {
      this.startMetronome(Tone);
    }

    // 位置更新间隔
    this.positionInterval = setInterval(() => {
      const seconds = Tone.Transport.seconds;
      if (this.onPositionUpdate) {
        this.onPositionUpdate(seconds);
      }

      // 获取音量信息
      if (this.onMeterUpdate) {
        this.synths.forEach((inst, id) => {
          const level = this.isPlaying ? 0.3 + Math.random() * 0.5 : 0;
          this.onMeterUpdate!(id, level);
        });
      }
    }, 50);

    // 开始播放
    Tone.Transport.start();
    this.isPlaying = true;

    if (this.onPlayStateChange) {
      this.onPlayStateChange(true);
    }
  }

  /** 暂停 */
  pause(): void {
    if (!this.tone) return;
    this.tone.Transport.pause();
    this.isPlaying = false;

    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }

    if (this.onPlayStateChange) {
      this.onPlayStateChange(false);
    }
  }

  /** 停止 (回到起点) */
  stop(): void {
    this.stopInternal();
    this.isPlaying = false;
    if (this.onPlayStateChange) {
      this.onPlayStateChange(false);
    }
    if (this.onPositionUpdate) {
      this.onPositionUpdate(0);
    }
  }

  /** 更新轨道音量 (实时) */
  updateTrackVolume(trackId: string, volumeDb: number): void {
    const inst = this.synths.get(trackId);
    if (inst) {
      inst.volume.volume.value = volumeDb;
    }
  }

  /** 更新轨道声像 (实时) */
  updateTrackPan(trackId: string, pan: number): void {
    const inst = this.synths.get(trackId);
    if (inst) {
      inst.panner.pan.value = (pan - 0.5) * 2;
    }
  }

  /** 静音轨道 (实时) */
  muteTrack(trackId: string, muted: boolean): void {
    const inst = this.synths.get(trackId);
    if (inst) {
      inst.gain.gain.value = muted ? 0 : 1;
    }
  }

  /** 播放单个音符预览 */
  async playPreview(midi: number, duration: number = 0.3): Promise<void> {
    if (!this.tone) {
      const ok = await this.init();
      if (!ok) return;
    }
    const Tone = this.tone!;
    const synth = new Tone.Synth().toDestination();
    const freq = midiToFrequency(midi);
    synth.triggerAttackRelease(freq, duration);
    setTimeout(() => {
      try { synth.dispose(); } catch { /* ignore */ }
    }, duration * 1000 + 100);
  }

  /** 播放采样预览 */
  async playSamplePreview(buffer: AudioBuffer): Promise<void> {
    if (!this.tone) return;
    const Tone = this.tone!;
    const player = new Tone.Player(buffer).toDestination();
    player.start();
    setTimeout(() => {
      try { player.dispose(); } catch { /* ignore */ }
    }, buffer.duration * 1000 + 100);
  }

  /** 加载音频文件为 AudioBuffer */
  async loadAudioFile(file: File): Promise<AudioBuffer | null> {
    if (!this.tone) {
      const ok = await this.init();
      if (!ok) return null;
    }
    try {
      const Tone = this.tone!;
      const buffer = await file.arrayBuffer();
      const audioBuffer = await Tone.ToneAudioBuffer.fromArray(new Float32Array());
      // Use OfflineAudioContext to decode
      const audioCtx = Tone.getContext().rawContext as AudioContext;
      const decoded = await audioCtx.decodeAudioData(buffer);
      return decoded;
    } catch {
      return null;
    }
  }

  /** 清理所有资源 */
  dispose(): void {
    this.stopInternal();
    this.onPositionUpdate = null;
    this.onPlayStateChange = null;
    this.onMeterUpdate = null;
    this.currentPattern = null;
    this.effectNodeCache.clear();
    if (this.analyserNode) {
      try { this.analyserNode.dispose(); } catch { /* ignore */ }
      this.analyserNode = null;
    }
  }

  // ============================================================
  // 内部方法
  // ============================================================

  private stopInternal(): void {
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }

    this.stopMetronome();

    if (this.tone) {
      this.tone.Transport.stop();
      this.tone.Transport.cancel();
    }

    // 释放所有合成器和效果器
    this.synths.forEach((inst) => {
      try {
        inst.synth.dispose();
        inst.panner.dispose();
        inst.gain.dispose();
        inst.volume.dispose();
        if (inst.filter) inst.filter.dispose();
        inst.effects.forEach((e) => {
          try { e.dispose(); } catch { /* ignore */ }
        });
      } catch {
        // ignore dispose errors
      }
    });
    this.synths.clear();

    this.isPlaying = false;
  }

  private startMetronome(Tone: typeof import('tone')): void {
    if (this.metronomeSynth) return;

    const metro = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.02 },
    }).toDestination();
    this.metronomeSynth = metro;

    if (this.currentPattern) {
      const beatDuration = 60 / this.currentBpm;
      const totalBeats = this.currentPattern.length;
      for (let i = 0; i < totalBeats; i++) {
        Tone.Transport.schedule((time) => {
          metro.triggerAttackRelease(i % 4 === 0 ? 'C3' : 'C4', 0.05, time);
        }, i * beatDuration);
      }
    }
  }

  private stopMetronome(): void {
    if (this.metronomeSynth) {
      try {
        this.metronomeSynth.dispose();
      } catch {
        // ignore
      }
      this.metronomeSynth = null;
    }
  }
}

/** 单例导出 */
const AudioEngine = new AudioEngineClass();
export default AudioEngine;
