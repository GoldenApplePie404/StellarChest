// 图片元数据获取API - GET获取图片尺寸/格式/大小等信息
// 使用Sharp库metadata方法获取详细信息
import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/services/ImageService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ImageMetadata } from '@/services/ImageService';

/** GET - 获取图片元数据（通过query参数inputPath） */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ImageMetadata>>> {
  try {
    const inputPath = request.nextUrl.searchParams.get('inputPath') || '';

    if (!inputPath) {
      return NextResponse.json({ code: 400, data: null, message: '缺少输入图片路径参数' }, { status: 400 });
    }

    const metadata = await imageService.getImageMetadata(inputPath);
    return NextResponse.json(successResponse(metadata));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
