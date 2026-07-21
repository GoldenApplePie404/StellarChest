// 图片滤镜工具组件 — 实时Canvas预览 + 滑块调节 + 预设滤镜
// 亮度/对比度/饱和度/色相/模糊 + 6种预设, 左侧控制面板
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sliders, Upload, Download, Check, RotateCcw } from 'lucide-react';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import Button from '@/components/ui/Button';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import type { FilterSettings, FilterPreset } from '@/types/tools';

/** 预设滤镜定义 */
interface PresetButton {
  key: FilterPreset;
  label: string;
}

/** 预设滤镜列表 */
const FILTER_PRESETS: PresetButton[] = [
  { key: 'none', label: '原图' },
  { key: 'warm', label: '暖色' },
  { key: 'cool', label: '冷色' },
  { key: 'vintage', label: '复古' },
  { key: 'grayscale', label: '黑白' },
  { key: 'sepia', label: '老照片' },
  { key: 'sharpen', label: '锐化' },
];

/** 滤镜预设参数 (客户端Canvas渲染) */
const PRESET_PARAMS: Record<FilterPreset, Omit<FilterSettings, 'preset'>> = {
  none: { brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0 },
  warm: { brightness: 8, contrast: 0, saturation: 15, hue: 5, blur: 0 },
  cool: { brightness: 0, contrast: 0, saturation: -10, hue: -15, blur: 0 },
  vintage: { brightness: 0, contrast: 10, saturation: -40, hue: 3, blur: 0 },
  grayscale: { brightness: 0, contrast: 5, saturation: -100, hue: 0, blur: 0 },
  sepia: { brightness: 0, contrast: 5, saturation: -60, hue: 25, blur: 0 },
  sharpen: { brightness: 0, contrast: 15, saturation: 0, hue: 0, blur: 0 },
};

/** 图片滤镜工具组件 */
export default function ImageFilterTool(): React.JSX.Element {
  const { file, previewUrl, fileKey, setFile, uploadFile, applyFilter, isUploading, isProcessing, error } =
    useImageProcessing();

  const [settings, setSettings] = useState<FilterSettings>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    blur: 0,
    preset: 'none',
  });

  const [resultUrl, setResultUrl] = useState<string>('');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImgRef = useRef<HTMLImageElement | null>(null);

  /** 客户端实时滤镜渲染 (Canvas API) */
  const renderClientFilter = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const sourceImg = sourceImgRef.current;
    if (!canvas || !sourceImg) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = sourceImg.naturalWidth;
    const h = sourceImg.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    // 先应用预设滤镜参数为基准
    const base = PRESET_PARAMS[settings.preset];

    // 用户滑块值 覆盖/叠加 预设
    const brightness = 1 + ((settings.brightness ?? 0) + (base.brightness ?? 0)) / 100;
    const saturation = 1 + ((settings.saturation ?? 0) + (base.saturation ?? 0)) / 100;
    const hue = (settings.hue ?? 0) + (base.hue ?? 0);
    const contrastMult = 1 + ((settings.contrast ?? 0) + (base.contrast ?? 0)) / 100;
    const blurPx = ((settings.blur ?? 0) + (base.blur ?? 0)) / 20; // 0-20 -> 0-1 px range, scaled

    // CSS filter 实现
    const filterParts: string[] = [];
    filterParts.push(`brightness(${brightness.toFixed(2)})`);
    filterParts.push(`contrast(${contrastMult.toFixed(2)})`);
    filterParts.push(`saturate(${saturation.toFixed(2)})`);
    filterParts.push(`hue-rotate(${hue}deg)`);

    if (blurPx > 0) {
      filterParts.push(`blur(${blurPx.toFixed(2)}px)`);
    }

    // 灰度/褐色特殊处理 (CSS)
    if (settings.preset === 'grayscale' || settings.preset === 'sepia') {
      filterParts.push(settings.preset === 'grayscale' ? 'grayscale(1)' : 'sepia(0.6)');
    }

    ctx.filter = filterParts.join(' ');
    ctx.drawImage(sourceImg, 0, 0, w, h);
    ctx.filter = 'none';
  }, [settings]);

  /** 加载原始图片到内存 */
  useEffect(() => {
    if (!previewUrl) {
      sourceImgRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImgRef.current = img;
      renderClientFilter();
    };
    img.src = previewUrl;
  }, [previewUrl, renderClientFilter]);

  useEffect(() => {
    renderClientFilter();
  }, [renderClientFilter]);

  /** 拖放文件 */
  const handleFilesDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0 && files[0]) setFile(files[0]);
    },
    [setFile],
  );

  /** 重置所有设置 */
  const handleReset = useCallback(() => {
    setSettings({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      preset: 'none',
    });
  }, []);

  /** 应用滤镜 (服务端) */
  const handleApplyFilter = useCallback(async () => {
    const key = fileKey || (await uploadFile());
    if (!key) return;

    const result = await applyFilter(settings);
    if (result) {
      setResultUrl(result.downloadUrl);
    }
  }, [fileKey, uploadFile, applyFilter, settings]);

  /** 下载结果 */
  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = 'filtered_image.png';
    a.click();
  }, [resultUrl]);

  /** 更新单个设置值 */
  const updateSetting = useCallback(
    <K extends keyof FilterSettings>(key: K, value: FilterSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return (
    <ToolWorkspace title="滤镜调整" icon={Sliders} acceptMime="image/*" onFilesDrop={handleFilesDrop}>
      <div className="flex gap-6">
        {/* 左侧控制面板 (w-48) */}
        <div className="w-52 flex-shrink-0 space-y-4">
          {/* 滑条 */}
          <div>
            <label className="text-ink-light text-xs font-medium block mb-1">亮度</label>
            <input
              type="range"
              min={-100}
              max={100}
              value={settings.brightness}
              onChange={(e) => updateSetting('brightness', Number(e.target.value))}
              className="w-full accent-sakura h-1.5"
            />
            <span className="text-ink-faint text-xs">{settings.brightness}</span>
          </div>

          <div>
            <label className="text-ink-light text-xs font-medium block mb-1">对比度</label>
            <input
              type="range"
              min={-100}
              max={100}
              value={settings.contrast}
              onChange={(e) => updateSetting('contrast', Number(e.target.value))}
              className="w-full accent-sakura h-1.5"
            />
            <span className="text-ink-faint text-xs">{settings.contrast}</span>
          </div>

          <div>
            <label className="text-ink-light text-xs font-medium block mb-1">饱和度</label>
            <input
              type="range"
              min={-100}
              max={100}
              value={settings.saturation}
              onChange={(e) => updateSetting('saturation', Number(e.target.value))}
              className="w-full accent-sakura h-1.5"
            />
            <span className="text-ink-faint text-xs">{settings.saturation}</span>
          </div>

          <div>
            <label className="text-ink-light text-xs font-medium block mb-1">色相</label>
            <input
              type="range"
              min={-180}
              max={180}
              value={settings.hue}
              onChange={(e) => updateSetting('hue', Number(e.target.value))}
              className="w-full accent-lavender h-1.5"
            />
            <span className="text-ink-faint text-xs">{settings.hue}</span>
          </div>

          <div>
            <label className="text-ink-light text-xs font-medium block mb-1">模糊</label>
            <input
              type="range"
              min={0}
              max={20}
              value={settings.blur}
              onChange={(e) => updateSetting('blur', Number(e.target.value))}
              className="w-full accent-sky h-1.5"
            />
            <span className="text-ink-faint text-xs">{settings.blur}</span>
          </div>

          {/* 预设按钮 */}
          <div className="pt-3 border-t border-lavender-pale">
            <p className="text-ink-light text-xs font-medium mb-2">预设滤镜</p>
            <div className="flex flex-wrap gap-1.5">
              {FILTER_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    updateSetting('preset', p.key);
                    if (p.key !== 'none') {
                      const base = PRESET_PARAMS[p.key];
                      setSettings((prev) => ({
                        ...prev,
                        preset: p.key,
                        brightness: base.brightness,
                        contrast: base.contrast,
                        saturation: base.saturation,
                        hue: base.hue,
                        blur: base.blur,
                      }));
                    } else {
                      setSettings({
                        brightness: 0,
                        contrast: 0,
                        saturation: 0,
                        hue: 0,
                        blur: 0,
                        preset: 'none',
                      });
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    settings.preset === p.key
                      ? 'bg-sakura text-cloud shadow-sm'
                      : 'bg-lavender-pale text-ink-light hover:bg-lavender-light'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-ink-light text-xs hover:text-sakura-dark transition-colors"
          >
            <RotateCcw size={12} />
            重置
          </button>
        </div>

        {/* 右侧预览区域 */}
        <div className="flex-1 flex flex-col gap-4">
          {!previewUrl ? (
            <div className="border-2 border-dashed border-lavender-pale rounded-lg p-16 text-center bg-cloud hover:border-sakura transition-colors">
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
          ) : (
            <>
              <div className="rounded-lg overflow-hidden border border-lavender-pale bg-ink-faint/5 flex justify-center max-h-[480px]">
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full"
                  style={{ maxHeight: '480px' }}
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={handleApplyFilter}
                  loading={isUploading || isProcessing}
                >
                  <Check size={16} className="mr-1.5 inline" />
                  应用滤镜
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
      </div>
    </ToolWorkspace>
  );
}
