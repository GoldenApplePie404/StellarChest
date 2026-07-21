// AI 音频工具组件 — 降噪/音乐生成/音效生成
// 选项卡切换, 参数配置, 调用 /api/tools/audio/ai
'use client';

import { useState, useCallback, useRef } from 'react';
import {
  BrainCircuit, Upload, Download, Sparkles, Zap, Settings, Play, Pause,
} from 'lucide-react';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import Button from '@/components/ui/Button';
import type { AIStudioOperation } from '@/types/tools';

/** AI 操作选项卡 */
interface AITabDef {
  operation: AIStudioOperation;
  label: string;
  description: string;
}

/** 选项卡列表 */
const AI_TABS: AITabDef[] = [
  {
    operation: 'denoise',
    label: '降噪',
    description: 'AI 自动移除音频中的背景噪音和杂音',
  },
  {
    operation: 'music-gen',
    label: '音乐生成',
    description: '根据风格和情绪描述，AI 生成原创音乐片段',
  },
  {
    operation: 'sfx-gen',
    label: '音效生成',
    description: '根据文字描述，AI 生成对应的音效',
  },
];

/** 情绪选项 */
const MOODS = [
  { value: 'happy', label: '愉快' },
  { value: 'sad', label: '悲伤' },
  { value: 'tense', label: '紧张' },
  { value: 'relaxed', label: '放松' },
  { value: 'epic', label: '史诗' },
];

/** 时长选项 (音乐生成) */
const MUSIC_DURATIONS = [15, 30, 60];

/** 时长选项 (音效生成) */
const SFX_DURATIONS = [1, 3, 5, 10];

/** AI 音频工具组件 */
export default function AudioAITool(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AIStudioOperation>('denoise');

  // 降噪
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);

  // 音乐生成
  const [musicStyle, setMusicStyle] = useState<string>('');
  const [musicMood, setMusicMood] = useState<string>('happy');
  const [musicDuration, setMusicDuration] = useState<number>(30);
  const [musicTempo, setMusicTempo] = useState<number>(120);

  // 音效生成
  const [sfxDescription, setSfxDescription] = useState<string>('');
  const [sfxDuration, setSfxDuration] = useState<number>(3);

  // 通用
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultUrl, setResultUrl] = useState<string>('');
  const [resultMessage, setResultMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  /** 设置音频文件 */
  const handleFileChange = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      setAudioUrl('');
      return;
    }
    setFile(f);
    setError('');
    const url = URL.createObjectURL(f);
    setAudioUrl(url);
  }, []);

  /** 拖放文件 */
  const handleFilesDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0 && files[0]) handleFileChange(files[0]);
    },
    [handleFileChange],
  );

  /** 执行 AI 操作 */
  const handleProcess = useCallback(async () => {
    setIsProcessing(true);
    setError('');
    setResultMessage('');
    setResultUrl('');

    try {
      const body: Record<string, string | number> = {
        operation: activeTab,
      };

      if (activeTab === 'denoise') {
        if (!file) {
          setError('请先选择音频文件');
          setIsProcessing(false);
          return;
        }

        // 上传文件
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/tools/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadResult = await uploadRes.json();

        if (uploadResult.code !== 200 || !uploadResult.data) {
          setError(uploadResult.message || '上传失败');
          setIsProcessing(false);
          return;
        }

        body.fileKey = uploadResult.data.fileKey;
      }

      if (activeTab === 'music-gen') {
        body.style = musicStyle || '轻快的钢琴曲';
        body.mood = musicMood;
        body.duration = musicDuration;
        body.tempo = musicTempo;
      }

      if (activeTab === 'sfx-gen') {
        if (!sfxDescription.trim()) {
          setError('请输入音效描述');
          setIsProcessing(false);
          return;
        }
        body.description = sfxDescription;
        body.duration = sfxDuration;
      }

      const aiRes = await fetch('/api/tools/audio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const aiResult = await aiRes.json();

      if (aiResult.code === 200) {
        if (aiResult.data) {
          setResultUrl(aiResult.data.downloadUrl);
          setResultMessage('处理完成');
        } else {
          setResultMessage(aiResult.message || 'AI 功能处理完成');
        }
      } else {
        setError(aiResult.message || 'AI 处理失败');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, [activeTab, file, musicStyle, musicMood, musicDuration, musicTempo, sfxDescription, sfxDuration]);

  /** 获取当前选项卡标签 */
  const currentTabLabel = AI_TABS.find((t) => t.operation === activeTab)?.label || '';

  return (
    <ToolWorkspace title="AI 音频工具" icon={BrainCircuit} acceptMime="audio/*" onFilesDrop={handleFilesDrop}>
      {/* AI 配置提示 */}
      <div className="mb-4 bg-gold/20 border border-gold/40 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-ink">
        <Zap size={16} className="text-gold/80 flex-shrink-0" />
        <span>需要配置 AI API Key</span>
        <a href="/ai/settings" className="ml-auto flex items-center gap-1 text-sakura-dark hover:underline font-medium">
          <Settings size={14} />
          前往设置
        </a>
      </div>

      {/* 操作选项卡 */}
      <div className="flex gap-1 mb-5 bg-lavender-pale/30 rounded-lg p-1">
        {AI_TABS.map((tab) => (
          <button
            key={tab.operation}
            onClick={() => setActiveTab(tab.operation)}
            className={`flex-1 py-2 px-2 rounded-md text-xs font-medium flex flex-col items-center gap-1 transition-all ${
              activeTab === tab.operation
                ? 'bg-sakura text-cloud shadow-sm'
                : 'text-ink-light hover:bg-cloud/50'
            }`}
          >
            <Sparkles size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 当前操作描述 */}
      <p className="text-ink-light text-sm mb-5">
        {AI_TABS.find((t) => t.operation === activeTab)?.description}
      </p>

      {/* === 降噪面板 === */}
      {activeTab === 'denoise' && (
        <div>
          {!audioUrl ? (
            <div className="border-2 border-dashed border-lavender-pale rounded-lg p-12 text-center bg-cloud hover:border-sakura transition-colors">
              <Upload size={36} className="text-sakura mx-auto mb-3" />
              <p className="text-ink font-medium">拖放音频文件到此处或点击上传</p>
              <p className="text-ink-light text-sm mt-1">支持 MP3 / WAV / OGG / FLAC</p>
              <label className="mt-4 inline-block cursor-pointer">
                <Button variant="primary" size="sm" onClick={() => {}}>
                  选择文件
                </Button>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-cloud rounded-lg border border-lavender-pale">
                <span className="text-ink text-sm font-medium truncate flex-1">
                  {file?.name || '音频文件'}
                </span>
                <audio ref={audioRef} src={audioUrl} controls className="h-9 w-48" />
                <button
                  onClick={() => handleFileChange(null)}
                  className="text-ink-light text-sm hover:text-sakura-dark"
                >
                  重新选择
                </button>
              </div>

              <Button variant="primary" onClick={handleProcess} loading={isProcessing} disabled={!file}>
                <Sparkles size={16} className="mr-1.5 inline" />
                AI 降噪
              </Button>
            </div>
          )}
        </div>
      )}

      {/* === 音乐生成面板 === */}
      {activeTab === 'music-gen' && (
        <div className="space-y-4">
          <div>
            <label className="text-ink text-sm font-medium block mb-1.5">风格描述</label>
            <input
              type="text"
              value={musicStyle}
              onChange={(e) => setMusicStyle(e.target.value)}
              placeholder="例如: 轻快的钢琴曲 / 电子舞曲 / 管弦乐"
              className="w-full px-3 py-2 rounded-lg border border-lavender-pale bg-cloud text-ink text-sm focus:outline-none focus:border-sakura"
            />
          </div>

          <div>
            <label className="text-ink text-sm font-medium block mb-1.5">情绪</label>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMusicMood(m.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    musicMood === m.value
                      ? 'bg-sakura text-cloud shadow-sm'
                      : 'bg-lavender-pale text-ink-light hover:bg-lavender-light'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-ink text-sm font-medium block mb-1.5">时长</label>
            <div className="flex gap-2">
              {MUSIC_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setMusicDuration(d)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    musicDuration === d
                      ? 'bg-sakura text-cloud shadow-sm'
                      : 'bg-lavender-pale text-ink-light hover:bg-lavender-light'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-ink text-sm font-medium block mb-1.5">
              速度: {musicTempo} BPM
            </label>
            <input
              type="range"
              min={60}
              max={200}
              value={musicTempo}
              onChange={(e) => setMusicTempo(Number(e.target.value))}
              className="w-full accent-sakura h-1.5"
            />
            <div className="flex justify-between text-ink-faint text-xs">
              <span>60</span>
              <span>200</span>
            </div>
          </div>

          <Button variant="primary" onClick={handleProcess} loading={isProcessing}>
            <Sparkles size={16} className="mr-1.5 inline" />
            生成音乐
          </Button>
        </div>
      )}

      {/* === 音效生成面板 === */}
      {activeTab === 'sfx-gen' && (
        <div className="space-y-4">
          <div>
            <label className="text-ink text-sm font-medium block mb-1.5">音效描述</label>
            <input
              type="text"
              value={sfxDescription}
              onChange={(e) => setSfxDescription(e.target.value)}
              placeholder="例如: 雨声 / 脚步声 / 门铃声 / 爆炸声"
              className="w-full px-3 py-2 rounded-lg border border-lavender-pale bg-cloud text-ink text-sm focus:outline-none focus:border-sakura"
            />
          </div>

          <div>
            <label className="text-ink text-sm font-medium block mb-1.5">时长</label>
            <div className="flex gap-2">
              {SFX_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setSfxDuration(d)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    sfxDuration === d
                      ? 'bg-sakura text-cloud shadow-sm'
                      : 'bg-lavender-pale text-ink-light hover:bg-lavender-light'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          <Button variant="primary" onClick={handleProcess} loading={isProcessing}>
            <Sparkles size={16} className="mr-1.5 inline" />
            生成音效
          </Button>
        </div>
      )}

      {/* 结果/错误 */}
      {resultMessage && !resultUrl && (
        <div className="mt-4 bg-mint-pale border border-mint-light rounded-lg px-4 py-3 text-sm text-ink">
          {resultMessage}
        </div>
      )}

      {resultUrl && (
        <div className="mt-4 bg-mint-pale border border-mint-light rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-ink font-medium">{resultMessage}</span>
          <audio src={resultUrl} controls className="h-8 flex-1 max-w-xs" />
          <Button variant="secondary" size="sm" onClick={() => {
            const a = document.createElement('a');
            a.href = resultUrl;
            a.download = 'ai_audio_output.wav';
            a.click();
          }}>
            <Download size={14} className="mr-1 inline" />
            下载
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-rose/30 text-sakura-dark px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </ToolWorkspace>
  );
}
