// 输入框组件 - galgame风格表单输入
'use client';

import { forwardRef } from 'react';

/** 输入框属性 */
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** 标签文字 */
  label?: string;
  /** 输入类型 */
  type?: string;
  /** 值变化回调 */
  onChange?: (value: string) => void;
  /** 错误提示 */
  error?: string;
}

/** Galgame风格输入框组件 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, type = 'text', onChange, error, className = '', value, placeholder, required, disabled, ...props }, ref) => {
    /** 处理输入变化 */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    return (
      <div className="space-y-1.5">
        {/* 标签 */}
        {label && (
          <label className="block text-sm font-medium text-text-primary">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        {/* 输入框 */}
        <input
          ref={ref}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          onChange={handleChange}
          className={`w-full px-4 py-2.5 rounded-btn border border-primary/20 bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-error focus:border-error focus:ring-error/20' : ''} ${className}`}
          {...props}
        />
        {/* 错误提示 */}
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
