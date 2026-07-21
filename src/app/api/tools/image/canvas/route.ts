// 画布导出 API — POST 接收 base64 图像数据, 编码为指定格式
// 支持 PNG/JPG/WEBP, 可调质量参数
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { EXPORT_DIR } from '@/lib/config';
import { generateId } from '@/lib/utils';
import { canvasExportSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ProcessResult } from '@/types/tools';

/** POST — 画布图像导出 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProcessResult>>> {
  try {
    const body = await request.json();

    // Zod 校验参数
    const validation = canvasExportSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const { imageData, format, quality } = validation.data;

    // 解码 base64 (支持 data:image/...;base64,... 格式)
    let base64Data = imageData;
    if (imageData.includes(',')) {
      base64Data = imageData.split(',')[1] || imageData;
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 确定输出扩展名和 Sharp 编码选项
    const formatExtMap: Record<string, string> = {
      png: '.png',
      jpg: '.jpg',
      jpeg: '.jpg',
      webp: '.webp',
    };

    const ext = formatExtMap[format] || '.png';
    const fileUuid = generateId();
    const fileName = `canvas_${fileUuid}${ext}`;

    // 构建输出路径: data/exports/tools/image/{date}/canvas_{uuid}.{ext}
    const now = new Date();
    const dateDir = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const outputDir = path.join(EXPORT_DIR, 'tools', 'image', dateDir);
    await mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, fileName);

    // 使用 Sharp 编码
    let pipeline = sharp(buffer);

    switch (format) {
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 6 });
        break;
      case 'jpg':
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: quality ?? 85 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: quality ?? 85 });
        break;
    }

    await pipeline.toFile(outputPath);

    // 构建 fileKey (相对于 EXPORT_DIR)
    const relativeKey = path.join('tools', 'image', dateDir, fileName).replace(/\\/g, '/');
    const downloadUrl = `/api/tools/download?key=${encodeURIComponent(relativeKey)}`;

    return NextResponse.json(
      successResponse<ProcessResult>({
        success: true,
        fileKey: relativeKey,
        downloadUrl,
      }, '画布导出成功'),
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    const errMsg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, data: null, message: errMsg }, { status: 500 });
  }
}
