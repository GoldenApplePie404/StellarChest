// 404页面 - galgame风格的迷失页面
import Link from 'next/link';
import Button from '@/components/ui/Button';

/** 404页面组件 */
export default function NotFound(): React.JSX.Element {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-background">
      <div className="text-center px-6">
        {/* 大号404标识 */}
        <div className="text-8xl font-bold gradient-text mb-6">
          404
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          页面未找到
        </h2>
        <p className="text-text-secondary mb-8">
          你似乎来到了一片未知的领域...这个页面不存在或已被移除。
        </p>
        <Link href="/">
          <Button variant="primary">
            返回首页
          </Button>
        </Link>
      </div>
    </div>
  );
}
