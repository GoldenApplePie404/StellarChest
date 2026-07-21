// 编辑帖子页 - 加载现有内容后允许修改
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import RichEditor from '@/components/ui/RichEditor';
import { POST_CATEGORY_LABELS } from '@/lib/config';
import type { PostCategory, ForumPost } from '@/types/forum';
import type { ApiResponse } from '@/types/api';

const CATEGORY_OPTIONS = Object.entries(POST_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function EditPostPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [category, setCategory] = useState<string>('creation_exchange');
  const [titleError, setTitleError] = useState<string>('');
  const [contentError, setContentError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('galgame_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // 加载现有帖子内容
  useEffect(() => {
    const loadPost = async () => {
      try {
        const res = await fetch(`/api/forum/${postId}`, { headers: getAuthHeaders() });
        const result: ApiResponse<ForumPost & { authorNickname: string }> = await res.json();
        if (result.code === 200 && result.data) {
          setTitle(result.data.title);
          setContent(result.data.content);
          setCategory(result.data.category);
        } else {
          throw new Error(result.message || '获取帖子失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [postId]);

  const validateForm = (): boolean => {
    let valid = true;
    if (!title.trim()) { setTitleError('标题不能为空'); valid = false; }
    else if (title.trim().length > 100) { setTitleError('标题不能超过100个字符'); valid = false; }
    else setTitleError('');

    const textContent = content.replace(/<[^>]*>/g, '');
    if (!textContent.trim()) { setContentError('内容不能为空'); valid = false; }
    else setContentError('');
    return valid;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) return;
    const token = localStorage.getItem('galgame_token');
    if (!token) { setToastMessage('请先登录'); setToastType('warning'); router.push('/login'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forum/${postId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category }),
      });
      const result: ApiResponse<ForumPost> = await res.json();
      if (result.code === 200) {
        setToastMessage('帖子更新成功');
        setToastType('success');
        setTimeout(() => router.push(`/forum/${postId}`), 800);
      } else {
        throw new Error(result.message || '更新失败');
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : '更新失败');
      setToastType('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm opacity-50">加载中...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="w-full max-w-7xl mx-auto p-6">
        <Card className="text-center py-10">
          <p className="text-error mb-4">{error}</p>
          <Button variant="primary" size="sm" onClick={() => router.push('/forum')}>返回论坛</Button>
        </Card>
      </main>
    );
  }

  return (
    <div>
      <main className="w-full max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">编辑帖子</h1>
          <p className="text-sm text-text-secondary">修改你的帖子内容</p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            <Select label="帖子分类" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} required />
            <Input label="帖子标题" placeholder="输入帖子标题" value={title}
              onChange={(v) => { setTitle(v); if (titleError) setTitleError(''); }}
              error={titleError} required />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                帖子内容 <span className="text-error ml-1">*</span>
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
                <RichEditor content={content} onChange={(html) => { setContent(html); if (contentError) setContentError(''); }}
                  placeholder="修改你的帖子内容..."
                  showPreview={showPreview}
                  onTogglePreview={() => setShowPreview(!showPreview)}
                />
              )}
              {contentError && <p className="text-xs text-error">{contentError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" size="md" onClick={() => router.push(`/forum/${postId}`)}>取消</Button>
              <Button variant="primary" size="md" onClick={handleSubmit} loading={submitting}>
                保存修改
              </Button>
            </div>
          </div>
        </Card>
      </main>

      {toastMessage && (
        <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
}
