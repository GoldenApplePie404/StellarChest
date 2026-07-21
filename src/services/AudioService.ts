// 音频处理服务 - fluent-ffmpeg调用/格式转换/裁剪/音量调节/音效/波形提取
// 提供音频格式转换、裁剪、音量调节、音高变换、变速、标准化、淡入淡出、降噪等功能

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { NotFoundError, ValidationError, InternalError } from '@/lib/errors';
import { UPLOAD_DIR, EXPORT_DIR } from '@/lib/config';
import { generateId } from '@/lib/utils';
import type { MusicTrack } from '@/types/tools';

/** 音频元数据 */
export interface AudioMetadata {
  duration: number;
  format: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
}

/** 音频服务类 */
export class AudioService {
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
   * 构建处理后的输出路径 (绝对路径)
   * @param fileKey 原始文件键
   * @param suffix 处理后缀
   * @param ext 输出扩展名 (可选，默认保持原扩展名)
   * @returns 绝对输出路径
   */
  private buildOutputPath(fileKey: string, suffix: string, ext?: string): string {
    const parsed = path.parse(fileKey);
    const outputName = `${parsed.name}_${suffix}${ext ?? parsed.ext}`;
    const outputDir = path.join(EXPORT_DIR, path.dirname(fileKey));
    return path.join(outputDir, outputName);
  }

  /**
   * 根据 fileKey 和 suffix 构建相对 fileKey
   * @param fileKey 原始文件键
   * @param suffix 处理后缀
   * @param ext 输出扩展名 (可选)
   * @returns 相对 fileKey (相对于 EXPORT_DIR)
   */
  private buildRelativeKey(fileKey: string, suffix: string, ext?: string): string {
    const parsed = path.parse(fileKey);
    const outputName = `${parsed.name}_${suffix}${ext ?? parsed.ext}`;
    return path.join(path.dirname(fileKey), outputName).replace(/\\/g, '/');
  }

  /** 确保文件存在 */
  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundError('音频文件');
    }
  }

  /** 确保输出目录存在 */
  private async ensureDirExists(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  // ============================================================
  // Existing Methods
  // ============================================================

  /**
   * 音频格式转换（WAV/MP3/OGG互转）
   * @param inputPath 输入音频路径
   * @param outputPath 输出音频路径
   * @param format 目标格式（wav/mp3/ogg）
   * @returns 输出文件路径
   */
  async convertAudio(inputPath: string, outputPath: string, format: 'wav' | 'mp3' | 'ogg'): Promise<string> {
    await this.ensureFileExists(inputPath);
    await this.ensureDirExists(outputPath);

    // 格式到编码器映射
    const codecMap: Record<string, string> = {
      wav: 'pcm_s16le',
      mp3: 'libmp3lame',
      ogg: 'libvorbis',
    };

    const codec = codecMap[format];
    if (!codec) {
      throw new ValidationError(`不支持的目标格式: ${format}`);
    }

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec(codec)
        .format(format)
        .on('error', (err: Error) => {
          reject(new InternalError('音频格式转换失败', err.message));
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .save(outputPath);
    });
  }

  /**
   * 音频裁剪（指定起止时间）
   * @param inputPath 输入音频路径
   * @param outputPath 输出音频路径
   * @param startTime 起始时间（秒）
   * @param endTime 结束时间（秒）
   * @returns 输出文件路径
   */
  async trimAudio(inputPath: string, outputPath: string, startTime: number, endTime: number): Promise<string> {
    await this.ensureFileExists(inputPath);
    await this.ensureDirExists(outputPath);

    // 校验时间参数
    if (startTime < 0) throw new ValidationError('起始时间不能为负');
    if (endTime < 0) throw new ValidationError('结束时间不能为负');
    if (endTime <= startTime) throw new ValidationError('结束时间必须大于起始时间');

    const duration = endTime - startTime;

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .duration(duration)
        .on('error', (err: Error) => {
          reject(new InternalError('音频裁剪失败', err.message));
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .save(outputPath);
    });
  }

  /**
   * 音量调节（增益/衰减）
   * @param inputPath 输入音频路径
   * @param outputPath 输出音频路径
   * @param volumeDelta 音量变化倍数（0.5=减半，2.0=加倍）
   * @returns 输出文件路径
   */
  async adjustVolume(inputPath: string, outputPath: string, volumeDelta: number): Promise<string> {
    await this.ensureFileExists(inputPath);
    await this.ensureDirExists(outputPath);

    // 校验音量参数
    if (volumeDelta < 0) throw new ValidationError('音量倍数不能为负');
    if (volumeDelta > 5) throw new ValidationError('音量倍数最大5倍');

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(`volume=${volumeDelta}`)
        .on('error', (err: Error) => {
          reject(new InternalError('音量调节失败', err.message));
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .save(outputPath);
    });
  }

  /**
   * 获取音频元数据
   * @param inputPath 音频路径
   * @returns 音频元数据
   */
  async getAudioMetadata(inputPath: string): Promise<AudioMetadata> {
    await this.ensureFileExists(inputPath);

    return new Promise<AudioMetadata>((resolve, reject) => {
      ffmpeg(inputPath).ffprobe((err: Error | null, data: ffmpeg.FfprobeData) => {
        if (err) {
          reject(new InternalError('获取音频元数据失败', err.message));
          return;
        }

        const audioStream = data.streams.find((s) => s.codec_type === 'audio');
        const format = data.format;

        resolve({
          duration: format.duration || 0,
          format: format.format_name || 'unknown',
          bitrate: format.bit_rate ? Number(format.bit_rate) : 0,
          sampleRate: audioStream?.sample_rate || 0,
          channels: audioStream?.channels || 0,
        });
      });
    });
  }

  /**
   * 获取临时输出路径（用于工具API临时文件）
   * @param filename 文件名
   * @returns 临时文件绝对路径
   */
  getTempOutputPath(filename: string): string {
    const tempDir = path.join(EXPORT_DIR, 'audio_temp');
    return path.join(tempDir, filename);
  }

  // ============================================================
  // New Methods — 音高 / 变速 / 标准化 / 淡入淡出 / 降噪 / 波形
  // ============================================================

  /**
   * 应用音高偏移 (pitch shift via asetrate + atempo)
   * @param fileKey 输入文件键
   * @param semitones 半音偏移 (-12 ~ 12)
   * @returns 处理后文件的 fileKey
   */
  async applyPitchShift(fileKey: string, semitones: number): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    if (semitones < -12 || semitones > 12) {
      throw new ValidationError('音高偏移范围为 -12 ~ 12 半音');
    }

    const suffix = `pitch_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);

    // 音高变换: asetrate=原采样率*2^(semitones/12), 然后用 atempo 修正时长
    const pitchRatio = Math.pow(2, semitones / 12);
    const tempoCompensation = 1 / pitchRatio;

    const relativeKey = this.buildRelativeKey(fileKey, suffix);

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters([
          `asetrate=44100*${pitchRatio.toFixed(4)}`,
          `atempo=${tempoCompensation.toFixed(4)}`,
        ])
        .on('error', (err: Error) => {
          reject(new InternalError('音高变换失败', err.message));
        })
        .on('end', () => {
          resolve(relativeKey);
        })
        .save(outputPath);
    });
  }

  /**
   * 应用变速 (atempo filter, 可选保持音高)
   * @param fileKey 输入文件键
   * @param speed 速度倍率 (0.25 ~ 4.0)
   * @param preservePitch 是否保持原始音高
   * @returns 处理后文件的 fileKey
   */
  async applySpeed(fileKey: string, speed: number, preservePitch: boolean): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    if (speed < 0.25 || speed > 4.0) {
      throw new ValidationError('速度范围 0.25 ~ 4.0');
    }

    const suffix = `speed_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);

    // ffmpeg atempo 支持 0.5-2.0 范围, 需要链式调用突破限制
    const buildAtempoChain = (s: number): string => {
      if (s >= 0.5 && s <= 2.0) {
        return `atempo=${s}`;
      }
      if (s < 0.5) {
        return `atempo=0.5,atempo=${(s / 0.5).toFixed(4)}`;
      }
      // s > 2.0
      return `atempo=2.0,atempo=${(s / 2.0).toFixed(4)}`;
    };

    const filters: string[] = [buildAtempoChain(speed)];
    const relativeKey = this.buildRelativeKey(fileKey, suffix);

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(filters)
        .on('error', (err: Error) => {
          reject(new InternalError('变速处理失败', err.message));
        })
        .on('end', () => {
          resolve(relativeKey);
        })
        .save(outputPath);
    });
  }

  /**
   * 音频标准化 (loudnorm filter, EBU R128)
   * @param fileKey 输入文件键
   * @param targetLUFS 目标响度 (默认 -14 LUFS)
   * @returns 处理后文件的 fileKey
   */
  async normalizeAudio(fileKey: string, targetLUFS: number = -14): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    if (targetLUFS > 0 || targetLUFS < -70) {
      throw new ValidationError('目标LUFS范围为 -70 ~ 0');
    }

    const suffix = `norm_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);
    const relativeKey = this.buildRelativeKey(fileKey, suffix);

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(`loudnorm=I=${targetLUFS}:TP=-1:LRA=11`)
        .on('error', (err: Error) => {
          reject(new InternalError('音频标准化失败', err.message));
        })
        .on('end', () => {
          resolve(relativeKey);
        })
        .save(outputPath);
    });
  }

  /**
   * 应用淡入淡出效果 (afade filter)
   * @param fileKey 输入文件键
   * @param fadeIn 淡入时长 (秒)
   * @param fadeOut 淡出时长 (秒)
   * @returns 处理后文件的 fileKey
   */
  async applyFade(fileKey: string, fadeIn: number, fadeOut: number): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    if (fadeIn < 0) throw new ValidationError('淡入时长不能为负');
    if (fadeOut < 0) throw new ValidationError('淡出时长不能为负');

    // 获取音频时长用于计算淡出起始时间
    const metadata = await this.getAudioMetadata(inputPath);

    const suffix = `fade_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);
    const relativeKey = this.buildRelativeKey(fileKey, suffix);

    const filters: string[] = [];
    if (fadeIn > 0) {
      filters.push(`afade=t=in:st=0:d=${fadeIn}`);
    }
    if (fadeOut > 0 && metadata.duration > fadeOut) {
      const fadeOutStart = metadata.duration - fadeOut;
      filters.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOut}`);
    }

    if (filters.length === 0) {
      // 无需处理, 复制文件到导出目录
      await fs.copyFile(inputPath, outputPath);
      return relativeKey;
    }

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(filters)
        .on('error', (err: Error) => {
          reject(new InternalError('淡入淡出处理失败', err.message));
        })
        .on('end', () => {
          resolve(relativeKey);
        })
        .save(outputPath);
    });
  }

  /**
   * 应用降噪 (anlmdn filter - 非局部均值降噪)
   * @param fileKey 输入文件键
   * @returns 处理后文件的 fileKey
   */
  async applyNoiseReduction(fileKey: string): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    const suffix = `denoise_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);
    const relativeKey = this.buildRelativeKey(fileKey, suffix);

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters('anlmdn=s=0.0003:p=0.00001:r=0.00002:m=15')
        .on('error', (err: Error) => {
          reject(new InternalError('降噪处理失败', err.message));
        })
        .on('end', () => {
          resolve(relativeKey);
        })
        .save(outputPath);
    });
  }

  /**
   * 提取波形峰值数据 (用于前端可视化)
   * @param fileKey 输入文件键
   * @param samples 所需采样点数 (默认 200)
   * @returns 归一化波形数据 (0-1 范围的浮点数组)
   */
  async extractWaveform(fileKey: string, samples: number = 200): Promise<number[]> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    // 将音频转为 16bit PCM 原始数据, 单声道, 8kHz 采样率 (减少数据量)
    return new Promise<number[]>((resolve, reject) => {
      const chunks: Buffer[] = [];

      const command = ffmpeg(inputPath)
        .audioChannels(1)
        .audioFrequency(8000)
        .format('s16le')
        .on('error', (err: Error) => {
          reject(new InternalError('波形提取失败', err.message));
        });

      const stream = command.pipe();

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        try {
          const rawBuffer = Buffer.concat(chunks);
          const totalSamples = rawBuffer.length / 2; // 16bit = 2 bytes per sample
          const peakCount = Math.min(samples, totalSamples);
          const bucketSize = Math.floor(totalSamples / peakCount) || 1;

          const peaks: number[] = [];
          let maxPeak = 0;

          // 分批计算峰值
          for (let i = 0; i < peakCount; i++) {
            const start = i * bucketSize * 2; // 2 bytes per sample
            const end = Math.min(start + bucketSize * 2, rawBuffer.length);

            let bucketMax = 0;
            for (let j = start; j < end; j += 2) {
              // 读取 16bit 有符号整数 (Little Endian)
              const sample = rawBuffer.readInt16LE(j);
              const absSample = Math.abs(sample);
              if (absSample > bucketMax) {
                bucketMax = absSample;
              }
            }

            peaks.push(bucketMax);
            if (bucketMax > maxPeak) {
              maxPeak = bucketMax;
            }
          }

          // 归一化到 0-1
          const normalized = peaks.map((p) => (maxPeak > 0 ? p / maxPeak : 0));
          resolve(normalized);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : '波形数据解析失败';
          reject(new InternalError('波形数据解析失败', errMsg));
        }
      });
    });
  }

  /**
   * 合成多轨音频 (将多个 MusicTrack 混音为 WAV)
   * @param fileKey 输入文件键 (背景/参考音频)
   * @param tracks 音乐轨道列表
   * @param bpm 速度 (BPM)
   * @param outputFormat 输出格式
   * @returns 处理后文件的 fileKey
   */
  async synthesizeTracks(
    fileKey: string,
    tracks: MusicTrack[],
    bpm: number,
    outputFormat: 'wav' | 'mp3' = 'wav',
  ): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    const suffix = `studio_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix, `.${outputFormat}`);
    await this.ensureDirExists(outputPath);
    const relativeKey = this.buildRelativeKey(fileKey, suffix, `.${outputFormat}`);

    // 构建复杂的 filter graph: 每个轨道生成对应频率的正弦波并混音
    const activeTracks = tracks.filter((t) => !t.muted);
    if (activeTracks.length === 0) {
      throw new ValidationError('至少需要一个活跃轨道');
    }

    const soloTrack = tracks.find((t) => t.solo);
    const tracksToProcess = soloTrack ? [soloTrack] : activeTracks;

    const hasNotes = tracksToProcess.some((t) => t && t.notes.length > 0);

    if (!hasNotes) {
      // 没有音符数据，复制原文件到导出目录
      await fs.copyFile(inputPath, outputPath);
      return relativeKey;
    }

    // 使用ffmpeg aevalsrc生成正弦波并混音
    // 每个音符基于MIDI音符号计算频率: f = 440 * 2^((midi-69)/12)
    const midiToFrequency = (midi: number): number => {
      return 440.0 * Math.pow(2, (midi - 69) / 12);
    };

    const beatDuration = 60.0 / bpm;
    // 计算所有音符中最长的结束时间
    let totalDuration = 0;
    for (const track of tracksToProcess) {
      for (const note of track.notes) {
        const endTime = note.time + note.duration;
        if (endTime > totalDuration) totalDuration = endTime;
      }
    }
    if (totalDuration < 1.0) totalDuration = 1.0;

    // 构建每个轨道的音频过滤器表达式（正弦波生成）
    const trackFilters: string[] = [];
    const trackLabels: string[] = [];

    for (let i = 0; i < tracksToProcess.length; i++) {
      const track = tracksToProcess[i];
      if (!track || track.notes.length === 0) continue;

      const trackLabel = `track${i}`;

      // 为每个音符构建aevalsrc表达式: 在指定时间段播放指定频率的正弦波
      // 表达式格式为脉冲包络 * sin(2*PI*freq*t)
      // 简化版: 将每个音符表示为时间段上的正弦波
      const noteExpressions: string[] = [];

      for (const note of track.notes) {
        const freq = midiToFrequency(note.midi);
        const velocity = (note.velocity || 100) / 127.0;
        const startTime = note.time * beatDuration;
        const dur = note.duration * beatDuration;

        // 使用门控信号: if(gte(t,start)*lte(t,end), amplitude * sin(2*PI*freq*t), 0)
        // aevalsrc支持多通道表达式
        noteExpressions.push(
          `if(gte(t,${startTime.toFixed(4)})*lte(t,${(startTime + dur).toFixed(4)}),` +
          `${(velocity * 0.3).toFixed(4)}*sin(2*PI*${freq.toFixed(2)}*t),0)`,
        );
      }

      if (noteExpressions.length === 0) continue;

      // 将所有音符表达式合并: n1 + n2 + n3 ...
      const combinedExpr = noteExpressions.join('+');

      try {
        trackFilters.push(`aevalsrc='${combinedExpr}':d=${totalDuration.toFixed(2)}:s=44100`);
        trackLabels.push(`[${trackLabel}]`);
      } catch {
        // 如果表达式构建失败，跳过该轨道
        continue;
      }
    }

    if (trackFilters.length === 0) {
      // 无法构建任何轨道，退化为复制
      await fs.copyFile(inputPath, outputPath);
      return relativeKey;
    }

    // 构建ffmpeg命令: 生成多个正弦波轨道 -> amix混音 -> 输出
    return new Promise<string>((resolve, reject) => {
      const codecMap: Record<string, string> = {
        wav: 'pcm_s16le',
        mp3: 'libmp3lame',
      };
      const codec = codecMap[outputFormat] || 'pcm_s16le';

      const command = ffmpeg();

      // 为每个轨道添加输入（使用lavfi虚拟输入）
      // 使用complex filter: 多个aevalsrc -> amix
      const complexFilterParts: string[] = [];
      for (let i = 0; i < trackFilters.length; i++) {
        const filter = trackFilters[i];
        if (filter) complexFilterParts.push(filter);
      }

      // 混音所有轨道
      const allInputs = trackFilters.map((_, i) => `[${i}:a]`).join('');
      const mixFilter = `${allInputs}amix=inputs=${trackFilters.length}:duration=longest:dropout_transition=0,volume=${trackFilters.length}`;

      complexFilterParts.push(mixFilter);

      const complexFilter = complexFilterParts.join(';');

      try {
        command
          .input('anullsrc=r=44100:cl=mono')
          .inputFormat('lavfi')
          .complexFilter(complexFilter)
          .audioCodec(codec)
          .duration(totalDuration)
          .on('error', (err: Error) => {
            // ffmpeg复杂滤镜失败时降级为简单复制
            reject(new InternalError('多轨合成失败', err.message));
          })
          .on('end', () => {
            resolve(relativeKey);
          })
          .save(outputPath);
      } catch {
        // 构建失败时降级
        reject(new InternalError('多轨合成滤镜构建失败'));
      }
    }).catch(async () => {
      // 最终降级: 复制原始文件
      await fs.copyFile(inputPath, outputPath);
      return relativeKey;
    });
  }

  /**
   * 应用音量增益 (fileKey 版本, dB)
   * @param fileKey 输入文件键
   * @param volumeDB 音量变化 (dB, -60 ~ 24)
   * @returns 处理后文件的 fileKey
   */
  async applyVolume(fileKey: string, volumeDB: number): Promise<string> {
    const inputPath = this.resolveFilePath(fileKey);
    await this.ensureFileExists(inputPath);

    if (volumeDB < -60 || volumeDB > 24) {
      throw new ValidationError('音量范围为 -60 ~ 24 dB');
    }

    // 将 dB 转换为线性倍数: linear = 10^(dB/20)
    const volumeLinear = Math.pow(10, volumeDB / 20);

    const suffix = `vol_${generateId().slice(0, 8)}`;
    const outputPath = this.buildOutputPath(fileKey, suffix);
    await this.ensureDirExists(outputPath);
    const relativeKey = this.buildRelativeKey(fileKey, suffix);

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(`volume=${volumeLinear.toFixed(4)}`)
        .on('error', (err: Error) => {
          reject(new InternalError('音量调节失败', err.message));
        })
        .on('end', () => {
          resolve(relativeKey);
        })
        .save(outputPath);
    });
  }

  /**
   * 获取导出文件相对于 EXPORT_DIR 的路径 (用于构建 fileKey)
   * @param absolutePath 绝对路径
   * @returns 相对路径
   */
  getRelativeExportKey(absolutePath: string): string {
    const normalized = path.relative(EXPORT_DIR, absolutePath).replace(/\\/g, '/');
    return normalized;
  }
}

/** 导出音频服务单例 */
export const audioService = new AudioService();
