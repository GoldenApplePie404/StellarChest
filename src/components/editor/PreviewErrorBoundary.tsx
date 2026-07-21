// 预览区错误边界 - 兜住预览子树（GameCanvas/DialogBox/ChoicePanel 等）的渲染异常，
// 避免单个组件崩溃导致整片预览静默变空白。出错时显示可读的错误信息而非黑屏。
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 可选：自定义兜底标题 */
  title?: string;
}

interface State {
  error: Error | null;
}

export default class PreviewErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // 仅记录，便于后续排查
    console.error('[PreviewErrorBoundary] 预览渲染异常:', error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          className="w-full h-full flex flex-col p-4 overflow-auto"
          style={{ background: 'rgba(30,0,0,0.92)', color: '#FFB4B4' }}
        >
          <div className="font-bold mb-2 text-sm">{this.props.title || '预览渲染出错'}</div>
          <pre className="text-[11px] whitespace-pre-wrap leading-relaxed">
            {this.state.error.message}
            {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
          </pre>
          <div className="mt-3 text-[11px]" style={{ color: 'rgba(255,180,180,0.7)' }}>
            请把上方错误信息发给我，即可定位并修复。
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
