// 图片处理共享 Hook — 上传/处理/状态管理
// 提供统一的文件选择、上传、处理流程和状态跟踪
'use client';

import { useState, useCallback, useRef } from 'react';
import type { FilterSettings, CropPreset, ProcessResult } from '@/types/tools';

/** useImageProcessing 返回值 */
interface UseImageProcessingReturn {
  file: File | null;
  fileKey: string;
  previewUrl: string;
  setFile: (file: File | null) => void;
  uploadFile: () => Promise<string>;
  isUploading: boolean;
  applyFilter: (settings: FilterSettings) => Promise<ProcessResult | null>;
  applyCrop: (x: number, y: number, width: number, height: number) => Promise<ProcessResult | null>;
  exportImage: (imageData: string, format: string, quality?: number) => Promise<ProcessResult | null>;
  isProcessing: boolean;
  error: string | null;
}

/** 图片处理共享 Hook */
export function useImageProcessing(): UseImageProcessingReturn {
  const [file, setFileState] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /** 持有的 Blob URL (用于清理) */
  const blobUrlRef = useRef<string>('');

  /** 设置文件并生成预览 */
  const setFile = useCallback((newFile: File | null) => {
    // 清理旧的 blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = '';
    }

    setFileState(newFile);
    setError(null);

    if (newFile) {
      const url = URL.createObjectURL(newFile);
      blobUrlRef.current = url;
      setPreviewUrl(url);
      setFileKey('');
    } else {
      setPreviewUrl('');
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

  /** 应用滤镜 */
  const applyFilter = useCallback(
    async (settings: FilterSettings): Promise<ProcessResult | null> => {
      if (!fileKey) {
        setError('请先上传文件');
        return null;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch('/api/tools/image/filter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKey, ...settings }),
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
    },
    [fileKey],
  );

  /** 应用裁剪 */
  const applyCrop = useCallback(
    async (
      x: number,
      y: number,
      width: number,
      height: number,
    ): Promise<ProcessResult | null> => {
      if (!fileKey) {
        setError('请先上传文件');
        return null;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch('/api/tools/image/crop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputPath: fileKey, x, y, width, height }),
        });

        const result = await response.json();
        if (result.code === 200 && result.data) {
          return result.data as ProcessResult;
        } else {
          setError(result.message || '裁剪失败');
          return null;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '裁剪失败';
        setError(msg);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [fileKey],
  );

  /** 导出画布 */
  const exportImage = useCallback(
    async (
      imageData: string,
      format: string,
      quality?: number,
    ): Promise<ProcessResult | null> => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch('/api/tools/image/canvas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData, format, quality }),
        });

        const result = await response.json();
        if (result.code === 200 && result.data) {
          return result.data as ProcessResult;
        } else {
          setError(result.message || '导出失败');
          return null;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '导出失败';
        setError(msg);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    file,
    fileKey,
    previewUrl,
    setFile,
    uploadFile,
    isUploading,
    applyFilter,
    applyCrop,
    exportImage,
    isProcessing,
    error,
  };
}
