// 素材库首页 - 分类标签+搜索+AssetCard网格，调用AssetService.searchAssets
// 粉色二次元风格素材浏览页面
'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchBar from '@/components/ui/SearchBar';
import CategoryTabs from '@/components/ui/CategoryTabs';
import Pagination from '@/components/ui/Pagination';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import AssetCard from '@/components/ui/AssetCard';
import { ASSET_CATEGORY_LABELS } from '@/lib/config';
import type { Asset, AssetCategory } from '@/types/asset';
import type { PaginatedData, ApiResponse } from '@/types/api';

/** 素材分类标签数据 */
const CATEGORY_TABS = [
  { value: 'all', label: '全部素材' },
  ...Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

/** 排序选项 */
const SORT_OPTIONS = [
  { value: 'latest', label: '最新' },
  { value: 'popular', label: '热门' },
  { value: 'name', label: '名称' },
];

/** 素材库首页组件 */
export default function AssetsPage(): React.JSX.Element {
  const [assets, setAssets] = useState<PaginatedData<Asset> | null>(null);
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

  /** 加载素材列表 */
  const loadAssets = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(12),
        sortBy,
      });
      if (activeCategory !== 'all') {
        params.set('category', activeCategory);
      }
      if (searchKeyword) {
        params.set('keyword', searchKeyword);
      }
      const response = await fetch(`/api/assets?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<PaginatedData<Asset>> = await response.json();
      if (result.code === 200 && result.data) {
        setAssets(result.data);
      } else {
        throw new Error(result.message || '获取素材列表失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取素材列表失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeCategory, searchKeyword, sortBy]);

  /** 初始化加载 */
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

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

  /** 下载素材 */
  const handleDownload = async (assetId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('下载失败');

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";\n]+)"?/);
      const filename = match ? decodeURIComponent(match[1] || '') : `asset_${assetId}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setToastMessage('素材下载成功');
      setToastType('success');
    } catch {
      setToastMessage('下载失败');
      setToastType('error');
    }
  };

  /** 计算总页数 */
  const totalPages = assets ? Math.ceil(assets.total / 12) : 1;

  return (
    <div>
      <main className="max-w-6xl mx-auto p-8">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">素材大全</h1>
          <p className="text-sm text-text-secondary">浏览和下载galgame创作所需的各类素材资源</p>
        </div>

        {/* 搜索栏和排序 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} placeholder="搜索素材名称或描述..." />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">排序:</span>
            <div className="flex items-center gap-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSortChange(opt.value)}
                  className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-all duration-150 ${
                    sortBy === opt.value
                      ? 'bg-primary text-ink shadow-soft'
                      : 'text-text-secondary hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 分类标签 */}
        <div className="mb-6">
          <CategoryTabs tabs={CATEGORY_TABS} activeValue={activeCategory} onChange={handleCategoryChange} />
        </div>

        {/* 加载状态 */}
        {loading && !assets && (
          <div className="flex items-center justify-center py-20">
            <span className="text-text-secondary">加载中...</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center justify-center py-10">
            <Card className="text-center">
              <p className="text-error mb-4">{error}</p>
              <Button variant="primary" size="sm" onClick={loadAssets}>重试</Button>
            </Card>
          </div>
        )}

        {/* 素材卡片网格 */}
        {!loading && !error && assets && assets.items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assets.items.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && assets && assets.items.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <Card className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-lg bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-cube text-2xl opacity-40" style={{ color: '#7EC8E3' }}></i>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">暂无素材</h3>
              <p className="text-sm text-text-secondary">
                {searchKeyword ? '没有找到匹配的素材，请尝试其他关键词或分类' : '素材库暂时没有可用素材'}
              </p>
            </Card>
          </div>
        )}

        {/* 分页 */}
        {assets && assets.items.length > 0 && totalPages > 1 && (
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
