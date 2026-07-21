// 音频处理共享 Hook — 上传/效果处理/状态管理
// 提供统一的文件选择、上传、效果处理流程和状态跟踪
'use client';

import { useState, useCallback, useRef } from 'react';
import type { AudioEffectsSettings, ProcessResult } from '@/types/tools';

/** 默认音频效果设置 */
const DEFAULT_EFFECTS: AudioEffectsSettings = {
  pitch: 0,
  speed: 1.0,
  volume: 0,
  fadeIn: 0,
  fadeOut: 0,
  preservePitch: true,
};

/** useAudioProcessing 返回值 */
interface UseAudioProcessingReturn {
  file: File | null;
  fileKey: string;
  audioUrl: string;
  setFile: (file: File | null) => void;
  uploadFile: () => Promise<string>;
  isUploading: boolean;
  effects: AudioEffectsSettings;
  setEffects: (effects: Partial<AudioEffectsSettings>) => void;
  applyEffects: () => Promise<ProcessResult | null>;
  isProcessing: boolean;
  error: string | null;
}

/** 音频处理共享 Hook */
export function useAudioProcessing(): UseAudioProcessingReturn {
  const [file, setFileState] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [effects, setEffectsState] = useState<AudioEffectsSettings>(DEFAULT_EFFECTS);
  const [error, setError] = useState<string | null>(null);

  /** 持有的 Blob URL (用于清理) */
  const blobUrlRef = useRef<string>('');

  /** 设置文件并生成音频预览URL */
  const setFile = useCallback((newFile: File | null) => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
    }

    setFileState(newFile);
    setError(null);

    if (newFile) {
      const url = URL.createObjectURL(newFile);
      blobUrlRef.current = url;
      setAudioUrl(url);
      setFileKey('');
    } else {
      setAudioUrl('');
      setFileKey('');
    }
  }, []);

  /** 上传文件 */
  const uploadFile = useCallback(async (): Promise<string> => {
    if (!file) {
      setError('请先选择文件');
      return '';
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tools/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.code === 200 && result.data) {
        setFileKey(result.data.fileKey);
        return result.data.fileKey;
      } else {
        setError(result.message || '上传失败');
        return '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '上传失败';
      setError(msg);
      return '';
    } finally {
      setIsUploading(false);
    }
  }, [file]);

  /** 更新效果设置 (部分合并) */
  const setEffects = useCallback((partial: Partial<AudioEffectsSettings>) => {
    setEffectsState((prev) => ({ ...prev, ...partial }));
  }, []);

  /** 应用音效 (服务端) */
  const applyEffects = useCallback(async (): Promise<ProcessResult | null> => {
    const key = fileKey || (await uploadFile());
    if (!key) return null;

    setIsProcessing(true);
    setError(null);

    try {
      const body = {
        fileKey: key,
        pitch: effects.pitch,
        speed: effects.speed,
        volume: effects.volume,
        fadeIn: effects.fadeIn,
        fadeOut: effects.fadeOut,
        preservePitch: effects.preservePitch,
      };

      const response = await fetch('/api/tools/audio/effects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (result.code === 200 && result.data) {
        return result.data as ProcessResult;
      } else {
        setError(result.message || '处理失败');
        return null;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '处理失败';
      setError(msg);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [fileKey, uploadFile, effects]);

  return {
    file,
    fileKey,
    audioUrl,
    setFile,
    uploadFile,
    isUploading,
    effects,
    setEffects,
    applyEffects,
    isProcessing,
    error,
  };
}
