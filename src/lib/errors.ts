// 统一错误处理类
// 提供标准化的错误分类和响应格式

/** 应用错误基类 */
export class AppError extends Error {
  /** HTTP状态码 */
  public readonly code: number;
  /** 错误描述（面向用户） */
  public readonly message: string;
  /** 错误详情（面向开发者，可选） */
  public readonly details?: string;

  constructor(code: number, message: string, details?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.message = message;
    this.details = details;
  }

  /** 转换为API响应格式 */
  toResponse(): { code: number; data: null; message: string } {
    return {
      code: this.code,
      data: null,
      message: this.message,
    };
  }
}

/** 参数验证错误（400） */
export class ValidationError extends AppError {
  constructor(message: string, details?: string) {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}

/** 未认证错误（401） */
export class UnauthorizedError extends AppError {
  constructor(message: string = '请先登录') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

/** 无权限错误（403） */
export class ForbiddenError extends AppError {
  constructor(message: string = '无权限访问') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

/** 资源不存在错误（404） */
export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(404, `${resource}不存在`);
    this.name = 'NotFoundError';
  }
}

/** 冲突错误（409 - 如邮箱已注册） */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

/** 服务器内部错误（500） */
export class InternalError extends AppError {
  constructor(message: string = '服务器内部错误', details?: string) {
    super(500, message, details);
    this.name = 'InternalError';
  }
}

/**
 * 从Zod验证错误转换为ValidationError
 * @param error Zod验证错误对象
 * @returns ValidationError实例
 */
export function fromZodError(error: { errors: { message: string; path: (string | number)[] }[] }): ValidationError {
  const firstIssue = error.errors[0];
  const message = firstIssue ? firstIssue.message : '参数验证失败';
  const details = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
  return new ValidationError(message, details);
}

/**
 * 创建成功API响应
 * @param data 响应数据
 * @param message 消息（默认"ok"）
 * @returns 标准API响应格式
 */
export function successResponse<T>(data: T, message: string = 'ok'): { code: number; data: T; message: string } {
  return {
    code: 200,
    data,
    message,
  };
}
