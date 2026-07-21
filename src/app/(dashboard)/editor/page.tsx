// 星墨入口页 -- 选择要编辑的项目
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Pen, ArrowRight, Plus } from 'lucide-react';
import type { Project } from '@/types/project';

export default function EditorPage(): React.JSX.Element {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('galgame_token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 200 && data.data) {
          setProjects(data.data.items || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--pearl)' }}>
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* 页头 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(255,126,179,0.08)', border: '1px solid rgba(255,126,179,0.12)' }}>
            <Pen size={16} style={{ color: 'var(--sakura)' }} />
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-anime)', color: 'var(--sakura)' }}>星墨</span>
            <span className="text-xs opacity-50" style={{ color: 'var(--ink-light)' }}>脚本编辑器</span>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-anime)', color: 'var(--ink)' }}>
            选择要编辑的项目
          </h1>
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            打开一个已有项目进入脚本编辑器，或创建新项目
          </p>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--ink-muted)' }}>加载中...</div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF7EB3, #C8A2E8)', boxShadow: '0 2px 12px rgba(255,126,179,0.15)' }}>
              <Pen size={28} color="#FFFFFF" />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-anime)', color: 'var(--ink)' }}>
              还没有项目
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--ink-light)' }}>
              创建你的第一个视觉小说项目，然后在这里打开编辑器
            </p>
            <Link href="/projects/create">
              <span className="gradient-btn inline-flex items-center gap-2">
                <Plus size={16} />
                新建项目
              </span>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project: Project) => (
              <Card key={project.id} className="p-5 hover:translate-x-1 transition-transform duration-300 cursor-pointer"
                onClick={() => router.push(`/editor/${project.id}`)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold mb-1" style={{ fontFamily: 'var(--font-anime)', color: 'var(--ink)' }}>
                      {project.name}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {project.status === 'draft' ? '草稿' : project.status === 'published' ? '已发布' : '已归档'}
                      &nbsp;&middot;&nbsp;
                      {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <ArrowRight size={20} style={{ color: 'var(--ink-faint)' }} />
                </div>
              </Card>
            ))}
            <div className="text-center pt-4">
              <Link href="/projects/create">
                <Button variant="ghost">+ 新建项目</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
