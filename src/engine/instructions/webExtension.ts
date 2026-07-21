// Web扩展类指令 - 20+扩展指令实现
// @video/@video_stop首期不实现，保留Handler骨架标注

import type { InstructionHandler, InstructionCategory } from '@/types/engine';
import { resolveResourceUrl } from '@/engine/utils';

/** @web_bg指令 - Web版背景切换 */
const webBgHandler: InstructionHandler = {
  name: 'web_bg',
  category: 'webExtension' as InstructionCategory,
  format: '@web_bg <背景ID> [transition=fade]',
  description: 'Web版背景切换（与@bg功能相同）',
  pattern: /^@web_bg\s+(\S+)(?:\s+transition=(\w+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@web_bg\s+(\S+)(?:\s+transition=(\w+))?/) || [];
    return { resource: match[1] || '', transition: match[2] || 'fade' };
  },
  execute(ctx): void {
    const resource = ctx.params['resource'] as string || '';
    const transition = ctx.params['transition'] as string || 'fade';
    const url = resolveResourceUrl(resource, ctx.state);
    ctx.state.currentBackground = resource;
    ctx.layerManager.renderBackground(url, transition);
  },
};

/** @web_bgm指令 - Web版BGM播放 */
const webBgmHandler: InstructionHandler = {
  name: 'web_bgm',
  category: 'webExtension' as InstructionCategory,
  format: '@web_bgm <音乐ID>',
  description: 'Web版BGM播放',
  pattern: /^@web_bgm\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@web_bgm\s+(\S+)$/) || [];
    return { resource: match[1] || '' };
  },
  execute(ctx): void {
    const resource = ctx.params['resource'] as string || '';
    const url = resolveResourceUrl(resource, ctx.state);
    ctx.state.currentBgm = resource;
    ctx.layerManager.playBGM(url);
  },
};

/** @web_sfx指令 - Web版SFX播放 */
const webSfxHandler: InstructionHandler = {
  name: 'web_sfx',
  category: 'webExtension' as InstructionCategory,
  format: '@web_sfx <音效ID>',
  description: 'Web版音效播放',
  pattern: /^@web_sfx\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@web_sfx\s+(\S+)$/) || [];
    return { resource: match[1] || '' };
  },
  execute(ctx): void {
    const resource = ctx.params['resource'] as string || '';
    const url = resolveResourceUrl(resource, ctx.state);
    ctx.layerManager.playSFX(url);
  },
};

/** @web_perform指令 - Web版角色立绘 */
const webPerformHandler: InstructionHandler = {
  name: 'web_perform',
  category: 'webExtension' as InstructionCategory,
  format: '@web_perform <角色ID> [pose=姿势] [position=位置]',
  description: 'Web版角色立绘显示',
  pattern: /^@web_perform\s+(\S+)(?:\s+pose=(\S+))?(?:\s+position=(\S+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@web_perform\s+(\S+)(?:\s+pose=(\S+))?(?:\s+position=(\S+))?/) || [];
    return { charId: match[1] || '', pose: match[2] || '', position: match[3] || 'center' };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const pose = ctx.params['pose'] as string || '';
    const position = ctx.params['position'] as string || 'center';
    const existing = (ctx.state.characterStates as Record<string, unknown>)[charId] as import('@/types/engine').CharacterDisplayState | undefined;
    const defaultState: import('@/types/engine').CharacterDisplayState = {
      charId, spriteUrl: '', position: position as 'left' | 'right' | 'center', scale: 1, flipped: false, rotation: 0, opacity: 1, expression: '', pose,
    };
    const updated = existing ? { ...existing, pose, position: position as 'left' | 'right' | 'center' } : defaultState;
    (ctx.state.characterStates as Record<string, import('@/types/engine').CharacterDisplayState>)[charId] = updated;
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** @css_transition指令 - CSS过渡动画 */
const cssTransitionHandler: InstructionHandler = {
  name: 'css_transition',
  category: 'webExtension' as InstructionCategory,
  format: '@css_transition <target> <property> <duration> <easing>',
  description: '应用CSS过渡动画效果',
  pattern: /^@css_transition\s+(\S+)\s+(\S+)\s+(\d+)\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@css_transition\s+(\S+)\s+(\S+)\s+(\d+)\s+(\S+)$/) || [];
    return {
      target: match[1] || 'background',
      property: match[2] || 'opacity',
      duration: parseInt(match[3] || '300', 10),
      easing: match[4] || 'ease',
    };
  },
  execute(ctx): void {
    // CSS过渡由React组件的state控制触发
    (ctx.state as unknown as Record<string, unknown>).cssTransition = ctx.params;
  },
};

/** @char_animate指令 - 角色动画 */
const charAnimateHandler: InstructionHandler = {
  name: 'char_animate',
  category: 'webExtension' as InstructionCategory,
  format: '@char_animate <角色ID> <动画类型> [duration=毫秒]',
  description: '角色立绘动画效果（bounce/shake/sway等）',
  pattern: /^@char_animate\s+(\S+)\s+(\S+)(?:\s+duration=(\d+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@char_animate\s+(\S+)\s+(\S+)(?:\s+duration=(\d+))?/) || [];
    return {
      charId: match[1] || '',
      animationType: match[2] || 'bounce',
      duration: match[3] ? parseInt(match[3], 10) : 500,
    };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const animationType = ctx.params['animationType'] as string || 'bounce';
    const existing = (ctx.state.characterStates as Record<string, import('@/types/engine').CharacterDisplayState>)[charId];
    if (existing) {
      const updated = { ...existing, animationClass: `char-${animationType}` };
      (ctx.state.characterStates as Record<string, import('@/types/engine').CharacterDisplayState>)[charId] = updated;
      ctx.layerManager.renderCharacter(charId, updated);
    }
  },
};

/** @inline_choice指令 - 嵌入式选择 */
const inlineChoiceHandler: InstructionHandler = {
  name: 'inline_choice',
  category: 'webExtension' as InstructionCategory,
  format: '@inline_choice "选项A|标签A,选项B|标签B"',
  description: '嵌入式选择面板（选项在同一行内定义）',
  pattern: /^@inline_choice\s+(.+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@inline_choice\s+(.+)$/) || [];
    return { choices: match[1] || '' };
  },
  execute(ctx): void {
    // 由EngineExecutor特殊处理（暂停等待选择）
  },
};

/** @timed_choice指令 - 限时选择 */
const timedChoiceHandler: InstructionHandler = {
  name: 'timed_choice',
  category: 'webExtension' as InstructionCategory,
  format: '@timed_choice <秒数> [default=默认选项索引]',
  description: '限时选择面板（倒计时结束自动选择默认选项）',
  pattern: /^@timed_choice\s+(\d+)(?:\s+default=(\d+))?(?:\s+options=(.+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@timed_choice\s+(\d+)(?:\s+default=(\d+))?(?:\s+options=(.+))?/) || [];
    return {
      timeLimit: parseInt(match[1] || '10', 10),
      defaultIndex: match[2] ? parseInt(match[2], 10) : 0,
      options: match[3] || '',
    };
  },
  execute(ctx): void {
    // 由EngineExecutor特殊处理（暂停等待选择+倒计时）
  },
};

/** @click_area指令 - 可点击区域 */
const clickAreaHandler: InstructionHandler = {
  name: 'click_area',
  category: 'webExtension' as InstructionCategory,
  format: '@click_area <ID> <x> <y> <width> <height> [hint=提示] [jump=标签] [event=事件]',
  description: '定义可点击矩形区域，点击后跳转标签或触发事件',
  pattern: /^@click_area\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+hint=(.+?))?(?:\s+jump=(\S+))?(?:\s+event=(\S+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@click_area\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+hint=(.+?))?(?:\s+jump=(\S+))?(?:\s+event=(\S+))?/) || [];
    return {
      id: match[1] || '',
      x: parseInt(match[2] || '0', 10),
      y: parseInt(match[3] || '0', 10),
      width: parseInt(match[4] || '100', 10),
      height: parseInt(match[5] || '100', 10),
      hint: match[6] || '',
      jump: match[7] || '',
      event: match[8] || '',
    };
  },
  execute(ctx): void {
    // 由EngineExecutor特殊处理（暂停等待点击区域）
  },
};

/** @autosave指令 - 自动存档 */
const autosaveHandler: InstructionHandler = {
  name: 'autosave',
  category: 'webExtension' as InstructionCategory,
  format: '@autosave',
  description: '自动存档到槽位0',
  pattern: /^@autosave$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    return {};
  },
  execute(ctx): void {
    // 自动存档标记，由useEngine Hook在检测到此指令时执行存档
    (ctx.state as unknown as Record<string, unknown>).autosaveRequested = true;
  },
};

/** @load_continue指令 - 继续上次游玩 */
const loadContinueHandler: InstructionHandler = {
  name: 'load_continue',
  category: 'webExtension' as InstructionCategory,
  format: '@load_continue',
  description: '从上次存档位置继续游玩',
  pattern: /^@load_continue$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    return {};
  },
  execute(ctx): void {
    // 查找槽位0的自动存档并恢复
    (ctx.state as unknown as Record<string, unknown>).loadContinueRequested = true;
  },
};

/** @text_speed指令 - 设置逐字显示速度 */
const textSpeedHandler: InstructionHandler = {
  name: 'text_speed',
  category: 'webExtension' as InstructionCategory,
  format: '@text_speed <fast|normal|slow|毫秒数>',
  description: '设置对话文字逐字显示速度',
  pattern: /^@text_speed\s+(fast|normal|slow|\d+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@text_speed\s+(fast|normal|slow|\d+)$/) || [];
    const speedStr = match[1] || 'normal';
    let speed: string | number = speedStr;
    if (speedStr !== 'fast' && speedStr !== 'normal' && speedStr !== 'slow') {
      speed = parseInt(speedStr, 10);
    }
    return { speed };
  },
  execute(ctx): void {
    const speed = ctx.params['speed'] as string | number || 'normal';
    ctx.state.textSpeed = speed as 'fast' | 'normal' | 'slow' | number;
  },
};

/** @wait指令 - 等待指定时间 */
const waitHandler: InstructionHandler = {
  name: 'wait',
  category: 'webExtension' as InstructionCategory,
  format: '@wait <毫秒数>',
  description: '暂停执行指定时间后自动继续',
  pattern: /^@wait\s+(\d+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@wait\s+(\d+)$/) || [];
    return { duration: parseInt(match[1] || '1000', 10) };
  },
  execute(ctx): void {
    // 由EngineExecutor特殊处理（设置计时器后暂停）
  },
};

/** @text_effect指令 - 文字特效 */
const textEffectHandler: InstructionHandler = {
  name: 'text_effect',
  category: 'webExtension' as InstructionCategory,
  format: '@text_effect <shake|wave|glow> [duration=毫秒]',
  description: '对话文字特效（震动/波浪/发光）',
  pattern: /^@text_effect\s+(\S+)(?:\s+duration=(\d+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@text_effect\s+(\S+)(?:\s+duration=(\d+))?/) || [];
    return { effect: match[1] || 'shake', duration: match[2] ? parseInt(match[2], 10) : 500 };
  },
  execute(ctx): void {
    (ctx.state as unknown as Record<string, unknown>).textEffect = ctx.params['effect'] as string;
    (ctx.state as unknown as Record<string, unknown>).textEffectDuration = ctx.params['duration'] as number || 500;
  },
};

/** @if指令 - 条件判断（由EngineExecutor特殊处理） */
const ifHandler: InstructionHandler = {
  name: 'if',
  category: 'webExtension' as InstructionCategory,
  format: '@if <条件表达式>',
  description: '条件判断，成立时执行@if到@endif之间的指令',
  pattern: /^@if\s+(.+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@if\s+(.+)$/) || [];
    return { condition: match[1] || '' };
  },
  execute(ctx): void {
    // 由EngineExecutor特殊处理（条件栈管理）
  },
};

/** @if_show指令 - 条件显示 */
const ifShowHandler: InstructionHandler = {
  name: 'if_show',
  category: 'webExtension' as InstructionCategory,
  format: '@if_show <条件表达式>',
  description: '条件显示内容，不成立时隐藏而非跳过',
  pattern: /^@if_show\s+(.+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@if_show\s+(.+)$/) || [];
    return { condition: match[1] || '' };
  },
  execute(ctx): void {
    // 由EngineExecutor特殊处理（条件栈管理+隐藏UI）
  },
};

/** @show_ui指令 - 显示UI面板 */
const showUiHandler: InstructionHandler = {
  name: 'show_ui',
  category: 'webExtension' as InstructionCategory,
  format: '@show_ui <menu|save|load|history>',
  description: '显示指定UI面板',
  pattern: /^@show_ui\s+(menu|save|load|history)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@show_ui\s+(menu|save|load|history)$/) || [];
    return { panel: match[1] || 'menu' };
  },
  execute(ctx): void {
    const panel = ctx.params['panel'] as string || 'menu';
    ctx.layerManager.showUI(panel as import('@/types/engine').UIPanelType);
  },
};

/** @hide_ui指令 - 隐藏UI面板 */
const hideUiHandler: InstructionHandler = {
  name: 'hide_ui',
  category: 'webExtension' as InstructionCategory,
  format: '@hide_ui <menu|save|load|history|all>',
  description: '隐藏指定UI面板或全部面板',
  pattern: /^@hide_ui\s+(menu|save|load|history|all)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@hide_ui\s+(menu|save|load|history|all)$/) || [];
    return { panel: match[1] || 'all' };
  },
  execute(ctx): void {
    const panel = ctx.params['panel'] as string || 'all';
    ctx.layerManager.hideUI(panel as import('@/types/engine').UIPanelType | 'all');
  },
};

/** @dialog_style指令 - 设置对话框样式 */
const dialogStyleHandler: InstructionHandler = {
  name: 'dialog_style',
  category: 'webExtension' as InstructionCategory,
  format: '@dialog_style <normal|none|fullscreen>',
  description: '设置对话框样式类型',
  pattern: /^@dialog_style\s+(normal|none|fullscreen)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@dialog_style\s+(normal|none|fullscreen)$/) || [];
    return { style: match[1] || 'normal' };
  },
  execute(ctx): void {
    ctx.state.dialogStyle = ctx.params['style'] as 'normal' | 'none' | 'fullscreen' || 'normal';
  },
};

/** @notify指令 - 显示通知条 */
const notifyHandler: InstructionHandler = {
  name: 'notify',
  category: 'webExtension' as InstructionCategory,
  format: '@notify <文本> [duration=毫秒] [type=info|warning|success|error]',
  description: '显示顶部通知条（自动消失）',
  pattern: /^@notify\s+(.+?)(?:\s+duration=(\d+))?(?:\s+type=(\S+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@notify\s+(.+?)(?:\s+duration=(\d+))?(?:\s+type=(\S+))?$/) || [];
    return {
      text: match[1] || '',
      duration: match[2] ? parseInt(match[2], 10) : 3000,
      type: match[3] || 'info',
    };
  },
  execute(ctx): void {
    const text = ctx.params['text'] as string || '';
    const duration = ctx.params['duration'] as number || 3000;
    ctx.layerManager.showNotification(text, duration);
  },
};

/** @video指令 - 播放视频（首期不实现，保留骨架） */
const videoHandler: InstructionHandler = {
  name: 'video',
  category: 'webExtension' as InstructionCategory,
  format: '@video <视频资源ID> [loop=true]',
  description: '播放视频（首期不实现，保留骨架）',
  pattern: /^@video\s+(\S+)(?:\s+loop=(true|false))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@video\s+(\S+)(?:\s+loop=(true|false))?/) || [];
    return { resource: match[1] || '', loop: match[2] === 'true' };
  },
  execute(ctx): void {
    // 首期不实现 - 视频播放功能待后续版本开发
    console.warn('@video指令首期不实现，将在后续版本支持');
  },
};

/** @video_stop指令 - 停止视频播放（首期不实现，保留骨架） */
const videoStopHandler: InstructionHandler = {
  name: 'video_stop',
  category: 'webExtension' as InstructionCategory,
  format: '@video_stop',
  description: '停止视频播放（首期不实现，保留骨架）',
  pattern: /^@video_stop$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    return {};
  },
  execute(ctx): void {
    // 首期不实现 - 视频停止功能待后续版本开发
    console.warn('@video_stop指令首期不实现，将在后续版本支持');
  },
};

/** 导出所有Web扩展类指令Handler */
export const webExtensionHandlers: InstructionHandler[] = [
  webBgHandler,
  webBgmHandler,
  webSfxHandler,
  webPerformHandler,
  cssTransitionHandler,
  charAnimateHandler,
  inlineChoiceHandler,
  timedChoiceHandler,
  clickAreaHandler,
  autosaveHandler,
  loadContinueHandler,
  textSpeedHandler,
  waitHandler,
  textEffectHandler,
  ifHandler,
  ifShowHandler,
  showUiHandler,
  hideUiHandler,
  dialogStyleHandler,
  notifyHandler,
  videoHandler,
  videoStopHandler,
];
