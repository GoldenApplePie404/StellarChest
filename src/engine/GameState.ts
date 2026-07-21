// 游戏状态管理 - 变量/好感度/行号/角色/背景/BGM等
// 提供getVariable/setVariable/getAffection/setAffection等存取方法
// 支持状态快照导出（存档）和恢复（读档）

import type { CharacterDisplayState, UIPanelType } from '@/types/engine';

/** 游戏状态管理类 */
export class GameStateManager {
  /** 游戏变量表 */
  private variables: Map<string, string | number | boolean> = new Map();
  /** 好感度映射表 */
  private affectionMap: Map<string, number> = new Map();
  /** 当前执行行号 */
  private currentLineIndex: number = 0;
  /** 当前章节标识 */
  private currentChapter: string = '';
  /** 已解锁成就集合 */
  private achievements: Set<string> = new Set();
  /** 角色显示状态映射 */
  private characterStates: Map<string, CharacterDisplayState> = new Map();
  /** 当前背景资源路径 */
  private currentBackground: string = '';
  /** 当前BGM资源路径 */
  private currentBgm: string = '';
  /** 对话框样式 */
  private dialogStyle: 'normal' | 'none' | 'fullscreen' = 'normal';
  /** 逐字显示速度 */
  private textSpeed: 'fast' | 'normal' | 'slow' | number = 'normal';
  /** 是否自动播放模式 */
  private autoPlay: boolean = false;
  /** 可见UI面板集合 */
  private visiblePanels: Set<UIPanelType> = new Set();
  /** 资源映射表（角色立绘/背景等资源路径，来自项目配置，非运行时存档状态） */
  private resourceMap: Record<string, string> = {};

  /**
   * 获取游戏变量值
   * @param name 变量名
   * @returns 变量值，不存在时返回undefined
   */
  getVariable(name: string): string | number | boolean | undefined {
    return this.variables.get(name);
  }

  /**
   * 设置游戏变量值
   * @param name 变量名
   * @param value 变量值
   */
  setVariable(name: string, value: string | number | boolean): void {
    this.variables.set(name, value);
  }

  /**
   * 删除游戏变量
   * @param name 变量名
   */
  deleteVariable(name: string): void {
    this.variables.delete(name);
  }

  /**
   * 获取所有变量（转为Record格式用于存档）
   * @returns 变量表的Record格式
   */
  getAllVariables(): Record<string, string | number | boolean> {
    const result: Record<string, string | number | boolean> = {};
    this.variables.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 批量恢复变量（从存档恢复）
   * @param vars 变量表Record格式
   */
  restoreVariables(vars: Record<string, string | number | boolean>): void {
    this.variables.clear();
    Object.entries(vars).forEach(([key, value]) => {
      this.variables.set(key, value);
    });
  }

  /**
   * 获取角色好感度
   * @param charId 角色ID
   * @returns 好感度数值，不存在时返回0
   */
  getAffection(charId: string): number {
    return this.affectionMap.get(charId) ?? 0;
  }

  /**
   * 设置角色好感度
   * @param charId 角色ID
   * @param value 好感度数值
   */
  setAffection(charId: string, value: number): void {
    this.affectionMap.set(charId, value);
  }

  /**
   * 增加好感度（增量累加）
   * @param charId 角色ID
   * @param delta 增量值（正数增加，负数减少）
   */
  addAffection(charId: string, delta: number): void {
    const current = this.getAffection(charId);
    this.affectionMap.set(charId, current + delta);
  }

  /**
   * 获取所有好感度（转为Record格式用于存档）
   * @returns 好感度映射的Record格式
   */
  getAllAffection(): Record<string, number> {
    const result: Record<string, number> = {};
    this.affectionMap.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 批量恢复好感度（从存档恢复）
   * @param map 好感度Record格式
   */
  restoreAffection(map: Record<string, number>): void {
    this.affectionMap.clear();
    Object.entries(map).forEach(([key, value]) => {
      this.affectionMap.set(key, value);
    });
  }

  /** 获取当前行号 */
  getCurrentLineIndex(): number {
    return this.currentLineIndex;
  }

  /** 设置当前行号 */
  setCurrentLineIndex(index: number): void {
    this.currentLineIndex = index;
  }

  /** 获取当前章节 */
  getCurrentChapter(): string {
    return this.currentChapter;
  }

  /** 设置当前章节 */
  setCurrentChapter(chapter: string): void {
    this.currentChapter = chapter;
  }

  /** 获取已解锁成就 */
  getAchievements(): Set<string> {
    return this.achievements;
  }

  /** 添加成就 */
  addAchievement(achievementId: string): void {
    this.achievements.add(achievementId);
  }

  /** 判断成就是否已解锁 */
  hasAchievement(achievementId: string): boolean {
    return this.achievements.has(achievementId);
  }

  /** 获取角色显示状态 */
  getCharacterState(charId: string): CharacterDisplayState | undefined {
    return this.characterStates.get(charId);
  }

  /** 设置角色显示状态 */
  setCharacterState(charId: string, state: CharacterDisplayState): void {
    this.characterStates.set(charId, state);
  }

  /** 获取所有角色显示状态 */
  getAllCharacterStates(): Record<string, CharacterDisplayState> {
    const result: Record<string, CharacterDisplayState> = {};
    this.characterStates.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /** 批量恢复角色状态 */
  restoreCharacterStates(states: Record<string, CharacterDisplayState>): void {
    this.characterStates.clear();
    Object.entries(states).forEach(([key, value]) => {
      this.characterStates.set(key, value);
    });
  }

  /** 移除角色显示 */
  removeCharacter(charId: string): void {
    this.characterStates.delete(charId);
  }

  /** 获取当前背景资源 */
  getCurrentBackground(): string {
    return this.currentBackground;
  }

  /** 设置当前背景资源 */
  setCurrentBackground(resource: string): void {
    this.currentBackground = resource;
  }

  /** 获取当前BGM资源 */
  getCurrentBgm(): string {
    return this.currentBgm;
  }

  /** 设置当前BGM资源 */
  setCurrentBgm(resource: string): void {
    this.currentBgm = resource;
  }

  /** 获取对话框样式 */
  getDialogStyle(): 'normal' | 'none' | 'fullscreen' {
    return this.dialogStyle;
  }

  /** 设置对话框样式 */
  setDialogStyle(style: 'normal' | 'none' | 'fullscreen'): void {
    this.dialogStyle = style;
  }

  /** 获取逐字显示速度 */
  getTextSpeed(): 'fast' | 'normal' | 'slow' | number {
    return this.textSpeed;
  }

  /** 设置逐字显示速度 */
  setTextSpeed(speed: 'fast' | 'normal' | 'slow' | number): void {
    this.textSpeed = speed;
  }

  /** 是否自动播放模式 */
  isAutoPlay(): boolean {
    return this.autoPlay;
  }

  /** 设置自动播放模式 */
  setAutoPlay(auto: boolean): void {
    this.autoPlay = auto;
  }

  /** 获取可见UI面板集合 */
  getVisiblePanels(): Set<UIPanelType> {
    return this.visiblePanels;
  }

  /** 显示UI面板 */
  showPanel(panel: UIPanelType): void {
    this.visiblePanels.add(panel);
  }

  /** 隐藏UI面板 */
  hidePanel(panel: UIPanelType): void {
    this.visiblePanels.delete(panel);
  }

  /** 隐藏所有UI面板 */
  hideAllPanels(): void {
    this.visiblePanels.clear();
  }

  /** 获取资源映射表（角色立绘等资源路径） */
  getResourceMap(): Record<string, string> {
    return this.resourceMap;
  }

  /** 设置资源映射表（来自项目配置 resourceMap） */
  setResourceMap(map: Record<string, string>): void {
    this.resourceMap = map || {};
  }

  /**
   * 导出状态快照（用于存档）
   * @returns 可序列化的状态对象
   */
  toSnapshot(): {
    variables: Record<string, string | number | boolean>;
    affectionMap: Record<string, number>;
    currentLineIndex: number;
    currentChapter: string;
    achievements: string[];
    characterStates: Record<string, CharacterDisplayState>;
    currentBackground: string;
    currentBgm: string;
    dialogStyle: string;
    textSpeed: string | number;
    autoPlay: boolean;
    resourceMap: Record<string, string>;
  } {
    return {
      variables: this.getAllVariables(),
      affectionMap: this.getAllAffection(),
      currentLineIndex: this.currentLineIndex,
      currentChapter: this.currentChapter,
      achievements: Array.from(this.achievements),
      characterStates: this.getAllCharacterStates(),
      currentBackground: this.currentBackground,
      currentBgm: this.currentBgm,
      dialogStyle: this.dialogStyle,
      textSpeed: this.textSpeed,
      autoPlay: this.autoPlay,
      resourceMap: this.resourceMap,
    };
  }

  /**
   * 从快照恢复状态（用于读档）
   * @param snapshot 可序列化的状态对象
   */
  fromSnapshot(snapshot: {
    variables: Record<string, string | number | boolean>;
    affectionMap: Record<string, number>;
    currentLineIndex: number;
    currentChapter: string;
    achievements: string[];
    characterStates: Record<string, CharacterDisplayState>;
    currentBackground: string;
    currentBgm: string;
    dialogStyle: string;
    textSpeed: string | number;
    autoPlay: boolean;
  }): void {
    this.restoreVariables(snapshot.variables);
    this.restoreAffection(snapshot.affectionMap);
    this.currentLineIndex = snapshot.currentLineIndex;
    this.currentChapter = snapshot.currentChapter;
    this.achievements = new Set(snapshot.achievements);
    this.restoreCharacterStates(snapshot.characterStates);
    this.currentBackground = snapshot.currentBackground;
    this.currentBgm = snapshot.currentBgm;
    this.dialogStyle = snapshot.dialogStyle as 'normal' | 'none' | 'fullscreen';
    this.textSpeed = snapshot.textSpeed as number | 'normal' | 'fast' | 'slow';
    this.autoPlay = snapshot.autoPlay;
    this.visiblePanels.clear();
  }

  /**
   * 重置为初始状态
   */
  reset(): void {
    this.variables.clear();
    this.affectionMap.clear();
    this.currentLineIndex = 0;
    this.currentChapter = '';
    this.achievements.clear();
    this.characterStates.clear();
    this.currentBackground = '';
    this.currentBgm = '';
    this.dialogStyle = 'normal';
    this.textSpeed = 'normal';
    this.autoPlay = false;
    this.visiblePanels.clear();
    // 注意：resourceMap 为项目配置，不随运行时状态重置，保持当前会话内有效
  }
}
