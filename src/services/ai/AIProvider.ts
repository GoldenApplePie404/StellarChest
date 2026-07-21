// AI Provider抽象接口
// 定义统一的AI调用接口，支持多Provider实现

import type { AIChatMessage, AIStreamOptions } from '@/types/ai';

/** AI Provider配置类型 */
export interface AIProviderConfig {
  /** Provider类型 */
  provider: string;
  /** API端点URL */
  apiEndpoint: string;
  /** API密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 推理强度档位（chat 模态推理模型：none 关闭思考） */
  reasoningEffort?: string;
}

/** AI Provider抽象接口 */
export interface AIProvider {
  /** 生成文本内容 */
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  /** 生成图片（预留接口） */
  generateImage(prompt: string): Promise<Buffer>;
  /** 流式对话（逐块产出文本） */
  streamChat(messages: AIChatMessage[], opts?: AIStreamOptions): AsyncGenerator<string>;
}
