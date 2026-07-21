// 项目配置 API - PUT 更新配置（入口脚本、资源映射、角色列表等）
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ProjectConfig } from '@/types/project';

/** PUT - 更新项目配置 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ProjectConfig>>> {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    const project = await projectService.getProjectById(id);
    if (!project || project.userId !== userId) {
      return NextResponse.json(
        { code: 403, data: null, message: '无权操作此项目' },
        { status: 403 },
      );
    }

    const config = await projectService.saveProjectConfig(id, {
      entryScript: body.entryScript,
      characterIds: body.characterIds,
      resourceMap: body.resourceMap,
      dialogStyle: body.dialogStyle,
      textSpeed: body.textSpeed,
      autoSave: body.autoSave,
    });

    return NextResponse.json(successResponse(config, '配置更新成功'));
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
