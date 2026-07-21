// 底部属性面板 - 编辑选中角色属性及对话框文本
'use client';

import { useCallback } from 'react';
import type { SceneCharacter } from './SceneBuilder';

/** 位置选项 */
const POSITION_OPTIONS = [
  { value: 'left', label: '左侧' },
  { value: 'center', label: '中间' },
  { value: 'right', label: '右侧' },
];

/** 表情选项 */
const EXPRESSION_OPTIONS = [
  { value: '', label: '无' },
  { value: 'smile', label: '微笑' },
  { value: 'angry', label: '生气' },
  { value: 'sad', label: '悲伤' },
  { value: 'surprise', label: '惊讶' },
  { value: 'blush', label: '害羞' },
];

/** 属性面板属性 */
interface PropertyPanelProps {
  /** 选中的角色 */
  selectedChar: SceneCharacter | null;
  /** 更新角色属性 */
  onUpdateChar: (id: string, updates: Partial<SceneCharacter>) => void;
  /** 对话框说话者 */
  dialogSpeaker: string;
  /** 对话框文本 */
  dialogText: string;
  /** 更新对话框说话者 */
  onUpdateDialogSpeaker: (speaker: string) => void;
  /** 更新对话框文本 */
  onUpdateDialogText: (text: string) => void;
}

/** 底部属性面板组件 */
export default function PropertyPanel({
  selectedChar,
  onUpdateChar,
  dialogSpeaker,
  dialogText,
  onUpdateDialogSpeaker,
  onUpdateDialogText,
}: PropertyPanelProps): React.JSX.Element {
  /** 更新位置 */
  const handlePositionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (selectedChar) {
        onUpdateChar(selectedChar.id, { position: e.target.value as 'left' | 'center' | 'right' });
      }
    },
    [selectedChar, onUpdateChar],
  );

  /** 更新缩放 */
  const handleScaleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedChar) {
        onUpdateChar(selectedChar.id, { scale: parseFloat(e.target.value) });
      }
    },
    [selectedChar, onUpdateChar],
  );

  /** 更新表情 */
  const handleExpressionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (selectedChar) {
        onUpdateChar(selectedChar.id, { expression: e.target.value });
      }
    },
    [selectedChar, onUpdateChar],
  );

  /** 切换翻转 */
  const handleFlipToggle = useCallback(() => {
    if (selectedChar) {
      onUpdateChar(selectedChar.id, { flip: !selectedChar.flip });
    }
  }, [selectedChar, onUpdateChar]);

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左侧：角色属性 */}
        <div>
          <h4 className="text-sm font-bold mb-3" style={{ color: '#E2D0F5' }}>
            角色属性
            {selectedChar && (
              <span className="ml-2 text-xs font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>
                - {selectedChar.name || selectedChar.charId}
              </span>
            )}
          </h4>

          {selectedChar ? (
            <div className="space-y-3">
              {/* 位置下拉 */}
              <div className="flex items-center gap-3">
                <label className="text-sm w-16 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>位置</label>
                <select
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none focus:border-[#FF9BB5] transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#E2D0F5', borderColor: 'rgba(255,255,255,0.12)' }}
                  value={selectedChar.position}
                  onChange={handlePositionChange}
                >
                  {POSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: '#1E1E28', color: '#E2D0F5' }}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 缩放下拉 */}
              <div className="flex items-center gap-3">
                <label className="text-sm w-16 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>缩放</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={selectedChar.scale}
                  onChange={handleScaleChange}
                  className="flex-1 accent-[#FF9BB5]"
                />
                <span className="text-sm w-10 text-right" style={{ color: '#E2D0F5' }}>{selectedChar.scale.toFixed(1)}x</span>
              </div>

              {/* 表情下拉 */}
              <div className="flex items-center gap-3">
                <label className="text-sm w-16 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>表情</label>
                <select
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none focus:border-[#FF9BB5] transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#E2D0F5', borderColor: 'rgba(255,255,255,0.12)' }}
                  value={selectedChar.expression}
                  onChange={handleExpressionChange}
                >
                  {EXPRESSION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: '#1E1E28', color: '#E2D0F5' }}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 翻转开关 */}
              <div className="flex items-center gap-3">
                <label className="text-sm w-16 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>翻转</label>
                <button
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                    selectedChar.flip ? 'bg-primary' : ''
                  }`}
                  style={selectedChar.flip ? undefined : { background: 'rgba(255,255,255,0.2)' }}
                  onClick={handleFlipToggle}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      selectedChar.flip ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {selectedChar.flip ? '已翻转' : '未翻转'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              从角色列表选择一个角色以编辑属性
            </div>
          )}
        </div>

        {/* 右侧：对话框编辑 */}
        <div>
          <h4 className="text-sm font-bold mb-3" style={{ color: '#E2D0F5' }}>对话框编辑</h4>
          <div className="space-y-3">
            {/* 说话者名称 */}
            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>说话者</label>
              <input
                type="text"
                className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none focus:border-[#FF9BB5] transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#E2D0F5', borderColor: 'rgba(255,255,255,0.12)' }}
                value={dialogSpeaker}
                onChange={(e) => onUpdateDialogSpeaker(e.target.value)}
                placeholder="输入角色名称..."
              />
            </div>
            {/* 对话文本 */}
            <div>
              <label className="block text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>对话内容</label>
              <textarea
                className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none focus:border-[#FF9BB5] transition-colors resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#E2D0F5', borderColor: 'rgba(255,255,255,0.12)' }}
                value={dialogText}
                onChange={(e) => onUpdateDialogText(e.target.value)}
                placeholder="输入对话文本..."
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
