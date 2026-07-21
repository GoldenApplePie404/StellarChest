// 个人中心页 - 用户信息展示+修改+头像上传+修改密码+我的项目+我的帖子
// 粉色二次元风格个人中心页面
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import CategoryTabs from '@/components/ui/CategoryTabs';
import Pagination from '@/components/ui/Pagination';
import ProjectCard from '@/components/ui/ProjectCard';
import PostCard from '@/components/ui/PostCard';
import useAuth from '@/hooks/useAuth';
import useProject from '@/hooks/useProject';
import type { Project } from '@/types/project';
import type { ForumPost } from '@/types/forum';
import type { PaginatedData, ApiResponse } from '@/types/api';

/** 个人中心标签页 */
const PROFILE_TABS = [
  { value: 'info', label: '个人信息' },
  { value: 'projects', label: '我的项目' },
  { value: 'posts', label: '我的帖子' },
];

/** 个人中心内容组件（使用useSearchParams） */
function ProfileContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, loading: authLoading, logout, refreshUser } = useAuth();
  const { projects, fetchProjects, deleteProject } = useProject();

  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'info');
  const [posts, setPosts] = useState<PaginatedData<ForumPost> | null>(null);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);

  // 编辑个人信息状态
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editNickname, setEditNickname] = useState<string>('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');

  // 头像上传
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 修改密码状态
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // 操作状态
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // 项目分页
  const [projectPage, setProjectPage] = useState<number>(1);
  const [postPage, setPostPage] = useState<number>(1);

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

  /** 加载我的项目列表 */
  const loadMyProjects = useCallback(async (): Promise<void> => {
    await fetchProjects(projectPage, 6);
  }, [projectPage, fetchProjects]);

  /** 加载我的帖子列表 */
  const loadMyPosts = useCallback(async (): Promise<void> => {
    setPostsLoading(true);
    try {
      const userStr = localStorage.getItem('galgame_user');
      let userId = '';
      if (userStr) {
        try {
          userId = JSON.parse(userStr).id;
        } catch {
          userId = '';
        }
      }
      if (!userId) {
        setPostsLoading(false);
        return;
      }
      const params = new URLSearchParams({
        authorId: userId,
        page: String(postPage),
        pageSize: '6',
      });
      const response = await fetch(`/api/forum?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<PaginatedData<ForumPost>> = await response.json();
      if (result.code === 200 && result.data) {
        setPosts(result.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取帖子列表失败';
      setToastMessage(message);
      setToastType('error');
    } finally {
      setPostsLoading(false);
    }
  }, [postPage]);

  /** 标签页切换时加载对应数据 */
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push('/login');
      return;
    }
    if (activeTab === 'projects') {
      loadMyProjects();
    } else if (activeTab === 'posts') {
      loadMyPosts();
    }
  }, [activeTab, authLoading, isLoggedIn, router, loadMyProjects, loadMyPosts]);

  /** 同步编辑表单值 */
  useEffect(() => {
    if (user) {
      setEditNickname(user.nickname);
      setEditAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  /** 打开编辑弹窗 */
  const handleOpenEdit = (): void => {
    if (user) {
      setEditNickname(user.nickname);
      setEditAvatarUrl(user.avatarUrl);
    }
    setShowEditModal(true);
  };

  /** 保存个人信息 */
  const handleSaveProfile = async (): Promise<void> => {
    if (!editNickname.trim()) {
      setToastMessage('昵称不能为空');
      setToastType('warning');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          nickname: editNickname.trim(),
          avatarUrl: editAvatarUrl.trim(),
        }),
      });
      const result: ApiResponse<null> = await response.json();
      if (result.code === 200) {
        // 更新本地缓存
        const userStr = localStorage.getItem('galgame_user');
        if (userStr) {
          const storedUser = JSON.parse(userStr);
          storedUser.nickname = editNickname.trim();
          storedUser.avatarUrl = editAvatarUrl.trim();
          localStorage.setItem('galgame_user', JSON.stringify(storedUser));
        }
        setShowEditModal(false);
        setToastMessage('个人信息已更新');
        setToastType('success');
        await refreshUser();
      } else {
        throw new Error(result.message || '更新失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新失败，请重试';
      setToastMessage(message);
      setToastType('error');
    } finally {
      setSubmitting(false);
    }
  };

  /** 头像上传处理 */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToastMessage('请选择图片文件');
      setToastType('warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage('图片大小不能超过5MB');
      setToastType('warning');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'images');

      const token = localStorage.getItem('galgame_token');
      const uploadHeaders: Record<string, string> = {};
      if (token) {
        uploadHeaders['Authorization'] = `Bearer ${token}`;
      }

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });

      const uploadResult: ApiResponse<{ filename: string; storagePath: string }> = await uploadResponse.json();
      if (uploadResult.code === 200 && uploadResult.data) {
        const avatarUrl = `/${uploadResult.data.storagePath.replace(/\\/g, '/')}`;

        const updateResponse = await fetch('/api/auth/me', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            nickname: user?.nickname || '创作者',
            avatarUrl,
          }),
        });
        const updateResult: ApiResponse<null> = await updateResponse.json();
        if (updateResult.code === 200) {
          const userStr = localStorage.getItem('galgame_user');
          if (userStr) {
            const storedUser = JSON.parse(userStr);
            storedUser.avatarUrl = avatarUrl;
            localStorage.setItem('galgame_user', JSON.stringify(storedUser));
          }
          setToastMessage('头像已更新');
          setToastType('success');
          await refreshUser();
        } else {
          throw new Error(updateResult.message || '更新头像失败');
        }
      } else {
        throw new Error(uploadResult.message || '上传失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '头像上传失败';
      setToastMessage(message);
      setToastType('error');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /** 修改密码 */
  const handleChangePassword = async (): Promise<void> => {
    if (!oldPassword) {
      setToastMessage('请输入旧密码');
      setToastType('warning');
      return;
    }
    if (!newPassword) {
      setToastMessage('请输入新密码');
      setToastType('warning');
      return;
    }
    if (newPassword.length < 6) {
      setToastMessage('新密码至少6个字符');
      setToastType('warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      setToastMessage('两次输入的新密码不一致');
      setToastType('warning');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      });
      const result: ApiResponse<null> = await response.json();
      if (result.code === 200) {
        setShowPasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setToastMessage('密码修改成功');
        setToastType('success');
      } else {
        throw new Error(result.message || '修改失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '修改密码失败';
      setToastMessage(message);
      setToastType('error');
    } finally {
      setSubmitting(false);
    }
  };

  /** 退出登录 */
  const handleLogout = (): void => {
    logout();
  };

  /** 删除项目 */
  const handleDeleteProject = async (): Promise<void> => {
    const success = await deleteProject(deleteTargetId);
    setShowDeleteModal(false);
    if (success) {
      setToastMessage('项目已删除');
      setToastType('success');
      await loadMyProjects();
    } else {
      setToastMessage('删除失败');
      setToastType('error');
    }
  };

  /** 删除项目按钮点击 */
  const handleDeleteProjectClick = (id: string): void => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  /** 项目分页切换 */
  const handleProjectPageChange = (page: number): void => {
    setProjectPage(page);
  };

  /** 帖子分页切换 */
  const handlePostPageChange = (page: number): void => {
    setPostPage(page);
  };

  /** 计算项目总页数 */
  const projectTotalPages = projects ? Math.ceil(projects.total / 6) : 1;

  /** 计算帖子总页数 */
  const postTotalPages = posts ? Math.ceil(posts.total / 6) : 1;

  return (
    <div>
      <main className="max-w-4xl mx-auto p-8">
        {authLoading && (
          <div className="flex items-center justify-center py-20">
            <span className="text-text-secondary">加载中...</span>
          </div>
        )}

        {isLoggedIn && user && (
          <div className="space-y-6">
            {/* 用户信息头部卡片 */}
            <Card className="p-6">
              <div className="flex items-center gap-6">
                {/* 用户头像 - 可点击上传 */}
                <div className="relative group shrink-0">
                  <div
                    className="w-16 h-16 rounded-lg overflow-hidden bg-primary/5 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xl font-bold text-primary/30">{user.nickname.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">更换头像</span>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  {uploadingAvatar && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] text-primary">上传中...</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-text-primary mb-1">{user.nickname}</h1>
                  <p className="text-sm text-text-secondary">{user.email}</p>
                  <p className="text-xs text-text-secondary/70 mt-1">
                    注册于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleOpenEdit}>
                    编辑信息
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowPasswordModal(true);
                    }}
                  >
                    修改密码
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleLogout}>
                    退出登录
                  </Button>
                </div>
              </div>
            </Card>

            {/* 标签页切换 */}
            <CategoryTabs tabs={PROFILE_TABS} activeValue={activeTab} onChange={setActiveTab} />

            {/* 个人信息标签页 */}
            {activeTab === 'info' && (
              <Card className="p-6">
                <h2 className="text-lg font-bold text-text-primary mb-4">个人信息</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 rounded-lg p-4">
                    <span className="text-xs text-text-secondary">昵称</span>
                    <p className="text-sm font-medium text-text-primary mt-1">{user.nickname}</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4">
                    <span className="text-xs text-text-secondary">邮箱</span>
                    <p className="text-sm font-medium text-text-primary mt-1">{user.email}</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4">
                    <span className="text-xs text-text-secondary">角色</span>
                    <p className="text-sm font-medium text-text-primary mt-1">
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4">
                    <span className="text-xs text-text-secondary">注册时间</span>
                    <p className="text-sm font-medium text-text-primary mt-1">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* 我的项目标签页 */}
            {activeTab === 'projects' && (
              <div>
                {projects && projects.items.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {projects.items.map((project: Project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onDelete={handleDeleteProjectClick}
                        />
                      ))}
                    </div>
                    {projectTotalPages > 1 && (
                      <Pagination
                        currentPage={projectPage}
                        totalPages={projectTotalPages}
                        onPageChange={handleProjectPageChange}
                      />
                    )}
                  </>
                ) : (
                  <Card className="text-center py-10">
                    <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-primary/30">[P]</span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">暂无项目</h3>
                    <p className="text-sm text-text-secondary mb-4">还没有创建任何项目</p>
                    <Button variant="primary" size="md" onClick={() => router.push('/projects/create')}>
                      新建项目
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {/* 我的帖子标签页 */}
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
                        onPageChange={handlePostPageChange}
                      />
                    )}
                  </>
                ) : (
                  <Card className="text-center py-10">
                    <div className="w-16 h-16 rounded-lg bg-primary/5 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-comments text-2xl opacity-40" style={{ color: '#FF9BB5' }}></i>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">暂无帖子</h3>
                    <p className="text-sm text-text-secondary mb-4">还没有发布任何帖子</p>
                    <Button variant="primary" size="md" onClick={() => router.push('/forum/create')}>
                      发布帖子
                    </Button>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 编辑个人信息弹窗 */}
      <Modal
        visible={showEditModal}
        title="编辑个人信息"
        onClose={() => setShowEditModal(false)}
        onConfirm={handleSaveProfile}
        confirmText="保存"
        width="max-w-lg"
      >
        <div className="space-y-4">
          <Input label="昵称" value={editNickname} onChange={setEditNickname} required />
          <Input
            label="头像URL"
            value={editAvatarUrl}
            onChange={setEditAvatarUrl}
            placeholder="输入头像图片URL"
          />
          <p className="text-xs text-text-secondary/70">提示：也可以点击头像直接上传图片</p>
        </div>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        visible={showPasswordModal}
        title="修改密码"
        onClose={() => setShowPasswordModal(false)}
        onConfirm={handleChangePassword}
        confirmText="确认修改"
        width="max-w-md"
      >
        <div className="space-y-4">
          <Input label="旧密码" type="password" value={oldPassword} onChange={setOldPassword} placeholder="输入当前密码" required />
          <Input label="新密码" type="password" value={newPassword} onChange={setNewPassword} placeholder="至少6个字符" required />
          <Input label="确认新密码" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入新密码" required />
        </div>
      </Modal>

      {/* 删除项目确认弹窗 */}
      <Modal
        visible={showDeleteModal}
        title="删除项目"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteProject}
        confirmText="确认删除"
        width="max-w-sm"
      >
        <p className="text-text-secondary text-sm">确定要删除该项目吗？此操作不可撤销。</p>
      </Modal>

      {/* 提示通知 */}
      {toastMessage && <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />}
    </div>
  );
}

/** 个人中心页 - 用 Suspense 包裹 useSearchParams */
export default function ProfilePage(): React.JSX.Element {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <span className="text-text-secondary">加载中...</span>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
