// ============================================================
// SimpleAudioEngine — simple-daw 移植 (MIT)
// Tone.Transport 16n 调度 + per-channel Tone.Channel + sampler/synth
// ============================================================

import * as Tone from 'tone';
import type { SimpleChannel, PlaylistClip } from '@/store/useSimpleDawStore';
import { useSimpleDawStore } from '@/store/useSimpleDawStore';

class SimpleAudioEngine {
  private samplers = new Map<string, Tone.Sampler>();
  private synths = new Map<string, Tone.PolySynth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth>();
  private channelNodes = new Map<string, Tone.Channel>();
  private rawBuffers = new Map<string, any>();
  public initialized = false;

  private masterVolume!: Tone.Volume;
  private reverb!: Tone.Freeverb;
  private widener!: Tone.Chorus;
  private masterBus!: Tone.Volume;
  private recorder!: Tone.Recorder;
  private previewSampler: Tone.Sampler | null = null;
  private isExporting = false;

  constructor() { /* lazy init — do NOT construct Tone nodes here (SSR-safe) */ }

  // ===== INIT =====
  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();

    // Build audio graph (deferred from constructor for SSR safety)
    this.masterVolume = new Tone.Volume(0).toDestination();
    this.reverb = new Tone.Freeverb({ roomSize: 0.7, dampening: 3000, wet: 0 }).connect(this.masterVolume);
    this.widener = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0 }).connect(this.reverb);
    this.widener.start();
    this.masterBus = new Tone.Volume(0).connect(this.widener);
    this.recorder = new Tone.Recorder();
    Tone.getDestination().connect(this.recorder);
    const { channels } = useSimpleDawStore.getState();
    channels.forEach((ch) => { this.getOrCreateChannelNodes(ch.id, ch.name); this.updateChannelSettings(ch); });
    this.updateMasterEffects();

    Tone.getTransport().scheduleRepeat((time) => {
      const { currentStep, setCurrentStep, channels: chs, playlistClips, sequenceLength, bpm } = useSimpleDawStore.getState();

      let minStart = 0;
      let maxEnd = 64;
      if (playlistClips.length > 0) {
        minStart = Math.min(...playlistClips.map((c) => c.blockIndex * sequenceLength));
        maxEnd = Math.max(...playlistClips.map((c) => (c.blockIndex + c.blockCount) * sequenceLength));
      }

      if (!this.isExporting && currentStep >= maxEnd) {
        setCurrentStep(minStart);
        return;
      }

      chs.forEach((channel) => {
        if (channel.sampleUrl && !this.samplers.has(channel.id)) {
          this.samplers.set(channel.id, { loading: true } as any);
          this.loadSample(channel.id, channel.sampleUrl);
        }

        const activeClip = playlistClips.find((clip) =>
          clip.channelId === channel.id &&
          currentStep >= clip.blockIndex * sequenceLength &&
          currentStep < (clip.blockIndex + clip.blockCount) * sequenceLength,
        );

        if (activeClip && !channel.mute) {
          const stepInPattern = (currentStep - activeClip.blockIndex * sequenceLength) % sequenceLength;

          if (channel.steps[stepInPattern]) {
            this.triggerSound(channel, 'C3', time);
          }

          if (channel.notes) {
            const notesHere = channel.notes.filter((n) => n.time === stepInPattern);
            const uniquePitches = new Set<string>();
            notesHere.forEach((note) => {
              if (!uniquePitches.has(note.pitch)) {
                uniquePitches.add(note.pitch);
                this.triggerSound(channel, note.pitch, time, note.duration);
              }
            });
          }
        }
      });

      setCurrentStep(currentStep + 1);
    }, '16n');

    this.initialized = true;
  }

  // ===== CHANNEL MANAGEMENT =====
  getOrCreateChannelNodes(channelId: string, channelName: string): Tone.Channel {
    if (!this.channelNodes.has(channelId)) {
      const node = new Tone.Channel().connect(this.masterBus);
      this.channelNodes.set(channelId, node);

      const name = channelName.toLowerCase();
      let synth: any;
      if (name.includes('kick')) synth = new Tone.MembraneSynth();
      else if (name.includes('snare')) synth = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } });
      else if (name.includes('hihat') || name.includes('hi-hat')) synth = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.01 } });
      else if (name.includes('clap')) synth = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0 } });
      else synth = new Tone.PolySynth(Tone.Synth);
      synth.connect(node);
      this.synths.set(channelId, synth);
    }
    return this.channelNodes.get(channelId)!;
  }

  async loadSample(channelId: string, url: string): Promise<void> {
    return new Promise((resolve) => {
      const nodes = this.getOrCreateChannelNodes(channelId, 'sampler');
      const channel = useSimpleDawStore.getState().channels.find((c) => c.id === channelId);
      if (channel) this.updateChannelSettings(channel);

      if (this.samplers.has(channelId)) {
        const old = this.samplers.get(channelId);
        if (old && typeof (old as any).dispose === 'function') (old as any).dispose();
      }

      const sampler = new Tone.Sampler({
        urls: { C3: url },
        release: 1,
        onload: () => {
          sampler.connect(nodes);
          this.samplers.set(channelId, sampler);
          resolve();
        },
        onerror: () => {
          this.samplers.delete(channelId);
          resolve();
        },
      });

      new (Tone as any).ToneAudioBuffer(url, (buffer: any) => {
        this.rawBuffers.set(channelId, buffer);
      });
    });
  }

  updateChannelSettings(channel: SimpleChannel): void {
    const node = this.channelNodes.get(channel.id);
    if (node) {
      node.volume.value = Tone.gainToDb(channel.volume ?? 1);
      node.pan.value = channel.pan ?? 0;
      node.mute = channel.mute ?? false;
      node.solo = channel.solo ?? false;
    }
    if (channel.type === 'sampler') this.refreshTrim(channel);
  }

  disposeChannel(channelId: string): void {
    [this.samplers, this.synths, this.channelNodes].forEach((map, _i) => {
      const item = map.get(channelId);
      if (item && typeof (item as any).dispose === 'function') (item as any).dispose();
      map.delete(channelId);
    });
    const buf = this.rawBuffers.get(channelId) as any;
    if (buf) { buf.dispose(); this.rawBuffers.delete(channelId); }
  }

  private refreshTrim(channel: SimpleChannel): void {
    const sampler = this.samplers.get(channel.id);
    const rawBuf = this.rawBuffers.get(channel.id);
    if (!(sampler instanceof Tone.Sampler) || !rawBuf?.loaded) return;

    const start = channel.trimStart || 0;
    const end = channel.trimEnd || 0;
    if (start > 0 || end > 0) {
      const endTime = rawBuf.duration - end;
      if (endTime - start > 0.01) sampler.add('C3', (rawBuf as any).slice(start, endTime));
    } else {
      sampler.add('C3', rawBuf);
    }
  }

  // ===== MASTER EFFECTS =====
  updateMasterEffects(): void {
    if (!this.initialized) return;
    const { masterVolume, masterReverb, masterWidth } = useSimpleDawStore.getState();
    this.masterVolume.volume.value = Tone.gainToDb(masterVolume);
    this.reverb.wet.value = masterReverb;
    this.widener.wet.value = masterWidth;
  }

  // ===== TRANSPORT =====
  setBpm(bpm: number): void { if (this.initialized) Tone.getTransport().bpm.value = bpm; }
  togglePlay(isPlaying: boolean): void { if (this.initialized) isPlaying ? Tone.getTransport().start() : Tone.getTransport().stop(); }

  // ===== SOUND TRIGGER =====
  triggerSound(channel: SimpleChannel, pitch: string, time: number = Tone.now(), dur: string | number = '16n'): void {
    try {
      if (time === null || time === undefined || isNaN(time)) time = Tone.now();
      const finalDur = typeof dur === 'number' ? Tone.Time('16n').toSeconds() * dur : (dur || 0.1);
      const hasSample = !!channel.sampleUrl;
      const name = channel.name.toLowerCase();

      if (hasSample) {
        const sampler = this.samplers.get(channel.id);
        if (sampler instanceof Tone.Sampler && (sampler as any).loaded !== false) {
          let playPitch = pitch;
          if (channel.rootNote && channel.rootNote !== 'C3') {
            try {
              const rootMidi = Tone.Frequency(channel.rootNote).toMidi();
              const inputMidi = Tone.Frequency(pitch).toMidi();
              playPitch = Tone.Frequency(inputMidi + (Tone.Frequency('C3').toMidi() - rootMidi), 'midi').toNote();
            } catch { /* keep pitch */ }
          }
          sampler.triggerAttackRelease(playPitch, finalDur as number, time);
        }
      } else {
        const synth = this.synths.get(channel.id);
        if (synth) {
          if (name.includes('snare') || name.includes('clap')) {
            (synth as Tone.NoiseSynth).triggerAttackRelease(finalDur as number, time);
          } else {
            (synth as Tone.PolySynth | Tone.MembraneSynth | Tone.MetalSynth).triggerAttackRelease(pitch, finalDur as number, time);
          }
        }
      }
    } catch { /* silent */ }
  }

  // ===== PREVIEW =====
  async previewSample(url: string): Promise<void> {
    if (!this.initialized) await this.init();
    if (this.previewSampler) try { this.previewSampler.dispose(); } catch { /* */ }
    return new Promise((resolve) => {
      this.previewSampler = new Tone.Sampler({
        urls: { C3: url },
        onload: () => { this.previewSampler!.toDestination(); this.previewSampler!.triggerAttackRelease('C3', '1n'); resolve(); },
        onerror: () => resolve(),
      });
    });
  }

  // ===== PITCH DETECTION =====
  detectPitch(channelId: string): string | null {
    const buf: any = this.rawBuffers.get(channelId);
    if (!buf?.loaded) return null;
    const data = buf.toArray(0);
    const sr = buf.sampleRate;
    const fft = 4096;
    const offset = Math.floor(Math.min(sr * 0.1, data.length * 0.1));
    const slice = data.slice(offset, offset + fft);
    if (slice.length < fft) return null;

    let bestR = -1, bestLag = -1;
    const minLag = Math.floor(sr / 2000);
    const maxLag = Math.floor(sr / 30);
    for (let lag = minLag; lag < maxLag; lag++) {
      let r = 0;
      for (let i = 0; i < fft - lag; i++) r += slice[i]! * slice[i + lag]!;
      if (r > bestR) { bestR = r; bestLag = lag; }
    }
    if (bestLag < 0 || bestR < 5) return null;
    try { return Tone.Frequency(sr / bestLag).toNote(); } catch { return null; }
  }

  // ===== WAV EXPORT =====
  async exportToWav(): Promise<void> {
    if (!this.initialized) await this.init();
    this.isExporting = true;
    this.recorder.start();

    const { setCurrentStep, playlistClips, sequenceLength, bpm } = useSimpleDawStore.getState();
    let minStart = 0, maxEnd = sequenceLength;
    if (playlistClips.length > 0) {
      minStart = Math.min(...playlistClips.map((c) => c.blockIndex * sequenceLength));
      maxEnd = Math.max(...playlistClips.map((c) => (c.blockIndex + c.blockCount) * sequenceLength));
    }
    const totalSteps = (maxEnd - minStart) + sequenceLength;
    const recordTime = (totalSteps * 60) / (bpm * 4);

    setCurrentStep(minStart);
    Tone.getTransport().start();

    setTimeout(async () => {
      const recording = await this.recorder.stop();
      const url = URL.createObjectURL(recording);
      const a = document.createElement('a');
      a.download = 'daw_export.wav'; a.href = url; a.click();
      Tone.getTransport().stop();
      this.isExporting = false;
      setCurrentStep(minStart);
    }, recordTime * 1000 + 500);
  }

  // ===== MIDI EXPORT =====
  async exportMIDI(): Promise<void> {
    const { channels, bpm, sequenceLength } = useSimpleDawStore.getState();
    try {
      const { Midi } = await import('@tonejs/midi');
      const midi = new Midi();
      midi.header.tempos = [{ ticks: 0, bpm }];
      midi.header.timeSignatures = [{ ticks: 0, timeSignature: [4, 4] }];

      channels.forEach(ch => {
        const track = midi.addTrack();
        const notes = ch.notes || [];
        notes.forEach(n => {
          const midiNum = noteToMidiNumber(n.pitch);
          track.addNote({
            midi: midiNum, time: n.time * 0.25, duration: n.duration * 0.25,
            velocity: n.velocity / 127,
          });
        });
      });

      const data = Buffer.from(midi.toArray());
      const blob = new Blob([data], { type: 'audio/midi' });
      const a = document.createElement('a');
      a.download = 'export.mid'; a.href = URL.createObjectURL(blob); a.click();
    } catch { alert('MIDI export failed. @tonejs/midi may not be installed.'); }
  }

  // ===== MIDI IMPORT =====
  async importMIDI(file: File): Promise<void> {
    const { addChannel, setBpm } = useSimpleDawStore.getState();
    try {
      const { Midi } = await import('@tonejs/midi');
      const buf = await file.arrayBuffer();
      const midi = new Midi(buf);
      if (midi.header.tempos.length > 0 && midi.header.tempos[0]) setBpm(midi.header.tempos[0].bpm);
      midi.tracks.forEach((track, ti) => {
        if (track.notes.length === 0) return;
        const name = track.name || `Track ${ti + 1}`;
        addChannel(name, 'synth');
        const chs = useSimpleDawStore.getState().channels;
        const ch = chs[chs.length - 1]; if (!ch) return;
        const notes = track.notes.map(n => ({
          id: Math.random().toString(36).substr(2,9),
          pitch: midiToNoteName(n.midi), time: Math.round(n.time * 4), duration: Math.max(1, Math.round(n.duration * 4)), velocity: Math.round(n.velocity * 127),
        }));
        useSimpleDawStore.setState(s => ({
          channels: s.channels.map(c => c.id === ch.id ? { ...c, notes } : c),
        }));
      });
    } catch { alert('MIDI import failed.'); }
  }

  // ===== SYNTH CONFIG =====
  applySynthConfig(channelId: string, config: import('@/store/useSimpleDawStore').SynthConfig): void {
    const synth = this.synths.get(channelId);
    if (!synth) return;
    try {
      if (synth instanceof Tone.PolySynth || synth instanceof Tone.MonoSynth) {
        (synth as any).set({
          oscillator: { type: config.oscillatorType },
          envelope: { attack: config.attack, decay: config.decay, sustain: config.sustain, release: config.release },
        });
      }
    } catch { /* synth type may not support these params */ }
  }
}

function noteToMidiNumber(pitch: string): number {
  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const m = pitch.match(/^([A-G]#?)(\d+)$/);
  if (!m) return 60;
  const ni = notes.indexOf(m[1]!);
  const o = parseInt(m[2]!);
  return (o + 1) * 12 + ni;
}

function midiToNoteName(midi: number): string {
  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return `${notes[midi % 12] ?? 'C'}${Math.floor(midi / 12) - 1}`;
}

export const simpleAudioEngine = new SimpleAudioEngine();
