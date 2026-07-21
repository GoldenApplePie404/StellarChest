// 音频元数据获取API - GET获取音频时长/格式/比特率等信息
// 使用fluent-ffmpeg的ffprobe方法获取详细信息
import { NextRequest, NextResponse } from 'next/server';
import { audioService } from '@/services/AudioService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { AudioMetadata } from '@/services/AudioService';

/** GET - 获取音频元数据（通过query参数inputPath） */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AudioMetadata>>> {
  try {
    const inputPath = request.nextUrl.searchParams.get('inputPath') || '';

    if (!inputPath) {
      return NextResponse.json({ code: 400, data: null, message: '缺少输入音频路径参数' }, { status: 400 });
    }

    const metadata = await audioService.getAudioMetadata(inputPath);
    return NextResponse.json(successResponse(metadata));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
