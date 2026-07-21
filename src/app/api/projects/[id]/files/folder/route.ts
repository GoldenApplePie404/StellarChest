// 文件夹管理API - POST创建文件夹 + DELETE递归删除文件夹
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { projectService } from '@/services/ProjectService';
import { AppError, successResponse, ValidationError, NotFoundError } from '@/lib/errors';
import { PROJECT_UPLOAD_DIR } from '@/lib/config';
import type { ApiResponse } from '@/types/api';
import type { ProjectFile } from '@/types/project';

/** POST - 创建文件夹 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<ProjectFile>>> {
  try {
    const { id: projectId } = await params;

    // 校验项目存在
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('项目');

    const body = (await request.json()) as { name: string; parentPath?: string };
    const { name, parentPath } = body;

    if (!name || name.trim() === '') {
      throw new ValidationError('文件夹名称不能为空');
    }

    // 构建文件夹路径
    const folderPath = parentPath
      ? `${parentPath.replace(/\/?$/, '/')}${name}/`
      : `${name}/`;
    const absoluteDir = path.join(PROJECT_UPLOAD_DIR, projectId, folderPath);

    // 创建文件夹（递归确保父目录存在）
    await fs.mkdir(absoluteDir, { recursive: true });

    // 创建数据库记录
    const storagePath = `data/uploads/projects/${projectId}/${folderPath}`;
    const fileRecord = await prisma.projectFile.create({
      data: {
        projectId,
        filename: folderPath,
        fileType: 'other',
        storagePath,
        fileSize: 0,
      },
    });

    const formatted = {
      id: fileRecord.id,
      projectId: fileRecord.projectId,
      filename: fileRecord.filename,
      fileType: fileRecord.fileType as ProjectFile['fileType'],
      storagePath: fileRecord.storagePath,
      fileSize: fileRecord.fileSize,
      createdAt: fileRecord.createdAt.toISOString(),
    };

    return NextResponse.json(successResponse(formatted, '文件夹创建成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** DELETE - 递归删除文件夹及所有子文件 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id: projectId } = await params;
    const { searchParams } = request.nextUrl;
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      throw new ValidationError('请指定要删除的文件夹ID');
    }

    // 获取文件夹记录
    const folderRecord = await prisma.projectFile.findUnique({ where: { id: folderId } });
    if (!folderRecord) throw new NotFoundError('文件夹');
    if (folderRecord.projectId !== projectId) {
      throw new ValidationError('文件夹不属于该项目');
    }

    // 从文件名推断文件夹路径
    const folderPath = folderRecord.filename.endsWith('/') ? folderRecord.filename : folderRecord.filename + '/';
    const absoluteDir = path.join(PROJECT_UPLOAD_DIR, projectId, folderPath);

    // 递归删除物理目录
    try {
      await fs.rm(absoluteDir, { recursive: true, force: true });
    } catch {
      // 目录不存在继续执行
    }

    // 删除所有关联的文件记录（以该路径为前缀的所有文件）
    await prisma.projectFile.deleteMany({
      where: {
        projectId,
        storagePath: {
          startsWith: `data/uploads/projects/${projectId}/${folderPath}`,
        },
      },
    });

    return NextResponse.json(successResponse(null, '文件夹已删除'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
