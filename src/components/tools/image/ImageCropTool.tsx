// 图片裁剪工具组件 — 上传/预设比例/裁剪/下载
// 支持自由裁剪 + 预设比例 (16:9/4:3/1:1/9:16/3:4), 日式标签风格
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Crop, Upload, Download, Check } from 'lucide-react';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import Button from '@/components/ui/Button';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import type { CropPreset } from '@/types/tools';

/** 预设比例定义 */
interface PresetDef {
  key: CropPreset;
  label: string;
  ratio: number; // width/height
}

/** 预设比例列表 */
const PRESETS: PresetDef[] = [
  { key: 'free', label: '自由', ratio: 0 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '9:16', label: '9:16', ratio: 9 / 16 },
  { key: '3:4', label: '3:4', ratio: 3 / 4 },
];

/** 裁剪区域 */
interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 图片裁剪工具组件 */
export default function ImageCropTool(): React.JSX.Element {
  const { file, previewUrl, setFile, uploadFile, applyCrop, isUploading, isProcessing, error } =
    useImageProcessing();

  const [preset, setPreset] = useState<CropPreset>('free');
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, width: 200, height: 200 });
  const [resultUrl, setResultUrl] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  /** 根据预设比例更新裁剪框 */
  const handlePresetChange = useCallback(
    (newPreset: CropPreset) => {
      setPreset(newPreset);

      const def = PRESETS.find((p) => p.key === newPreset);
      if (!def || def.ratio === 0) return;

      const maxW = imageSize.width;
      const maxH = imageSize.height;

      // 基于预设比例计算裁剪框
      let cropW: number;
      let cropH: number;

      if (def.ratio >= 1) {
        cropW = Math.min(maxW * 0.8, maxW);
        cropH = cropW / def.ratio;
        if (cropH > maxH) {
          cropH = maxH;
          cropW = cropH * def.ratio;
        }
      } else {
        cropH = Math.min(maxH * 0.8, maxH);
        cropW = cropH * def.ratio;
        if (cropW > maxW) {
          cropW = maxW;
          cropH = cropW / def.ratio;
        }
      }

      const cx = (maxW - cropW) / 2;
      const cy = (maxH - cropH) / 2;

      setCropRect({ x: cx, y: cy, width: cropW, height: cropH });
    },
    [imageSize],
  );

  /** 绘制裁剪预览 */
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

      ctx.drawImage(img, 0, 0);

      // 裁剪框外半透明遮罩
      ctx.fillStyle = 'rgba(74, 63, 69, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 清除裁剪框区域
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      ctx.drawImage(
        img,
        cropRect.x, cropRect.y, cropRect.width, cropRect.height,
        cropRect.x, cropRect.y, cropRect.width, cropRect.height,
      );

      // 裁剪框边框
      ctx.strokeStyle = '#FF9BB5';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
      ctx.setLineDash([]);
    };
    img.src = previewUrl;
  }, [previewUrl, cropRect]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  /** Canvas 鼠标事件 */
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      if (
        x >= cropRect.x && x <= cropRect.x + cropRect.width &&
        y >= cropRect.y && y <= cropRect.y + cropRect.height
      ) {
        setIsDragging(true);
        dragOffset.current = { x: x - cropRect.x, y: y - cropRect.y };
      }
    },
    [cropRect, getCanvasCoords],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;
      const { x, y } = getCanvasCoords(e);
      const newX = Math.max(0, Math.min(x - dragOffset.current.x, imageSize.width - cropRect.width));
      const newY = Math.max(0, Math.min(y - dragOffset.current.y, imageSize.height - cropRect.height));
      setCropRect((prev) => ({ ...prev, x: newX, y: newY }));
    },
    [isDragging, cropRect.width, cropRect.height, imageSize, getCanvasCoords],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /** 拖放文件 */
  const handleFilesDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0 && files[0]) {
        setFile(files[0]);
      }
    },
    [setFile],
  );

  /** 执行裁剪 */
  const handleApplyCrop = useCallback(async () => {
    // 先上传
    const key = await uploadFile();
    if (!key) return;

    const result = await applyCrop(
      Math.round(cropRect.x),
      Math.round(cropRect.y),
      Math.round(cropRect.width),
      Math.round(cropRect.height),
    );

    if (result) {
      setResultUrl(result.downloadUrl);
    }
  }, [uploadFile, applyCrop, cropRect]);

  /** 下载结果 */
  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'cropped_image.png';
    a.click();
  }, [resultUrl]);

  return (
    <ToolWorkspace title="裁剪与变换" icon={Crop} acceptMime="image/*" onFilesDrop={handleFilesDrop}>
      <div className="flex flex-col gap-5">
        {/* 上传区域 */}
        {!previewUrl && (
          <div className="border-2 border-dashed border-lavender-pale rounded-lg p-12 text-center bg-cloud hover:border-sakura transition-colors cursor-pointer">
            <Upload size={36} className="text-sakura mx-auto mb-3" />
            <p className="text-ink font-medium">拖放图片到此处或点击上传</p>
            <p className="text-ink-light text-sm mt-1">支持 PNG / JPG / WEBP</p>
            <label className="mt-4 inline-block cursor-pointer">
              <Button variant="primary" size="sm" onClick={() => {}}>
                选择文件
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </label>
          </div>
        )}

        {/* 预设比例按钮 */}
        {previewUrl && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePresetChange(p.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    preset === p.key
                      ? 'bg-sakura text-cloud shadow-sm'
                      : 'bg-lavender-pale text-ink-light hover:bg-lavender-light'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Canvas 预览 */}
            <div className="rounded-lg overflow-hidden bg-ink-faint/10 border border-lavender-pale max-h-[420px] flex justify-center">
              <canvas
                ref={canvasRef}
                className="max-w-full cursor-move"
                style={{ maxHeight: '420px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>

            {/* 操作按钮 + 错误 */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleApplyCrop}
                loading={isUploading || isProcessing}
              >
                <Check size={16} className="mr-1.5 inline" />
                应用裁剪
              </Button>

              {resultUrl && (
                <Button variant="secondary" onClick={handleDownload}>
                  <Download size={16} className="mr-1.5 inline" />
                  下载结果
                </Button>
              )}

              <button
                onClick={() => {
                  setFile(null);
                  setResultUrl('');
                }}
                className="text-ink-light text-sm hover:text-sakura-dark transition-colors"
              >
                重新选择
              </button>
            </div>

            {error && (
              <div className="bg-rose/30 text-sakura-dark px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </ToolWorkspace>
  );
}
