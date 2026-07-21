// AI相关类型定义
// 对应架构文档3节类图中的AIConfig/AIService数据结构
// 注：AIModality / ProviderPreset 等枚举与预设以 src/lib/ai-presets.ts 为单一事实来源

import type { AIModality, ProviderPreset, ModelPreset } from '@/lib/ai-presets';

export type { AIModality, ProviderPreset, ModelPreset };

/** AI Provider类型（已知厂商并集，同时允许自定义字符串） */
export type AIProviderType =
  | 'openai_compatible'
  | 'claude'
  | 'gemini'
  | 'deepseek'
  | 'seedream'
  | 'flux'
  | 'suno'
  | 'seedance'
  | 'tts_openai'
  | 'azure_tts'
  | 'fish_audio'
  | (string & {});

/** 推理强度档位（仅 chat 模态的推理模型生效；none=关闭思考） */
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

/** AI配置数据模型（每用户每模态一组） */
export interface AIConfig {
  /** 配置ID */
  id: string;
  /** 所属用户ID */
  userId: string;
  /** 模态：chat|image|music|video|voice */
  modality: AIModality;
  /** AI Provider类型 */
  provider: AIProviderType;
  /** API端点URL */
  apiEndpoint: string;
  /** API密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** 该模态是否启用 */
  enabled: boolean;
  /** 推理强度档位（chat 模态推理模型：none 关闭思考，low/medium/high 控制思考深度） */
  reasoningEffort?: ReasoningEffort;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 单模态配置（与 AIConfig 同构，便于接口语义） */
export type AIModalityConfig = AIConfig;

/** 保存单模态配置请求（模态由接口路径参数 / 调用方固定值提供，故此处不含 modality） */
export interface SaveAIModalityConfigRequest {
  /** Provider */
  provider: AIProviderType;
  /** API端点URL */
  apiEndpoint: string;
  /** API密钥（可空，用户未填时为空） */
  apiKey?: string;
  /** 模型名称 */
  model: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 推理强度档位（chat 模态推理模型） */
  reasoningEffort?: ReasoningEffort;
}

/** 旧版单条保存配置请求（向后兼容 settings 路由，按 chat 模态落库） */
export interface SaveAIConfigRequest {
  /** AI Provider类型 */
  provider: AIProviderType;
  /** API端点URL */
  apiEndpoint: string;
  /** API密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
}

/** AI剧本生成请求 */
export interface AIScriptGenerateRequest {
  /** 一句话剧情描述 */
  description: string;
  /** 生成风格（可选） */
  style?: string;
  /** 角色设定（可选，JSON格式） */
  characters?: string;
}

/** AI脚本续写请求 */
export interface AIScriptContinueRequest {
  /** 原始脚本片段 */
  snippet: string;
  /** 续写指令描述 */
  instruction: string;
}

/** AI素材生成请求 */
export interface AIAssetGenerateRequest {
  /** 素材类型 */
  assetType: 'image' | 'sound';
  /** 素材描述 */
  description: string;
  /** 素材风格（可选） */
  style?: string;
}

/** AI生成结果 */
export interface AIGenerateResult {
  /** 生成的文本内容（剧本/脚本续写） */
  text?: string;
  /** 生成的素材URL（图片/音效） */
  assetUrl?: string;
  /** 生成耗时（毫秒） */
  duration: number;
}

/** 多模态附件（会话历史可存图片/音频/视频产出） */
export interface AIMediaAttachment {
  /** 媒体类型 */
  kind: 'image' | 'audio' | 'video';
  /** 媒体 URL（dataURL 或远程地址） */
  url: string;
  /** 替代文本 / 说明 */
  alt?: string;
}

/** Agent 工具调用记录（持久化到会话，便于回看） */
export interface AIToolCallRecord {
  /** 工具名（如 mcp__server__tool） */
  name: string;
  /** 模型传入的原始参数 JSON 字符串 */
  args: string;
  /** 工具返回结果（截取后的文本） */
  result?: string;
}

/** RAG 检索来源（随助手消息持久化，便于前端展示引用） */
export interface RagSource {
  /** 切片 id */
  id: string;
  /** 所属文档标题 */
  docTitle: string;
  /** 片段预览（截断） */
  snippet: string;
}

/** 对话消息（扩展多模态附件，供 image/music/video/voice 产出存储） */
export interface AIChatMessage {
  /** 角色 */
  role: 'system' | 'user' | 'assistant';
  /** 文本内容 */
  content: string;
  /** 多模态附件（可选） */
  media?: AIMediaAttachment[];
  /** Agent 模式下的工具调用记录（可选） */
  toolCalls?: AIToolCallRecord[];
  /** RAG 引用来源（可选，挂载知识库时由后端回填） */
  sources?: RagSource[];
}

/** 流式选项 */
export interface AIStreamOptions {
  /** 模型（覆盖配置默认） */
  model?: string;
  /** 温度 */
  temperature?: number;
  /** 最大 token */
  maxTokens?: number;
  /** 中断信号（客户端断开/手动停止时提前结束生成，省 token） */
  signal?: AbortSignal;
}

// ============================================================
// P3：多模态生成（image/music/video/voice）统一类型
// ============================================================

/** 统一生成请求（POST /api/ai/generate） */
export interface AIGenerateRequest {
  /** 目标模态 */
  modality: AIModality;
  /** 提示词 / 文本 */
  prompt: string;
  /** 覆盖模型（可选，默认用该模态配置模型） */
  model?: string;
  /** 生成选项（按模态可选字段） */
  options?: AIGenerateOptions;
}

/** 各模态生成选项（按需可选字段，统一一个接口便于前端传递） */
export interface AIGenerateOptions {
  /** 图片尺寸，如 1024x1024 / 1024x1792 */
  size?: string;
  /** 生成数量 */
  n?: number;
  /** 音乐时长（秒） */
  duration?: number;
  /** 是否生成歌词 */
  lyrics?: boolean;
  /** 是否纯音乐（无人声） */
  instrumental?: boolean;
  /** 语音音色名 / voice id */
  voice?: string;
  /** 语速（如 1.0） */
  speed?: number;
  /** 音频格式 */
  format?: 'mp3' | 'wav' | 'ogg';
}

/** 生成进度（SSE 推送，异步模态用它报告阶段/进度/结果） */
export interface AIGenerateProgress {
  /** 阶段 */
  phase: 'pending' | 'generating' | 'done' | 'error';
  /** 进度 0-100（异步模态用） */
  progress?: number;
  /** 提示信息 */
  message?: string;
  /** 完成时的媒体结果 */
  result?: AIMediaAttachment[];
  /** 错误信息 */
  error?: string;
}

/** 异步任务（taskManager 内存表，music/video 轮询期间使用） */
export interface AIAsyncTask {
  /** 任务 ID */
  id: string;
  /** 所属用户 */
  userId: string;
  /** 模态 */
  modality: AIModality;
  /** 状态 */
  status: 'pending' | 'running' | 'done' | 'failed';
  /** 进度 0-100 */
  progress: number;
  /** 结果媒体 */
  result?: AIMediaAttachment[];
  /** 失败原因 */
  error?: string;
  /** 创建时间戳 */
  createdAt: number;
}

// ============================================================
// P5：MCP 连接器 + Agent 编排
// ============================================================

/** Agent 工具集（对应 AIAgent.toolset JSON） */
export interface AIAgentToolset {
  /** 提示词库条目 ID 列表 */
  prompts: string[];
  /** 知识库 ID 列表 */
  kb: string[];
  /** MCP 服务器 ID 列表 */
  mcp: string[];
  /** 是否启用联网搜索 */
  web: boolean;
}

/** Agent 流式事件（chat 路由 → 前端 SSE 消费） */
export type AgentStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: string }
  | { type: 'tool_result'; id: string; name: string; result: string }
  | { type: 'done' };
