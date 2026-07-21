// 文件服务 - 通用文件上传/存储/读取/删除
// 处理项目文件、素材文件、上传文件等

import fs from 'fs/promises';
import path from 'path';
import { UPLOAD_DIR, EXPORT_DIR, MAX_FILE_SIZE, ALLOWED_IMAGE_EXTENSIONS, ALLOWED_AUDIO_EXTENSIONS, ALLOWED_SCRIPT_EXTENSIONS } from '@/lib/config';
import { getFileExtension, generateId } from '@/lib/utils';
import { ValidationError, NotFoundError, InternalError } from '@/lib/errors';

/** 文件信息结构 */
export interface FileInfo {
  /** 文件名 */
  filename: string;
  /** 存储路径 */
  storagePath: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME类型 */
  mimeType: string;
  /** 文件扩展名 */
  extension: string;
}

/** 允许的文件扩展名联合 */
const ALL_ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_AUDIO_EXTENSIONS, ...ALLOWED_SCRIPT_EXTENSIONS];

/** 文件服务类 */
export class FileService {
  /**
   * 通用文件上传 - 存储到data/uploads/对应分类目录
   * @param fileBuffer 文件数据Buffer
   * @param originalName 原始文件名
   * @param category 文件分类（images/audio/projects）
   * @param projectId 项目ID（可选，用于项目文件）
   * @returns 文件信息
   */
  async uploadFile(fileBuffer: Buffer, originalName: string, category: string, projectId?: string): Promise<FileInfo> {
    const extension = getFileExtension(originalName);

    // 验证文件扩展名
    if (!ALL_ALLOWED_EXTENSIONS.includes(extension)) {
      throw new ValidationError(`不支持的文件类型: ${extension}`);
    }

    // 验证文件大小
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new ValidationError('文件大小超过限制（最大50MB）');
    }

    // 生成唯一文件名防止冲突
    const uniqueId = generateId();
    const safeFilename = `${uniqueId}${extension}`;

    // 构建存储路径
    const storagePath = this.buildFilePath(category, projectId, safeFilename);
    const absolutePath = path.join(process.cwd(), storagePath);

    // 确保目录存在
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });

    // 写入文件
    try {
      await fs.writeFile(absolutePath, fileBuffer);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '未知错误';
      throw new InternalError('文件写入失败', errMsg);
    }

    // 推断MIME类型
    const mimeType = this.inferMimeType(extension);

    return {
      filename: safeFilename,
      storagePath,
      size: fileBuffer.length,
      mimeType,
      extension,
    };
  }

  /**
   * 删除文件
   * @param storagePath 文件存储路径
   */
  async deleteFile(storagePath: string): Promise<void> {
    const absolutePath = path.join(process.cwd(), storagePath);
    try {
      await fs.unlink(absolutePath);
    } catch (e) {
      // 文件不存在不算错误，可能已被删除
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        throw new InternalError('文件删除失败', (e instanceof Error ? e.message : undefined));
      }
    }
  }

  /**
   * 获取文件信息
   * @param storagePath 文件存储路径
   * @returns 文件统计信息
   */
  async getFileInfo(storagePath: string): Promise<{ size: number; extension: string; mimeType: string }> {
    const absolutePath = path.join(process.cwd(), storagePath);
    try {
      const stats = await fs.stat(absolutePath);
      const extension = path.extname(storagePath).toLowerCase();
      return {
        size: stats.size,
        extension,
        mimeType: this.inferMimeType(extension),
      };
    } catch {
      throw new NotFoundError('文件');
    }
  }

  /**
   * 构建存储路径
   * @param category 文件分类
   * @param projectId 项目ID（可选）
   * @param filename 文件名
   * @returns 相对存储路径
   */
  buildFilePath(category: string, projectId?: string, filename?: string): string {
    const parts = [UPLOAD_DIR.replace(process.cwd() + '/', ''), category];
    if (projectId) parts.push(projectId);
    if (filename) parts.push(filename);
    return parts.join('/');
  }

  /**
   * 读取文件内容 - 用于脚本读取
   * @param storagePath 文件存储路径
   * @returns 文件内容字符串
   */
  async readFile(storagePath: string): Promise<string> {
    const absolutePath = path.join(process.cwd(), storagePath);
    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      return content;
    } catch {
      throw new NotFoundError('文件');
    }
  }

  /**
   * 写入文件内容 - 用于脚本保存
   * @param storagePath 文件存储路径
   * @param content 文件内容字符串
   */
  async writeFile(storagePath: string, content: string): Promise<void> {
    const absolutePath = path.join(process.cwd(), storagePath);
    // 确保目录存在
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(absolutePath, content, 'utf-8');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '未知错误';
      throw new InternalError('文件写入失败', errMsg);
    }
  }

  /**
   * 获取导出临时目录路径
   * @param projectId 项目ID
   * @returns 导出目录绝对路径
   */
  getExportDir(projectId: string): string {
    return path.join(EXPORT_DIR, projectId);
  }

  /**
   * 清理导出临时目录
   * @param projectId 项目ID
   */
  async cleanupExportDir(projectId: string): Promise<void> {
    const exportDir = this.getExportDir(projectId);
    try {
      await fs.rm(exportDir, { recursive: true, force: true });
    } catch {
      // 清理失败不影响主流程
    }
  }

  /**
   * 推断MIME类型
   * @param extension 文件扩展名
   * @returns MIME类型字符串
   */
  private inferMimeType(extension: string): string {
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.txt': 'text/plain',
    };
    return mimeMap[extension] || 'application/octet-stream';
  }
}

/** 导出文件服务单例 */
export const fileService = new FileService();
