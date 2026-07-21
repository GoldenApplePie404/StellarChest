// 文件内容读写API - GET读取文件内容 + PUT写入文件内容
// 用于编辑器读写脚本文件
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { fileService } from '@/services/FileService';
import { AppError, successResponse, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors';
import { extractToken, verifyToken } from '@/lib/jwt';
import type { ApiResponse } from '@/types/api';

/** 认证中间件：优先 Authorization JWT，回退 proxy 注入的 x-user-id（与项目其他路由一致） */
async function authenticate(request: NextRequest): Promise<string> {
  // 1. 优先从 Authorization 头验证 JWT（兼容前端显式带 token 的场景）
  const authHeader = request.headers.get('Authorization');
  const token = extractToken(authHeader);
  if (token) {
    const payload = await verifyToken(token);
    if (payload) return payload.userId;
  }
  // 2. 回退到 proxy 注入的 x-user-id（proxy.ts 已先校验 JWT 再注入，全站统一鉴权来源）
  const userId = request.headers.get('x-user-id');
  if (userId) return userId;
  throw new UnauthorizedError('请提供有效的认证令牌');
}

/** GET - 获取文件内容（纯文本） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
): Promise<NextResponse<ApiResponse<{ fileId: string; content: string }>>> {
  try {
    await authenticate(request);
    const { id: projectId, fileId } = await params;

    // 查找项目文件记录获取存储路径
    const fileRecord = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId },
    });

    if (!fileRecord) {
      throw new NotFoundError('文件');
    }

    // 通过FileService读取文件内容
    const content = await fileService.readFile(fileRecord.storagePath);

    return NextResponse.json(
      successResponse({ fileId: fileRecord.id, content }),
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 },
    );
  }
}

/** PUT - 写入文件内容（覆盖写入） */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
): Promise<NextResponse<ApiResponse<{ fileId: string; content: string }>>> {
  try {
    const userId = await authenticate(request);
    const { id: projectId, fileId } = await params;

    // 解析请求体
    const body = await request.json();
    const content = body.content as string | undefined;

    if (typeof content !== 'string') {
      throw new ValidationError('请提供文件内容（content字段）');
    }

    // 查找项目文件记录
    const fileRecord = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId },
    });

    if (!fileRecord) {
      throw new NotFoundError('文件');
    }

    // 写入文件内容
    await fileService.writeFile(fileRecord.storagePath, content);

    // 更新文件大小
    const byteSize = Buffer.byteLength(content, 'utf-8');
    await prisma.projectFile.update({
      where: { id: fileId },
      data: { fileSize: byteSize },
    });

    return NextResponse.json(
      successResponse({ fileId: fileRecord.id, content }, '文件保存成功'),
    );
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 },
    );
  }
}
