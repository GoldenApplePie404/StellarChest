// MCP 连接器单条 API - PUT 更新 / DELETE 删除
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError, NotFoundError } from '@/lib/errors';

/** PUT - 更新 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.aIMcpServer.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('MCP 服务器');
    const body = await request.json();
    const updated = await prisma.aIMcpServer.update({
      where: { id },
      data: {
        name: body.name ? String(body.name) : existing.name,
        command: body.command !== undefined ? (body.command ? String(body.command) : null) : existing.command,
        args: body.args !== undefined ? (body.args ? String(body.args) : null) : existing.args,
        url: body.url !== undefined ? (body.url ? String(body.url) : null) : existing.url,
        env: body.env !== undefined ? (body.env ? String(body.env) : null) : existing.env,
        status: 'idle',
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
    const existing = await prisma.aIMcpServer.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError('MCP 服务器');
    await prisma.aIMcpServer.delete({ where: { id } });
    return NextResponse.json(successResponse(null, '已删除'));
  } catch (error: unknown) {
    if (error instanceof NotFoundError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
