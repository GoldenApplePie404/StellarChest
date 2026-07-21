// P3 图像生成 Provider
// 覆盖：OpenAI 兼容（DALL·E / gpt-image-1 / flux）+ 火山方舟 Seedream
// 说明：Seedream 走火山方舟 Ark 的 OpenAI 兼容 images/generations 接口（同步返回 url）。
import OpenAI from 'openai';
import type { AIProviderConfig } from './AIProvider';
import type { AIGenerateOptions } from '@/types/ai';
import { InternalError } from '@/lib/errors';

/** 图像生成结果（url 或 base64 二选一） */
export interface ImageResult {
  /** 远程 URL */
  url?: string;
  /** base64 原文（不含 dataURL 前缀，由调用方拼） */
  b64?: string;
}

/** 图像 Provider 接口 */
export interface ImageProvider {
  generateImage(prompt: string, opts?: AIGenerateOptions): Promise<ImageResult>;
}

/** 通用 OpenAI 兼容图像（DALL·E / gpt-image-1 / flux） */
export class OpenAIImageProvider implements ImageProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.apiEndpoint });
    this.model = config.model;
  }

  async generateImage(prompt: string, opts?: AIGenerateOptions): Promise<ImageResult> {
    if (!prompt?.trim()) throw new InternalError('图像描述不能为空');
    try {
      const res = await this.client.images.generate({
        model: this.model,
        prompt,
        n: opts?.n ?? 1,
        size: (opts?.size as OpenAI.Images.ImageGenerateParams['size']) ?? '1024x1024',
        response_format: 'b64_json',
      });
      const item = res.data?.[0];
      if (!item) throw new InternalError('图像生成返回空结果');
      if (item.b64_json) return { b64: item.b64_json };
      if (item.url) return { url: item.url };
      throw new InternalError('图像生成返回格式不支持');
    } catch (e) {
      if (e instanceof InternalError) throw e;
      const msg = e instanceof Error ? e.message : '图像生成失败';
      throw new InternalError('AI 图像生成失败', msg);
    }
  }
}

/**
 * 火山方舟 Seedream（OpenAI 兼容 images/generations，同步返回 url）
 * 接口形态：POST {endpoint}/images/generations，body 兼容 OpenAI，返回 data[].url
 * 注：Ark 返回的 url 通常带有效期，前端展示即可；如需持久化建议下载后转存。
 */
export class SeedreamProvider implements ImageProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.apiEndpoint });
    this.model = config.model;
  }

  async generateImage(prompt: string, opts?: AIGenerateOptions): Promise<ImageResult> {
    if (!prompt?.trim()) throw new InternalError('图像描述不能为空');
    try {
      const res = await this.client.images.generate({
        model: this.model,
        prompt,
        n: opts?.n ?? 1,
        size: (opts?.size as OpenAI.Images.ImageGenerateParams['size']) ?? '1024x1024',
        response_format: 'url',
      });
      const item = res.data?.[0];
      if (!item) throw new InternalError('Seedream 返回空结果');
      if (item.url) return { url: item.url };
      if (item.b64_json) return { b64: item.b64_json };
      throw new InternalError('Seedream 返回格式不支持');
    } catch (e) {
      if (e instanceof InternalError) throw e;
      const msg = e instanceof Error ? e.message : 'Seedream 调用失败';
      throw new InternalError('Seedream 图像生成失败', msg);
    }
  }
}

/**
 * Echo-1.5 系列图像生成（Echo-Image 4B）
 * 注意：实测 Echo-Image 的返回体并非标准 OpenAI `data:[{b64_json|url}]`，
 * 而是自定义结构 `{ artifacts: [{ base64, finishReason, seed }] }`（base64 为 JPEG）。
 * 因此此处不走 OpenAI SDK 的 images.generate（无法解析 artifacts），改为直接 fetch 并兼容两种结构。
 * 支持尺寸：512x512 / 1024x1024 / 1536x1536（其余尺寸回退到最近的合法值）。
 */
export class EchoImageProvider implements ImageProvider {
  private apiEndpoint: string;
  private apiKey: string;
  private model: string;
  /** Echo-Image 支持的分辨率（文档 4.2 节） */
  private static readonly ALLOWED_SIZES = ['512x512', '1024x1024', '1536x1536'];

  constructor(config: AIProviderConfig) {
    this.apiEndpoint = config.apiEndpoint.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async generateImage(prompt: string, opts?: AIGenerateOptions): Promise<ImageResult> {
    if (!prompt?.trim()) throw new InternalError('图像描述不能为空');
    const size = EchoImageProvider.normalizeSize(opts?.size);
    const n = Math.min(Math.max(opts?.n ?? 1, 1), 4);
    try {
      const res = await fetch(`${this.apiEndpoint}/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt, n, size }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new InternalError(`Echo-Image 请求失败（${res.status}）`, txt.slice(0, 300));
      }
      const json = (await res.json()) as { artifacts?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> };
      const item = json.artifacts?.[0] ?? json.data?.[0];
      if (!item) throw new InternalError('Echo-Image 返回空结果');
      const b64 = (item.base64 as string | undefined) ?? (item.b64_json as string | undefined);
      if (b64) return { b64 };
      if (item.url) return { url: item.url as string };
      throw new InternalError('Echo-Image 返回格式不支持');
    } catch (e) {
      if (e instanceof InternalError) throw e;
      const msg = e instanceof Error ? e.message : 'Echo-Image 调用失败';
      throw new InternalError('Echo-Image 图像生成失败', msg);
    }
  }

  /** 将任意尺寸规整为 Echo-Image 支持的三种分辨率之一 */
  private static normalizeSize(size?: string): string {
    if (size && (EchoImageProvider.ALLOWED_SIZES as string[]).includes(size)) return size;
    return '1024x1024';
  }
}
