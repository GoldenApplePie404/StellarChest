// 指令处理器统一导出 - 从各分类模块汇总全部Handler
// EngineExecutor通过allInstructionHandlers数组批量注册所有指令

import type { InstructionHandler } from '@/types/engine';
import { narrativeHandlers } from './narrative';
import { backgroundHandlers } from './background';
import { characterHandlers } from './character';
import { effectHandlers } from './effect';
import { variableHandlers } from './variable';
import { gameSystemHandlers } from './gameSystem';
import { webExtensionHandlers } from './webExtension';

/** 全部指令处理器列表（50+指令） */
export const allInstructionHandlers: InstructionHandler[] = [
  ...narrativeHandlers,
  ...backgroundHandlers,
  ...characterHandlers,
  ...effectHandlers,
  ...variableHandlers,
  ...gameSystemHandlers,
  ...webExtensionHandlers,
];
