// 音乐工作室导出 API — POST 多轨合成与导出
// 接收 MusicTrack 数组, 合成多轨音频并输出为 WAV/MP3
import { NextRequest, NextResponse } from 'next/server';
import { audioService } from '@/services/AudioService';
import { audioStudioSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ProcessResult } from '@/types/tools';

/** POST — 音乐工作室导出 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProcessResult>>> {
  try {
    const body = await request.json();

    // Zod 校验参数
    const validation = audioStudioSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const { fileKey, tracks, bpm, format } = validation.data;

    // 调用多轨合成服务
    const outputKey = await audioService.synthesizeTracks(fileKey, tracks, bpm, format);

    const downloadUrl = `/api/tools/download?key=${encodeURIComponent(outputKey)}`;

    return NextResponse.json(
      successResponse<ProcessResult>({
        success: true,
        fileKey: outputKey,
        downloadUrl,
      }, '音乐工作室导出完成'),
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    const errMsg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, data: null, message: errMsg }, { status: 500 });
  }
}
