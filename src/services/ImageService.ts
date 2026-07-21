// 图片处理服务 - Sharp库调用/裁剪/格式转换/批量处理/滤镜/旋转/水印
// 提供图片裁剪、格式转换、缩放、元数据获取等功能

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { NotFoundError, ValidationError, InternalError } from '@/lib/errors';
import { UPLOAD_DIR, EXPORT_DIR } from '@/lib/config';
import { generateId } from '@/lib/utils';
import type { FilterSettings, RotateType } from '@/types/tools';

/** 图片裁剪参数 */
export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 图片元数据 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  channels: number;
}

/** 批量处理操作项 */
export interface BatchOperation {
  type: 'crop' | 'convert' | 'resize';
  params: Record<string, number | string>;
}

/** 水印配置 */
export interface WatermarkOptions {
  /** 字体大小 (px) */
  fontSize: number;
  /** 文字颜色 (CSS color string) */
  color: string;
  /** 位置: topLeft | topRight | bottomLeft | bottomRight | center */
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';
  /** 不透明度 (0 ~ 1) */
  opacity: number;
}

/** 图片服务类 */
export class ImageService {
  /** 滤镜预设参数映射 */
  private static readonly FILTER_PRESET_PARAMS: Record<FilterSettings['preset'], Partial<FilterSettings>> = {
    none: {},
    warm: { brightness: 8, saturation: 15, hue: 5 },
    cool: { brightness: 0, saturation: -10, hue: -15 },
    vintage: { saturation: -40, hue: 3, contrast: 10 },
    grayscale: { saturation: -100 },
    sepia: { saturation: -60, hue: 25, contrast: 5 },
    sharpen: { brightness: 0, contrast: 15 },
  };

  /**
   * 解析 fileKey 为绝对文件路径
   * @param fileKey 文件键 (相对于 UPLOAD_DIR 的路径)
   * @returns 绝对文件路径
   */
  private resolveFilePath(fileKey: string): string {
    const normalized = fileKey.replace(/^\/+/, '').replace(/\\/g, '/');
    const fullPath = path.join(UPLOAD_DIR, normalized);
    return fullPath;
  }

  /**
   * 构建处理后的输出路径
   * @param fileKey 原始文件键
   * @param suffix 处理后缀
   * @returns 绝对输出路径
   */
  private buildOutputPath(fileKey: string, suffix: string): string {
    const parsed = path.parse(fileKey);
    const dateDir = path.dirname(fileKey);
    const outputName = `${parsed.name}_${suffix}${parsed.ext}`;
    const outputDir = path.join(EXPORT_DIR, dateDir);
    return path.join(outputDir, outputName);
  }

  /** 确保文件存在 */
  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundError('图片文件');
    }
  }

  /** 确保输出目录存在 */
  private async ensureDirExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  // ============================================================
  // Existing Methods (unchanged signatures, kept for compatibility)
  // ============================================================

  /**
   * 图片裁剪（指定区域裁剪）
   * @param inputPath 输入图片路径
   * @param outputPath 输出图片路径
   * @param cropParams 裁剪参数（x/y/width/height）
   * @returns 输出文件路径
   */
  async cropImage(inputPath: string, outputPath: string, cropParams: CropParams): Promise<string> {
    // 校验输入文件存在
    await this.ensureFileExists(inputPath);

    // 确保输出目录存在
    await this.ensureDirExists(outputPath);

    try {
      await sharp(inputPath)
        .extract({
          left: Math.round(cropParams.x),
          top: Math.round(cropParams.y),
          width: Math.round(cropParams.width),
          height: Math.round(cropParams.height),
        })
        .toFile(outputPath);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '裁剪失败';
      throw new InternalError('图片裁剪失败', errMsg);
    }

    return outputPath;
  }

  /**
   * 图片格式转换（PNG/JPG/WEBP互转）
   * @param inputPath 输入图片路径
   * @param outputPath 输出图片路径
   * @param format 目标格式（png/jpg/webp）
   * @param quality 质量（1-100，仅jpg/webp有效）
   * @returns 输出文件路径
   */
  async convertFormat(inputPath: string, outputPath: string, format: 'png' | 'jpg' | 'webp', quality?: number): Promise<string> {
    await this.ensureFileExists(inputPath);
    await this.ensureDirExists(outputPath);

    try {
      let pipeline = sharp(inputPath);

      // 根据目标格式设置输出选项
      switch (format) {
        case 'png':
          pipeline = pipeline.png({ compressionLevel: 6 });
          break;
        case 'jpg':
          pipeline = pipeline.jpeg({ quality: quality || 80 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: quality || 80 });
          break;
        default:
          throw new ValidationError(`不支持的目标格式: ${format}`);
      }

      await pipeline.toFile(outputPath);
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      const errMsg = e instanceof Error ? e.message : '格式转换失败';
      throw new InternalError('图片格式转换失败', errMsg);
    }

    return outputPath;
  }

  /**
   * 批量图片处理（裁剪+格式转换组合）
   * @param inputPaths 输入图片路径列表
   * @param outputDir 输出目录
   * @param operations 操作列表
   * @returns 输出文件路径列表
   */
  async batchProcess(inputPaths: string[], outputDir: string, operations: BatchOperation[]): Promise<string[]> {
    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });

    const outputPaths: string[] = [];

    for (let i = 0; i < inputPaths.length; i++) {
      const inputPath = inputPaths[i];
      if (!inputPath) continue;
      const inputExt = path.extname(inputPath);
      let currentPath = inputPath;
      let filename = `processed_${i}`;

      for (const op of operations) {
        const tempPath = path.join(outputDir, `${filename}_temp${inputExt}`);

        switch (op.type) {
          case 'crop':
            await this.cropImage(currentPath, tempPath, {
              x: Number(op.params.x),
              y: Number(op.params.y),
              width: Number(op.params.width),
              height: Number(op.params.height),
            });
            currentPath = tempPath;
            break;
          case 'convert':
            const format = String(op.params.format) as 'png' | 'jpg' | 'webp';
            const quality = op.params.quality ? Number(op.params.quality) : undefined;
            const convertExt = `.${format}`;
            const convertPath = path.join(outputDir, `${filename}${convertExt}`);
            await this.convertFormat(currentPath, convertPath, format, quality);
            currentPath = convertPath;
            filename = filename; // 保持文件名不变
            break;
          case 'resize':
            await this.resizeImage(currentPath, tempPath, Number(op.params.width), Number(op.params.height));
            currentPath = tempPath;
            break;
        }
      }

      // 最终输出文件路径
      const finalExt = path.extname(currentPath);
      const finalPath = path.join(outputDir, `${filename}${finalExt}`);

      // 如果最终文件不在目标位置，移动它
      if (currentPath !== finalPath) {
        await fs.copyFile(currentPath, finalPath);
      }

      outputPaths.push(finalPath);
    }

    return outputPaths;
  }

  /**
   * 缩放图片
   * @param inputPath 输入图片路径
   * @param outputPath 输出图片路径
   * @param width 目标宽度
   * @param height 目标高度
   * @returns 输出文件路径
   */
  async resizeImage(inputPath: string, outputPath: string, width: number, height: number): Promise<string> {
    await this.ensureFileExists(inputPath);
    await this.ensureDirExists(outputPath);

    try {
      await sharp(inputPath)
        .resize(Math.round(width), Math.round(height), {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFile(outputPath);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '缩放失败';
      throw new InternalError('图片缩放失败', errMsg);
    }

    return outputPath;
  }

  /**
   * 获取图片元数据
   * @param inputPath 图片路径
   * @returns 图片元数据
   */
  async getImageMetadata(inputPath: string): Promise<ImageMetadata> {
    await this.ensureFileExists(inputPath);

    try {
      const metadata = await sharp(inputPath).metadata();
      const stats = await fs.stat(inputPath);

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: stats.size,
        channels: metadata.channels || 0,
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '获取元数据失败';
      throw new InternalError('获取图片元数据失败', errMsg);
    }
  }

  // ============================================================
  // New Methods — 滤镜 / 旋转 / 水印
  // ============================================================

  /**
   * 应用滤镜效果 (亮度/对比度/饱和度/色相/模糊 + 预设)
   * @param fileKey 输入文件键
   * @param settings 滤镜参数
   * @returns 处理后文件的 fileKey
   */
  async applyFilter(fileKey: string, settings: FilterSettings): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    const suffix = `filtered_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);

    // 合并预设默认值与用户设定
    const presetDefaults = ImageService.FILTER_PRESET_PARAMS[settings.preset];
    const brightness = ((settings.brightness ?? 0) + (presetDefaults.brightness ?? 0)) / 100;
    const saturation = ((settings.saturation ?? 0) + (presetDefaults.saturation ?? 0)) / 100;
    const hue = ((settings.hue ?? 0) + (presetDefaults.hue ?? 0));
    // contrast via linear: 0 is unchanged, positive increases, negative decreases
    const contrast = ((settings.contrast ?? 0) + (presetDefaults.contrast ?? 0)) / 100;

    try {
      let pipeline = sharp(inputPath);

      // 应用 modulate (brightness/1, saturation/1, hue/0)
      pipeline = pipeline.modulate({
        brightness: 1 + brightness,
        saturation: 1 + saturation,
        hue,
      });

      // 应用线性对比度 (multiplier, offset)
      if (contrast !== 0) {
        const contrastMultiplier = 1 + contrast;
        const contrastOffset = -(128 * contrast);
        pipeline = pipeline.linear(contrastMultiplier, contrastOffset);
      }

      // 应用模糊
      const blurSigma = (settings.blur ?? 0) / 100 * 5; // 0-100 -> 0-5 sigma
      if (blurSigma > 0) {
        pipeline = pipeline.blur(blurSigma);
      }

      // 处理预设特效
      if (settings.preset === 'grayscale') {
        pipeline = pipeline.grayscale();
      }

      await pipeline.toFile(outputPath);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '滤镜处理失败';
      throw new InternalError('图片滤镜处理失败', errMsg);
    }

    // 返回输出文件的 fileKey (相对路径)
    const parsed = path.parse(fileKey);
    const relativeKey = path.join(path.dirname(fileKey), `${parsed.name}_${suffix}${parsed.ext}`).replace(/\\/g, '/');
    return relativeKey;
  }

  /**
   * 旋转或翻转图片
   * @param fileKey 输入文件键
   * @param type 旋转类型 (90/180/270/flipH/flipV)
   * @returns 处理后文件的 fileKey
   */
  async rotateImage(fileKey: string, type: RotateType): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    const suffix = `rotated_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);

    try {
      let pipeline = sharp(inputPath);

      switch (type) {
        case '90':
          pipeline = pipeline.rotate(90);
          break;
        case '180':
          pipeline = pipeline.rotate(180);
          break;
        case '270':
          pipeline = pipeline.rotate(270);
          break;
        case 'flipH':
          pipeline = pipeline.flop(); // 水平翻转
          break;
        case 'flipV':
          pipeline = pipeline.flip(); // 垂直翻转
          break;
        default:
          throw new ValidationError(`不支持的旋转类型: ${String(type)}`);
      }

      await pipeline.toFile(outputPath);
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      const errMsg = e instanceof Error ? e.message : '旋转/翻转失败';
      throw new InternalError('图片旋转/翻转失败', errMsg);
    }

    const parsed = path.parse(fileKey);
    const relativeKey = path.join(path.dirname(fileKey), `${parsed.name}_${suffix}${parsed.ext}`).replace(/\\/g, '/');
    return relativeKey;
  }

  /**
   * 添加文字水印 (SVG overlay)
   * @param fileKey 输入文件键
   * @param text 水印文字
   * @param opts 水印选项 (fontSize, color, position, opacity)
   * @returns 处理后文件的 fileKey
   */
  async addWatermark(
    fileKey: string,
    text: string,
    opts: WatermarkOptions,
  ): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    const suffix = `watermark_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);

    try {
      // 获取原图尺寸
      const metadata = await sharp(inputPath).metadata();
      const imgWidth = metadata.width || 800;
      const imgHeight = metadata.height || 600;

      // 计算水印位置
      const textWidth = opts.fontSize * text.length * 0.6;
      const textHeight = opts.fontSize * 1.2;
      const padding = 20;

      let x: number;
      let y: number;

      switch (opts.position) {
        case 'topLeft':
          x = padding;
          y = padding + opts.fontSize;
          break;
        case 'topRight':
          x = imgWidth - textWidth - padding;
          y = padding + opts.fontSize;
          break;
        case 'bottomLeft':
          x = padding;
          y = imgHeight - padding;
          break;
        case 'bottomRight':
          x = imgWidth - textWidth - padding;
          y = imgHeight - padding;
          break;
        case 'center':
        default:
          x = (imgWidth - textWidth) / 2;
          y = imgHeight / 2 + opts.fontSize / 3;
          break;
      }

      // 构建 SVG 水印 overlay
      const svgText = Buffer.from(`
        <svg width="${imgWidth}" height="${imgHeight}">
          <text
            x="${x}"
            y="${y}"
            font-size="${opts.fontSize}"
            fill="${opts.color}"
            opacity="${opts.opacity}"
            font-family="sans-serif"
          >${text}</text>
        </svg>
      `);

      await sharp(inputPath)
        .composite([
          { input: svgText, top: 0, left: 0 },
        ])
        .toFile(outputPath);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : '添加水印失败';
      throw new InternalError('图片添加水印失败', errMsg);
    }

    const parsed = path.parse(fileKey);
    const relativeKey = path.join(path.dirname(fileKey), `${parsed.name}_${suffix}${parsed.ext}`).replace(/\\/g, '/');
    return relativeKey;
  }
}

/** 导出图片服务单例 */
export const imageService = new ImageService();
