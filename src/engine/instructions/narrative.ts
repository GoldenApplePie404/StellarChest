// 叙事类指令 - @chapter/@label/@jump/@chapter_end
// 对话行/旁白行的处理逻辑由EngineExecutor直接执行，此处仅注册指令

import type { InstructionHandler, InstructionCategory } from '@/types/engine';

/** @chapter指令 - 开始新章节 */
const chapterHandler: InstructionHandler = {
  name: 'chapter',
  category: 'narrative' as InstructionCategory,
  format: '@chapter <章节名>',
  description: '开始新章节',
  pattern: /^@chapter\s+(.+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@chapter\s+(.+)$/) || [];
    return { name: match[1] || '' };
  },
  execute(ctx): void {
    ctx.state.currentChapter = ctx.params['name'] as string || '';
    // 章节切换已由ScriptParser自动记录位置
  },
};

/** @label指令 - 定义跳转标签 */
const labelHandler: InstructionHandler = {
  name: 'label',
  category: 'narrative' as InstructionCategory,
  format: '@label <标签名>',
  description: '定义跳转标签位置',
  pattern: /^@label\s+(.+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@label\s+(.+)$/) || [];
    return { name: match[1] || '' };
  },
  execute(ctx): void {
    // 标签已由ScriptParser自动记录位置，执行时无需额外操作
  },
};

/** @jump指令 - 跳转到指定标签 */
const jumpHandler: InstructionHandler = {
  name: 'jump',
  category: 'narrative' as InstructionCategory,
  format: '@jump <标签名>',
  description: '跳转到指定标签位置继续执行',
  pattern: /^@jump\s+(.+)$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    const match = line.match(/^@jump\s+(.+)$/) || [];
    return { label: match[1] || '' };
  },
  execute(ctx): void {
    // @jump由EngineExecutor特殊处理（直接跳转到标签行号）
    // 此处设置目标标签，EngineExecutor.executeInstructionLine会调用jumpToLabel
    // 这里通过params传递目标，由EngineExecutor处理跳转
    const target = ctx.params['label'] as string || '';
    // 跳转逻辑在EngineExecutor中处理
  },
};

/** @chapter_end指令 - 章节结束标记 */
const chapterEndHandler: InstructionHandler = {
  name: 'chapter_end',
  category: 'narrative' as InstructionCategory,
  format: '@chapter_end',
  description: '标记当前章节结束',
  pattern: /^@chapter_end$/,
  parseParams(line: string): Record<string, string | number | boolean> {
    return {};
  },
  execute(ctx): void {
    // 章节结束标记，无额外操作
    // 可用于存档界面显示"章节完成"
  },
};

/** 导出所有叙事类指令Handler */
export const narrativeHandlers: InstructionHandler[] = [
  chapterHandler,
  labelHandler,
  jumpHandler,
  chapterEndHandler,
];
