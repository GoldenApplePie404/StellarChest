// 音频格式转换组件 - 选择源文件+目标格式MP3/WAV/OGG
// 调用/api/tools/audio/convert
'use client';

import { useState, useCallback, useRef } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';

/** 目标格式选项 */
const AUDIO_FORMAT_OPTIONS = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
  { value: 'ogg', label: 'OGG' },
];

/** AudioConverter属性 */
interface AudioConverterProps {
  /** 转换完成回调 */
  onConvertComplete?: () => void;
  /** 自定义CSS类名 */
  className?: string;
}

/** 音频格式转换组件 */
export default function AudioConverter({
  onConvertComplete,
  className = '',
}: AudioConverterProps): React.JSX.Element {
  /** 源文件路径 */
  const [sourcePath, setSourcePath] = useState<string>('');
  /** 目标格式 */
  const [targetFormat, setTargetFormat] = useState<string>('mp3');
  /** 转换中的加载状态 */
  const [converting, setConverting] = useState<boolean>(false);
  /** 转换结果URL */
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

  /** 提交格式转换请求 */
  const handleConvert = useCallback(async () => {
    if (!sourcePath) return;

    setConverting(true);
    try {
      const token = localStorage.getItem('galgame_token') || '';
      const response = await fetch('/api/tools/audio/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resource: sourcePath,
          format: targetFormat,
        }),
      });

      const result = await response.json();
      if (result.code === 200 && result.data?.url) {
        setResultUrl(result.data.url);
        if (onConvertComplete) onConvertComplete();
      } else {
        if (onConvertComplete) onConvertComplete();
      }
    } catch {
      if (onConvertComplete) onConvertComplete();
    } finally {
      setConverting(false);
    }
  }, [sourcePath, targetFormat, onConvertComplete]);

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
        {/* 隐藏的文件选择输入 */}
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

      {/* 目标格式选择 */}
      <div className="mb-4">
        <Select
          label="目标格式"
          options={AUDIO_FORMAT_OPTIONS}
          value={targetFormat}
          onChange={setTargetFormat}
        />
      </div>

      {/* 转换按钮 */}
      <Button variant="primary" fullWidth loading={converting} onClick={handleConvert}>
        {converting ? '转换中...' : '开始转换'}
      </Button>

      {/* 转换结果预览 */}
      {resultUrl && (
        <div className="mt-4">
          <div className="text-sm font-medium text-text-primary mb-2">转换结果</div>
          <div className="p-3 rounded-lg bg-white/5">
            <audio controls className="w-full" src={resultUrl}>
              转换结果预览
            </audio>
          </div>
        </div>
      )}
    </div>
  );
}
