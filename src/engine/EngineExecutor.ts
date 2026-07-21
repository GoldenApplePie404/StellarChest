// 引擎执行器 - 驱动脚本逐行执行，管理游戏状态和交互暂停点
// loadScript加载脚本，executeNext执行下一行，jumpToLabel跳转标签
// saveState/loadState存档读档，reset重置，onAdvance/onChoice/onInput回调

import { GameStateManager } from './GameState';
import { ScriptParser } from './ScriptParser';
import { InstructionRegistry } from './InstructionRegistry';
import { allInstructionHandlers } from './instructions/index';
import type { ParsedLine, InstructionHandler, InstructionContext, LayerManagerActions, GameSave, ChoiceOption } from '@/types/engine';
import type { PauseReason, EngineEventType, EngineEventCallback, EngineRunState, ChoiceBlock } from './types';

/** 引擎执行器类 */
export class EngineExecutor {
  /** 游戏状态管理器 */
  private stateManager: GameStateManager;
  /** 脚本解析器 */
  private parser: ScriptParser;
  /** 指令注册表 */
  private registry: InstructionRegistry;
  /** 分层渲染管理器操作接口 */
  private layerManager: LayerManagerActions | null = null;
  /** 已解析的行列表 */
  private parsedLines: ParsedLine[] = [];
  /** 当前暂停原因 */
  private pauseReason: PauseReason | null = null;
  /** 当前@choice块的选项列表 */
  private currentChoices: ChoiceOption[] = [];
  /** 当前@choice块的提示语（问题文本） */
  private currentChoicePrompt: string = '';
  /** 当前@if块的条件判断结果 */
  private conditionStack: boolean[] = [];
  /** @if块跳过模式（条件为false时跳过@endif之间的行） */
  private skipMode: boolean = false;
  /** 自动播放间隔（毫秒） */
  private autoPlayInterval: number = 3000;
  /** 自动播放计时器 */
  private autoPlayTimer: ReturnType<typeof setTimeout> | null = null;
  /** 事件回调列表 */
  private eventCallbacks: EngineEventCallback[] = [];
  /** 引擎运行状态 */
  private runState: EngineRunState = 'idle';
  /** @if/@if_show条件块嵌套栈 */
  private conditionalBlocks: { conditionMet: boolean; isSkipping: boolean }[] = [];
  /** 当前等待用户输入的变量名 */
  private pendingInputVarName: string = '';
  /** @click_area区域定义 */
  private pendingClickArea: { id: string; hint: string; jumpTarget: string; eventName: string } | null = null;
  /** @wait计时器 */
  private waitTimer: ReturnType<typeof setTimeout> | null = null;
  /** 项目ID（用于存档） */
  private projectId: string = '';
  /** 最后一次执行错误信息（供预览面板展示，避免整屏静默卡死） */
  private errorMessage: string | null = null;

  /** 构造函数 */
  constructor() {
    this.stateManager = new GameStateManager();
    this.parser = new ScriptParser();
    this.registry = new InstructionRegistry();
    // 自动注册全部指令处理器
    this.registry.registerAll(allInstructionHandlers);
  }

  /**
   * 加载脚本并初始化引擎
   * @param scriptText 脚本文本内容
   * @param projectId 项目ID
   */
  loadScript(scriptText: string, projectId: string): void {
    this.projectId = projectId;
    this.errorMessage = null;
    this.parsedLines = this.parser.parse(scriptText);
    this.stateManager.reset();
    this.stateManager.setCurrentLineIndex(0);
    this.runState = 'running';
    this.emitEvent('script_loaded');
  }

  /**
   * 设置分层渲染管理器
   * @param lm LayerManagerActions接口
   */
  setLayerManager(lm: LayerManagerActions): void {
    this.layerManager = lm;
  }

  /**
   * 设置资源映射表（角色立绘/背景等资源路径，来自项目配置 resourceMap）
   * 需在 loadScript 之前调用，供 @perform/@pose 等指令解析立绘 URL
   * @param map 资源映射表
   */
  setResourceMap(map: Record<string, string>): void {
    this.stateManager.setResourceMap(map);
  }

  /**
   * 注册事件回调
   * @param callback 事件回调函数
   */
  onEvent(callback: EngineEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * 发射引擎事件
   * @param type 事件类型
   * @param data 附加数据
   */
  private emitEvent(type: EngineEventType, data?: unknown): void {
    for (const cb of this.eventCallbacks) {
      cb(type, data);
    }
  }

  /**
   * 执行下一行
   * 从当前行号读取解析后的行，根据类型执行对应操作
   * 遇到交互暂停点时停止执行，等待回调
   */
  executeNext(): void {
    if (this.runState !== 'running') return;

    const currentIndex = this.stateManager.getCurrentLineIndex();
    if (currentIndex >= this.parsedLines.length) {
      this.runState = 'finished';
      this.emitEvent('script_finished');
      return;
    }

    const line = this.parsedLines[currentIndex];
    if (!line) {
      this.runState = 'finished';
      this.emitEvent('script_finished');
      return;
    }

    // @if跳过模式处理
    if (this.conditionalBlocks.length > 0) {
      const currentBlock = this.conditionalBlocks[this.conditionalBlocks.length - 1];
      if (currentBlock && currentBlock.isSkipping) {
        // 在跳过模式中，只有@endif可以终止跳过
        if (line.type === 'instruction' && line.instruction?.name === 'endif') {
          this.conditionalBlocks.pop();
          this.stateManager.setCurrentLineIndex(currentIndex + 1);
          this.executeNext();
          return;
        }
        // 其他行直接跳过
        this.stateManager.setCurrentLineIndex(currentIndex + 1);
        this.executeNext();
        return;
      }
    }

    // 处理@endif指令（条件成立模式中遇到endif也需弹出栈）
    if (line.type === 'instruction' && line.instruction?.name === 'endif') {
      if (this.conditionalBlocks.length > 0) {
        this.conditionalBlocks.pop();
      }
      this.stateManager.setCurrentLineIndex(currentIndex + 1);
      this.executeNext();
      return;
    }

    switch (line.type) {
      case 'dialog':
        this.executeDialogLine(line);
        break;
      case 'narration':
        this.executeNarrationLine(line);
        break;
      case 'instruction':
        this.executeInstructionLine(line);
        break;
      case 'choice':
        // 选项行在@choice块处理中已合并到@choice指令
        this.stateManager.setCurrentLineIndex(currentIndex + 1);
        this.executeNext();
        break;
      case 'comment':
        // 注释行直接跳过
        this.stateManager.setCurrentLineIndex(currentIndex + 1);
        this.executeNext();
        break;
      case 'empty':
        // 空行直接跳过
        this.stateManager.setCurrentLineIndex(currentIndex + 1);
        this.executeNext();
        break;
      default:
        // 未知类型跳过
        this.stateManager.setCurrentLineIndex(currentIndex + 1);
        this.executeNext();
        break;
    }
  }

  /**
   * 安全执行下一行：捕获指令执行中的异常，避免单条指令出错导致整条脚本
   * 静默卡死，并把错误通过 'error' 事件暴露给预览面板。
   * 内部递归的 executeNext 调用仍走原方法，异常会向上冒泡到此处被捕获。
   */
  safeExecute(): void {
    try {
      this.executeNext();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.errorMessage = message;
      this.runState = 'error';
      this.emitEvent('error', {
        message,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }

  /**
   * 获取最后一次错误信息（供预览面板展示）
   */
  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  /**
   * 执行对话行
   * 显示角色名和对话内容，暂停等待用户点击推进
   */
  private executeDialogLine(line: ParsedLine): void {
    if (!this.layerManager) return;

    const speaker = line.speaker || '';
    // 变量插值替换
    const content = this.parser.interpolate(
      line.content || '',
      this.stateManager.getAllVariables(),
    );

    this.layerManager.showDialog(speaker, content);
    this.pauseReason = 'click_advance';
    this.runState = 'paused';
    this.emitEvent('paused', { reason: 'click_advance', speaker, content });
    this.emitEvent('line_executed', line);

    // 自动播放模式
    if (this.stateManager.isAutoPlay()) {
      this.startAutoPlayTimer();
    }
  }

  /**
   * 执行旁白行
   * 显示旁白内容（无角色名），暂停等待用户点击推进
   */
  private executeNarrationLine(line: ParsedLine): void {
    if (!this.layerManager) return;

    const content = this.parser.interpolate(
      line.content || '',
      this.stateManager.getAllVariables(),
    );

    this.layerManager.showDialog('', content);
    this.pauseReason = 'click_advance';
    this.runState = 'paused';
    this.emitEvent('paused', { reason: 'click_advance', content });
    this.emitEvent('line_executed', line);

    // 自动播放模式
    if (this.stateManager.isAutoPlay()) {
      this.startAutoPlayTimer();
    }
  }

  /**
   * 执行指令行
   * 查找对应Handler并调用execute方法
   */
  private executeInstructionLine(line: ParsedLine): void {
    if (!line.instruction) {
      this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
      this.executeNext();
      return;
    }

    const handler = this.registry.getHandler(line.instruction.name);
    if (!handler) {
      // 未知指令，跳过
      console.warn(`未注册的指令: @${line.instruction.name}`);
      this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
      this.executeNext();
      return;
    }

    // 构建InstructionContext
    // 关键修复：用各 Handler 自带的 parseParams 重新解析该行，得到该指令期望的
    // 具名参数（resource/charId/label/name...）。引擎早期直接透传 ScriptParser 的
    // 通用参数（裸参统一存为 id/value），导致 @bg/@bgm/@perform/@jump 等读取到的
    // 具名 key 全是 undefined，背景/音乐/立绘/跳转全部失效。
    const ctx: InstructionContext = {
      state: this.stateManager.toSnapshot() as unknown as import('@/types/engine').GameState,
      params: handler.parseParams(line.instruction?.raw ?? line.raw),
      layerManager: this.layerManager!,
      rawLine: line.raw,
      lineNumber: line.lineNumber,
    };

    // 特殊指令处理：@choice/@inline_choice/@timed_choice 需暂停等待选择
    if (line.instruction.name === 'choice') {
      this.executeChoiceInstruction(line, ctx);
      return;
    }

    if (line.instruction.name === 'inline_choice') {
      this.executeInlineChoiceInstruction(line, ctx);
      return;
    }

    if (line.instruction.name === 'timed_choice') {
      this.executeTimedChoiceInstruction(line, ctx);
      return;
    }

    // @if/@if_show 条件判断
    if (line.instruction.name === 'if' || line.instruction.name === 'if_show') {
      this.executeConditionalInstruction(line, ctx);
      return;
    }

    // @input 暂停等待输入
    if (line.instruction.name === 'input') {
      handler.execute(ctx);
      this.pauseReason = 'input';
      this.pendingInputVarName = line.instruction.params['varName'] as string || line.instruction.params['id'] as string || '';
      this.runState = 'paused';
      this.emitEvent('paused', { reason: 'input', varName: this.pendingInputVarName });
      return;
    }

    // @click_area 暂停等待点击区域
    if (line.instruction.name === 'click_area') {
      handler.execute(ctx);
      this.pauseReason = 'click_area';
      this.pendingClickArea = {
        id: line.instruction.params['id'] as string || '',
        hint: line.instruction.params['hint'] as string || '',
        jumpTarget: line.instruction.params['jump'] as string || '',
        eventName: line.instruction.params['event'] as string || '',
      };
      this.runState = 'paused';
      this.emitEvent('paused', { reason: 'click_area', area: this.pendingClickArea });
      return;
    }

    // @wait 暂停等待计时器
    if (line.instruction.name === 'wait') {
      handler.execute(ctx);
      const waitDuration = line.instruction.params['duration'] as number || line.instruction.params['ms'] as number || 1000;
      this.pauseReason = 'wait_timer';
      this.runState = 'paused';
      this.emitEvent('paused', { reason: 'wait_timer', duration: waitDuration });
      this.waitTimer = setTimeout(() => {
        this.waitTimer = null;
        this.resumeFromWait();
      }, waitDuration);
      return;
    }

    // @jump 直接跳转
    if (line.instruction.name === 'jump') {
      handler.execute(ctx);
      return;
    }

    // 其他指令：正常执行后推进到下一行
    handler.execute(ctx);
    this.emitEvent('line_executed', line);
    this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
    this.executeNext();
  }

  /**
   * 执行@choice分支选择指令
   * 显示选择面板，暂停等待用户选择
   */
  private executeChoiceInstruction(line: ParsedLine, ctx: InstructionContext): void {
    // 获取@choice块中的选项列表
    const choiceBlock = this.parser.getChoiceBlocks().get(line.lineNumber);
    const options = choiceBlock?.options || line.choices || [];

    if (options.length === 0) {
      // 无选项的@choice，跳过
      this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
      this.executeNext();
      return;
    }

    this.currentChoices = options;
    this.currentChoicePrompt = choiceBlock?.promptText ?? '';
    this.layerManager?.showChoice(options);
    this.pauseReason = 'choice';
    this.runState = 'paused';
    this.emitEvent('choice_shown', { options, prompt: this.currentChoicePrompt });
  }

  /**
   * 执行@inline_choice嵌入选择指令
   */
  private executeInlineChoiceInstruction(line: ParsedLine, ctx: InstructionContext): void {
    const options: ChoiceOption[] = [];
    // @inline_choice 格式: @inline_choice 选项1=标签1 选项2=标签2 ...
    const params = line.instruction?.params || {};
    let optionIndex = 0;
    while (params[`option${optionIndex}`] !== undefined || params[`text${optionIndex}`] !== undefined) {
      const text = String(params[`option${optionIndex}`] || params[`text${optionIndex}`] || '');
      const target = String(params[`jump${optionIndex}`] || params[`target${optionIndex}`] || params[`label${optionIndex}`] || '');
      if (text) {
        options.push({ text, jumpTarget: target });
      }
      optionIndex++;
    }

    // 也可从value/id参数中解析
    if (options.length === 0 && params['id']) {
      // 格式: @inline_choice "选项A|标签A,选项B|标签B"
      const choicesStr = String(params['id'] || params['value'] || '');
      const pairs = choicesStr.split(',');
      for (const pair of pairs) {
        const [text, target] = pair.split('|');
        if (text) {
          options.push({ text: text.trim(), jumpTarget: target?.trim() || '' });
        }
      }
    }

    this.currentChoices = options;
    this.currentChoicePrompt = '';
    this.layerManager?.showChoice(options);
    this.pauseReason = 'choice';
    this.runState = 'paused';
    this.emitEvent('choice_shown', { options, prompt: '' });
  }

  /**
   * 执行@timed_choice限时选择指令
   */
  private executeTimedChoiceInstruction(line: ParsedLine, ctx: InstructionContext): void {
    const options: ChoiceOption[] = [];
    const params = line.instruction?.params || {};
    const timeLimit = Number(params['time'] || params['duration'] || params['seconds'] || 10);
    const defaultIndex = Number(params['default'] || params['defaultIndex'] || 0);

    // 解析选项（同inline_choice）
    let optionIndex = 0;
    while (params[`option${optionIndex}`] !== undefined || params[`text${optionIndex}`] !== undefined) {
      const text = String(params[`option${optionIndex}`] || params[`text${optionIndex}`] || '');
      const target = String(params[`jump${optionIndex}`] || params[`target${optionIndex}`] || '');
      if (text) {
        options.push({
          text,
          jumpTarget: target,
          isDefault: optionIndex === defaultIndex,
        });
      }
      optionIndex++;
    }

    this.currentChoices = options;
    this.currentChoicePrompt = '';
    this.layerManager?.showChoice(options);
    this.pauseReason = 'choice';
    this.runState = 'paused';
    this.emitEvent('choice_shown', { options, prompt: '', timeLimit, defaultIndex });
  }

  /**
   * 执行@if/@if_show条件判断指令
   */
  private executeConditionalInstruction(line: ParsedLine, ctx: InstructionContext): void {
    const params = line.instruction?.params || {};
    const conditionStr = String(params['condition'] || params['value'] || params['id'] || line.raw.replace(/^@if\s*/, '').replace(/^@if_show\s*/, ''));

    // 解析条件表达式：{varName} >= 5 / {varName} == "值" / {varName} < 10 等
    const conditionMet = this.evaluateCondition(conditionStr);

    this.conditionalBlocks.push({
      conditionMet,
      isSkipping: !conditionMet,
    });

    // @if_show: 条件不成立时隐藏内容而非跳过（通过layerManager控制）
    if (line.instruction?.name === 'if_show' && !conditionMet && this.layerManager) {
      this.layerManager.hideUI('all');
    }

    this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
    this.executeNext();
  }

  /**
   * 评估条件表达式
   * @param conditionStr 条件字符串（如 "{好感度} >= 5"）
   * @returns 条件是否成立
   */
  private evaluateCondition(conditionStr: string): boolean {
    // 先做变量插值替换
    const interpolated = this.parser.interpolate(
      conditionStr,
      this.stateManager.getAllVariables(),
    );

    // 解析比较运算符
    const operators = ['>=', '<=', '!=', '==', '>', '<'];
    for (const op of operators) {
      const parts = interpolated.split(op);
      if (parts.length === 2) {
        const left = this.parseExpressionValue(parts[0]?.trim() ?? '');
        const right = this.parseExpressionValue(parts[1]?.trim() ?? '');

        switch (op) {
          case '>=': return left >= right;
          case '<=': return left <= right;
          case '>': return left > right;
          case '<': return left < right;
          case '==': return left == right;
          case '!=': return left != right;
        }
      }
    }

    // 无运算符时，判断值是否为真（非零/非空/true）
    const value = this.parseExpressionValue(interpolated);
    return Boolean(value);
  }

  /**
   * 解析表达式值为数字或字符串
   */
  private parseExpressionValue(str: string): number | string {
    const num = Number(str);
    if (!isNaN(num) && str !== '') return num;
    return str;
  }

  /**
   * 用户点击推进（对话行/旁白行等待后的回调）
   */
  onAdvance(): void {
    if (this.pauseReason !== 'click_advance') return;
    this.pauseReason = null;
    this.runState = 'running';
    this.clearAutoPlayTimer();

    // 推进到下一行
    this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
    this.safeExecute();
  }

  /**
   * 用户选择选项（@choice/@inline_choice/@timed_choice等待后的回调）
   * @param index 选项索引
   */
  onChoice(index: number): void {
    if (this.pauseReason !== 'choice') return;
    if (index < 0 || index >= this.currentChoices.length) return;

    this.pauseReason = null;
    this.runState = 'running';
    const chosen = this.currentChoices[index];
    this.emitEvent('choice_made', { index, choice: chosen });

    // 跳转到选项对应的标签
    if (chosen?.jumpTarget) {
      this.jumpToLabel(chosen.jumpTarget);
    } else {
      // 无跳转目标时推进到@choice块结束行之后
      const choiceBlock = this.parser.getChoiceBlocks().get(this.stateManager.getCurrentLineIndex());
      if (choiceBlock) {
        this.stateManager.setCurrentLineIndex(choiceBlock.endLineIndex + 1);
      } else {
        this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
      }
      this.safeExecute();
    }
  }

  /**
   * 用户输入值（@input等待后的回调）
   * @param value 用户输入的值
   */
  onInput(value: string): void {
    if (this.pauseReason !== 'input') return;
    this.pauseReason = null;
    this.runState = 'running';

    // 将输入值存入变量
    this.stateManager.setVariable(this.pendingInputVarName, value);
    this.pendingInputVarName = '';

    // 推进到下一行
    this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
    this.safeExecute();
  }

  /**
   * 用户点击区域（@click_area等待后的回调）
   * @param areaId 区域ID
   */
  onClickArea(areaId: string): void {
    if (this.pauseReason !== 'click_area') return;
    this.pauseReason = null;
    this.runState = 'running';

    if (this.pendingClickArea) {
      // 触发事件或跳转
      if (this.pendingClickArea.jumpTarget) {
        this.jumpToLabel(this.pendingClickArea.jumpTarget);
      } else if (this.pendingClickArea.eventName) {
        this.stateManager.setVariable(this.pendingClickArea.eventName, true);
        this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
        this.safeExecute();
      } else {
        this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
        this.safeExecute();
      }
      this.pendingClickArea = null;
    }
  }

  /**
   * @wait计时器完成后恢复执行
   */
  private resumeFromWait(): void {
    if (this.pauseReason !== 'wait_timer') return;
    this.pauseReason = null;
    this.runState = 'running';
    this.stateManager.setCurrentLineIndex(this.stateManager.getCurrentLineIndex() + 1);
    this.safeExecute();
  }

  /**
   * 跳转到指定标签
   * @param labelName 标签名
   */
  jumpToLabel(labelName: string): void {
    const targetLine = this.parser.getLabelLine(labelName);
    if (targetLine < 0) {
      console.warn(`标签不存在: ${labelName}`);
      return;
    }
    this.stateManager.setCurrentLineIndex(targetLine);
    this.emitEvent('scene_changed', { label: labelName, line: targetLine });
    this.safeExecute();
  }

  /**
   * 保存游戏状态到存档
   * @param slot 存档槽位编号
   * @returns GameSave对象
   */
  saveState(slot: number): GameSave {
    const snapshot = this.stateManager.toSnapshot();
    const save: GameSave = {
      id: `save_${this.projectId}_${slot}`,
      projectId: this.projectId,
      lineIndex: snapshot.currentLineIndex,
      variables: snapshot.variables,
      affectionMap: snapshot.affectionMap,
      currentChapter: snapshot.currentChapter,
      currentBackground: snapshot.currentBackground,
      currentBgm: snapshot.currentBgm,
      savedAt: new Date().toISOString(),
      slot,
    };

    // 写入localStorage
    const storageKey = `galgame_save_${this.projectId}_${slot}`;
    localStorage.setItem(storageKey, JSON.stringify(save));

    return save;
  }

  /**
   * 从存档恢复游戏状态
   * @param saveData 存档数据
   */
  loadState(saveData: GameSave): void {
    const snapshot = {
      variables: saveData.variables,
      affectionMap: saveData.affectionMap,
      currentLineIndex: saveData.lineIndex,
      currentChapter: saveData.currentChapter,
      achievements: [],
      characterStates: {},
      currentBackground: saveData.currentBackground,
      currentBgm: saveData.currentBgm,
      dialogStyle: 'normal',
      textSpeed: 'normal',
      autoPlay: false,
    };
    this.stateManager.fromSnapshot(snapshot);
    this.conditionalBlocks = [];
    this.runState = 'running';
    this.emitEvent('scene_changed', { loadedSave: saveData.slot });

    // 恢复背景和BGM
    if (saveData.currentBackground && this.layerManager) {
      this.layerManager.renderBackground(saveData.currentBackground);
    }
    if (saveData.currentBgm && this.layerManager) {
      this.layerManager.playBGM(saveData.currentBgm);
    }

    // 从存档行号继续执行
    this.safeExecute();
  }

  /**
   * 重置引擎状态
   */
  reset(): void {
    this.stateManager.reset();
    this.conditionalBlocks = [];
    this.currentChoices = [];
    this.currentChoicePrompt = '';
    this.pauseReason = null;
    this.runState = 'idle';
    this.errorMessage = null;
    this.clearAutoPlayTimer();
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    this.emitEvent('scene_changed', { reset: true });
  }

  /**
   * 开启自动播放模式
   * @param interval 自动推进间隔（毫秒）
   */
  startAutoPlay(interval: number = 3000): void {
    this.stateManager.setAutoPlay(true);
    this.autoPlayInterval = interval;
    if (this.runState === 'paused' && this.pauseReason === 'click_advance') {
      this.startAutoPlayTimer();
    }
  }

  /**
   * 停止自动播放模式
   */
  stopAutoPlay(): void {
    this.stateManager.setAutoPlay(false);
    this.clearAutoPlayTimer();
  }

  /** 启动自动播放计时器 */
  private startAutoPlayTimer(): void {
    this.clearAutoPlayTimer();
    this.autoPlayTimer = setTimeout(() => {
      this.autoPlayTimer = null;
      this.onAdvance();
    }, this.autoPlayInterval);
  }

  /** 清除自动播放计时器 */
  private clearAutoPlayTimer(): void {
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  /** 获取游戏状态管理器 */
  getStateManager(): GameStateManager {
    return this.stateManager;
  }

  /** 获取脚本解析器 */
  getParser(): ScriptParser {
    return this.parser;
  }

  /** 获取引擎运行状态 */
  getRunState(): EngineRunState {
    return this.runState;
  }

  /** 获取当前暂停原因 */
  getPauseReason(): PauseReason | null {
    return this.pauseReason;
  }

  /** 获取当前选项列表 */
  getCurrentChoices(): ChoiceOption[] {
    return this.currentChoices;
  }

  /** 获取当前选择块的提示语（问题文本） */
  getCurrentChoicePrompt(): string {
    return this.currentChoicePrompt;
  }

  /** 获取当前等待输入的变量名 */
  getPendingInputVarName(): string {
    return this.pendingInputVarName;
  }

  /** 获取当前等待点击的区域定义 */
  getPendingClickArea(): { id: string; hint: string; jumpTarget: string; eventName: string } | null {
    return this.pendingClickArea;
  }

  /** 获取项目ID */
  getProjectId(): string {
    return this.projectId;
  }
}
