// 新建项目页 - 表单输入项目名+描述+类型，调用ProjectService.createProject
// 粉色二次元风格表单页面
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import useProject from '@/hooks/useProject';

/** 新建项目页组件 */
export default function CreateProjectPage(): React.JSX.Element {
  const router = useRouter();
  const { createProject, loading } = useProject();

  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  /** 表单校验 */
  const validateForm = (): boolean => {
    if (!name.trim()) {
      setNameError('项目名称不能为空');
      return false;
    }
    if (name.trim().length > 50) {
      setNameError('项目名称不能超过50个字符');
      return false;
    }
    setNameError('');
    return true;
  };

  /** 创建项目提交 */
  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }
    const project = await createProject({
      name: name.trim(),
      description: description.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
    });
    if (project) {
      setToastMessage('项目创建成功，正在跳转到编辑器...');
      setToastType('success');
      // 跳转到编辑器页面
      router.push(`/editor/${project.id}`);
    } else {
      setToastMessage('创建失败，请检查输入并重试');
      setToastType('error');
    }
  };

  /** 取消返回项目列表 */
  const handleCancel = (): void => {
    router.push('/projects');
  };

  return (
    <div>
      <main className="max-w-2xl mx-auto p-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">新建项目</h1>
          <p className="text-sm text-text-secondary">创建一个新的galgame创作项目</p>
        </div>

        {/* 创建表单 */}
        <Card className="p-8">
          <div className="space-y-6">
            {/* 项目名称 */}
            <Input
              label="项目名称"
              placeholder="给你的项目起一个名字"
              value={name}
              onChange={setName}
              error={nameError}
              required
            />

            {/* 项目描述 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                项目描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述你的项目内容、风格和设定..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-btn border border-primary/20 bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 resize-none"
              />
            </div>

            {/* 封面图URL */}
            <Input
              label="封面图URL（可选）"
              placeholder="输入封面图片的URL地址"
              value={coverUrl}
              onChange={setCoverUrl}
            />

            {/* 提示信息 */}
            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm text-text-secondary">
                创建项目后，你可以在编辑器中添加脚本文件、图片素材和音频资源。
                项目默认状态为草稿，可在项目详情中修改。
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="md" onClick={handleCancel}>
                取消
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
                loading={loading}
              >
                创建项目
              </Button>
            </div>
          </div>
        </Card>
      </main>

      {/* 提示通知 */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage('')}
        />
      )}
    </div>
  );
}
