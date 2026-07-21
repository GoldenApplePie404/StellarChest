// 音量调节API - POST调整音频音量（增益/衰减）
// 使用fluent-ffmpeg的audioFilters volume方法
import { NextRequest, NextResponse } from 'next/server';
import { audioService } from '@/services/AudioService';
import { volumeAdjustSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** POST - 音量调节 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ outputPath: string }>>> {
  try {
    const body = await request.json();

    // 校验音量参数
    const volumeValidation = volumeAdjustSchema.safeParse(body);
    if (!volumeValidation.success) {
      const error = fromZodError(volumeValidation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    // 获取输入音频路径（必填）
    const inputPath: string = body.inputPath || '';
    if (!inputPath) {
      return NextResponse.json({ code: 400, data: null, message: '缺少输入音频路径' }, { status: 400 });
    }

    // 构建输出路径
    const inputExt = inputPath.split('.').pop() || 'wav';
    const outputPath = audioService.getTempOutputPath(`volume_${Date.now()}.${inputExt}`);

    // 执行音量调节
    const resultPath = await audioService.adjustVolume(
      inputPath,
      outputPath,
      volumeValidation.data.volume,
    );

    return NextResponse.json(successResponse({ outputPath: resultPath }, '音量调节成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
