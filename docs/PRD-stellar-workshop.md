# PRD: 星工坊 (Stellar Workshop) 重构

## 1. 项目信息

| 项 | 值 |
|---|---|
| Language | 简体中文 |
| 技术栈 | Next.js 16 + React 19 + Tailwind CSS 4 + Prisma |
| 图标库 | Lucide React |
| 项目路径 | `src/app/(dashboard)/tools/` |
| 原始需求 | 将星工坊从独立页面重构为统一左右布局的多功能工具集，覆盖图片工具箱、音频工具箱、音乐工作室、AI 工具等模块 |

---

## 2. 产品定义

### 2.1 产品目标

1. **统一工作台体验**：将原有独立工具页整合为左右分栏的统一界面，左侧导航树切换工具，右侧为对应工作区，减少页面跳转，提升操作连贯性。
2. **覆盖视觉小说创作全链路素材处理**：提供从图片编辑（裁剪/滤镜/绘图/AI 增强）到音频处理（剪辑/混音/MIDI 编辑/AI 生成）的一站式工具集，创作者无需离开平台即可完成素材制作。
3. **AI 能力深度集成**：在图片和音频两个领域嵌入 AI 辅助功能（背景移除、超分辨率、风格迁移、音乐生成、降噪等），降低创作门槛。

### 2.2 用户故事

- **As a 视觉小说创作者**，I want 在统一界面中快速切换图片编辑和音频编辑功能，so that 不用在多个页面之间来回跳转，提升素材处理效率。
- **As a 独立游戏开发者**，I want 使用内置的画布绘图工具绘制简单立绘/场景草图，so that 在缺乏专业美术资源时也能快速产出原型素材。
- **As a 音频编辑新手**，I want 通过波形可视化界面拖拽裁剪音频并一键添加淡入淡出，so that 不需要学习 Audacity 等复杂软件即可完成基础音频编辑。
- **As a 音乐爱好者**，I want 使用钢琴卷帘编辑 MIDI 并叠加多轨道，so that 可以为游戏创作简单的 BGM 和音效。
- **As a 效率导向用户**，I want 使用 AI 一键移除图片背景、生成音效、提升图片分辨率，so that 重复性工作由 AI 代劳，专注于创意决策。

---

## 3. 技术规范

### 3.1 需求池

#### P0 — 必须交付（MVP 核心）

| ID | 需求 | 说明 |
|---|---|---|
| P0-01 | 统一左右布局框架 | 左侧工具导航面板 + 右侧动态工作区，路由 `/tools` 下统一管理 |
| P0-02 | 图片上传/拖拽导入 | 支持点击上传和拖拽，预览缩略图，格式校验 |
| P0-03 | 图片裁剪 | 自由比例 + 预设比例(16:9/4:3/1:1)，Canvas 交互拖拽 |
| P0-04 | 图片基础滤镜 | 亮度、对比度、饱和度、灰度，实时预览 |
| P0-05 | 图片旋转/翻转 | 90° 旋转、水平/垂直翻转 |
| P0-06 | 图片导出 | PNG/JPEG/WebP，可调质量参数 |
| P0-07 | 音频上传/拖拽导入 | 支持常见格式，显示文件信息 |
| P0-08 | 音频波形可视化 | 使用 Web Audio API 绘制波形，支持缩放 |
| P0-09 | 音频裁剪 | 拖拽起止手柄选择区间 |
| P0-10 | 音频格式转换 | MP3/WAV/OGG 互转（后端 ffmpeg） |
| P0-11 | 音频导出 | 下载处理后音频 |

#### P1 — 应该交付（增强体验）

| ID | 需求 | 说明 |
|---|---|---|
| P1-01 | 图片缩放 | 百分比或像素精确输入 |
| P1-02 | 图片高级滤镜 | 色相、模糊、锐化、复古、暖色、冷色预设 |
| P1-03 | 图片添加文字/水印 | 可调字体大小/颜色/透明度/位置 |
| P1-04 | 画布基础绘画 | 画笔(粗细/颜色/透明度)、橡皮擦、撤销/重做 |
| P1-05 | 画布形状工具 | 矩形、圆形、线条、箭头 |
| P1-06 | 画布填充/取色器 | 颜色填充和吸管取色 |
| P1-07 | 画布图层支持 | 至少 3 层，可见性切换 |
| P1-08 | 音频变调 | 半音阶 ±12，实时预览 |
| P1-09 | 音频变速 | 0.5x ~ 2x，可选保持音调 |
| P1-10 | 音频音量调节/归一化 | 增益滑块 + LUFS 归一化 |
| P1-11 | 音频淡入/淡出 | 可调时长 |
| P1-12 | AI 背景移除 | 调用用户配置的 AI API 或浏览器端模型 |
| P1-13 | AI 音频降噪 | 后端处理或浏览器端 RNNoise |

#### P2 — 锦上添花（后续迭代）

| ID | 需求 | 说明 |
|---|---|---|
| P2-01 | 画布导出 | 导出画布为 PNG/JPEG |
| P2-02 | AI 区域擦除/修复 | 选区智能填充（inpainting） |
| P2-03 | AI 图片超分辨率 | 2x/4x 放大 |
| P2-04 | AI 图片风格迁移 | 二次元/水彩/素描等风格 |
| P2-05 | 音乐工作室 - MIDI 导入播放 | 加载 .mid 文件，Web Audio 播放 |
| P2-06 | 音乐工作室 - 钢琴卷帘 | 可视化 MIDI 音符编辑 |
| P2-07 | 音乐工作室 - 预设音色库 | 钢琴/吉他/贝斯/鼓/弦乐/合成器（使用 SoundFont 或 Web Audio 合成） |
| P2-08 | 音乐工作室 - 多轨道编辑 | 至少 4 轨道，独立静音/独奏 |
| P2-09 | 音乐工作室 - 节拍器 + BPM | 可调 BPM + 节拍器开关 |
| P2-10 | 音乐工作室 - 在线录音 | 浏览器麦克风录制 |
| P2-11 | 音乐工作室 - 导出 MIDI/WAV | 后端合成导出 |
| P2-12 | AI 音乐生成 | 输入风格/情绪/时长 → 生成旋律 |
| P2-13 | AI 音效生成 | 输入描述文本 → 生成音效 |
| P2-14 | 音频 FLAC 格式支持 | 后端转换支持 |

### 3.2 UI 设计描述

#### 整体布局

```
+-------------------------------------------------------------+
|  顶部导航栏 (Dashboard 全局)                                  |
+-------------------------------------------------------------+
|  左侧面板 (w-64, 固定)        |  右侧工作区 (flex-1, 滚动)    |
|                               |                              |
|  [工具分类]                   |  [工具标题栏]                 |
|   图片工具箱                   |  [工具栏/设置栏]              |
|    ├ 裁剪与变换                |                              |
|    ├ 滤镜与调色                |  [主工作区]                   |
|    ├ 画布绘图                  |   - Canvas 画布 /            |
|    ├ AI 工具                   |   - 波形图 /                 |
|    └ 导出                      |   - 过滤器面板 /             |
|                               |   - 钢琴卷帘                 |
|   音频工具箱                   |                              |
|    ├ 波形编辑                  |                              |
|    ├ 音效处理                  |  [底部状态栏]                 |
|    ├ 音乐工作室                |                              |
|    ├ AI 工具                   |                              |
|    └ 导出                      |                              |
|                               |                              |
+-------------------------------------------------------------+
```

#### 设计系统（沿用现有 Sakura Shoujo 主题）

- **背景色**：`bg-pearl`(#FFFAF5) / `bg-cloud`(#FFFFFF)
- **侧边栏**：`bg-cloud` 白色卡片 + 粉色系阴影 `shadow-sm`
- **激活态导航项**：`bg-sakura-pale`(#FFE4EC) + `text-sakura-dark`(#F07A9A)
- **未激活导航项**：`text-ink-light`(#7A6F75) + hover 时浅粉背景
- **卡片容器**：`bg-cloud` + `shadow-sm` + `rounded-md`
- **主操作按钮**：`bg-sakura`(#FF9BB5) + `text-cloud` + `rounded-btn`
- **次要操作按钮**：`border border-sakura` + `text-sakura-dark` + hover `bg-sakura-pale`
- **工作区画布**：浅灰背景 `bg-ink-faint/10` + 深色网格线辅助对齐
- **文本颜色**：标题 `text-ink`(#4A3F45), 正文 `text-ink-light`(#7A6F75), 辅助 `text-ink-muted`(#A89BA0)
- **白色文字约束**：仅在 `bg-sakura`、`bg-lavender`、`bg-sky`、`bg-mint` 等彩色背景上使用 `text-cloud`；浅色背景一律使用 ink 色系

#### 导航结构

```
图片工具箱
  基础编辑
    ├ 裁剪与变换 (Crop, LuideReact: Crop)
    ├ 缩放 (LuideReact: Maximize)
    └ 旋转/翻转 (LuideReact: RefreshCw)
  滤镜与调色 (LuideReact: SlidersHorizontal)
  画布绘图 (LuideReact: PenTool)
  AI 工具
    ├ 背景移除 (LuideReact: Scissors)
    ├ 区域修复 (LuideReact: PaintBucket)
    ├ 超分辨率 (LuideReact: ZoomIn)
    └ 风格迁移 (LuideReact: Wand)
  导出 (LuideReact: Download)

音频工具箱
  波形编辑
    ├ 裁剪 (LuideReact: Scissors)
    └ 波形视图 (LuideReact: AudioWaveform)
  音效处理
    ├ 变调 (LuideReact: Music)
    ├ 变速 (LuideReact: Gauge)
    ├ 音量 (LuideReact: Volume2)
    └ 淡入淡出 (LuideReact: AudioLines)
  音乐工作室
    ├ 钢琴卷帘 (LuideReact: Piano)
    ├ 多轨道 (LuideReact: Layers)
    ├ 录音 (LuideReact: Mic)
    └ 节拍器 (LuideReact: Metronome)
  AI 工具
    ├ 音乐生成 (LuideReact: Sparkles)
    ├ 音效生成 (LuideReact: Zap)
    └ 降噪 (LuideReact: Waves)
  导出
    ├ 格式转换 (LuideReact: ArrowLeftRight)
    └ 导出音频 (LuideReact: Download)
```

#### 路由方案

使用 Next.js 动态路由 + 查询参数来控制右侧面板显示：

- `/tools` → 默认显示图片工具箱-裁剪与变换
- `/tools/image/crop` → 图片裁剪
- `/tools/image/filter` → 滤镜调色
- `/tools/image/canvas` → 画布绘图
- `/tools/image/ai` → AI 工具面板
- `/tools/audio/waveform` → 波形编辑
- `/tools/audio/effects` → 音效处理
- `/tools/audio/studio` → 音乐工作室
- `/tools/audio/ai` → 音频 AI 工具

或使用统一的 `/tools` 路由 + `searchParams` 驱动面板切换（避免过多路由文件）。

#### 关键交互约定

- 左侧导航使用手风琴/树形折叠，默认展开当前活跃分类
- 右侧工作区支持拖拽文件导入（drop zone 覆盖整个工作区）
- 所有滑块控件使用实时预览，延迟 < 100ms
- 处理中状态：按钮显示加载动画，禁用并发操作
- 操作完成后 Toast 通知（沿用现有 Toast 组件）

### 3.3 技术依赖建议

| 功能 | 推荐库/方案 | 备注 |
|---|---|---|
| 图片处理 | 浏览器 Canvas API + sharp (后端) | 复杂滤镜后端处理 |
| 图片裁剪 | react-image-crop 或自研 Canvas 交互 | 现有 ImageCropper 可升级 |
| 画布绘图 | 自研 Canvas 引擎 | 参考 Fabric.js 架构但不引入重依赖 |
| 音频波形 | Web Audio API + wavesurfer.js | 轻量波形渲染 |
| 音频处理 | ffmpeg (后端) + Web Audio API | 现有 fluent-ffmpeg |
| 钢琴卷帘 | 自研 SVG/Canvas | 参考 Tone.js 的 PianoRoll |
| MIDI 播放 | Tone.js 或 @tonejs/midi | MIDI 解析 + 合成播放 |
| AI 功能 | API Route 代理 → OpenAI/Replicate | 通过用户配置的 API Key |

---

## 4. 待确认问题

1. **AI API 配置**：AI 功能（背景移除、音乐生成等）调用哪个服务商？是统一配置在平台级别还是用户自行填入 API Key？建议提供默认的 Replicate / OpenAI 集成，并允许用户在设置中配置自己的 Key。
2. **音频处理性能**：音频变调/变速等操作是否全部在前端 Web Audio API 完成，还是需要后端 ffmpeg 处理？前端方案体验更好但大文件可能性能受限。建议 < 10MB 文件前端处理，以上后端处理。
3. **音乐工作室复杂度边界**：钢琴卷帘 + 多轨道编辑 + MIDI 导出是一个相当复杂的子系统，是否需要分阶段交付？建议 P2 阶段先做 MIDI 导入播放 + 简单音色预览，完整 DAW 功能作为长期目标。
4. **图层系统上限**：画布"至少 3 层"的上限是多少？无限层对性能有影响，建议 MVP 限制 5 层，后续按需扩展。
5. **浏览器兼容性**：Web Audio API、Canvas、MIDI 播放等功能在移动端浏览器支持有限，是否需要考虑移动端适配？还是仅桌面端？
6. **文件存储**：用户上传的原始文件和编辑结果存储在哪里？本地临时（浏览器内存/IndexedDB）还是上传到服务器？现有系统是否已有素材管理模块可复用？
