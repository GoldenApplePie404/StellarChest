// ============================================================
// Visualizer — 实时频谱/波形可视化 (Canvas 2D)
// 粉色渐变配色 (#FF9BB5 → #C8A2E8)
// ============================================================
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AudioEngine from '@/engine/AudioEngine';

type VisualizerTab = 'spectrum' | 'waveform';

export default function Visualizer(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<VisualizerTab>('spectrum');

  /** 粉色渐变配色 */
  const pinkStart = '#FF9BB5';
  const pinkEnd = '#C8A2E8';

  /** 将 hex 转 rgb */
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [255, 155, 181];
    return [
      parseInt(result[1] ?? 'FF', 16),
      parseInt(result[2] ?? '9B', 16),
      parseInt(result[3] ?? 'B5', 16),
    ];
  };

  const [r1, g1, b1] = hexToRgb(pinkStart);
  const [r2, g2, b2] = hexToRgb(pinkEnd);

  /** 绘制频谱图 */
  const drawSpectrum = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const analyser = AudioEngine.getAnalyser();
      let values: Float32Array;
      if (analyser) {
        values = analyser.getValue() as Float32Array;
      } else {
        // 没有 analyser 时显示模拟数据
        values = new Float32Array(256);
        for (let i = 0; i < values.length; i++) {
          values[i] = Math.random() * 0.3;
        }
      }

      ctx.clearRect(0, 0, width, height);

      // 背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(0, 0, width, height);

      const barCount = Math.min(256, values.length);
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        // 归一化值
        const rawVal = values[i] ?? 0;
        // Analyser FFT 值范围大约 -100 到 0 dB, 归一化到 0-1
        const normalized = Math.min(1, Math.max(0, (rawVal + 100) / 100));
        const barHeight = normalized * height;

        // 渐变插值
        const t = i / barCount;
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }
    },
    [r1, g1, b1, r2, g2, b2],
  );

  /** 绘制波形图 */
  const drawWaveform = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const analyser = AudioEngine.getAnalyser();
      let values: Float32Array;
      if (analyser) {
        values = analyser.getValue() as Float32Array;
      } else {
        // 模拟波形
        values = new Float32Array(256);
        const center = height / 2;
        for (let i = 0; i < values.length; i++) {
          const phase = (i / values.length) * Math.PI * 4;
          values[i] = Math.sin(phase + Date.now() / 500) * 0.3 + (Math.random() - 0.5) * 0.1;
        }
      }

      ctx.clearRect(0, 0, width, height);

      // 绘制波形
      const len = values.length;
      if (len === 0) return;

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = pinkStart;

      const centerY = height / 2;

      for (let i = 0; i < len; i++) {
        const x = (i / len) * width;
        // FFT 数据需要归一化到 -1 到 1
        const rawVal = values[i] ?? 0;
        const normalized = Math.max(-1, Math.min(1, rawVal / 100));
        const y = centerY + normalized * (height * 0.4);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // 填充渐变 (下半部分倒影)
      ctx.lineTo(width, height / 2);
      ctx.lineTo(0, height / 2);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, height / 2);
      gradient.addColorStop(0, `${pinkStart}40`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fill();
    },
    [pinkStart],
  );

  /** 动画循环 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const animate = () => {
      if (!running) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // 设置实际 canvas 大小 (适配 retina)
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);

      if (activeTab === 'spectrum') {
        drawSpectrum(ctx, width, height);
      } else {
        drawWaveform(ctx, width, height);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, drawSpectrum, drawWaveform]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab 切换 */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-lavender-pale">
        <button
          onClick={() => setActiveTab('spectrum')}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            activeTab === 'spectrum'
              ? 'bg-sakura-pale text-sakura-dark'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          频谱图
        </button>
        <button
          onClick={() => setActiveTab('waveform')}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            activeTab === 'waveform'
              ? 'bg-sakura-pale text-sakura-dark'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          波形图
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative min-h-[80px]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ background: 'rgba(255, 255, 255, 0.02)' }}
        />
      </div>
    </div>
  );
}
