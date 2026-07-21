// ============================================================
// AudioStudioShell — 全屏音乐工作室壳组件 (FL Studio × 二次元)
// Phase 3: 独立路由 /audio-studio
// ============================================================
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Pause, Square, SkipBack, Metronome,
  Piano, Layers, Volume2, VolumeX, Upload, Download,
  ChevronLeft, ChevronRight, Music, Folder,
  Menu, Maximize2, Minimize2, Settings,
} from 'lucide-react';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import AudioEngine from '@/engine/AudioEngine';
import StepSequencer from '@/components/audio-studio/StepSequencer';
import PianoRoll from '@/components/audio-studio/PianoRoll';
import Mixer from '@/components/audio-studio/Mixer';
import BrowserPanel from '@/components/audio-studio/BrowserPanel';
import EffectsPanel from '@/components/audio-studio/EffectsPanel';
import Visualizer from '@/components/audio-studio/Visualizer';
import SamplerPanel from '@/components/audio-studio/SamplerPanel';
import SynthEditor from '@/components/audio-studio/SynthEditor';
import { INSTRUMENTS } from '@/types/audio-studio';

// ============================================================
// 样式常量 — FL Studio 深紫 × 二次元粉嫩
// ============================================================
const THEME_VARS = {
  '--bg-primary': '#1A0A2E',
  '--bg-secondary': '#2D1B4E',
  '--bg-surface': '#3D2A5E',
  '--bg-hover': '#4A3570',
  '--text-primary': '#F5E6FF',
  '--text-secondary': '#C4B5D9',
  '--accent-pink': '#FF6B9D',
  '--accent-purple': '#C8A2E8',
  '--accent-blue': '#7EC8E3',
  '--accent-green': '#6BCB77',
  '--accent-gold': '#FFD700',
  '--border-color': 'rgba(200,162,232,0.15)',
} as const;

// ============================================================
// 主组件
// ============================================================
export default function AudioStudioShell(): React.JSX.Element {
  // ── Store State ──
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);
  const addTrack = useAudioStudioStore((s) => s.addTrack);
  const removeTrack = useAudioStudioStore((s) => s.removeTrack);
  const setActiveTrackIndex = useAudioStudioStore((s) => s.setActiveTrackIndex);
  const toggleTrackMute = useAudioStudioStore((s) => s.toggleTrackMute);
  const toggleTrackSolo = useAudioStudioStore((s) => s.toggleTrackSolo);
  const setTrackVolume = useAudioStudioStore((s) => s.setTrackVolume);
  const setTrackPan = useAudioStudioStore((s) => s.setTrackPan);
  const activeTrackIndex = useAudioStudioStore((s) => s.activeTrackIndex);
  const bpm = useAudioStudioStore((s) => s.bpm);
  const setBpm = useAudioStudioStore((s) => s.setBpm);
  const isPlaying = useAudioStudioStore((s) => s.isPlaying);
  const setIsPlaying = useAudioStudioStore((s) => s.setIsPlaying);
  const setTransportPosition = useAudioStudioStore((s) => s.setTransportPosition);
  const transportPosition = useAudioStudioStore((s) => s.transportPosition);
  const metronomeOn = useAudioStudioStore((s) => s.metronomeOn);
  const toggleMetronome = useAudioStudioStore((s) => s.toggleMetronome);
  const mixerChannels = useAudioStudioStore((s) => s.mixerChannels);
  const addPattern = useAudioStudioStore((s) => s.addPattern);
  const setActivePattern = useAudioStudioStore((s) => s.setActivePattern);
  const activeTab = useAudioStudioStore((s) => s.activeTab);
  const setActiveTab = useAudioStudioStore((s) => s.setActiveTab);
  const showMixer = useAudioStudioStore((s) => s.showMixer);
  const toggleShowMixer = useAudioStudioStore((s) => s.toggleShowMixer);

  // ── Local State ──
  const [browserCollapsed, setBrowserCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showSynthEditor, setShowSynthEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePattern = useMemo(
    () => patterns.find((p) => p.id === activePatternId),
    [patterns, activePatternId],
  );

  const activeTrack = useMemo(() => {
    if (!activePattern) return null;
    return activePattern.tracks[activeTrackIndex];
  }, [activePattern, activeTrackIndex]);

  const activeMixerChannelId = useMemo(() => {
    if (activeTrack) {
      const ch = mixerChannels.find((m) => m.id === activeTrack.id);
      if (ch) return ch.id;
    }
    return mixerChannels[0]?.id || null;
  }, [activeTrack, mixerChannels]);

  // ── Transport Handlers ──
  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      AudioEngine.pause();
      setIsPlaying(false);
    } else {
      await AudioEngine.init();
      AudioEngine.setBpm(bpm);
      AudioEngine.setMetronome(metronomeOn);
      AudioEngine.setOnPositionUpdate((seconds) => {
        setTransportPosition(seconds);
      });
      AudioEngine.setOnPlayStateChange((playing) => {
        setIsPlaying(playing);
      });
      const pattern = patterns.find((p) => p.id === activePatternId);
      if (pattern) {
        await AudioEngine.play(pattern);
      } else if (patterns.length > 0) {
        await AudioEngine.play(patterns[0]);
      }
    }
  }, [isPlaying, bpm, metronomeOn, patterns, activePatternId, setIsPlaying, setTransportPosition]);

  const handleStop = useCallback(() => {
    AudioEngine.stop();
    setIsPlaying(false);
    setTransportPosition(0);
  }, [setIsPlaying, setTransportPosition]);

  const handleRewind = useCallback(() => {
    if (isPlaying) {
      AudioEngine.stop();
      setIsPlaying(false);
    }
    setTransportPosition(0);
  }, [isPlaying, setIsPlaying, setTransportPosition]);

  const handleBpmChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (!isNaN(val)) {
        setBpm(val);
        AudioEngine.setBpm(val);
      }
    },
    [setBpm],
  );

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
  };

  // ── MIDI Export ──
  const handleExportMIDI = useCallback(async () => {
    if (!activePattern) return;
    await AudioEngine.exportMIDI(activePattern);
  }, [activePattern]);

  // ── MIDI Import ──
  const handleImportMIDIClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const result = await AudioEngine.importMIDI(file);
      if (!result) return;

      const patternName = result.name;
      addPattern(patternName);

      const newPattern = useAudioStudioStore
        .getState()
        .patterns.find((p) => p.name === patternName);
      if (!newPattern) return;

      setActivePattern(newPattern.id);

      for (const trackData of result.tracks) {
        addTrack(trackData.instrument as any, trackData.name);

        const updatedPattern = useAudioStudioStore
          .getState()
          .patterns.find((p) => p.id === newPattern.id);
        if (!updatedPattern) continue;

        const newTrack = updatedPattern.tracks[updatedPattern.tracks.length - 1];
        if (!newTrack) continue;

        for (const note of trackData.notes) {
          useAudioStudioStore
            .getState()
            .addNote(newPattern.id, newTrack.id, note.midi, note.start, note.duration, note.velocity);
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addPattern, addTrack, setActivePattern],
  );

  // ── Export WAV ──
  const handleExportWAV = useCallback(async () => {
    if (!activePattern) return;
    try {
      const response = await fetch('/api/tools/audio/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey: `tools/audio/${activePattern.name}.wav`,
          tracks: activePattern.tracks.map((t) => ({
            id: t.id, name: t.name, instrument: t.instrument,
            notes: t.notes.map((n) => ({
              time: n.start, duration: n.duration, midi: n.midi, velocity: n.velocity,
            })),
            volume: t.volume, pan: t.pan,
          })),
          bpm,
          format: 'wav',
        }),
      });
      const result = await response.json();
      if (result.code === 200 && result.data?.downloadUrl) {
        const a = document.createElement('a');
        a.href = result.data.downloadUrl;
        a.download = `${activePattern.name}.wav`;
        a.click();
      }
    } catch {
      // silent
    }
  }, [activePattern, bpm]);

  // ── Fullscreen Toggle ──
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Click outside to close menus ──
  useEffect(() => {
    const close = () => {
      setShowFileMenu(false);
      setShowEditMenu(false);
      setShowViewMenu(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // ── Track list ──
  const totalNotes = useMemo(
    () => activePattern?.tracks.reduce((sum, t) => sum + t.notes.length, 0) || 0,
    [activePattern],
  );

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col select-none studio-root"
      style={{
        background: 'linear-gradient(160deg, #1A0A2E 0%, #2D1B4E 50%, #1A0A2E 100%)',
        color: 'var(--text-primary)',
        fontFamily: '"Noto Sans SC", "Zen Maru Gothic", sans-serif',
        // Override light-theme variables so child components use dark colors
        '--cloud': '#2D1B4E',
        '--ink': '#F5E6FF',
        '--ink-light': '#C4B5D9',
        '--ink-muted': '#7A6F75',
        '--ink-faint': '#6A5A7D',
        '--lavender': '#C8A2E8',
        '--lavender-light': 'rgba(200,162,232,0.2)',
        '--lavender-pale': 'rgba(200,162,232,0.12)',
        '--sakura': '#FF6B9D',
        '--sakura-light': 'rgba(255,107,157,0.2)',
        '--sakura-pale': 'rgba(255,107,157,0.12)',
        '--sakura-dark': '#FF6B9D',
        '--mint': '#6BCB77',
        '--mint-pale': 'rgba(107,203,119,0.12)',
        '--sky': '#7EC8E3',
        '--sky-pale': 'rgba(126,200,227,0.12)',
        '--sky-dark': '#7EC8E3',
        '--bg-background': '#1A0A2E',
      } as React.CSSProperties}
    >
      {/* ─── 全局样式注入 ─── */}
      <style>{`
        :root {
          ${Object.entries(THEME_VARS).map(([k, v]) => `${k}: ${v};`).join('\n')}
        }
        /* 自定义滚动条 */
        .studio-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .studio-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
        }
        .studio-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(200,162,232,0.2);
          border-radius: 3px;
        }
        .studio-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #FF6B9D;
        }
        /* 分割线 */
        .studio-divider {
          height: 1px;
          background: rgba(200,162,232,0.15);
        }
        .studio-divider-v {
          width: 1px;
          background: rgba(200,162,232,0.15);
        }
        /* 按钮基础 */
        .studio-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.15s ease;
          background: rgba(61,42,94,0.6);
          border: 1px solid rgba(200,162,232,0.12);
          color: var(--text-secondary);
          cursor: pointer;
          user-select: none;
        }
        .studio-btn:hover {
          background: rgba(74,53,112,0.8);
          border-color: rgba(200,162,232,0.25);
          color: var(--text-primary);
        }
        .studio-btn-primary {
          background: rgba(255,107,157,0.2);
          border-color: rgba(255,107,157,0.3);
          color: var(--accent-pink);
        }
        .studio-btn-primary:hover {
          background: rgba(255,107,157,0.35);
          color: #FF8DB0;
        }
        .studio-btn-active {
          background: rgba(255,107,157,0.15);
          border-color: rgba(255,107,157,0.3);
          color: var(--accent-pink);
        }
        /* 输入框样式 */
        .studio-input {
          background: rgba(45,27,78,0.6);
          border: 1px solid rgba(200,162,232,0.12);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 12px;
          padding: 4px 8px;
          outline: none;
          transition: border-color 0.15s;
        }
        .studio-input:focus {
          border-color: var(--accent-pink);
        }
        .studio-input::placeholder {
          color: rgba(196,181,217,0.4);
        }
        /* 选择器 */
        .studio-select {
          background: rgba(45,27,78,0.6);
          border: 1px solid rgba(200,162,232,0.12);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 11px;
          padding: 4px 8px;
          outline: none;
          cursor: pointer;
        }
        .studio-select:focus {
          border-color: var(--accent-pink);
        }
        .studio-select option {
          background: #2D1B4E;
          color: var(--text-primary);
        }
        /* 滑块 */
        .studio-range {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: rgba(200,162,232,0.15);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .studio-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent-pink);
          border: 2px solid rgba(255,107,157,0.3);
          cursor: pointer;
          transition: all 0.15s;
        }
        .studio-range::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          border-color: var(--accent-pink);
        }
        /* Tab 样式 */
        .studio-tab {
          padding: 5px 14px;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          border-bottom: 2px solid transparent;
          background: transparent;
          border-radius: 0;
        }
        .studio-tab:hover {
          color: var(--text-primary);
          background: rgba(255,107,157,0.05);
        }
        .studio-tab-active {
          color: var(--accent-pink);
          border-bottom-color: var(--accent-pink);
        }
        /* 面板基础 */
        .studio-panel {
          background: rgba(45,27,78,0.4);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(200,162,232,0.08);
          border-radius: 8px;
        }
        /* 标题字体 */
        .studio-title {
          font-family: "Zen Maru Gothic", "Noto Sans SC", sans-serif;
          font-weight: 700;
        }
        .studio-mono {
          font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
        }
      `}</style>

      {/* ─── 顶部菜单栏 ─── */}
      <div
        className="flex-shrink-0 flex items-center px-3 py-1.5 gap-2"
        style={{
          background: 'linear-gradient(180deg, rgba(45,27,78,0.9) 0%, rgba(26,10,46,0.95) 100%)',
          borderBottom: '1px solid rgba(200,162,232,0.12)',
          minHeight: '40px',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mr-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          <span
            className="text-sm font-bold tracking-wide studio-title"
            style={{
              background: 'linear-gradient(135deg, #FF6B9D, #C8A2E8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Music Studio
          </span>
        </div>

        <div className="studio-divider-v h-5 mx-1" />

        {/* 菜单项 */}
        <div className="relative">
          <button
            className="studio-btn text-xs"
            onClick={(e) => { e.stopPropagation(); setShowFileMenu(!showFileMenu); setShowEditMenu(false); setShowViewMenu(false); }}
          >
            文件
          </button>
          {showFileMenu && (
            <div
              className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-lg py-1 shadow-xl"
              style={{ background: '#2D1B4E', border: '1px solid rgba(200,162,232,0.15)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors" onClick={() => { addPattern(`Pattern ${patterns.length + 1}`); setShowFileMenu(false); }}>
                新建 Pattern
              </button>
              <button className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors" onClick={() => { handleImportMIDIClick(); setShowFileMenu(false); }}>
                打开 MIDI...
              </button>
              <div className="h-px mx-2" style={{ background: 'rgba(200,162,232,0.1)' }} />
              <button className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors" onClick={() => { handleExportMIDI(); setShowFileMenu(false); }}>
                导出 MIDI...
              </button>
              <button className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors" onClick={() => { handleExportWAV(); setShowFileMenu(false); }}>
                导出 WAV...
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            className="studio-btn text-xs"
            onClick={(e) => { e.stopPropagation(); setShowEditMenu(!showEditMenu); setShowFileMenu(false); setShowViewMenu(false); }}
          >
            编辑
          </button>
          {showEditMenu && (
            <div
              className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg py-1 shadow-xl"
              style={{ background: '#2D1B4E', border: '1px solid rgba(200,162,232,0.15)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setShowEditMenu(false)}>
                撤销
              </button>
              <button className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setShowEditMenu(false)}>
                重做
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            className="studio-btn text-xs"
            onClick={(e) => { e.stopPropagation(); setShowViewMenu(!showViewMenu); setShowFileMenu(false); setShowEditMenu(false); }}
          >
            视图
          </button>
          {showViewMenu && (
            <div
              className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-lg py-1 shadow-xl"
              style={{ background: '#2D1B4E', border: '1px solid rgba(200,162,232,0.15)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
                onClick={() => { toggleShowMixer(); setShowViewMenu(false); }}
              >
                <span className="w-3 h-3 rounded border flex items-center justify-center" style={{ borderColor: 'rgba(200,162,232,0.3)', background: showMixer ? 'var(--accent-pink)' : 'transparent' }}>
                  {showMixer && <span className="text-[8px] text-white">✓</span>}
                </span>
                混音台
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2"
                onClick={() => { setBrowserCollapsed(!browserCollapsed); setShowViewMenu(false); }}
              >
                <span className="w-3 h-3 rounded border flex items-center justify-center" style={{ borderColor: 'rgba(200,162,232,0.3)', background: !browserCollapsed ? 'var(--accent-pink)' : 'transparent' }}>
                  {!browserCollapsed && <span className="text-[8px] text-white">✓</span>}
                </span>
                浏览器
              </button>
              <div className="h-px mx-2" style={{ background: 'rgba(200,162,232,0.1)' }} />
              <button className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors" onClick={() => { toggleFullscreen(); setShowViewMenu(false); }}>
                {isFullscreen ? '退出全屏' : '全屏模式'}
              </button>
            </div>
          )}
        </div>

        <button className="studio-btn text-xs">帮助</button>

        <div className="flex-1" />

        {/* ─── BPM ─── */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>BPM</span>
          <input
            type="number"
            value={bpm}
            onChange={handleBpmChange}
            className="studio-input w-16 text-center studio-mono text-xs"
            min={20}
            max={300}
          />
        </div>

        <div className="studio-divider-v h-5" />

        {/* ─── Time Signature ─── */}
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>4/4</span>

        <div className="studio-divider-v h-5" />

        {/* ─── Transport Buttons ─── */}
        <button onClick={handleRewind} className="studio-btn p-1.5" title="回到起点">
          <SkipBack size={14} />
        </button>

        {isPlaying ? (
          <button
            onClick={handlePlayPause}
            className="p-2 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,107,157,0.25)', border: '1px solid rgba(255,107,157,0.3)', color: 'var(--accent-pink)' }}
            title="暂停"
          >
            <Pause size={16} />
          </button>
        ) : (
          <button
            onClick={handlePlayPause}
            className="p-2 rounded-lg flex items-center justify-center transition-all hover:bg-[rgba(255,107,157,0.3)]"
            style={{ background: 'rgba(255,107,157,0.2)', border: '1px solid rgba(255,107,157,0.25)', color: 'var(--accent-pink)' }}
            title="播放"
          >
            <Play size={16} />
          </button>
        )}

        <button onClick={handleStop} className="studio-btn p-1.5" title="停止">
          <Square size={14} />
        </button>

        {/* ─── Metronome ─── */}
        <button
          onClick={toggleMetronome}
          className={`studio-btn p-1.5 ${metronomeOn ? 'studio-btn-active' : ''}`}
          title={metronomeOn ? '关闭节拍器' : '开启节拍器'}
        >
          <Metronome size={14} />
        </button>

        <div className="studio-divider-v h-5" />

        {/* ─── Time Display ─── */}
        <span className="studio-mono text-xs min-w-[48px]" style={{ color: 'var(--accent-gold)' }}>
          {formatTime(transportPosition)}
        </span>

        <div className="studio-divider-v h-5" />

        {/* ─── Fullscreen ─── */}
        <button onClick={toggleFullscreen} className="studio-btn p-1.5" title={isFullscreen ? '退出全屏' : '全屏'}>
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* ─── 主体三栏布局 ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── 左侧浏览器面板 ─── */}
        <BrowserPanel
          collapsed={browserCollapsed}
          onToggleCollapse={() => setBrowserCollapsed(!browserCollapsed)}
        />

        {/* ─── 中央: 轨道列表 + 编辑器 ─── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ borderLeft: '1px solid rgba(200,162,232,0.08)', borderRight: '1px solid rgba(200,162,232,0.08)' }}>
          {/* 轨道列表 + 编辑器 */}
          <div className="flex flex-1 overflow-hidden">
            {/* 轨道列表 */}
            <div
              className="flex-shrink-0 flex flex-col overflow-hidden"
              style={{ width: '200px', borderRight: '1px solid rgba(200,162,232,0.08)' }}
            >
              <div
                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(200,162,232,0.08)', color: 'var(--text-secondary)' }}
              >
                <Layers size={12} />
                <span>轨道</span>
                <span className="ml-auto" style={{ color: 'var(--accent-purple)' }}>{activePattern?.tracks.length || 0}</span>
              </div>

              {/* 轨道列表 */}
              <div className="flex-1 overflow-y-auto studio-scrollbar">
                {(activePattern?.tracks || []).map((track, index) => (
                  <div
                    key={track.id}
                    onClick={() => setActiveTrackIndex(index)}
                    className="px-3 py-2 cursor-pointer transition-colors"
                    style={{
                      borderBottom: '1px solid rgba(200,162,232,0.06)',
                      background: index === activeTrackIndex ? 'rgba(255,107,157,0.08)' : 'transparent',
                      borderLeft: index === activeTrackIndex ? '2px solid var(--accent-pink)' : '2px solid transparent',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />
                      <span className="text-[11px] font-medium truncate flex-1" style={{ color: 'var(--text-primary)' }}>
                        {track.name}
                      </span>
                    </div>
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {INSTRUMENTS.find((inst) => inst.value === track.instrument)?.label}
                    </div>

                    {/* 音量控件 */}
                    <div className="flex items-center gap-1 mb-0.5">
                      <Volume2 size={9} style={{ color: 'var(--accent-green)' }} />
                      <input
                        type="range"
                        min={-12}
                        max={6}
                        step={1}
                        value={track.volume}
                        onChange={(e) => {
                          e.stopPropagation();
                          setTrackVolume(activePatternId, track.id, Number(e.target.value));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="studio-range flex-1"
                      />
                      <span className="studio-mono text-[8px] w-6 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {track.volume > 0 ? '+' : ''}{track.volume}
                      </span>
                    </div>

                    {/* Mute / Solo */}
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTrackMute(activePatternId, track.id); }}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono leading-none transition-colors"
                        style={{
                          background: track.muted ? 'rgba(255,107,157,0.2)' : 'rgba(200,162,232,0.08)',
                          color: track.muted ? 'var(--accent-pink)' : 'var(--text-secondary)',
                        }}
                      >
                        M
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTrackSolo(activePatternId, track.id); }}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono leading-none transition-colors"
                        style={{
                          background: track.solo ? 'rgba(126,200,227,0.2)' : 'rgba(200,162,232,0.08)',
                          color: track.solo ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        }}
                      >
                        S
                      </button>
                      {activePattern && activePattern.tracks.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeTrack(activePatternId, track.id); }}
                          className="ml-auto p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-pink)] transition-colors"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 添加轨道按钮 */}
              <div className="flex flex-col flex-shrink-0" style={{ borderTop: '1px solid rgba(200,162,232,0.08)' }}>
                <div className="p-2">
                  <button
                    onClick={() => {
                      const trackIndex = (activePattern?.tracks.length || 0) + 1;
                      const instList = ['piano', 'guitar', 'bass', 'drums', 'strings', 'synth'] as const;
                      const instrument = instList[trackIndex % 6]!;
                      addTrack(instrument, `${INSTRUMENTS.find((i) => i.value === instrument)?.label || instrument} ${trackIndex}`);
                    }}
                    className="studio-btn w-full text-[10px]"
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    添加轨道
                  </button>

                  {/* 合成器编辑按钮 */}
                  {activeTrack && activeTrack.instrument !== 'drums' && (
                    <button
                      onClick={() => setShowSynthEditor(!showSynthEditor)}
                      className="studio-btn w-full text-[10px] mt-1"
                      style={{
                        justifyContent: 'flex-start',
                        color: showSynthEditor ? 'var(--accent-pink)' : 'var(--text-secondary)',
                        background: showSynthEditor ? 'rgba(255,107,157,0.1)' : undefined,
                        borderColor: showSynthEditor ? 'rgba(255,107,157,0.25)' : undefined,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                      合成器
                    </button>
                  )}
                </div>

                {/* 合成器编辑器面板 (可折叠) */}
                {showSynthEditor && activeTrack && (
                  <div className="px-2 pb-2 overflow-y-auto" style={{ maxHeight: '360px' }}>
                    <SynthEditor
                      patternId={activePatternId}
                      trackId={activeTrack.id}
                      config={activeTrack.synthConfig || {
                        oscillatorType: 'sine',
                        filterCutoff: 20000,
                        filterResonance: 0.1,
                        filterType: 'lowpass',
                        attack: 0.005,
                        decay: 0.1,
                        sustain: 0.3,
                        release: 0.5,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 中央编辑区域 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor Tabs */}
              <div
                className="flex items-center gap-0.5 px-3 flex-shrink-0"
                style={{
                  borderBottom: '1px solid rgba(200,162,232,0.08)',
                  background: 'rgba(26,10,46,0.3)',
                  minHeight: '34px',
                }}
              >
                <button
                  onClick={() => setActiveTab('step')}
                  className={`studio-tab ${activeTab === 'step' ? 'studio-tab-active' : ''}`}
                >
                  步进音序器
                </button>
                <button
                  onClick={() => setActiveTab('piano')}
                  className={`studio-tab ${activeTab === 'piano' ? 'studio-tab-active' : ''}`}
                >
                  钢琴卷帘
                </button>
                <button
                  onClick={() => setActiveTab('sampler')}
                  className={`studio-tab ${activeTab === 'sampler' ? 'studio-tab-active' : ''}`}
                >
                  鼓机
                </button>

                <div className="flex-1" />

                {/* Pattern 选择器 */}
                <div className="flex items-center gap-1">
                  <select
                    value={activePatternId}
                    onChange={(e) => setActivePattern(e.target.value)}
                    className="studio-select text-[10px]"
                  >
                    {patterns.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => addPattern(`Pattern ${patterns.length + 1}`)}
                    className="studio-btn p-1"
                    title="新建 Pattern"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 编辑器内容 */}
              <div className="flex-1 overflow-hidden studio-scrollbar">
                {activeTab === 'step' && <StepSequencer />}
                {activeTab === 'piano' && <PianoRoll />}
                {activeTab === 'sampler' && <SamplerPanel />}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 右侧混音台 ─── */}
        {showMixer && (
          <div
            className="flex-shrink-0 flex flex-col overflow-hidden"
            style={{ width: '300px' }}
          >
            {/* 混音台 */}
            <div className="flex-shrink-0 overflow-x-auto studio-scrollbar" style={{ borderBottom: '1px solid rgba(200,162,232,0.08)' }}>
              <div className="h-48">
                <Mixer />
              </div>
            </div>

            {/* 效果器面板 */}
            <div className="flex-shrink-0 max-h-[180px] overflow-y-auto studio-scrollbar" style={{ borderBottom: '1px solid rgba(200,162,232,0.08)' }}>
              {activeMixerChannelId ? (
                <EffectsPanel channelId={activeMixerChannelId} />
              ) : (
                <div className="px-3 py-3 text-[10px] text-center" style={{ color: 'var(--text-secondary)' }}>
                  请选择一个轨道
                </div>
              )}
            </div>

            {/* 可视化器 */}
            <div className="flex-1 min-h-[100px]">
              <Visualizer />
            </div>
          </div>
        )}
      </div>

      {/* ─── 底部状态栏 ─── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-1.5"
        style={{
          background: 'linear-gradient(0deg, rgba(26,10,46,0.95) 0%, rgba(45,27,78,0.8) 100%)',
          borderTop: '1px solid rgba(200,162,232,0.1)',
          minHeight: '30px',
        }}
      >
        {/* MIDI Import file input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mid,.midi"
          onChange={handleFileImport}
          className="hidden"
        />

        {/* Level Meter (simplified) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono" style={{ color: 'var(--accent-green)' }}>L</span>
            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(200,162,232,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${isPlaying ? 20 + Math.random() * 40 : 2}%`,
                  background: 'linear-gradient(90deg, var(--accent-green), var(--accent-pink))',
                }}
              />
            </div>
            <span className="text-[8px] font-mono" style={{ color: 'var(--accent-green)' }}>R</span>
          </div>
        </div>

        <div className="studio-divider-v h-3" />

        {/* 状态信息 */}
        <span className="text-[10px] studio-mono" style={{ color: 'var(--text-secondary)' }}>
          BPM: {bpm}
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>|</span>
        <span className="text-[10px] studio-mono" style={{ color: 'var(--text-secondary)' }}>
          轨道: {activePattern?.tracks.length || 0}
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>|</span>
        <span className="text-[10px] studio-mono" style={{ color: 'var(--text-secondary)' }}>
          音符: {totalNotes}
        </span>

        <div className="studio-divider-v h-3" />

        {/* 底部按钮 */}
        <button onClick={handleImportMIDIClick} className="studio-btn text-[9px] py-0.5 px-2">
          <Upload size={10} />
          导入 MIDI
        </button>
        <button onClick={handleExportMIDI} className="studio-btn text-[9px] py-0.5 px-2">
          <Download size={10} />
          导出 MIDI
        </button>
        <button onClick={handleExportWAV} className="studio-btn-primary text-[9px] py-0.5 px-2">
          WAV 导出
        </button>

        <div className="flex-1" />

        {/* 装饰 — 星座星星 */}
        <div className="flex items-center gap-1" style={{ color: 'rgba(200,162,232,0.3)' }}>
          <span className="text-[6px]">✦</span>
          <span className="text-[4px]">✦</span>
          <span className="text-[5px]">✦</span>
          <span className="text-[3px]">✦</span>
        </div>

        <span className="text-[9px] studio-mono" style={{ color: 'var(--accent-purple)', opacity: 0.5 }}>
          v2.0
        </span>
      </div>
    </div>
  );
}
