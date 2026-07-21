// 星工坊 (Stellar Workshop) - 图片/音频工具类型定义
// 统一管理所有工具的 TypeScript 接口与类型别名

// ============================================================
// Image Types
// ============================================================

/** 图片工具子类型 */
export type ImageToolType = 'crop' | 'filter' | 'canvas' | 'ai';

/** 裁剪预设比例 */
export type CropPreset = 'free' | '16:9' | '4:3' | '1:1' | '9:16' | '3:4';

/** 裁剪设置 */
export interface CropSettings {
  /** 预设比例 */
  preset: CropPreset;
  /** 裁剪区域左上角 X 坐标 (px) */
  x: number;
  /** 裁剪区域左上角 Y 坐标 (px) */
  y: number;
  /** 裁剪区域宽度 (px) */
  width: number;
  /** 裁剪区域高度 (px) */
  height: number;
}

/** 滤镜预设类型 */
export type FilterPreset =
  | 'none'
  | 'warm'
  | 'cool'
  | 'vintage'
  | 'grayscale'
  | 'sepia'
  | 'sharpen';

/** 滤镜设置 */
export interface FilterSettings {
  /** 亮度 (-100 ~ 100, 默认 0) */
  brightness: number;
  /** 对比度 (-100 ~ 100, 默认 0) */
  contrast: number;
  /** 饱和度 (-100 ~ 100, 默认 0) */
  saturation: number;
  /** 色相 (-180 ~ 180, 默认 0) */
  hue: number;
  /** 模糊 (0 ~ 100, 默认 0) */
  blur: number;
  /** 滤镜预设 */
  preset: FilterPreset;
}

/** 旋转/翻转类型 */
export type RotateType = '90' | '180' | '270' | 'flipH' | 'flipV';

/** 画布工具类型 */
export type CanvasTool =
  | 'brush'
  | 'eraser'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'fill'
  | 'eyedropper';

/** 画布图层 */
export interface CanvasLayer {
  /** 图层唯一 ID */
  id: string;
  /** 图层名称 */
  name: string;
  /** 是否可见 */
  visible: boolean;
  /** 不透明度 (0 ~ 1) */
  opacity: number;
}

/** AI 图片操作类型 */
export type AIImageOperation =
  | 'remove-bg'
  | 'inpaint'
  | 'super-resolution'
  | 'style-transfer';

// ============================================================
// Audio Types
// ============================================================

/** 音频工具子类型 */
export type AudioToolType = 'waveform' | 'effects' | 'studio' | 'ai';

/** 音频效果设置 */
export interface AudioEffectsSettings {
  /** 音高偏移 (半音, -12 ~ 12) */
  pitch: number;
  /** 播放速度 (0.25 ~ 4.0, 默认 1.0) */
  speed: number;
  /** 音量增益 (dB, -60 ~ 24) */
  volume: number;
  /** 淡入时长 (秒) */
  fadeIn: number;
  /** 淡出时长 (秒) */
  fadeOut: number;
  /** 是否保持原始音高 (变速时) */
  preservePitch: boolean;
}

/** 音频文件格式 */
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac';

/** 音乐乐器类型 */
export type MusicInstrument =
  | 'piano'
  | 'guitar'
  | 'bass'
  | 'drums'
  | 'strings'
  | 'synth';

/** 音乐轨道 */
export interface MusicTrack {
  /** 轨道唯一 ID */
  id: string;
  /** 轨道名称 */
  name: string;
  /** 乐器类型 */
  instrument: MusicInstrument;
  /** 是否静音 */
  muted: boolean;
  /** 是否独奏 */
  solo: boolean;
  /** MIDI 音符列表 */
  notes: MIDINote[];
}

/** MIDI 音符 */
export interface MIDINote {
  /** 起始时间 (秒) */
  time: number;
  /** 持续时间 (秒) */
  duration: number;
  /** MIDI 音符号 (0-127) */
  midi: number;
  /** 力度 (0-127) */
  velocity: number;
}

/** AI 音频工作室操作类型 */
export type AIStudioOperation = 'denoise' | 'music-gen' | 'sfx-gen';

/** 音乐生成参数 */
export interface MusicGenParams {
  /** 风格 (如 "jazz", "electronic", "orchestral") */
  style: string;
  /** 情绪 (如 "happy", "sad", "epic") */
  mood: string;
  /** 时长 (秒) */
  duration: number;
  /** 速度 (BPM) */
  tempo: number;
}

/** 音效生成参数 */
export interface SfxGenParams {
  /** 音效描述 */
  description: string;
  /** 时长 (秒) */
  duration: number;
}

// ============================================================
// Shared Types
// ============================================================

/** 工具标签页 (顶层分类) */
export type ToolTab = 'image' | 'audio';

/** 工具导航树节点 */
export interface ToolNavItem {
  /** 节点唯一 ID */
  id: string;
  /** 显示标签 */
  label: string;
  /** Lucide 图标名称 */
  icon: string;
  /** 路由路径 */
  path: string;
  /** 子节点 (可选, 用于分类目录) */
  children?: ToolNavItem[];
}

/** 文件上传结果 */
export interface UploadResult {
  /** 文件存储键 */
  fileKey: string;
  /** 原始文件名 */
  fileName: string;
  /** 文件大小 (bytes) */
  size: number;
  /** MIME 类型 */
  mime: string;
}

/** 处理结果 */
export interface ProcessResult {
  /** 是否成功 */
  success: boolean;
  /** 文件存储键 */
  fileKey: string;
  /** 下载地址 */
  downloadUrl: string;
}
