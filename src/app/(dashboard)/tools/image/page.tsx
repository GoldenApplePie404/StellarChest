// 图片工具页 - 裁剪+格式转换+批量处理入口
// 整合ImageCropper和ImageConverter组件
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ImageCropper from '@/components/tools/ImageCropper';
import ImageConverter from '@/components/tools/ImageConverter';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';

/** 工具模式 */
type ImageToolMode = 'crop' | 'convert' | 'batch';

/** 图片工具页面组件 */
export default function ImageToolsPage(): React.JSX.Element {
  const router = useRouter();

  /** 当前选中工具模式 */
  const [activeMode, setActiveMode] = useState<ImageToolMode>('crop');
  /** Toast提示 */
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  /** 工具模式定义 */
  const modes: { key: ImageToolMode; label: string; description: string }[] = [
    { key: 'crop', label: '图片裁剪', description: '选择图片区域进行裁剪' },
    { key: 'convert', label: '格式转换', description: 'PNG/JPEG/WEBP格式互转' },
    { key: 'batch', label: '批量处理', description: '批量裁剪/转换/调整尺寸' },
  ];

  /** Toast关闭 */
  const handleToastClose = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <div className="min-h-screen p-8">
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">图片工具</h1>
          <p className="text-text-secondary text-sm">裁剪、格式转换、批量处理你的图片素材</p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/tools')}>
          返回工具首页
        </Button>
      </div>

      {/* 工具模式切换 */}
      <div className="flex items-center gap-2 mb-6">
        {modes.map((mode) => (
          <Button
            key={mode.key}
            variant={activeMode === mode.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveMode(mode.key)}
          >
            {mode.label}
          </Button>
        ))}
      </div>

      {/* 工具内容区域 */}
      <Card>
        {activeMode === 'crop' && (
          <ImageCropper
            onCropComplete={(params) => {
              setToast({ message: `裁剪参数: x=${params.x}, y=${params.y}, w=${params.width}, h=${params.height}`, type: 'success' });
            }}
          />
        )}

        {activeMode === 'convert' && (
          <ImageConverter
            onConvertComplete={() => {
              setToast({ message: '格式转换完成', type: 'success' });
            }}
          />
        )}

        {activeMode === 'batch' && (
          <div className="text-center py-8">
            <div className="text-text-secondary text-sm mb-4">
              批量处理功能需要选择多个图片文件，支持批量裁剪/转换/调整尺寸
            </div>
            <Button variant="accent" size="sm">
              上传多张图片
            </Button>
            <div className="text-xs text-text-secondary mt-4">
              (批量处理功能将在后续版本完善)
            </div>
          </div>
        )}
      </Card>

      {/* Toast提示 */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={handleToastClose} />
      )}
    </div>
  );
}
