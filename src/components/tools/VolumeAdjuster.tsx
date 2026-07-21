// 音量调节组件 - 滑块+增益值输入
// 调用/api/tools/audio/volume
'use client';

import { useState, useCallback, useRef } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

/** VolumeAdjuster属性 */
interface VolumeAdjusterProps {
  /** 调节完成回调 */
  onAdjustComplete?: () => void;
  /** 自定义CSS类名 */
  className?: string;
}

/** 音量调节组件 */
export default function VolumeAdjuster({
  onAdjustComplete,
  className = '',
}: VolumeAdjusterProps): React.JSX.Element {
  /** 源文件路径 */
  const [sourcePath, setSourcePath] = useState<string>('');
  /** 增益值（0.1-3.0，1.0为原始音量） */
  const [gain, setGain] = useState<number>(1.0);
  /** 调节中的加载状态 */
  const [adjusting, setAdjusting] = useState<boolean>(false);
  /** 调节结果URL */
  const [resultUrl, setResultUrl] = useState<string>('');
  /** 文件输入ref */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 处理本地文件选择 */
  const handleFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  /** 文件选择变化处理 */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setSourcePath(localUrl);
    }
  }, []);

  /** 滑块变化处理 */
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setGain(Number(e.target.value));
  }, []);

  /** 增益值输入变化处理 */
  const handleGainInput = useCallback((val: string) => {
    const num = Number(val);
    if (num >= 0.1 && num <= 3.0) {
      setGain(num);
    }
  }, []);

  /** 提交音量调节请求 */
  const handleAdjust = useCallback(async () => {
    if (!sourcePath) return;

    setAdjusting(true);
    try {
      const token = localStorage.getItem('galgame_token') || '';
      const response = await fetch('/api/tools/audio/volume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resource: sourcePath,
          gain,
        }),
      });

      const result = await response.json();
      if (result.code === 200 && result.data?.url) {
        setResultUrl(result.data.url);
        if (onAdjustComplete) onAdjustComplete();
      } else {
        if (onAdjustComplete) onAdjustComplete();
      }
    } catch {
      if (onAdjustComplete) onAdjustComplete();
    } finally {
      setAdjusting(false);
    }
  }, [sourcePath, gain, onAdjustComplete]);

  /** 增益值描述文字 */
  const getGainDescription = (g: number): string => {
    if (g < 0.5) return '大幅降低音量';
    if (g < 0.8) return '轻微降低音量';
    if (g === 1.0) return '原始音量';
    if (g <= 1.5) return '轻微提升音量';
    if (g <= 2.0) return '中等提升音量';
    return '大幅提升音量';
  };

  /** 滑块进度条颜色 */
  const getSliderColor = (g: number): string => {
    if (g <= 1.0) return '#7EC8E3';
    if (g <= 2.0) return '#FFE66D';
    return '#FF6B6B';
  };

  return (
    <div className={`${className}`}>
      {/* 源文件选择 */}
      <div className="mb-4 space-y-3">
        <Input
          label="音频资源路径"
          value={sourcePath}
          onChange={setSourcePath}
          placeholder="输入音频URL或选择本地文件"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button variant="ghost" size="sm" onClick={handleFileSelect}>
          选择本地文件
        </Button>
      </div>

      {/* 源音频预览 */}
      {sourcePath && (
        <div className="mb-4 p-3 rounded-lg bg-white/5">
          <audio controls className="w-full" src={sourcePath}>
            音频预览
          </audio>
        </div>
      )}

      {/* 音量增益滑块 */}
      <div className="mb-4 px-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text-primary">
            音量增益
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={String(gain)}
              onChange={handleGainInput}
              className="w-16 text-center"
            />
            <span className="text-xs text-text-secondary">
              ({getGainDescription(gain)})
            </span>
          </div>
        </div>

        {/* 滑块控件 */}
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={gain}
          onChange={handleSliderChange}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${getSliderColor(gain)} ${((gain - 0.1) / 2.9) * 100}%, #e5e7eb ${((gain - 0.1) / 2.9) * 100}%)`,
          }}
        />

        {/* 刻度标记 */}
        <div className="flex items-center justify-between text-xs text-text-secondary mt-1">
          <span>0.1x</span>
          <span>1.0x (原始)</span>
          <span>3.0x</span>
        </div>
      </div>

      {/* 预设增益按钮 */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setGain(0.5)}>
          0.5x (降低)
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setGain(1.0)}>
          1.0x (原始)
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setGain(1.5)}>
          1.5x (提升)
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setGain(2.0)}>
          2.0x (放大)
        </Button>
      </div>

      {/* 调节按钮 */}
      <Button variant="primary" fullWidth loading={adjusting} onClick={handleAdjust}>
        {adjusting ? '调节中...' : '开始调节'}
      </Button>

      {/* 调节结果预览 */}
      {resultUrl && (
        <div className="mt-4">
          <div className="text-sm font-medium text-text-primary mb-2">调节结果</div>
          <div className="p-3 rounded-lg bg-white/5">
            <audio controls className="w-full" src={resultUrl}>
              调节结果预览
            </audio>
          </div>
        </div>
      )}
    </div>
  );
}
