// 用户公开信息API - GET /api/users/[userId]
// 返回用户公开信息（无需登录）
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { NotFoundError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** 用户公开信息响应类型 */
interface PublicUserInfo {
  id: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
}

/** GET - 获取用户公开信息 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse<ApiResponse<PublicUserInfo>>> {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('用户');
    }

    const publicInfo: PublicUserInfo = {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || '',
      createdAt: user.createdAt.toISOString(),
    };

    return NextResponse.json(successResponse(publicInfo));
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
