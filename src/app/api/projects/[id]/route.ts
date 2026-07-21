// 单项目API - GET详情+PUT更新+DELETE删除
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { updateProjectSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { Project } from '@/types/project';

/** GET - 获取项目详情 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const result = await projectService.getProjectById(id);
    return NextResponse.json(successResponse(result));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** PUT - 更新项目 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<Project>>> {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    const validation = updateProjectSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const project = await projectService.updateProject(id, userId, validation.data);
    return NextResponse.json(successResponse(project, '项目更新成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** DELETE - 删除项目 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';

    await projectService.deleteProject(id, userId);
    return NextResponse.json(successResponse(null, '项目删除成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
