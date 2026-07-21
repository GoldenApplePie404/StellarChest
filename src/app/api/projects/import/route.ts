// 项目导入API - POST上传.galtoolkit.zip并创建项目
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { Project } from '@/types/project';

/** POST - 上传.galtoolkit.zip导入项目 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Project>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) {
      return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const zipFile = formData.get('zip') as File | null;
    if (!zipFile) {
      return NextResponse.json({ code: 400, data: null, message: '请上传 .galtoolkit.zip 文件' }, { status: 400 });
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    const project = await projectService.importProject(userId, zipBuffer);

    return NextResponse.json(successResponse(project, '项目导入成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
