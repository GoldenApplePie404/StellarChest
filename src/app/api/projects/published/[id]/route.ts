// 已发布项目详情API - GET /api/projects/published/[id]
// 公开接口，无需登录
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { PublishedProject } from '@/services/ProjectService';
import type { ProjectFile, ProjectConfig } from '@/types/project';

/** GET - 获取已发布项目详情 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PublishedProject & { files: ProjectFile[]; config: ProjectConfig }>>> {
  try {
    const { id } = await params;

    // 增加浏览计数
    await projectService.incrementViewCount(id);

    // 获取已发布项目详情
    const project = await projectService.getPublishedProjectById(id);

    return NextResponse.json(successResponse(project));
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
