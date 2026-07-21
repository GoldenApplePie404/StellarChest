// 论坛相关类型定义
// 对应架构文档3节类图中的ForumPost/Comment数据结构

/** 论坛帖子分类枚举 */
export type PostCategory =
  | 'creation_exchange'   // 创作交流
  | 'asset_share'         // 素材分享
  | 'tech_help'           // 技术求助
  | 'work_show';          // 作品展示

/** 论坛帖子数据模型 */
export interface ForumPost {
  /** 帖子ID */
  id: string;
  /** 作者用户ID */
  userId: string;
  /** 帖子分类 */
  category: PostCategory;
  /** 帖子标题 */
  title: string;
  /** 帖子内容 */
  content: string;
  /** 浏览次数 */
  viewCount: number;
  /** 评论数量 */
  commentCount: number;
  /** 是否置顶 */
  isPinned: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 作者昵称（查询含用户信息时填充） */
  authorNickname?: string;
}

/** 评论数据模型 */
export interface Comment {
  /** 评论ID */
  id: string;
  /** 所属帖子ID */
  postId: string;
  /** 评论者用户ID */
  userId: string;
  /** 评论内容 */
  content: string;
  /** 创建时间 */
  createdAt: string;
  /** 评论者昵称（查询含用户信息时填充） */
  authorNickname?: string;
}

/** 帖子搜索筛选条件 */
export interface PostSearchFilter {
  /** 关键词搜索 */
  keyword?: string;
  /** 分类筛选 */
  category?: PostCategory;
  /** 是否只看置顶 */
  pinnedOnly?: boolean;
  /** 排序方式 */
  sortBy?: 'latest' | 'popular' | 'commented';
  /** 分页页码 */
  page?: number;
  /** 分页大小 */
  pageSize?: number;
  /** 作者ID筛选 */
  authorId?: string;
}

/** 创建帖子请求 */
export interface CreatePostRequest {
  /** 帖子分类 */
  category: PostCategory;
  /** 帖子标题 */
  title: string;
  /** 帖子内容 */
  content: string;
}

/** 创建评论请求 */
export interface CreateCommentRequest {
  /** 评论内容 */
  content: string;
}
