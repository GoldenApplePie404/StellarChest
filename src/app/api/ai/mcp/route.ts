// MCP 连接器 API - GET 列表 + POST 创建
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { successResponse, AppError, ValidationError } from '@/lib/errors';

/** GET - 用户 MCP 服务器列表 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const servers = await prisma.aIMcpServer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, command: true, url: true, status: true, createdAt: true },
    });
    return NextResponse.json(successResponse(servers));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 创建 MCP 服务器 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    const body = await request.json();
    if (!body.name) throw new ValidationError('服务器名称必填');
    if (!body.command && !body.url) throw new ValidationError('stdio 模式需填命令，或 url 模式需填地址');
    const server = await prisma.aIMcpServer.create({
      data: {
        userId,
        name: String(body.name),
        command: body.command ? String(body.command) : null,
        args: body.args ? String(body.args) : null,
        url: body.url ? String(body.url) : null,
        env: body.env ? String(body.env) : null,
        status: 'idle',
      },
    });
    return NextResponse.json(successResponse(server, '已创建'));
  } catch (error: unknown) {
    if (error instanceof ValidationError || error instanceof AppError)
      return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
