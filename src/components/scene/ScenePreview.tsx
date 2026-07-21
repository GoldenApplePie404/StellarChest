// 场景预览画布 - 使用原生Canvas 2D渲染场景
'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { SceneCharacter } from './SceneBuilder';

/** 场景预览属性 */
interface ScenePreviewProps {
  /** 背景图URL */
  backgroundUrl?: string;
  /** 角色列表 */
  characters: SceneCharacter[];
  /** 对话说话者 */
  dialogSpeaker: string;
  /** 对话文本 */
  dialogText: string;
}

/** Canvas固定分辨率 */
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

/** 角色位置X坐标映射 */
const POSITION_X: Record<'left' | 'center' | 'right', number> = {
  left: CANVAS_WIDTH * 0.15,
  center: CANVAS_WIDTH * 0.5,
  right: CANVAS_WIDTH * 0.85,
};

/** 对话框配置 */
const DIALOG_BOX = {
  height: 140,
  paddingX: 40,
  paddingY: 20,
  marginBottom: 20,
};
const DIALOG_Y = CANVAS_HEIGHT - DIALOG_BOX.height - DIALOG_BOX.marginBottom;

/** 将URL加载为Image对象 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`图片加载失败: ${url}`));
    img.src = url;
  });
}

/** 场景预览画布组件 */
export default function ScenePreview({
  backgroundUrl,
  characters,
  dialogSpeaker,
  dialogText,
}: ScenePreviewProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const charImageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  /** 绘制场景 */
  const drawScene = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. 绘制黑色背景
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. 绘制背景图（cover模式）
    if (backgroundUrl) {
      try {
        if (!bgImageRef.current || bgImageRef.current.src !== backgroundUrl) {
          bgImageRef.current = await loadImage(backgroundUrl);
        }
        const bgImg = bgImageRef.current;
        // 计算cover模式的尺寸和偏移
        const imgRatio = bgImg.width / bgImg.height;
        const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        let sx: number, sy: number, sw: number, sh: number;

        if (imgRatio > canvasRatio) {
          // 图片更宽：裁剪左右
          sh = bgImg.height;
          sw = sh * canvasRatio;
          sx = (bgImg.width - sw) / 2;
          sy = 0;
        } else {
          // 图片更高：裁剪上下
          sw = bgImg.width;
          sh = sw / canvasRatio;
          sx = 0;
          sy = (bgImg.height - sh) / 2;
        }

        ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } catch {
        // 背景加载失败，保留黑色背景
      }
    }

    // 3. 绘制角色立绘
    for (const char of characters) {
      try {
        // 从缓存加载图片
        let charImg = charImageCache.current.get(char.id);
        if (!charImg || charImg.src !== char.url) {
          charImg = await loadImage(char.url);
          charImageCache.current.set(char.id, charImg);
        }

        ctx.save();

        // 定位
        const baseX = POSITION_X[char.position] || POSITION_X.center;
        const scale = char.scale;

        // 计算绘制尺寸（保持比例，高度不超过画布的70%）
        const maxCharHeight = CANVAS_HEIGHT * 0.7;
        const drawHeight = Math.min(charImg.height * scale, maxCharHeight);
        const drawWidth = charImg.width * (drawHeight / charImg.height);

        // X位置：居中于定位点
        let drawX = baseX - drawWidth / 2;

        // 翻转处理
        if (char.flip) {
          ctx.translate(drawX + drawWidth / 2, 0);
          ctx.scale(-1, 1);
          ctx.translate(-(drawX + drawWidth / 2), 0);
        }

        // Y位置：底部对齐（考虑对话框）
        const drawY = DIALOG_Y - drawHeight;

        ctx.drawImage(charImg, drawX, drawY, drawWidth, drawHeight);

        ctx.restore();
      } catch {
        // 单个角色加载失败，跳过
      }
    }

    // 4. 绘制对话框
    // 半透明黑色背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    const dialogX = 0;
    const dialogW = CANVAS_WIDTH;
    const dialogH = DIALOG_BOX.height + DIALOG_BOX.marginBottom;
    const dialogY_canvas = CANVAS_HEIGHT - dialogH;
    ctx.fillRect(dialogX, dialogY_canvas, dialogW, dialogH);

    // 说话者名称
    if (dialogSpeaker) {
      ctx.fillStyle = '#FF9BB5';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(dialogSpeaker, DIALOG_BOX.paddingX, dialogY_canvas + DIALOG_BOX.paddingY);
    }

    // 对话框文本
    if (dialogText) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // 自动换行
      const maxWidth = CANVAS_WIDTH - DIALOG_BOX.paddingX * 2;
      const lineHeight = 28;
      const textStartY = dialogY_canvas + DIALOG_BOX.paddingY + (dialogSpeaker ? 30 : 0);
      const words = dialogText.split('');
      let line = '';
      let lineY = textStartY;

      for (const char of words) {
        const testLine = line + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, DIALOG_BOX.paddingX, lineY);
          line = char;
          lineY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, DIALOG_BOX.paddingX, lineY);
    }
  }, [backgroundUrl, characters, dialogSpeaker, dialogText]);

  /** 状态变化时重新绘制 */
  useEffect(() => {
    drawScene();
  }, [drawScene]);

  /** 组件卸载时清理图片缓存 */
  useEffect(() => {
    return () => {
      charImageCache.current.clear();
      bgImageRef.current = null;
    };
  }, []);

  return (
    <div className="flex items-center justify-center w-full bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="max-w-full h-auto rounded-lg"
        style={{ aspectRatio: '16 / 9' }}
      />
    </div>
  );
}
