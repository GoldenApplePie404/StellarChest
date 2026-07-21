// AI服务 - 统一AI调用接口/配置管理/剧本生成/续写
// 遵循架构文档3节类图中的AIService定义，采用适配器模式
// P0 重构：AIConfig 由「每用户单条」升级为「每用户每模态一组」(chat|image|music|video|voice)

import prisma from '@/lib/db';
import type { AIProvider, AIProviderConfig } from '@/services/ai/AIProvider';
import { OpenAICompatibleProvider } from '@/services/ai/OpenAICompatibleProvider';
import { NotFoundError, ValidationError, InternalError } from '@/lib/errors';
import { safeJsonParse } from '@/lib/utils';
import { buildScriptContinueSystemPrompt, buildScriptContinueUserPrompt } from '@/services/ai/prompts/script-continue';
import { buildPlatformPersonaPrompt } from '@/services/ai/prompts/platform-persona';
import type {
  AIConfig, SaveAIConfigRequest, SaveAIModalityConfigRequest, AIModalityConfig,
  AIScriptContinueRequest, AIGenerateResult, AIProviderType, AIModality,
  AIChatMessage, AIStreamOptions, AIGenerateRequest, ReasoningEffort,
} from '@/types/ai';
import { getDefaultForModality, AI_MODALITY_LABELS } from '@/lib/ai-presets';
import { createGenerator, type ModalityGenerator } from '@/services/ai/factory';
import { ToolRegistry } from '@/services/ai/ToolRegistry';
import type { OpenAITool, AssistantMessage, ChatMsg } from '@/services/ai/OpenAICompatibleProvider';
import type { AgentStreamEvent, AIAgentToolset } from '@/types/ai';

/** AI服务类 */
export class AIService {
  private provider: AIProvider | null = null;

  // ============================================================
  // 配置读写（按模态）
  // ============================================================

  /**
   * 获取某模态配置（DB 不存在返回 null）
   */
  async getConfig(userId: string, modality: AIModality): Promise<AIConfig | null> {
    const config = await prisma.aIConfig.findUnique({ where: { userId_modality: { userId, modality } } });
    if (!config) return null;
    return this.formatAIConfig(config);
  }

  /**
   * 获取某模态配置，DB 不存在时回退到预设默认值（保证前端永远有可展示内容）
   */
  async getConfigOrDefault(userId: string, modality: AIModality): Promise<AIModalityConfig> {
    const db = await this.getConfig(userId, modality);
    if (db) return db;
    const def = getDefaultForModality(modality);
    return {
      id: '',
      userId,
      modality,
      provider: def.provider,
      apiEndpoint: def.apiEndpoint,
      apiKey: '',
      model: def.model,
      enabled: true,
      reasoningEffort: 'none',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * 保存某模态配置（upsert）
   */
  async saveConfig(userId: string, modality: AIModality, data: SaveAIModalityConfigRequest): Promise<AIModalityConfig> {
    const saved = await prisma.aIConfig.upsert({
      where: { userId_modality: { userId, modality } },
      update: {
        provider: data.provider,
        apiEndpoint: data.apiEndpoint,
        apiKey: data.apiKey ?? '',
        model: data.model,
        enabled: data.enabled ?? true,
        reasoningEffort: data.reasoningEffort ?? '',
      },
      create: {
        userId,
        modality,
        provider: data.provider,
        apiEndpoint: data.apiEndpoint,
        apiKey: data.apiKey ?? '',
        model: data.model,
        enabled: data.enabled ?? true,
        reasoningEffort: data.reasoningEffort ?? '',
      },
    });
    return this.formatAIConfig(saved);
  }

  // ============================================================
  // 向后兼容（旧 settings 路由按 chat 模态落库）
  // ============================================================

  async getAIConfig(userId: string): Promise<AIConfig | null> {
    return this.getConfig(userId, 'chat');
  }

  async saveAIConfig(userId: string, config: SaveAIConfigRequest): Promise<AIConfig> {
    return this.saveConfig(userId, 'chat', config);
  }

  // ============================================================
  // 生成能力（沿用 chat 模态配置）
  // ============================================================

  /**
   * AI脚本续写
   */
  async continueScript(userId: string, request: AIScriptContinueRequest): Promise<AIGenerateResult> {
    const startTime = Date.now();
    await this.initProvider(userId);

    const systemPrompt = buildScriptContinueSystemPrompt();
    const userPrompt = buildScriptContinueUserPrompt(request.snippet, request.instruction);

    const text = await this.provider!.generateText(userPrompt, systemPrompt);
    return { text, duration: Date.now() - startTime };
  }

  /**
   * 根据 chat 模态配置流式对话（逐块产出文本）
   * @param userId 用户ID
   * @param messages 完整对话消息
   * @param opts 流式选项（覆盖模型/温度）
   */
  async *streamChat(userId: string, messages: AIChatMessage[], opts?: AIStreamOptions): AsyncGenerator<string> {
    const config = await this.getConfig(userId, 'chat');
    if (!config || !config.apiEndpoint || !config.apiKey) {
      throw new ValidationError('请先在「星灵 → 模型配置」中填写对话模型的 API 端点与密钥');
    }
    const provider = new OpenAICompatibleProvider({
      provider: config.provider,
      apiEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
      model: opts?.model || config.model,
      reasoningEffort: config.reasoningEffort || undefined,
    });

    // 注入星灵平台人格：普通对话模式缺少系统提示时，前置 platform persona
    const hasSystem = messages[0]?.role === 'system';
    const chatMessages = hasSystem
      ? messages
      : [{ role: 'system' as const, content: buildPlatformPersonaPrompt() }, ...messages];

    yield* provider.streamChat(chatMessages, { temperature: opts?.temperature, maxTokens: opts?.maxTokens, signal: opts?.signal });
  }

  /**
   * 根据指定模态配置构建生成器（image/music/video/voice 四模态共用）
   * chat 模态不在此列，仍走 streamChat。
   * @throws ValidationError 未配置端点/密钥时
   */
  async buildGenerator(userId: string, modality: AIModality, modelOverride?: string): Promise<ModalityGenerator> {
    if (modality === 'chat') throw new ValidationError('对话模态请使用 streamChat');
    const config = await this.getConfig(userId, modality);
    if (!config || !config.apiEndpoint || !config.apiKey) {
      throw new ValidationError(`请先在「星灵 → 模型配置」中填写「${AI_MODALITY_LABELS[modality]}」的 API 端点与密钥`);
    }
    return createGenerator(modality, {
      provider: config.provider,
      apiEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
      model: modelOverride || config.model,
    });
  }

  /**
   * 根据 chat 模态配置初始化 Provider
   */
  private async initProvider(userId: string): Promise<void> {
    const config = await this.getConfig(userId, 'chat');

    if (!config || !config.apiEndpoint || !config.apiKey) {
      throw new ValidationError('请先在「星灵 → 模型配置」中填写对话模型的 API 端点与密钥');
    }

    this.setProvider({
      provider: config.provider,
      apiEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
      model: config.model,
    });
  }

  /**
   * 根据配置设置 Provider 实例
   */
  private setProvider(config: AIProviderConfig): void {
    switch (config.provider) {
      case 'openai_compatible':
        this.provider = new OpenAICompatibleProvider(config);
        break;
      case 'claude':
        throw new ValidationError('Claude Provider 将在后续版本支持');
      case 'gemini':
        throw new ValidationError('Gemini Provider 将在后续版本支持');
      default:
        this.provider = new OpenAICompatibleProvider(config);
    }
  }

  /** 格式化 AI 配置记录 */
  private formatAIConfig(c: {
    id: string; userId: string; modality: string; provider: string;
    apiEndpoint: string; apiKey: string; model: string; enabled: boolean;
    reasoningEffort?: string | null;
    createdAt: Date; updatedAt: Date;
  }): AIConfig {
    return {
      id: c.id,
      userId: c.userId,
      modality: c.modality as AIModality,
      provider: c.provider as AIProviderType,
      apiEndpoint: c.apiEndpoint,
      apiKey: c.apiKey,
      model: c.model,
      enabled: c.enabled,
      reasoningEffort: (c.reasoningEffort || 'none') as ReasoningEffort,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  /**
   * 按 Agent 配置编排对话（多步工具循环）
   * 构建 system（agent.role）+ 注入工具；循环：调用 LLM → 执行 tool_calls → 回填 → 再调用（上限 MAX_AGENT_ROUNDS）
   * @yields AgentStreamEvent：delta（文本）/ tool_call / tool_result / done
   */
  async *streamAgentChat(
    userId: string,
    messages: AIChatMessage[],
    opts: { agentId: string; model?: string; temperature?: number; signal?: AbortSignal },
  ): AsyncGenerator<AgentStreamEvent> {
    const agent = await prisma.aIAgent.findFirst({ where: { id: opts.agentId, userId } });
    if (!agent) throw new NotFoundError('Agent');
    const toolset: AIAgentToolset = {
      prompts: [],
      kb: [],
      mcp: [],
      web: false,
      ...safeJsonParse(agent.toolset, {}),
    };
    const registry = await ToolRegistry.build(userId, toolset);

    const config = await this.getConfig(userId, 'chat');
    if (!config || !config.apiEndpoint || !config.apiKey) {
      throw new ValidationError('请先在「星灵 → 模型配置」中填写对话模型的 API 端点与密钥');
    }
    const model = opts.model || agent.model || config.model;
    const provider = new OpenAICompatibleProvider({
      provider: config.provider,
      apiEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
      model,
    });

    const llmMessages: ChatMsg[] = [];
    const systemContent = agent.role && agent.role.trim() ? agent.role.trim() : buildPlatformPersonaPrompt();
    llmMessages.push({ role: 'system', content: systemContent });
    for (const m of messages) {
      llmMessages.push({ role: m.role, content: m.content });
    }

    const MAX_AGENT_ROUNDS = 6;
    for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
      if (opts.signal?.aborted) break;
      const gen = provider.streamChatWithTools(llmMessages, registry.tools, { model, temperature: opts.temperature, signal: opts.signal });
      let r = await gen.next();
      while (!r.done) {
        if (r.value.text) yield { type: 'delta', text: r.value.text };
        r = await gen.next();
      }
      const assistant = r.value as AssistantMessage;
      if (!assistant.tool_calls || assistant.tool_calls.length === 0) break;

      const assistantMsg: ChatMsg = {
        role: 'assistant',
        content: assistant.content ?? '',
        tool_calls: assistant.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      };
      llmMessages.push(assistantMsg);

      for (const tc of assistant.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || '{}');
        } catch {
          args = {};
        }
        yield { type: 'tool_call', id: tc.id, name: tc.function.name, args: tc.function.arguments };
        const result = await registry.dispatch(tc.function.name, args, { userId });
        yield { type: 'tool_result', id: tc.id, name: tc.function.name, result: result.slice(0, 2000) };
        const toolMsg: ChatMsg = { role: 'tool', tool_call_id: tc.id, content: result.slice(0, 4000) };
        llmMessages.push(toolMsg);
      }
    }
    yield { type: 'done' };
  }
}

/** 导出 AI 服务单例 */
export const aiService = new AIService();
