// 音频效果 API — POST 应用音频效果 (音高/变速/音量/淡入淡出)
// 调用 AudioService 的多个方法
import { NextRequest, NextResponse } from 'next/server';
import { audioService } from '@/services/AudioService';
import { audioEffectsSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ProcessResult } from '@/types/tools';

/** POST — 应用音频效果 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProcessResult>>> {
  try {
    const body = await request.json();

    // Zod 校验参数
    const validation = audioEffectsSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const { fileKey, pitch, speed, volume, fadeIn, fadeOut, preservePitch } = validation.data;

    // 如果 speed !== 1.0, 先变速
    let currentKey = fileKey;
    if (speed !== 1.0) {
      currentKey = await audioService.applySpeed(currentKey, speed, preservePitch);
    }

    // 如果 pitch !== 0, 应用音高偏移
    if (pitch !== 0) {
      currentKey = await audioService.applyPitchShift(currentKey, pitch);
    }

    // 如果 volume !== 0 (dB), 应用音量增益
    if (volume !== 0) {
      currentKey = await audioService.applyVolume(currentKey, volume);
    }

    // 应用淡入淡出
    if (fadeIn > 0 || fadeOut > 0) {
      currentKey = await audioService.applyFade(currentKey, fadeIn, fadeOut);
    }

    const downloadUrl = `/api/tools/download?key=${encodeURIComponent(currentKey)}`;

    return NextResponse.json(
      successResponse<ProcessResult>({
        success: true,
        fileKey: currentKey,
        downloadUrl,
      }, '音频效果处理完成'),
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    const errMsg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, data: null, message: errMsg }, { status: 500 });
  }
}
