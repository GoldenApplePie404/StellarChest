// 首页 -- 少女动漫风视觉小说布局（精品化提升版）
import Link from 'next/link';
import { Gamepad2, MessageCircle, Heart, Star } from 'lucide-react';
import ModuleCard from '@/components/home/ModuleCard';

const modules = [
  { title: '星工坊', titleCn: '通用工具', desc: '图片裁剪、格式转换、音频处理等创作辅助工具', href: '/tools', color: 'from-sakura to-sakura-light', icon: 'Wrench' },
  { title: '星尘库', titleCn: '素材大全', desc: '共享素材库 -- UI组件、贴图、音效、立绘、背景图', href: '/assets', color: 'from-sky to-sky-light', icon: 'Package' },
  { title: '星墨', titleCn: '脚本编辑器', desc: '基于 Monaco 的脚本编辑器，语法高亮、指令补全、流程图可视化', href: '/editor', color: 'from-rose to-rose-light', icon: 'Pen' },
  { title: '星灵', titleCn: 'AI 工具', desc: 'AI 剧本生成、脚本续写、素材生成，配置你的模型', href: '/ai', color: 'from-gold to-gold-light', icon: 'Sparkles' },
  { title: '星之境', titleCn: '在线引擎', desc: '加载项目、在线游玩，体验你的 galgame 创作成果', href: '/play', color: 'from-lavender to-lavender-light', icon: 'Gamepad2' },
  { title: '星语', titleCn: '论坛社区', desc: '创作交流、素材分享、技术求助、作品展示', href: '/forum', color: 'from-sky to-sky-light', icon: 'MessageCircle' },
];

const steps = [
  { num: '01', title: '创建项目', desc: '在项目引擎中创建你的 galgame 项目，设定名称与描述' },
  { num: '02', title: '编写脚本', desc: '使用脚本编辑器编写剧情，搭配指令速查手册快速上手' },
  { num: '03', title: '预览游玩', desc: '一键启动在线预览，即时验证脚本逻辑与场景效果' },
];

// 确定性星尘（避免 SSR/CSR 的 Math.random hydration 不一致）
const STARS = [
  { top: 10, left: 12, size: 3, color: '#FFD700', delay: 0.0, dur: 2.4 },
  { top: 22, left: 80, size: 4, color: '#FFB7D5', delay: 0.6, dur: 3.0 },
  { top: 35, left: 30, size: 2, color: '#FFFFFF', delay: 1.2, dur: 2.6 },
  { top: 15, left: 55, size: 3, color: '#FFD700', delay: 0.3, dur: 2.8 },
  { top: 48, left: 70, size: 2, color: '#FFFFFF', delay: 1.8, dur: 2.2 },
  { top: 60, left: 18, size: 4, color: '#FFB7D5', delay: 0.9, dur: 3.2 },
  { top: 70, left: 60, size: 3, color: '#FFD700', delay: 1.5, dur: 2.7 },
  { top: 28, left: 45, size: 2, color: '#FFFFFF', delay: 0.2, dur: 2.5 },
  { top: 80, left: 35, size: 3, color: '#FFB7D5', delay: 2.1, dur: 2.9 },
  { top: 42, left: 88, size: 2, color: '#FFFFFF', delay: 1.0, dur: 2.3 },
  { top: 8, left: 65, size: 3, color: '#FFD700', delay: 1.7, dur: 3.1 },
  { top: 55, left: 48, size: 4, color: '#FFB7D5', delay: 0.5, dur: 2.8 },
  { top: 18, left: 25, size: 2, color: '#FFFFFF', delay: 2.4, dur: 2.4 },
  { top: 75, left: 82, size: 3, color: '#FFD700', delay: 0.8, dur: 3.0 },
];

const PETALS = [
  { top: 12, left: 18, delay: 0.0, dur: 4.5 },
  { top: 30, left: 42, delay: 1.4, dur: 5.5 },
  { top: 16, left: 70, delay: 2.1, dur: 5.0 },
  { top: 50, left: 28, delay: 0.7, dur: 6.0 },
  { top: 62, left: 60, delay: 1.9, dur: 4.8 },
  { top: 40, left: 85, delay: 2.6, dur: 5.3 },
];

export default function HomePage(): React.JSX.Element {
  return (
    <div className="min-h-screen" style={{ background: 'var(--pearl)' }}>
      {/* ============================================
          HERO -- 魔法少女变身场景（极光 + 星尘）
          ============================================ */}
      <section className="relative overflow-hidden min-h-[100svh]" style={{ background: 'var(--gradient-hero)' }}>
        {/* 极光景深 */}
        <div className="aurora-blob" style={{ width: 420, height: 420, left: '-8%', top: '-10%', background: 'radial-gradient(circle, #FFC2D5, transparent 70%)', animationDelay: '0s' }} />
        <div className="aurora-blob" style={{ width: 360, height: 360, right: '-6%', top: '10%', background: 'radial-gradient(circle, #C5E6F5, transparent 70%)', animationDelay: '3s' }} />
        <div className="aurora-blob" style={{ width: 380, height: 380, left: '35%', bottom: '-15%', background: 'radial-gradient(circle, #E0D6F2, transparent 70%)', animationDelay: '6s' }} />

        {/* 点阵纹理 */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5), transparent 80%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5), transparent 80%)',
        }} />

        {/* 暗角 */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.10)' }} />

        {/* 星尘 */}
        {STARS.map((s, i) => (
          <div key={`star-${i}`} className="absolute rounded-full pointer-events-none animate-twinkle"
            style={{
              width: s.size, height: s.size,
              background: s.color,
              left: `${s.left}%`, top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }}
          />
        ))}

        {/* 樱花花瓣 */}
        {PETALS.map((p, i) => (
          <div key={`petal-${i}`} className="absolute pointer-events-none"
            style={{
              width: 12, height: 12,
              background: 'rgba(255,183,213,0.4)',
              borderRadius: '50% 0 50% 50%',
              left: `${p.left}%`, top: `${p.top}%`,
              animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}

        {/* 浮动光环 */}
        <div className="absolute top-[15%] left-[8%] w-16 h-16 rounded-full border-2 border-white/10 animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[25%] right-[12%] w-24 h-24 rounded-full border border-white/8 animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[20%] left-[20%] w-12 h-12 rounded-full border-2 border-white/12 animate-float" style={{ animationDelay: '3s' }} />

        {/* 内容区（顶部对齐 + 控制高度） */}
        <div className="container mx-auto px-6 pt-8 md:pt-10 pb-16 relative z-10">
          <div className="w-full max-w-3xl mx-auto text-center">
            {/* 标签 */}
            <div className="inline-flex items-center gap-2 mb-4 px-5 py-2 rounded-full animate-pop-in"
              style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <Star size={14} className="text-gold" />
              <span className="text-white/90 text-sm font-medium tracking-wider" style={{ fontFamily: 'var(--font-zen-maru)' }}>
                物语を纺ぐ、星の箱庭
              </span>
              <Star size={14} className="text-gold" />
            </div>

            {/* 品牌星标 */}
            <div className="mb-4 animate-fade-up flex justify-center" style={{ animationDelay: '0.05s' }}>
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute w-40 h-40 md:w-56 md:h-56 rounded-full" style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.55), transparent 65%)',
                  filter: 'blur(8px)',
                  animation: 'glowPulse 4s ease-in-out infinite',
                }} />
                <div className="relative animate-float" style={{ animationDuration: '5s' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="星之匣"
                    width={176}
                    height={176}
                    className="w-32 h-32 md:w-44 md:h-44 drop-shadow-[0_8px_30px_rgba(255,126,179,0.45)]"
                  />
                </div>
              </div>
            </div>

            {/* 主标题 - 可爱二次元风 */}
            <h1 className="text-5xl md:text-7xl font-bold mb-4 animate-fade-up leading-tight"
              style={{
                fontFamily: '"ZCOOL KuaiLe", "ZCOOL QingKe HuangYou", "Ma Shan Zheng", sans-serif',
                fontWeight: 400,
                color: '#FFFFFF',
                textShadow: '0 2px 16px rgba(0,0,0,0.2), 0 0 60px rgba(255,126,179,0.3)',
                letterSpacing: '0.08em',
              }}>
              星之匣
            </h1>

            {/* 副标题 */}
            <p className="text-xl md:text-2xl text-white/90 mb-4 animate-fade-up font-medium"
              style={{ animationDelay: '0.1s', textShadow: '0 1px 8px rgba(0,0,0,0.12)', fontFamily: 'var(--font-zen-maru)' }}>
              创作属于你的故事
            </p>
            <p className="text-base text-white/70 mb-6 animate-fade-up max-w-lg mx-auto"
              style={{ animationDelay: '0.2s', textShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              素材管理  |  脚本编写  |  AI 辅助  |  在线预览游玩
            </p>

            {/* 按钮组 */}
            <div className="flex gap-4 justify-center flex-wrap animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <Link href="/projects">
                <span className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full font-bold cursor-pointer animate-glow text-sm magnetic-btn"
                  style={{
                    fontFamily: 'var(--font-anime)',
                    background: 'rgba(255,255,255,0.28)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(255,255,255,0.45)',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 20px rgba(255,255,255,0.15)',
                    transition: 'all 0.3s ease',
                  }}>
                  <Gamepad2 size={14} />
                  开始创作
                </span>
              </Link>
              <Link href="/forum">
                <span className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full font-bold cursor-pointer text-sm magnetic-btn"
                  style={{
                    fontFamily: 'var(--font-anime)',
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(12px)',
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                    transition: 'all 0.3s ease',
                  }}>
                  <MessageCircle size={14} />
                  社区交流
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* 底部渐变过渡 */}
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--pearl) 100%)',
        }} />
      </section>

      {/* ============================================
          功能模块 -- 魔法卡片（玻璃 + 光标高光 + 微倾斜）
          ============================================ */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,126,179,0.3))' }} />
            <Heart size={16} className="text-sakura animate-heartbeat" />
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(255,126,179,0.3), transparent)' }} />
          </div>
          <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-mincho)', color: 'var(--ink)' }}>
            功能模块
          </h2>
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>一站式创作工具，满足视觉小说开发全流程需求</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {modules.map((mod) => (
            <ModuleCard
              key={mod.href}
              title={mod.title}
              titleCn={mod.titleCn}
              desc={mod.desc}
              href={mod.href}
              color={mod.color}
              icon={mod.icon}
            />
          ))}
        </div>
      </section>

      {/* ============================================
          快速入门 -- 三步走（渐变环徽章 + 连接线）
          ============================================ */}
      <section className="py-20" style={{ background: 'linear-gradient(180deg, var(--pearl) 0%, var(--cloud) 50%, var(--lavender-pale) 100%)' }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(200,162,232,0.3))' }} />
              <Heart size={16} className="text-lavender animate-heartbeat" />
              <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(200,162,232,0.3), transparent)' }} />
            </div>
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-mincho)', color: 'var(--ink)' }}>
              快速入门
            </h2>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>三步开启你的创作之旅</p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* 连接线（md+） */}
            <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-0.5 rounded"
              style={{ background: 'linear-gradient(90deg, rgba(255,183,213,0.5), rgba(200,162,232,0.5))' }} />

            {steps.map((step) => (
              <div key={step.num} className="relative p-8 text-center rounded-2xl transition-all duration-500 hover:translate-y-[-4px]"
                style={{
                  background: 'linear-gradient(145deg, #FFFFFF 0%, #FFF5F9 100%)',
                  border: '1px solid rgba(255,126,179,0.08)',
                  boxShadow: '0 2px 8px rgba(255,126,179,0.06)',
                }}>
                {/* 渐变环徽章 */}
                <div className="relative mx-auto mb-5 w-16 h-16">
                  <div className="absolute inset-0 rounded-full p-[2px]" style={{ background: 'var(--gradient-sakura)' }}>
                    <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#FFF7FB' }}>
                      <span className="text-2xl font-black" style={{
                        fontFamily: 'var(--font-title)',
                        background: 'var(--gradient-sakura)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                      }}>{step.num}</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-zen-maru)', color: 'var(--ink)' }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-light)' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          底部 CTA -- 视觉小说对话框风格（带辉光）
          ============================================ */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-lg mx-auto relative">
          <div className="absolute inset-0 -z-10 blur-3xl opacity-40 rounded-full" style={{
            background: 'radial-gradient(circle, #FFC2D5, #E0D6F2)',
          }} />
          <div className="vn-dialog p-10 text-center animate-pop-in">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center animate-float"
              style={{ background: 'linear-gradient(135deg, #FF7EB3, #C8A2E8)', boxShadow: '0 2px 16px rgba(255,126,179,0.2)' }}>
              <Heart size={28} color="#FFFFFF" fill="#FFFFFF" />
            </div>
            <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-mincho)', color: 'var(--ink)' }}>
              准备好开始创作了吗？
            </h3>
            <p className="mb-7 text-sm leading-relaxed" style={{ color: 'var(--ink-light)' }}>
              加入视觉小说创作者社区，使用强大的工具集，把你的故事变为现实
            </p>
            <Link href="/register">
              <span className="gradient-btn inline-flex items-center gap-2">
                <Star size={16} />
                免费注册开始创作
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
