// 项目数据Hook - 封装项目CRUD操作和localStorage缓存
// 提供项目列表/详情/创建/更新/删除/导出/导入等操作的客户端封装
'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Project, ProjectFile, ProjectConfig, CreateProjectRequest, UpdateProjectRequest, ProjectStatus } from '@/types/project';
import type { PaginatedData, ApiResponse } from '@/types/api';

/** 项目Hook返回值 */
interface UseProjectReturn {
  /** 项目列表数据 */
  projects: PaginatedData<Project> | null;
  /** 当前项目详情 */
  currentProject: (Project & { files: ProjectFile[]; config: ProjectConfig }) | null;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 获取项目列表 */
  fetchProjects: (page?: number, pageSize?: number, status?: ProjectStatus) => Promise<void>;
  /** 获取项目详情 */
  fetchProject: (id: string) => Promise<void>;
  /** 创建项目 */
  createProject: (data: CreateProjectRequest) => Promise<Project | null>;
  /** 更新项目 */
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project | null>;
  /** 删除项目 */
  deleteProject: (id: string) => Promise<boolean>;
  /** 导出项目 */
  exportProject: (id: string) => Promise<boolean>;
  /** 导入项目 */
  importProject: (id: string, file: File) => Promise<boolean>;
  /** 清除错误 */
  clearError: () => void;
}

/** 获取认证令牌 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('galgame_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** 处理API响应 */
function handleApiResponse<T>(response: ApiResponse<T>): T | null {
  if (response.code === 200 && response.data !== null) {
    return response.data;
  }
  throw new Error(response.message || '请求失败');
}

/** 项目数据Hook */
export function useProject(): UseProjectReturn {
  const [projects, setProjects] = useState<PaginatedData<Project> | null>(null);
  const [currentProject, setCurrentProject] = useState<(Project & { files: ProjectFile[]; config: ProjectConfig }) | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /** 清除错误 */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /** 获取项目列表 */
  const fetchProjects = useCallback(async (page: number = 1, pageSize: number = 12, status?: ProjectStatus): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (status) {
        params.set('status', status);
      }
      const response = await fetch(`/api/projects?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<PaginatedData<Project>> = await response.json();
      const data = handleApiResponse(result);
      if (data) {
        setProjects(data);
        // 缓存到localStorage
        localStorage.setItem('galgame_projects_cache', JSON.stringify(data));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取项目列表失败';
      setError(message);
      // 尝试从localStorage缓存恢复
      const cached = localStorage.getItem('galgame_projects_cache');
      if (cached) {
        try {
          setProjects(JSON.parse(cached));
        } catch {
          // 缓存数据损坏，忽略
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /** 获取项目详情 */
  const fetchProject = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<Project & { files: ProjectFile[]; config: ProjectConfig }> = await response.json();
      const data = handleApiResponse(result);
      if (data) {
        setCurrentProject(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取项目详情失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 创建项目 */
  const createProject = useCallback(async (data: CreateProjectRequest): Promise<Project | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      // 尝试解析JSON，如果失败则可能是HTML错误页面（如登录过期）
      let result: ApiResponse<Project>;
      try {
        result = await response.json();
      } catch {
        const text = await response.text();
        throw new Error(`服务器响应异常 (${response.status}): 请重新登录后再试`);
      }
      const project = handleApiResponse(result);
      if (project) {
        // 刷新项目列表
        await fetchProjects();
        return project;
      }
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建项目失败';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  /** 更新项目 */
  const updateProject = useCallback(async (id: string, data: UpdateProjectRequest): Promise<Project | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const result: ApiResponse<Project> = await response.json();
      const project = handleApiResponse(result);
      if (project) {
        // 刷新项目列表和详情
        await fetchProjects();
        if (currentProject && currentProject.id === id) {
          await fetchProject(id);
        }
        return project;
      }
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新项目失败';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, fetchProject, currentProject]);

  /** 删除项目 */
  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result: ApiResponse<null> = await response.json();
      if (result.code === 200) {
        // 刷新项目列表
        await fetchProjects();
        if (currentProject && currentProject.id === id) {
          setCurrentProject(null);
        }
        return true;
      }
      throw new Error(result.message || '删除项目失败');
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除项目失败';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects, currentProject]);

  /** 导出项目 */
  const exportProject = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${id}/export`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        // 获取文件blob并触发下载
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project_${id}.galtoolkit.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return true;
      }
      const result: ApiResponse<null> = await response.json();
      throw new Error(result.message || '导出项目失败');
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出项目失败';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /** 导入项目 */
  const importProject = useCallback(async (id: string, file: File): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/projects/${id}/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('galgame_token') || ''}`,
        },
        body: formData,
      });
      const result: ApiResponse<Project> = await response.json();
      if (result.code === 200) {
        await fetchProjects();
        return true;
      }
      throw new Error(result.message || '导入项目失败');
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入项目失败';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  /** 初始化时从缓存恢复项目列表 */
  useEffect(() => {
    const cached = localStorage.getItem('galgame_projects_cache');
    if (cached) {
      try {
        setProjects(JSON.parse(cached));
      } catch {
        // 缓存数据损坏，忽略
      }
    }
  }, []);

  return {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    exportProject,
    importProject,
    clearError,
  };
}

export default useProject;
