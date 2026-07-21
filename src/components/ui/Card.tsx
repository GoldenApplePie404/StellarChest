// Galgame风格卡片组件 - 圆角、柔和阴影、白色背景
import { forwardRef } from 'react';

/** 卡片属性 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 是否可悬浮（悬浮时有提升阴影效果） */
  hoverable?: boolean;
  /** 子元素 */
  children: React.ReactNode;
}

/** Galgame风格卡片组件 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, children, className = '', ...props }, ref) => {
    const baseStyles = 'bg-card rounded-default shadow-card p-6 border border-primary/5';
    const hoverStyles = hoverable ? 'card-hover' : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
