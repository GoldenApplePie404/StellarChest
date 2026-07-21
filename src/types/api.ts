// API通用类型定义
// 全站统一API响应格式：{ code, data, message }

/** 统一API响应格式 */
export interface ApiResponse<T> {
  /** 状态码（200=成功，400/401/403/404/500=错误） */
  code: number;
  /** 响应数据（成功时为具体数据，错误时为null） */
  data: T | null;
  /** 消息（成功时为"ok"，错误时为错误描述） */
  message: string;
}

/** 分页数据结构 */
export interface PaginatedData<T> {
  /** 数据列表 */
  items: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页大小 */
  pageSize: number;
}

/** 分页API响应 */
export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>;

/** 错误响应 */
export type ErrorResponse = ApiResponse<null>;

/** 错误类型枚举 */
export type ErrorCode =
  | 400   // 参数错误
  | 401   // 未认证
  | 403   // 无权限
  | 404   // 资源不存在
  | 409   // 冲突（如邮箱已注册）
  | 500;  // 服务器内部错误

/** API请求通用分页参数 */
export interface PaginationParams {
  /** 页码（默认1） */
  page?: number;
  /** 每页大小（默认20） */
  pageSize?: number;
}
