// 项目导出API - GET导出打包为.galtoolkit.zip
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { AppError } from '@/lib/errors';

/** GET - 导出项目为zip文件 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';

    // 校验项目权限（导出者必须是项目拥有者或项目已发布）
    const project = await projectService.getProjectById(id);
    if (project.userId !== userId && project.status !== 'published') {
      return NextResponse.json({ code: 403, data: null, message: '无权限导出该项目' }, { status: 403 });
    }

    // 导出项目为zip流
    const { zipStream } = await projectService.exportProject(id);

    // 返回zip文件流响应
    return new NextResponse(zipStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.name}.galtoolkit.zip"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
