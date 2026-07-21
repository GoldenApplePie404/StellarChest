// 论坛帖子详情API - GET详情+PUT更新+DELETE删除
// 需要权限校验：只有帖子作者可修改/删除
import { NextRequest, NextResponse } from 'next/server';
import { forumService } from '@/services/ForumService';
import { createPostSchema } from '@/lib/validators';
import { fromZodError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ForumPost, Comment } from '@/types/forum';

/** 帖子详情响应类型（含评论和作者昵称） */
interface PostDetailResponse extends ForumPost {
  authorNickname: string;
  comments: Comment[];
}

/** GET - 获取帖子详情（含评论列表） */
export async function GET(request: NextRequest, { params }: { params: Promise<{ postId: string }> }): Promise<NextResponse<ApiResponse<PostDetailResponse>>> {
  try {
    const { postId } = await params;

    // 递增浏览计数
    await forumService.incrementViewCount(postId);

    const result = await forumService.getPostById(postId);
    return NextResponse.json(successResponse(result));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** PUT - 更新帖子（需权限校验） */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ postId: string }> }): Promise<NextResponse<ApiResponse<ForumPost>>> {
  try {
    const { postId } = await params;
    const userId = request.headers.get('x-user-id') || '';
    const body = await request.json();

    // 使用创建帖子schema做部分更新验证（允许字段可选）
    const validation = createPostSchema.safeParse(body);
    if (!validation.success) {
      const error = fromZodError(validation.error);
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const post = await forumService.updatePost(postId, userId, validation.data);
    return NextResponse.json(successResponse(post, '帖子更新成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** DELETE - 删除帖子（需权限校验，级联删除评论） */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ postId: string }> }): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { postId } = await params;
    const userId = request.headers.get('x-user-id') || '';

    await forumService.deletePost(postId, userId);
    return NextResponse.json(successResponse(null, '帖子删除成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
