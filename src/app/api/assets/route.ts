// 素材库API — 基于 data/assets/manifest.json 文件驱动
// 素材数据存储于服务器本地文件目录，manifest.json 为元数据索引
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { ApiResponse } from '@/types/api';

const MANIFEST_PATH = path.join(process.cwd(), 'data', 'assets', 'manifest.json');

interface AssetManifestItem {
  id: string;
  name: string;
  category: string;
  path: string;
  url: string;
  type: string;
  size: number;
  description: string;
  tags: string[];
  license: string;
  createdAt: string;
}

interface AssetCategory {
  id: string;
  name: string;
  path: string;
  icon: string;
}

interface Manifest {
  version: string;
  lastUpdated: string;
  categories: AssetCategory[];
  assets: AssetManifestItem[];
}

/** 读取并缓存 manifest.json */
let manifestCache: Manifest | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5s

function readManifest(): Manifest {
  const now = Date.now();
  if (manifestCache && now - cacheTime < CACHE_TTL) return manifestCache;
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  manifestCache = JSON.parse(raw) as Manifest;
  cacheTime = now;
  return manifestCache;
}

/** GET /api/assets — 返回素材列表，支持 ?category=&search= 过滤 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const manifest = readManifest();
    const { searchParams } = request.nextUrl;
    const categoryFilter = searchParams.get('category');
    const searchQuery = searchParams.get('search');

    let filtered = [...manifest.assets];

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === categoryFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    // Don't expose server-side file paths to client
    const safeData = paged.map(({ path: _p, ...rest }) => rest);

    return NextResponse.json({
      code: 200,
      data: {
        items: safeData,
        categories: manifest.categories,
        total: filtered.length,
        page,
        pageSize,
      },
      message: 'ok',
    });
  } catch (error) {
    return NextResponse.json({ code: 500, data: null, message: '读取素材失败: ' + String(error) }, { status: 500 });
  }
}
