// 图片批量处理API - POST对多张图片执行裁剪+格式转换组合操作
// 按操作列表顺序依次处理每张输入图片
import { NextRequest, NextResponse } from 'next/server';
import { imageService } from '@/services/ImageService';
import { AppError, successResponse, ValidationError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { BatchOperation } from '@/services/ImageService';
import path from 'path';
import { EXPORT_DIR } from '@/lib/config';
import { generateId } from '@/lib/utils';

/** 批量处理请求体 */
interface BatchProcessRequest {
  inputPaths: string[];
  operations: BatchOperation[];
}

/** POST - 批量图片处理 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ outputPaths: string[] }>>> {
  try {
    const body: BatchProcessRequest = await request.json();

    // 校验必填参数
    if (!body.inputPaths || !Array.isArray(body.inputPaths) || body.inputPaths.length === 0) {
      throw new ValidationError('输入图片路径列表不能为空');
    }
    if (!body.operations || !Array.isArray(body.operations) || body.operations.length === 0) {
      throw new ValidationError('操作列表不能为空');
    }

    // 校验每个操作项的类型
    for (const op of body.operations) {
      if (!['crop', 'convert', 'resize'].includes(op.type)) {
        throw new ValidationError(`不支持的操作类型: ${op.type}`);
      }
    }

    // 构建输出目录
    const batchId = generateId();
    const outputDir = path.join(EXPORT_DIR, 'image_temp', `batch_${batchId}`);

    // 执行批量处理
    const outputPaths = await imageService.batchProcess(
      body.inputPaths,
      outputDir,
      body.operations,
    );

    return NextResponse.json(successResponse({ outputPaths }, '批量处理完成'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
