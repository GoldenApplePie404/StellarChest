// 音频工具页 - 格式转换+裁剪+音量调节入口
// 整合AudioConverter和AudioTrimmer和VolumeAdjuster组件
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AudioConverter from '@/components/tools/AudioConverter';
import AudioTrimmer from '@/components/tools/AudioTrimmer';
import VolumeAdjuster from '@/components/tools/VolumeAdjuster';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';

/** 工具模式 */
type AudioToolMode = 'convert' | 'trim' | 'volume';

/** 音频工具页面组件 */
export default function AudioToolsPage(): React.JSX.Element {
  const router = useRouter();

  /** 当前选中工具模式 */
  const [activeMode, setActiveMode] = useState<AudioToolMode>('convert');
  /** Toast提示 */
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  /** 工具模式定义 */
  const modes: { key: AudioToolMode; label: string; description: string }[] = [
    { key: 'convert', label: '格式转换', description: 'MP3/WAV/OGG格式互转' },
    { key: 'trim', label: '音频裁剪', description: '截取音频指定时间段' },
    { key: 'volume', label: '音量调节', description: '调整音频增益值' },
  ];

  /** Toast关闭 */
  const handleToastClose = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <div className="min-h-screen p-8">
      {/* 页面标题 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">音频工具</h1>
          <p className="text-text-secondary text-sm">格式转换、裁剪、音量调节你的音频素材</p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/tools')}>
          返回工具首页
        </Button>
      </div>

      {/* 工具模式切换 */}
      <div className="flex items-center gap-2 mb-6">
        {modes.map((mode) => (
          <Button
            key={mode.key}
            variant={activeMode === mode.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveMode(mode.key)}
          >
            {mode.label}
          </Button>
        ))}
      </div>

      {/* 工具内容区域 */}
      <Card>
        {activeMode === 'convert' && (
          <AudioConverter
            onConvertComplete={() => {
              setToast({ message: '格式转换完成', type: 'success' });
            }}
          />
        )}

        {activeMode === 'trim' && (
          <AudioTrimmer
            onTrimComplete={() => {
              setToast({ message: '裁剪完成', type: 'success' });
            }}
          />
        )}

        {activeMode === 'volume' && (
          <VolumeAdjuster
            onAdjustComplete={() => {
              setToast({ message: '音量调节完成', type: 'success' });
            }}
          />
        )}
      </Card>

      {/* Toast提示 */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={handleToastClose} />
      )}
    </div>
  );
}
