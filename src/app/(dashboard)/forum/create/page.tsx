// 发帖页 - 富文本编辑器 + 标题 + 分类选择
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import RichEditor from '@/components/ui/RichEditor';
import { POST_CATEGORY_LABELS } from '@/lib/config';
import type { PostCategory, CreatePostRequest, ForumPost } from '@/types/forum';
import type { ApiResponse } from '@/types/api';

/** 分类选项数据 */
const CATEGORY_OPTIONS = Object.entries(POST_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** 发帖页组件 */
export default function CreatePostPage(): React.JSX.Element {
  const router = useRouter();

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('creation_exchange');
  const [titleError, setTitleError] = useState<string>('');
  const [contentError, setContentError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  /** 获取认证令牌 */
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('galgame_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  /** 表单校验 */
  const validateForm = (): boolean => {
    let valid = true;
    if (!title.trim()) {
      setTitleError('标题不能为空');
      valid = false;
    } else if (title.trim().length > 100) {
      setTitleError('标题不能超过100个字符');
      valid = false;
    } else {
      setTitleError('');
    }

    const textContent = content.replace(/<[^>]*>/g, '');
    if (!textContent.trim()) {
      setContentError('内容不能为空');
      valid = false;
    } else if (textContent.trim().length > 5000) {
      setContentError('内容不能超过5000个字符');
      valid = false;
    } else {
      setContentError('');
    }

    return valid;
  };

  /** 提交帖子 */
  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) return;

    // 检查登录状态
    const token = localStorage.getItem('galgame_token');
    if (!token) {
      setToastMessage('请先登录再发布帖子');
      setToastType('warning');
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      const postData: CreatePostRequest = {
        title: title.trim(),
        content: content.trim(),
        category: category as PostCategory,
      };

      const response = await fetch('/api/forum', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(postData),
      });

      const result: ApiResponse<ForumPost> = await response.json();
      if (result.code === 200 && result.data) {
        setToastMessage('帖子发布成功，正在跳转...');
        setToastType('success');
        // 跳转到帖子详情页
        router.push(`/forum/${result.data.id}`);
      } else {
        throw new Error(result.message || '发布失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '发布失败，请重试';
      setToastMessage(message);
      setToastType('error');
    } finally {
      setSubmitting(false);
    }
  };

  /** 取消返回论坛首页 */
  const handleCancel = (): void => {
    router.push('/forum');
  };

  return (
    <div>
      <main className="w-full max-w-7xl mx-auto p-6">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">发布新帖子</h1>
          <p className="text-sm text-text-secondary">在社区论坛分享你的创作、素材和经验</p>
        </div>

        {/* 发帖表单 */}
        <Card className="p-8">
          <div className="space-y-6">
            {/* 分类选择 */}
            <Select
              label="帖子分类"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
              required
            />

            {/* 标题输入 */}
            <Input
              label="帖子标题"
              placeholder="输入帖子标题"
              value={title}
              onChange={(v) => {
                setTitle(v);
                if (titleError) setTitleError('');
              }}
              error={titleError}
              required
            />

            {/* 内容编辑 - 富文本编辑器 */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                帖子内容
                <span className="text-error ml-1">*</span>
              </label>

              {/* 预览/编辑切换按钮 */}
              {content && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-primary hover:underline mb-1 inline-flex items-center gap-1"
                >
                  {showPreview ? '✏️ 返回编辑' : '👁️ 预览效果'}
                </button>
              )}

              {showPreview && content ? (
                <div className="border rounded-xl p-6 min-h-[200px] prose prose-sm max-w-none" style={{
                  borderColor: '#E8DCF0',
                  background: '#FFFAF5',
                  color: '#4A3F45',
                  lineHeight: '1.8',
                }}>
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                </div>
              ) : (
                <RichEditor
                  content={content}
                  onChange={(html) => {
                    setContent(html);
                    if (contentError) setContentError('');
                  }}
                  placeholder="写下你想分享的内容... 支持大标题、小标题、列表、代码块、引用、表格等"
                  showPreview={showPreview}
                  onTogglePreview={() => setShowPreview(!showPreview)}
                />
              )}
              {contentError && (
                <p className="text-xs text-error">{contentError}</p>
              )}
              {/* 字数统计（纯文本长度） */}
              <p className="text-xs text-text-secondary text-right">
                {content.replace(/<[^>]*>/g, '').length} / 5000
              </p>
            </div>

            {/* 提示信息 */}
            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm text-text-secondary">
                请选择合适的帖子分类。创作交流用于讨论创作心得，素材分享用于推荐实用素材，
                技术求助用于寻求开发帮助，作品展示用于展示你的galgame作品。
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
                loading={submitting}
              >
                发布帖子
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
