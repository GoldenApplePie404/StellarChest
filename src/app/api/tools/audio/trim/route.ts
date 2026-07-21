// 音频裁剪API - POST按起止时间裁剪音频片段
// 使用fluent-ffmpeg的setStartTime+duration方法
import { NextRequest, NextResponse } from 'next/server';
import { audioService } from '@/services/AudioService';
import { audioTrimSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** POST - 音频裁剪 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ outputPath: string }>>> {
  try {
    const body = await request.json();

    // 校验裁剪参数
    const trimValidation = audioTrimSchema.safeParse(body);
    if (!trimValidation.success) {
      const error = fromZodError(trimValidation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    // 获取输入音频路径（必填）
    const inputPath: string = body.inputPath || '';
    if (!inputPath) {
      return NextResponse.json({ code: 400, data: null, message: '缺少输入音频路径' }, { status: 400 });
    }

    // 构建输出路径
    const inputExt = inputPath.split('.').pop() || 'wav';
    const outputPath = audioService.getTempOutputPath(`trim_${Date.now()}.${inputExt}`);

    // 执行裁剪
    const resultPath = await audioService.trimAudio(
      inputPath,
      outputPath,
      trimValidation.data.startTime,
      trimValidation.data.endTime,
    );

    return NextResponse.json(successResponse({ outputPath: resultPath }, '音频裁剪成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
