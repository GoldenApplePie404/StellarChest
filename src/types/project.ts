// 项目相关类型定义
// 对应架构文档3节类图中的Project/ProjectFile/ProjectConfig数据结构

/** 项目状态枚举 */
export type ProjectStatus = 'draft' | 'published' | 'archived';

/** 项目数据模型 */
export interface Project {
  /** 项目ID */
  id: string;
  /** 所属用户ID */
  userId: string;
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description: string;
  /** 封面图URL */
  coverUrl: string;
  /** 项目状态 */
  status: ProjectStatus;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 浏览次数 */
  viewCount: number;
  /** 游玩次数 */
  playCount: number;
  /** 标签列表 */
  tags: string[];
  /** 截图URL列表 */
  screenshots: string[];
  /** 发布时间 */
  publishedAt: string | null;
}

/** 项目文件类型枚举 */
export type ProjectFileType = 'script' | 'image' | 'audio' | 'config' | 'other';

/** 项目文件数据模型 */
export interface ProjectFile {
  /** 文件ID */
  id: string;
  /** 所属项目ID */
  projectId: string;
  /** 文件名 */
  filename: string;
  /** 文件类型 */
  fileType: ProjectFileType;
  /** 存储路径 */
  storagePath: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 创建时间 */
  createdAt: string;
}

/** 项目配置数据模型 */
export interface ProjectConfig {
  /** 项目ID（主键） */
  projectId: string;
  /** 入口脚本文件名 */
  entryScript: string;
  /** 角色ID列表 */
  characterIds: string[];
  /** 资源映射表（资源ID -> URL路径） */
  resourceMap: Record<string, string>;
  /** 对话框样式 */
  dialogStyle: 'normal' | 'none' | 'fullscreen';
  /** 逐字显示速度 */
  textSpeed: 'fast' | 'normal' | 'slow';
  /** 是否自动存档 */
  autoSave: boolean;
}

/** 创建项目请求 */
export interface CreateProjectRequest {
  /** 项目名称 */
  name: string;
  /** 项目描述 */
  description?: string;
  /** 封面图URL（可选） */
  coverUrl?: string;
}

/** 更新项目请求 */
export interface UpdateProjectRequest {
  /** 项目名称 */
  name?: string;
  /** 项目描述 */
  description?: string;
  /** 封面图URL */
  coverUrl?: string;
  /** 项目状态 */
  status?: ProjectStatus;
}
