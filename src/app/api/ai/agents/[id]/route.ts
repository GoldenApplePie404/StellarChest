// Agent 单条 API - PUT 更新 / DELETE 删除
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError, NotFoundError } from '@/lib/errors';
import type { AIAgentToolset } from '@/types/ai';

function safeToolset(v: unknown): AIAgentToolset {
  const base: AIAgentToolset = { prompts: [], kb: [], mcp: [], web: false };
  if (!v || typeof v !== 'object') return base;
  const o = v as Record<string, unknown>;
  return {
    prompts: Array.isArray(o.prompts) ? o.prompts.map(String) : [],
    kb: Array.isArray(o.kb) ? o.kb.map(String) : [],
    mcp: Array.isArray(o.mcp) ? o.mcp.map(String) : [],
    web: Boolean(o.web),
  };
}

/** PUT - 更新 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.aIAgent.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Agent');
    const body = await request.json();
    const toolset = body.toolset !== undefined ? safeToolset(body.toolset) : undefined;
    const updated = await prisma.aIAgent.update({
      where: { id },
      data: {
        name: body.name ? String(body.name) : existing.name,
        role: body.role !== undefined ? String(body.role) : existing.role,
        model: body.model !== undefined ? (body.model ? String(body.model) : '') : existing.model,
        ...(toolset ? { toolset: JSON.stringify(toolset) } : {}),
      },
    });
    return NextResponse.json(successResponse(updated, '已更新'));
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** DELETE - 删除 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.aIAgent.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('Agent');
    await prisma.aIAgent.delete({ where: { id } });
    return NextResponse.json(successResponse(null, '已删除'));
  } catch (error: unknown) {
    if (error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
