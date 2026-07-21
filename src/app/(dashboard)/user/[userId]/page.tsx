// 用户公开主页 - 展示用户信息/公开项目/论坛帖子
// 不需要登录即可访问
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import CategoryTabs from '@/components/ui/CategoryTabs';
import Pagination from '@/components/ui/Pagination';
import PostCard from '@/components/ui/PostCard';
import ProjectCard from '@/components/ui/ProjectCard';
import type { Project } from '@/types/project';
import type { ForumPost } from '@/types/forum';
import type { ApiResponse, PaginatedData } from '@/types/api';

/** 用户公开信息类型 */
interface PublicUserInfo {
  id: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
}

/** 标签页配置 */
const USER_TABS = [
  { value: 'projects', label: '公开项目' },
  { value: 'posts', label: '论坛帖子' },
];

/** 用户公开主页组件 */
export default function UserPublicPage(): React.JSX.Element {
  const params = useParams();
  const userId = params.userId as string;

  const [userInfo, setUserInfo] = useState<PublicUserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('projects');

  // 项目列表
  const [projects, setProjects] = useState<PaginatedData<Project> | null>(null);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(false);
  const [projectPage, setProjectPage] = useState<number>(1);

  // 帖子列表
  const [posts, setPosts] = useState<PaginatedData<ForumPost> | null>(null);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);
  const [postPage, setPostPage] = useState<number>(1);

  /** 加载用户信息 */
  const loadUserInfo = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      const result: ApiResponse<PublicUserInfo> = await response.json();
      if (result.code === 200 && result.data) {
        setUserInfo(result.data);
      } else {
        throw new Error(result.message || '获取用户信息失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户信息失败');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /** 加载用户项目 */
  const loadProjects = useCallback(async (): Promise<void> => {
    setProjectsLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        page: String(projectPage),
        pageSize: '6',
      });
      const response = await fetch(`/api/projects?${params.toString()}`);
      const result: ApiResponse<PaginatedData<Project>> = await response.json();
      if (result.code === 200 && result.data) {
        setProjects(result.data);
      }
    } catch {
      // 静默失败
    } finally {
      setProjectsLoading(false);
    }
  }, [userId, projectPage]);

  /** 加载用户帖子 */
  const loadPosts = useCallback(async (): Promise<void> => {
    setPostsLoading(true);
    try {
      const params = new URLSearchParams({
        authorId: userId,
        page: String(postPage),
        pageSize: '6',
        sortBy: 'latest',
      });
      const response = await fetch(`/api/forum?${params.toString()}`);
      const result: ApiResponse<PaginatedData<ForumPost>> = await response.json();
      if (result.code === 200 && result.data) {
        setPosts(result.data);
      }
    } catch {
      // 静默失败
    } finally {
      setPostsLoading(false);
    }
  }, [userId, postPage]);

  /** 初始化加载 */
  useEffect(() => {
    loadUserInfo();
  }, [loadUserInfo]);

  /** 标签页切换时加载 */
  useEffect(() => {
    if (userInfo) {
      if (activeTab === 'projects') {
        loadProjects();
      } else if (activeTab === 'posts') {
        loadPosts();
      }
    }
  }, [activeTab, userInfo, loadProjects, loadPosts]);

  /** 计算总页数 */
  const projectTotalPages = projects ? Math.ceil(projects.total / 6) : 1;
  const postTotalPages = posts ? Math.ceil(posts.total / 6) : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-center py-20">
            <span className="text-text-secondary">加载中...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !userInfo) {
    return (
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto p-8">
          <Card className="text-center py-10">
            <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary/30">!</span>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">用户不存在</h3>
            <p className="text-sm text-text-secondary">{error || '无法找到该用户'}</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto p-8">
        <div className="space-y-6">
          {/* 用户信息头部卡片 */}
          <Card className="p-6">
            <div className="flex items-center gap-6">
              {/* 用户头像 */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-primary/5 shrink-0">
                {userInfo.avatarUrl ? (
                  <img
                    src={userInfo.avatarUrl}
                    alt={userInfo.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xl font-bold text-primary/30">
                      {userInfo.nickname.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              {/* 用户信息 */}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-text-primary mb-1">
                  {userInfo.nickname}
                </h1>
                <p className="text-xs text-text-secondary/70">
                  注册于 {new Date(userInfo.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          </Card>

          {/* 标签页切换 */}
          <CategoryTabs tabs={USER_TABS} activeValue={activeTab} onChange={setActiveTab} />

          {/* 公开项目标签页 */}
          {activeTab === 'projects' && (
            <div>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <span className="text-text-secondary">加载中...</span>
                </div>
              ) : projects && projects.items.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.items.map((project: Project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                  {projectTotalPages > 1 && (
                    <Pagination
                      currentPage={projectPage}
                      totalPages={projectTotalPages}
                      onPageChange={setProjectPage}
                    />
                  )}
                </>
              ) : (
                <Card className="text-center py-10">
                  <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary/30">[P]</span>
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">暂无公开项目</h3>
                  <p className="text-sm text-text-secondary">该用户还没有发布任何项目</p>
                </Card>
              )}
            </div>
          )}

          {/* 论坛帖子标签页 */}
          {activeTab === 'posts' && (
            <div>
              {postsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <span className="text-text-secondary">加载中...</span>
                </div>
              ) : posts && posts.items.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {posts.items.map((post: ForumPost) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                  {postTotalPages > 1 && (
                    <Pagination
                      currentPage={postPage}
                      totalPages={postTotalPages}
                      onPageChange={setPostPage}
                    />
                  )}
                </>
              ) : (
                <Card className="text-center py-10">
                  <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-comments text-2xl opacity-40" style={{ color: '#FF9BB5' }}></i>
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">暂无帖子</h3>
                  <p className="text-sm text-text-secondary">该用户还没有发布任何帖子</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
