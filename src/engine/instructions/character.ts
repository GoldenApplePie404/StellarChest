// 角色显示类指令 - @perform/@pose/@expression/@char_flip/@char_side/@char_scale/@char_move/@char_rotate/@char_fade

import type { InstructionHandler, InstructionCategory, CharacterDisplayState } from '@/types/engine';

/** 创建默认角色显示状态 */
function defaultCharState(charId: string): CharacterDisplayState {
  return {
    charId,
    spriteUrl: '',
    position: 'center',
    scale: 1,
    flipped: false,
    rotation: 0,
    opacity: 1,
    expression: '',
    pose: '',
  };
}

/** @perform指令 - 显示角色立绘 */
const performHandler: InstructionHandler = {
  name: 'perform',
  category: 'character' as InstructionCategory,
  format: '@perform <角色ID> [pose=姿势] [expression=表情] [position=位置]',
  description: '显示角色立绘，指定姿势表情和位置',
  pattern: /^@perform\s+(\S+)(?:\s+pose=(\S+))?(?:\s+expression=(\S+))?(?:\s+position=(\S+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@perform\s+(\S+)(?:\s+pose=(\S+))?(?:\s+expression=(\S+))?(?:\s+position=(\S+))?/) || [];
    return {
      charId: match[1] || '',
      pose: match[2] || '',
      expression: match[3] || '',
      position: match[4] || 'center',
    };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const pose = ctx.params['pose'] as string || '';
    const expression = ctx.params['expression'] as string || '';
    const position = ctx.params['position'] as string || 'center';

    // 根据角色ID和pose/expression构建立绘URL
    // 格式: resourceMap[charId_pose_expression] 或 resourceMap[charId]
    const spriteUrl = this.buildSpriteUrl?.(charId, pose, expression, ctx.state as unknown as Record<string, unknown>) ?? `/assets/characters/${charId}_${pose || 'default'}_${expression || 'normal'}.png`;

    const state: CharacterDisplayState = {
      charId,
      spriteUrl,
      position: position as 'left' | 'right' | 'center',
      scale: 1,
      flipped: false,
      rotation: 0,
      opacity: 1,
      expression,
      pose,
    };

    ctx.state.characterStates = {
      ...ctx.state.characterStates,
      [charId]: state,
    };
    ctx.layerManager.renderCharacter(charId, state);
  },
};

/** @pose指令 - 改变角色姿势 */
const poseHandler: InstructionHandler = {
  name: 'pose',
  category: 'character' as InstructionCategory,
  format: '@pose <角色ID> <姿势名>',
  description: '改变角色立绘姿势',
  pattern: /^@pose\s+(\S+)\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@pose\s+(\S+)\s+(\S+)$/) || [];
    return { charId: match[1] || '', pose: match[2] || '' };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const pose = ctx.params['pose'] as string;
    const existing = (ctx.state.characterStates as Record<string, CharacterDisplayState>)[charId] || defaultCharState(charId);
    const updated = { ...existing, pose };
    ctx.state.characterStates = { ...ctx.state.characterStates as Record<string, CharacterDisplayState>, [charId]: updated };
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** @expression指令 - 改变角色表情 */
const expressionHandler: InstructionHandler = {
  name: 'expression',
  category: 'character' as InstructionCategory,
  format: '@expression <角色ID> <表情名>',
  description: '改变角色立绘表情',
  pattern: /^@expression\s+(\S+)\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@expression\s+(\S+)\s+(\S+)$/) || [];
    return { charId: match[1] || '', expression: match[2] || '' };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const expression = ctx.params['expression'] as string;
    const existing = (ctx.state.characterStates as Record<string, CharacterDisplayState>)[charId] || defaultCharState(charId);
    const updated = { ...existing, expression };
    ctx.state.characterStates = { ...ctx.state.characterStates as Record<string, CharacterDisplayState>, [charId]: updated };
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** @char_flip指令 - 翻转角色立绘 */
const charFlipHandler: InstructionHandler = {
  name: 'char_flip',
  category: 'character' as InstructionCategory,
  format: '@char_flip <角色ID> [direction=horizontal]',
  description: '翻转角色立绘（水平/垂直）',
  pattern: /^@char_flip\s+(\S+)(?:\s+direction=(\S+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@char_flip\s+(\S+)(?:\s+direction=(\S+))?/) || [];
    return { charId: match[1] || '', direction: match[2] || 'horizontal' };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const existing = (ctx.state.characterStates as Record<string, CharacterDisplayState>)[charId] || defaultCharState(charId);
    const updated = { ...existing, flipped: !existing.flipped };
    ctx.state.characterStates = { ...ctx.state.characterStates as Record<string, CharacterDisplayState>, [charId]: updated };
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** @char_side指令 - 改变角色位置（左/右/中） */
const charSideHandler: InstructionHandler = {
  name: 'char_side',
  category: 'character' as InstructionCategory,
  format: '@char_side <角色ID> <left|right|center>',
  description: '改变角色立绘在屏幕上的位置',
  pattern: /^@char_side\s+(\S+)\s+(left|right|center)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@char_side\s+(\S+)\s+(left|right|center)$/) || [];
    return { charId: match[1] || '', position: match[2] || 'center' };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const position = ctx.params['position'] as string || 'center';
    const existing = (ctx.state.characterStates as Record<string, CharacterDisplayState>)[charId] || defaultCharState(charId);
    const updated = { ...existing, position: position as 'left' | 'right' | 'center' };
    ctx.state.characterStates = { ...ctx.state.characterStates as Record<string, CharacterDisplayState>, [charId]: updated };
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** @char_scale指令 - 缩放角色立绘 */
const charScaleHandler: InstructionHandler = {
  name: 'char_scale',
  category: 'character' as InstructionCategory,
  format: '@char_scale <角色ID> <缩放倍数>',
  description: '缩放角色立绘大小',
  pattern: /^@char_scale\s+(\S+)\s+(\d+(?:\.\d+)?)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@char_scale\s+(\S+)\s+(\d+(?:\.\d+)?)$/) || [];
    return { charId: match[1] || '', scale: parseFloat(match[2] || '1') };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const scale = ctx.params['scale'] as number || 1;
    const existing = (ctx.state.characterStates as Record<string, CharacterDisplayState>)[charId] || defaultCharState(charId);
    const updated = { ...existing, scale };
    ctx.state.characterStates = { ...ctx.state.characterStates as Record<string, CharacterDisplayState>, [charId]: updated };
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** @char_move指令 - 移动角色立绘位置 */
const charMoveHandler: InstructionHandler = {
  name: 'char_move',
  category: 'character' as InstructionCategory,
  format: '@char_move <角色ID> <left|right|center> [duration=毫秒]',
  description: '移动角色立绘到指定位置（带动画）',
  pattern: /^@char_move\s+(\S+)\s+(left|right|center)(?:\s+duration=(\d+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@char_move\s+(\S+)\s+(left|right|center)(?:\s+duration=(\d+))?/) || [];
    return {
      charId: match[1] || '',
      position: match[2] || 'center',
      duration: match[3] ? parseInt(match[3], 10) : 500,
    };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const position = ctx.params['position'] as string || 'center';
    const existing = (ctx.state.characterStates as Record<string, CharacterDisplayState>)[charId] || defaultCharState(charId);
    const updated = { ...existing, position: position as 'left' | 'right' | 'center', animationClass: 'char-move' };
    ctx.state.characterStates = { ...ctx.state.characterStates as Record<string, CharacterDisplayState>, [charId]: updated };
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** @char_rotate指令 - 旋转角色立绘 */
const charRotateHandler: InstructionHandler = {
  name: 'char_rotate',
  category: 'character' as InstructionCategory,
  format: '@char_rotate <角色ID> <角度>',
  description: '旋转角色立绘指定角度',
  pattern: /^@char_rotate\s+(\S+)\s+(-?\d+(?:\.\d+)?)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@char_rotate\s+(\S+)\s+(-?\d+(?:\.\d+)?)$/) || [];
    return { charId: match[1] || '', rotation: parseFloat(match[2] || '0') };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const rotation = ctx.params['rotation'] as number || 0;
    const existing = (ctx.state.characterStates as Record<string, CharacterDisplayState>)[charId] || defaultCharState(charId);
    const updated = { ...existing, rotation };
    ctx.state.characterStates = { ...ctx.state.characterStates as Record<string, CharacterDisplayState>, [charId]: updated };
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** @char_fade指令 - 淡入/淡出角色立绘 */
const charFadeHandler: InstructionHandler = {
  name: 'char_fade',
  category: 'character' as InstructionCategory,
  format: '@char_fade <角色ID> <透明度0-1> [duration=毫秒]',
  description: '调整角色立绘透明度（0=消失，1=完全可见）',
  pattern: /^@char_fade\s+(\S+)\s+(\d+(?:\.\d+)?)(?:\s+duration=(\d+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@char_fade\s+(\S+)\s+(\d+(?:\.\d+)?)(?:\s+duration=(\d+))?/) || [];
    return {
      charId: match[1] || '',
      opacity: parseFloat(match[2] || '1'),
      duration: match[3] ? parseInt(match[3], 10) : 500,
    };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const opacity = ctx.params['opacity'] as number || 1;
    const existing = (ctx.state.characterStates as Record<string, CharacterDisplayState>)[charId] || defaultCharState(charId);
    const updated = { ...existing, opacity };
    ctx.state.characterStates = { ...ctx.state.characterStates as Record<string, CharacterDisplayState>, [charId]: updated };
    ctx.layerManager.renderCharacter(charId, updated);
  },
};

/** 构建立绘URL（根据角色ID/姿势/表情组合） */
function buildSpriteUrl(charId: string, pose: string, expression: string, state: Record<string, unknown>): string {
  // 从ProjectConfig的resourceMap中查找立绘资源
  const resourceMap = (state as Record<string, Record<string, string>>).resourceMap || {};
  // 组合键: charId_pose_expression 或 charId_pose 或 charId
  const keys = [
    `${charId}_${pose}_${expression}`,
    `${charId}_${pose}`,
    `${charId}_${expression}`,
    charId,
  ];
  for (const key of keys) {
    if (resourceMap[key]) return resourceMap[key];
  }
  // 未找到资源映射时返回角色ID作为路径标识
  return `/assets/characters/${charId}_${pose || 'default'}_${expression || 'normal'}.png`;
}

// 为performHandler挂载buildSpriteUrl辅助函数
(performHandler as unknown as Record<string, unknown>).buildSpriteUrl = buildSpriteUrl;

/** 导出所有角色显示类指令Handler */
export const characterHandlers: InstructionHandler[] = [
  performHandler,
  poseHandler,
  expressionHandler,
  charFlipHandler,
  charSideHandler,
  charScaleHandler,
  charMoveHandler,
  charRotateHandler,
  charFadeHandler,
];
