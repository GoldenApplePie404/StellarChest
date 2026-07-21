// 文件下载 API — GET ?key={fileKey} 流式传输文件
// 根据 fileKey 前缀自动路由到 UPLOAD_DIR 或 EXPORT_DIR
import { NextRequest, NextResponse } from 'next/server';
import { stat, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { UPLOAD_DIR, EXPORT_DIR } from '@/lib/config';

/** MIME 类型映射 (扩展名 -> MIME) */
const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.txt': 'text/plain',
  '.json': 'application/json',
};

/** 根据扩展名获取 MIME */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

/** GET — 文件下载 (流式传输) */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('key');

    if (!fileKey) {
      return NextResponse.json(
        { code: 400, data: null, message: '缺少 fileKey 参数' },
        { status: 400 },
      );
    }

    // 安全检查: 防止路径遍历攻击
    const normalized = fileKey.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.includes('..')) {
      return NextResponse.json(
        { code: 400, data: null, message: '非法的文件路径' },
        { status: 400 },
      );
    }

    // 按顺序尝试 UPLOAD_DIR 和 EXPORT_DIR
    let filePath = path.join(UPLOAD_DIR, normalized);
    if (!existsSync(filePath)) {
      filePath = path.join(EXPORT_DIR, normalized);
    }

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { code: 404, data: null, message: '文件不存在' },
        { status: 404 },
      );
    }

    // 读取文件并返回
    const buffer = await readFile(filePath);
    const stats = await stat(filePath);
    const mime = getMimeType(filePath);
    const fileName = path.basename(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(stats.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json(
      { code: 500, data: null, message: `文件下载失败: ${errMsg}` },
      { status: 500 },
    );
  }
}
