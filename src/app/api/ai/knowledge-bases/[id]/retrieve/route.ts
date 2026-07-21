// 知识库检索 - POST { query, topK } → 关键词命中 topK 切片 + 拼接上下文
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError, NotFoundError } from '@/lib/errors';
import { retrieveChunks, buildContext } from '@/services/ai/RagService';
import type { ApiResponse } from '@/types/api';

/** POST - 检索 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id } = await params;
    const kb = await prisma.aIKnowledgeBase.findFirst({ where: { id, userId } });
    if (!kb) throw new NotFoundError('知识库');
    const body = await request.json();
    const topK = Number(body.topK) || 3;
    const chunks = await retrieveChunks(userId, id, String(body.query ?? ''), topK);
    return NextResponse.json(successResponse({ chunks, context: buildContext(chunks) }));
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
