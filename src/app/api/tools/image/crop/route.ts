// 图片裁剪API - POST裁剪指定区域的图片
// 使用Sharp库extract方法实现精确裁剪
import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/services/ImageService';
import { imageCropSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import path from 'path';
import { EXPORT_DIR } from '@/lib/config';
import { generateId, getFileExtension } from '@/lib/utils';

/** POST - 图片裁剪 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ outputPath: string }>>> {
  try {
    const body = await request.json();

    // 校验裁剪参数
    const cropValidation = imageCropSchema.safeParse(body);
    if (!cropValidation.success) {
      const error = fromZodError(cropValidation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    // 获取输入图片路径（必填）
    const inputPath: string = body.inputPath || '';
    if (!inputPath) {
      return NextResponse.json({ code: 400, data: null, message: '缺少输入图片路径' }, { status: 400 });
    }

    // 构建输出路径
    const outputFilename = `crop_${generateId()}${getFileExtension(inputPath)}`;
    const outputPath = path.join(EXPORT_DIR, 'image_temp', outputFilename);

    // 执行裁剪
    const resultPath = await imageService.cropImage(inputPath, outputPath, cropValidation.data);

    return NextResponse.json(successResponse({ outputPath: resultPath }, '图片裁剪成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
