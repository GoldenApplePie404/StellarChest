// OpenAI-compatible Provider实现
// 使用openai SDK调用chat/completions和images/generations

import OpenAI from 'openai';
import type { AIProvider, AIProviderConfig } from './AIProvider';
import type { AIChatMessage, AIStreamOptions } from '@/types/ai';

/** OpenAI tools 格式（函数声明） */
export interface OpenAITool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/** 工具调用片段（流式聚合后） */
export interface ToolCallResult {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** 助手完整消息（含 tool_calls），供编排循环回填历史 */
export interface AssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCallResult[];
}

/** 对话消息参数（含 tool 角色），供带工具的调用使用 */
export type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
import { InternalError } from '@/lib/errors';

/** OpenAI-compatible Provider实现类 */
export class OpenAICompatibleProvider implements AIProvider {
  private client: OpenAI;
  private model: string;
  /** 推理强度档位（none 关闭思考；low/medium/high 控制思考深度） */
  private reasoningEffort?: string;
  /** 缓存端点与密钥，供连接测试回退（图像端点非 OpenAI 标准结构时直接 fetch） */
  private apiEndpoint: string;
  private apiKey: string;

  /**
   * 构造函数 - 根据配置初始化OpenAI客户端
   * @param config AI配置
   */
  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint,
    });
    this.model = config.model;
    this.reasoningEffort = config.reasoningEffort;
    this.apiEndpoint = config.apiEndpoint.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  /**
   * 生成文本内容
   * @param prompt 用户提示
   * @param systemPrompt 系统提示（可选）
   * @returns 生成的文本内容
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      // 添加系统提示
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // 添加用户提示
      messages.push({
        role: 'user',
        content: prompt,
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content;
      // 兼容推理模型（DeepSeek-R1 / Echo 测试网关等）：答案可能落在 reasoning_content
      const reasoning = (response.choices[0]?.message as { reasoning_content?: string | null })?.reasoning_content;
      const finalContent = content || reasoning;
      if (!finalContent) {
        throw new InternalError('AI生成结果为空');
      }

      return finalContent;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'AI调用失败';
      throw new InternalError(`AI文本生成失败：${errMsg}`);
    }
  }

  /**
   * 生成图片
   * 调用配置的API端点生成图片，支持返回base64或URL
   * @param prompt 图片描述提示
   * @returns 图片Buffer
   */
  async generateImage(prompt: string): Promise<Buffer> {
    if (!prompt || prompt.trim().length === 0) {
      throw new InternalError('图片描述不能为空');
    }

    try {
      // 尝试调用 OpenAI-compatible images/generations 端点
      // 多数兼容API支持此端点
      const response = await this.client.images.generate({
        model: this.model,
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      });

      if (!response.data || response.data.length === 0) {
        throw new InternalError('AI图片生成返回空结果');
      }

      const imageData = response.data[0];
      if (!imageData) {
        throw new InternalError('AI图片生成返回空结果');
      }

      // 优先使用b64_json, 其次使用url
      if (imageData.b64_json) {
        return Buffer.from(imageData.b64_json, 'base64');
      }

      if (imageData.url) {
        // 下载图片URL
        const fetchResponse = await fetch(imageData.url);
        if (!fetchResponse.ok) {
          throw new InternalError(`下载生成的图片失败: ${fetchResponse.status}`);
        }
        const arrayBuffer = await fetchResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }

      throw new InternalError('AI图片生成返回格式不支持');

    } catch (e) {
      // 如果API不支持图片生成端点，尝试返回友好错误
      if (e instanceof InternalError) {
        throw e;
      }
      const errMsg = e instanceof Error ? e.message : 'AI调用失败';

      // 检查是否为不支持图片生成的API
      if (errMsg.includes('not supported') || errMsg.includes('404') || errMsg.includes('not found')) {
        throw new InternalError(
          'AI图片生成功能不可用 — 当前API端点不支持图片生成，请使用支持DALL-E或Stable Diffusion的API服务',
          errMsg,
        );
      }

      throw new InternalError('AI图片生成失败', errMsg);
    }
  }

  /**
   * 流式对话 - 逐块产出文本
   * @param messages 完整对话消息列表
   * @param opts 流式选项（温度/最大token）
   * @returns 文本增量生成器
   */
  /** 构建推理参数（仅当开启思考且非 none 时附加 reasoning_effort） */
  private buildReasoningParams(): Record<string, unknown> {
    if (this.reasoningEffort && this.reasoningEffort !== 'none') {
      return { reasoning_effort: this.reasoningEffort };
    }
    return {};
  }

  async *streamChat(messages: AIChatMessage[], opts?: AIStreamOptions): AsyncGenerator<string> {
    try {
      // 中断：客户端断开或手动停止时，提前结束生成
      if (opts?.signal?.aborted) return;
      // 多模态：user 消息若带 image 附件，构建 OpenAI 视觉 content 数组
      // [ {type:'text'}, {type:'image_url', image_url:{url, detail:'auto'}} ]
      // 无附件则保持纯文本 content（向后兼容）；data URL / https 均支持。
      const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map((m) => {
        if (m.role === 'user') {
          const imgs = (m.media ?? []).filter((x) => x.kind === 'image' && x.url);
          if (imgs.length > 0) {
            const parts: Array<
              | OpenAI.Chat.Completions.ChatCompletionContentPartText
              | OpenAI.Chat.Completions.ChatCompletionContentPartImage
            > = [];
            if (m.content.trim()) parts.push({ type: 'text', text: m.content });
            for (const img of imgs) {
              parts.push({ type: 'image_url', image_url: { url: img.url, detail: 'auto' } });
            }
            return { role: 'user', content: parts };
          }
        }
        return { role: m.role, content: m.content };
      });

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: msgs,
        temperature: opts?.temperature ?? 0.7,
        max_tokens: opts?.maxTokens ?? 4000,
        stream: true,
        ...this.buildReasoningParams(),
      });

      for await (const chunk of stream) {
        if (opts?.signal?.aborted) break;
        const choice = chunk.choices[0];
        if (!choice) continue;
        const delta = choice.delta?.content;
        if (delta) {
          yield delta;
          continue;
        }
        // 推理模型：thinking 阶段产出 reasoning_content，回退透出避免空白
        const rc = (choice.delta as { reasoning_content?: string | null })?.reasoning_content;
        if (rc) yield rc;
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'AI调用失败';
      throw new InternalError(`AI对话流式生成失败：${errMsg}`, errMsg);
    }
  }

  /**
   * 流式对话（带工具 / function calling）
   * 逐块产出文本；流结束后 return 完整助手消息（含聚合后的 tool_calls），供编排循环回填历史。
   */
  async *streamChatWithTools(
    messages: ChatMsg[],
    tools: OpenAITool[],
    opts?: AIStreamOptions,
  ): AsyncGenerator<{ text?: string }, AssistantMessage> {
    try {
      if (opts?.signal?.aborted) return { role: 'assistant', content: null };
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: opts?.temperature ?? 0.7,
        max_tokens: opts?.maxTokens ?? 4000,
        stream: true,
        ...this.buildReasoningParams(),
      });
      const acc: (ToolCallResult | undefined)[] = [];
      let content = '';
      for await (const chunk of stream) {
        if (opts?.signal?.aborted) break;
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          content += delta.content;
          yield { text: delta.content };
        } else {
          // 推理模型回退：把 thinking 透出为文本，避免 Agent 循环空白
          const rc = (delta as { reasoning_content?: string | null })?.reasoning_content;
          if (rc) {
            content += rc;
            yield { text: rc };
          }
        }
        const tcs = delta.tool_calls;
        if (tcs) {
          for (const tc of tcs) {
            const idx = tc.index ?? 0;
            if (!acc[idx]) acc[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
            const cur = acc[idx];
            if (cur) {
              if (tc.id) cur.id = tc.id;
              if (tc.function?.name) cur.function.name += tc.function.name;
              if (tc.function?.arguments) cur.function.arguments += tc.function.arguments;
            }
          }
        }
      }
      const toolCalls = acc.filter((x): x is ToolCallResult => !!x && !!x.id);
      return {
        role: 'assistant',
        content: content || null,
        tool_calls: toolCalls.length ? toolCalls : undefined,
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'AI调用失败';
      throw new InternalError(`AI对话（工具）流式生成失败：${errMsg}`, errMsg);
    }
  }

  /**
   * 连接测试 - 鉴权 + 连通性检查。
   * 优先调用 OpenAI 兼容的 /models 列表接口；
   * 部分兼容端点（如 Echo-1.5）未开放 /models，
   * 此时回退到一次极简真实请求来校验 key 与可达性：
   * - 文本模型 → 极简 chat completion（max_tokens=1）
   * - 图像模型 → 极简 images.generate（n=1, 512x512）
   * @throws InternalError 携带可读错误信息（供路由捕获后返回前端）
   */
  async testConnection(): Promise<void> {
    try {
      await this.client.models.list();
      return;
    } catch (e) {
      // 鉴权失败：key 无效/缺失，直接报错（不再回退）
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) {
        const errMsg = e instanceof Error ? e.message : 'AI连接测试失败';
        throw new InternalError(`AI连接测试失败：API Key 无效或缺失（${status}）`, errMsg);
      }
      // 其他错误（多为端点不支持 /models）→ 回退到极简真实请求校验
      const isImageModel = /image/i.test(this.model) || [
        'dall-e-3', 'dall-e-2', 'gpt-image-1',
        'flux-pro-1.1', 'flux-dev',
        'seedream-3.0', 'seedream-2.0',
        'Echo-Image',
      ].includes(this.model);
      try {
        if (isImageModel) {
          // 部分图像端点（如 Echo-Image）返回非标准结构（artifacts），直接 fetch 校验更稳
          const r = await fetch(`${this.apiEndpoint}/images/generations`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: this.model,
              prompt: 'test',
              n: 1,
              size: this.model === 'Echo-Image' ? '512x512' : '1024x1024',
            }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = (await r.json().catch(() => ({}))) as { artifacts?: unknown[]; data?: unknown[] };
          if (!j.artifacts && !j.data) throw new Error('未返回图像结果');
        } else {
          await this.client.chat.completions.create({
            model: this.model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
            temperature: 0,
          });
        }
      } catch (e2) {
        const errMsg = e2 instanceof Error ? e2.message : 'AI连接测试失败';
        throw new InternalError(`AI连接测试失败：${errMsg}`);
      }
    }
  }
}
