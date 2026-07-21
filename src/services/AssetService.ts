// 素材服务 - 素材CRUD/搜索/下载统计
// 遵循架构文档3节类图中的Asset数据结构

import prisma from '@/lib/db';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { safeJsonParse } from '@/lib/utils';
import { fileService } from '@/services/FileService';
import { IMAGE_UPLOAD_DIR } from '@/lib/config';
import type { Asset, AssetCategory, AssetLicenseType, AssetSearchFilter, UploadAssetRequest } from '@/types/asset';
import type { PaginatedData } from '@/types/api';

/** 素材服务类 */
export class AssetService {
  /**
   * 上传素材 + 存储文件 + 创建数据库记录
   * @param userId 上传者用户ID
   * @param data 素材元数据
   * @param fileBuffer 文件数据
   * @param originalName 原始文件名
   * @returns 创建的素材记录
   */
  async uploadAsset(userId: string, data: UploadAssetRequest, fileBuffer: Buffer, originalName: string): Promise<Asset> {
    // 上传文件到存储目录
    const categoryDir = this.getCategoryDir(data.category);
    const fileInfo = await fileService.uploadFile(fileBuffer, originalName, categoryDir);

    // 创建数据库记录
    const asset = await prisma.asset.create({
      data: {
        userId,
        category: data.category,
        name: data.name,
        description: data.description || '',
        fileUrl: fileInfo.storagePath,
        thumbnailUrl: '',
        licenseType: data.licenseType || 'CC0',
        downloadCount: 0,
        tags: JSON.stringify(data.tags || []),
      },
    });

    return this.formatAsset(asset);
  }

  /**
   * 获取素材详情
   * @param id 素材ID
   * @returns 素材详情
   */
  async getAssetById(id: string): Promise<Asset> {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!asset) {
      throw new NotFoundError('素材');
    }

    return this.formatAsset(asset);
  }

  /**
   * 更新素材信息
   * @param id 素材ID
   * @param userId 操作用户ID（权限校验）
   * @param data 更新数据
   * @returns 更新后的素材记录
   */
  async updateAsset(id: string, userId: string, data: Partial<UploadAssetRequest>): Promise<Asset> {
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('素材');
    if (existing.userId !== userId) throw new ForbiddenError('只能修改自己上传的素材');

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.licenseType && { licenseType: data.licenseType }),
        ...(data.tags && { tags: JSON.stringify(data.tags) }),
      },
    });

    return this.formatAsset(updated);
  }

  /**
   * 删除素材 + 删除文件
   * @param id 素材ID
   * @param userId 操作用户ID（权限校验）
   */
  async deleteAsset(id: string, userId: string): Promise<void> {
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('素材');
    if (existing.userId !== userId) throw new ForbiddenError('只能删除自己上传的素材');

    // 删除物理文件
    await fileService.deleteFile(existing.fileUrl);

    // 删除数据库记录
    await prisma.asset.delete({ where: { id } });
  }

  /**
   * 素材列表查询（支持分类/标签过滤+分页）
   * @param filter 搜索筛选条件
   * @param pagination 分页参数
   * @returns 分页素材列表
   */
  async listAssets(filter: AssetSearchFilter, page: number, pageSize: number): Promise<PaginatedData<Asset>> {
    const where: Record<string, unknown> = {};

    // 分类过滤
    if (filter.category) {
      where.category = filter.category;
    }

    // 授权类型过滤
    if (filter.licenseType) {
      where.licenseType = filter.licenseType;
    }

    // 关键词搜索（模糊匹配name和description）
    if (filter.keyword) {
      where.OR = [
        { name: { contains: filter.keyword } },
        { description: { contains: filter.keyword } },
      ];
    }

    // 排序方式
    const orderBy: Record<string, string> = {};
    if (filter.sortBy === 'popular') {
      orderBy.downloadCount = 'desc';
    } else if (filter.sortBy === 'name') {
      orderBy.name = 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      items: assets.map(this.formatAsset),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 搜索素材（模糊匹配+分类+标签）
   * @param query 搜索关键词
   * @param category 分类过滤（可选）
   * @param tags 标签过滤（可选）
   * @param page 页码
   * @param pageSize 每页大小
   * @returns 分页搜索结果
   */
  async searchAssets(query: string, category?: AssetCategory, tags?: string[], page: number = 1, pageSize: number = 20): Promise<PaginatedData<Asset>> {
    const where: Record<string, unknown> = {};

    // 关键词搜索
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
      ];
    }

    // 分类过滤
    if (category) {
      // 如果有OR条件，需要在OR内部加入category
      if (query) {
        where.OR = [
          { name: { contains: query }, category },
          { description: { contains: query }, category },
        ];
      } else {
        where.category = category;
      }
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.asset.count({ where }),
    ]);

    // 标签过滤需要在应用层处理（SQLite不支持JSON查询）
    let filteredAssets = assets;
    if (tags && tags.length > 0) {
      filteredAssets = assets.filter((asset) => {
        const assetTags = safeJsonParse<string[]>(asset.tags, []);
        return tags.some((tag) => assetTags.includes(tag));
      });
    }

    return {
      items: filteredAssets.map(this.formatAsset),
      total: tags ? filteredAssets.length : total,
      page,
      pageSize,
    };
  }

  /**
   * 下载计数递增
   * @param id 素材ID
   */
  async incrementDownloadCount(id: string): Promise<void> {
    await prisma.asset.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });
  }

  /** 格式化素材记录（转换日期和JSON字段） */
  private formatAsset(a: { id: string; userId: string; category: string; name: string; description: string; fileUrl: string; thumbnailUrl: string | null; licenseType: string; downloadCount: number; tags: string; createdAt: Date }): Asset {
    return {
      id: a.id,
      userId: a.userId,
      category: a.category as AssetCategory,
      name: a.name,
      description: a.description,
      fileUrl: a.fileUrl,
      thumbnailUrl: a.thumbnailUrl || '',
      licenseType: a.licenseType as AssetLicenseType,
      downloadCount: a.downloadCount,
      tags: safeJsonParse<string[]>(a.tags, []),
      createdAt: a.createdAt.toISOString(),
    };
  }

  /** 根据素材分类获取存储目录名 */
  private getCategoryDir(category: AssetCategory): string {
    // 音效类素材存储到audio目录，其余存到images目录
    if (category === 'sound_effect') return 'audio';
    return 'images';
  }
}

/** 导出素材服务单例 */
export const assetService = new AssetService();
