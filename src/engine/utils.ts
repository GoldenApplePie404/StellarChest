// 引擎公共工具函数
import type { GameState } from '@/types/engine';

/**
 * 解析资源ID到真实URL。
 * - 若 resource 本身已是 URL（http / / / data:），直接返回；
 * - 否则尝试从 GameState.resourceMap 中查找；
 * - 都未命中则原样返回，便于上层给出缺失提示。
 */
export function resolveResourceUrl(resource: string, state: GameState): string {
  if (!resource) return resource;
  if (
    resource.startsWith('http://') ||
    resource.startsWith('https://') ||
    resource.startsWith('/') ||
    resource.startsWith('data:')
  ) {
    return resource;
  }
  const map = (state as unknown as { resourceMap?: Record<string, string> }).resourceMap || {};
  return map[resource] || resource;
}
