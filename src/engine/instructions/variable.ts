// 变量输入类指令 - @set/@input/变量插值{var_name}替换

import type { InstructionHandler, InstructionCategory } from '@/types/engine';

/** @set指令 - 设置游戏变量 */
const setHandler: InstructionHandler = {
  name: 'set',
  category: 'variable' as InstructionCategory,
  format: '@set <变量名>=<值>',
  description: '设置游戏变量值（支持字符串/数字/布尔）',
  pattern: /^@set\s+(\S+)\s*=\s*(.+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@set\s+(\S+)\s*=\s*(.+)$/) || [];
    const varName = match[1] || '';
    const rawValue = match[2] || '';
    // 自动推断值类型
    let value: string | number | boolean = rawValue;
    if (rawValue === 'true') value = true;
    else if (rawValue === 'false') value = false;
    else {
      const num = Number(rawValue);
      if (!isNaN(num) && rawValue !== '') value = num;
    }
    return { varName, value };
  },
  execute(ctx): void {
    const varName = ctx.params['varName'] as string;
    const value = ctx.params['value'] as string | number | boolean;
    const vars = (ctx.state as unknown as Record<string, Record<string, string | number | boolean>>).variables;
    if (vars) vars[varName] = value;
  },
};

/** @input指令 - 等待用户输入变量值 */
const inputHandler: InstructionHandler = {
  name: 'input',
  category: 'variable' as InstructionCategory,
  format: '@input <变量名> [prompt=提示文字]',
  description: '暂停等待用户输入，将输入值存入指定变量',
  pattern: /^@input\s+(\S+)(?:\s+prompt=(.+))?$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@input\s+(\S+)(?:\s+prompt=(.+))?$/) || [];
    return {
      varName: match[1] || '',
      prompt: match[2] || '',
    };
  },
  execute(ctx): void {
    // @input由EngineExecutor特殊处理（暂停等待用户输入）
    // 此处仅设置提示信息，实际暂停和回调由EngineExecutor处理
    const varName = ctx.params['varName'] as string;
    const prompt = ctx.params['prompt'] as string || '';
    // 触发输入UI显示
    (ctx.state as unknown as Record<string, unknown>).pendingInputVarName = varName;
    (ctx.state as unknown as Record<string, unknown>).pendingInputPrompt = prompt;
  },
};

/** 导出所有变量输入类指令Handler */
export const variableHandlers: InstructionHandler[] = [
  setHandler,
  inputHandler,
];
