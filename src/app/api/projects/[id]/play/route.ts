// 增加游玩次数API - POST /api/projects/[id]/play
// 公开接口，无需登录
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/ProjectService';
import { AppError, successResponse } from '@/lib/errors';

/** POST - 增加游玩次数 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await projectService.incrementPlayCount(id);
    return NextResponse.json(successResponse(null, 'ok'));
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
