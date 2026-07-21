// Agent 编排 API - GET 列表 + POST 创建
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError } from '@/lib/errors';
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

/** GET - 用户 Agent 列表 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const agents = await prisma.aIAgent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, role: true, model: true, toolset: true, createdAt: true },
    });
    return NextResponse.json(successResponse(agents));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 创建 Agent */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const body = await request.json();
    if (!body.name) throw new ValidationError('Agent 名称必填');
    const toolset = safeToolset(body.toolset);
    const agent = await prisma.aIAgent.create({
      data: {
        userId,
        name: String(body.name),
        role: body.role ? String(body.role) : '你是一个乐于助人的 AI 助手。',
        model: body.model ? String(body.model) : '',
        toolset: JSON.stringify(toolset),
      },
    });
    return NextResponse.json(successResponse(agent, '已创建'));
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
