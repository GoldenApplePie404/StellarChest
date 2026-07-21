// 图片裁剪交互组件 - Canvas画布拖拽裁剪框
// 输出裁剪参数调用/api/tools/image/crop
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

/** 裁剪参数 */
interface CropParams {
  /** X坐标（像素） */
  x: number;
  /** Y坐标（像素） */
  y: number;
  /** 裁剪宽度（像素） */
  width: number;
  /** 裁剪高度（像素） */
  height: number;
}

/** ImageCropper属性 */
interface ImageCropperProps {
  /** 裁剪完成回调 */
  onCropComplete?: (params: CropParams) => void;
  /** 自定义CSS类名 */
  className?: string;
}

/** 图片裁剪交互组件 */
export default function ImageCropper({
  onCropComplete,
  className = '',
}: ImageCropperProps): React.JSX.Element {
  /** 图片URL */
  const [imageUrl, setImageUrl] = useState<string>('');
  /** 裁剪框位置 */
  const [cropBox, setCropBox] = useState<CropParams>({ x: 0, y: 0, width: 200, height: 150 });
  /** 是否正在拖拽裁剪框 */
  const [isDragging, setIsDragging] = useState<boolean>(false);
  /** 拖拽偏移 */
  const dragOffset = useRef({ x: 0, y: 0 });
  /** Canvas ref */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 图片是否已加载 */
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  /** 图片尺寸 */
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });

  /** 绘制裁剪预览 */
  const drawCropPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);

      // 绘制原图
      ctx.drawImage(img, 0, 0);

      // 绘制裁剪框遮罩（裁剪框外部半透明灰色）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 清除裁剪框区域（还原原图）
      ctx.clearRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      ctx.drawImage(img, cropBox.x, cropBox.y, cropBox.width, cropBox.height, cropBox.x, cropBox.y, cropBox.width, cropBox.height);

      // 绘制裁剪框边框（粉色）
      ctx.strokeStyle = '#FF6B9D';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    };
    img.src = imageUrl;
  }, [imageUrl, cropBox]);

  /** 图片URL变化时重绘 */
  useEffect(() => {
    drawCropPreview();
  }, [drawCropPreview]);

  /** 处理Canvas鼠标按下 */
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // 检查鼠标是否在裁剪框内
    if (
      mouseX >= cropBox.x && mouseX <= cropBox.x + cropBox.width &&
      mouseY >= cropBox.y && mouseY <= cropBox.y + cropBox.height
    ) {
      setIsDragging(true);
      dragOffset.current = { x: mouseX - cropBox.x, y: mouseY - cropBox.y };
    }
  }, [cropBox]);

  /** 处理Canvas鼠标移动 */
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const newX = Math.max(0, Math.min(mouseX - dragOffset.current.x, imageSize.width - cropBox.width));
    const newY = Math.max(0, Math.min(mouseY - dragOffset.current.y, imageSize.height - cropBox.height));

    setCropBox({ ...cropBox, x: newX, y: newY });
  }, [isDragging, cropBox, imageSize]);

  /** 处理Canvas鼠标释放 */
  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /** 提交裁剪请求 */
  const handleCropSubmit = useCallback(async () => {
    if (!imageUrl) return;

    try {
      const token = localStorage.getItem('galgame_token') || '';
      const response = await fetch('/api/tools/image/crop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resource: imageUrl,
          x: cropBox.x,
          y: cropBox.y,
          width: cropBox.width,
          height: cropBox.height,
        }),
      });

      const result = await response.json();
      if (result.code === 200) {
        if (onCropComplete) onCropComplete(cropBox);
      }
    } catch {
      // 裁剪提交失败，仍然触发回调传递参数
      if (onCropComplete) onCropComplete(cropBox);
    }
  }, [imageUrl, cropBox, onCropComplete]);

  return (
    <div className={`${className}`}>
      {/* 图片URL输入 */}
      <div className="mb-4 flex items-center gap-3">
        <Input
          label="图片资源路径"
          value={imageUrl}
          onChange={setImageUrl}
          placeholder="输入图片URL或项目资源路径"
        />
        <Button variant="secondary" size="sm" onClick={drawCropPreview}>
          加载图片
        </Button>
      </div>

      {/* Canvas裁剪预览区域 */}
      <div className="mb-4 relative bg-black/10 rounded-lg overflow-hidden" style={{ maxHeight: '400px' }}>
        {imageUrl ? (
          <canvas
            ref={canvasRef}
            className="w-full h-auto cursor-move"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        ) : (
          <div className="text-center py-16 text-text-secondary">
            请输入图片URL后点击"加载图片"
          </div>
        )}
      </div>

      {/* 裁剪参数调整 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Input
          label="X坐标"
          type="number"
          value={String(cropBox.x)}
          onChange={(val) => setCropBox({ ...cropBox, x: Number(val) || 0 })}
        />
        <Input
          label="Y坐标"
          type="number"
          value={String(cropBox.y)}
          onChange={(val) => setCropBox({ ...cropBox, y: Number(val) || 0 })}
        />
        <Input
          label="宽度"
          type="number"
          value={String(cropBox.width)}
          onChange={(val) => setCropBox({ ...cropBox, width: Number(val) || 100 })}
        />
        <Input
          label="高度"
          type="number"
          value={String(cropBox.height)}
          onChange={(val) => setCropBox({ ...cropBox, height: Number(val) || 100 })}
        />
      </div>

      {/* 提交裁剪按钮 */}
      <Button variant="primary" fullWidth onClick={handleCropSubmit}>
        执行裁剪
      </Button>
    </div>
  );
}
