// 知识库 - 单条 PUT 更新 / DELETE 删除（级联删文档与切片）
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError, NotFoundError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** PUT - 更新名称/描述 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.aIKnowledgeBase.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('知识库');
    const body = await request.json();
    const updated = await prisma.aIKnowledgeBase.update({
      where: { id },
      data: { name: body.name ?? existing.name, desc: body.desc !== undefined ? body.desc : existing.desc },
    });
    return NextResponse.json(successResponse(updated, '已更新'));
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** DELETE - 删除（级联） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.aIKnowledgeBase.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('知识库');
    await prisma.aIKnowledgeBase.delete({ where: { id } });
    return NextResponse.json(successResponse(null, '已删除'));
  } catch (error: unknown) {
    if (error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
