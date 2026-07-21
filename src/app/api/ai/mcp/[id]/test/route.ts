// MCP 连接测试 API - POST 测试连接并 listTools
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError, NotFoundError } from '@/lib/errors';
import { mcpManager } from '@/services/ai/McpService';

/** POST - 测试连接 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id } = await params;
    const server = await prisma.aIMcpServer.findFirst({ where: { id, userId } });
    if (!server) throw new NotFoundError('MCP 服务器');
    const res = await mcpManager.test(server);
    await prisma.aIMcpServer.update({ where: { id }, data: { status: res.ok ? 'connected' : 'error' } }).catch(() => undefined);
    return NextResponse.json(successResponse(res, res.ok ? '连接成功' : '连接失败'));
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
