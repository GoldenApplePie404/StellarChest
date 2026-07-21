// 仪表盘路由组布局 - 包含侧边栏的仪表盘容器
// 预览页面（preview）为全屏游戏画面，由组件内部自行控制布局
// 不包含全局Navbar，仪表盘有自己的侧边栏导航
import type { Metadata } from 'next';

/** 仪表盘元数据 */
export const metadata: Metadata = {
  title: 'Galgame Toolkit - 项目管理',
};

/** 仪表盘路由组布局组件 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="bg-background">
      {children}
    </div>
  );
}
