// 取消发布项目API - PUT /api/projects/[id]/unpublish
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { Project } from '@/types/project';

/** PUT - 取消发布项目 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<Project>>> {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';

    if (!userId) {
      return NextResponse.json(
        { code: 401, data: null, message: '请先登录' },
        { status: 401 }
      );
    }

    const project = await projectService.unpublishProject(id, userId);
    return NextResponse.json(successResponse(project, '已取消发布'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
