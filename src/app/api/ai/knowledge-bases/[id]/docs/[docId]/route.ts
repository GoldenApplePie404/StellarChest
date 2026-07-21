// 知识库文档 - DELETE 删除（级联删切片）
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, NotFoundError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** DELETE - 删除文档 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id, docId } = await params;
    const kb = await prisma.aIKnowledgeBase.findFirst({ where: { id, userId } });
    if (!kb) throw new NotFoundError('知识库');
    const doc = await prisma.aIKnowledgeDoc.findFirst({ where: { id: docId, kbId: id } });
    if (!doc) throw new NotFoundError('文档');
    await prisma.aIKnowledgeDoc.delete({ where: { id: docId } });
    return NextResponse.json(successResponse(null, '已删除'));
  } catch (error: unknown) {
    if (error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
