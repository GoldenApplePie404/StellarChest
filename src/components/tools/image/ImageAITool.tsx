// AI 图片工具组件 — 背景移除/区域修复/超分辨率/风格迁移
// 选项卡切换, 上传 + 参数, 调用 /api/tools/image/ai
'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles, Upload, Wand2, Maximize2, Palette,
  Eraser, Zap, Settings,
} from 'lucide-react';
import ToolWorkspace from '@/components/tools/ToolWorkspace';
import Button from '@/components/ui/Button';
import type { AIImageOperation } from '@/types/tools';

/** AI 操作选项卡定义 */
interface AITabDef {
  operation: AIImageOperation;
  label: string;
  icon: typeof Sparkles;
  description: string;
}

/** 选项卡列表 */
const AI_TABS: AITabDef[] = [
  {
    operation: 'remove-bg',
    label: '背景移除',
    icon: Eraser,
    description: 'AI 自动检测并移除图片背景，生成透明通道',
  },
  {
    operation: 'inpaint',
    label: '区域修复',
    icon: Wand2,
    description: 'AI 智能修复选定区域，自动填充内容',
  },
  {
    operation: 'super-resolution',
    label: '超分辨率',
    icon: Maximize2,
    description: 'AI 无损放大图片 2x 或 4x，增强细节',
  },
  {
    operation: 'style-transfer',
    label: '风格迁移',
    icon: Palette,
    description: 'AI 将图片转换为指定艺术风格',
  },
];

/** 风格选项 (用于 style-transfer) */
const STYLE_OPTIONS = [
  { value: 'anime', label: '二次元' },
  { value: 'watercolor', label: '水彩' },
  { value: 'sketch', label: '素描' },
  { value: 'oil-painting', label: '油画' },
];

/** AI 图片工具组件 */
export default function ImageAITool(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AIImageOperation>('remove-bg');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [scale, setScale] = useState<number>(2);
  const [style, setStyle] = useState<string>('anime');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  /** 设置文件并生成预览 */
  const handleFileChange = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      setPreviewUrl('');
      setResultMessage('');
      setError('');
      return;
    }

    setFile(f);
    setError('');
    setResultMessage('');

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }, []);

  /** 拖放文件 */
  const handleFilesDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0 && files[0]) {
        handleFileChange(files[0]);
      }
    },
    [handleFileChange],
  );

  /** 执行 AI 操作 */
  const handleProcess = useCallback(async () => {
    if (!file) {
      setError('请先选择图片');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResultMessage('');

    try {
      // 1. 上传文件
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

      const fileKey = uploadResult.data.fileKey;

      // 2. 调用 AI API
      const aiBody: Record<string, string | number> = {
        operation: activeTab,
        fileKey,
      };

      if (activeTab === 'super-resolution') {
        aiBody.scale = scale;
      }
      if (activeTab === 'style-transfer') {
        aiBody.style = style;
      }

      const aiRes = await fetch('/api/tools/image/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiBody),
      });

      const aiResult = await aiRes.json();

      if (aiResult.code === 200) {
        if (aiResult.data) {
          setResultMessage(`处理完成! 下载链接: ${aiResult.data.downloadUrl}`);
        } else if (aiResult.message) {
          // AI 未配置的占位消息
          setResultMessage(aiResult.message);
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
  }, [file, activeTab, scale, style]);

  return (
    <ToolWorkspace title="AI 工具" icon={Sparkles} acceptMime="image/*" onFilesDrop={handleFilesDrop}>
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
        {AI_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.operation;
          return (
            <button
              key={tab.operation}
              onClick={() => setActiveTab(tab.operation)}
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                isActive
                  ? 'bg-sakura text-cloud shadow-sm'
                  : 'text-ink-light hover:bg-cloud/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 当前操作描述 */}
      <p className="text-ink-light text-sm mb-4">
        {AI_TABS.find((t) => t.operation === activeTab)?.description}
      </p>

      {/* 操作特定参数 */}
      <div className="mb-4">
        {activeTab === 'super-resolution' && (
          <div className="flex items-center gap-3">
            <span className="text-ink text-sm font-medium">放大倍数:</span>
            {[2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  scale === s
                    ? 'bg-sakura text-cloud shadow-sm'
                    : 'bg-lavender-pale text-ink-light hover:bg-lavender-light'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}

        {activeTab === 'style-transfer' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-ink text-sm font-medium">目标风格:</span>
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  style === s.value
                    ? 'bg-sakura text-cloud shadow-sm'
                    : 'bg-lavender-pale text-ink-light hover:bg-lavender-light'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 上传区域 */}
      {!previewUrl ? (
        <div className="border-2 border-dashed border-lavender-pale rounded-lg p-12 text-center bg-cloud hover:border-sakura transition-colors">
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
                if (f) handleFileChange(f);
              }}
            />
          </label>
        </div>
      ) : (
        <>
          {/* 图片预览 */}
          <div className="rounded-lg overflow-hidden border border-lavender-pale bg-ink-faint/5 flex justify-center max-h-[360px] mb-4">
            <img
              src={previewUrl}
              alt="预览"
              className="max-w-full object-contain"
              style={{ maxHeight: '360px' }}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleProcess}
              loading={isProcessing}
            >
              <Sparkles size={16} className="mr-1.5 inline" />
              AI {AI_TABS.find((t) => t.operation === activeTab)?.label}
            </Button>

            <button
              onClick={() => handleFileChange(null)}
              className="text-ink-light text-sm hover:text-sakura-dark transition-colors"
            >
              重新选择
            </button>
          </div>

          {/* 结果/错误 */}
          {resultMessage && (
            <div className="mt-3 bg-mint-pale border border-mint-light rounded-lg px-4 py-3 text-sm text-ink">
              {resultMessage}
            </div>
          )}

          {error && (
            <div className="mt-3 bg-rose/30 text-sakura-dark px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </>
      )}
    </ToolWorkspace>
  );
}
