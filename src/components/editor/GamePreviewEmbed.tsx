// 内嵌实时预览 —— 用于编辑器「双栏」视图的右侧
// 复用引擎 Hook(useEngine) + GameCanvas/DialogBox/ChoicePanel，精简掉存档/菜单等 chrome，
// 脚本文本变化（防抖）后自动 reload，实现「编辑即预览」。
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEngine } from '@/hooks/useEngine';
import GameCanvas from '@/components/engine/GameCanvas';
import DialogBox from '@/components/engine/DialogBox';
import ChoicePanel from '@/components/engine/ChoicePanel';
import { RotateCcw, Play, Pause } from 'lucide-react';
import { fetchMergedResourceMap } from '@/lib/resourceMap';

interface Props {
  scriptText: string;
  projectId: string;
}

export default function GamePreviewEmbed({ scriptText, projectId }: Props): React.JSX.Element {
  const engine = useEngine();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [resourceMapReady, setResourceMapReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 拉取并合并资源映射：项目配置显式注册项优先，已上传资产按文件名自动并入，让 @perform/@bg/@bgm 解析到真实URL */
  const loadResourceMap = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('galgame_token') || '' : '';
    const headers = { Authorization: `Bearer ${token}` };
    fetchMergedResourceMap(projectId, headers)
      .then((map) => {
        engine.setResourceMap(map);
        setResourceMapReady(true);
      })
      .catch(() => {
        /* 资源映射获取失败时立绘可能取不到，但脚本仍可运行 */
      });
  }, [projectId, engine.setResourceMap]);

  // 挂载时加载；素材库插入新素材并注册资源映射后，实时刷新预览可用的资源表
  useEffect(() => {
    loadResourceMap();
    const onUpdate = () => loadResourceMap();
    window.addEventListener('galgame-resourcemap-updated', onUpdate);
    return () => window.removeEventListener('galgame-resourcemap-updated', onUpdate);
  }, [loadResourceMap]);

  /** 脚本变化防抖后重载（实时预览） */
  useEffect(() => {
    if (!scriptText || !resourceMapReady) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      engine.loadScript(scriptText, projectId);
      setScriptLoaded(true);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scriptText, projectId, engine.loadScript, resourceMapReady]);

  const handleBgCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    const charCanvas = document.getElementById('char-canvas') as HTMLCanvasElement | null;
    if (charCanvas) engine.initCanvas(canvas, charCanvas);
  }, [engine.initCanvas]);

  const handleCanvasClick = useCallback(() => {
    if (engine.pauseReason === 'click_advance') engine.advance();
  }, [engine.pauseReason, engine.advance]);

  const handleChoice = useCallback((i: number) => engine.makeChoice(i), [engine.makeChoice]);

  const rerun = useCallback(() => {
    if (scriptText && resourceMapReady) {
      engine.loadScript(scriptText, projectId);
      setScriptLoaded(true);
    }
  }, [scriptText, projectId, engine.loadScript, resourceMapReady]);

  const toggleAuto = useCallback(() => {
    if (engine.isAutoPlay) engine.stopAutoPlay();
    else engine.startAutoPlay();
  }, [engine.isAutoPlay, engine.startAutoPlay, engine.stopAutoPlay]);

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: '#0c0c10' }}>
      {/* 迷你控制条 */}
      <div
        className="flex items-center gap-2 px-3 h-9 flex-shrink-0 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#16161D' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>实时预览</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            color: engine.runState === 'error' ? '#FF8A8A' : 'rgba(255,255,255,0.45)',
            background: engine.runState === 'error' ? 'rgba(255,80,80,0.15)' : 'rgba(255,255,255,0.06)',
          }}
        >
          {engine.runState === 'error' ? '出错' : engine.runState === 'finished' ? '已结束' : engine.runState === 'paused' ? (engine.pauseReason === 'click_advance' ? '等待点击' : engine.pauseReason || '暂停') : engine.runState === 'running' ? '运行中' : '空闲'}
        </span>
        <div className="flex-1" />
        <button
          onClick={rerun}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
          style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)' }}
        >
          <RotateCcw size={12} /> 重跑
        </button>
        <button
          onClick={toggleAuto}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
          style={{
            color: engine.isAutoPlay ? '#98E8C8' : 'rgba(255,255,255,0.6)',
            background: engine.isAutoPlay ? 'rgba(152,232,200,0.15)' : 'rgba(255,255,255,0.06)',
          }}
        >
          {engine.isAutoPlay ? <Pause size={12} /> : <Play size={12} />} 自动
        </button>
      </div>

      {/* 画布区 */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-3">
        <div className="relative w-full max-w-[1280px] aspect-[16/9]">
          <GameCanvas
            width={1280}
            height={720}
            onBgCanvasReady={handleBgCanvasReady}
            onCharCanvasReady={() => {}}
            onCanvasClick={handleCanvasClick}
          />

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

          {engine.choices.length > 0 && (
            <ChoicePanel
              options={engine.choices}
              prompt={engine.choicePrompt}
              timed={engine.pauseReason === 'choice' && engine.runState === 'paused'}
              onChoice={handleChoice}
            />
          )}
        </div>
      </div>

      {!scriptLoaded && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span className="text-sm">编辑脚本即可实时预览…</span>
        </div>
      )}

      {/* 引擎错误可见化：避免整屏静默卡死，便于定位运行时异常 */}
      {engine.runState === 'error' && engine.error && (
        <div
          className="absolute inset-0 overflow-auto p-4 z-50"
          style={{ background: 'rgba(30,0,0,0.92)', color: '#FFB4B4' }}
        >
          <div className="font-bold mb-2 text-sm">引擎执行出错</div>
          <pre className="text-[11px] whitespace-pre-wrap leading-relaxed">{engine.error}</pre>
          <div className="mt-3 text-[11px]" style={{ color: 'rgba(255,180,180,0.7)' }}>
            请把上方错误信息发给我，即可定位并修复。
          </div>
        </div>
      )}
    </div>
  );
}
