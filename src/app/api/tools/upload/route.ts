// 统一文件上传 API — POST multipart/form-data, 最大 50MB
// 上传到 data/uploads/tools/{type}/{date}/{uuid}.{ext}
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR, MAX_FILE_SIZE } from '@/lib/config';
import { generateId } from '@/lib/utils';
import type { ApiResponse } from '@/types/api';
import type { UploadResult } from '@/types/tools';

/** 图片 MIME 类型集合 */
const IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
]);

/** 音频 MIME 类型集合 */
const AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/x-wav',
  'audio/x-flac',
]);

/** 根据 MIME 类型判断文件分类 */
function classifyFile(mime: string): 'image' | 'audio' {
  if (IMAGE_MIMES.has(mime)) return 'image';
  if (AUDIO_MIMES.has(mime)) return 'audio';

  // 通过扩展名兜底判断
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';

  return 'image'; // 默认归类为图片
}

/** 获取 MIME 类型对应的文件扩展名 */
function getExtensionFromMime(mime: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (ext) return ext;

  const mimeMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/wave': '.wav',
    'audio/ogg': '.ogg',
    'audio/flac': '.flac',
  };

  return mimeMap[mime] || '.bin';
}

/** POST — 文件上传 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<UploadResult>>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { code: 400, data: null, message: '缺少上传文件' },
        { status: 400 },
      );
    }

    // 校验文件大小
    if (file.size > MAX_FILE_SIZE) {
      const maxMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
      return NextResponse.json(
        { code: 400, data: null, message: `文件大小超过限制 (最大 ${maxMB}MB)` },
        { status: 400 },
      );
    }

    // 校验空文件
    if (file.size === 0) {
      return NextResponse.json(
        { code: 400, data: null, message: '不能上传空文件' },
        { status: 400 },
      );
    }

    // 分类文件
    const mime = file.type || 'application/octet-stream';
    const category = classifyFile(mime);
    const ext = getExtensionFromMime(mime, file.name);

    // 构建存储路径: data/uploads/tools/{type}/{YYYY-MM-DD}/{uuid}{.ext}
    const now = new Date();
    const dateDir = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    const fileUuid = generateId();
    const fileName = `${fileUuid}${ext}`;
    const relativeDir = path.join('tools', category, dateDir);
    const absoluteDir = path.join(UPLOAD_DIR, relativeDir);
    const absolutePath = path.join(absoluteDir, fileName);

    // 确保目录存在
    await mkdir(absoluteDir, { recursive: true });

    // 写入文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);

    // 构建 fileKey (相对于 UPLOAD_DIR 的路径)
    const fileKey = path.join(relativeDir, fileName).replace(/\\/g, '/');

    return NextResponse.json({
      code: 200,
      data: {
        fileKey,
        fileName: file.name,
        size: file.size,
        mime,
      },
      message: '上传成功',
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json(
      { code: 500, data: null, message: `文件上传失败: ${errMsg}` },
      { status: 500 },
    );
  }
}
