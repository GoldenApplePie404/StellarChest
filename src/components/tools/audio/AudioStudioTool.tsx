// ============================================================
// AudioStudioTool — DAW 主布局 (FL Studio 风格多面板)
// Phase 2: BrowserPanel, SamplerPanel, EffectsPanel, Visualizer
// ============================================================
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Piano, Layers, Volume2, VolumeX, Upload, Download } from 'lucide-react';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import TransportBar from '@/components/audio-studio/TransportBar';
import StepSequencer from '@/components/audio-studio/StepSequencer';
import PianoRoll from '@/components/audio-studio/PianoRoll';
import Mixer from '@/components/audio-studio/Mixer';
import BrowserPanel from '@/components/audio-studio/BrowserPanel';
import EffectsPanel from '@/components/audio-studio/EffectsPanel';
import Visualizer from '@/components/audio-studio/Visualizer';
import SamplerPanel from '@/components/audio-studio/SamplerPanel';
import AudioEngine from '@/engine/AudioEngine';
import { INSTRUMENTS } from '@/types/audio-studio';

export default function AudioStudioTool(): React.JSX.Element {
  // Store 状态
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);
  const addTrack = useAudioStudioStore((s) => s.addTrack);
  const removeTrack = useAudioStudioStore((s) => s.removeTrack);
  const setActiveTrackIndex = useAudioStudioStore((s) => s.setActiveTrackIndex);
  const toggleTrackMute = useAudioStudioStore((s) => s.toggleTrackMute);
  const toggleTrackSolo = useAudioStudioStore((s) => s.toggleTrackSolo);
  const setTrackVolume = useAudioStudioStore((s) => s.setTrackVolume);
  const setTrackPan = useAudioStudioStore((s) => s.setTrackPan);
  const showMixer = useAudioStudioStore((s) => s.showMixer);
  const toggleShowMixer = useAudioStudioStore((s) => s.toggleShowMixer);
  const activeTrackIndex = useAudioStudioStore((s) => s.activeTrackIndex);
  const bpm = useAudioStudioStore((s) => s.bpm);
  const isPlaying = useAudioStudioStore((s) => s.isPlaying);
  const transportPosition = useAudioStudioStore((s) => s.transportPosition);
  const mixerChannels = useAudioStudioStore((s) => s.mixerChannels);
  const addPattern = useAudioStudioStore((s) => s.addPattern);
  const setActivePattern = useAudioStudioStore((s) => s.setActivePattern);
  const activeTab = useAudioStudioStore((s) => s.activeTab);
  const setActiveTab = useAudioStudioStore((s) => s.setActiveTab);

  const [browserCollapsed, setBrowserCollapsed] = useState(false);

  const activePattern = useMemo(
    () => patterns.find((p) => p.id === activePatternId),
    [patterns, activePatternId],
  );

  const activeTrack = useMemo(() => {
    if (!activePattern) return null;
    return activePattern.tracks[activeTrackIndex];
  }, [activePattern, activeTrackIndex]);

  // 获取当前活跃轨道对应的 mixer channel (如果有)
  const activeMixerChannelId = useMemo(() => {
    if (activeTrack) {
      // mixer channel 可能以 track 的 id 作为对照
      const ch = mixerChannels.find((m) => m.id === activeTrack.id);
      if (ch) return ch.id;
    }
    return mixerChannels[0]?.id || null;
  }, [activeTrack, mixerChannels]);

  // ============================================================
  // MIDI 导出 (使用 @tonejs/midi)
  // ============================================================
  const handleExportMIDI = useCallback(async () => {
    if (!activePattern) return;
    await AudioEngine.exportMIDI(activePattern);
  }, [activePattern]);

  // ============================================================
  // MIDI 导入
  // ============================================================
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportMIDIClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const result = await AudioEngine.importMIDI(file);
      if (!result) return;

      // 创建新 Pattern 并导入数据
      const patternName = result.name;
      addPattern(patternName);

      // 获取刚创建的 pattern (最新一个)
      const newPattern = useAudioStudioStore
        .getState()
        .patterns.find((p) => p.name === patternName);
      if (!newPattern) return;

      // 设置为当前
      setActivePattern(newPattern.id);

      // 为每个轨道添加数据
      for (const trackData of result.tracks) {
        addTrack(
          trackData.instrument as any,
          trackData.name,
        );

        // 获取刚添加的轨道
        const updatedPattern = useAudioStudioStore
          .getState()
          .patterns.find((p) => p.id === newPattern.id);
        if (!updatedPattern) continue;

        const newTrack = updatedPattern.tracks[updatedPattern.tracks.length - 1];
        if (!newTrack) continue;

        // 添加音符
        for (const note of trackData.notes) {
          useAudioStudioStore
            .getState()
            .addNote(newPattern.id, newTrack.id, note.midi, note.start, note.duration, note.velocity);
        }
      }

      // 重置 input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addPattern, addTrack, setActivePattern],
  );

  /** 导出 WAV (调用 API) */
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

  // ============================================================
  // 键盘快捷键
  // ============================================================
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

  return (
    <ToolWorkspace title="音乐工作室" icon={Piano}>
      <div className="flex flex-col h-full gap-0" style={{ minHeight: '500px' }}>
        {/* 顶部传输栏 */}
        <TransportBar />

        {/* 主体区域 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧浏览器面板 */}
          <BrowserPanel
            collapsed={browserCollapsed}
            onToggleCollapse={() => setBrowserCollapsed(!browserCollapsed)}
          />

          {/* 中央轨道面板 */}
          <div className="w-56 flex-shrink-0 border-r border-lavender-pale bg-cloud/30 flex flex-col">
            <div className="px-3 py-2 border-b border-lavender-pale flex items-center gap-1.5">
              <Layers size={14} className="text-ink-light" />
              <span className="text-ink text-xs font-medium">轨道</span>
              <span className="text-ink-faint text-[10px] ml-auto">
                {activePattern?.tracks.length || 0}
              </span>
            </div>

            {/* 轨道列表 */}
            <div className="flex-1 overflow-y-auto">
              {(activePattern?.tracks || []).map((track, index) => (
                <div
                  key={track.id}
                  onClick={() => setActiveTrackIndex(index)}
                  className={`px-3 py-2 border-b border-lavender-pale/50 cursor-pointer transition-colors ${
                    index === activeTrackIndex
                      ? 'bg-sakura-pale'
                      : 'hover:bg-lavender-pale/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: track.color }}
                    />
                    <span className="text-xs text-ink font-medium truncate flex-1">
                      {track.name}
                    </span>
                  </div>
                  <div className="text-ink-faint text-xs mb-1">
                    {INSTRUMENTS.find((inst) => inst.value === track.instrument)?.label}
                  </div>

                  {/* 音量滑块 */}
                  <div className="flex items-center gap-1 mb-1">
                    <Volume2 size={10} className="text-ink-faint flex-shrink-0" />
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
                      className="flex-1 h-1 accent-sakura cursor-pointer"
                      style={{ height: '4px' }}
                    />
                    <span className="text-ink-faint text-[9px] w-7 text-right font-mono">
                      {track.volume > 0 ? '+' : ''}{track.volume}
                    </span>
                  </div>

                  {/* 声像滑块 */}
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-ink-faint text-[9px] w-3">L</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={track.pan}
                      onChange={(e) => {
                        e.stopPropagation();
                        setTrackPan(activePatternId, track.id, Number(e.target.value));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 h-1 accent-sakura cursor-pointer"
                      style={{ height: '4px' }}
                    />
                    <span className="text-ink-faint text-[9px] w-3">R</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackMute(activePatternId, track.id);
                      }}
                      className={`p-0.5 rounded ${
                        track.muted ? 'text-sakura-dark bg-sakura-pale' : 'text-ink-faint hover:text-ink'
                      }`}
                      title={track.muted ? '取消静音' : '静音'}
                    >
                      {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackSolo(activePatternId, track.id);
                      }}
                      className={`p-0.5 rounded text-xs font-mono ${
                        track.solo ? 'text-sky-dark bg-sky-pale' : 'text-ink-faint hover:text-ink'
                      }`}
                      title="独奏"
                    >
                      S
                    </button>
                    {activePattern && activePattern.tracks.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTrack(activePatternId, track.id);
                        }}
                        className="ml-auto p-0.5 text-ink-faint hover:text-sakura-dark rounded"
                        title="删除轨道"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 添加轨道 */}
            <div className="p-2 border-t border-lavender-pale space-y-1.5">
              <button
                onClick={() => {
                  const trackIndex = (activePattern?.tracks.length || 0) + 1;
                  const instList = ['piano', 'guitar', 'bass', 'drums', 'strings', 'synth'] as const;
                  const instrument = instList[trackIndex % 6]!;
                  addTrack(instrument, `${INSTRUMENTS.find((i) => i.value === instrument)?.label} ${trackIndex}`);
                }}
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

          {/* 中央编辑区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 主编辑区 Tab 切换 (步进/钢琴/鼓机) */}
            <div className="flex items-center gap-0.5 px-3 py-1 border-b border-lavender-pale bg-cloud/20 flex-shrink-0">
              <button
                onClick={() => setActiveTab('step')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'step'
                    ? 'bg-cloud text-ink shadow-sm border border-lavender-pale'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                步进音序器
              </button>
              <button
                onClick={() => setActiveTab('piano')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'piano'
                    ? 'bg-cloud text-ink shadow-sm border border-lavender-pale'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                钢琴卷帘
              </button>
              <button
                onClick={() => setActiveTab('sampler')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'sampler'
                    ? 'bg-cloud text-ink shadow-sm border border-lavender-pale'
                    : 'text-ink-faint hover:text-ink'
                }`}
              >
                鼓机
              </button>
            </div>

            {/* 编辑器内容 */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'step' && <StepSequencer />}
              {activeTab === 'piano' && <PianoRoll />}
              {activeTab === 'sampler' && <SamplerPanel />}
            </div>
          </div>

          {/* 右侧混音台 + 效果器 + 可视化 (可折叠) */}
          {showMixer && (
            <div className="w-80 flex-shrink-0 border-l border-lavender-pale bg-cloud/20 flex flex-col overflow-hidden">
              {/* 混音台 */}
              <div className="flex-shrink-0 border-b border-lavender-pale">
                <Mixer />
              </div>

              {/* 效果器面板 */}
              <div className="flex-shrink-0 border-b border-lavender-pale py-1 max-h-48 overflow-y-auto">
                {activeMixerChannelId ? (
                  <EffectsPanel channelId={activeMixerChannelId} />
                ) : (
                  <div className="px-3 py-2 text-[10px] text-ink-faint text-center">
                    请选择一个轨道
                  </div>
                )}
              </div>

              {/* 可视化器 */}
              <div className="flex-1 min-h-[100px] border-t border-lavender-pale">
                <Visualizer />
              </div>
            </div>
          )}
        </div>

        {/* 底部工具栏 */}
        <div className="flex items-center gap-2 px-4 py-1.5 bg-cloud/50 border-t border-lavender-pale">
          {/* MIDI 导入 (隐藏文件输入) */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mid,.midi"
            onChange={handleFileImport}
            className="hidden"
          />

          <span className="text-[10px] text-ink-faint">
            BPM: {bpm}
          </span>
          <span className="text-[10px] text-ink-faint">|</span>
          <span className="text-[10px] text-ink-faint">
            轨道: {activePattern?.tracks.length || 0}
          </span>
          <span className="text-[10px] text-ink-faint">|</span>
          <span className="text-[10px] text-ink-faint">
            音符: {activePattern?.tracks.reduce((sum, t) => sum + t.notes.length, 0) || 0}
          </span>

          <div className="w-px h-4 bg-lavender-pale" />

          <button
            onClick={handleImportMIDIClick}
            className="px-2 py-0.5 rounded text-[10px] font-medium text-ink-faint hover:text-ink hover:bg-lavender-pale transition-colors flex items-center gap-1"
          >
            <Upload size={10} />
            MIDI 导入
          </button>

          <button
            onClick={handleExportMIDI}
            className="px-2 py-0.5 rounded text-[10px] font-medium text-ink-faint hover:text-ink hover:bg-lavender-pale transition-colors flex items-center gap-1"
          >
            <Download size={10} />
            MIDI 导出
          </button>

          <div className="w-px h-4 bg-lavender-pale" />

          <button
            onClick={handleExportWAV}
            className="px-2 py-0.5 rounded text-[10px] font-medium bg-sakura-pale text-sakura-dark hover:bg-sakura-light transition-colors"
          >
            WAV 导出
          </button>

          <div className="flex-1" />

          {/* 混音台开关 */}
          <button
            onClick={toggleShowMixer}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              showMixer
                ? 'bg-sakura-pale text-sakura-dark'
                : 'text-ink-faint hover:bg-lavender-pale hover:text-ink'
            }`}
          >
            混音台
          </button>
        </div>
      </div>
    </ToolWorkspace>
  );
}
