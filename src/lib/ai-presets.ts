// AI 厂商预设注册表（公用常量，无密钥）
// 用途：为「星灵」五模态（chat/image/music/video/voice）提供默认 Provider / 端点 / 模型下拉项。
// 安全：本文件只包含「公用默认端点 + 模型名」，不含任何 API Key；Key 一律由用户在配置页填写。
//
// ⚠️ 端点待用户确认：以下 defaultEndpoint 为各厂商公开文档中常见的 base URL，
//    实际请以你账号后台给出的地址为准（尤其 Seedream/Seedance 走火山方舟 Ark、
//    Suno 多为第三方网关）。实施 P1 配置页时若与你的账号不符，请告诉我修正。

/** 模态枚举：文本对话 / 绘画 / 音乐 / 视频 / 语音 */
export type AIModality = 'chat' | 'image' | 'music' | 'video' | 'voice';

export const AI_MODALITIES: AIModality[] = ['chat', 'image', 'music', 'video', 'voice'];

/** 模态中文名（UI 展示用） */
export const AI_MODALITY_LABELS: Record<AIModality, string> = {
  chat: 'AI 对话',
  image: 'AI 绘画',
  music: 'AI 音乐',
  video: 'AI 视频',
  voice: 'AI 语音',
};

/** 单个模型选项 */
export interface ModelPreset {
  value: string;
  label: string;
}

/** 单个 Provider 预设 */
export interface ProviderPreset {
  provider: string;
  label: string;
  /** 公用默认端点（用户可改） */
  defaultEndpoint: string;
  /**
   * 可选：预填的 API Key。
   * 仅用于官方公布、带频率/额度限制的开发测试 Key（如 Echo-1.5），
   * 让用户「选中即试用」。正式使用请在配置页替换为自己的密钥。
   */
  apiKey?: string;
  models: ModelPreset[];
}

/**
 * Echo-1.5 系列开发测试 Key。
 * 出于安全考虑，密钥不再硬编码在源码中（避免随公开仓库泄露）。
 * 改为从环境变量 NEXT_PUBLIC_ECHO_DEV_TEST_KEY 注入——将该变量写入本地 .env
 * （.env 已被 .gitignore 排除，不会进入公开仓库）。
 * 留空（默认）则 Echo 预设不预填 Key，用户需在配置页自行填写自己的密钥。
 */
export const ECHO_DEV_TEST_KEY =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ECHO_DEV_TEST_KEY
    ? process.env.NEXT_PUBLIC_ECHO_DEV_TEST_KEY
    : '';

/**
 * 五模态的 Provider 预设表。
 * 选「自定义」时允许手动填 endpoint / model。
 */
export const AI_PRESETS: Record<AIModality, ProviderPreset[]> = {
  chat: [
    {
      provider: 'deepseek',
      label: 'DeepSeek',
      // DeepSeek 官方 OpenAI 兼容 base_url：SDK 会自动追加 /v1/chat/completions
      defaultEndpoint: 'https://api.deepseek.com',
      models: [
        { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro（推理模型）' },
        { value: 'deepseek-v4-flash', label: 'deepseek-v4-flash（轻量快速）' },
      ],
    },
    {
      provider: 'echo',
      label: 'Echo-1.5',
      // Echo-1.5 对话端点：完全兼容 OpenAI /v1/chat/completions（Flash 纯文本 / Pro 多模态图文）
      defaultEndpoint: 'https://eapi.eqmemory.cn/v1',
      // 文档公布开发测试 Key，选中即带出，便于快速试用（正式使用请替换）
      apiKey: ECHO_DEV_TEST_KEY,
      models: [
        { value: 'Echo-1.5-Flash', label: 'Echo-1.5-Flash（纯文本 Agent，极速 100~350 t/s）' },
        { value: 'Echo-1.5-Pro', label: 'Echo-1.5-Pro（多模态图文理解，1.8B 视觉编码器）' },
      ],
    },
    {
      provider: 'openai_compatible',
      label: 'OpenAI 兼容',
      defaultEndpoint: 'https://api.openai.com/v1',
      models: [
        { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
        { value: 'gpt-4o', label: 'gpt-4o' },
      ],
    },
    {
      provider: 'claude',
      label: 'Claude',
      defaultEndpoint: 'https://api.anthropic.com/v1',
      models: [
        { value: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet' },
        { value: 'claude-3-opus-latest', label: 'claude-3-opus' },
      ],
    },
    {
      provider: 'gemini',
      label: 'Gemini',
      defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
      models: [
        { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro' },
        { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
      ],
    },
  ],
  image: [
    {
      provider: 'seedream',
      label: 'Seedream（火山方舟）',
      defaultEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
      models: [
        { value: 'seedream-3.0', label: 'Seedream 3.0' },
        { value: 'seedream-2.0', label: 'Seedream 2.0' },
      ],
    },
    {
      provider: 'openai_compatible',
      label: 'OpenAI 兼容',
      defaultEndpoint: 'https://api.openai.com/v1',
      models: [
        { value: 'gpt-image-1', label: 'gpt-image-1' },
        { value: 'dall-e-3', label: 'dall-e-3' },
      ],
    },
    {
      provider: 'flux',
      label: 'Flux',
      defaultEndpoint: 'https://api.bfl.ai/v1',
      models: [
        { value: 'flux-pro-1.1', label: 'flux-pro-1.1' },
        { value: 'flux-dev', label: 'flux-dev' },
      ],
    },
    {
      provider: 'echo',
      label: 'Echo-Image',
      // Echo-Image 端点：完全对齐 OpenAI 图像生成接口规范，同步返回 url
      defaultEndpoint: 'https://eapi.eqmemory.cn/v1',
      // 文档公布开发测试 Key，选中即带出，便于快速试用（正式使用请替换）
      apiKey: ECHO_DEV_TEST_KEY,
      models: [
        { value: 'Echo-Image', label: 'Echo-Image（4B，整流流扩散，支持 512/1024/1536）' },
      ],
    },
  ],
  music: [
    {
      provider: 'suno',
      label: 'Suno',
      defaultEndpoint: 'https://api.suno.com/v1',
      models: [
        { value: 'suno-v4', label: 'Suno v4' },
        { value: 'suno-v3', label: 'Suno v3' },
      ],
    },
    {
      provider: 'openai_compatible',
      label: 'OpenAI 兼容',
      defaultEndpoint: 'https://api.openai.com/v1',
      models: [
        { value: 'gpt-4o-audio-preview', label: 'gpt-4o-audio-preview' },
      ],
    },
  ],
  video: [
    {
      provider: 'seedance',
      label: 'Seedance（火山方舟）',
      defaultEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
      models: [
        { value: 'seedance-2.0', label: 'Seedance 2.0' },
        { value: 'seedance-1.0', label: 'Seedance 1.0' },
      ],
    },
    {
      provider: 'openai_compatible',
      label: 'OpenAI 兼容',
      defaultEndpoint: 'https://api.openai.com/v1',
      models: [
        { value: 'sora', label: 'Sora' },
      ],
    },
  ],
  voice: [
    {
      provider: 'tts_openai',
      label: 'OpenAI TTS',
      defaultEndpoint: 'https://api.openai.com/v1',
      models: [
        { value: 'tts-1', label: 'tts-1' },
        { value: 'gpt-4o-mini-tts', label: 'gpt-4o-mini-tts' },
      ],
    },
    {
      provider: 'azure_tts',
      label: 'Azure TTS',
      defaultEndpoint: 'https://<region>.tts.speech.microsoft.com',
      models: [
        { value: 'zh-CN-XiaoxiaoNeural', label: '晓晓（中文女声）' },
        { value: 'zh-CN-YunxiNeural', label: '云希（中文男声）' },
      ],
    },
    {
      provider: 'fish_audio',
      label: 'Fish Audio',
      defaultEndpoint: 'https://api.fish.audio/v1',
      models: [
        { value: 'fish-speech-1.5', label: 'fish-speech-1.5' },
      ],
    },
  ],
};

/** 取某模态下某 provider 的预设（找不到返回 undefined） */
export function getProviderPreset(modality: AIModality, provider: string): ProviderPreset | undefined {
  return AI_PRESETS[modality]?.find((p) => p.provider === provider);
}

/** 取某模态的默认 provider + 默认模型（用于初始化未配置用户） */
export function getDefaultForModality(modality: AIModality): { provider: string; apiEndpoint: string; apiKey: string; model: string } {
  const list = AI_PRESETS[modality];
  const first = list?.[0];
  return {
    provider: first?.provider ?? 'openai_compatible',
    apiEndpoint: first?.defaultEndpoint ?? '',
    apiKey: first?.apiKey ?? '',
    model: first?.models?.[0]?.value ?? '',
  };
}
