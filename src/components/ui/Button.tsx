// Galgame风格按钮组件 - 渐变背景、圆角、弹跳反馈
'use client';

import { forwardRef } from 'react';

/** 按钮变体类型 */
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

/** 按钮尺寸类型 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** 按钮属性 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体样式 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 是否占满宽度 */
  fullWidth?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 加载时显示的文本 */
  loadingText?: string;
  /** 子元素 */
  children: React.ReactNode;
}

/** 变体样式映射 */
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'font-bold tracking-wide',
  secondary: 'font-bold tracking-wide',
  accent: 'font-bold',
  ghost: '',
  danger: 'font-bold tracking-wide',
};

/** 变体内联样式 */
const variantInlineStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:  { background: 'linear-gradient(135deg, #F07A9A, #FF9BB5)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(255,155,181,0.25)' },
  secondary:{ background: 'linear-gradient(135deg, #A89CC8, #C5B4E3)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(197,180,227,0.2)' },
  accent:   { background: '#FFEAA7', color: '#4A3F45', boxShadow: '0 2px 8px rgba(255,234,167,0.25)' },
  ghost:    { background: 'transparent', color: '#4A3F45', border: '1px solid #D5CDD0' },
  danger:   { background: 'linear-gradient(135deg, #E55, #FF6B7A)', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(255,107,122,0.2)' },
};

/** 尺寸样式映射 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3 text-base',
};

/** Galgame风格按钮组件 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, loading = false, loadingText = '处理中...', children, className = '', disabled, ...props }, ref) => {
    const baseStyles = 'btn-bounce rounded-btn font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed';
    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
        style={variantInlineStyles[variant]}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
            {loadingText}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
