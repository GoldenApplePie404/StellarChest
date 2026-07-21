// 背景音频类指令 - @bg/@bgm/@sfx/@transition

import type { InstructionHandler, InstructionCategory } from '@/types/engine';
import { resolveResourceUrl } from '@/engine/utils';

/** @bg指令 - 切换背景图片 */
const bgHandler: InstructionHandler = {
  name: 'bg',
  category: 'background' as InstructionCategory,
  format: '@bg <背景ID> [transition=fade]',
  description: '切换背景图片，支持淡入淡出过渡',
  pattern: /^@bg\s+(\S+)(?:\s+transition=(\w+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@bg\s+(\S+)(?:\s+transition=(\w+))?/) || [];
    return {
      resource: match[1] || '',
      transition: match[2] || 'fade',
    };
  },
  execute(ctx): void {
    const resource = ctx.params['resource'] as string || '';
    const transition = ctx.params['transition'] as string || 'fade';
    const url = resolveResourceUrl(resource, ctx.state);
    ctx.state.currentBackground = resource;
    ctx.layerManager.renderBackground(url, transition);
  },
};

/** @bgm指令 - 播放背景音乐 */
const bgmHandler: InstructionHandler = {
  name: 'bgm',
  category: 'background' as InstructionCategory,
  format: '@bgm <音乐ID>',
  description: '播放背景音乐（循环播放）',
  pattern: /^@bgm\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@bgm\s+(\S+)$/) || [];
    return { resource: match[1] || '' };
  },
  execute(ctx): void {
    const resource = ctx.params['resource'] as string || '';
    const url = resolveResourceUrl(resource, ctx.state);
    ctx.state.currentBgm = resource;
    ctx.layerManager.playBGM(url);
  },
};

/** @sfx指令 - 播放音效 */
const sfxHandler: InstructionHandler = {
  name: 'sfx',
  category: 'background' as InstructionCategory,
  format: '@sfx <音效ID>',
  description: '播放一次性音效',
  pattern: /^@sfx\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@sfx\s+(\S+)$/) || [];
    return { resource: match[1] || '' };
  },
  execute(ctx): void {
    const resource = ctx.params['resource'] as string || '';
    const url = resolveResourceUrl(resource, ctx.state);
    ctx.layerManager.playSFX(url);
  },
};

/** @transition指令 - 场景过渡效果 */
const transitionHandler: InstructionHandler = {
  name: 'transition',
  category: 'background' as InstructionCategory,
  format: '@transition <类型> [duration=毫秒数]',
  description: '场景过渡效果（fade/slide/flash等）',
  pattern: /^@transition\s+(\w+)(?:\s+duration=(\d+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@transition\s+(\w+)(?:\s+duration=(\d+))?/) || [];
    return {
      type: match[1] || 'fade',
      duration: match[2] ? parseInt(match[2], 10) : 500,
    };
  },
  execute(ctx): void {
    // 过渡效果通常由@bg的transition参数处理
    // 此处可作为独立的过渡指令，控制Canvas动画
    const type = ctx.params['type'] as string || 'fade';
    if (type === 'flash') {
      ctx.layerManager.flashScreen('#FFFFFF', ctx.params['duration'] as number || 300);
    }
  },
};

/** 导出所有背景音频类指令Handler */
export const backgroundHandlers: InstructionHandler[] = [
  bgHandler,
  bgmHandler,
  sfxHandler,
  transitionHandler,
];
