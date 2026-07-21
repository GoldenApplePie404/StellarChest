// 注册页面 - galgame风格注册表单
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import type { RegisterRequest } from '@/types/user';

/** 注册页面组件 */
export default function RegisterPage(): React.JSX.Element {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    nickname: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /** 处理注册表单提交 */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.code === 200 && result.data) {
        // 注册成功后自动保存令牌并跳转
        localStorage.setItem('galgame_token', result.data.token);
        localStorage.setItem('galgame_user', JSON.stringify(result.data.user));
        setToast({ message: '注册成功', type: 'success' });
        setTimeout(() => {
          router.push('/');
        }, 500);
      } else {
        setToast({ message: result.message || '注册失败', type: 'error' });
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
            注册
          </h1>
          <p className="text-text-secondary text-sm">
            加入 Galgame Toolkit 创作者社区
          </p>
        </div>

        {/* 注册表单 */}
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
            placeholder="至少6个字符"
            value={formData.password}
            onChange={(value: string) => setFormData({ ...formData, password: value })}
            required
          />
          <Input
            label="昵称"
            type="text"
            placeholder="给自己取个名字（可选）"
            value={formData.nickname || ''}
            onChange={(value: string) => setFormData({ ...formData, nickname: value })}
          />
          <Button
            variant="primary"
            fullWidth
            loading={loading}
          >
            注册
          </Button>
        </form>

        {/* 登录链接 */}
        <div className="mt-6 text-center text-sm text-text-secondary">
          已有账号？
          <Link href="/login" className="text-primary hover:text-primary-dark ml-1">
            登录
          </Link>
        </div>
      </Card>
    </>
  );
}
