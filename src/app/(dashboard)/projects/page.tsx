// 项目列表页 - 调用ProjectService.listProjects获取用户项目列表，展示ProjectCard卡片网格
// 粉色二次元风格，支持状态筛选和分页
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import SearchBar from '@/components/ui/SearchBar';
import CategoryTabs from '@/components/ui/CategoryTabs';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import ProjectCard from '@/components/ui/ProjectCard';
import Input from '@/components/ui/Input';
import useProject from '@/hooks/useProject';
import type { ProjectStatus } from '@/types/project';

/** 项目状态筛选标签 */
const STATUS_TABS = [
  { value: 'all', label: '全部项目' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

/** 侧边栏链接 */
const SIDEBAR_LINKS = [
  { label: '项目列表', href: '/projects', iconLetter: 'P' },
  { label: '新建项目', href: '/projects/create', iconLetter: '+' },
];

/** 项目列表页组件 */
export default function ProjectsPage(): React.JSX.Element {
  const router = useRouter();
  const { projects, loading, error, fetchProjects, createProject, deleteProject, clearError } = useProject();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDesc, setNewProjectDesc] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  /** 获取项目列表 */
  const loadProjects = useCallback(async (): Promise<void> => {
    const status: ProjectStatus | undefined = activeTab === 'all' ? undefined : activeTab as ProjectStatus;
    await fetchProjects(currentPage, 12, status);
  }, [activeTab, currentPage, fetchProjects]);

  /** 初始化加载 */
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  /** 状态标签切换 */
  const handleTabChange = (value: string): void => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  /** 分页切换 */
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
  };

  /** 搜索处理（前端过滤） */
  const handleSearch = (keyword: string): void => {
    setSearchKeyword(keyword);
  };

  /** 打开创建弹窗 */
  const handleOpenCreate = (): void => {
    setNewProjectName('');
    setNewProjectDesc('');
    setShowCreateModal(true);
  };

  /** 创建项目提交 */
  const handleCreateProject = async (): Promise<void> => {
    if (!newProjectName.trim()) {
      setToastMessage('项目名称不能为空');
      setToastType('warning');
      return;
    }
    const project = await createProject({
      name: newProjectName.trim(),
      description: newProjectDesc.trim(),
    });
    if (project) {
      setShowCreateModal(false);
      setToastMessage('项目创建成功');
      setToastType('success');
      // 跳转到编辑器
      router.push(`/editor/${project.id}`);
    } else {
      setToastMessage('创建失败，请重试');
      setToastType('error');
    }
  };

  /** 删除项目确认 */
  const handleDeleteConfirm = async (): Promise<void> => {
    const success = await deleteProject(deleteTargetId);
    setShowDeleteModal(false);
    if (success) {
      setToastMessage('项目已删除');
      setToastType('success');
    } else {
      setToastMessage('删除失败，请重试');
      setToastType('error');
    }
  };

  /** 删除按钮点击 */
  const handleDeleteClick = (id: string): void => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  /** 过滤项目列表（根据搜索关键词） */
  const filteredProjects = projects?.items?.filter((project) => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return project.name.toLowerCase().includes(keyword) || project.description.toLowerCase().includes(keyword);
  }) || [];

  /** 计算总页数 */
  const totalPages = projects ? Math.ceil(projects.total / 12) : 1;

  return (
    <div>
      <div className="flex">
        <Sidebar links={SIDEBAR_LINKS} activePath="/projects" title="项目管理" />
        <main className="flex-1 p-8">
          {/* 页面标题 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">我的项目</h1>
              <p className="text-sm text-text-secondary">管理你的galgame创作项目</p>
            </div>
            <Button variant="primary" size="md" onClick={handleOpenCreate}>
              新建项目
            </Button>
          </div>

          {/* 搜索栏 */}
          <div className="mb-4">
            <SearchBar onSearch={handleSearch} placeholder="搜索项目名称或描述..." />
          </div>

          {/* 状态筛选标签 */}
          <div className="mb-6">
            <CategoryTabs tabs={STATUS_TABS} activeValue={activeTab} onChange={handleTabChange} />
          </div>

          {/* 加载状态 */}
          {loading && !projects && (
            <div className="flex items-center justify-center py-20">
              <span className="text-text-secondary">加载中...</span>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center justify-center py-10">
              <Card className="text-center">
                <p className="text-error mb-4">{error}</p>
                <Button variant="primary" size="sm" onClick={loadProjects}>
                  重试
                </Button>
            </Card>
            </div>
          )}

          {/* 项目卡片网格 */}
          {!loading && !error && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}

          {/* 空状态 */}
          {!loading && !error && filteredProjects.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <Card className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-folder-open text-2xl opacity-40" style={{ color: '#FF9BB5' }}></i>
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">暂无项目</h3>
                <p className="text-sm text-text-secondary mb-4">
                  {searchKeyword ? '没有找到匹配的项目，请尝试其他关键词' : '点击上方按钮创建你的第一个galgame项目'}
                </p>
                {!searchKeyword && (
                  <Button variant="primary" size="md" onClick={handleOpenCreate}>
                    新建项目
                  </Button>
                )}
              </Card>
            </div>
          )}

          {/* 分页 */}
          {filteredProjects.length > 0 && totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </main>
      </div>

      {/* 创建项目弹窗 */}
      <Modal
        visible={showCreateModal}
        title="新建项目"
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateProject}
        confirmText="创建"
        width="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label="项目名称"
            placeholder="输入项目名称"
            value={newProjectName}
            onChange={setNewProjectName}
            required
          />
          <Input
            label="项目描述"
            placeholder="简单描述你的项目内容"
            value={newProjectDesc}
            onChange={setNewProjectDesc}
          />
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        visible={showDeleteModal}
        title="删除项目"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        confirmText="确认删除"
        width="max-w-sm"
      >
        <p className="text-text-secondary text-sm">
          确定要删除该项目吗？此操作不可撤销，项目内的所有文件和配置都将被永久删除。
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
