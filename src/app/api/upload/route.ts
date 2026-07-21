// 通用文件上传API - POST上传文件到指定分类目录
// 支持图片/音频/脚本文件上传，自动校验扩展名和大小
import { NextRequest, NextResponse } from 'next/server';
import { fileService } from '@/services/FileService';
import { AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { FileInfo } from '@/services/FileService';

/** POST - 通用文件上传（multipart/form-data） */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<FileInfo>>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string | null;
    const projectId = formData.get('projectId') as string | null;

    // 校验必填参数
    if (!file) {
      return NextResponse.json({ code: 400, data: null, message: '缺少文件参数' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ code: 400, data: null, message: '缺少文件分类参数' }, { status: 400 });
    }

    // 校验分类值
    const validCategories = ['images', 'audio', 'projects'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ code: 400, data: null, message: `不支持的文件分类: ${category}` }, { status: 400 });
    }

    // 读取文件Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 调用文件服务上传
    const fileInfo = await fileService.uploadFile(
      fileBuffer,
      file.name,
      category,
      projectId || undefined,
    );

    return NextResponse.json(successResponse(fileInfo, '文件上传成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
