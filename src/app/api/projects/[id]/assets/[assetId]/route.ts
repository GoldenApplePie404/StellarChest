// 项目素材删除 API - DELETE
import { NextRequest, NextResponse } from 'next/server';
import { projectAssetService } from '@/services/ProjectAssetService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** DELETE - 删除素材（含物理文件） */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id, assetId } = await params;
    const userId = request.headers.get('x-user-id') || '';
    await projectAssetService.removeAsset(id, userId, assetId);
    return NextResponse.json(successResponse(null, '素材已删除'));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
