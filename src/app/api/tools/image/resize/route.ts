// 图片缩放API - POST按指定宽高缩放图片
// 使用Sharp库resize方法，fit:inside模式不放大
import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/services/ImageService';
import { AppError, successResponse, ValidationError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import path from 'path';
import { EXPORT_DIR } from '@/lib/config';
import { generateId, getFileExtension } from '@/lib/utils';

/** 缩放参数验证 */
interface ResizeParams {
  inputPath: string;
  width: number;
  height: number;
}

/** POST - 图片缩放 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ outputPath: string }>>> {
  try {
    const body: ResizeParams = await request.json();

    // 校验必填参数
    if (!body.inputPath) {
      return NextResponse.json({ code: 400, data: null, message: '缺少输入图片路径' }, { status: 400 });
    }
    if (!body.width || body.width < 1) {
      throw new ValidationError('目标宽度至少1像素');
    }
    if (!body.height || body.height < 1) {
      throw new ValidationError('目标高度至少1像素');
    }

    // 构建输出路径
    const outputFilename = `resize_${generateId()}${getFileExtension(body.inputPath)}`;
    const outputPath = path.join(EXPORT_DIR, 'image_temp', outputFilename);

    // 执行缩放
    const resultPath = await imageService.resizeImage(
      body.inputPath,
      outputPath,
      body.width,
      body.height,
    );

    return NextResponse.json(successResponse({ outputPath: resultPath }, '图片缩放成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
