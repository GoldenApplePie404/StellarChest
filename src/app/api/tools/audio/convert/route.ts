// 音频格式转换API - POST将音频转换为WAV/MP3/OGG格式
// 使用fluent-ffmpeg对应编码器进行格式转换
import { NextRequest, NextResponse } from 'next/server';
import { audioService } from '@/services/AudioService';
import { audioConvertSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** POST - 音频格式转换 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ outputPath: string }>>> {
  try {
    const body = await request.json();

    // 校验格式转换参数
    const convertValidation = audioConvertSchema.safeParse(body);
    if (!convertValidation.success) {
      const error = fromZodError(convertValidation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    // 获取输入音频路径（必填）
    const inputPath: string = body.inputPath || '';
    if (!inputPath) {
      return NextResponse.json({ code: 400, data: null, message: '缺少输入音频路径' }, { status: 400 });
    }

    // 构建输出路径
    const format = convertValidation.data.format;
    const outputPath = audioService.getTempOutputPath(`convert_${Date.now()}.${format}`);

    // 执行格式转换
    const resultPath = await audioService.convertAudio(inputPath, outputPath, format);

    return NextResponse.json(successResponse({ outputPath: resultPath }, '音频格式转换成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
