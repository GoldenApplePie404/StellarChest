// 素材相关类型定义

/** 素材分类枚举 */
export type AssetCategory =
  | 'ui_component'
  | 'texture'
  | 'sound_effect'
  | 'character_sprite'
  | 'background'
  | 'sprite'
  | 'ui'
  | 'bgm'
  | 'sfx'
  | 'icon'
  | 'other';

/** 素材授权类型枚举 */
export type AssetLicenseType = 'CC0' | 'CC-BY' | 'custom';

/** 素材数据模型 */
export interface Asset {
  id: string;
  userId?: string;
  category: AssetCategory;
  name: string;
  description: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  url?: string;
  type?: string;
  licenseType?: string;
  downloadCount: number;
  tags: string[];
  createdAt: string;
}

/** 素材搜索筛选条件 */
export interface AssetSearchFilter {
  keyword?: string;
  category?: AssetCategory;
  licenseType?: AssetLicenseType;
  tags?: string[];
  sortBy?: 'latest' | 'popular' | 'name';
  page?: number;
  pageSize?: number;
}

/** 上传素材请求 */
export interface UploadAssetRequest {
  name: string;
  description?: string;
  category: AssetCategory;
  licenseType?: AssetLicenseType;
  tags?: string[];
}
