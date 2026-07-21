// 图片滤镜 API — POST 应用滤镜效果
// 调用 ImageService.applyFilter, 支持亮度/对比度/饱和度/色相/模糊 + 预设
import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/services/ImageService';
import { imageFilterSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import { EXPORT_DIR } from '@/lib/config';
import path from 'path';
import type { ApiResponse } from '@/types/api';
import type { ProcessResult } from '@/types/tools';

/** POST — 应用图片滤镜 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProcessResult>>> {
  try {
    const body = await request.json();

    // Zod 校验参数
    const validation = imageFilterSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const { fileKey, brightness, contrast, saturation, hue, blur, preset } = validation.data;

    // 调用服务
    const outputKey = await imageService.applyFilter(fileKey, {
      brightness,
      contrast,
      saturation,
      hue,
      blur,
      preset,
    });

    // 构建下载链接: 输出文件在 EXPORT_DIR 下, 通过 /api/tools/download?key=... 访问
    const downloadUrl = `/api/tools/download?key=${encodeURIComponent(outputKey)}`;

    return NextResponse.json(
      successResponse<ProcessResult>({
        success: true,
        fileKey: outputKey,
        downloadUrl,
      }, '滤镜应用成功'),
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    const errMsg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, data: null, message: errMsg }, { status: 500 });
  }
}
