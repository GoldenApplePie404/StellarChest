// 项目详情页 - 显示项目信息+文件列表+操作按钮(编辑/预览/导出/导入)
// 粉色二次元风格详情展示
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import useProject from '@/hooks/useProject';
import useAuth from '@/hooks/useAuth';
import type { ProjectFile, ProjectFileType, ProjectStatus } from '@/types/project';
import type { CollaboratorView } from '@/services/ProjectCollabService';

/** 文件类型中文标签映射 */
const FILE_TYPE_LABELS: Record<ProjectFileType, string> = {
  script: '脚本',
  image: '图片',
  audio: '音频',
  config: '配置',
  other: '其他',
};

/** 文件类型图标映射（Font Awesome） */
const FILE_TYPE_ICONS: Record<ProjectFileType, string> = {
  script: 'fa-file-code',
  image: 'fa-image',
  audio: 'fa-music',
  config: 'fa-cog',
  other: 'fa-file',
};

/** 文件类型颜色映射 */
const FILE_TYPE_COLORS: Record<ProjectFileType, string> = {
  script: '#FF6B9D',
  image: '#7EC8E3',
  audio: '#6BCB77',
  config: '#FFE66D',
  other: '#8E8E8E',
};

/** 项目状态中文标签映射 */
const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

/** 项目详情页组件 */
export default function ProjectDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentProject, loading, error, fetchProject, updateProject, deleteProject, exportProject, importProject, clearError } = useProject();
  // 是否为项目创建者（用于控制协作管理权限）
  const isOwner = !!user?.id && currentProject?.userId === user.id;

  const projectId = params.id as string;

  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  // 资源管理状态
  const [showResourceModal, setShowResourceModal] = useState<boolean>(false);
  const [libraryAssets, setLibraryAssets] = useState<any[]>([]);
  const [libraryLoading, setLibraryLoading] = useState<boolean>(false);
  // 协作管理状态（雏形）
  const [collaborators, setCollaborators] = useState<CollaboratorView[]>([]);
  const [collabOwnerId, setCollabOwnerId] = useState<string>('');
  const [collabLoading, setCollabLoading] = useState<boolean>(false);
  const [newCollabUserId, setNewCollabUserId] = useState<string>('');
  const [newCollabRole, setNewCollabRole] = useState<'editor' | 'viewer'>('editor');
  const [collabBusy, setCollabBusy] = useState<boolean>(false);
  // 发布相关状态
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [publishTags, setPublishTags] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);
  const [showPublishSuccessModal, setShowPublishSuccessModal] = useState<boolean>(false);
  const [publishedLink, setPublishedLink] = useState<string>('');

  /** 加载项目详情 */
  const loadProject = useCallback(async (): Promise<void> => {
    if (projectId) {
      await fetchProject(projectId);
    }
  }, [projectId, fetchProject]);

  /** 初始化加载 */
  useEffect(() => {
    loadProject();
  }, [loadProject]);

  /** 打开资源弹窗时加载素材库 */
  useEffect(() => {
    if (!showResourceModal) return;
    setLibraryLoading(true);
    fetch('/api/assets?pageSize=50')
      .then((r) => r.json())
      .then((result) => {
        if (result.code === 200 && result.data?.items) {
          setLibraryAssets(result.data.items);
        }
      })
      .catch(() => {})
      .finally(() => setLibraryLoading(false));
  }, [showResourceModal]);

  /** 加载协作成员列表 */
  useEffect(() => {
    if (!currentProject) return;
    setCollabLoading(true);
    fetch(`/api/projects/${projectId}/collaborators`)
      .then((r) => r.json())
      .then((res) => {
        if (res.code === 200 && res.data) {
          setCollaborators(res.data.members || []);
          setCollabOwnerId(res.data.ownerId || '');
        }
      })
      .catch(() => {})
      .finally(() => setCollabLoading(false));
  }, [currentProject, projectId]);

  /** 添加协作者（仅 owner 可用） */
  const handleAddCollab = async (): Promise<void> => {
    if (!newCollabUserId.trim() || collabBusy) return;
    setCollabBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}`,
        },
        body: JSON.stringify({ userId: newCollabUserId.trim(), role: newCollabRole }),
      });
      const result = await res.json();
      if (result.code === 200) {
        setToastMessage(`已添加协作者: ${result.data?.nickname || newCollabUserId}`);
        setToastType('success');
        setNewCollabUserId('');
        const reload = await fetch(`/api/projects/${projectId}/collaborators`);
        const data = await reload.json();
        if (data.code === 200 && data.data) {
          setCollaborators(data.data.members || []);
          setCollabOwnerId(data.data.ownerId || '');
        }
      } else {
        setToastMessage(result.message || '添加失败');
        setToastType('error');
      }
    } catch {
      setToastMessage('添加失败，请重试');
      setToastType('error');
    } finally {
      setCollabBusy(false);
    }
  };

  /** 移除协作者（仅 owner 可用） */
  const handleRemoveCollab = async (targetUserId: string): Promise<void> => {
    if (collabBusy) return;
    setCollabBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/collaborators?userId=${encodeURIComponent(targetUserId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}` },
        },
      );
      const result = await res.json();
      if (result.code === 200) {
        setToastMessage('已移除协作者');
        setToastType('success');
        setCollaborators((prev) => prev.filter((m) => m.userId !== targetUserId));
      } else {
        setToastMessage(result.message || '移除失败');
        setToastType('error');
      }
    } catch {
      setToastMessage('移除失败，请重试');
      setToastType('error');
    } finally {
      setCollabBusy(false);
    }
  };

  /** 同步编辑表单默认值 */
  useEffect(() => {
    if (currentProject) {
      setEditName(currentProject.name);
      setEditDesc(currentProject.description);
    }
  }, [currentProject]);

  /** 打开编辑弹窗 */
  const handleOpenEdit = (): void => {
    if (currentProject) {
      setEditName(currentProject.name);
      setEditDesc(currentProject.description);
    }
    setShowEditModal(true);
  };

  /** 更新项目信息 */
  const handleUpdateProject = async (): Promise<void> => {
    if (!editName.trim()) {
      setToastMessage('项目名称不能为空');
      setToastType('warning');
      return;
    }
    const result = await updateProject(projectId, {
      name: editName.trim(),
      description: editDesc.trim(),
    });
    setShowEditModal(false);
    if (result) {
      setToastMessage('项目信息已更新');
      setToastType('success');
    } else {
      setToastMessage('更新失败，请重试');
      setToastType('error');
    }
  };

  /** 删除项目 */
  const handleDelete = async (): Promise<void> => {
    const success = await deleteProject(projectId);
    setShowDeleteModal(false);
    if (success) {
      setToastMessage('项目已删除');
      setToastType('success');
      router.push('/projects');
    } else {
      setToastMessage('删除失败，请重试');
      setToastType('error');
    }
  };

  /** 导出项目 */
  const handleExport = async (): Promise<void> => {
    const success = await exportProject(projectId);
    if (success) {
      setToastMessage('项目导出成功，文件已下载');
      setToastType('success');
    } else {
      setToastMessage('导出失败，请重试');
      setToastType('error');
    }
  };

  /** 导入项目文件 */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const success = await importProject(projectId, file);
    if (success) {
      setToastMessage('项目导入成功');
      setToastType('success');
      await loadProject();
    } else {
      setToastMessage('导入失败，请重试');
      setToastType('error');
    }
    // 清空input值以便重复选择同一文件
    e.target.value = '';
  };

  /** 进入编辑器 */
  const handleGoEditor = (): void => {
    router.push(`/editor/${projectId}`);
  };

  /** 进入预览 */
  const handleGoPreview = (): void => {
    router.push(`/projects/${projectId}/preview`);
  };

  /** 打开发布弹窗 */
  const handleOpenPublish = (): void => {
    if (currentProject) {
      setPublishTags(currentProject.tags ? currentProject.tags.join(', ') : '');
    }
    setShowPublishModal(true);
  };

  /** 执行发布 */
  const handlePublish = async (): Promise<void> => {
    if (!currentProject) return;
    setPublishing(true);
    try {
      // 先更新封面和描述
      if (currentProject.coverUrl) {
        await updateProject(projectId, { coverUrl: currentProject.coverUrl });
      }

      // 更新标签（通过config接口更新）
      const tagsArr = publishTags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      // 通过项目的 updateProject 设置 tags（通过 description 携带 tags 作为附加数据）
      // 实际 tags 通过单独 API 更新
      const updateRes = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}`,
        },
        body: JSON.stringify({
          name: currentProject.name,
          description: currentProject.description,
          coverUrl: currentProject.coverUrl,
        }),
      });
      const updateData = await updateRes.json();
      if (updateData.code !== 200) {
        throw new Error(updateData.message || '更新项目信息失败');
      }

      // 调用发布 API
      const publishRes = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}`,
        },
      });
      const publishData = await publishRes.json();
      if (publishData.code !== 200) {
        throw new Error(publishData.message || '发布失败');
      }

      setShowPublishModal(false);
      setPublishedLink(`${window.location.origin}/play/${projectId}`);
      setShowPublishSuccessModal(true);
      setToastMessage('作品发布成功');
      setToastType('success');
      await loadProject();
    } catch (err) {
      const message = err instanceof Error ? err.message : '发布失败，请重试';
      setToastMessage(message);
      setToastType('error');
    } finally {
      setPublishing(false);
    }
  };

  /** 取消发布 */
  const handleUnpublish = async (): Promise<void> => {
    try {
      const unpublishRes = await fetch(`/api/projects/${projectId}/unpublish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}`,
        },
      });
      const unpublishData = await unpublishRes.json();
      if (unpublishData.code === 200) {
        setToastMessage('已取消发布');
        setToastType('info');
        await loadProject();
      } else {
        throw new Error(unpublishData.message || '取消发布失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '取消发布失败';
      setToastMessage(message);
      setToastType('error');
    }
  };

  /** 复制分享链接 */
  const handleCopyShareLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(publishedLink);
      setToastMessage('链接已复制到剪贴板');
      setToastType('success');
    } catch {
      setToastMessage('复制链接失败');
      setToastType('error');
    }
  };

  /** 前往作品页 */
  const handleGoToPlay = (): void => {
    setShowPublishSuccessModal(false);
    router.push(`/play/${projectId}`);
  };

  /** 格式化文件大小 */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div>
      <main className="max-w-4xl mx-auto p-8">
        {/* 加载状态 */}
        {loading && !currentProject && (
          <div className="flex items-center justify-center py-20">
            <span className="text-text-secondary">加载中...</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && !currentProject && (
          <Card className="text-center py-10">
            <p className="text-error mb-4">{error}</p>
            <Button variant="primary" size="sm" onClick={loadProject}>重试</Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>返回项目列表</Button>
          </Card>
        )}

        {/* 项目详情内容 */}
        {currentProject && (
          <div className="space-y-6">
            {/* 项目信息头部 */}
            <Card className="p-6">
              <div className="flex items-start gap-6">
                {/* 封面图 */}
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-primary/5 shrink-0">
                  {currentProject.coverUrl ? (
                    <img src={currentProject.coverUrl} alt={currentProject.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-pearl">
                      <i className="fas fa-image text-3xl opacity-30" style={{ color: '#FF9BB5' }}></i>
                    </div>
                  )}
                </div>
                {/* 项目基本信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-xl font-bold text-text-primary">{currentProject.name}</h1>
                    <span className="px-2 py-1 rounded-btn text-xs font-medium bg-primary/10 text-primary">
                      {STATUS_LABELS[currentProject.status]}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-4">
                    {currentProject.description || '暂无描述'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-text-secondary/70">
                    <span>创建于 {new Date(currentProject.createdAt).toLocaleDateString('zh-CN')}</span>
                    <span>更新于 {new Date(currentProject.updatedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              </div>

              {/* 操作按钮行 */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-primary/10">
                <Button variant="primary" size="md" onClick={handleGoEditor}>
                  进入编辑器
                </Button>
                <Button variant="secondary" size="md" onClick={handleGoPreview}>
                  预览运行
                </Button>
                <Button variant="ghost" size="md" onClick={handleExport}>
                  导出项目
                </Button>
                <label className="cursor-pointer">
                  <Button variant="ghost" size="md" onClick={() => {}}>
                    导入文件
                  </Button>
                  <input
                    type="file"
                    accept=".galtoolkit.zip,.zip"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
                <Button variant="ghost" size="md" onClick={handleOpenEdit}>
                  编辑信息
                </Button>
                {/* 发布 / 已发布按钮 */}
                {currentProject.status === 'draft' && (
                  <Button variant="accent" size="md" onClick={handleOpenPublish}>
                    发布作品
                  </Button>
                )}
                {currentProject.status === 'published' && (
                  <>
                    <span className="px-3 py-1.5 rounded-btn text-xs font-medium bg-success/20 text-success">
                      已发布
                    </span>
                    <Button variant="ghost" size="md" onClick={handleUnpublish}>
                      取消发布
                    </Button>
                  </>
                )}
                <Button variant="danger" size="md" onClick={() => setShowDeleteModal(true)}>
                  删除项目
                </Button>
              </div>
            </Card>

            {/* 项目配置信息 */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-text-primary mb-4">项目配置</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-primary/5 rounded-lg p-4">
                  <span className="text-xs text-text-secondary">入口脚本</span>
                  <p className="text-sm font-medium text-text-primary mt-1">{currentProject.config.entryScript}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <span className="text-xs text-text-secondary">对话框样式</span>
                  <p className="text-sm font-medium text-text-primary mt-1">{currentProject.config.dialogStyle}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <span className="text-xs text-text-secondary">显示速度</span>
                  <p className="text-sm font-medium text-text-primary mt-1">{currentProject.config.textSpeed}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <span className="text-xs text-text-secondary">角色数量</span>
                  <p className="text-sm font-medium text-text-primary mt-1">{currentProject.config.characterIds.length}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <span className="text-xs text-text-secondary">资源数量</span>
                  <p className="text-sm font-medium text-text-primary mt-1">{Object.keys(currentProject.config.resourceMap).length}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <span className="text-xs text-text-secondary">自动存档</span>
                  <p className="text-sm font-medium text-text-primary mt-1">{currentProject.config.autoSave ? '已开启' : '未开启'}</p>
                </div>
              </div>
            </Card>

            {/* 资源管理 */}
            {currentProject.config && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-text-primary">资源管理</h2>
                  <Button variant="accent" size="sm" onClick={() => setShowResourceModal(true)}>
                    + 从素材库导入
                  </Button>
                </div>

                {Object.keys(currentProject.config.resourceMap).length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-sm">
                    暂无资源，点击上方按钮从素材库导入
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(currentProject.config.resourceMap).map(([key, url]) => (
                      <div key={key}
                        className="group relative p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all border border-primary/5"
                      >
                        {/* 资源预览 */}
                        <div className="w-full h-20 rounded-md overflow-hidden bg-primary/5 mb-2 flex items-center justify-center">
                          {url.match(/\.(png|jpg|jpeg|webp|gif|svg)/i) ? (
                            <img src={url} alt={key} className="w-full h-full object-contain" />
                          ) : url.match(/\.(mp3|ogg|wav|flac)/i) ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF7EB3" strokeWidth="1.5" className="opacity-40">
                              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="1.5" className="opacity-40">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                          )}
                        </div>
                        <div className="text-xs font-medium text-text-primary truncate">{key}</div>
                        <div className="text-xs text-text-tertiary truncate">{url.split('/').pop()}</div>
                        {/* 删除按钮 */}
                        <button
                          onClick={async () => {
                            const newMap = { ...currentProject.config.resourceMap };
                            delete newMap[key];
                            const res = await fetch(`/api/projects/${projectId}/config`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ resourceMap: newMap }),
                            });
                            const result = await res.json();
                            if (result.code === 200) {
                              setToastMessage('资源已移除');
                              setToastType('success');
                              loadProject();
                            }
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-error/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-error"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

              {/* 协作管理（雏形） */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-primary">协作管理</h2>
                <span className="text-xs text-text-secondary/70">共 {collaborators.length} 人</span>
              </div>

              {collabLoading ? (
                <div className="text-center py-6 text-text-secondary text-sm">加载协作者...</div>
              ) : collaborators.length === 0 ? (
                <div className="text-center py-6 text-text-secondary text-sm">暂无协作者</div>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((m) => {
                    const roleLabel =
                      m.role === 'owner' ? '创建者' : m.role === 'editor' ? '编辑' : '查看';
                    const isOwnerRow = m.role === 'owner';
                    return (
                      <div
                        key={m.userId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: '#FF9BB5' + '22', color: '#FF9BB5' }}
                        >
                          {(m.nickname || m.userId).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {m.nickname || m.userId}
                          </div>
                          <div className="text-xs text-text-tertiary truncate">{m.userId}</div>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-btn shrink-0"
                          style={{
                            background: isOwnerRow ? '#FFD70022' : '#7EC8E322',
                            color: isOwnerRow ? '#FFD700' : '#7EC8E3',
                          }}
                        >
                          {roleLabel}
                        </span>
                        {isOwner && !isOwnerRow && (
                          <button
                            onClick={() => handleRemoveCollab(m.userId)}
                            disabled={collabBusy}
                            className="text-xs px-2 py-1 rounded-btn shrink-0 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#FF6B9D' }}
                          >
                            移除
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* owner 才显示添加表单 */}
              {isOwner && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-primary/10">
                  <Input
                    label=""
                    placeholder="输入协作者用户ID"
                    value={newCollabUserId}
                    onChange={setNewCollabUserId}
                  />
                  <select
                    value={newCollabRole}
                    onChange={(e) => setNewCollabRole(e.target.value as 'editor' | 'viewer')}
                    className="px-3 py-2 rounded-btn border border-primary/20 bg-white text-text-primary focus:outline-none focus:border-primary text-sm"
                  >
                    <option value="editor">编辑</option>
                    <option value="viewer">查看</option>
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddCollab}
                    disabled={collabBusy || !newCollabUserId.trim()}
                  >
                    添加
                  </Button>
                </div>
              )}
              {!isOwner && (
                <p className="text-xs text-text-tertiary mt-3">
                  仅项目创建者可管理协作者（实时协同编辑、冲突合并等能力将在后续版本完善）。
                </p>
              )}
            </Card>

          {/* 从素材库导入弹窗 */}
            {showResourceModal && (
              <Modal
                visible={showResourceModal}
                title="从素材库导入"
                onClose={() => setShowResourceModal(false)}
                width="max-w-2xl"
              >
                <div className="max-h-96 overflow-y-auto">
                  {libraryLoading ? (
                    <div className="text-center py-8 text-text-secondary">加载素材库...</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {libraryAssets.map((asset: any) => {
                        const isImage = asset.category !== 'sound_effect' && asset.category !== 'bgm' && asset.category !== 'sfx';
                        const isAudio = asset.category === 'sound_effect' || asset.category === 'bgm' || asset.category === 'sfx';
                        return (
                          <div key={asset.id}
                            className="p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all border border-primary/5 cursor-pointer"
                          >
                            {/* 预览 */}
                            <div className="w-full h-20 rounded-md overflow-hidden bg-primary/5 mb-2 flex items-center justify-center">
                              {isImage ? (
                                <img src={asset.url || asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-contain" />
                              ) : isAudio ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6BCB77" strokeWidth="1.5" className="opacity-40">
                                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                                </svg>
                              ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8E8E8E" strokeWidth="1.5" className="opacity-40">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                </svg>
                              )}
                            </div>
                            <div className="text-xs font-medium text-text-primary truncate">{asset.name}</div>
                            <div className="text-xs text-text-tertiary truncate mb-2">{asset.category}</div>
                            <Button
                              variant="primary"
                              size="sm"
                              fullWidth
                              onClick={async () => {
                                const key = asset.id || asset.name;
                                const newMap = {
                                  ...currentProject!.config.resourceMap,
                                  [key]: asset.url,
                                };
                                const res = await fetch(`/api/projects/${projectId}/config`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ resourceMap: newMap }),
                                });
                                const result = await res.json();
                                if (result.code === 200) {
                                  setToastMessage(`已导入: ${asset.name}`);
                                  setToastType('success');
                                  loadProject();
                                }
                              }}
                            >
                              导入
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Modal>
            )}

            {/* 项目文件列表 */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-text-primary">项目文件</h2>
                <span className="text-sm text-text-secondary">{currentProject.files.length} 个文件</span>
              </div>
              {currentProject.files.length > 0 ? (
                <div className="space-y-2">
                  {currentProject.files.map((file: ProjectFile) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      {/* 文件类型图标 */}
                      <div
                        className="w-8 h-8 rounded-btn flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: FILE_TYPE_COLORS[file.fileType] + '22', color: FILE_TYPE_COLORS[file.fileType] }}
                      >
                        {FILE_TYPE_ICONS[file.fileType] && (
                          <i className={`fas ${FILE_TYPE_ICONS[file.fileType]} text-xs`}></i>
                        )}
                      </div>
                      {/* 文件名 */}
                      <span className="text-sm font-medium text-text-primary flex-1 truncate">
                        {file.filename}
                      </span>
                      {/* 文件类型标签 */}
                      <span className="text-xs text-text-secondary px-2 py-0.5 rounded-btn bg-white">
                        {FILE_TYPE_LABELS[file.fileType]}
                      </span>
                      {/* 文件大小 */}
                      <span className="text-xs text-text-secondary shrink-0">
                        {formatFileSize(file.fileSize)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-lg bg-primary/5 flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-file text-lg opacity-30" style={{ color: '#FF9BB5' }}></i>
                  </div>
                  <p className="text-sm text-text-secondary">暂无文件，进入编辑器添加项目文件</p>
                  <Button variant="primary" size="sm" onClick={handleGoEditor} className="mt-3">
                    进入编辑器
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* 编辑项目弹窗 */}
      <Modal
        visible={showEditModal}
        title="编辑项目信息"
        onClose={() => setShowEditModal(false)}
        onConfirm={handleUpdateProject}
        confirmText="保存"
        width="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label="项目名称"
            value={editName}
            onChange={setEditName}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">项目描述</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-btn border border-primary/20 bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        visible={showDeleteModal}
        title="删除项目"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        confirmText="确认删除"
        width="max-w-sm"
      >
        <p className="text-text-secondary text-sm">
          确定要删除该项目吗？此操作不可撤销，项目内的所有文件和配置都将被永久删除。
        </p>
      </Modal>

      {/* 发布配置弹窗 */}
      <Modal
        visible={showPublishModal}
        title="发布作品"
        onClose={() => setShowPublishModal(false)}
        onConfirm={handlePublish}
        confirmText={publishing ? '发布中...' : '确认发布'}
        width="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            发布后作品将在探索页面公开，其他用户可以查看和游玩你的作品。
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">封面图</label>
            <div className="w-full h-32 rounded-lg overflow-hidden bg-primary/5">
              {currentProject?.coverUrl ? (
                <img src={currentProject.coverUrl} alt="封面" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary/50 text-sm">
                  暂无封面，可在编辑信息中设置
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">作品简介</label>
            <p className="text-sm text-text-secondary">
              {currentProject?.description || '暂无描述'}
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">
              标签 <span className="text-text-secondary/60 text-xs">（用逗号分隔）</span>
            </label>
            <input
              value={publishTags}
              onChange={(e) => setPublishTags(e.target.value)}
              placeholder="恋爱, 校园, 奇幻"
              className="w-full px-4 py-2.5 rounded-btn border border-primary/20 bg-white text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-150"
            />
          </div>
        </div>
      </Modal>

      {/* 发布成功弹窗 */}
      <Modal
        visible={showPublishSuccessModal}
        title="发布成功"
        onClose={() => setShowPublishSuccessModal(false)}
        showConfirm={false}
        width="max-w-md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6BCB77" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">作品已发布！</h3>
          <p className="text-sm text-text-secondary mb-4">
            你的作品已成功发布，其他用户可以在探索页面找到它。
          </p>
          <div className="bg-primary/5 rounded-lg p-3 mb-4">
            <p className="text-xs text-text-secondary mb-2">分享链接</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={publishedLink}
                className="flex-1 text-xs px-3 py-2 rounded-btn bg-white border border-primary/20 text-text-primary truncate"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button variant="primary" size="sm" onClick={handleCopyShareLink}>
                复制
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" size="md" onClick={handleGoToPlay}>
              查看作品页
            </Button>
            <Button variant="ghost" size="md" onClick={() => setShowPublishSuccessModal(false)}>
              继续编辑
            </Button>
          </div>
        </div>
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
