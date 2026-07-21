// AI 提示词库 API - GET 列表(分类/关键词过滤) + POST 创建
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** GET - 列表（?category=&q=） */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const where: Record<string, unknown> = { userId };
    if (category) where.category = category;
    if (q) where.OR = [{ title: { contains: q } }, { content: { contains: q } }];
    const prompts = await prisma.aIPrompt.findMany({ where, orderBy: { updatedAt: 'desc' } });
    return NextResponse.json(successResponse(prompts));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 创建 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const body = await request.json();
    if (!body.title || !body.content) throw new ValidationError('标题与内容为必填');
    const prompt = await prisma.aIPrompt.create({
      data: {
        userId,
        title: String(body.title),
        category: body.category || '通用',
        content: String(body.content),
        isPublic: Boolean(body.isPublic),
      },
    });
    return NextResponse.json(successResponse(prompt, '已创建'));
  } catch (error: unknown) {
    if (error instanceof ValidationError) return NextResponse.json(error.toResponse(), { status: error.code });
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
