// 项目协作 API - GET 列表 / POST 添加 / DELETE 移除
// 依赖 proxy 注入的 x-user-id 作为操作者身份；owner 校验在 Service 层完成。
import { NextRequest, NextResponse } from 'next/server';
import {
  projectCollabService,
  type CollabRole,
  type CollaboratorView,
} from '@/services/ProjectCollabService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

interface CollabListResponse {
  projectId: string;
  ownerId: string;
  members: CollaboratorView[];
}

/** GET - 列出项目协作者（含 owner） */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<CollabListResponse>>> {
  try {
    const { id } = await params;
    const result = await projectCollabService.listCollaborators(id);
    return NextResponse.json(successResponse(result));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 添加协作者（仅 owner 可操作） */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<CollaboratorView>>> {
  try {
    const { id } = await params;
    const operatorUserId = request.headers.get('x-user-id') || '';
    if (!operatorUserId) {
      const { UnauthorizedError } = await import('@/lib/errors');
      return NextResponse.json((new UnauthorizedError('请先登录')).toResponse(), { status: 401 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const targetUserId = body.userId as string | undefined;
    const role = (body.role as CollabRole) || 'editor';
    if (!targetUserId) {
      return NextResponse.json({ code: 400, data: null, message: '缺少目标用户ID' }, { status: 400 });
    }

    const member = await projectCollabService.addCollaborator(id, operatorUserId, targetUserId, role);
    return NextResponse.json(successResponse(member, '已添加协作者'));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** DELETE - 移除协作者（仅 owner 可操作） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const operatorUserId = request.headers.get('x-user-id') || '';
    if (!operatorUserId) {
      const { UnauthorizedError } = await import('@/lib/errors');
      return NextResponse.json((new UnauthorizedError('请先登录')).toResponse(), { status: 401 });
    }

    const targetUserId = request.nextUrl.searchParams.get('userId');
    if (!targetUserId) {
      return NextResponse.json({ code: 400, data: null, message: '缺少目标用户ID' }, { status: 400 });
    }

    await projectCollabService.removeCollaborator(id, operatorUserId, targetUserId);
    return NextResponse.json(successResponse(null, '已移除协作者'));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
