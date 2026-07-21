// 论坛帖子卡片组件 - 标题+摘要+作者+时间+评论数
// 用于论坛首页的帖子列表展示，作者名可点击跳转到用户主页
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { POST_CATEGORY_LABELS } from '@/lib/config';
import type { ForumPost, PostCategory } from '@/types/forum';

/** 帖子分类颜色映射 */
const CATEGORY_COLORS: Record<string, string> = {
  creation_exchange: '#FF6B9D',
  asset_share: '#FFE66D',
  tech_help: '#7EC8E3',
  work_show: '#6BCB77',
};

/** 帖子分类图标映射（Font Awesome） */
const CATEGORY_ICONS: Record<string, string> = {
  creation_exchange: 'fa-comments',
  asset_share: 'fa-share-alt',
  tech_help: 'fa-question-circle',
  work_show: 'fa-star',
};

/** 论坛帖子卡片属性 */
interface PostCardProps {
  /** 帖子数据 */
  post: ForumPost;
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

/** 截取内容摘要 */
function getSummary(content: string, maxLength: number = 120): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

/** 论坛帖子卡片组件 */
export default function PostCard({ post }: PostCardProps): React.JSX.Element {
  const router = useRouter();
  const categoryColor = CATEGORY_COLORS[post.category] || '#8E8E8E';
  const categoryLabel = POST_CATEGORY_LABELS[post.category] || post.category;
  const categoryIcon = CATEGORY_ICONS[post.category] || 'fa-file';

  return (
    <Link href={`/forum/${post.id}`}>
      <Card hoverable className="group cursor-pointer mb-4">
        <div className="flex items-start gap-4">
          {/* 分类图标 */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: categoryColor + '22', color: categoryColor }}
          >
            <i className={`fas ${categoryIcon} text-base`}></i>
          </div>

          {/* 帖子内容区 */}
          <div className="flex-1 min-w-0">
            {/* 标题行 */}
            <div className="flex items-center gap-2 mb-2">
              {/* 置顶标记 */}
              {post.isPinned && (
                <span className="px-1.5 py-0.5 rounded-btn text-xs font-bold bg-primary text-white">
                  置顶
                </span>
              )}
              {/* 分类标签 */}
              <span
                className="px-2 py-0.5 rounded-btn text-xs font-bold"
                style={{ background: categoryColor, color: '#4A3045' }}
              >
                {categoryLabel}
              </span>
              {/* 标题 */}
              <h3 className="text-base font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                {post.title}
              </h3>
            </div>

            {/* 摘要 */}
            <p className="text-sm text-text-secondary mb-2 line-clamp-2">
              {getSummary(post.content)}
            </p>

            {/* 底部信息行 */}
            <div className="flex items-center gap-4 text-xs text-text-secondary/70">
              {/* 作者 - 可点击跳转到用户主页 */}
              <span
                className="hover:text-primary transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  router.push(`/user/${post.userId}`);
                }}
              >
                {post.authorNickname || '匿名用户'}
              </span>
              {/* 时间 */}
              <span>
                {formatTime(post.createdAt)}
              </span>
              {/* 浏览数 */}
              <span>
                {post.viewCount} 浏览
              </span>
              {/* 评论数 */}
              <span className="text-primary font-medium">
                {post.commentCount} 评论
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
