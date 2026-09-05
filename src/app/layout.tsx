// 全局根布局 - Galgame风格主题、导航栏、全局样式
import type { Metadata } from 'next';
import { ZCOOL_KuaiLe, Ma_Shan_Zheng, Noto_Sans_SC, Zen_Maru_Gothic, Shippori_Mincho } from 'next/font/google';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'katex/dist/katex.min.css';
import './globals.css';
import NavbarSlot from '@/components/ui/NavbarSlot';

const animeFont = ZCOOL_KuaiLe({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anime',
  display: 'swap',
});

const titleFont = Ma_Shan_Zheng({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-title',
  display: 'swap',
});

const bodyFont = Noto_Sans_SC({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const zenMaruFont = Zen_Maru_Gothic({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-zen-maru',
  display: 'swap',
});

const minchoFont = Shippori_Mincho({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-mincho',
  display: 'swap',
});

/** 元数据配置 */
export const metadata: Metadata = {
  title: '星之匣 StellarChest -- 视觉小说创作平台',
  description: '面向视觉小说创作者与玩家的一站式平台，集成项目引擎、脚本编辑器、AI辅助创作、素材库、在线预览、社区交流',
  keywords: '视觉小说, galgame, 创作工具, 脚本引擎, 素材管理, AI创作',
  icons: {
    icon: '/logo.png',
  },
};

/** 全局根布局组件 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="zh-CN" className={`${animeFont.variable} ${titleFont.variable} ${bodyFont.variable} ${zenMaruFont.variable} ${minchoFont.variable}`}>
      <body className="min-h-screen bg-background antialiased">
        {/* 导航栏 */}
        <NavbarSlot />
        {/* 主内容区域 */}
        <main className="page-transition">
          {children}
        </main>
      </body>
    </html>
  );
}
