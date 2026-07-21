// 游戏系统类指令 - @affection/@achievement/@event/@choice分支选择

import type { InstructionHandler, InstructionCategory } from '@/types/engine';

/** @affection指令 - 修改角色好感度 */
const affectionHandler: InstructionHandler = {
  name: 'affection',
  category: 'gameSystem' as InstructionCategory,
  format: '@affection <角色ID> <增量值>',
  description: '增加或减少角色好感度',
  pattern: /^@affection\s+(\S+)\s+(-?\d+(?:\.\d+)?)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@affection\s+(\S+)\s+(-?\d+(?:\.\d+)?)$/) || [];
    return {
      charId: match[1] || '',
      delta: parseFloat(match[2] || '0'),
    };
  },
  execute(ctx): void {
    const charId = ctx.params['charId'] as string;
    const delta = ctx.params['delta'] as number || 0;
    // 增量累加到好感度映射表
    const affectionMap = ctx.state.affectionMap as unknown as Record<string, number>;
    const current = affectionMap[charId] || 0;
    affectionMap[charId] = current + delta;
    ctx.state.affectionMap = affectionMap;
  },
};

/** @achievement指令 - 解锁成就 */
const achievementHandler: InstructionHandler = {
  name: 'achievement',
  category: 'gameSystem' as InstructionCategory,
  format: '@achievement <成就ID>',
  description: '解锁指定成就',
  pattern: /^@achievement\s+(\S+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@achievement\s+(\S+)$/) || [];
    return { achievementId: match[1] || '' };
  },
  execute(ctx): void {
    const achievementId = ctx.params['achievementId'] as string;
    // 添加到已解锁成就集合
    const achievements = ctx.state.achievements as Set<string>;
    achievements.add(achievementId);
    ctx.state.achievements = achievements;
    // 显示成就通知
    ctx.layerManager.showNotification(`成就解锁: ${achievementId}`, 3000);
  },
};

/** @event指令 - 设置事件标记变量 */
const eventHandler: InstructionHandler = {
  name: 'event',
  category: 'gameSystem' as InstructionCategory,
  format: '@event <事件名> [value=true]',
  description: '设置事件标记变量（用于@if条件判断）',
  pattern: /^@event\s+(\S+)(?:\s+value=(\S+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@event\s+(\S+)(?:\s+value=(\S+))?/) || [];
    let value: string | number | boolean = true;
    const rawValue = match[2] || 'true';
    if (rawValue === 'true') value = true;
    else if (rawValue === 'false') value = false;
    else {
      const num = Number(rawValue);
      if (!isNaN(num) && rawValue !== '') value = num;
    }
    return { eventName: match[1] || '', value };
  },
  execute(ctx): void {
    const eventName = ctx.params['eventName'] as string;
    const value = ctx.params['value'] as string | number | boolean;
    const stateObj = ctx.state as unknown as { variables?: Record<string, string | number | boolean> };
    if (stateObj.variables) stateObj.variables[eventName] = value;
  },
};

/** @choice指令 - 分支选择（由EngineExecutor特殊处理暂停等待） */
const choiceHandler: InstructionHandler = {
  name: 'choice',
  category: 'gameSystem' as InstructionCategory,
  format: '@choice\n选项1\n@jump 标签1\n选项2\n@jump 标签2',
  description: '显示分支选择面板，等待用户选择后跳转到对应标签',
  pattern: /^@choice$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    return {};
  },
  execute(ctx): void {
    // @choice由EngineExecutor特殊处理（收集选项并暂停等待选择）
    // 此处无需额外操作，选项收集由ScriptParser和EngineExecutor负责
  },
};

/** @endif指令 - 条件块结束标记 */
const endifHandler: InstructionHandler = {
  name: 'endif',
  category: 'gameSystem' as InstructionCategory,
  format: '@endif',
  description: '结束@if/@if_show条件块',
  pattern: /^@endif$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    return {};
  },
  execute(ctx): void {
    // @endif由EngineExecutor特殊处理（弹出条件栈）
  },
};

/** 导出所有游戏系统类指令Handler */
export const gameSystemHandlers: InstructionHandler[] = [
  affectionHandler,
  achievementHandler,
  eventHandler,
  choiceHandler,
  endifHandler,
];
