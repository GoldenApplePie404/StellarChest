// 星工坊 (Stellar Workshop) - 工具常量定义
// 包含裁剪预设、滤镜、画布、音频、导航树等所有工具相关常量

import type {
  CropPreset,
  FilterPreset,
  FilterSettings,
  CanvasTool,
  AudioEffectsSettings,
  MusicInstrument,
  ToolNavItem,
} from '@/types/tools';

// ============================================================
// Image Crop Presets
// ============================================================

/** 裁剪预设配置列表 */
export const CROP_PRESETS: {
  label: string;
  value: CropPreset;
  width: number;
  height: number;
}[] = [
  { label: '自由裁剪', value: 'free', width: 0, height: 0 },
  { label: '16:9 (横屏)', value: '16:9', width: 16, height: 9 },
  { label: '4:3 (标准)', value: '4:3', width: 4, height: 3 },
  { label: '1:1 (正方形)', value: '1:1', width: 1, height: 1 },
  { label: '9:16 (竖屏)', value: '9:16', width: 9, height: 16 },
  { label: '3:4 (肖像)', value: '3:4', width: 3, height: 4 },
];

// ============================================================
// Image Filter Presets
// ============================================================

/** 滤镜预设配置列表 */
export const FILTER_PRESETS: {
  label: string;
  value: FilterPreset;
}[] = [
  { label: '无滤镜', value: 'none' },
  { label: '暖色调', value: 'warm' },
  { label: '冷色调', value: 'cool' },
  { label: '复古', value: 'vintage' },
  { label: '灰度', value: 'grayscale' },
  { label: '怀旧', value: 'sepia' },
  { label: '锐化', value: 'sharpen' },
];

/** 默认滤镜设置 */
export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  preset: 'none',
};

// ============================================================
// Canvas Tool Labels
// ============================================================

/** 画布工具中文标签映射 */
export const CANVAS_TOOL_LABELS: Record<CanvasTool, string> = {
  brush: '画笔',
  eraser: '橡皮擦',
  rect: '矩形',
  circle: '圆形',
  line: '直线',
  arrow: '箭头',
  fill: '填充',
  eyedropper: '取色器',
};

// ============================================================
// Audio Effects Defaults
// ============================================================

/** 音频效果默认设置 */
export const AUDIO_EFFECTS_DEFAULTS: AudioEffectsSettings = {
  pitch: 0,
  speed: 1.0,
  volume: 0,
  fadeIn: 0,
  fadeOut: 0,
  preservePitch: true,
};

// ============================================================
// Music Instruments
// ============================================================

/** 音乐乐器配置列表 */
export const MUSIC_INSTRUMENTS: {
  value: MusicInstrument;
  label: string;
  icon: string;
}[] = [
  { value: 'piano', label: '钢琴', icon: 'Music4' },
  { value: 'guitar', label: '吉他', icon: 'Music4' },
  { value: 'bass', label: '贝斯', icon: 'Music4' },
  { value: 'drums', label: '鼓组', icon: 'Music4' },
  { value: 'strings', label: '弦乐', icon: 'Music4' },
  { value: 'synth', label: '合成器', icon: 'Music4' },
];

// ============================================================
// BPM Presets
// ============================================================

/** BPM 预设值列表 */
export const BPM_PRESETS: number[] = [
  60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200,
];

// ============================================================
// Tool Navigation Tree
// ============================================================

/** 工具导航树 (完整结构, 匹配 PRD 导航层级) */
export const TOOL_NAV_TREE: ToolNavItem[] = [
  {
    id: 'image',
    label: '图片工具',
    icon: 'Image',
    path: '/tools/image',
    children: [
      {
        id: 'image-crop',
        label: '裁剪',
        icon: 'Crop',
        path: '/tools/image/crop',
      },
      {
        id: 'image-filter',
        label: '滤镜',
        icon: 'SlidersHorizontal',
        path: '/tools/image/filter',
      },
      {
        id: 'image-canvas',
        label: '画布编辑',
        icon: 'Paintbrush',
        path: '/tools/image/canvas',
      },
      {
        id: 'image-ai',
        label: 'AI 工具',
        icon: 'WandSparkles',
        path: '/tools/image/ai',
      },
    ],
  },
  {
    id: 'audio',
    label: '音频工具',
    icon: 'Music',
    path: '/tools/audio',
    children: [
      {
        id: 'audio-waveform',
        label: '波形编辑',
        icon: 'AudioLines',
        path: '/tools/audio/waveform',
      },
      {
        id: 'audio-effects',
        label: '音频效果',
        icon: 'Equal',
        path: '/tools/audio/effects',
      },
      {
        id: 'audio-studio',
        label: '音乐工作室',
        icon: 'Music4',
        path: '/audio-studio',
      },
      {
        id: 'audio-ai',
        label: 'AI 工具',
        icon: 'BrainCircuit',
        path: '/tools/audio/ai',
      },
    ],
  },
];
