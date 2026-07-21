// AI配置管理API - GET获取配置+POST保存配置
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/AIService';
import { saveAIConfigSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { AIConfig } from '@/types/ai';

/** GET - 获取用户AI配置 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AIConfig | null>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    const config = await aiService.getAIConfig(userId);
    return NextResponse.json(successResponse(config));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 保存AI配置 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AIConfig>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    const validation = saveAIConfigSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const config = await aiService.saveAIConfig(userId, validation.data);
    return NextResponse.json(successResponse(config, '配置已保存'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
