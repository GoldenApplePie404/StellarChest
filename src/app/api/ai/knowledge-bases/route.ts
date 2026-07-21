// 知识库 API - GET 列表(含文档数) + POST 创建
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** GET - 用户的知识库列表 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const kbs = await prisma.aIKnowledgeBase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { docs: true } } },
    });
    return NextResponse.json(successResponse(kbs));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 创建知识库 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const body = await request.json();
    if (!body.name) throw new ValidationError('知识库名称必填');
    const kb = await prisma.aIKnowledgeBase.create({
      data: { userId, name: String(body.name), desc: body.desc ? String(body.desc) : null },
    });
    return NextResponse.json(successResponse(kb, '已创建'));
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
