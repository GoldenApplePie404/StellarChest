// 图片格式转换API - POST将图片转换为PNG/JPG/WEBP格式
// 使用Sharp库对应格式的输出方法，支持质量参数
import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/services/ImageService';
import { imageConvertSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import path from 'path';
import { EXPORT_DIR } from '@/lib/config';
import { generateId } from '@/lib/utils';

/** POST - 图片格式转换 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ outputPath: string }>>> {
  try {
    const body = await request.json();

    // 校验格式转换参数
    const convertValidation = imageConvertSchema.safeParse(body);
    if (!convertValidation.success) {
      const error = fromZodError(convertValidation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    // 获取输入图片路径（必填）
    const inputPath: string = body.inputPath || '';
    if (!inputPath) {
      return NextResponse.json({ code: 400, data: null, message: '缺少输入图片路径' }, { status: 400 });
    }

    // 构建输出路径（使用目标格式扩展名）
    const format = convertValidation.data.format;
    const outputFilename = `convert_${generateId()}.${format}`;
    const outputPath = path.join(EXPORT_DIR, 'image_temp', outputFilename);

    // 执行格式转换
    const resultPath = await imageService.convertFormat(
      inputPath,
      outputPath,
      format,
      convertValidation.data.quality,
    );

    return NextResponse.json(successResponse({ outputPath: resultPath }, '图片格式转换成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
