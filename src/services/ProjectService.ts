// 项目服务 - 项目CRUD/文件管理/导入导出打包
// 遵循架构文档3节类图中的Project数据结构

import prisma from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createReadStream } from 'fs';
import { NotFoundError, ForbiddenError, ValidationError, InternalError } from '@/lib/errors';
import { safeJsonParse } from '@/lib/utils';
import { PROJECT_UPLOAD_DIR, EXPORT_DIR } from '@/lib/config';
import { fileService } from '@/services/FileService';
import { v4 as uuidv4 } from 'uuid';
import type { Project, ProjectFile, ProjectConfig, CreateProjectRequest, UpdateProjectRequest, ProjectStatus, ProjectFileType } from '@/types/project';
import type { PaginatedData } from '@/types/api';

/** 已发布项目（含作者信息） */
export interface PublishedProject extends Project {
  /** 作者昵称 */
  authorName: string;
  /** 作者头像 */
  authorAvatar: string;
}

/** 项目服务类 */
export class ProjectService {
  /**
   * 创建项目 + 创建项目目录 + 初始化项目配置 + 初始化文件夹结构
   * @param userId 用户ID
   * @param data 创建项目请求数据
   * @returns 创建的项目记录
   */
  async createProject(userId: string, data: CreateProjectRequest): Promise<Project> {
    // 创建数据库记录
    const project = await prisma.project.create({
      data: {
        userId,
        name: data.name,
        description: data.description || '',
        coverUrl: data.coverUrl || '',
        status: 'draft',
      },
    });

    // 创建项目文件存储目录
    const projectDir = path.join(PROJECT_UPLOAD_DIR, project.id);
    await fs.mkdir(projectDir, { recursive: true });

    // 初始化项目配置（默认值）
    await prisma.projectConfig.create({
      data: {
        projectId: project.id,
        entryScript: 'main.txt',
        characterIds: '[]',
        resourceMap: '{}',
        dialogStyle: 'normal',
        textSpeed: 'normal',
        autoSave: false,
      },
    });

    // 初始化项目文件夹结构和示例脚本
    await this.initializeProjectFiles(project.id, userId);

    return this.formatProject(project);
  }

  /**
   * 初始化项目文件夹结构和示例脚本
   * @param projectId 项目ID
   * @param userId 用户ID
   * @returns 创建的文件记录列表
   */
  async initializeProjectFiles(projectId: string, userId: string): Promise<ProjectFile[]> {
    const createdFiles: ProjectFile[] = [];

    // 1. 创建文件夹目录
    const scriptsDir = path.join(PROJECT_UPLOAD_DIR, projectId, 'scripts');
    const imgDir = path.join(PROJECT_UPLOAD_DIR, projectId, 'img');
    const bgmDir = path.join(PROJECT_UPLOAD_DIR, projectId, 'bgm');
    await fs.mkdir(scriptsDir, { recursive: true });
    await fs.mkdir(imgDir, { recursive: true });
    await fs.mkdir(bgmDir, { recursive: true });

    // 2. 创建示例脚本文件
    const sampleContent = `@chapter 第一章 - 启程

@bg default

旁白：新的故事即将开始...

@chapter_end
`;
    const sampleScriptPath = `data/uploads/projects/${projectId}/scripts/main.txt`;
    const sampleScriptAbsolute = path.join(process.cwd(), sampleScriptPath);
    await fs.writeFile(sampleScriptAbsolute, sampleContent, 'utf-8');

    // 3. 添加数据库文件记录
    // 示例脚本
    const scriptRecord = await prisma.projectFile.create({
      data: {
        projectId,
        filename: 'scripts/main.txt',
        fileType: 'script',
        storagePath: sampleScriptPath,
        fileSize: Buffer.byteLength(sampleContent, 'utf-8'),
      },
    });
    createdFiles.push(this.formatProjectFile(scriptRecord));

    // img/ 目录占位记录
    const imgRecord = await prisma.projectFile.create({
      data: {
        projectId,
        filename: 'img/',
        fileType: 'other',
        storagePath: `data/uploads/projects/${projectId}/img/`,
        fileSize: 0,
      },
    });
    createdFiles.push(this.formatProjectFile(imgRecord));

    // bgm/ 目录占位记录
    const bgmRecord = await prisma.projectFile.create({
      data: {
        projectId,
        filename: 'bgm/',
        fileType: 'other',
        storagePath: `data/uploads/projects/${projectId}/bgm/`,
        fileSize: 0,
      },
    });
    createdFiles.push(this.formatProjectFile(bgmRecord));

    // scripts/ 目录占位记录
    const scriptsRecord = await prisma.projectFile.create({
      data: {
        projectId,
        filename: 'scripts/',
        fileType: 'other',
        storagePath: `data/uploads/projects/${projectId}/scripts/`,
        fileSize: 0,
      },
    });
    createdFiles.push(this.formatProjectFile(scriptsRecord));

    return createdFiles;
  }

  /**
   * 获取项目详情（含文件列表和配置）
   * @param id 项目ID
   * @returns 项目详情（含files和config）
   */
  async getProjectById(id: string): Promise<Project & { files: ProjectFile[]; config: ProjectConfig }> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        files: true,
        config: true,
      },
    });

    if (!project) {
      throw new NotFoundError('项目');
    }

    const config = project.config
      ? this.formatProjectConfig(project.config)
      : this.getDefaultProjectConfig(id);

    return {
      ...this.formatProject(project),
      files: project.files.map(this.formatProjectFile),
      config,
    };
  }

  /**
   * 更新项目信息
   * @param id 项目ID
   * @param userId 操作用户ID（权限校验）
   * @param data 更新数据
   * @returns 更新后的项目记录
   */
  async updateProject(id: string, userId: string, data: UpdateProjectRequest): Promise<Project> {
    // 权限校验：只有项目拥有者可以更新
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('项目');
    if (existing.userId !== userId) throw new ForbiddenError('只能修改自己的项目');

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl }),
        ...(data.status && { status: data.status }),
      },
    });

    return this.formatProject(updated);
  }

  /**
   * 删除项目 + 删除项目目录
   * @param id 项目ID
   * @param userId 操作用户ID（权限校验）
   */
  async deleteProject(id: string, userId: string): Promise<void> {
    // 权限校验
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('项目');
    if (existing.userId !== userId) throw new ForbiddenError('只能删除自己的项目');

    // 删除数据库记录（级联删除files和config）
    await prisma.project.delete({ where: { id } });

    // 删除项目文件存储目录
    const projectDir = path.join(PROJECT_UPLOAD_DIR, id);
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch {
      // 目录删除失败不影响数据库操作
    }
  }

  /**
   * 项目列表查询（支持分页+状态过滤）
   * @param userId 用户ID（只查自己的项目）
   * @param page 页码
   * @param pageSize 每页大小
   * @param status 状态过滤（可选）
   * @returns 分页项目列表
   */
  async listProjects(userId: string, page: number, pageSize: number, status?: ProjectStatus): Promise<PaginatedData<Project>> {
    const where = {
      userId,
      ...(status && { status }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      items: projects.map(this.formatProject),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 导出项目为.galtoolkit.zip打包文件
   * @param id 项目ID
   * @returns zip文件流和文件路径
   */
  async exportProject(id: string): Promise<{ zipPath: string; zipStream: NodeJS.ReadableStream }> {
    const project = await this.getProjectById(id);

    // 创建导出临时目录
    const exportDir = path.join(EXPORT_DIR, id);
    await fs.mkdir(exportDir, { recursive: true });
    const zipPath = path.join(exportDir, `${project.name}.galtoolkit.zip`);

    // 创建zip打包流
    const archive = archiver('zip', { zlib: { level: 5 } });
    const output = createReadStream(zipPath);

    // 添加项目配置到zip
    const configData = {
      name: project.name,
      description: project.description,
      entryScript: project.config.entryScript,
      characterIds: project.config.characterIds,
      resourceMap: project.config.resourceMap,
    };
    archive.append(JSON.stringify(configData, null, 2), { name: 'config.json' });

    // 添加项目文件到zip
    for (const file of project.files) {
      const absolutePath = path.join(process.cwd(), file.storagePath);
      try {
        const stats = await fs.stat(absolutePath);
        if (stats.isFile()) {
          archive.file(absolutePath, { name: `files/${file.filename}` });
        }
      } catch {
        // 文件不存在时跳过
      }
    }

    // 完成打包
    await archive.finalize();

    return { zipPath, zipStream: archive };
  }

  /**
   * 导入项目（从.galtoolkit.zip解包）
   * @param userId 用户ID
   * @param zipBuffer zip文件Buffer
   * @returns 导入的项目记录
   */
  async importProject(userId: string, zipBuffer: Buffer): Promise<Project> {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(zipBuffer);

    // 1. 读取 config.json
    const configEntry = zip.getEntry('config.json');
    if (!configEntry) throw new ValidationError('无效的项目包：缺少 config.json');
    const configData = JSON.parse(configEntry.getData().toString('utf-8'));
    const projectName = configData.name || '导入项目';
    const projectDesc = configData.description || '';

    // 2. 创建项目（先生成ID以便后续使用）
    const projectId = uuidv4();
    const projectDir = path.join(PROJECT_UPLOAD_DIR, projectId);
    await fs.mkdir(projectDir, { recursive: true });

    // 3. 创建数据库项目记录（跳过 initializeProjectFiles，手动处理）
    const project = await prisma.project.create({
      data: {
        id: projectId,
        userId,
        name: projectName,
        description: projectDesc,
        status: 'draft',
      },
    });

    // 4. 创建目录结构
    const scriptsDir = path.join(projectDir, 'scripts');
    const imgDir = path.join(projectDir, 'img');
    const bgmDir = path.join(projectDir, 'bgm');
    await fs.mkdir(scriptsDir, { recursive: true });
    await fs.mkdir(imgDir, { recursive: true });
    await fs.mkdir(bgmDir, { recursive: true });

    // 5. 提取 files/ 目录中的所有文件
    const entries = zip.getEntries();
    const createdFiles: ProjectFile[] = [];
    const fileTypeMap: Record<string, ProjectFileType> = {
      '.txt': 'script', '.json': 'config',
      '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.webp': 'image', '.gif': 'image', '.svg': 'image',
      '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.flac': 'audio',
    };

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const entryName = entry.entryName; // e.g. "files/scripts/main.txt"
      if (!entryName.startsWith('files/')) continue;

      const relativePath = entryName.slice('files/'.length); // "scripts/main.txt"
      const absolutePath = path.join(projectDir, relativePath);
      const dirName = path.dirname(absolutePath);

      // 确保子目录存在
      await fs.mkdir(dirName, { recursive: true });

      // 写入文件
      await fs.writeFile(absolutePath, entry.getData());

      // 判断文件类型
      const ext = path.extname(relativePath).toLowerCase();
      const fileType = fileTypeMap[ext] || 'other';

      // 创建数据库记录
      const storagePath = `data/uploads/projects/${projectId}/${relativePath}`;
      const stats = await fs.stat(absolutePath);
      const fileRecord = await prisma.projectFile.create({
        data: {
          projectId,
          filename: relativePath,
          fileType,
          storagePath,
          fileSize: stats.size,
        },
      });
      createdFiles.push(this.formatProjectFile(fileRecord));
    }

    // 6. 创建目录占位记录
    for (const dir of ['scripts/', 'img/', 'bgm/']) {
      const dirPath = `data/uploads/projects/${projectId}/${dir}`;
      const exists = createdFiles.some((f) => f.filename === dir);
      if (!exists) {
        const record = await prisma.projectFile.create({
          data: {
            projectId,
            filename: dir,
            fileType: 'other',
            storagePath: dirPath,
            fileSize: 0,
          },
        });
        createdFiles.push(this.formatProjectFile(record));
      }
    }

    // 7. 更新项目配置（resourceMap + entryScript + characterIds）
    await prisma.projectConfig.upsert({
      where: { projectId },
      update: {
        entryScript: configData.entryScript || 'scripts/main.txt',
        characterIds: JSON.stringify(configData.characterIds || []),
        resourceMap: JSON.stringify(configData.resourceMap || {}),
      },
      create: {
        projectId,
        entryScript: configData.entryScript || 'scripts/main.txt',
        characterIds: JSON.stringify(configData.characterIds || []),
        resourceMap: JSON.stringify(configData.resourceMap || {}),
      },
    });

    // 8. 修正 resourceMap 中的路径（将原来绝对路径转为相对项目路径）
    // 由于导出的 resourceMap 中 paths 指向原项目路径，导入后需要更新
    // 这里保持原样，用户可在项目中重新配置

    return this.getProjectById(projectId);
  }

  /**
   * 添加项目文件记录
   * @param projectId 项目ID
   * @param fileInfo 文件信息
   * @returns 创建的文件记录
   */
  async addProjectFile(projectId: string, fileInfo: { filename: string; fileType: ProjectFileType; storagePath: string; fileSize: number }): Promise<ProjectFile> {
    // 校验项目存在
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('项目');

    const fileRecord = await prisma.projectFile.create({
      data: {
        projectId,
        filename: fileInfo.filename,
        fileType: fileInfo.fileType,
        storagePath: fileInfo.storagePath,
        fileSize: fileInfo.fileSize,
      },
    });

    return this.formatProjectFile(fileRecord);
  }

  /**
   * 删除项目文件
   * @param projectId 项目ID
   * @param fileId 文件ID
   */
  async deleteProjectFile(projectId: string, fileId: string): Promise<void> {
    const file = await prisma.projectFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError('项目文件');
    if (file.projectId !== projectId) throw new ValidationError('文件不属于该项目');

    // 删除数据库记录
    await prisma.projectFile.delete({ where: { id: fileId } });

    // 删除物理文件
    await fileService.deleteFile(file.storagePath);
  }

  /**
   * 保存项目配置（入口脚本/角色ID/资源映射）
   * @param projectId 项目ID
   * @param config 项目配置数据
   * @returns 更新后的配置
   */
  async saveProjectConfig(projectId: string, config: Partial<ProjectConfig>): Promise<ProjectConfig> {
    // 校验项目存在
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('项目');

    const updated = await prisma.projectConfig.upsert({
      where: { projectId },
      update: {
        ...(config.entryScript && { entryScript: config.entryScript }),
        ...(config.characterIds && { characterIds: JSON.stringify(config.characterIds) }),
        ...(config.resourceMap && { resourceMap: JSON.stringify(config.resourceMap) }),
        ...(config.dialogStyle && { dialogStyle: config.dialogStyle }),
        ...(config.textSpeed && { textSpeed: config.textSpeed }),
        ...(config.autoSave !== undefined && { autoSave: config.autoSave }),
      },
      create: {
        projectId,
        entryScript: config.entryScript || 'main.txt',
        characterIds: JSON.stringify(config.characterIds || []),
        resourceMap: JSON.stringify(config.resourceMap || {}),
        dialogStyle: config.dialogStyle || 'normal',
        textSpeed: config.textSpeed || 'normal',
        autoSave: config.autoSave || false,
      },
    });

    return this.formatProjectConfig(updated);
  }

  /**
   * 获取项目配置
   * @param projectId 项目ID
   * @returns 项目配置
   */
  async getProjectConfig(projectId: string): Promise<ProjectConfig> {
    const config = await prisma.projectConfig.findUnique({ where: { projectId } });
    if (!config) return this.getDefaultProjectConfig(projectId);
    return this.formatProjectConfig(config);
  }

  /** 格式化项目记录（转换日期为字符串） */
  private formatProject(p: { id: string; userId: string; name: string; description: string; coverUrl: string | null; status: string; createdAt: Date; updatedAt: Date; viewCount: number; playCount: number; tags: string; screenshots: string; publishedAt: Date | null }): Project {
    return {
      id: p.id,
      userId: p.userId,
      name: p.name,
      description: p.description,
      coverUrl: p.coverUrl || '',
      status: p.status as ProjectStatus,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      viewCount: p.viewCount,
      playCount: p.playCount,
      tags: safeJsonParse<string[]>(p.tags, []),
      screenshots: safeJsonParse<string[]>(p.screenshots, []),
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    };
  }

  /** 格式化项目文件记录 */
  private formatProjectFile(f: { id: string; projectId: string; filename: string; fileType: string; storagePath: string; fileSize: number; createdAt: Date }): ProjectFile {
    return {
      id: f.id,
      projectId: f.projectId,
      filename: f.filename,
      fileType: f.fileType as ProjectFileType,
      storagePath: f.storagePath,
      fileSize: f.fileSize,
      createdAt: f.createdAt.toISOString(),
    };
  }

  /** 格式化项目配置（解析JSON字符串字段） */
  private formatProjectConfig(c: { projectId: string; entryScript: string; characterIds: string; resourceMap: string; dialogStyle: string; textSpeed: string; autoSave: boolean }): ProjectConfig {
    return {
      projectId: c.projectId,
      entryScript: c.entryScript,
      characterIds: safeJsonParse<string[]>(c.characterIds, []),
      resourceMap: safeJsonParse<Record<string, string>>(c.resourceMap, {}),
      dialogStyle: c.dialogStyle as 'normal' | 'none' | 'fullscreen',
      textSpeed: c.textSpeed as 'fast' | 'normal' | 'slow',
      autoSave: c.autoSave,
    };
  }

  /**
   * 发布项目
   * @param projectId 项目ID
   * @param userId 操作用户ID（权限校验）
   * @returns 发布后的项目记录
   */
  async publishProject(projectId: string, userId: string): Promise<Project> {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw new NotFoundError('项目');
    if (existing.userId !== userId) throw new ForbiddenError('只能发布自己的项目');
    if (existing.status === 'published') throw new ValidationError('项目已发布');

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'published',
        publishedAt: new Date(),
      },
    });

    return this.formatProject(updated);
  }

  /**
   * 取消发布项目
   * @param projectId 项目ID
   * @param userId 操作用户ID（权限校验）
   * @returns 取消发布后的项目记录
   */
  async unpublishProject(projectId: string, userId: string): Promise<Project> {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw new NotFoundError('项目');
    if (existing.userId !== userId) throw new ForbiddenError('只能操作自己的项目');
    if (existing.status !== 'published') throw new ValidationError('项目未发布');

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: 'draft',
        publishedAt: null,
      },
    });

    return this.formatProject(updated);
  }

  /**
   * 获取已发布项目列表（公开）
   * @param page 页码
   * @param pageSize 每页大小
   * @param sortBy 排序方式（newest=最新, hottest=最热）
   * @returns 分页已发布项目列表
   */
  async getPublishedProjects(page: number, pageSize: number, sortBy: string = 'newest'): Promise<PaginatedData<PublishedProject>> {
    const orderBy = sortBy === 'hottest'
      ? { viewCount: 'desc' as const }
      : { publishedAt: 'desc' as const };

    const where = { status: 'published' };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          user: {
            select: {
              nickname: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const items: PublishedProject[] = projects.map((p) => ({
      ...this.formatProject(p),
      authorName: p.user.nickname || '创作者',
      authorAvatar: p.user.avatarUrl || '',
    }));

    return { items, total, page, pageSize };
  }

  /**
   * 获取已发布项目详情（无需登录）
   * @param projectId 项目ID
   * @returns 已发布项目详情（含作者信息和配置）
   */
  async getPublishedProjectById(projectId: string): Promise<PublishedProject & { files: ProjectFile[]; config: ProjectConfig }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        files: true,
        config: true,
        user: {
          select: {
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!project) throw new NotFoundError('项目');
    if (project.status !== 'published') throw new NotFoundError('项目未发布');

    const config = project.config
      ? this.formatProjectConfig(project.config)
      : this.getDefaultProjectConfig(projectId);

    return {
      ...this.formatProject(project),
      authorName: project.user.nickname || '创作者',
      authorAvatar: project.user.avatarUrl || '',
      files: project.files.map(this.formatProjectFile),
      config,
    };
  }

  /**
   * 获取指定用户的公开项目（已发布的）
   * @param userId 用户ID
   * @param page 页码
   * @param pageSize 每页大小
   * @returns 分页已发布项目列表
   */
  async getPublicProjectsByUserId(userId: string, page: number, pageSize: number): Promise<PaginatedData<PublishedProject>> {
    const where = {
      userId,
      status: 'published',
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { publishedAt: 'desc' },
        include: {
          user: {
            select: {
              nickname: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const items: PublishedProject[] = projects.map((p) => ({
      ...this.formatProject(p),
      authorName: p.user.nickname || '创作者',
      authorAvatar: p.user.avatarUrl || '',
    }));

    return { items, total, page, pageSize };
  }

  /**
   * 增加浏览次数
   * @param projectId 项目ID
   */
  async incrementViewCount(projectId: string): Promise<void> {
    await prisma.project.update({
      where: { id: projectId },
      data: { viewCount: { increment: 1 } },
    });
  }

  /**
   * 增加游玩次数
   * @param projectId 项目ID
   */
  async incrementPlayCount(projectId: string): Promise<void> {
    await prisma.project.update({
      where: { id: projectId },
      data: { playCount: { increment: 1 } },
    });
  }

  /** 默认项目配置 */
  private getDefaultProjectConfig(projectId: string): ProjectConfig {
    return {
      projectId,
      entryScript: 'main.txt',
      characterIds: [],
      resourceMap: {},
      dialogStyle: 'normal',
      textSpeed: 'normal',
      autoSave: false,
    };
  }
}

/** 导出项目服务单例 */
export const projectService = new ProjectService();
