// 论坛帖子API - GET帖子列表+POST创建帖子
import { NextRequest, NextResponse } from 'next/server';
import { forumService } from '@/services/ForumService';
import { createPostSchema, paginationSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { ForumPost, PostCategory } from '@/types/forum';

/** GET - 帖子列表查询 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<PaginatedData<ForumPost>>>> {
  try {
    const { searchParams } = request.nextUrl;

    // 解析分页参数
    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
    });

    // 解析筛选参数（Prisma treats undefined as "don't filter", null as "filter IS NULL"）
    const filter = {
      category: (searchParams.get('category') || undefined) as PostCategory | undefined,
      keyword: searchParams.get('keyword') || undefined,
      pinnedOnly: searchParams.get('pinnedOnly') === 'true',
      sortBy: (searchParams.get('sortBy') || undefined) as 'latest' | 'popular' | 'commented' | undefined,
      authorId: searchParams.get('authorId') || undefined,
    };

    const result = await forumService.listPosts(filter, pagination.page, pagination.pageSize);
    return NextResponse.json(successResponse(result));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 创建帖子 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ForumPost>>> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    const validation = createPostSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const post = await forumService.createPost(userId, validation.data);
    return NextResponse.json(successResponse(post, '帖子创建成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
