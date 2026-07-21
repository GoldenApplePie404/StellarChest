// 知识库文档 - GET 列表 + POST 上传(txt/md 切片落库)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError, NotFoundError } from '@/lib/errors';
import { chunkText } from '@/services/ai/RagService';
import type { ApiResponse } from '@/types/api';

/** GET - 文档列表 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id } = await params;
    const kb = await prisma.aIKnowledgeBase.findFirst({ where: { id, userId } });
    if (!kb) throw new NotFoundError('知识库');
    const docs = await prisma.aIKnowledgeDoc.findMany({ where: { kbId: id }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json(successResponse(docs));
  } catch (error: unknown) {
    if (error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 上传文档（支持 txt/md，按文本切片） */
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

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ValidationError('请上传文件');
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.txt') && !lower.endsWith('.md')) {
      throw new ValidationError('当前仅支持 .txt / .md 文本');
    }
    const text = await file.text();
    const chunks = chunkText(text);
    const doc = await prisma.aIKnowledgeDoc.create({
      data: { kbId: id, title: file.name, fileType: file.type || 'text/plain', status: 'chunked' },
    });
    await prisma.aIKnowledgeChunk.createMany({
      data: chunks.map((c, i) => ({ docId: doc.id, content: c, idx: i })),
    });
    return NextResponse.json(successResponse({ ...doc, chunkCount: chunks.length }, `已切片为 ${chunks.length} 段`));
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
