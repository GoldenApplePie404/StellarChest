// 全屏游戏预览页面 - 加载项目脚本并启动引擎运行游戏
// 包含GameCanvas/DialogBox/ChoicePanel/ControlBar等引擎组件
// 通过useEngine Hook桥接引擎与React组件状态
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEngine } from '@/hooks/useEngine';
import GameCanvas from '@/components/engine/GameCanvas';
import DialogBox from '@/components/engine/DialogBox';
import ChoicePanel from '@/components/engine/ChoicePanel';
import SaveLoadPanel from '@/components/engine/SaveLoadPanel';
import ControlBar from '@/components/engine/ControlBar';
import HistoryPanel from '@/components/engine/HistoryPanel';
import NotificationBar from '@/components/engine/NotificationBar';
import ClickAreaOverlay from '@/components/engine/ClickAreaOverlay';
import { fetchMergedResourceMap } from '@/lib/resourceMap';
import type { GameSave } from '@/types/engine';
import type { ClickAreaDef } from '@/engine/types';

/** 预览页面组件 */
export default function PreviewPage(): React.JSX.Element {
  /** 动态路由参数 */
  const params = useParams();
  const router = useRouter();
  const projectId = (params as Record<string, string>).id || '';

  /** useEngine Hook获取引擎状态和方法 */
  const engine = useEngine();

  /** 脚本内容是否已加载 */
  const [scriptLoaded, setScriptLoaded] = useState(false);
  /** 加载状态 */
  const [isLoading, setIsLoading] = useState(true);
  /** 当前可见的面板 */
  const [activePanel, setActivePanel] = useState<'none' | 'save' | 'load' | 'history' | 'menu'>('none');
  /** Canvas 是否已就绪（避免脚本在 canvas 初始化前执行，导致背景/立绘无法绘制） */
  const [canvasReady, setCanvasReady] = useState(false);
  /** 是否显示诊断浮层（调试用，帮助定位黑屏/卡死） */
  const [showDebug, setShowDebug] = useState(true);
  /** 已合并的资源映射表（诊断用） */
  const [resourceMap, setResourceMap] = useState<Record<string, string>>({});

  /** 获取认证头 */
  function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('galgame_token') || '' : '';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /** 加载项目脚本 — 优先从API获取，失败时回退到localStorage */
  useEffect(() => {
    // 必须等 Canvas 就绪后再加载并执行脚本，否则 @bg/@perform 等依赖 Canvas 的指令会直接 return，画面全黑
    if (!projectId || scriptLoaded || !canvasReady) return;

    const loadScript = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const headers = getAuthHeaders();

        // 1. 获取文件列表
        const filesRes = await fetch(`/api/projects/${projectId}/files`, { headers });
        const filesData = await filesRes.json();

        if (filesData.code !== 200 || !filesData.data || !Array.isArray(filesData.data)) {
          throw new Error(filesData.message || '获取文件列表失败');
        }

        const files: Array<{ id: string; fileType: string }> = filesData.data;

        // 2. 找到第一个脚本文件
        const scriptFile = files.find((f) => f.fileType === 'script');
        if (!scriptFile) {
          throw new Error('项目中没有脚本文件');
        }

        // 3. 加载脚本内容
        const contentRes = await fetch(
          `/api/projects/${projectId}/files/${scriptFile.id}/content`,
          { headers },
        );
        const contentData = await contentRes.json();

        if (contentData.code === 200 && contentData.data && contentData.data.content) {
          const scriptText = contentData.data.content as string;
          // 加载资源映射表：项目配置里显式注册的项优先，已上传资产按文件名自动并入（见 fetchMergedResourceMap）
          const resourceMap = await fetchMergedResourceMap(projectId, headers);
          setResourceMap(resourceMap);
          engine.setResourceMap(resourceMap);
          engine.loadScript(scriptText, projectId);
          // 同步缓存到localStorage
          localStorage.setItem(`galgame_script_${projectId}`, scriptText);
          setScriptLoaded(true);
        } else {
          throw new Error(contentData.message || '加载脚本内容失败');
        }
      } catch (err) {
        console.warn('API加载脚本失败，尝试localStorage回退:', err instanceof Error ? err.message : err);
        // 回退到localStorage
        const scriptKey = `galgame_script_${projectId}`;
        const scriptText = localStorage.getItem(scriptKey);

        if (scriptText) {
          engine.loadScript(scriptText, projectId);
          setScriptLoaded(true);
        } else {
          console.warn('未找到项目脚本数据，请先在编辑器中保存脚本');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadScript();
  }, [projectId, scriptLoaded, canvasReady, engine.loadScript]);

  /** Canvas就绪回调 */
  const handleBgCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    // 获取立绘Canvas元素
    const charCanvas = document.getElementById('char-canvas') as HTMLCanvasElement | null;
    if (charCanvas) {
      engine.initCanvas(canvas, charCanvas);
      setCanvasReady(true);
    }
  }, [engine.initCanvas]);

  const handleCharCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    // 已在bgCanvas回调中统一初始化
  }, []);

  /** Canvas区域点击回调 */
  const handleCanvasClick = useCallback(() => {
    if (engine.pauseReason === 'click_advance') {
      engine.advance();
    }
  }, [engine.pauseReason, engine.advance]);

  /** 选择分支回调 */
  const handleChoice = useCallback((index: number) => {
    engine.makeChoice(index);
  }, [engine.makeChoice]);

  /** 存档回调 */
  const handleSave = useCallback((slot: number) => {
    engine.saveGame(slot);
  }, [engine.saveGame]);

  /** 读档回调 */
  const handleLoad = useCallback((saveData: GameSave) => {
    engine.loadGame(saveData);
    setActivePanel('none');
  }, [engine.loadGame]);

  /** 自动播放切换 */
  const handleAutoPlayToggle = useCallback(() => {
    if (engine.isAutoPlay) {
      engine.stopAutoPlay();
    } else {
      engine.startAutoPlay();
    }
  }, [engine.isAutoPlay, engine.startAutoPlay, engine.stopAutoPlay]);

  /** 关闭面板回调 */
  const handleClosePanel = useCallback(() => {
    setActivePanel('none');
  }, []);

  /** 菜单操作 */
  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'restart':
        engine.reset();
        setScriptLoaded(false);
        break;
      case 'back':
        router.push(`/projects/${projectId}`);
        break;
      default:
        break;
    }
    setActivePanel('none');
  }, [engine.reset, router, projectId]);

  /** 将@click_area数据转换为ClickAreaDef格式 */
  const activeClickAreas: ClickAreaDef[] = engine.pauseReason === 'click_area'
    ? (() => {
        const pending = engine.clickAreas;
        if (pending.length > 0) return pending;
        // 从executor获取pendingClickArea信息
        return [];
      })()
    : [];

  /** 通知关闭回调 */
  const handleNotificationClose = useCallback(() => {
    // 通知条自动消失后清除状态
  }, []);

  /** 游戏画面容器样式（外层 h-screen 撑开 main，内层 absolute 避免受 page-transition transform 影响） */
  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100vh',
  };

  const gameContainerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
    <div style={wrapperStyle}>
      <div style={gameContainerStyle}>
        {/* 游戏画面层 */}
      <div className="relative w-full max-w-[1280px] aspect-[16/9]">
        {/* 双层Canvas */}
        <GameCanvas
          width={1280}
          height={720}
          onBgCanvasReady={handleBgCanvasReady}
          onCharCanvasReady={handleCharCanvasReady}
          onCanvasClick={handleCanvasClick}
        />

        {/* 对话框层 */}
        {engine.dialogText && (
          <DialogBox
            speaker={engine.speaker}
            text={engine.dialogText}
            textSpeed={engine.textSpeed}
            dialogStyle={engine.dialogStyle}
            isWaiting={engine.pauseReason === 'click_advance'}
            onAdvance={engine.advance}
            className="pointer-events-auto"
          />
        )}

        {/* 选择面板层 */}
        {engine.choices.length > 0 && (
          <ChoicePanel
            options={engine.choices}
            prompt={engine.choicePrompt}
            timed={engine.pauseReason === 'choice' && engine.runState === 'paused'}
            onChoice={handleChoice}
          />
        )}

        {/* 点击区域覆盖层 */}
        {activeClickAreas.length > 0 && (
          <ClickAreaOverlay
            areas={activeClickAreas}
            onAreaClick={engine.clickArea}
            containerWidth={1280}
            containerHeight={720}
          />
        )}

        {/* 底部控制栏 */}
        <ControlBar
          isAutoPlay={engine.isAutoPlay}
          runState={engine.runState}
          onSaveClick={() => setActivePanel('save')}
          onLoadClick={() => setActivePanel('load')}
          onAutoPlayToggle={handleAutoPlayToggle}
          onHistoryClick={() => setActivePanel('history')}
          onMenuClick={() => setActivePanel('menu')}
        />
      </div>

      {/* 存档面板 */}
      {activePanel === 'save' && (
        <SaveLoadPanel
          mode="save"
          projectId={projectId}
          onSave={handleSave}
          onClose={handleClosePanel}
        />
      )}

      {/* 读档面板 */}
      {activePanel === 'load' && (
        <SaveLoadPanel
          mode="load"
          projectId={projectId}
          onLoad={handleLoad}
          onClose={handleClosePanel}
        />
      )}

      {/* 历史回看面板 */}
      {activePanel === 'history' && (
        <HistoryPanel
          history={engine.history}
          onClose={handleClosePanel}
        />
      )}

      {/* 菜单面板 */}
      {activePanel === 'menu' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClosePanel} />
          <div
            className="relative w-64 bg-card rounded-xl shadow-hover p-6 animate-fade-in"
            style={{ background: 'rgba(30, 30, 40, 0.95)', border: '1px solid var(--color-primary)' }}
          >
            <h3 className="text-lg font-bold text-white mb-4">菜单</h3>
            <div className="flex flex-col gap-3">
              <button
                className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-primary/20 transition-all"
                onClick={() => handleMenuAction('restart')}
              >
                重新开始
              </button>
              <button
                className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-primary/20 transition-all"
                onClick={() => handleMenuAction('back')}
              >
                返回项目
              </button>
              <button
                className="px-4 py-2 bg-white/10 text-white rounded-md hover:bg-primary/20 transition-all"
                onClick={handleClosePanel}
              >
                继续游戏
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 通知条 */}
      {engine.notification && (
        <NotificationBar
          text={engine.notification.text}
          type={engine.notification.type}
          duration={engine.notification.duration}
          onClose={handleNotificationClose}
        />
      )}

      {/* 加载中提示 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-3"
              style={{ borderColor: 'rgba(255,126,179,0.3)', borderTopColor: '#FF7EB3' }} />
            <div className="text-white text-xl mb-4">加载脚本数据...</div>
            <div className="text-white/40 text-sm">
              正在从服务器获取项目脚本
            </div>
          </div>
        </div>
      )}

      {/* 未加载脚本提示 */}
      {!isLoading && !scriptLoaded && engine.runState === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="text-white text-xl mb-4">加载脚本数据...</div>
            <div className="text-white/40 text-sm">
              请确保已在编辑器中保存脚本内容
            </div>
            <button
              className="mt-4 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-all"
              onClick={() => router.push(`/projects/${projectId}`)}
            >
              返回编辑器
            </button>
          </div>
        </div>
      )}
      {/* 诊断浮层：调试用，显示引擎运行状态以定位黑屏/卡死 */}
      {showDebug && (
        <div
          className="absolute top-2 left-2 z-50 rounded p-3 text-xs font-mono"
          style={{ background: 'rgba(0,0,0,0.75)', color: '#FF7EB3', border: '1px solid rgba(255,126,179,0.4)', maxWidth: 320 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span>预览诊断</span>
            <button
              className="text-white/60 hover:text-white ml-3"
              onClick={() => setShowDebug(false)}
            >
              隐藏
            </button>
          </div>
          <div className="space-y-1 text-white/90">
            <div>scriptLoaded: <span className="text-white">{String(scriptLoaded)}</span></div>
            <div>canvasReady: <span className="text-white">{String(canvasReady)}</span></div>
            <div>runState: <span className="text-white">{engine.runState}</span></div>
            <div>pauseReason: <span className="text-white">{engine.pauseReason ?? 'null'}</span></div>
            <div>dialogStyle: <span className="text-white">{engine.dialogStyle}</span></div>
            <div>dialogText: <span className="text-white">{engine.dialogText ? `${engine.dialogText.slice(0, 40)}${engine.dialogText.length > 40 ? '…' : ''}` : '（空）'}</span></div>
            <div>currentBackground: <span className="text-white">{engine.currentBackground || '（无）'}</span></div>
            <div>currentBgm: <span className="text-white">{engine.currentBgm || '（无）'}</span></div>
            <div>choices: <span className="text-white">{engine.choices.length}</span></div>
            <div>error: <span className="text-white">{engine.error || 'null'}</span></div>
            <div>resourceMap: <span className="text-white">{Object.keys(resourceMap).length ? Object.keys(resourceMap).join(', ') : '（空）'}</span></div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
