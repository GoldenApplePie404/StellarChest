// 项目导入API - POST导入解包
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { AppError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { Project } from '@/types/project';

/** POST - 导入项目（上传.zip文件解包） */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<Project>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';

    // 解析multipart上传数据
    const formData = await request.formData();
    const zipFile = formData.get('zip') as File | null;

    if (!zipFile) {
      return NextResponse.json({ code: 400, data: null, message: '请上传zip文件' }, { status: 400 });
    }

    // 读取文件Buffer
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());

    // 调用项目导入服务
    const project = await projectService.importProject(userId, zipBuffer);

    return NextResponse.json({ code: 200, data: project, message: '项目导入成功' });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
