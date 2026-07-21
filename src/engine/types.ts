// 引擎内部类型定义
// 引擎实现层使用的类型，部分从对外类型导出(engine.ts)导入并扩展

import type {
  LineType,
  ParsedLine,
  Instruction,
  InstructionCategory,
  InstructionHandler,
  InstructionContext,
  LayerManagerActions,
  UIPanelType,
  CharacterDisplayState,
  ChoiceOption,
  GameSave,
  GameState as GameStateType,
} from '@/types/engine';

// 对外类型已足够使用，直接re-export
export type {
  LineType,
  ParsedLine,
  Instruction,
  InstructionCategory,
  InstructionHandler,
  InstructionContext,
  LayerManagerActions,
  UIPanelType,
  CharacterDisplayState,
  ChoiceOption,
  GameSave,
  GameStateType as GameState,
};

/** 引擎执行暂停原因 */
export type PauseReason =
  | 'click_advance'     // 等待用户点击推进（对话行/旁白行）
  | 'choice'            // 等待用户选择分支
  | 'input'             // 等待用户输入变量值
  | 'click_area'        // 等待用户点击区域
  | 'wait_timer'        // 等待计时器结束
  | 'auto_play_wait';   // 自动播放等待间隔

/** 引擎事件类型 */
export type EngineEventType =
  | 'line_executed'     // 行执行完成
  | 'paused'            // 暂停等待交互
  | 'choice_shown'      // 选择面板显示
  | 'choice_made'       // 选择完成
  | 'scene_changed'     // 场景切换（背景/BGM）
  | 'character_changed' // 角色状态变化
  | 'error'             // 执行错误
  | 'script_loaded'     // 脚本加载完成
  | 'script_finished';  // 脚本执行完毕

/** 引擎事件回调 */
export type EngineEventCallback = (event: EngineEventType, data?: unknown) => void;

/** 引擎执行状态 */
export type EngineRunState = 'idle' | 'running' | 'paused' | 'finished' | 'error';

/** @choice块解析中间结果 */
export interface ChoiceBlock {
  /** 选项文本列表 */
  promptText: string;
  /** 选项列表 */
  options: ChoiceOption[];
  /** 选项行号起始 */
  startLineIndex: number;
  /** 选项行号结束（跳转指令后的行号） */
  endLineIndex: number;
}

/** @if/@if_show条件块中间结果 */
export interface ConditionalBlock {
  /** 条件表达式（如 "{好感度} >= 5"） */
  condition: string;
  /** 条件成立的指令行列表 */
  trueLines: ParsedLine[];
  /** 开始行号 */
  startLineIndex: number;
  /** endif行号 */
  endLineIndex: number;
}

/** 变量插值标记 */
export interface VariableInterpolation {
  /** 变量名 */
  varName: string;
  /** 在文本中的起始位置 */
  startIndex: number;
  /** 在文本中的结束位置 */
  endIndex: number;
}

/** 音频资源引用 */
export interface AudioResource {
  /** 资源路径 */
  resource: string;
  /** 是否循环播放（BGM=true，SFX=false） */
  loop: boolean;
  /** 音量（0-1） */
  volume: number;
}

/** 屏幕特效参数 */
export interface ScreenEffect {
  /** 特效类型 */
  type: 'shake' | 'flash' | 'filter';
  /** 特效参数 */
  params: Record<string, number | string>;
}

/** 点击区域定义 */
export interface ClickAreaDef {
  /** 区域ID */
  id: string;
  /** 区域坐标（百分比） */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 提示文字 */
  hint: string;
  /** 点击后跳转的标签名 */
  jumpTarget: string;
  /** 点击后触发的事件名 */
  eventName: string;
}

/** 限时选择参数 */
export interface TimedChoiceParams {
  /** 选项列表 */
  options: ChoiceOption[];
  /** 倒计时秒数 */
  timeLimit: number;
  /** 默认选项索引（倒计时结束后自动选择） */
  defaultIndex: number;
}

/** 对话框样式配置 */
export interface DialogStyleConfig {
  /** 样式类型 */
  type: 'normal' | 'none' | 'fullscreen' | 'custom';
  /** 自CSS样式类名 */
  customClass?: string;
  /** 透明度 */
  opacity?: number;
}

/** 通知类型 */
export type NotificationType = 'info' | 'warning' | 'success' | 'error';

/** 通知显示参数 */
export interface NotificationParams {
  /** 通知文本 */
  text: string;
  /** 通知类型 */
  type: NotificationType;
  /** 显示时长（毫秒） */
  duration: number;
}

/** CSS过渡参数 */
export interface CssTransitionParams {
  /** 目标元素类型 */
  target: 'background' | 'character' | 'dialog' | 'ui';
  /** 过渡属性 */
  property: string;
  /** 过跃时长（毫秒） */
  duration: number;
  /** 过渡缓动函数 */
  easing: string;
  /** 过渡起始值 */
  fromValue: string;
  /** 过渡结束值 */
  toValue: string;
}
