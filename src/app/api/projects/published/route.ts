// 已发布项目列表API - GET /api/projects/published
// 公开接口，无需登录
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { paginationSchema } from '@/lib/validators';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { PublishedProject } from '@/services/ProjectService';

/** GET - 获取已发布项目列表 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PaginatedData<PublishedProject>>>> {
  try {
    const { searchParams } = request.nextUrl;

    // 解析分页参数
    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '12',
    });

    // 解析排序参数
    const sort = searchParams.get('sort') || 'newest';
    const validSorts = ['newest', 'hottest'];
    const sortBy = validSorts.includes(sort) ? sort : 'newest';

    const result = await projectService.getPublishedProjects(
      pagination.page,
      pagination.pageSize,
      sortBy,
    );

    return NextResponse.json(successResponse(result));
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
