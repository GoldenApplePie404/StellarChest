// P3 语音合成 Provider
// 覆盖：OpenAI TTS（同步）/ Azure TTS（REST+SSML）/ Fish Audio（REST）
// 说明：三者在配置页对应 provider 分别为 tts_openai / azure_tts / fish_audio。
import OpenAI from 'openai';
import type { AIProviderConfig } from './AIProvider';
import type { AIGenerateOptions } from '@/types/ai';
import { InternalError } from '@/lib/errors';

/** 语音合成结果 */
export interface VoiceResult {
  /** 音频二进制 */
  audio: Buffer;
  /** 格式 mp3/wav/ogg */
  format: string;
}

/** 语音 Provider 接口 */
export interface VoiceProvider {
  generateVoice(text: string, opts?: AIGenerateOptions): Promise<VoiceResult>;
}

/** XML 转义（Azure SSML 需要） */
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/** OpenAI TTS（同步返回音频） */
export class OpenAITTSProvider implements VoiceProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.apiEndpoint });
    this.model = config.model;
  }

  async generateVoice(text: string, opts?: AIGenerateOptions): Promise<VoiceResult> {
    if (!text?.trim()) throw new InternalError('合成文本为空');
    const fmt = opts?.format ?? 'mp3';
    // OpenAI speech 不支持 ogg，统一回退为 mp3
    const openaiFormat = (fmt === 'ogg' ? 'mp3' : fmt) as OpenAI.Audio.SpeechCreateParams['response_format'];
    try {
      const res = await this.client.audio.speech.create({
        model: this.model,
        input: text,
        // openai SDK 的 voice 类型为联合字符串，自定义音色名用断言
        voice: (opts?.voice ?? 'alloy') as OpenAI.Audio.SpeechCreateParams['voice'],
        response_format: openaiFormat,
        speed: opts?.speed ?? 1,
      });
      const buf = Buffer.from(await res.arrayBuffer());
      return { audio: buf, format: fmt };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'TTS 调用失败';
      throw new InternalError('OpenAI 语音合成失败', msg);
    }
  }
}

/** Azure TTS（REST + SSML） */
export class AzureTTSProvider implements VoiceProvider {
  private apiKey: string;
  private region: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    const m = config.apiEndpoint.match(/https:\/\/([\w-]+)\.tts\.speech\.microsoft\.com/);
    this.region = m?.[1] ?? 'eastasia';
  }

  async generateVoice(text: string, opts?: AIGenerateOptions): Promise<VoiceResult> {
    if (!text?.trim()) throw new InternalError('合成文本为空');
    const voice = opts?.voice ?? 'zh-CN-XiaoxiaoNeural';
    const fmt = opts?.format ?? 'mp3';
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'><voice name='${voice}'>${escapeXml(text)}</voice></speak>`;
    const outputFormat = fmt === 'wav' ? 'riff-16khz-16bit-mono-pcm' : 'audio-16khz-32kbitrate-mono-mp3';
    try {
      const res = await fetch(`https://${this.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': outputFormat,
        },
        body: ssml,
      });
      if (!res.ok) throw new InternalError(`Azure TTS 失败: ${res.status} ${await res.text().catch(() => '')}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return { audio: buf, format: fmt };
    } catch (e) {
      if (e instanceof InternalError) throw e;
      const msg = e instanceof Error ? e.message : 'Azure TTS 失败';
      throw new InternalError('Azure 语音合成失败', msg);
    }
  }
}

/** Fish Audio（REST） */
export class FishAudioProvider implements VoiceProvider {
  private endpoint: string;
  private apiKey: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.endpoint = config.apiEndpoint.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async generateVoice(text: string, opts?: AIGenerateOptions): Promise<VoiceResult> {
    if (!text?.trim()) throw new InternalError('合成文本为空');
    const fmt = opts?.format ?? 'mp3';
    try {
      const res = await fetch(`${this.endpoint}/tts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          reference_id: opts?.voice ?? this.model,
          format: fmt,
          speed: opts?.speed ?? 1,
        }),
      });
      if (!res.ok) throw new InternalError(`Fish Audio 失败: ${res.status} ${await res.text().catch(() => '')}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return { audio: buf, format: fmt };
    } catch (e) {
      if (e instanceof InternalError) throw e;
      const msg = e instanceof Error ? e.message : 'Fish Audio 失败';
      throw new InternalError('Fish Audio 语音合成失败', msg);
    }
  }
}
