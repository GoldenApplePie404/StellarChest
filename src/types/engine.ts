// 引擎相关类型定义
// 对应架构文档3节类图中的引擎数据结构

/** 脚本行类型枚举 */
export type LineType = 'dialog' | 'narration' | 'instruction' | 'comment' | 'empty' | 'choice';

/** 解析后的脚本行 */
export interface ParsedLine {
  /** 行类型 */
  type: LineType;
  /** 原始文本 */
  raw: string;
  /** 行号（从0开始） */
  lineNumber: number;
  /** 对话行时的角色名 */
  speaker?: string;
  /** 对话/旁白行的内容文本 */
  content?: string;
  /** 指令行时的解析结果 */
  instruction?: Instruction;
  /** 选择行的选项列表 */
  choices?: ChoiceOption[];
  /** 变量插值后的文本（引擎运行时替换） */
  interpolatedContent?: string;
}

/** 指令定义 */
export interface Instruction {
  /** 指令名称（不含@前缀） */
  name: string;
  /** 指令分类 */
  category: InstructionCategory;
  /** 参数列表 */
  params: Record<string, string | number | boolean>;
  /** 原始指令文本 */
  raw: string;
}

/** 指令分类枚举 */
export type InstructionCategory =
  | 'narrative'       // 叙事类：对话/旁白/章节/标签/跳转
  | 'background'      // 背景音频类：bg/bgm/sfx/transition
  | 'character'       // 角色显示类：perform/pose/expression等
  | 'effect'          // 屏幕特效类：shake/flash/filter/text_color
  | 'variable'        // 变量输入类：set/input/变量引用
  | 'gameSystem'      // 游戏系统类：affection/achievement/event/choice
  | 'webExtension';   // Web扩展类指令

/** 指令处理器接口 */
export interface InstructionHandler {
  /** 指令名称 */
  name: string;
  /** 指令分类 */
  category: InstructionCategory;
  /** 指令格式说明 */
  format: string;
  /** 指令描述 */
  description: string;
  /** 正则匹配模式 */
  pattern: RegExp;
  /** 解析指令参数 */
  parseParams(line: string): Record<string, string | number | boolean>;
  /** 执行指令逻辑 */
  execute(ctx: InstructionContext): void;
  /** 构建角色立绘URL（可选，仅角色类指令实现） */
  buildSpriteUrl?: (charId: string, pose: string, expression: string, state: Record<string, unknown>) => string;
}

/** 指令执行上下文 */
export interface InstructionContext {
  /** 当前游戏状态 */
  state: GameState;
  /** 解析后的参数 */
  params: Record<string, string | number | boolean>;
  /** 分层渲染管理器引用 */
  layerManager: LayerManagerActions;
  /** 原始指令文本 */
  rawLine: string;
  /** 当前行号 */
  lineNumber: number;
}

/** 分层渲染管理器可执行操作 */
export interface LayerManagerActions {
  renderBackground(resource: string, transition?: string): void;
  renderCharacter(charId: string, state: CharacterDisplayState): void;
  showDialog(speaker: string, text: string, style?: string): void;
  showChoice(options: ChoiceOption[]): void;
  showUI(panel: UIPanelType): void;
  hideUI(panel: UIPanelType | 'all'): void;
  shakeScreen(strength?: number, duration?: number): void;
  flashScreen(color?: string, duration?: number): void;
  applyFilter(preset: string, intensity?: number, vignette?: number): void;
  showNotification(text: string, duration?: number): void;
  playBGM(resource: string): void;
  playSFX(resource: string): void;
  stopBGM(): void;
}

/** UI面板类型 */
export type UIPanelType = 'menu' | 'save' | 'load' | 'history';

/** 角色显示状态 */
export interface CharacterDisplayState {
  /** 角色ID */
  charId: string;
  /** 立绘资源路径 */
  spriteUrl: string;
  /** 位置：左侧/右侧/中间 */
  position: 'left' | 'right' | 'center';
  /** 缩放比例 */
  scale: number;
  /** 是否翻转 */
  flipped: boolean;
  /** 旋转角度 */
  rotation: number;
  /** 透明度 */
  opacity: number;
  /** 表情名称 */
  expression: string;
  /** 姿势名称 */
  pose: string;
  /** CSS动画类名 */
  animationClass?: string;
}

/** 选择选项 */
export interface ChoiceOption {
  /** 选项文本 */
  text: string;
  /** 跳转目标标签名 */
  jumpTarget: string;
  /** 是否为限时选择的默认选项 */
  isDefault?: boolean;
}

/** 游戏存档数据 */
export interface GameSave {
  /** 存档ID */
  id: string;
  /** 项目ID */
  projectId: string;
  /** 当前行号 */
  lineIndex: number;
  /** 游戏变量表 */
  variables: Record<string, string | number | boolean>;
  /** 好感度映射表 */
  affectionMap: Record<string, number>;
  /** 当前章节 */
  currentChapter: string;
  /** 当前背景资源 */
  currentBackground: string;
  /** 当前BGM资源 */
  currentBgm: string;
  /** 存档时间 */
  savedAt: string;
  /** 存档槽位编号 */
  slot: number;
}

/** 游戏运行时状态 */
export interface GameState {
  /** 游戏变量表 */
  variables: Record<string, string | number | boolean>;
  /** 好感度映射表 */
  affectionMap: Record<string, number>;
  /** 当前执行行号 */
  currentLineIndex: number;
  /** 当前章节标识 */
  currentChapter: string;
  /** 已解锁成就集合 */
  achievements: Set<string>;
  /** 角色显示状态映射 */
  characterStates: Record<string, CharacterDisplayState>;
  /** 当前背景资源路径 */
  currentBackground: string;
  /** 当前BGM资源路径 */
  currentBgm: string;
  /** 对话框样式 */
  dialogStyle: 'normal' | 'none' | 'fullscreen';
  /** 逐字显示速度 */
  textSpeed: 'fast' | 'normal' | 'slow' | number;
  /** 是否自动播放模式 */
  autoPlay: boolean;
  /** 可见UI面板集合 */
  visiblePanels: Set<UIPanelType>;
}
