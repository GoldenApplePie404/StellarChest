// 素材文件服务API — 从 data/assets/ 目录读取真实文件
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ASSETS_DIR = path.join(process.cwd(), 'data', 'assets');

const MIME_MAP: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
};

/** GET /api/assets/file/:filename — 直接返回文件内容 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
): Promise<NextResponse> {
  try {
    const { filename } = await params;
    // Security: prevent path traversal
    const safeName = path.basename(filename);
    // Search recursively in all asset subdirs for the file
    const findFile = (dir: string): string | null => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findFile(fullPath);
          if (found) return found;
        } else if (entry.name === safeName) {
          return fullPath;
        }
      }
      return null;
    };

    const filePath = findFile(ASSETS_DIR);
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ code: 404, data: null, message: '文件不存在' }, { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json({ code: 500, data: null, message: String(error) }, { status: 500 });
  }
}
