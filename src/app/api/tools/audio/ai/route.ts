// AI 音频处理 API — POST 代理 AI 音频操作 (降噪/音乐生成/音效生成)
// 调用 AIToolService 和 AudioService
import { NextRequest, NextResponse } from 'next/server';
import { aiToolService, AINotConfiguredError } from '@/services/AIToolService';
import { audioService } from '@/services/AudioService';
import { aiAudioSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { AIStudioOperation, ProcessResult } from '@/types/tools';

/** POST — AI 音频处理代理 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProcessResult>>> {
  try {
    const body = await request.json();

    // Zod 校验参数
    const validation = aiAudioSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const { operation, fileKey, ...params } = validation.data;

    let outputKey: string;

    switch (operation as AIStudioOperation) {
      case 'denoise': {
        // 降噪 — 使用 AudioService 的 ffmpeg anlmdn filter
        if (!fileKey) {
          return NextResponse.json(
            { code: 400, data: null, message: '降噪操作需要 fileKey 参数' },
            { status: 400 },
          );
        }
        outputKey = await audioService.applyNoiseReduction(fileKey);
        break;
      }

      case 'music-gen': {
        // AI 音乐生成 — 调用 AIToolService (占位)
        outputKey = await aiToolService.generateMusic({
          style: String(params.style || 'electronic'),
          mood: String(params.mood || 'neutral'),
          duration: Number(params.duration || 30),
          tempo: Number(params.tempo || 120),
        });
        break;
      }

      case 'sfx-gen': {
        // AI 音效生成 — 调用 AIToolService (占位)
        outputKey = await aiToolService.generateSoundEffect({
          description: String(params.description || ''),
          duration: Number(params.duration || 5),
        });
        break;
      }

      default: {
        return NextResponse.json(
          { code: 400, data: null, message: `未知的 AI 音频操作: ${String(operation)}` },
          { status: 400 },
        );
      }
    }

    const downloadUrl = `/api/tools/download?key=${encodeURIComponent(outputKey)}`;

    return NextResponse.json(
      successResponse<ProcessResult>({
        success: true,
        fileKey: outputKey,
        downloadUrl,
      }, `AI ${operation} 处理完成`),
    );
  } catch (error: unknown) {
    if (error instanceof AINotConfiguredError) {
      return NextResponse.json(
        { code: 200, data: null, message: error.message },
        { status: 200 },
      );
    }
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    const errMsg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ code: 500, data: null, message: errMsg }, { status: 500 });
  }
}
