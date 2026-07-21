// 通用工具函数集合

import { v4 as uuidv4 } from 'uuid';
import path from 'path';

/**
 * 生成唯一ID（UUID v4）
 * @returns UUID字符串
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * 构建文件存储路径
 * @param category 文件分类（images/audio/projects）
 * @param projectId 项目ID（可选，用于项目文件）
 * @param filename 文件名
 * @returns 完整存储路径
 */
export function buildStoragePath(category: string, projectId?: string, filename?: string): string {
  const parts = ['data', 'uploads', category];
  if (projectId) parts.push(projectId);
  if (filename) parts.push(filename);
  return parts.join('/');
}

/**
 * 获取文件扩展名（小写）
 * @param filename 文件名
 * @returns 扩展名（含.前缀），如".png"
 */
export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext;
}

/**
 * 安全地截断字符串
 * @param str 原字符串
 * @param maxLength 最大长度
 * @returns 截断后的字符串，超出时添加"..."
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * 延迟指定毫秒数
 * @param ms 毫秒数
 * @returns Promise，在指定时间后resolve
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 格式化日期为中文格式
 * @param date 日期对象或字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 格式化文件大小为人类可读格式
 * @param bytes 文件大小（字节）
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * 将JSON字符串安全解析为对象
 * @param jsonStr JSON字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析结果
 */
export function safeJsonParse<T>(jsonStr: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 对字符串进行HTML转义（防止XSS）
 * @param str 原字符串
 * @returns 转义后的安全字符串
 */
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * 从请求中获取分页参数
 * @param url URL对象
 * @returns 分页参数（page和pageSize）
 */
export function getPaginationFromUrl(url: URL): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
  return { page, pageSize };
}

/**
 * 计算分页偏移量
 * @param page 页码
 * @param pageSize 每页大小
 * @returns 数据库查询偏移量
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}
