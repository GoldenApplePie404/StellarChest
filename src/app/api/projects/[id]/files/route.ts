// 项目文件管理API - GET文件列表+POST添加文件+DELETE删除文件
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db';
import { projectService } from '@/services/ProjectService';
import { fileService } from '@/services/FileService';
import { AppError, successResponse, ValidationError } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { ProjectFile } from '@/types/project';

/** GET - 获取项目文件列表，支持 ?action=content&fileId=XXX 读取文件内容 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<ProjectFile[] | { fileId: string; content: string }>>> {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const fileId = searchParams.get('fileId');

    // If action=content + fileId, return file content
    if (action === 'content' && fileId) {
      const userId = request.headers.get('x-user-id') || '';
      if (!userId) {
        const { UnauthorizedError } = await import('@/lib/errors');
        const error = new UnauthorizedError('请先登录');
        return NextResponse.json(error.toResponse(), { status: error.code });
      }

      const fileRecord = await prisma.projectFile.findFirst({
        where: { id: fileId, projectId: id },
      });
      if (!fileRecord) {
        return NextResponse.json({ code: 404, data: null, message: '文件不存在' }, { status: 404 });
      }

      const content = await fileService.readFile(fileRecord.storagePath);
      return NextResponse.json(
        successResponse({ fileId: fileRecord.id, content }),
      ) as NextResponse<ApiResponse<ProjectFile[] | { fileId: string; content: string }>>;
    }

    // Default: return file list
    const projectDetail = await projectService.getProjectById(id);
    return NextResponse.json(successResponse(projectDetail.files));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** PUT - 保存文件内容（通过 ?action=save&fileId=XXX 查询参数） */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<{ fileId: string; content: string }>>> {
  try {
    const { id: projectId } = await params;
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const fileId = searchParams.get('fileId');

    if (action !== 'save' || !fileId) {
      return NextResponse.json({ code: 400, data: null, message: '请提供 ?action=save&fileId=XXX' }, { status: 400 });
    }

    const userId = request.headers.get('x-user-id') || '';
    if (!userId) {
      const { UnauthorizedError } = await import('@/lib/errors');
      const error = new UnauthorizedError('请先登录');
      return NextResponse.json(error.toResponse(), { status: error.code });
    }

    const body = await request.json();
    const content = body.content as string | undefined;
    if (typeof content !== 'string') {
      return NextResponse.json({ code: 400, data: null, message: '请提供文件内容（content字段）' }, { status: 400 });
    }

    const fileRecord = await prisma.projectFile.findFirst({
      where: { id: fileId, projectId },
    });
    if (!fileRecord) {
      return NextResponse.json({ code: 404, data: null, message: '文件不存在' }, { status: 404 });
    }

    await fileService.writeFile(fileRecord.storagePath, content);
    const byteSize = Buffer.byteLength(content, 'utf-8');
    await prisma.projectFile.update({
      where: { id: fileId },
      data: { fileSize: byteSize },
    });

    return NextResponse.json(successResponse({ fileId: fileRecord.id, content }, '文件保存成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** POST - 添加项目文件（上传文件 或 JSON创建文本文件到项目） */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<ProjectFile>>> {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || '';

    // 尝试判断Content-Type: 如果是json则创建文本文件，否则做multipart上传
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // JSON模式：创建文本文件（脚本等）
      const body = (await request.json()) as { content: string; filename: string; fileType?: string; parentPath?: string };
      const { content, filename, fileType: reqFileType, parentPath } = body;

      if (!filename || filename.trim() === '') {
        throw new ValidationError('文件名不能为空');
      }
      if (content === undefined) {
        throw new ValidationError('文件内容不能为空');
      }

      const fileType = reqFileType || 'script';
      const validFileTypes = ['script', 'image', 'audio', 'config', 'other'];
      if (!validFileTypes.includes(fileType)) {
        throw new ValidationError(`不支持的文件类型: ${fileType}`);
      }

      // 构建存储路径
      const prefixPath = parentPath ? parentPath.replace(/\/?$/, '/') : '';
      const storageFilename = `${prefixPath}${filename}`;
      const storagePath = `data/uploads/projects/${id}/${storageFilename}`;
      const absolutePath = path.join(process.cwd(), storagePath);

      // 确保目录存在
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });

      // 写入文件内容
      await fs.writeFile(absolutePath, content, 'utf-8');

      // 创建数据库记录
      const fileRecord = await prisma.projectFile.create({
        data: {
          projectId: id,
          filename: storageFilename,
          fileType: fileType as ProjectFile['fileType'],
          storagePath,
          fileSize: Buffer.byteLength(content, 'utf-8'),
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

      return NextResponse.json(successResponse(formatted, '文件创建成功'));
    }

    // FormData模式：上传二进制文件
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileType = (formData.get('fileType') as string) || 'other';

    if (!file) {
      return NextResponse.json({ code: 400, data: null, message: '请上传文件' }, { status: 400 });
    }

    // 校验文件类型
    const validFileTypes = ['script', 'image', 'audio', 'config', 'other'];
    if (!validFileTypes.includes(fileType)) {
      throw new ValidationError(`不支持的文件类型: ${fileType}`);
    }

    // 上传文件到存储目录
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileInfo = await fileService.uploadFile(fileBuffer, file.name, 'projects', id);

    // 创建数据库文件记录
    const projectFile = await projectService.addProjectFile(id, {
      filename: file.name,
      fileType: fileType as ProjectFile['fileType'],
      storagePath: fileInfo.storagePath,
      fileSize: fileInfo.size,
    });

    return NextResponse.json(successResponse(projectFile, '文件添加成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}

/** DELETE - 删除项目文件 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ code: 400, data: null, message: '请指定要删除的文件ID' }, { status: 400 });
    }

    await projectService.deleteProjectFile(id, fileId);
    return NextResponse.json(successResponse(null, '文件删除成功'));
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toResponse(), { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
