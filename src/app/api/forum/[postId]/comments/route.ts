// 论坛评论API - GET列表+POST创建+DELETE删除
// 评论创建/删除需登录，删除需权限校验
import { NextRequest, NextResponse } from 'next/server';
import { forumService } from '@/services/ForumService';
import { notificationService } from '@/services/NotificationService';
import prisma from '@/lib/db';
import { createCommentSchema, paginationSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { Comment } from '@/types/forum';

/** GET - 评论列表（分页） */
export async function GET(request: NextRequest, { params }: { params: Promise<{ postId: string }> }): Promise<NextResponse<ApiResponse<PaginatedData<Comment>>>> {
  try {
    const { postId } = await params;
    const { searchParams } = request.nextUrl;

    // 解析分页参数
    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
    });

    const result = await forumService.listComments(postId, pagination.page, pagination.pageSize);
    return NextResponse.json(successResponse(result));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 创建评论 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }): Promise<NextResponse<ApiResponse<Comment>>> {
  try {
    const { postId } = await params;
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    const validation = createCommentSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const comment = await forumService.createComment(postId, userId, validation.data.content);

    // 自动创建通知：评论者不是帖主时，通知帖主
    try {
      const post = await prisma.forumPost.findUnique({
        where: { id: postId },
        select: { userId: true, title: true },
      });
      if (post && post.userId !== userId) {
        await notificationService.createNotification(
          post.userId,
          'comment_reply',
          `有人回复了你的帖子「${post.title}」`,
          validation.data.content.substring(0, 100),
          postId,
        );
      }
    } catch {
      // 通知创建失败不影响主流程
    }

    return NextResponse.json(successResponse(comment, '评论创建成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** DELETE - 删除评论（需权限校验，通过query参数commentId） */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ postId: string }> }): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { postId } = await params;
    const userId = request.headers.get('x-user-id') || '';
    const commentId = request.nextUrl.searchParams.get('commentId') || '';

    if (!commentId) {
      return NextResponse.json({ code: 400, data: null, message: '缺少评论ID参数' }, { status: 400 });
    }

    await forumService.deleteComment(commentId, userId, postId);
    return NextResponse.json(successResponse(null, '评论删除成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
