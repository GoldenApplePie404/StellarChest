// 帖子详情页 - 帖子内容+评论列表+回复功能
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import PostContent from '@/components/ui/PostContent';
import type { ForumPost, PostCategory, Comment } from '@/types/forum';
import type { ApiResponse } from '@/types/api';

/** 文章分类中文标签 */
const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  creation_exchange: '创作交流',
  asset_share: '素材分享',
  tech_help: '技术求助',
  work_show: '作品展示',
};

/** 文章分类颜色映射 */
const CATEGORY_COLORS: Record<string, string> = {
  creation_exchange: '#FF9BB5',
  asset_share: '#7EC8E3',
  tech_help: '#6BCB77',
  work_show: '#FFE66D',
};

// 目录项类型
interface TocItem {
  id: string;
  level: number;
  text: string;
}

/** 格式化时间显示（相对时间） */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN');
}

// 目录解析函数
function parseHeadings(html: string): { headings: TocItem[]; htmlWithIds: string } {
  const headings: TocItem[] = [];
  let counter = 0;
  let result = html;
  const regex = /<h([2-4])\b([^>]*)>(.*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    counter++;
    const level = parseInt(match[1]!);
    const text = match[3]!.replace(/<[^>]*>/g, '').trim();
    if (!text) continue;
    const id = `toc-heading-${counter}`;
    headings.push({ id, level, text });
    const tag = match[0];
    const existingAttr = match[2] || '';
    const newTag = tag.replace(`<h${level}${existingAttr}>`, `<h${level}${existingAttr} id="${id}">`);
    result = result.replace(tag, newTag);
  }
  return { headings, htmlWithIds: result };
}

/** 目录侧栏组件 */
function TocSidebar({ headings, collapsed, onToggle }: {
  headings: TocItem[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (headings.length === 0) return null;

  return (
    <div className="shrink-0" style={{ width: collapsed ? 48 : 220 }}>
      <div className="sticky top-24 rounded-lg border p-3 overflow-hidden"
        style={{
          background: '#FFFAF5',
          borderColor: 'rgba(255,155,181,0.15)',
          maxHeight: 'calc(100vh - 140px)',
        }}>
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 w-full text-xs font-bold uppercase tracking-wider mb-2 pb-2 border-b"
          style={{ borderColor: 'rgba(255,155,181,0.1)', color: '#FF9BB5' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
          </svg>
          {!collapsed && <span>目录</span>}
        </button>
        {!collapsed && (
          <div className="overflow-y-auto space-y-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {headings.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  const el = document.getElementById(item.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="block w-full text-left text-xs leading-relaxed py-1 rounded transition-colors hover:bg-primary/5 truncate"
                style={{
                  paddingLeft: `${12 + (item.level - 1) * 16}px`,
                  color: item.level === 1 ? '#4A3F45' : '#7A6F75',
                  fontWeight: item.level === 1 ? 600 : 400,
                }}>
                {item.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 帖子详情页组件 */
export default function PostDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [post, setPost] = useState<(ForumPost & { authorNickname: string; comments: Comment[] }) | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [tocCollapsed, setTocCollapsed] = useState<boolean>(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

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

  /** 获取当前用户信息 */
  const getCurrentUserId = (): string | null => {
    const userStr = localStorage.getItem('galgame_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.id;
      } catch {
        return null;
      }
    }
    return null;
  };

  /** 加载帖子详情 */
  const loadPost = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/forum/${postId}`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<ForumPost & { authorNickname: string; comments: Comment[] }> = await response.json();
      if (result.code === 200 && result.data) {
        setPost(result.data);
      } else {
        throw new Error(result.message || '获取帖子详情失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取帖子详情失败');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  /** 初始化加载 */
  useEffect(() => {
    loadPost();
  }, [loadPost]);

  /** 提交评论回复 */
  const handleReply = async (): Promise<void> => {
    if (!replyContent.trim()) {
      setToastMessage('评论内容不能为空');
      setToastType('warning');
      return;
    }
    if (!getCurrentUserId()) {
      setToastMessage('请先登录再发表评论');
      setToastType('warning');
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forum/${postId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      const result: ApiResponse<Comment> = await response.json();
      if (result.code === 200 || result.code === 201) {
        setReplyContent('');
        setToastMessage('评论发布成功');
        setToastType('success');
        loadPost();
      } else {
        throw new Error(result.message || '评论发布失败');
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : '评论发布失败');
      setToastType('error');
    } finally {
      setSubmitting(false);
    }
  };

  /** 删除帖子 */
  const handleDeletePost = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/forum/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<null> = await response.json();
      if (result.code === 200) {
        setToastMessage('帖子已删除');
        setToastType('success');
        router.push('/forum');
      } else {
        throw new Error(result.message || '删除失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      setToastMessage(message);
      setToastType('error');
    }
    setShowDeleteModal(false);
  };

  /** 删除评论（帖主权限） */
  const handleDeleteComment = async (commentId: string): Promise<void> => {
    if (!window.confirm('确定要删除这条评论吗？')) return;

    setDeletingCommentId(commentId);
    try {
      const response = await fetch(`/api/forum/${postId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<null> = await response.json();
      if (result.code === 200) {
        setToastMessage('评论已删除');
        setToastType('success');
        loadPost();
      } else {
        throw new Error(result.message || '删除评论失败');
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : '删除评论失败');
      setToastType('error');
    } finally {
      setDeletingCommentId(null);
    }
  };

  /** 返回论坛首页 */
  const handleBack = (): void => {
    router.push('/forum');
  };

  /** 判断是否为帖子作者 */
  const isAuthor = post ? getCurrentUserId() === post.userId : false;

  // 解析目录
  const { headings, htmlWithIds } = post ? parseHeadings(post.content) : { headings: [] as TocItem[], htmlWithIds: '' };

  return (
    <div>
      <main className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* 返回按钮 */}
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4">
          返回论坛
        </Button>

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="text-text-secondary">加载中...</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && !post && (
          <Card className="text-center py-10">
            <p className="text-error mb-4">{error}</p>
            <Button variant="primary" size="sm" onClick={loadPost}>重试</Button>
          </Card>
        )}

        {/* 帖子详情内容 — 左右布局 */}
        {post && (
          <div className="flex gap-6">
            {/* 左侧目录 */}
            <TocSidebar
              headings={headings}
              collapsed={tocCollapsed}
              onToggle={() => setTocCollapsed(v => !v)}
            />

            {/* 右侧主内容 */}
            <div className="flex-1 space-y-6 min-w-0">
            {/* 帖子内容卡片 */}
            <Card className="p-6">
              {/* 标题和分类行 */}
              <div className="flex items-center gap-2 mb-4">
                {post.isPinned && (
                  <span className="px-2 py-1 rounded-btn text-xs font-bold bg-primary text-white">置顶</span>
                )}
                <span
                  className="px-2 py-1 rounded-btn text-xs font-medium text-ink"
                  style={{ background: CATEGORY_COLORS[post.category] || '#8E8E8E' }}
                >
                  {POST_CATEGORY_LABELS[post.category] || post.category}
                </span>
              </div>

              {/* 帖子标题 */}
              <h1 className="text-xl font-bold text-text-primary mb-4">
                {post.title}
              </h1>

              {/* 帖子内容（支持HTML渲染，带标题ID） */}
              <PostContent key={htmlWithIds} html={htmlWithIds} />

              {/* 底部信息行 */}
              <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span>作者: <Link href={`/user/${post.userId}`} className="hover:text-primary transition-colors">{post.authorNickname || '匿名'}</Link></span>
                  <span>{formatTime(post.createdAt)}</span>
                  <span>{post.commentCount} 评论</span>
                  <span>{post.viewCount} 阅读</span>
                </div>
                {/* 作者操作按钮 */}
                {isAuthor && (
                  <div className="flex items-center gap-2">
                    <Button variant="accent" size="sm" onClick={() => router.push(`/forum/${postId}/edit`)}>
                      <i className="fas fa-pen mr-1" />编辑
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                      <i className="fas fa-trash mr-1" />删除
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* 评论区域 */}
            <Card className="p-6" id="comments-section">
              <h2 className="text-lg font-bold text-text-primary mb-4">
                评论 ({post.comments.length})
              </h2>

              {/* 评论列表 */}
              {post.comments.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {post.comments.map((comment: Comment) => (
                    <div key={comment.id} className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 group">
                      <div className="w-8 h-8 rounded-btn flex items-center justify-center text-xs font-bold bg-primary/10 text-primary shrink-0">
                        {comment.authorNickname ? comment.authorNickname.charAt(0) : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/user/${comment.userId}`}
                            className="text-sm font-medium text-text-primary hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {comment.authorNickname || '匿名用户'}
                          </Link>
                          <span className="text-xs text-text-secondary">
                            {formatTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary">{comment.content}</p>
                      </div>
                      {/* 删除评论按钮 — 帖主可删所有评论，评论者可删自己的 */}
                      {(isAuthor || comment.userId === getCurrentUserId()) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingCommentId === comment.id}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-error hover:bg-error/5 disabled:opacity-50"
                          title="删除评论"
                        >
                          {deletingCommentId === comment.id ? (
                            <span className="text-xs">删除中...</span>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 mb-6">
                  <p className="text-sm text-text-secondary">暂无评论，来发表第一条吧</p>
                </div>
              )}

              {/* 评论输入框 */}
              <div className="border-t border-primary/10 pt-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-text-primary">
                      发表评论
                    </label>
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="写下你的评论..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-btn border border-primary/20 bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 resize-none"
                    />
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleReply}
                      loading={submitting}
                    >
                      发布评论
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          </div>
        )}
      </main>

      {/* 删除确认弹窗 */}
      <Modal
        visible={showDeleteModal}
        title="删除帖子"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeletePost}
        confirmText="确认删除"
        width="max-w-sm"
      >
        <p className="text-text-secondary text-sm">
          确定要删除该帖子吗？此操作不可撤销，帖子和所有评论都将被永久删除。
        </p>
      </Modal>

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