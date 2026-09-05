// 全局导航栏插槽 — 独立全屏页面（如画布编辑）隐藏顶部导航
'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';

/** 隐藏导航的全屏页面路径前缀 */
const FULLSCREEN_PREFIXES = ['/canvas-studio'];

export default function NavbarSlot(): React.JSX.Element | null {
  const pathname = usePathname();
  if (FULLSCREEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return null;
  }
  return <Navbar />;
}
