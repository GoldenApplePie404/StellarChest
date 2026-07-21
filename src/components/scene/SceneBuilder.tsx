// 场景构建器主组件 - WYSIWYG场景编辑器
'use client';

import { useState, useCallback } from 'react';
import ResourcePanel from './ResourcePanel';
import ScenePreview from './ScenePreview';
import CharacterList from './CharacterList';
import PropertyPanel from './PropertyPanel';
import ScriptExporter from './ScriptExporter';
import Button from '@/components/ui/Button';
import type { Asset } from '@/types/asset';

/** 场景中角色的数据结构 */
export interface SceneCharacter {
  /** 唯一标识（本地生成） */
  id: string;
  /** 素材ID */
  charId: string;
  /** 角色名称 */
  name: string;
  /** 角色图片URL */
  url: string;
  /** 位置 */
  position: 'left' | 'center' | 'right';
  /** 缩放（0.5 ~ 2.0） */
  scale: number;
  /** 表情 */
  expression: string;
  /** 是否水平翻转 */
  flip: boolean;
}

/** 场景快照（用于撤销/重做） */
interface SceneSnapshot {
  selectedBg: Asset | null;
  characters: SceneCharacter[];
  dialogSpeaker: string;
  dialogText: string;
}

/** 生成唯一ID */
let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `char_${Date.now()}_${idCounter}`;
}

/** 场景构建器组件 */
export default function SceneBuilder(): React.JSX.Element {
  /** 场景名称 */
  const [sceneName, setSceneName] = useState<string>('');
  /** 选中的背景图 */
  const [selectedBg, setSelectedBg] = useState<Asset | null>(null);
  /** 角色列表 */
  const [characters, setCharacters] = useState<SceneCharacter[]>([]);
  /** 当前选中的角色ID */
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  /** 对话框说话者 */
  const [dialogSpeaker, setDialogSpeaker] = useState<string>('');
  /** 对话框文本 */
  const [dialogText, setDialogText] = useState<string>('');
  /** 撤销/重做历史栈 */
  const [history, setHistory] = useState<SceneSnapshot[]>([]);
  /** 当前历史位置 */
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  /** 导出弹窗可见性 */
  const [exportVisible, setExportVisible] = useState<boolean>(false);

  /** 保存当前快照到历史 */
  const pushSnapshot = useCallback(
    (bg: Asset | null, chars: SceneCharacter[], speaker: string, text: string) => {
      const snapshot: SceneSnapshot = {
        selectedBg: bg ? { ...bg } : null,
        characters: chars.map((c) => ({ ...c })),
        dialogSpeaker: speaker,
        dialogText: text,
      };
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, snapshot];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  /** 选择背景图 */
  const handleSelectBg = useCallback(
    (asset: Asset) => {
      setSelectedBg(asset);
      pushSnapshot(asset, characters, dialogSpeaker, dialogText);
    },
    [characters, dialogSpeaker, dialogText, pushSnapshot],
  );

  /** 拖拽角色开始 */
  const handleDragCharStart = useCallback((_asset: Asset) => {
    // 更新拖拽状态（由drop事件触发实际添加）
  }, []);

  /** 处理拖拽放置到场景 */
  const handleDropOnScene = useCallback(
    (asset: Asset) => {
      const newChar: SceneCharacter = {
        id: generateId(),
        charId: asset.id,
        name: asset.name,
        url: asset.url || asset.fileUrl || '',
        position: 'center',
        scale: 1.0,
        expression: '',
        flip: false,
      };
      const newChars = [...characters, newChar];
      setCharacters(newChars);
      setSelectedCharId(newChar.id);
      pushSnapshot(selectedBg, newChars, dialogSpeaker, dialogText);
    },
    [characters, selectedBg, dialogSpeaker, dialogText, pushSnapshot],
  );

  /** 更新角色属性 */
  const handleUpdateChar = useCallback(
    (id: string, updates: Partial<SceneCharacter>) => {
      const newChars = characters.map((c) => (c.id === id ? { ...c, ...updates } : c));
      setCharacters(newChars);
      pushSnapshot(selectedBg, newChars, dialogSpeaker, dialogText);
    },
    [characters, selectedBg, dialogSpeaker, dialogText, pushSnapshot],
  );

  /** 移除角色 */
  const handleRemoveChar = useCallback(
    (id: string) => {
      const newChars = characters.filter((c) => c.id !== id);
      setCharacters(newChars);
      if (selectedCharId === id) {
        setSelectedCharId(null);
      }
      pushSnapshot(selectedBg, newChars, dialogSpeaker, dialogText);
    },
    [characters, selectedCharId, selectedBg, dialogSpeaker, dialogText, pushSnapshot],
  );

  /** 撤销 */
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    if (snapshot) {
      setSelectedBg(snapshot.selectedBg);
      setCharacters(snapshot.characters);
      setDialogSpeaker(snapshot.dialogSpeaker);
      setDialogText(snapshot.dialogText);
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, history]);

  /** 重做 */
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    if (snapshot) {
      setSelectedBg(snapshot.selectedBg);
      setCharacters(snapshot.characters);
      setDialogSpeaker(snapshot.dialogSpeaker);
      setDialogText(snapshot.dialogText);
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, history]);

  /** 更新对话框说话者 */
  const handleUpdateDialogSpeaker = useCallback(
    (speaker: string) => {
      setDialogSpeaker(speaker);
    },
    [],
  );

  /** 更新对话框文本 */
  const handleUpdateDialogText = useCallback(
    (text: string) => {
      setDialogText(text);
    },
    [],
  );

  /** 打开导出弹窗 */
  const handleOpenExport = useCallback(() => {
    setExportVisible(true);
  }, []);

  /** 关闭导出弹窗 */
  const handleCloseExport = useCallback(() => {
    setExportVisible(false);
  }, []);

  /** 选中角色 */
  const handleSelectChar = useCallback((id: string) => {
    setSelectedCharId((prev) => (prev === id ? null : id));
  }, []);

  /** 当前选中的角色对象 */
  const selectedChar = selectedCharId
    ? characters.find((c) => c.id === selectedCharId) || null
    : null;

  /** 拖拽放置处理 */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        const data = e.dataTransfer.getData('application/json');
        if (data) {
          const asset = JSON.parse(data) as Asset;
          handleDropOnScene(asset);
        }
      } catch {
        // 解析失败，忽略
      }
    },
    [handleDropOnScene],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="text"
            className="px-2.5 py-1.5 rounded-lg text-sm border outline-none transition-colors w-32 sm:w-36"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#E2D0F5',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            placeholder="场景名称"
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              className="p-1.5 rounded-lg transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)' }}
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="撤销"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
            <button
              className="p-1.5 rounded-lg transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)' }}
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="重做"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenExport}>
          导出
        </Button>
      </div>

      {/* 资源面板（全宽） */}
      <ResourcePanel
        onSelectBg={handleSelectBg}
        onDragCharStart={handleDragCharStart}
        selectedBgId={selectedBg?.id}
      />

      {/* 场景预览（拖拽放置区） */}
      <div
        className="flex items-center justify-center rounded-lg overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ScenePreview
          backgroundUrl={selectedBg?.url || selectedBg?.fileUrl}
          characters={characters}
          dialogSpeaker={dialogSpeaker}
          dialogText={dialogText}
        />
      </div>

      {/* 角色列表 */}
      <CharacterList
        characters={characters}
        selectedId={selectedCharId}
        onSelect={handleSelectChar}
        onRemove={handleRemoveChar}
      />

      {/* 属性面板 */}
      <PropertyPanel
        selectedChar={selectedChar}
        onUpdateChar={handleUpdateChar}
        dialogSpeaker={dialogSpeaker}
        dialogText={dialogText}
        onUpdateDialogSpeaker={handleUpdateDialogSpeaker}
        onUpdateDialogText={handleUpdateDialogText}
      />

      {/* 导出弹窗 */}
      <ScriptExporter
        visible={exportVisible}
        onClose={handleCloseExport}
        sceneName={sceneName}
        backgroundId={selectedBg?.id || ''}
        characters={characters}
        dialogSpeaker={dialogSpeaker}
        dialogText={dialogText}
      />
    </div>
  );
}
