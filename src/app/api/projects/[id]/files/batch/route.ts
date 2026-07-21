// 批量文件操作API - POST 复制/移动文件
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { AppError, successResponse, ValidationError, NotFoundError } from '@/lib/errors';
import { PROJECT_UPLOAD_DIR } from '@/lib/config';
import type { ApiResponse } from '@/types/api';
import type { ProjectFile } from '@/types/project';

interface BatchOperationRequest {
  operation: 'copy' | 'move';
  fileIds: string[];
  targetFolder: string; // e.g. 'scripts/'
}

/** POST - 批量复制/移动文件 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ProjectFile[]>>> {
  try {
    const { id: projectId } = await params;

    // 校验项目存在
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('项目');

    const body = (await request.json()) as BatchOperationRequest;
    const { operation, fileIds, targetFolder } = body;

    if (!operation || !['copy', 'move'].includes(operation)) {
      throw new ValidationError('操作类型必须是 copy 或 move');
    }
    if (!fileIds || fileIds.length === 0) {
      throw new ValidationError('请指定要操作的文件ID');
    }
    if (!targetFolder) {
      throw new ValidationError('请指定目标文件夹路径');
    }

    // 确保目标文件夹存在
    const targetDir = path.join(PROJECT_UPLOAD_DIR, projectId, targetFolder);
    await fs.mkdir(targetDir, { recursive: true });

    // 获取源文件记录
    const sourceFiles = await prisma.projectFile.findMany({
      where: {
        id: { in: fileIds },
        projectId,
      },
    });

    if (sourceFiles.length === 0) {
      throw new NotFoundError('未找到指定的文件');
    }

    const resultFiles: ProjectFile[] = [];

    for (const sourceFile of sourceFiles) {
      // 只对实际文件（非目录占位记录）操作
      if (sourceFile.fileType === 'other' && sourceFile.filename.endsWith('/')) {
        // 跳过目录记录
        continue;
      }

      const sourceAbsolutePath = path.join(process.cwd(), sourceFile.storagePath);

      // 生成新文件名（防止冲突）
      const origName = path.basename(sourceFile.filename);
      const ext = path.extname(origName);
      const baseName = path.basename(origName, ext);
      const newFilename = `${targetFolder.replace(/\/?$/, '/')}${baseName}${ext}`;
      const newStoragePath = `data/uploads/projects/${projectId}/${newFilename}`;
      const newAbsolutePath = path.join(process.cwd(), newStoragePath);

      if (operation === 'copy') {
        // 复制文件内容
        try {
          const content = await fs.readFile(sourceAbsolutePath);
          await fs.writeFile(newAbsolutePath, content);
        } catch {
          // 源文件不存在则创建空文件
          await fs.writeFile(newAbsolutePath, '', 'utf-8');
        }

        // 创建新的数据库记录
        const newRecord = await prisma.projectFile.create({
          data: {
            projectId,
            filename: newFilename,
            fileType: sourceFile.fileType as ProjectFile['fileType'],
            storagePath: newStoragePath,
            fileSize: sourceFile.fileSize,
          },
        });

        resultFiles.push({
          id: newRecord.id,
          projectId: newRecord.projectId,
          filename: newRecord.filename,
          fileType: newRecord.fileType as ProjectFile['fileType'],
          storagePath: newRecord.storagePath,
          fileSize: newRecord.fileSize,
          createdAt: newRecord.createdAt.toISOString(),
        });
      } else if (operation === 'move') {
        // 移动文件（物理移动）
        try {
          await fs.rename(sourceAbsolutePath, newAbsolutePath);
        } catch {
          // rename可能跨设备失败，fallback到copy+delete
          try {
            const content = await fs.readFile(sourceAbsolutePath);
            await fs.writeFile(newAbsolutePath, content);
            await fs.unlink(sourceAbsolutePath);
          } catch {
            throw new ValidationError(`无法移动文件: ${origName}`);
          }
        }

        // 更新数据库记录
        const updatedRecord = await prisma.projectFile.update({
          where: { id: sourceFile.id },
          data: {
            filename: newFilename,
            storagePath: newStoragePath,
          },
        });

        resultFiles.push({
          id: updatedRecord.id,
          projectId: updatedRecord.projectId,
          filename: updatedRecord.filename,
          fileType: updatedRecord.fileType as ProjectFile['fileType'],
          storagePath: updatedRecord.storagePath,
          fileSize: updatedRecord.fileSize,
          createdAt: updatedRecord.createdAt.toISOString(),
        });
      }
    }

    const message = operation === 'copy' ? '文件复制成功' : '文件移动成功';
    return NextResponse.json(successResponse(resultFiles, message));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
