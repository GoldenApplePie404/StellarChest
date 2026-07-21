// 项目卡片组件 - 粉色主题，显示项目名/描述/类型/更新时间
// 用于项目列表页的卡片网格展示
'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { Project, ProjectStatus } from '@/types/project';

/** 项目状态中文标签映射 */
const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

/** 项目状态样式映射 */
const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft: 'bg-accent/20 text-text-primary',
  published: 'bg-success/20 text-success',
  archived: 'bg-primary/10 text-text-secondary',
};

/** 项目卡片属性 */
interface ProjectCardProps {
  /** 项目数据 */
  project: Project;
  /** 删除回调（可选） */
  onDelete?: (id: string) => void;
}

/** 格式化时间显示 */
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

/** 项目卡片组件 */
export default function ProjectCard({ project, onDelete }: ProjectCardProps): React.JSX.Element {
  return (
    <Card hoverable className="group relative overflow-hidden">
      {/* 封面图区域 */}
      <div className="relative h-32 rounded-lg overflow-hidden mb-4 bg-primary/5">
        {project.coverUrl ? (
          <img
            src={project.coverUrl}
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-pearl">
            <img src="/logo.png" alt="星之匣" className="w-12 h-12 opacity-50" />
          </div>
        )}
        {/* 状态标签 */}
        <span className={`absolute top-2 right-2 px-2 py-1 rounded-btn text-xs font-medium ${STATUS_STYLES[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      {/* 项目名称 */}
      <h3 className="text-lg font-bold text-text-primary mb-1 truncate">
        {project.name}
      </h3>

      {/* 项目描述 */}
      <p className="text-sm text-text-secondary mb-3 line-clamp-2">
        {project.description || '暂无描述'}
      </p>

      {/* 更新时间 */}
      <p className="text-xs text-text-secondary/70 mb-4">
        更新于 {formatTime(project.updatedAt)}
      </p>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <Link href={`/editor/${project.id}`} className="flex-1">
          <Button variant="primary" size="sm" fullWidth>
            编辑
          </Button>
        </Link>
        <Link href={`/projects/${project.id}`} className="flex-1">
          <Button variant="ghost" size="sm" fullWidth>
            详情
          </Button>
        </Link>
        {onDelete && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(project.id)}
          >
            删除
          </Button>
        )}
      </div>
    </Card>
  );
}
