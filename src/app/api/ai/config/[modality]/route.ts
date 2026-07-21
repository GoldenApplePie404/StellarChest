// 单模态AI配置API - GET读取(带回退默认) + PUT保存
// 路径参数 modality: chat | image | music | video | voice
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/AIService';
import { saveAIModalityConfigSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { AIModalityConfig, AIModality } from '@/types/ai';

const MODALITIES: AIModality[] = ['chat', 'image', 'music', 'video', 'voice'];

/** GET - 读取某模态配置（DB 缺失时回退预设默认） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modality: string }> },
): Promise<NextResponse<ApiResponse<AIModalityConfig>>> {
  try {
    const { modality } = await params;
    if (!MODALITIES.includes(modality as AIModality)) {
      return NextResponse.json({ code: 400, data: null, message: '未知模态' }, { status: 400 });
    }
    const userId = request.headers.get('x-user-id') || '';
    const config = await aiService.getConfigOrDefault(userId, modality as AIModality);
    return NextResponse.json(successResponse(config));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** PUT - 保存某模态配置 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ modality: string }> },
): Promise<NextResponse<ApiResponse<AIModalityConfig>>> {
  try {
    const { modality } = await params;
    if (!MODALITIES.includes(modality as AIModality)) {
      return NextResponse.json({ code: 400, data: null, message: '未知模态' }, { status: 400 });
    }
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    const validation = saveAIModalityConfigSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const config = await aiService.saveConfig(userId, modality as AIModality, validation.data);
    return NextResponse.json(successResponse(config, '配置已保存'));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
