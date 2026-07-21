// P3 视频生成 Provider（异步）
// 当前实现 Seedance（火山方舟 Ark，配置页 provider=seedance，默认端点 https://ark.cn-beijing.volces.com/api/v3）
// 说明：Ark 视频为任务制接口 —— 提交 POST /generations/tasks，轮询 GET /generations/tasks/{id}。
//       具体字段以火山方舟官方文档为准，本实现按通用结构编写，待测实微调。
import type { AIProviderConfig } from './AIProvider';
import type { AIGenerateOptions, AIMediaAttachment } from '@/types/ai';
import { InternalError } from '@/lib/errors';
import type { AsyncGenerator } from './MusicProvider';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Seedance 视频生成（火山方舟 Ark 异步任务） */
export class SeedanceProvider implements AsyncGenerator {
  private endpoint: string;
  private apiKey: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.endpoint = config.apiEndpoint.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async generate(
    prompt: string,
    opts?: AIGenerateOptions,
    onProgress?: (progress: number, message?: string) => void,
  ): Promise<AIMediaAttachment[]> {
    if (!prompt?.trim()) throw new InternalError('视频描述不能为空');
    onProgress?.(5, '提交 Seedance 视频任务…');

    const submitRes = await fetch(`${this.endpoint}/generations/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        content: [{ type: 'text', text: prompt }],
        ...(opts?.duration ? { duration_seconds: opts.duration } : {}),
      }),
    });
    if (!submitRes.ok) {
      throw new InternalError(`Seedance 提交失败: ${submitRes.status} ${await submitRes.text().catch(() => '')}`);
    }
    const submitJson = await submitRes.json().catch(() => ({}));
    const taskId: string | undefined = submitJson.id ?? submitJson.task_id;
    if (!taskId) throw new InternalError('Seedance 未返回任务 ID');

    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      try {
        const stRes = await fetch(`${this.endpoint}/generations/tasks/${encodeURIComponent(taskId)}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        if (!stRes.ok) continue;
        const stJson = await stRes.json().catch(() => ({}));
        const status = stJson.status;
        onProgress?.(10 + Math.min(80, i * 2), `生成中（${status ?? 'pending'}）`);
        if (status === 'succeeded' || status === 'succeed') {
          const url = stJson.content?.[0]?.video_url ?? stJson.video_url;
          if (url) return [{ kind: 'video', url, alt: prompt.slice(0, 40) }];
        }
        if (status === 'failed') throw new InternalError('Seedance 生成失败');
      } catch (e) {
        if (e instanceof InternalError) throw e;
        // 轮询单次失败则继续
      }
    }
    throw new InternalError('Seedance 生成超时（请稍后到火山方舟控制台查看任务）');
  }
}
