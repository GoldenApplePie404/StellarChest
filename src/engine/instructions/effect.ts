// 屏幕特效类指令 - @shake/@flash/@filter/@text_color

import type { InstructionHandler, InstructionCategory } from '@/types/engine';

/** @shake指令 - 震屏特效 */
const shakeHandler: InstructionHandler = {
  name: 'shake',
  category: 'effect' as InstructionCategory,
  format: '@shake [strength=强度] [duration=毫秒]',
  description: '屏幕震动特效',
  pattern: /^@shake(?:\s+strength=(\d+))?(?:\s+duration=(\d+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@shake(?:\s+strength=(\d+))?(?:\s+duration=(\d+))?/) || [];
    return {
      strength: match[1] ? parseInt(match[1], 10) : 10,
      duration: match[2] ? parseInt(match[2], 10) : 500,
    };
  },
  execute(ctx): void {
    const strength = ctx.params['strength'] as number || 10;
    const duration = ctx.params['duration'] as number || 500;
    ctx.layerManager.shakeScreen(strength, duration);
  },
};

/** @flash指令 - 闪屏特效 */
const flashHandler: InstructionHandler = {
  name: 'flash',
  category: 'effect' as InstructionCategory,
  format: '@flash [color=颜色] [duration=毫秒]',
  description: '屏幕闪光特效',
  pattern: /^@flash(?:\s+color=(\S+))?(?:\s+duration=(\d+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@flash(?:\s+color=(\S+))?(?:\s+duration=(\d+))?/) || [];
    return {
      color: match[1] || '#FFFFFF',
      duration: match[2] ? parseInt(match[2], 10) : 300,
    };
  },
  execute(ctx): void {
    const color = ctx.params['color'] as string || '#FFFFFF';
    const duration = ctx.params['duration'] as number || 300;
    ctx.layerManager.flashScreen(color, duration);
  },
};

/** @filter指令 - CSS滤镜特效 */
const filterHandler: InstructionHandler = {
  name: 'filter',
  category: 'effect' as InstructionCategory,
  format: '@filter <preset> [intensity=0-1] [vignette=0-1]',
  description: '应用屏幕滤镜效果（blur/grayscale/sepia/brightness/contrast等）',
  pattern: /^@filter\s+(\S+)(?:\s+intensity=(\d+(?:\.\d+)?))?(?:\s+vignette=(\d+(?:\.\d+)?))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@filter\s+(\S+)(?:\s+intensity=(\d+(?:\.\d+)?))?(?:\s+vignette=(\d+(?:\.\d+)?))?/) || [];
    return {
      preset: match[1] || 'grayscale',
      intensity: match[2] ? parseFloat(match[2]) : 1,
      vignette: match[3] ? parseFloat(match[3]) : 0,
    };
  },
  execute(ctx): void {
    const preset = ctx.params['preset'] as string || 'grayscale';
    const intensity = ctx.params['intensity'] as number || 1;
    const vignette = ctx.params['vignette'] as number || 0;
    ctx.layerManager.applyFilter(preset, intensity, vignette);
  },
};

/** @text_color指令 - 设置文字颜色 */
const textColorHandler: InstructionHandler = {
  name: 'text_color',
  category: 'effect' as InstructionCategory,
  format: '@text_color <颜色值>',
  description: '设置对话框文字颜色（如#FF6B9D或red）',
  pattern: /^@text_color\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@text_color\s+(\S+)$/) || [];
    return { color: match[1] || '#FFFFFF' };
  },
  execute(ctx): void {
    // text_color通过state传递给DialogBox组件
    (ctx.state as unknown as Record<string, unknown>).textColor = ctx.params['color'] as string || '#FFFFFF';
  },
};

/** 导出所有屏幕特效类指令Handler */
export const effectHandlers: InstructionHandler[] = [
  shakeHandler,
  flashHandler,
  filterHandler,
  textColorHandler,
];
