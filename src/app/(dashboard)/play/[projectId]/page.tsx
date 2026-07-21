// 作品详情页 - 展示已发布作品的详细信息
// 粉色二次元风格，含开始游玩和分享按钮
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import type { Project, ProjectFile, ProjectConfig } from '@/types/project';

/** 已发布项目详情 */
interface PublishedProjectDetail extends Project {
  authorName: string;
  authorAvatar: string;
  files: ProjectFile[];
  config: ProjectConfig;
}

/** 作品详情页组件 */
export default function PlayProjectPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<PublishedProjectDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  /** 加载已发布项目详情 */
  const fetchProject = useCallback(async (): Promise<void> => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/published/${projectId}`);
      const result = await response.json();
      if (result.code === 200 && result.data) {
        setProject(result.data);
      } else {
        throw new Error(result.message || '获取作品详情失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取作品详情失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  /** 开始游玩 */
  const handleStartGame = (): void => {
    router.push(`/play/${projectId}/game`);
  };

  /** 复制分享链接 */
  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/play/${projectId}`);
      setToastMessage('链接已复制到剪贴板');
      setToastType('success');
    } catch {
      setToastMessage('复制链接失败');
      setToastType('error');
    }
  };

  /** 格式化计数 */
  const formatCount = (count: number): string => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto p-8">
        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-3"
                style={{ borderColor: 'rgba(255,126,179,0.3)', borderTopColor: '#FF7EB3' }} />
              <span className="text-text-secondary">加载作品详情...</span>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && !loading && (
          <Card className="text-center py-10">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF6B7A" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p className="text-error font-bold mb-2">无法加载作品</p>
            <p className="text-text-secondary text-sm mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="primary" size="sm" onClick={fetchProject}>重试</Button>
              <Button variant="ghost" size="sm" onClick={() => router.push('/play')}>返回广场</Button>
            </div>
          </Card>
        )}

        {/* 作品详情 */}
        {project && (
          <div className="space-y-6">
            {/* 作品头部 - 大封面 */}
            <Card className="p-0 overflow-hidden">
              {/* 封面大图 */}
              <div className="relative h-64 md:h-80 bg-primary/5">
                {project.coverUrl ? (
                  <img
                    src={project.coverUrl}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                    <div className="text-center">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#FF9BB5" strokeWidth="1" className="mx-auto mb-4 opacity-40">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <p className="text-text-secondary/50 text-sm">{project.name}</p>
                    </div>
                  </div>
                )}
                {/* 封面渐变遮罩 */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
                {/* 标题覆盖 */}
                <div className="absolute bottom-6 left-6 right-6">
                  <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 drop-shadow-lg">
                    {project.name}
                  </h1>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                        {project.authorAvatar ? (
                          <img src={project.authorAvatar} alt={project.authorName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-white">{project.authorName[0] || '?'}</span>
                        )}
                      </div>
                      <span className="text-sm text-white/80">{project.authorName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="px-6 py-4 flex items-center gap-6 border-b border-primary/5">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span><strong className="text-text-primary">{formatCount(project.viewCount)}</strong> 次浏览</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span><strong className="text-text-primary">{formatCount(project.playCount)}</strong> 次游玩</span>
                </div>
                {project.publishedAt && (
                  <div className="text-sm text-text-secondary ml-auto">
                    发布于 {new Date(project.publishedAt).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="px-6 py-4 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartGame}
                  className="flex-1 md:flex-none"
                >
                  开始游玩
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleCopyLink}
                >
                  复制链接
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => router.push('/play')}
                >
                  返回广场
                </Button>
              </div>
            </Card>

            {/* 作品简介 */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-text-primary mb-3">作品简介</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {project.description || '暂无简介'}
              </p>
            </Card>

            {/* 标签 */}
            {project.tags.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-text-primary mb-3">标签</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  {project.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* 截图展示 */}
            {project.screenshots.length > 0 && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-text-primary mb-3">游戏截图</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {project.screenshots.map((url, i) => (
                    <div
                      key={i}
                      className="rounded-lg overflow-hidden bg-primary/5 aspect-video"
                    >
                      <img
                        src={url}
                        alt={`截图 ${i + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
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
