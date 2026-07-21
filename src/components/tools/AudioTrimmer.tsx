// 音频裁剪组件 - 时间范围选择器
// 调用/api/tools/audio/trim
'use client';

import { useState, useCallback, useRef } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

/** AudioTrimmer属性 */
interface AudioTrimmerProps {
  /** 裁剪完成回调 */
  onTrimComplete?: () => void;
  /** 自定义CSS类名 */
  className?: string;
}

/** 音频裁剪组件 */
export default function AudioTrimmer({
  onTrimComplete,
  className = '',
}: AudioTrimmerProps): React.JSX.Element {
  /** 源文件路径 */
  const [sourcePath, setSourcePath] = useState<string>('');
  /** 开始时间（秒） */
  const [startTime, setStartTime] = useState<string>('0');
  /** 结束时间（秒） */
  const [endTime, setEndTime] = useState<string>('30');
  /** 裁剪中的加载状态 */
  const [trimming, setTrimming] = useState<boolean>(false);
  /** 裁剪结果URL */
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

  /** 提交裁剪请求 */
  const handleTrim = useCallback(async () => {
    if (!sourcePath) return;

    const start = Number(startTime) || 0;
    const end = Number(endTime) || 30;
    if (start >= end) return;

    setTrimming(true);
    try {
      const token = localStorage.getItem('galgame_token') || '';
      const response = await fetch('/api/tools/audio/trim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resource: sourcePath,
          startTime: start,
          endTime: end,
        }),
      });

      const result = await response.json();
      if (result.code === 200 && result.data?.url) {
        setResultUrl(result.data.url);
        if (onTrimComplete) onTrimComplete();
      } else {
        if (onTrimComplete) onTrimComplete();
      }
    } catch {
      if (onTrimComplete) onTrimComplete();
    } finally {
      setTrimming(false);
    }
  }, [sourcePath, startTime, endTime, onTrimComplete]);

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

      {/* 时间范围选择 */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Input
          label="开始时间（秒）"
          type="number"
          value={startTime}
          onChange={setStartTime}
          placeholder="0"
        />
        <Input
          label="结束时间（秒）"
          type="number"
          value={endTime}
          onChange={setEndTime}
          placeholder="30"
        />
      </div>

      {/* 时间范围可视化进度条 */}
      <div className="mb-4 px-4">
        <div className="relative h-6 bg-white/10 rounded-full overflow-hidden">
          {/* 整体轨道 */}
          <div className="absolute inset-0 bg-white/5 rounded-full" />
          {/* 裁剪范围指示 */}
          <div
            className="absolute bg-primary/30 rounded-full border-2 border-primary"
            style={{
              left: `${(Number(startTime) || 0) / (Number(endTime) || 30 + Number(startTime) || 0) * 100}%`,
              width: `${((Number(endTime) || 30) - (Number(startTime) || 0)) / (Number(endTime) || 30 + Number(startTime) || 0) * 100}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-text-secondary mt-1">
          <span>{startTime}秒</span>
          <span>{endTime}秒</span>
        </div>
      </div>

      {/* 裁剪按钮 */}
      <Button variant="primary" fullWidth loading={trimming} onClick={handleTrim}>
        {trimming ? '裁剪中...' : '开始裁剪'}
      </Button>

      {/* 裁剪结果预览 */}
      {resultUrl && (
        <div className="mt-4">
          <div className="text-sm font-medium text-text-primary mb-2">裁剪结果</div>
          <div className="p-3 rounded-lg bg-white/5">
            <audio controls className="w-full" src={resultUrl}>
              裁剪结果预览
            </audio>
          </div>
        </div>
      )}
    </div>
  );
}
