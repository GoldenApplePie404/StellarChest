// 角色列表组件 - 显示当前场景中已放置的角色
'use client';

import { useCallback } from 'react';
import type { SceneCharacter } from './SceneBuilder';

/** 角色位置文字映射 */
const POSITION_LABEL: Record<string, string> = {
  left: '左侧',
  center: '中间',
  right: '右侧',
};

/** 角色列表属性 */
interface CharacterListProps {
  /** 角色列表 */
  characters: SceneCharacter[];
  /** 当前选中的角色ID */
  selectedId: string | null;
  /** 选中角色回调 */
  onSelect: (id: string) => void;
  /** 移除角色回调 */
  onRemove: (id: string) => void;
}

/** 角色列表组件 */
export default function CharacterList({
  characters,
  selectedId,
  onSelect,
  onRemove,
}: CharacterListProps): React.JSX.Element {
  /** 处理移除 */
  const handleRemove = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onRemove(id);
    },
    [onRemove],
  );

  if (characters.length === 0) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <h4 className="text-sm font-bold mb-2" style={{ color: '#E2D0F5' }}>角色列表</h4>
        <div className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          暂无角色，从上方资源面板拖拽角色到场景中
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <h4 className="text-sm font-bold mb-3" style={{ color: '#E2D0F5' }}>
        角色列表
        <span className="ml-2 text-xs font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>({characters.length})</span>
      </h4>
      <div className="space-y-2">
        {characters.map((char) => {
          const isSelected = selectedId === char.id;
          return (
            <div
              key={char.id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 border ${
                isSelected
                  ? 'border-[#FF9BB5]/40'
                  : 'border-transparent hover:border-[#FF9BB5]/20'
              }`}
              style={isSelected ? { background: 'rgba(255,155,181,0.1)' } : { background: 'transparent' }}
              onClick={() => onSelect(char.id)}
            >
              {/* 角色缩略图 */}
              <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <img
                  src={char.url}
                  alt={char.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* 角色信息 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: '#E2D0F5' }}>
                  {char.name || char.charId}
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {POSITION_LABEL[char.position] || char.position}
                  <span className="mx-1">·</span>
                  缩放 {char.scale.toFixed(1)}x
                  {char.flip && <span className="ml-1">· 翻转</span>}
                </div>
              </div>
              {/* 移除按钮 */}
              <button
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm transition-colors duration-150"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FF6B7A'; e.currentTarget.style.background = 'rgba(255,107,122,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}
                onClick={(e) => handleRemove(e, char.id)}
                aria-label={`移除${char.name}`}
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
