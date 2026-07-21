// ============================================================
// TransportBar — 传输控制栏 (播放/停止/BPM/节拍器/位置)
// ============================================================
'use client';

import { useCallback, useMemo } from 'react';
import {
  Play, Pause, Square, Metronome, SkipBack,
} from 'lucide-react';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import AudioEngine from '@/engine/AudioEngine';

export default function TransportBar(): React.JSX.Element {
  const bpm = useAudioStudioStore((s) => s.bpm);
  const setBpm = useAudioStudioStore((s) => s.setBpm);
  const isPlaying = useAudioStudioStore((s) => s.isPlaying);
  const setIsPlaying = useAudioStudioStore((s) => s.setIsPlaying);
  const setTransportPosition = useAudioStudioStore((s) => s.setTransportPosition);
  const transportPosition = useAudioStudioStore((s) => s.transportPosition);
  const metronomeOn = useAudioStudioStore((s) => s.metronomeOn);
  const toggleMetronome = useAudioStudioStore((s) => s.toggleMetronome);
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);
  const showMixer = useAudioStudioStore((s) => s.showMixer);
  const toggleShowMixer = useAudioStudioStore((s) => s.toggleShowMixer);
  const addPattern = useAudioStudioStore((s) => s.addPattern);
  const setActivePattern = useAudioStudioStore((s) => s.setActivePattern);

  const activePattern = useMemo(
    () => patterns.find((p) => p.id === activePatternId),
    [patterns, activePatternId],
  );

  /** 播放/暂停 */
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

      // 查找当前活跃 Pattern
      const pattern = patterns.find((p) => p.id === activePatternId);
      if (pattern) {
        await AudioEngine.play(pattern);
      } else if (patterns.length > 0) {
        await AudioEngine.play(patterns[0]);
      }
    }
  }, [isPlaying, bpm, metronomeOn, patterns, activePatternId, setIsPlaying, setTransportPosition]);

  /** 停止 */
  const handleStop = useCallback(() => {
    AudioEngine.stop();
    setIsPlaying(false);
    setTransportPosition(0);
  }, [setIsPlaying, setTransportPosition]);

  /** 回到起始 */
  const handleRewind = useCallback(() => {
    if (isPlaying) {
      AudioEngine.stop();
      setIsPlaying(false);
    }
    setTransportPosition(0);
  }, [isPlaying, setIsPlaying, setTransportPosition]);

  /** 格式化时间 mm:ss.d */
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
  };

  /** BPM 变更 */
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

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-cloud border-b border-lavender-pale flex-shrink-0">
      {/* Pattern 选择器 */}
      <div className="flex items-center gap-1">
        <select
          value={activePatternId}
          onChange={(e) => setActivePattern(e.target.value)}
          className="px-2 py-1 rounded-lg border border-lavender-pale text-xs text-ink bg-cloud focus:outline-none focus:border-sakura"
        >
          {patterns.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => addPattern(`Pattern ${patterns.length + 1}`)}
          className="p-1 rounded text-ink-faint hover:text-ink hover:bg-lavender-pale transition-colors"
          title="新建 Pattern"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="w-px h-6 bg-lavender-pale" />

      {/* 播放控制 */}
      <button
        onClick={handleRewind}
        className="p-1.5 rounded-lg text-ink-faint hover:bg-lavender-pale hover:text-ink transition-colors"
        title="回到起点"
      >
        <SkipBack size={16} />
      </button>

      {isPlaying ? (
        <button
          onClick={handlePlayPause}
          className="w-9 h-9 rounded-full bg-sakura text-cloud flex items-center justify-center hover:bg-sakura-dark transition-colors shadow-sm"
          title="暂停"
        >
          <Pause size={16} />
        </button>
      ) : (
        <button
          onClick={handlePlayPause}
          className="w-9 h-9 rounded-full bg-sakura text-cloud flex items-center justify-center hover:bg-sakura-dark transition-colors shadow-sm"
          title="播放"
        >
          <Play size={16} />
        </button>
      )}

      <button
        onClick={handleStop}
        className="w-9 h-9 rounded-full bg-lavender-pale text-ink-light flex items-center justify-center hover:bg-lavender-light transition-colors"
        title="停止"
      >
        <Square size={14} />
      </button>

      <div className="w-px h-6 bg-lavender-pale" />

      {/* BPM */}
      <div className="flex items-center gap-1.5">
        <label className="text-ink-light text-xs">BPM</label>
        <input
          type="number"
          value={bpm}
          onChange={handleBpmChange}
          className="w-16 px-2 py-1 rounded-lg border border-lavender-pale text-sm text-ink text-center focus:outline-none focus:border-sakura bg-cloud"
          min={20}
          max={300}
        />
      </div>

      {/* 节拍器 */}
      <button
        onClick={toggleMetronome}
        className={`p-1.5 rounded-lg transition-colors ${
          metronomeOn ? 'bg-mint-pale text-mint' : 'text-ink-faint hover:bg-lavender-pale'
        }`}
        title={metronomeOn ? '关闭节拍器' : '开启节拍器'}
      >
        <Metronome size={16} />
      </button>

      <div className="w-px h-6 bg-lavender-pale" />

      {/* 位置显示 */}
      <span className="text-ink-light text-xs font-mono min-w-[48px]">
        {formatTime(transportPosition)}
      </span>

      <div className="flex-1" />

      {/* 混音台开关 */}
      <button
        onClick={toggleShowMixer}
        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          showMixer
            ? 'bg-sakura-pale text-sakura-dark'
            : 'text-ink-faint hover:bg-lavender-pale hover:text-ink'
        }`}
      >
        混音台
      </button>
    </div>
  );
}
