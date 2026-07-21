// 素材详情API - 从 manifest.json 读取单个素材信息
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MANIFEST_PATH = path.join(process.cwd(), 'data', 'assets', 'manifest.json');
const ASSETS_DIR = path.join(process.cwd(), 'data', 'assets');
const MIME_MAP: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
};

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}

function writeManifest(data: unknown) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const manifest = readManifest();
    const asset = manifest.assets.find((a: { id: string }) => a.id === id);
    if (!asset) {
      return NextResponse.json({ code: 404, data: null, message: '素材不存在' }, { status: 404 });
    }
    const { path: _p, ...safeAsset } = asset;
    return NextResponse.json({ code: 200, data: safeAsset, message: 'ok' });
  } catch (error) {
    return NextResponse.json({ code: 500, data: null, message: String(error) }, { status: 500 });
  }
}

/** PUT - 下载素材（递增下载计数 + 返回文件流） */
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const manifest = readManifest();
    const idx = manifest.assets.findIndex((a: { id: string }) => a.id === id);
    if (idx === -1) {
      return NextResponse.json({ code: 404, data: null, message: '素材不存在' }, { status: 404 });
    }

    // Increment download count
    manifest.assets[idx].downloadCount = (manifest.assets[idx].downloadCount || 0) + 1;
    writeManifest(manifest);

    // Find and serve the actual file
    const asset = manifest.assets[idx];
    const filename = path.basename(asset.url);
    const findFile = (dir: string): string | null => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findFile(fullPath);
          if (found) return found;
        } else if (entry.name === filename) {
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
        'Content-Disposition': `attachment; filename="${encodeURIComponent(asset.name)}${ext}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return NextResponse.json({ code: 500, data: null, message: String(error) }, { status: 500 });
  }
}
