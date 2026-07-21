// 登录页面 - galgame风格登录表单
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import type { LoginRequest } from '@/types/user';

/** 登录页面组件 */
export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /** 处理登录表单提交 */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.code === 200 && result.data) {
        // 保存JWT令牌到localStorage
        localStorage.setItem('galgame_token', result.data.token);
        localStorage.setItem('galgame_user', JSON.stringify(result.data.user));
        setToast({ message: '登录成功', type: 'success' });
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
          router.push(redirect);
        }, 500);
      } else {
        setToast({ message: result.message || '登录失败', type: 'error' });
      }
    } catch {
      setToast({ message: '网络错误，请稍后重试', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Card className="p-8">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold gradient-text mb-2">
            登录
          </h1>
          <p className="text-text-secondary text-sm">
            欢迎回到星之匣
          </p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="邮箱"
            type="email"
            placeholder="请输入邮箱"
            value={formData.email}
            onChange={(value: string) => setFormData({ ...formData, email: value })}
            required
          />
          <Input
            label="密码"
            type="password"
            placeholder="请输入密码"
            value={formData.password}
            onChange={(value: string) => setFormData({ ...formData, password: value })}
            required
          />
          <Button
            variant="primary"
            fullWidth
            loading={loading}
          >
            登录
          </Button>
        </form>

        {/* 注册链接 */}
        <div className="mt-6 text-center text-sm text-text-secondary">
          还没有账号？
          <Link href="/register" className="text-primary hover:text-primary-dark ml-1">
            注册新账号
          </Link>
        </div>
      </Card>
    </>
  );
}
