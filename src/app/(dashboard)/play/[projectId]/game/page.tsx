// 游戏渲染页（免登录） - 复用引擎组件加载已发布作品
// 调用公开API获取脚本，不计入登录态
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
import type { GameSave } from '@/types/engine';
import type { ClickAreaDef } from '@/engine/types';

/** 游戏渲染页 */
export default function GamePage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const projectId = (params as Record<string, string>).projectId || '';

  const engine = useEngine();

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'save' | 'load' | 'history' | 'menu'>('none');
  const [playCounted, setPlayCounted] = useState(false);

  /** 获取项目文件并加载脚本（通过公开API） */
  useEffect(() => {
    if (!projectId || scriptLoaded) return;

    const loadScript = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // 1. 获取已发布项目详情（包含文件列表）
        const projectRes = await fetch(`/api/projects/published/${projectId}`);
        const projectData = await projectRes.json();

        if (projectData.code !== 200 || !projectData.data) {
          throw new Error(projectData.message || '获取项目信息失败');
        }

        const project = projectData.data;
        const files: Array<{ id: string; fileType: string; storagePath: string }> = project.files || [];

        // 2. 找到第一个脚本文件
        const scriptFile = files.find((f: { fileType: string }) => f.fileType === 'script');
        if (!scriptFile) {
          throw new Error('作品中没有脚本文件');
        }

        // 3. 获取脚本内容 — 从公开接口获取
        const contentRes = await fetch(`/api/projects/${projectId}/files/${scriptFile.id}/content`);
        const contentData = await contentRes.json();

        if (contentData.code === 200 && contentData.data && contentData.data.content) {
          const scriptText = contentData.data.content as string;
          // 加载项目配置中的资源映射表（角色立绘等），供 @perform/@pose 解析图片
          const resourceMap = (project.config?.resourceMap || {}) as Record<string, string>;
          engine.setResourceMap(resourceMap);
          engine.loadScript(scriptText, projectId);
          setScriptLoaded(true);
        } else {
          throw new Error(contentData.message || '加载脚本内容失败');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载失败';
        setLoadError(message);
        console.error('游戏加载失败:', message);
      } finally {
        setIsLoading(false);
      }
    };

    loadScript();
  }, [projectId, scriptLoaded, engine.loadScript]);

  /** 进入游戏后增加游玩计数（仅一次） */
  useEffect(() => {
    if (scriptLoaded && !playCounted) {
      setPlayCounted(true);
      fetch(`/api/projects/${projectId}/play`, { method: 'POST' }).catch(() => {});
    }
  }, [scriptLoaded, playCounted, projectId]);

  /** Canvas就绪回调 */
  const handleBgCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    const charCanvas = document.getElementById('char-canvas') as HTMLCanvasElement | null;
    if (charCanvas) {
      engine.initCanvas(canvas, charCanvas);
    }
  }, [engine.initCanvas]);

  const handleCharCanvasReady = useCallback((_canvas: HTMLCanvasElement) => {
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
        router.push(`/play/${projectId}`);
        break;
      default:
        break;
    }
    setActivePanel('none');
  }, [engine.reset, router, projectId]);

  /** 点击区域 */
  const activeClickAreas: ClickAreaDef[] = engine.pauseReason === 'click_area'
    ? engine.clickAreas
    : [];

  /** 通知关闭回调 */
  const handleNotificationClose = useCallback(() => {
    // 通知条自动消失后清除状态
  }, []);

  /** 游戏画面全屏容器样式 */
  const gameContainerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
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
                返回作品页
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
            <div className="text-white text-xl mb-4">正在加载游戏...</div>
            <div className="text-white/40 text-sm">
              正在获取作品数据
            </div>
          </div>
        </div>
      )}

      {/* 加载错误 */}
      {!isLoading && loadError && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="text-center bg-black/60 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-4">
            <div className="text-white text-xl mb-2">加载失败</div>
            <p className="text-white/60 text-sm mb-6">{loadError}</p>
            <button
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-all mr-3"
              onClick={() => { setScriptLoaded(false); setLoadError(null); }}
            >
              重试
            </button>
            <button
              className="px-6 py-2 bg-white/10 text-white rounded-md hover:bg-white/20 transition-all"
              onClick={() => router.push(`/play/${projectId}`)}
            >
              返回作品页
            </button>
          </div>
        </div>
      )}

      {/* 未加载脚本提示 */}
      {!isLoading && !loadError && !scriptLoaded && engine.runState === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="text-white text-xl mb-4">加载脚本数据...</div>
            <div className="text-white/40 text-sm">
              请确保作品已包含脚本内容
            </div>
            <button
              className="mt-4 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-all"
              onClick={() => router.push(`/play/${projectId}`)}
            >
              返回作品页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
