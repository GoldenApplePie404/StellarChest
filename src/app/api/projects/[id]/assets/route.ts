// 项目素材库 API - GET 列表 / POST 上传（multipart）
import { NextRequest, NextResponse } from 'next/server';
import { projectAssetService, type ProjectAssetRecord } from '@/services/ProjectAssetService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** 资产数组类型别名（避免在泛型内直接写 ProjectAssetRecord[] 触发解析问题） */
type ProjectAssetList = ProjectAssetRecord[];

/** GET - 列出项目素材 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ProjectAssetList>>> {
  try {
    const { id } = await params;
    const assets = await projectAssetService.listAssets(id);
    return NextResponse.json(successResponse(assets));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 上传素材 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ProjectAssetRecord>>> {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';
    const formData = await request.formData();
    const file = formData.get('file');
    const kind = (formData.get('kind') as string | null) || undefined;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ code: 400, data: null, message: '缺少上传文件' }, { status: 400 });
    }

    const asset = await projectAssetService.uploadAsset(id, userId, file, kind);
    return NextResponse.json(successResponse(asset, '素材已上传'));
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
