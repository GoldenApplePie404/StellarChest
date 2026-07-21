// 项目本地素材库服务 - 立绘/背景/音频上传与关联脚本 @bg/@audio
// 产物按项目隔离，存于 data/uploads/projects/<projectId>/assets，落库 project_assets 表。

import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { PROJECT_UPLOAD_DIR, MAX_FILE_SIZE } from '@/lib/config';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import { generateId } from '@/lib/utils';

/** 素材种类 */
export type ProjectAssetKind = 'character' | 'background' | 'audio';

/** 上传结果 */
export interface ProjectAssetRecord {
  id: string;
  projectId: string;
  kind: ProjectAssetKind;
  name: string;
  fileKey: string;
  fileUrl: string;
  /** 磁盘文件大小（字节），文件缺失时为 0 */
  fileSize: number;
  createdAt: string;
}

const ALLOWED_IMAGE = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
const ALLOWED_AUDIO = ['.wav', '.mp3', '.ogg', '.flac', '.aac'];

function extOf(name: string): string {
  return path.extname(name).toLowerCase();
}

function kindFromFile(mime: string, name: string, preferred?: string): ProjectAssetKind {
  if (preferred === 'character' || preferred === 'background' || preferred === 'audio') return preferred;
  if (mime.startsWith('audio/') || ALLOWED_AUDIO.includes(extOf(name))) return 'audio';
  return 'background';
}

/** 静态文件目录（public/uploads/...，Next.js 直接提供静态访问，避免走 /api/tools/download 触发编译） */
const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/** 把同一文件同步写入 public/uploads 静态目录 */
async function writePublicStatic(fileKey: string, buf: Buffer): Promise<void> {
  const publicPath = path.join(PUBLIC_UPLOAD_DIR, fileKey);
  await fs.mkdir(path.dirname(publicPath), { recursive: true });
  await fs.writeFile(publicPath, buf);
}

/** 删除 public/uploads 下的静态副本 */
async function deletePublicStatic(fileKey: string): Promise<void> {
  const publicPath = path.join(PUBLIC_UPLOAD_DIR, fileKey);
  await fs.unlink(publicPath).catch(() => {});
}

function buildUrl(fileKey: string): string {
  // 静态 URL：Next.js 直接服务 public/uploads，不经过 /api/tools/download，避免 dev 模式 dynamic route 编译
  return `/uploads/${fileKey}`;
}

/** 读取磁盘文件大小（字节），缺失返回 0 */
async function statSize(fileKey: string, projectId: string): Promise<number> {
  try {
    const abs = path.join(PROJECT_UPLOAD_DIR, projectId, 'assets', path.basename(fileKey));
    const st = await fs.stat(abs);
    return st.size;
  } catch {
    return 0;
  }
}

async function format(a: {
  id: string; projectId: string; kind: string; name: string; fileKey: string; createdAt: Date;
}): Promise<ProjectAssetRecord> {
  const fileSize = await statSize(a.fileKey, a.projectId);
  return {
    id: a.id,
    projectId: a.projectId,
    kind: a.kind as ProjectAssetKind,
    name: a.name,
    fileKey: a.fileKey,
    fileUrl: buildUrl(a.fileKey),
    fileSize,
    createdAt: a.createdAt.toISOString(),
  };
}

/** 项目素材库服务 */
export class ProjectAssetService {
  /**
   * 上传素材到项目资产库
   * @param projectId 项目ID
   * @param userId 上传者（权限校验）
   * @param file 上传文件
   * @param kind 可选素材种类（不传则按 MIME 推断）
   */
  async uploadAsset(
    projectId: string,
    userId: string,
    file: File,
    kind?: string,
  ): Promise<ProjectAssetRecord> {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundError('项目');

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) throw new ValidationError('不能上传空文件');
    if (buf.length > MAX_FILE_SIZE) throw new ValidationError('文件大小超过限制（最大 50MB）');

    const ext = extOf(file.name);
    const isImage = ALLOWED_IMAGE.includes(ext);
    const isAudio = ALLOWED_AUDIO.includes(ext);
    if (!isImage && !isAudio) throw new ValidationError('仅支持图片或音频文件');

    const assetKind = kindFromFile(file.type || '', file.name, kind);
    const fileName = `${generateId()}${ext}`;
    const fileKey = path
      .join('projects', projectId, 'assets', fileName)
      .replace(/\\/g, '/');
    const absPath = path.join(PROJECT_UPLOAD_DIR, projectId, 'assets', fileName);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buf);
    // 同时写入 public/uploads 供静态 URL 直接访问（避免 dev 模式走 /api/tools/download 触发编译）
    await writePublicStatic(fileKey, buf);

    const created = await prisma.projectAsset.create({
      data: {
        projectId,
        kind: assetKind,
        name: file.name || fileName,
        fileKey,
        fileUrl: buildUrl(fileKey),
      },
    });
    return await format(created);
  }

  /** 列出项目全部素材 */
  async listAssets(projectId: string): Promise<ProjectAssetRecord[]> {
    const rows = await prisma.projectAsset.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return await Promise.all(rows.map((r) => format(r)));
  }

  /** 删除素材（同步删除物理文件） */
  async removeAsset(projectId: string, userId: string, assetId: string): Promise<void> {
    const asset = await prisma.projectAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundError('素材');
    if (asset.projectId !== projectId) throw new NotFoundError('素材');

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) throw new ForbiddenError('无权操作该项目素材');

    await fs.unlink(path.join(PROJECT_UPLOAD_DIR, projectId, 'assets', path.basename(asset.fileKey))).catch(() => {});
    await deletePublicStatic(asset.fileKey);
    await prisma.projectAsset.delete({ where: { id: assetId } });
  }
}

export const projectAssetService = new ProjectAssetService();
