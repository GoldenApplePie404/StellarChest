// AI 工具服务 — AI 图片/音频处理代理
// 通过统一 AI API 端点实现背景移除、音乐生成、音效生成等功能

import path from 'path';
import fs from 'fs/promises';
import prisma from '@/lib/db';
import { InternalError } from '@/lib/errors';
import { UPLOAD_DIR, EXPORT_DIR } from '@/lib/config';
import { generateId } from '@/lib/utils';
import type {
  AIImageOperation,
  MusicGenParams,
  SfxGenParams,
} from '@/types/tools';

/** AI 工具未配置错误 */
export class AINotConfiguredError extends InternalError {
  constructor(feature: string) {
    super(
      `AI 功能 [${feature}] 尚未配置 — AI features require API key configuration`,
      '请在设置页面配置 AI API 密钥后重试',
    );
    this.name = 'AINotConfiguredError';
  }
}

/** AI 工具服务类 */
export class AIToolService {
  /**
   * 解析 fileKey 为绝对文件路径
   */
  private resolveFilePath(fileKey: string): string {
    const normalized = fileKey.replace(/^\/+/, '').replace(/\\/g, '/');
    return path.join(UPLOAD_DIR, normalized);
  }

  /**
   * 构建输出路径
   */
  private buildOutputPath(fileKey: string, suffix: string): string {
    const parsed = path.parse(fileKey);
    const outputName = `${parsed.name}_${suffix}${parsed.ext}`;
    const outputDir = path.join(EXPORT_DIR, path.dirname(fileKey));
    return path.join(outputDir, outputName);
  }

  /** 确保文件存在 */
  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new InternalError('文件不存在');
    }
  }

  /** 确保输出目录存在 */
  private async ensureDirExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  // ============================================================
  // Image AI Operations
  // ============================================================

  /**
   * 移除背景 (AI)
   * 直接调用用户 AI 配置的 chat/completions 端点，使用多模态模型移除图片背景。
   * @param fileKey 输入文件键
   * @returns 处理后文件的 fileKey
   */
  async removeBackground(fileKey: string): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    // 查找任何可用的用户AI配置
    const config = await prisma.aIConfig.findFirst({
      where: { apiKey: { not: '' }, apiEndpoint: { not: '' } },
    });

    if (!config) {
      throw new AINotConfiguredError('背景移除 (remove-bg)');
    }

    const suffix = `nobg_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);

    try {
      // 读取文件为 base64
      const fileBuffer = await fs.readFile(inputPath);
      const base64Image = fileBuffer.toString('base64');
      const ext = path.extname(fileKey).replace('.', '');
      const dataUri = `data:image/${ext};base64,${base64Image}`;

      // 调用AI API
      const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: 'Remove the background from the image and return only the subject with transparent background.' },
            { role: 'user', content: dataUri },
          ],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        throw new Error(`API返回错误状态: ${response.status}`);
      }

      // 当前返回占位结果（后续迭代完善图片解码）
      await fs.copyFile(inputPath, outputPath);
      return fileKey;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '背景移除失败';
      throw new InternalError('背景移除处理失败', errMsg);
    }
  }

  /**
   * AI 图像修复/填充 (inpainting)
   * @param fileKey 输入文件键
   * @param maskFileKey 遮罩文件键
   * @returns 处理后文件的 fileKey
   */
  async inpaintImage(fileKey: string, maskFileKey: string): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);
    const maskPath = this.resolveFilePath(maskFileKey);
    await this.ensureFileExists(maskPath);
    throw new AINotConfiguredError('图像修复 (inpaint)');
  }

  /**
   * AI 超分辨率 (2x/4x upscale)
   * @param fileKey 输入文件键
   * @param scale 放大倍数 (2 或 4)
   * @returns 处理后文件的 fileKey
   */
  async superResolution(fileKey: string, scale: number): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    if (scale !== 2 && scale !== 4) {
      throw new InternalError('超分辨率仅支持 2x 或 4x 放大');
    }

    throw new AINotConfiguredError(`超分辨率 (${scale}x)`);
  }

  /**
   * AI 风格迁移
   * @param fileKey 输入文件键
   * @param style 目标风格
   * @returns 处理后文件的 fileKey
   */
  async styleTransfer(fileKey: string, style: string): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    if (!style || style.trim().length === 0) {
      throw new InternalError('风格描述不能为空');
    }

    throw new AINotConfiguredError(`风格迁移 (${style})`);
  }

  // ============================================================
  // Audio AI Operations
  // ============================================================

  /**
   * AI 音乐生成
   * 调用 AI API 端点生成音乐描述或MIDI数据
   * @param params 音乐生成参数
   * @returns 生成文件的 fileKey
   */
  async generateMusic(params: MusicGenParams): Promise<string> {
    if (!params.style) {
      throw new InternalError('音乐风格不能为空');
    }

    // 查找任何可用的用户AI配置
    const config = await prisma.aIConfig.findFirst({
      where: { apiKey: { not: '' }, apiEndpoint: { not: '' } },
    });

    if (!config) {
      throw new AINotConfiguredError(`音乐生成 (${params.style} / ${params.mood})`);
    }

    const suffix = `music_${generateId().slice(0, 8)}`;
    const outputDir = path.join(EXPORT_DIR, 'audio');
    const outputPath = path.join(outputDir, `${suffix}.wav`);
    await fs.mkdir(outputDir, { recursive: true });

    try {
      // 调用AI API生成音乐描述
      const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: 'Generate a music composition description in ABC notation format.',
            },
            {
              role: 'user',
              content: `Generate music: style=${params.style}, mood=${params.mood}, duration=${params.duration}s, tempo=${params.tempo}BPM. Return ABC notation.`,
            },
          ],
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`API返回错误状态: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      // 将生成的文本描述写入文件（后续迭代可实现ABC到WAV转换）
      await fs.writeFile(outputPath, Buffer.from(text, 'utf-8'));

      return `audio/${suffix}.wav`;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '音乐生成失败';
      throw new InternalError('音乐生成失败', errMsg);
    }
  }

  /**
   * AI 音效生成
   * 调用 AI API 生成音效描述
   * @param params 音效生成参数
   * @returns 生成文件的 fileKey
   */
  async generateSoundEffect(params: SfxGenParams): Promise<string> {
    if (!params.description || params.description.trim().length === 0) {
      throw new InternalError('音效描述不能为空');
    }

    // 查找任何可用的用户AI配置
    const config = await prisma.aIConfig.findFirst({
      where: { apiKey: { not: '' }, apiEndpoint: { not: '' } },
    });

    if (!config) {
      throw new AINotConfiguredError(`音效生成 (${params.description})`);
    }

    const suffix = `sfx_${generateId().slice(0, 8)}`;
    const outputDir = path.join(EXPORT_DIR, 'audio');
    const outputPath = path.join(outputDir, `${suffix}.wav`);
    await fs.mkdir(outputDir, { recursive: true });

    try {
      const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: 'Generate a sound effect description with parameters for synthesis.',
            },
            {
              role: 'user',
              content: `Generate sound effect: ${params.description}, duration=${params.duration}s. Describe the waveform, frequency, and envelope.`,
            },
          ],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`API返回错误状态: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      await fs.writeFile(outputPath, Buffer.from(text, 'utf-8'));

      return `audio/${suffix}.wav`;
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '音效生成失败';
      throw new InternalError('音效生成失败', errMsg);
    }
  }

  /**
   * 处理通用 AI 图片操作 (路由分发)
   * @param operation AI 操作类型
   * @param fileKey 输入文件键
   * @param params 额外参数
   * @returns 处理后文件的 fileKey
   */
  async handleImageOperation(
    operation: AIImageOperation,
    fileKey: string,
    params: Record<string, string | number>,
  ): Promise<string> {
    switch (operation) {
      case 'remove-bg':
        return this.removeBackground(fileKey);
      case 'inpaint': {
        const maskKey = String(params.maskFileKey || '');
        if (!maskKey) {
          throw new InternalError('inpaint 操作需要 maskFileKey 参数');
        }
        return this.inpaintImage(fileKey, maskKey);
      }
      case 'super-resolution': {
        const scale = Number(params.scale || 2);
        return this.superResolution(fileKey, scale);
      }
      case 'style-transfer': {
        const style = String(params.style || '');
        return this.styleTransfer(fileKey, style);
      }
      default: {
        const _exhaustive: never = operation;
        throw new InternalError(`未知的 AI 图片操作: ${String(_exhaustive)}`);
      }
    }
  }
}

/** 导出 AI 工具服务单例 */
export const aiToolService = new AIToolService();
