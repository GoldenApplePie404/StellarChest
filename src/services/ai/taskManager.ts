// P3 轻量内存任务管理器
// 记录 music/video 异步生成任务状态，供 /api/ai/generate 在 SSE 推送的同时登记任务。
// 仅开发期/单机内存级；P4 落库后可替换为 DB 持久化版本（接口保持一致）。
import { randomUUID } from 'node:crypto';
import type { AIAsyncTask, AIModality } from '@/types/ai';

const tasks = new Map<string, AIAsyncTask>();

/** 创建任务并返回 */
export function createTask(userId: string, modality: AIModality): AIAsyncTask {
  const t: AIAsyncTask = {
    id: randomUUID(),
    userId,
    modality,
    status: 'running',
    progress: 0,
    createdAt: Date.now(),
  };
  tasks.set(t.id, t);
  return t;
}

/** 局部更新任务 */
export function updateTask(id: string, patch: Partial<AIAsyncTask>): void {
  const t = tasks.get(id);
  if (t) Object.assign(t, patch);
}

/** 查询任务 */
export function getTask(id: string): AIAsyncTask | undefined {
  return tasks.get(id);
}

/** 清理 30 分钟前的任务，避免内存泄漏 */
export function cleanupTasks(): void {
  const now = Date.now();
  for (const [k, v] of tasks) {
    if (now - v.createdAt > 30 * 60 * 1000) tasks.delete(k);
  }
}
