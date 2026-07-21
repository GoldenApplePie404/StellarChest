// 修改密码API - PUT /api/auth/password
// 需要认证：验证旧密码正确后更新为新密码
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hash, compare } from 'bcryptjs';
import { UnauthorizedError, ValidationError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** 修改密码请求体类型 */
interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/** PUT - 修改密码 */
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      throw new UnauthorizedError('请先登录');
    }

    const body: ChangePasswordRequest = await request.json();

    // 参数校验
    if (!body.oldPassword || !body.newPassword) {
      throw new ValidationError('旧密码和新密码不能为空');
    }
    if (body.newPassword.length < 6) {
      throw new ValidationError('新密码至少6个字符');
    }
    if (body.newPassword.length > 128) {
      throw new ValidationError('新密码最长128个字符');
    }

    // 查找用户
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedError('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await compare(body.oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new ValidationError('旧密码不正确');
    }

    // 哈希新密码并更新
    const newPasswordHash = await hash(body.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json(successResponse(null, '密码修改成功'));
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
