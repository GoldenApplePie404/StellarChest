// Galgame风格对话框组件 - 半透明底+角色名标签样式
// 模拟galgame游戏中底部对话面板的外观

import { forwardRef } from 'react';

/** 对话框属性 */
interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 角色名称 */
  speaker?: string;
  /** 对话内容 */
  content?: string;
  /** 对话框样式 */
  dialogStyle?: 'normal' | 'none' | 'fullscreen';
  /** 子元素 */
  children?: React.ReactNode;
}

/** Galgame风格对话框组件 */
const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ speaker, content, dialogStyle = 'normal', children, className = '', ...props }, ref) => {
    if (dialogStyle === 'none') {
      // 无框模式 - 不显示对话框UI
      return (
        <div ref={ref} className={`text-ink ${className}`} {...props}>
          {content || children}
        </div>
      );
    }

    if (dialogStyle === 'fullscreen') {
      // 全屏模式 - 内容铺满整个屏幕
      return (
        <div
          ref={ref}
          className={`galgame-dialog inset-0 flex items-center justify-center p-12 text-center ${className}`}
          {...props}
        >
          {speaker && (
            <span className="text-primary font-bold text-lg mb-2 block">
              {speaker}
            </span>
          )}
          <p className="text-white text-xl">
            {content || children}
          </p>
        </div>
      );
    }

    // 正常模式 - 底部半透明面板
    return (
      <div
        ref={ref}
        className={`galgame-dialog w-full px-6 py-4 ${className}`}
        {...props}
      >
        {/* 角色名标签 */}
        {speaker && (
          <div className="inline-block bg-primary text-white text-sm px-3 py-1 rounded-btn mb-2 font-bold">
            {speaker}
          </div>
        )}
        {/* 对话内容 */}
        <p className="text-white text-base leading-relaxed">
          {content || children}
        </p>
      </div>
    );
  }
);

Dialog.displayName = 'Dialog';

export default Dialog;
