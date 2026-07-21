// 脚本解析器 - 逐行扫描脚本文本，分类为dialog/narrative/instruction/comment/blank/choice
// 解析指令名和参数，处理变量插值{var_name}，支持章节和标签跳转

import type { ParsedLine, LineType, Instruction, InstructionCategory, ChoiceOption } from '@/types/engine';
import type { ChoiceBlock } from './types';

/** 脚本解析器类 */
export class ScriptParser {
  /** 已解析的行列表 */
  private lines: ParsedLine[] = [];
  /** 标签位置映射（标签名 -> 行号） */
  private labelMap: Map<string, number> = new Map();
  /** 章节位置映射（章节名 -> 行号） */
  private chapterMap: Map<string, number> = new Map();
  /** @choice块映射（起始行号 -> ChoiceBlock） */
  private choiceBlocks: Map<number, ChoiceBlock> = new Map();

  /**
   * 解析完整脚本文本
   * @param scriptText 脚本文本内容
   * @returns 解析后的行列表
   */
  parse(scriptText: string): ParsedLine[] {
    this.lines = [];
    this.labelMap.clear();
    this.chapterMap.clear();
    this.choiceBlocks.clear();

    // 按换行符分割文本
    const rawLines = scriptText.split('\n');
    let inChoiceBlock = false;
    let choiceStartLine = -1;
    let choicePromptText = '';
    let choiceOptions: ChoiceOption[] = [];
    let choiceOptionStartLine = -1;
    // 首个 @jump 之前的文本行暂存（最后一条为首个选项文本，其余为提示语）
    let preJumpTexts: string[] = [];
    // 首个 @jump 之后、下一条 @jump 之前的选项文本
    let pendingOptionText: string | null = null;
    let firstJumpSeen = false;

    /** 收尾当前 @choice 块：记录块信息并回填选项引用 */
    const finalizeChoiceBlock = (endExclusiveIndex: number): void => {
      if (choiceOptions.length === 0) {
        inChoiceBlock = false;
        return;
      }
      this.choiceBlocks.set(choiceStartLine, {
        promptText: choicePromptText,
        options: choiceOptions,
        startLineIndex: choiceStartLine,
        endLineIndex: endExclusiveIndex - 1,
      });
      const choiceStartRef = this.lines[choiceStartLine];
      if (choiceStartRef) {
        choiceStartRef.choices = choiceOptions;
      }
      for (let j = choiceOptionStartLine; j < endExclusiveIndex; j++) {
        const lineRef = this.lines[j];
        if (lineRef && lineRef.type === 'choice') {
          lineRef.choices = choiceOptions;
        }
      }
      inChoiceBlock = false;
    };

    for (let i = 0; i < rawLines.length; i++) {
      const rawLine = rawLines[i];
      const trimmed = (rawLine ?? '').trim();

      // 分类行类型
      const lineType = this.classifyLine(trimmed, inChoiceBlock);
      const parsedLine: ParsedLine = {
        type: lineType,
        raw: rawLine ?? '',
        lineNumber: i,
      };

      // 处理@choice块
      if (trimmed.startsWith('@choice')) {
        inChoiceBlock = true;
        choiceStartLine = i;
        choicePromptText = '';
        choiceOptions = [];
        preJumpTexts = [];
        pendingOptionText = null;
        firstJumpSeen = false;
        choiceOptionStartLine = -1;

        // 解析@choice指令
        const instruction = this.parseInstruction(trimmed);
        if (instruction) {
          parsedLine.instruction = instruction;
          // 支持行内提示语：@choice 你要去哪里？
          const inlinePrompt = String(
            instruction.params['prompt'] ?? instruction.params['text'] ?? instruction.params['value'] ?? '',
          ).trim();
          if (inlinePrompt) choicePromptText = inlinePrompt;
        }
        this.lines.push(parsedLine);
        continue;
      }

      // 在@choice块内处理选项行
      if (inChoiceBlock) {
        // 空行/注释行：跳过，不计入选项，也不结束选择块
        if (lineType === 'empty' || lineType === 'comment') {
          this.lines.push(parsedLine);
          continue;
        }

        // @jump 指令：将上一条文本行作为该选项文本，并填充跳转目标
        if (trimmed.startsWith('@jump')) {
          const instruction = this.parseInstruction(trimmed);
          // 通用解析把裸值存为 id/value，跳转处理器则存为 label，两者都要兼容
          const jumpTarget = String(
            instruction?.params['label'] ??
              instruction?.params['target'] ??
              instruction?.params['id'] ??
              instruction?.params['value'] ??
              '',
          );
          let optText = '';
          if (preJumpTexts.length > 0) {
            // 弹出最后一条作为首个选项文本，其余归为提示语
            optText = preJumpTexts.pop() ?? '';
            if (preJumpTexts.length > 0) {
              const rest = preJumpTexts.join('\n');
              choicePromptText = choicePromptText ? `${choicePromptText}\n${rest}` : rest;
            }
            preJumpTexts = [];
          } else if (pendingOptionText !== null) {
            optText = pendingOptionText;
            pendingOptionText = null;
          }
          if (optText) {
            choiceOptions.push({ text: this.stripInlineComment(optText), jumpTarget });
          }
          parsedLine.instruction = instruction ?? undefined;
          parsedLine.type = 'instruction';
          this.lines.push(parsedLine);
          firstJumpSeen = true;
          continue;
        }

        // 选项文本行（@jump 之前的文本行）
        if (lineType === 'choice') {
          parsedLine.content = trimmed;
          if (!firstJumpSeen) {
            // 首个 @jump 之前：累计为提示语候选，最后一条才是首个选项文本
            preJumpTexts.push(trimmed);
          } else {
            // 首个 @jump 之后：每条文本行等待后续 @jump 配对
            pendingOptionText = trimmed;
          }
          if (choiceOptionStartLine < 0) choiceOptionStartLine = i;
          this.lines.push(parsedLine);
          continue;
        }

        // 遇到其他类型行（如 @label / 对话 / 旁白）：结束选择块
        finalizeChoiceBlock(i);
      }

      // 正常行处理
      switch (lineType) {
        case 'dialog':
          parsedLine.speaker = this.extractSpeaker(trimmed);
          parsedLine.content = this.extractDialogContent(trimmed);
          parsedLine.interpolatedContent = this.findInterpolations(parsedLine.content);
          break;
        case 'narration':
          parsedLine.content = this.extractNarrationContent(trimmed);
          parsedLine.interpolatedContent = this.findInterpolations(parsedLine.content);
          break;
        case 'instruction':
          parsedLine.instruction = this.parseInstruction(trimmed) ?? undefined;
          // 记录标签位置
          if (parsedLine.instruction?.name === 'label') {
            const labelName =
              (parsedLine.instruction.params['name'] as string) ||
              (parsedLine.instruction.params['label'] as string) ||
              (parsedLine.instruction.params['id'] as string) ||
              (parsedLine.instruction.params['value'] as string) ||
              '';
            this.labelMap.set(labelName, i);
          }
          // 记录章节位置
          if (parsedLine.instruction?.name === 'chapter') {
            const chapterName =
              (parsedLine.instruction.params['name'] as string) ||
              (parsedLine.instruction.params['id'] as string) ||
              (parsedLine.instruction.params['value'] as string) ||
              '';
            this.chapterMap.set(chapterName, i);
          }
          break;
        case 'comment':
          parsedLine.content = trimmed.slice(trimmed.startsWith('//') ? 2 : 1).trim();
          break;
        case 'empty':
          // 空行无需额外处理
          break;
        default:
          break;
      }

      this.lines.push(parsedLine);
    }

    // 处理脚本末尾仍在@choice块内的情况
    if (inChoiceBlock) {
      finalizeChoiceBlock(rawLines.length);
      if (choiceOptions.length > 0) {
        this.lines[choiceStartLine]!.choices = choiceOptions;
      }
    }

    return this.lines;
  }

  /**
   * 分类行的类型
   * @param trimmed 去除前后空白的行文本
   * @param inChoiceBlock 是否在@choice块内
   * @returns 行类型
   */
  private classifyLine(trimmed: string, inChoiceBlock: boolean): LineType {
    // 空行
    if (trimmed === '') {
      return 'empty';
    }

    // 注释行（支持 // 与 # 两种注释风格）
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      return 'comment';
    }

    // 指令行（以@开头）
    if (trimmed.startsWith('@')) {
      return 'instruction';
    }

    // 在@choice块内的非指令行视为选项
    if (inChoiceBlock) {
      return 'choice';
    }

    // 旁白行（以"旁白:"开头）
    if (trimmed.startsWith('旁白:') || trimmed.startsWith('旁白：')) {
      return 'narration';
    }

    // 对话行（包含":"或"："且冒号前为角色名）
    const colonIndex = trimmed.indexOf(':');
    const cnColonIndex = trimmed.indexOf('：');
    const colonPos = colonIndex >= 0 ? colonIndex : cnColonIndex;
    if (colonPos > 0 && colonPos < 20) {
      // 冒号前为角色名（通常1-10字符）
      const speaker = trimmed.slice(0, colonPos).trim();
      // 角色名不应包含特殊字符或过长
      if (speaker.length > 0 && speaker.length < 20 && !/^[0-9]/.test(speaker)) {
        return 'dialog';
      }
    }

    // 默认视为旁白行（无角色名的描述文本）
    return 'narration';
  }

  /**
   * 提取对话行角色名
   * @param line 对话行文本
   * @returns 角色名
   */
  private extractSpeaker(line: string): string {
    const colonIndex = line.indexOf(':');
    const cnColonIndex = line.indexOf('：');
    const colonPos = colonIndex >= 0 ? colonIndex : cnColonIndex;
    return line.slice(0, colonPos).trim();
  }

  /**
   * 提取对话行内容
   * @param line 对话行文本
   * @returns 内容文本
   */
  private extractDialogContent(line: string): string {
    const colonIndex = line.indexOf(':');
    const cnColonIndex = line.indexOf('：');
    const colonPos = colonIndex >= 0 ? colonIndex : cnColonIndex;
    return line.slice(colonPos + 1).trim();
  }

  /**
   * 提取旁白行内容
   * @param line 旁白行文本
   * @returns 内容文本
   */
  private extractNarrationContent(line: string): string {
    // 去除"旁白:"前缀
    if (line.startsWith('旁白:') || line.startsWith('旁白：')) {
      const prefixLen = line.startsWith('旁白：') ? 3 : 3;
      return line.slice(prefixLen).trim();
    }
    return line;
  }

  /**
   * 解析指令行的指令名和参数
   * @param line 指令行文本
   * @returns Instruction对象
   */
  private parseInstruction(line: string): Instruction | null {
    // 提取指令名（@后面到空格或行末的部分）
    const match = line.match(/^@(\w+)(?:\s+(.*))?$/);
    if (!match) {
      return null;
    }

    const name = match[1] || '';
    const paramsStr = match[2] || '';

    // 解析参数
    const params = this.parseParams(paramsStr);
    const category = this.getInstructionCategory(name);

    return {
      name,
      category,
      params,
      raw: line,
    };
  }

  /**
   * 解析指令参数字符串
   * 支持格式：@bg ID / @set 变量名=值 / @perform charId pose=happy position=center
   * @param paramsStr 参数字符串
   * @returns 参数键值对
   */
  private parseParams(paramsStr: string): Record<string, string | number | boolean> {
    const params: Record<string, string | number | boolean> = {};

    if (!paramsStr) {
      return params;
    }

    // 按空格分割参数，支持 key=value 和裸值
    const tokens = paramsStr.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;
      // 去除引号
      const cleanToken = token.replace(/^["']|["']$/g, '');

      // key=value格式
      const eqIndex = cleanToken.indexOf('=');
      if (eqIndex > 0) {
        const key = cleanToken.slice(0, eqIndex);
        const value = cleanToken.slice(eqIndex + 1);
        params[key] = this.parseParamValue(value);
      } else if (i === 0 && tokens.length > 0) {
        // 第一个裸参数作为主参数（通常是ID或资源名）
        params['id'] = this.parseParamValue(cleanToken);
        params['value'] = this.parseParamValue(cleanToken);
      } else {
        // 其他裸参数按位置命名
        params[`arg${i}`] = this.parseParamValue(cleanToken);
      }
    }

    return params;
  }

  /**
   * 解析单个参数值（自动推断类型）
   * @param valueStr 原始值字符串
   * @returns 解析后的值
   */
  private parseParamValue(valueStr: string): string | number | boolean {
    // 布尔值
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;

    // 数字值
    const num = Number(valueStr);
    if (!isNaN(num) && valueStr !== '') {
      return num;
    }

    // 字符串值
    return valueStr;
  }

  /**
   * 根据指令名推断分类
   * @param name 指令名
   * @returns 指令分类
   */
  private getInstructionCategory(name: string): InstructionCategory {
    // 叙事类
    const narrativeNames = ['chapter', 'label', 'jump', 'chapter_end'];
    if (narrativeNames.includes(name)) return 'narrative';

    // 背景音频类
    const backgroundNames = ['bg', 'bgm', 'sfx', 'transition', 'web_bg', 'web_bgm', 'web_sfx'];
    if (backgroundNames.includes(name)) return 'background';

    // 角色显示类
    const characterNames = ['perform', 'pose', 'expression', 'char_flip', 'char_side', 'char_scale', 'char_move', 'char_rotate', 'char_fade', 'web_perform', 'char_animate'];
    if (characterNames.includes(name)) return 'character';

    // 屏幕特效类
    const effectNames = ['shake', 'flash', 'filter', 'text_color', 'css_transition', 'text_effect'];
    if (effectNames.includes(name)) return 'effect';

    // 变量输入类
    const variableNames = ['set', 'input'];
    if (variableNames.includes(name)) return 'variable';

    // 游戏系统类
    const systemNames = ['affection', 'achievement', 'event', 'choice', 'inline_choice', 'timed_choice', 'click_area', 'autosave', 'load_continue', 'if', 'if_show', 'endif'];
    if (systemNames.includes(name)) return 'gameSystem';

    // Web扩展类
    const webNames = ['wait', 'text_speed', 'dialog_style', 'notify', 'show_ui', 'hide_ui', 'video', 'video_stop'];
    if (webNames.includes(name)) return 'webExtension';

    // 默认归为webExtension
    return 'webExtension';
  }

  /**
   * 找到文本中的变量插值标记
   * @param text 待扫描文本
   * @returns 变量名列表（用于运行时替换）
   */
  private findInterpolations(text: string): string {
    // 标记变量插值位置，运行时由GameState替换
    // 这里返回原始文本，引擎执行时做实际替换
    return text;
  }

  /**
   * 剥离行内注释
   * 移除文本末尾由空格引导的 // 或 # 注释（如 "去图书馆 # 选项A" -> "去图书馆"）
   * @param text 原始文本
   * @returns 去除行内注释后的文本
   */
  private stripInlineComment(text: string): string {
    return text.replace(/\s+(?:\/\/|#).*$/, '').trim();
  }

  /**
   * 执行变量插值替换（运行时调用）
   * @param text 原始文本
   * @param variables 当前游戏变量表
   * @returns 替换后的文本
   */
  interpolate(text: string, variables: Map<string, string | number | boolean> | Record<string, string | number | boolean>): string {
    // 替换所有 {var_name} 格式的变量引用
    return text.replace(/\{([^}]+)\}/g, (match, varName) => {
      // 兼容Map和Record两种格式
      let value: string | number | boolean | undefined;
      if (variables instanceof Map) {
        value = variables.get(varName);
      } else {
        value = variables[varName];
      }
      if (value !== undefined) {
        return String(value);
      }
      // 变量不存在时保留原始标记
      return match;
    });
  }

  /** 获取标签位置映射 */
  getLabelMap(): Map<string, number> {
    return this.labelMap;
  }

  /** 获取章节位置映射 */
  getChapterMap(): Map<string, number> {
    return this.chapterMap;
  }

  /** 获取@choice块映射 */
  getChoiceBlocks(): Map<number, ChoiceBlock> {
    return this.choiceBlocks;
  }

  /** 获取已解析的行列表 */
  getLines(): ParsedLine[] {
    return this.lines;
  }

  /**
   * 获取指定标签的行号
   * @param labelName 标签名
   * @returns 行号，不存在时返回-1
   */
  getLabelLine(labelName: string): number {
    return this.labelMap.get(labelName) ?? -1;
  }

  /**
   * 获取指定章节的行号
   * @param chapterName 章节名
   * @returns 行号，不存在时返回-1
   */
  getChapterLine(chapterName: string): number {
    return this.chapterMap.get(chapterName) ?? -1;
  }
}
