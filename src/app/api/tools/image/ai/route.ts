// AI 图片处理 API — POST 代理 AI 图片操作
// 调用 AIToolService, 当前返回占位响应
import { NextRequest, NextResponse } from 'next/server';
import { aiToolService, AINotConfiguredError } from '@/services/AIToolService';
import { aiImageSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { AIImageOperation, ProcessResult } from '@/types/tools';

/** POST — AI 图片处理代理 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ProcessResult>>> {
  try {
    const body = await request.json();

    // Zod 校验参数
    const validation = aiImageSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const { operation, fileKey, ...params } = validation.data;

    // 调用 AI 服务
    const outputKey = await aiToolService.handleImageOperation(
      operation as AIImageOperation,
      fileKey,
      params as Record<string, string | number>,
    );

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
      // AI 未配置 — 返回 200 但附带说明信息 (保留前端可用的提示)
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
