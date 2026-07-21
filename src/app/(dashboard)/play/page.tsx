// VN 引擎页面 — 星之境 · 游戏就绪界面
// 支持 Tab 切换：我的项目 / 作品广场
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  config: { entryScript: string; resourceMap: Record<string, string> };
}

/** 已发布项目（来自 API） */
interface PublishedProject {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  authorName: string;
  authorAvatar: string;
  viewCount: number;
  playCount: number;
  tags: string[];
  publishedAt: string | null;
}

/** 格式时间 */
function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString('zh-CN');
}

/** 格式化计数 */
function formatCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

const TAB_OPTIONS = ['我的项目', '作品广场'] as const;
type PlayTab = (typeof TAB_OPTIONS)[number];

export default function PlayPage(): React.JSX.Element {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PlayTab>('我的项目');

  // --- 我的项目状态 ---
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 作品广场状态 ---
  const [publishedProjects, setPublishedProjects] = useState<PublishedProject[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(false);
  const [publishedError, setPublishedError] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('galgame_token') || '');
  }, []);

  /** 获取用户项目列表 */
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200 && Array.isArray(data.data?.items)) {
        setProjects(data.data.items);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) fetchProjects();
    else setLoading(false);
  }, [token, fetchProjects]);

  /** 获取已发布作品列表 */
  const fetchPublishedProjects = useCallback(async () => {
    setPublishedLoading(true);
    setPublishedError(null);
    try {
      const res = await fetch('/api/projects/published?pageSize=12&sort=newest');
      const result = await res.json();
      if (result.code === 200 && result.data) {
        setPublishedProjects(result.data.items || []);
      } else {
        throw new Error(result.message || '获取作品列表失败');
      }
    } catch (err) {
      setPublishedError(err instanceof Error ? err.message : '获取作品列表失败');
      setPublishedProjects([]);
    }
    setPublishedLoading(false);
  }, []);

  /** Tab 切换时惰性加载作品广场数据 */
  useEffect(() => {
    if (activeTab === '作品广场' && publishedProjects.length === 0 && !publishedLoading) {
      fetchPublishedProjects();
    }
  }, [activeTab, publishedProjects.length, publishedLoading, fetchPublishedProjects]);

  /** 上传本地项目 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('zip', file);

      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (data.code === 200 && data.data?.id) {
        router.push(`/projects/${data.data.id}/preview`);
      } else {
        setError(data.message || '导入失败');
      }
    } catch {
      setError('上传失败，请检查文件格式');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** 星星粒子 */
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: 1 + Math.random() * 2,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 2 + Math.random() * 3,
  }));

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center px-6 py-12"
      style={{
        background: 'linear-gradient(160deg, #0a0a14 0%, #1a0a1e 30%, #0f0a20 60%, #080818 100%)',
      }}
    >
      {/* 星星背景 */}
      {stars.map((s) => (
        <div key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: s.size, height: s.size,
            left: `${s.left}%`, top: `${s.top}%`,
            background: s.id % 3 === 0 ? '#FFD700' : s.id % 3 === 1 ? '#FF7EB3' : '#C8A2E8',
            opacity: 0.3 + Math.random() * 0.4,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* 内容容器 */}
      <div className="relative z-10 w-full max-w-5xl">
        {/* 标题区 */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(255,126,179,0.2), rgba(200,162,232,0.2))',
              border: '1px solid rgba(255,126,179,0.2)',
              boxShadow: '0 0 40px rgba(255,126,179,0.15)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FF7EB3" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2"
            style={{
              fontFamily: 'var(--font-zen-maru)',
              color: '#FFFFFF',
              textShadow: '0 0 30px rgba(255,126,179,0.3)',
              letterSpacing: '0.1em',
            }}
          >
            星之境
          </h1>
          <p className="text-sm opacity-50" style={{ color: '#C8A2E8', fontFamily: 'var(--font-zen-maru)' }}>
            Ready to Play
          </p>
        </div>

        {/* Tab 切换栏 */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab}
              className="px-6 py-2 rounded-full text-sm font-bold transition-all duration-300"
              style={{
                color: activeTab === tab ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                background: activeTab === tab
                  ? 'linear-gradient(135deg, rgba(255,126,179,0.25), rgba(200,162,232,0.25))'
                  : 'rgba(255,255,255,0.04)',
                border: activeTab === tab
                  ? '1px solid rgba(255,126,179,0.3)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ===== 我的项目 Tab ===== */}
        {activeTab === '我的项目' && (
          <div className="space-y-4 max-w-2xl mx-auto">
            {/* 我的项目 */}
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <h2 className="text-sm font-bold" style={{ color: '#FF7EB3', fontFamily: 'var(--font-zen-maru)' }}>
                  我的项目
                </h2>
                {token && (
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {projects.length} 个项目
                  </span>
                )}
              </div>

              <div className="p-4 min-h-[120px]">
                {!token ? (
                  <div className="text-center py-6">
                    <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>请先登录以查看项目</p>
                    <Button variant="primary" size="sm" onClick={() => router.push('/login')}>
                      登录
                    </Button>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 rounded-full"
                      style={{ borderColor: 'rgba(255,126,179,0.2)', borderTopColor: '#FF7EB3' }} />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      还没有项目，从本地上传或前往编辑器创建
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.map((p) => (
                      <div key={p.id}
                        className="group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:translate-x-1"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                        onClick={() => router.push(`/projects/${p.id}/preview`)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF7EB3" opacity="0.6">
                              <polygon points="5,3 19,12 5,21"/>
                            </svg>
                            <span className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                              {p.name}
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-xs mt-1 truncate pl-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {p.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {formatTime(p.updatedAt)}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(255,126,179,0.15)', color: '#FF7EB3' }}>
                            开始游戏
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 上传本地项目 */}
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <h2 className="text-sm font-bold" style={{ color: '#C8A2E8', fontFamily: 'var(--font-zen-maru)' }}>
                  从本地上传
                </h2>
              </div>

              <div className="p-4">
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-opacity-60"
                  style={{
                    borderColor: 'rgba(255,126,179,0.2)',
                    background: uploading ? 'rgba(255,126,179,0.05)' : 'transparent',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".galtoolkit.zip,.zip"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin w-8 h-8 border-2 rounded-full"
                        style={{ borderColor: 'rgba(200,162,232,0.2)', borderTopColor: '#C8A2E8' }} />
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>正在导入项目...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(200,162,232,0.4)" strokeWidth="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        点击上传 .galtoolkit.zip 项目包
                      </span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        支持从编辑器导出的项目文件
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-xs mt-3 text-center" style={{ color: '#FF6B6B' }}>{error}</p>
                )}
              </div>
            </div>

            {/* 底部 */}
            <div className="text-center mt-6">
              <button
                className="text-xs transition-all hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                onClick={() => router.push('/projects')}
              >
                前往编辑器创建新项目 →
              </button>
            </div>
          </div>
        )}

        {/* ===== 作品广场 Tab ===== */}
        {activeTab === '作品广场' && (
          <div className="w-full">
            {publishedLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-3"
                    style={{ borderColor: 'rgba(255,126,179,0.3)', borderTopColor: '#FF7EB3' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>加载作品中...</span>
                </div>
              </div>
            ) : publishedError ? (
              <div className="rounded-2xl overflow-hidden text-center py-12 px-6"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <p className="text-sm mb-4" style={{ color: '#FF6B6B' }}>{publishedError}</p>
                <Button variant="primary" size="sm" onClick={fetchPublishedProjects}>
                  重试
                </Button>
              </div>
            ) : publishedProjects.length === 0 ? (
              <div className="rounded-2xl overflow-hidden text-center py-16 px-6"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(255,126,179,0.1)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,126,179,0.4)" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  暂无发布作品
                </h3>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  还没有创作者发布作品，敬请期待
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {publishedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(12px)',
                    }}
                    onClick={() => router.push(`/play/${project.id}`)}
                  >
                    {/* 封面图 */}
                    <div className="relative h-36 overflow-hidden" style={{ background: 'rgba(255,126,179,0.05)' }}>
                      {project.coverUrl ? (
                        <img
                          src={project.coverUrl}
                          alt={project.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,155,181,0.3)" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                      {/* 悬停遮罩 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                        <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs px-4 py-2 rounded-full"
                          style={{ background: 'rgba(255,126,179,0.8)' }}>
                          开始游玩
                        </span>
                      </div>
                    </div>

                    {/* 信息区 */}
                    <div className="p-4">
                      {/* 项目名称 */}
                      <h3 className="text-sm font-bold truncate mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {project.name}
                      </h3>

                      {/* 项目描述 */}
                      <p className="text-xs mb-3 line-clamp-2 min-h-[2.5em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {project.description || '暂无描述'}
                      </p>

                      {/* 作者信息 */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                          style={{ background: 'rgba(255,126,179,0.15)' }}>
                          {project.authorAvatar ? (
                            <img src={project.authorAvatar} alt={project.authorName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-bold" style={{ color: '#FF7EB3' }}>
                              {project.authorName?.[0] || '?'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {project.authorName}
                        </span>
                      </div>

                      {/* 统计信息 */}
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          {formatCount(project.viewCount)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                          {formatCount(project.playCount)}
                        </span>
                      </div>

                      {/* 标签 */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-3 flex-wrap">
                          {project.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[10px]"
                              style={{ background: 'rgba(255,126,179,0.1)', color: 'rgba(255,126,179,0.7)' }}
                            >
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                              +{project.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.8s ease-out both; }
      `}</style>
    </div>
  );
}
