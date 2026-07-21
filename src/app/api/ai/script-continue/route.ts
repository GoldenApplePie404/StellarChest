// AI脚本续写API - POST
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/AIService';
import { aiScriptContinueSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { AIGenerateResult } from '@/types/ai';

/** POST - AI脚本续写 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<AIGenerateResult>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    const validation = aiScriptContinueSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const result = await aiService.continueScript(userId, validation.data);
    return NextResponse.json(successResponse(result, '脚本续写完成'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
