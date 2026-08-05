<p align="center">
  <img src="logo.png" alt="星之匣" width="120" />
</p>

<h1 align="center">✨ 星之匣 StellarChest ✨</h1>

<p align="center">
  <strong>面向视觉小说创作者的一站式平台</strong>
  <br />
  项目引擎 · 脚本编辑器 · AI 辅助创作 · 素材库 · 在线预览 · 社区交流
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TipTap-3-FF6B9D" alt="TipTap" />
  <img src="https://img.shields.io/badge/版本-2.5.0-FF6B9D" alt="v2.5.0" />
</p>

\---

## 📋 目录

* [✨ 简介](#-简介)
* [🎨 设计风格](#-设计风格)
* [🚀 功能总览](#-功能总览)
* [🛠️ 技术栈](#️-技术栈)
* [🏗️ 项目架构](#️-项目架构)
* [📦 快速开始](#-快速开始)
* [🧩 功能模块详解](#-功能模块详解)

  * [星工坊 (Stellar Workshop)](#-星工坊-stellar-workshop)
  * [星尘库 (Stellar Assets)](#-星尘库-stellar-assets)
  * [星墨 (Stellar Ink)](#-星墨-stellar-ink)
  * [星灵 (Stellar Spirit)](#-星灵-stellar-spirit)
  * [星语论坛 (Stellar Forum)](#-星语论坛-stellar-forum)
  * [星之境 (Stellar Stage)](#-星之境-stellar-stage)
* [🗄️ 数据库设计](#️-数据库设计)
* [🔌 API 文档](#-api-文档)
* [🧪 开发指南](#-开发指南)
* [📄 许可证](#-许可证)

\---

## ✨ 简介

**星之匣 (StellarChest)** 是一个专为视觉小说（Galgame）创作者打造的**一站式创作平台**。从脚本编写、素材管理，到 AI 辅助生成和社区交流，覆盖创作全流程。

> "打开星之匣，点亮你的故事世界。" —— 创作理念

### 命名体系

|名称|路径|功能|意象|
|-|-|-|-|
|**星之境**|`/play`|在线引擎|匣中自有星辰境|
|**星墨**|`/editor`|脚本编辑器|落笔即世界|
|**星尘库**|`/assets`|素材大全|星辰的仓库|
|**星灵**|`/ai`|AI 助手|匣中精灵|
|**星工坊**|`/tools`|通用工具|星光工坊|
|**星语**|`/forum`|论坛社区|围坐星光下|

### 适用人群

* 🎮 **独立游戏开发者** —— 快速搭建 Galgame 项目原型
* ✍️ **剧本作者** —— 使用星墨编辑器专注故事写作
* 🎨 **画师与音乐人** —— 在星尘库中管理分享创作素材
* 🤖 **AI 尝鲜者** —— 体验 AI 辅助脚本与素材生成

\---

## 🎨 设计风格

整体采用 **Macaron 马卡龙色系**，融合少女漫画（Shoujo）与视觉小说（Visual Novel）美学：

|元素|风格描述|
|-|-|
|**配色**|樱花粉 `#FF9BB5`、薰衣草紫 `#C5B4E3`、天空蓝 `#8ECAE6`、薄荷绿 `#8DD7B8`、暖金黄 `#FFEAA7`|
|**字体**|标题：ZCOOL KuaiLe（站酷快乐体）· 正文：Noto Sans SC · 等宽：monospace|
|**动效**|浮动效果、柔光脉冲、星尘闪烁、弹出弹入、页面渐变过渡|
|**风格**|圆角卡片、毛玻璃效果、渐变边框、柔和阴影、樱花装饰|

\---

## 🚀 功能总览

### 已完成功能 ✅

* \[x] **用户系统** — 注册/登录(JWT)、个人资料、角色权限、修改密码、头像上传、通知系统
* \[x] **星工坊** — 图片裁剪/滤镜/画布/批量处理 + 音频波形/变声/合成/Studio
* \[x] **星尘库** — 素材上传/管理/搜索/预览（支持图片+音频）
* \[x] **星墨编辑器** — Monaco 驱动的 Galgame 脚本编辑器 + 流程图可视化
* \[x] **星灵 AI** — Qwen 风格 LLM 聊天界面，支持对话/图像/音乐/视频/语音 5 种模态生成
* \[x] **星语论坛** — 帖子创建/评论/TipTap 富文本编辑器/目录导航
* \[x] **星之境** — 项目管理/文件树/导入导出/在线预览
* \[x] **论坛内容增强** — KaTeX 公式渲染、Mermaid 图表、VS Code 风格代码块、表格、引用
* \[x] **场景搭建器** — WYSIWYG 可视化拖拽场景编辑 + 一键导出脚本（编辑器右侧面板）
* \[x] **一键发布与分享** — 项目发布为公开作品、分享链接、免登录游玩、浏览/游玩统计
* \[x] **剧情分支流程图** — 自动解析 @label/@jump/@choice 指令、Dagre 自动布局、无效跳转检测
* \[x] **论坛系统增强** — 搜索/分类筛选、图片上传到编辑器、预览模式、帖主删评、浏览计数
* \[x] **音乐工作室 (DAW)** — 步进音序器/钢琴卷帘/混音台/效果器链/频谱可视化/鼓机/合成器ADSR/FL Studio 风格全屏页面

### 规划中 📋

* \[ ] **素材商店** — 社区素材分享与交易
* \[ ] **成就系统** — 用户激励体系
* \[ ] 团队协作模式 ——共享项目、在线作画、编曲等
* \[ ] 响应式布局优化
* \[ ] 更完善的用户-论坛系统
* \[ ] 全新内置的游戏引擎、DAW、绘画台等高级组件
* \[ ] 打包成exe或者apk
* \[ ] ……

\---

## 🛠️ 技术栈

### 前端

|技术|版本|用途|
|-|-|-|
|Next.js|16.x|全栈框架 (App Router)|
|React|19.x|UI 库|
|TypeScript|5.x|类型安全|
|Tailwind CSS|4.x|实用优先的 CSS 框架|
|TipTap|3.x|富文本编辑器（论坛帖子）|
|Monaco Editor|—|代码编辑器（脚本编写）|
|React Flow|12.x|流程图可视化|
|Lucide React|—|图标库|
|wavesurfer.js|7.x|音频波形可视化|
|Tone.js|15.x|音频合成/效果器|

### 后端 / 数据

|技术|用途|
|-|-|
|Next.js API Routes|RESTful API|
|Prisma 6 + SQLite/PostgreSQL|ORM + 数据库|
|Zod|请求参数校验|
|jose|JWT 认证|
|bcryptjs|密码加密|
|Sharp|图片处理|
|fluent-ffmpeg|音频处理|
|OpenAI SDK|AI 对话/生成|

### 内容渲染

|技术|用途|
|-|-|
|**KaTeX**|LaTeX 数学公式渲染（行内 `\\(...\\)` + 块级 `\\\[...\\]`）|
|**Mermaid**|图表渲染（流程图、时序图、类图、甘特图、饼图），支持缩放/拖拽/下载 PNG|
|**自定义语法高亮器**|代码块 VS Code 风格呈现，支持 JS/TS/Python/CSS/SQL/Bash/JSON|

\---

## 🏗️ 项目架构

```
galgame\_toolkit/
├── prisma/                  # 数据库 Schema + 迁移 + 种子数据
│   ├── schema.prisma        # 数据模型定义
│   ├── seed.ts              # 初始化数据（管理员+演示用户）
│   └── migrations/          # 数据库迁移历史
│
├── src/
│   ├── app/                 # Next.js App Router 页面+API
│   │   ├── (auth)/          # 认证相关页面（登录/注册）
│   │   ├── (dashboard)/     # 主面板页面
│   │   │   ├── forum/       # 论坛（列表/详情/创建/编辑）
│   │   │   ├── editor/      # 脚本编辑器
│   │   │   ├── tools/       # 星工坊工具
│   │   │   ├── assets/      # 星尘库
│   │   │   ├── ai/          # 星灵 AI
│   │   │   ├── projects/    # 项目管理
│   │   │   └── play/        # 星之境在线引擎
│   │   ├── api/             # RESTful API 路由
│   │   └── globals.css      # 全局样式（主题变量+动效+组件样式）
│   │
│   ├── components/          # 可复用 UI 组件
│   │   └── ui/
│   │       ├── PostContent.tsx  # 帖子内容渲染（KaTeX + Mermaid + 代码块）
│   │       ├── RichEditor.tsx   # TipTap 富文本编辑器
│   │       ├── Navbar.tsx       # 导航栏
│   │       ├── Card.tsx         # 卡片组件
│   │       └── ...              # 其他 UI 组件
│   │
│   ├── services/            # 业务逻辑层
│   │   ├── ForumService.ts  # 论坛帖子/评论 CRUD
│   │   ├── AuthService.ts   # 用户认证
│   │   └── ...              # 其他服务
│   │
│   ├── lib/                 # 工具库
│   │   ├── validators.ts    # Zod 校验 Schema
│   │   ├── errors.ts        # 统一错误处理
│   │   ├── jwt.ts           # JWT 工具
│   │   └── config.ts        # 配置常量
│   │
│   ├── types/               # TypeScript 类型定义
│   ├── hooks/               # React Hooks
│   ├── engine/              # Galgame 脚本引擎
│   └── proxy.ts             # JWT 代理中间件
│
├── public/                  # 静态资源
└── package.json             # 项目配置
```

\---

## 📦 快速开始

### 前置要求

* **Node.js** >= 22.x
* **npm** >= 9.x
* **Python** >= 3.x（optional，用于某些音频工具）
* **ffmpeg**（optional，用于音频处理）

### 安装步骤

```bash
# 1. 克隆仓库
https://github.com/GoldenApplePie404/StellarChest
cd StellarChest

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，设置数据库地址等

# 4. 初始化数据库（SQLite 开发模式）
npm run setup

# 5. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 演示账号

|角色|邮箱|密码|
|-|-|-|
|管理员|`admin@galgame-toolkit.com`|`admin123456`|
|演示用户|`demo@galgame-toolkit.com`|`user123456`|

\---

## 🧩 功能模块详解

### 🛠️ 星工坊 (Stellar Workshop)

集成图片与音频处理工具集：

**图片工具** — `/tools/image`

* 📐 **裁剪** — 可视化区域选择 + 预设比例
* 🎨 **滤镜** — 灰度/棕调/反转/模糊/锐化/像素化
* ✏️ **画布** — 自由绘图、图层管理、撤销/重做（命令模式）
* 🤖 **AI** — 背景移除

**音频工具** — `/tools/audio`

* 🌊 **波形** — 基于 wavesurfer.js 的音频可视化
* 🎛️ **效果器** — 变速/变调/反向/回声
* 🎹 **音乐 Studio** — Tone.js 驱动，钢琴卷帘 + MIDI 支持 + 录音
* 🤖 **AI** — 音乐/SFX 生成

### 🎨 星尘库 (Stellar Assets)

素材统一管理中心：

* 支持图片（JPG/PNG/WebP/GIF）和音频（MP3/WAV/OGG）上传
* 文件名搜索 + 类型过滤
* 资源详情查看（元数据、尺寸、时长）
* 项目文件树集成

### ✍️ 星墨 (Stellar Ink)

基于 **Monaco Editor**（VS Code 核心）的 Galgame 脚本编辑器：

* 🎨 **语法高亮** — 自定义 Galgame 脚本语言
* 📂 **文件树** — 右键菜单、新建/复制/粘贴/重命名/删除
* ⌨️ **快捷键** — Ctrl+C/X/V、F2 重命名、Ctrl+/ 快捷键面板
* 🔗 **流程图** — React Flow 驱动的可视化跳转图
* 📦 **项目自动初始化** — 自动创建 scripts/img/bgm/ 目录 + 示例脚本
* ⚡ **实时保存** — 自动保存 + 手动保存触发

### 🤖 星灵 (Stellar Spirit)

专业 LLM 聊天平台风格的 AI 辅助创作工具：

* 📝 **对话生成** — Qwen 风格聊天界面，含会话历史侧边栏、欢迎引导页、消息复制
* ✍️ **脚本续写与润色** — 基于上下文继续编写或优化故事
* 🖼️ **图像/音乐/视频/语音生成** — 5 种模态一键切换，模型选择器自动匹配
* ⚙️ **设置** — 可配置多 Provider API Key、模型、端点

### 💬 星语论坛 (Stellar Forum)

创作者交流社区：

* **帖子管理** — 创建/编辑/删除、分类（创作交流/素材分享/技术求助/作品展示）
* **富文本编辑** — TipTap 驱动，支持标题/列表/代码/表格/图片/链接
* **目录导航** — 自动解析 H1-H3 标题生成侧栏目录
* **内容增强**：

  * **代码块**：VS Code 深色主题，行号 + 语言标签 + 复制按钮 + 多语言语法高亮
  * **Mermaid 图表**：流程图/时序图/类图/甘特图/饼图，支持缩放/Ctrl+滚轮/拖拽平移/下载 PNG/复制源码
  * **KaTeX 公式**：行内公式 `\\(...\\)` + 块级公式 `\\\[...\\]` 渲染
  * **表格**：圆角渐变表头 + 行悬浮效果
  * **引用块**：带装饰引号 + 嵌套支持
  * **列表**：樱花粉圆点标记 + 任务列表勾选框
* **评论系统** — 帖子评论、回复

### 🌌 星之境 (Stellar Stage)

项目管理与在线游玩中心：

* 项目 CRUD（创建/查看/编辑/删除）
* 文件树管理（文件夹创建、文件批量操作）
* **导入** — ZIP 上传导入项目
* **导出** — ZIP 下载导出
* **在线预览** — 浏览器内运行 Galgame 引擎

\---

## 🗄️ 数据库设计

使用 **Prisma ORM**，默认 SQLite（开发），可切换 PostgreSQL（生产）。

### 核心模型

```
User ──1:N──> ForumPost ──1:N──> Comment
  │
  └────1:1──> AIConfig

User ──1:N──> Project ──1:N──> ProjectFile
```

### 论坛相关表

|表名|说明|关键字段|
|-|-|-|
|`users`|用户|email, nickname, role(admin/user)|
|`forum\_posts`|帖子|userId, category, title, content(HTML), viewCount, commentCount, isPinned|
|`comments`|评论|postId, userId, content|
|`ai\_configs`|AI 配置|userId, provider, apiKey, model|

详细 Schema 参见 `prisma/schema.prisma`。

\---

## 🔌 API 文档

所有 API 前缀为 `/api/`。

### 认证

|方法|路径|说明|
|-|-|-|
|POST|`/api/auth/register`|注册|
|POST|`/api/auth/login`|登录（返回 JWT + 设置 Cookie）|
|GET|`/api/auth/me`|获取当前用户信息|
|POST|`/api/auth/logout`|退出登录|

### 论坛

|方法|路径|说明|
|-|-|-|
|GET|`/api/forum`|帖子列表（支持 category/keyword/sortBy/page 参数）|
|POST|`/api/forum`|创建帖子（需登录）|
|GET|`/api/forum/:id`|帖子详情（+ 评论列表）|
|PUT|`/api/forum/:id`|更新帖子（需作者）|
|DELETE|`/api/forum/:id`|删除帖子（需作者，级联删评论）|
|GET|`/api/forum/:id/comments`|评论列表|
|POST|`/api/forum/:id/comments`|发表评论（需登录）|

### 项目

|方法|路径|说明|
|-|-|-|
|GET|`/api/projects`|项目列表|
|POST|`/api/projects`|创建项目|
|GET|`/api/projects/:id`|项目详情|
|PUT|`/api/projects/:id`|更新项目|

### 素材

|方法|路径|说明|
|-|-|-|
|GET|`/api/assets`|素材列表|
|POST|`/api/assets`|上传素材|
|GET|`/api/assets/:id`|素材详情|

### 工具

|方法|路径|说明|
|-|-|-|
|POST|`/api/tools/image/crop`|图片裁剪|
|POST|`/api/tools/image/filter`|图片滤镜|
|POST|`/api/tools/image/ai`|AI 图片处理|
|POST|`/api/tools/audio/effects`|音频特效|
|POST|`/api/tools/audio/ai`|AI 音频生成|

### AI

|方法|路径|说明|
|-|-|-|
|POST|`/api/ai/script-continue`|AI 脚本续写|
|GET/PUT|`/api/ai/settings`|AI 配置管理|

\---

## 🧪 开发指南

### 常用命令

```bash
npm run dev          # 启动开发服务器 (localhost:3000)
npm run build        # 生产构建
npm run lint         # 代码检查
npm run db:migrate   # 数据库迁移
npm run db:push      # 推送 Schema 变更
npm run db:seed      # 填充种子数据
npm run setup        # 一键初始化（generate + push + seed）
npm run db:reset     # 重置数据库（⚠️ 会清空数据）
```

\---

## 📄 许可证

本项目采用 **MIT License**。

\---

<p align="center">
  Made with ❤️ by Galgame Creator Toolkit Team
  <br />
  <sub>星之匣 StellarChest — 打开星之匣，点亮你的故事世界</sub>
</p>

