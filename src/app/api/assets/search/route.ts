// 素材搜索API - GET关键词+分类+标签+分页搜索
import { NextRequest, NextResponse } from 'next/server';
import { assetService } from '@/services/AssetService';
import { paginationSchema } from '@/lib/validators';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse, PaginatedData } from '@/types/api';
import type { Asset, AssetCategory } from '@/types/asset';

/** GET - 素材搜索 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<PaginatedData<Asset>>>> {
  try {
    const { searchParams } = request.nextUrl;

    // 解析搜索参数
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category') as AssetCategory | null;
    const tagsStr = searchParams.get('tags') || '';
    const tags = tagsStr ? tagsStr.split(',').filter(Boolean) : undefined;

    // 解析分页参数
    const pagination = paginationSchema.parse({
      page: searchParams.get('page') || '1',
      pageSize: searchParams.get('pageSize') || '20',
    });

    const result = await assetService.searchAssets(
      query,
      category || undefined,
      tags,
      pagination.page,
      pagination.pageSize,
    );

    return NextResponse.json(successResponse(result));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
