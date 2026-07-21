// 选择器组件 - galgame风格下拉选择
'use client';

import { forwardRef } from 'react';

/** 选择选项 */
interface SelectOption {
  /** 选项值 */
  value: string;
  /** 选项标签 */
  label: string;
}

/** 选择器属性 */
interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** 标签文字 */
  label?: string;
  /** 选项列表 */
  options: SelectOption[];
  /** 值变化回调 */
  onChange?: (value: string) => void;
  /** 错误提示 */
  error?: string;
}

/** Galgame风格选择器组件 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, onChange, error, className = '', value, required, disabled, ...props }, ref) => {
    /** 处理选择变化 */
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
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
        {/* 下拉选择 */}
        <select
          ref={ref}
          value={value}
          required={required}
          disabled={disabled}
          onChange={handleChange}
          className={`w-full px-4 py-2.5 rounded-btn border border-primary/20 bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-error focus:border-error focus:ring-error/20' : ''} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* 错误提示 */}
        {error && (
          <p className="text-xs text-error">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
