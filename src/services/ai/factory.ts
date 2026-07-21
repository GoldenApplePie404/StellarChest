// P3 Provider 工厂
// 按模态 + provider 分发到具体实现，并包装成统一的 ModalityGenerator，
// 供 /api/ai/generate 路由按 isAsync 选择「同步返回」或「异步轮询 SSE 进度」。
import type { AIProviderConfig } from './AIProvider';
import type { AIModality } from '@/lib/ai-presets';
import type { AIGenerateOptions, AIMediaAttachment } from '@/types/ai';
import { ValidationError } from '@/lib/errors';
import { OpenAIImageProvider, SeedreamProvider, EchoImageProvider } from './ImageProvider';
import { OpenAITTSProvider, AzureTTSProvider, FishAudioProvider } from './VoiceProvider';
import { SunoProvider, type AsyncGenerator } from './MusicProvider';
import { SeedanceProvider } from './VideoProvider';

/** 统一模态生成器（route 据此决定同步/异步调用） */
export interface ModalityGenerator {
  /** 是否异步（music/video 为 true） */
  isAsync: boolean;
  /** 同步生成（image/voice）——直接返回媒体附件 */
  generateSync?(prompt: string, opts?: AIGenerateOptions): Promise<AIMediaAttachment[]>;
  /** 异步生成（music/video）——通过 onProgress 报告进度 */
  generateAsync?(
    prompt: string,
    opts?: AIGenerateOptions,
    onProgress?: (progress: number, message?: string) => void,
  ): Promise<AIMediaAttachment[]>;
}

/** 图像结果 → 媒体附件（b64 转 dataURL，按 magic bytes 嗅探真实 MIME） */
function imageToAttachment(r: { url?: string; b64?: string }): AIMediaAttachment {
  if (r.url) return { kind: 'image', url: r.url };
  if (r.b64) {
    const mime = r.b64.startsWith('/9j/')
      ? 'image/jpeg'
      : r.b64.startsWith('iVBOR')
        ? 'image/png'
        : 'image/png';
    return { kind: 'image', url: `data:${mime};base64,${r.b64}` };
  }
  throw new ValidationError('图像生成无结果');
}

/** 语音结果（Buffer）→ dataURL 媒体附件 */
function voiceToAttachment(r: { audio: Buffer; format: string }): AIMediaAttachment {
  const mime = r.format === 'wav' ? 'audio/wav' : r.format === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
  return { kind: 'audio', url: `data:${mime};base64,${r.audio.toString('base64')}` };
}

/** 按模态 + 配置创建生成器 */
export function createGenerator(modality: AIModality, config: AIProviderConfig): ModalityGenerator {
  switch (modality) {
    case 'image': {
      const p =
        config.provider === 'seedream'
          ? new SeedreamProvider(config)
          : config.provider === 'echo'
            ? new EchoImageProvider(config)
            : new OpenAIImageProvider(config);
      return {
        isAsync: false,
        generateSync: async (pr, o) => [imageToAttachment(await p.generateImage(pr, o))],
      };
    }
    case 'voice': {
      const p =
        config.provider === 'azure_tts'
          ? new AzureTTSProvider(config)
          : config.provider === 'fish_audio'
            ? new FishAudioProvider(config)
            : new OpenAITTSProvider(config);
      return {
        isAsync: false,
        generateSync: async (pr, o) => [voiceToAttachment(await p.generateVoice(pr, o))],
      };
    }
    case 'music': {
      const p: AsyncGenerator = new SunoProvider(config);
      return { isAsync: true, generateAsync: (pr, o, cb) => p.generate(pr, o, cb) };
    }
    case 'video': {
      const p: AsyncGenerator = new SeedanceProvider(config);
      return { isAsync: true, generateAsync: (pr, o, cb) => p.generate(pr, o, cb) };
    }
    default:
      throw new ValidationError(`暂不支持的生成模态：${modality}`);
  }
}
