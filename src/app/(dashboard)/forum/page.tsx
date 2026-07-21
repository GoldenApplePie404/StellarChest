// 论坛首页 - 帖子列表+搜索+分类+分页，调用ForumService.listPosts
// 粉色二次元风格论坛页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/ui/SearchBar';
import CategoryTabs from '@/components/ui/CategoryTabs';
import Pagination from '@/components/ui/Pagination';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import PostCard from '@/components/ui/PostCard';
import { POST_CATEGORY_LABELS } from '@/lib/config';
import type { ForumPost } from '@/types/forum';
import type { PaginatedData, ApiResponse } from '@/types/api';

/** 论坛分类标签数据 */
const CATEGORY_TABS = [
  { value: 'all', label: '全部帖子' },
  ...Object.entries(POST_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

/** 排序选项 */
const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'popular', label: '最多浏览' },
  { value: 'commented', label: '最多评论' },
];

/** 论坛首页组件 */
export default function ForumPage(): React.JSX.Element {
  const router = useRouter();
  const [posts, setPosts] = useState<PaginatedData<ForumPost> | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('latest');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  /** 获取认证令牌 */
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('galgame_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  /** 加载帖子列表 */
  const loadPosts = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(10),
        sortBy,
      });
      if (activeCategory !== 'all') {
        params.set('category', activeCategory);
      }
      if (searchKeyword) {
        params.set('keyword', searchKeyword);
      }
      const response = await fetch(`/api/forum?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<PaginatedData<ForumPost>> = await response.json();
      if (result.code === 200 && result.data) {
        setPosts(result.data);
      } else {
        throw new Error(result.message || '获取帖子列表失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取帖子列表失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeCategory, searchKeyword, sortBy]);

  /** 初始化加载 */
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  /** 分类标签切换 */
  const handleCategoryChange = (value: string): void => {
    setActiveCategory(value);
    setCurrentPage(1);
  };

  /** 分页切换 */
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  /** 搜索处理 */
  const handleSearch = (keyword: string): void => {
    setSearchKeyword(keyword);
    setCurrentPage(1);
  };

  /** 排序切换 */
  const handleSortChange = (value: string): void => {
    setSortBy(value);
    setCurrentPage(1);
  };

  /** 跳转到发帖页 */
  const handleGoCreate = (): void => {
    router.push('/forum/create');
  };

  /** 计算总页数 */
  const totalPages = posts ? Math.ceil(posts.total / 10) : 1;

  /** 获取当前分类标签文字 */
  const getCurrentCategoryLabel = (): string => {
    if (activeCategory === 'all') return '全部帖子';
    return POST_CATEGORY_LABELS[activeCategory] || activeCategory;
  };

  return (
    <div>
      <main className="max-w-4xl mx-auto p-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">社区论坛</h1>
            <p className="text-sm text-text-secondary">与其他创作者交流、分享素材和展示作品</p>
          </div>
          <Button variant="primary" size="md" onClick={handleGoCreate}>
            发布帖子
          </Button>
        </div>

        {/* 搜索栏和排序 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            {/* 搜索图标 */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <SearchBar onSearch={handleSearch} placeholder="搜索帖子标题或内容..." />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">排序:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-1.5 rounded-btn text-sm border border-primary/20 bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 分类标签 */}
        <div className="mb-2">
          <CategoryTabs tabs={CATEGORY_TABS} activeValue={activeCategory} onChange={handleCategoryChange} />
        </div>

        {/* 分类筛选状态提示 */}
        <div className="mb-4 px-1">
          <span className="text-xs text-text-secondary">
            当前分类: <span className="font-medium text-primary">{getCurrentCategoryLabel()}</span>
            {searchKeyword && (
              <span className="ml-2">
                · 搜索: "<span className="font-medium">{searchKeyword}</span>"
              </span>
            )}
            {posts && (
              <span className="ml-2">· 共 {posts.total} 条结果</span>
            )}
          </span>
        </div>

        {/* 加载状态 */}
        {loading && !posts && (
          <div className="flex items-center justify-center py-20">
            <span className="text-text-secondary">加载中...</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center justify-center py-10">
            <Card className="text-center">
              <p className="text-error mb-4">{error}</p>
              <Button variant="primary" size="sm" onClick={loadPosts}>重试</Button>
            </Card>
          </div>
        )}

        {/* 帖子列表 */}
        {!loading && !error && posts && posts.items.length > 0 && (
          <div className="space-y-3">
            {posts.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && posts && posts.items.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Card className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-comments text-2xl opacity-40" style={{ color: '#FF9BB5' }}></i>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">暂无帖子</h3>
              <p className="text-sm text-text-secondary mb-4">
                {searchKeyword ? '没有找到匹配的帖子，请尝试其他关键词或分类' : '论坛还没有帖子，快来发布第一个吧'}
              </p>
              {!searchKeyword && (
                <Button variant="primary" size="md" onClick={handleGoCreate}>
                  发布帖子
                </Button>
              )}
            </Card>
          </div>
        )}

        {/* 分页 */}
        {posts && posts.items.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
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
