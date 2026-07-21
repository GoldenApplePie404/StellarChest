// 项目API - GET列表+POST创建
// GET 支持通过 userId 查询参数获取指定用户的已发布项目（公开访问）
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { createProjectSchema, paginationSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { Project, ProjectFile } from '@/types/project';

/** GET - 获取项目列表 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<PaginatedData<Project>>>> {
  try {
    const { searchParams } = request.nextUrl;

    // 解析分页参数
    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
    });

    // 检查是否通过 userId 查询公开项目
    const targetUserId = searchParams.get('userId');

    if (targetUserId) {
      // 公开访问：获取指定用户的已发布项目
      const result = await projectService.getPublicProjectsByUserId(
        targetUserId,
        pagination.page,
        pagination.pageSize,
      );
      return NextResponse.json(successResponse(result));
    }

    // 私有访问：需要认证，获取当前用户的项目
    const userId = request.headers.get('x-user-id') || '';
    const status = searchParams.get('status') as 'draft' | 'published' | 'archived' | null;

    const result = await projectService.listProjects(
      userId,
      pagination.page,
      pagination.pageSize,
      status || undefined,
    );

    return NextResponse.json(successResponse(result));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 创建项目（自动初始化文件夹结构和示例脚本） */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Project & { files: ProjectFile[] }>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    const validation = createProjectSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    // 创建项目（内部会自动调用 initializeProjectFiles）
    const project = await projectService.createProject(userId, validation.data);

    // 获取初始化后的文件列表
    const projectDetail = await projectService.getProjectById(project.id);

    return NextResponse.json(successResponse({
      ...projectDetail,
    }, '项目创建成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
