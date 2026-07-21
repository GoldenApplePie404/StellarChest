// 认证模块布局 - 居中卡片式布局，galgame风格背景
import type { Metadata } from 'next';

/** 认证模块元数据 */
export const metadata: Metadata = {
  title: '开启星匣 - 星之匣 StellarChest',
};

/** 认证模块布局组件 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background page-transition">
      {/* 装饰性背景元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-40 h-40 rounded-full bg-primary/5" />
        <div className="absolute bottom-20 right-40 w-60 h-60 rounded-full bg-secondary/5" />
        <div className="absolute top-40 right-60 w-24 h-24 rounded-xl bg-accent/5 rotate-45" />
      </div>
      {/* 内容卡片 */}
      <div className="relative z-10 w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}
