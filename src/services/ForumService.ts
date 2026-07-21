// 论坛服务 - 帖子CRUD/评论/搜索/浏览计数
// 遵循架构文档3节类图中的ForumPost/Comment数据结构

import prisma from '@/lib/db';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import type { ForumPost, Comment, PostCategory, PostSearchFilter, CreatePostRequest, CreateCommentRequest } from '@/types/forum';
import type { PaginatedData } from '@/types/api';

/** 论坛服务类 */
export class ForumService {
  /**
   * 创建帖子
   * @param userId 作者用户ID
   * @param data 帖子数据
   * @returns 创建的帖子记录
   */
  async createPost(userId: string, data: CreatePostRequest): Promise<ForumPost> {
    const post = await prisma.forumPost.create({
      data: {
        userId,
        category: data.category,
        title: data.title,
        content: data.content,
        viewCount: 0,
        commentCount: 0,
        isPinned: false,
      },
    });

    return this.formatPost(post);
  }

  /**
   * 获取帖子详情（含评论列表和作者信息）
   * @param postId 帖子ID
   * @returns 帖子详情
   */
  async getPostById(postId: string): Promise<ForumPost & { authorNickname: string; comments: Comment[] }> {
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        user: true,
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) {
      throw new NotFoundError('帖子');
    }

    return {
      ...this.formatPost(post),
      authorNickname: post.user.nickname,
      comments: post.comments.map((c) => this.formatComment(c, c.user.nickname)),
    };
  }

  /**
   * 更新帖子（权限校验）
   * @param postId 帖子ID
   * @param userId 操作用户ID
   * @param data 更新数据
   * @returns 更新后的帖子
   */
  async updatePost(postId: string, userId: string, data: Partial<CreatePostRequest>): Promise<ForumPost> {
    const existing = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!existing) throw new NotFoundError('帖子');
    if (existing.userId !== userId) throw new ForbiddenError('只能修改自己的帖子');

    const updated = await prisma.forumPost.update({
      where: { id: postId },
      data: {
        ...(data.category && { category: data.category }),
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
      },
    });

    return this.formatPost(updated);
  }

  /**
   * 删除帖子（权限校验）
   * @param postId 帖子ID
   * @param userId 操作用户ID
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    const existing = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!existing) throw new NotFoundError('帖子');
    if (existing.userId !== userId) throw new ForbiddenError('只能删除自己的帖子');

    // 级联删除评论
    await prisma.forumPost.delete({ where: { id: postId } });
  }

  /**
   * 帖子列表查询（支持分类/关键词/作者筛选+分页）
   * @param filter 搜索筛选条件
   * @param page 页码
   * @param pageSize 每页大小
   * @returns 分页帖子列表
   */
  async listPosts(filter: PostSearchFilter, page: number, pageSize: number): Promise<PaginatedData<ForumPost>> {
    const where: Record<string, unknown> = {};

    // 分类过滤
    if (filter.category) {
      where.category = filter.category;
    }

    // 关键词搜索
    if (filter.keyword) {
      where.OR = [
        { title: { contains: filter.keyword } },
        { content: { contains: filter.keyword } },
      ];
    }

    // 置顶过滤
    if (filter.pinnedOnly) {
      where.isPinned = true;
    }

    // 作者ID筛选
    if (filter.authorId) {
      where.userId = filter.authorId;
    }

    // 排序方式
    const orderBy: Record<string, string | Record<string, string>>[] = [];
    // 置顶帖子优先
    orderBy.push({ isPinned: 'desc' });
    if (filter.sortBy === 'popular') {
      orderBy.push({ viewCount: 'desc' });
    } else if (filter.sortBy === 'commented') {
      orderBy.push({ commentCount: 'desc' });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const [posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: { user: true },
      }),
      prisma.forumPost.count({ where }),
    ]);

    return {
      items: posts.map((p) => ({
        ...this.formatPost(p),
        authorNickname: p.user.nickname,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 创建评论
   * @param postId 帖子ID
   * @param userId 评论者用户ID
   * @param content 评论内容
   * @returns 创建的评论记录
   */
  async createComment(postId: string, userId: string, content: string): Promise<Comment> {
    // 校验帖子存在
    const post = await prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundError('帖子');

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content,
      },
    });

    // 更新帖子评论计数
    await prisma.forumPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    return this.formatComment(comment);
  }

  /**
   * 删除评论（权限校验 — 评论作者或帖子作者均可删除）
   * @param commentId 评论ID
   * @param userId 操作用户ID
   * @param postId 帖子ID（可选，用于校验帖子作者是否有删除权限）
   */
  async deleteComment(commentId: string, userId: string, postId?: string): Promise<void> {
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) throw new NotFoundError('评论');
    if (existing.userId !== userId) {
      // 如果不是评论作者，检查是否帖子作者
      if (postId) {
        const post = await prisma.forumPost.findUnique({ where: { id: postId } });
        if (!post || post.userId !== userId) {
          throw new ForbiddenError('只能删除自己的评论或自己帖子下的评论');
        }
      } else {
        throw new ForbiddenError('只能删除自己的评论');
      }
    }

    // 删除评论
    await prisma.comment.delete({ where: { id: commentId } });

    // 更新帖子评论计数
    await prisma.forumPost.update({
      where: { id: existing.postId },
      data: { commentCount: { decrement: 1 } },
    });
  }

  /**
   * 评论列表（分页）
   * @param postId 帖子ID
   * @param page 页码
   * @param pageSize 每页大小
   * @returns 分页评论列表
   */
  async listComments(postId: string, page: number, pageSize: number): Promise<PaginatedData<Comment>> {
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId },
        include: { user: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.comment.count({ where: { postId } }),
    ]);

    return {
      items: comments.map((c) => this.formatComment(c, c.user.nickname)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 浏览计数递增
   * @param postId 帖子ID
   */
  async incrementViewCount(postId: string): Promise<void> {
    await prisma.forumPost.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });
  }

  /** 格式化帖子记录 */
  private formatPost(p: { id: string; userId: string; category: string; title: string; content: string; viewCount: number; commentCount: number; isPinned: boolean; createdAt: Date; updatedAt: Date }): ForumPost {
    return {
      id: p.id,
      userId: p.userId,
      category: p.category as PostCategory,
      title: p.title,
      content: p.content,
      viewCount: p.viewCount,
      commentCount: p.commentCount,
      isPinned: p.isPinned,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  /** 格式化评论记录 */
  private formatComment(c: { id: string; postId: string; userId: string; content: string; createdAt: Date }, authorNickname?: string): Comment {
    return {
      id: c.id,
      postId: c.postId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      ...(authorNickname && { authorNickname }),
    };
  }
}

/** 导出论坛服务单例 */
export const forumService = new ForumService();
