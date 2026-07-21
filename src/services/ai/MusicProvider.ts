// P3 音乐生成 Provider（异步）
// 当前实现 Suno（配置页 provider=suno，默认端点 https://api.suno.com/v1）
// 说明：Suno 官方 API 未完全公开，市面多为网关（如 sunoapi.net 风格）。
//       本实现按「提交→轮询」通用结构编写，具体路径字段需你按实际网关实测微调。
import type { AIProviderConfig } from './AIProvider';
import type { AIGenerateOptions, AIMediaAttachment } from '@/types/ai';
import { InternalError } from '@/lib/errors';

/** 异步生成器接口（music/video 共用） */
export interface AsyncGenerator {
  generate(
    prompt: string,
    opts?: AIGenerateOptions,
    onProgress?: (progress: number, message?: string) => void,
  ): Promise<AIMediaAttachment[]>;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Suno 音乐生成（异步提交+轮询） */
export class SunoProvider implements AsyncGenerator {
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
    if (!prompt?.trim()) throw new InternalError('音乐描述不能为空');
    onProgress?.(5, '提交 Suno 生成任务…');

    const submitRes = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model: this.model,
        ...(opts?.instrumental ? { make_instrumental: true } : {}),
        ...(opts?.duration ? { duration: opts.duration } : {}),
      }),
    });
    if (!submitRes.ok) {
      throw new InternalError(`Suno 提交失败: ${submitRes.status} ${await submitRes.text().catch(() => '')}`);
    }
    const submitJson = await submitRes.json().catch(() => ({}));
    const taskId: string | undefined = submitJson.id ?? submitJson.task_id ?? submitJson.data?.id;
    if (!taskId) throw new InternalError('Suno 未返回任务 ID（请检查网关返回结构）');

    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      try {
        const stRes = await fetch(`${this.endpoint}/api/get?ids=${encodeURIComponent(taskId)}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        if (!stRes.ok) continue;
        const stJson = await stRes.json().catch(() => ({}));
        const item = stJson.data?.[0] ?? stJson[0];
        if (!item) continue;
        const status = item.status;
        onProgress?.(10 + Math.min(80, i * 2), `生成中（${status ?? 'pending'}）`);
        if (status === 'complete' || status === 'succeeded' || item.audio_url) {
          const url = item.audio_url ?? item.song_url ?? item.mp3_url;
          if (url) return [{ kind: 'audio', url, alt: prompt.slice(0, 40) }];
        }
      } catch {
        // 轮询单次失败则继续
      }
    }
    throw new InternalError('Suno 生成超时（请稍后到厂商/网关后台查看结果）');
  }
}
