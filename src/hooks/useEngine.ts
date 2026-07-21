// 引擎控制React Hook - 桥接EngineExecutor和React组件状态
// 提供加载脚本、推进对话、选择分支、存档读档等操作方法
// 将引擎内部状态映射为React state驱动UI渲染更新
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { EngineExecutor } from '@/engine/EngineExecutor';
import { LayerManager } from '@/engine/LayerManager';
import type { ChoiceOption, GameSave, UIPanelType } from '@/types/engine';
import type { PauseReason, EngineRunState, ClickAreaDef, NotificationParams } from '@/engine/types';
import type { HistoryEntry } from '@/components/engine/HistoryPanel';

/** useEngine返回值 */
interface UseEngineReturn {
  /** 引擎运行状态 */
  runState: EngineRunState;
  /** 引擎执行错误信息（null 表示无错误） */
  error: string | null;
  /** 当前暂停原因 */
  pauseReason: PauseReason | null;
  /** 当前对话角色名 */
  speaker: string;
  /** 当前对话文本 */
  dialogText: string;
  /** 对话框样式 */
  dialogStyle: 'normal' | 'none' | 'fullscreen';
  /** 逐字显示速度 */
  textSpeed: 'fast' | 'normal' | 'slow' | number;
  /** 当前选项列表 */
  choices: ChoiceOption[];
  /** 当前选择的提示语（问题文本） */
  choicePrompt: string;
  /** 是否自动播放 */
  isAutoPlay: boolean;
  /** 当前背景资源 */
  currentBackground: string;
  /** 当前BGM资源 */
  currentBgm: string;
  /** 可见UI面板集合 */
  visiblePanels: UIPanelType[];
  /** 通知参数 */
  notification: NotificationParams | null;
  /** 点击区域定义 */
  clickAreas: ClickAreaDef[];
  /** 对话历史记录 */
  history: HistoryEntry[];
  /** 加载脚本 */
  loadScript: (scriptText: string, projectId: string) => void;
  /** 设置资源映射表（角色立绘等资源路径，来自项目配置） */
  setResourceMap: (map: Record<string, string>) => void;
  /** 点击推进对话 */
  advance: () => void;
  /** 选择分支选项 */
  makeChoice: (index: number) => void;
  /** 输入变量值 */
  submitInput: (value: string) => void;
  /** 点击区域 */
  clickArea: (areaId: string) => void;
  /** 存档 */
  saveGame: (slot: number) => GameSave;
  /** 读档 */
  loadGame: (saveData: GameSave) => void;
  /** 开启自动播放 */
  startAutoPlay: (interval?: number) => void;
  /** 停止自动播放 */
  stopAutoPlay: () => void;
  /** 初始化Canvas */
  initCanvas: (bgCanvas: HTMLCanvasElement, charCanvas: HTMLCanvasElement) => void;
  /** 重置引擎 */
  reset: () => void;
}

/** 引擎控制React Hook */
export function useEngine(): UseEngineReturn {
  /** EngineExecutor实例ref */
  const executorRef = useRef<EngineExecutor>(new EngineExecutor());
  /** LayerManager实例ref */
  const layerManagerRef = useRef<LayerManager>(new LayerManager());

  // --- React 状态 ---
  const [runState, setRunState] = useState<EngineRunState>('idle');
  const [pauseReason, setPauseReason] = useState<PauseReason | null>(null);
  const [speaker, setSpeaker] = useState('');
  const [dialogText, setDialogText] = useState('');
  const [dialogStyle, setDialogStyle] = useState<'normal' | 'none' | 'fullscreen'>('normal');
  const [textSpeed, setTextSpeed] = useState<'fast' | 'normal' | 'slow' | number>('normal');
  const [choices, setChoices] = useState<ChoiceOption[]>([]);
  const [choicePrompt, setChoicePrompt] = useState('');
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [currentBackground, setCurrentBackground] = useState('');
  const [currentBgm, setCurrentBgm] = useState('');
  const [visiblePanels, setVisiblePanels] = useState<UIPanelType[]>([]);
  const [notification, setNotification] = useState<NotificationParams | null>(null);
  const [clickAreas, setClickAreas] = useState<ClickAreaDef[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  /** 引擎执行错误信息（供预览面板展示） */
  const [engineError, setEngineError] = useState<string | null>(null);

  /** 初始化引擎 - 注册事件回调 */
  useEffect(() => {
    const executor = executorRef.current;
    const lm = layerManagerRef.current;

    // 注册引擎事件回调
    executor.onEvent((eventType, data) => {
      switch (eventType) {
        case 'paused':
          const pauseData = data as { reason?: PauseReason; speaker?: string; content?: string };
          setRunState('paused');
          setPauseReason(pauseData?.reason || null);
          break;
        case 'line_executed':
          // 无特殊UI更新
          break;
        case 'choice_shown':
          setChoices(executor.getCurrentChoices());
          setChoicePrompt(executor.getCurrentChoicePrompt());
          break;
        case 'choice_made':
          setChoices([]);
          setChoicePrompt('');
          break;
        case 'script_loaded':
          setRunState('running');
          setPauseReason(null);
          setEngineError(null);
          break;
        case 'script_finished':
          setRunState('finished');
          setPauseReason(null);
          break;
        case 'scene_changed':
          // 场景切换更新
          break;
        case 'error':
          setRunState('error');
          setEngineError((data as { message?: string })?.message || '未知引擎错误');
          break;
      }
    });

    // 注册LayerManager回调
    lm.setDialogCallback((spk, txt, style) => {
      setSpeaker(spk);
      setDialogText(txt);
      if (style) setDialogStyle(style as 'normal' | 'none' | 'fullscreen');
      // 添加到历史记录
      setHistory((prev) => [...prev, { speaker: spk, text: txt }]);
    });

    lm.setChoiceCallback((options) => {
      setChoices(options);
    });

    lm.setBackgroundCallback((resource) => {
      setCurrentBackground(resource);
    });

    lm.setBgmCallback((resource) => {
      setCurrentBgm(resource);
    });

    lm.setUICallback((panel, action) => {
      if (action === 'show') {
        setVisiblePanels((prev) => [...prev, panel]);
      } else if (action === 'hide') {
        setVisiblePanels((prev) => prev.filter((p) => p !== panel));
      } else if (action === 'hideAll') {
        setVisiblePanels([]);
      }
    });

    lm.setNotifyCallback((params) => {
      setNotification(params);
    });

    // 将LayerManager绑定到EngineExecutor
    executor.setLayerManager(lm);

    return () => {
      executor.reset();
      lm.stopBGM();
    };
  }, []);

  /** 加载脚本 */
  const loadScript = useCallback((scriptText: string, projectId: string) => {
    executorRef.current.loadScript(scriptText, projectId);
    executorRef.current.safeExecute();
  }, []);

  /** 设置资源映射表 */
  const setResourceMap = useCallback((map: Record<string, string>) => {
    executorRef.current.setResourceMap(map);
  }, []);

  /** 点击推进对话 */
  const advance = useCallback(() => {
    executorRef.current.onAdvance();
    // 恢复运行状态
    setRunState(executorRef.current.getRunState());
    setPauseReason(executorRef.current.getPauseReason());
  }, []);

  /** 选择分支选项 */
  const makeChoice = useCallback((index: number) => {
    executorRef.current.onChoice(index);
    setRunState(executorRef.current.getRunState());
    setPauseReason(executorRef.current.getPauseReason());
    setChoices([]);
  }, []);

  /** 输入变量值 */
  const submitInput = useCallback((value: string) => {
    executorRef.current.onInput(value);
    setRunState(executorRef.current.getRunState());
    setPauseReason(executorRef.current.getPauseReason());
  }, []);

  /** 点击区域 */
  const clickArea = useCallback((areaId: string) => {
    executorRef.current.onClickArea(areaId);
    setRunState(executorRef.current.getRunState());
    setPauseReason(executorRef.current.getPauseReason());
    setClickAreas([]);
  }, []);

  /** 存档 */
  const saveGame = useCallback((slot: number): GameSave => {
    return executorRef.current.saveState(slot);
  }, []);

  /** 读档 */
  const loadGame = useCallback((saveData: GameSave) => {
    executorRef.current.loadState(saveData);
    setRunState(executorRef.current.getRunState());
    // 从存档恢复状态信息
    setCurrentBackground(saveData.currentBackground);
    setCurrentBgm(saveData.currentBgm);
  }, []);

  /** 开启自动播放 */
  const startAutoPlay = useCallback((interval: number = 3000) => {
    executorRef.current.startAutoPlay(interval);
    setIsAutoPlay(true);
  }, []);

  /** 停止自动播放 */
  const stopAutoPlay = useCallback(() => {
    executorRef.current.stopAutoPlay();
    setIsAutoPlay(false);
  }, []);

  /** 初始化Canvas */
  const initCanvas = useCallback((bgCanvas: HTMLCanvasElement, charCanvas: HTMLCanvasElement) => {
    // 创建临时DOM容器作为dialog和ui的占位
    const dialogDiv = document.createElement('div');
    const uiDiv = document.createElement('div');
    layerManagerRef.current.init(bgCanvas, charCanvas, dialogDiv, uiDiv);
  }, []);

  /** 重置引擎 */
  const reset = useCallback(() => {
    executorRef.current.reset();
    layerManagerRef.current.stopBGM();
    setRunState('idle');
    setPauseReason(null);
    setSpeaker('');
    setDialogText('');
    setChoices([]);
    setChoicePrompt('');
    setIsAutoPlay(false);
    setCurrentBackground('');
    setCurrentBgm('');
    setVisiblePanels([]);
    setNotification(null);
    setClickAreas([]);
    setHistory([]);
  }, []);

  return {
    runState,
    error: engineError,
    pauseReason,
    speaker,
    dialogText,
    dialogStyle,
    textSpeed,
    choices,
    choicePrompt,
    isAutoPlay,
    currentBackground,
    currentBgm,
    visiblePanels,
    notification,
    clickAreas,
    history,
    loadScript,
    setResourceMap,
    advance,
    makeChoice,
    submitInput,
    clickArea,
    saveGame,
    loadGame,
    startAutoPlay,
    stopAutoPlay,
    initCanvas,
    reset,
  };
}
