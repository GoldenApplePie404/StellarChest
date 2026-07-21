# 星之匣 (StellarChest) 更新日志

### 2026.7.2
- 项目名称：星之匣 StellarChest（原 Galgame Creator Toolkit）
- 项目类型：全栈 Web 平台（Next.js + React + Tailwind CSS）
- 开发时间：2026-07-02
- 技术栈：Next.js 16, React 19, Tailwind CSS 4, Prisma, Monaco Editor, Sharp, fluent-ffmpeg

### 2026.7.2
- 完成 PRD 产品需求文档
- 完成系统架构设计 + 类图 + 时序图
- 完成 T01-T05 全部代码实现，共 149 个源文件
- 修复 QA Round 1 发现的 55 个 TypeScript 类型错误
- 修复 PostCSS DLL 崩溃问题，切换至 managed Node.js v22.22.2
- 将 Next.js 16 废弃的 middleware.ts 迁移为 proxy.ts
- 修复 login/register API 被 proxy 拦截返回 401 的问题

### 2026.7.3
- 修复 start.bat 编码问题导致批处理命令断裂
- 修复 start.bat 端口冲突导致服务器启动失败
- 修复 seed.ts 不幂等导致每次重启多出一个示例项目
- 全站 UI 风格改为少女动漫风（樱花粉 + 薰衣草紫 + 天空蓝）
- 移除 Google Fonts CDN，改用的系统本地字体
- 安装 lucide-react 图标库，替换所有 emoji
- 重设计首页 Hero、卡片、CTA、底栏等模块

### 2026.7.4
- 重写项目命名体系：星之匣 / StellarChest
- 子模块命名：星河工坊、星墨、星尘库、星灵、星工坊、星语
- 设计并集成 SVG 品牌 Logo（宝箱 + 星形锁扣）
- 新增 404 页面
- 移除全局底栏
- 为编辑器新增快捷键（Ctrl+S/Enter/I/Space 等）
- 为编辑器新增指令速查手册（分类筛选 + 指令列表）
- 为编辑器新增星灵 AI 面板（续写/生成 + 插入编辑器）
- 修复编辑器页面整体布局，仿 VS Code 风格
- 新增 ActivityBar、EditorTabs、StatusBar、FileTree 组件
- 编辑器暗色主题对比度全面提亮

### 2026.7.5
- 星工坊模块完整重构（标准 SOP 流程：PM → 架构 → 实现 → QA）
- 新增 data/assets/manifest.json 文件驱动素材系统
- 新增 6 个素材分类目录：background、sprite、ui、bgm、sfx、icon
- 新增 28 个文件：类型定义、常量、布局、导航树、工作区
- 新增图片工具箱：裁剪、滤镜、画布绘图、AI 编辑
- 新增音频工具箱：波形编辑、音效处理、音乐工作室、AI 音频
- 自研 CanvasEngine 画布引擎（命令模式 undo/redo、图层管理、8 种工具）
- 接入 wavesurfer.js 波形显示、Tone.js 音乐合成、@tonejs/midi MIDI 解析
- 新增 AIToolService：背景移除、超分、风格迁移、音乐/音效生成
- QA 验收全绿通过

### 2026.7.5
- 数据解耦修复：编辑器从 API 加载脚本（移除硬编码 DEFAULT_SCRIPT）
- FileTree 从 API 获取真实文件列表（移除 defaultFiles 伪造数据）
- 编辑器保存写入后端 PUT API（localStorage 降级为离线缓存）
- 预览页从 API 加载脚本
- 默认图片路径修复：创建真实 SVG 占位文件
- AIToolService 接入真实 AI 调用链路
- AudioService.synthesizeTracks 实现 ffmpeg sine 波 MIDI 合成
- OpenAIProvider.generateImage 实现 DALL-E 集成
- 新增标项目自动创建 scripts/img/bgm 文件夹 + 示例脚本 main.txt
- 新增文件 CRUD API（新建/删除/文件夹/批量复制）
- FileTree 右键菜单（新建文件/文件夹、复制/剪切/粘贴、重命名、删除）
- 新增快捷键手册面板（Ctrl+/ 唤出）
- 修复内容 API 404 问题（改用查询参数方式）

### 2026.7.7-8
- 音乐工作室全面重构（FL Studio 风格 DAW：步进音序器/钢琴卷帘/混音台/效果器链/频谱可视化/MIDI 导入导出）
- 音乐工作室独立全屏页面 / 合成器 ADSR / 首页 UI 优化 / 字体修复
- 星灵 AI Qwen 风格重构：左侧会话历史侧边栏、欢迎引导页（6 张建议卡片）、模型选择器、5 种模态标签、消息气泡复制/重新生成、命名体系完善（星河工坊→星之境）

### 2026.7.11
- Echo-1.5 系列模型接入：阅读接入文档，新增 OpenAI 兼容 Provider 与 EchoImageProvider（raw fetch 解析 artifacts base64 JPEG、reasoning_content 回退），测试 Key 预填；去除「（自研）」标注，DeepSeek + Echo（含绘画）测试连接与实际对话/绘画均通过
- AI 配置页新增 thinking / reasoning_effort 开关（仅 chat 模态），透传 reasoning_effort 参数，非推理模型兼容
- AI 配置「测试连接」增加内联结果反馈 + 15 秒超时（不再仅依赖 Toast）
- 星灵 AI 注入平台人格 system prompt，避免通用 LLM 自我介绍
- 修复 AI 对话页用户消息文字不可见（渐变背景改 style 直设）
- 编辑器指令速查 / 快捷键手册与活动栏标签全中文化（指令名 / 参数保持原样）
- 清理残留后端：删除 script-generate / asset-generate 路由与提示词、AIService 中 generateScript / generateAsset 死方法
- 本地素材库（框架）：新增 ProjectAsset 模型（立绘/背景/音频）+ 上传/列表/删除 API；编辑器素材库面板支持上传、预览、一键插入 @bg / @bgm
- 多人协作雏形（框架）：新增 ProjectCollaborator 模型 + 协作 API（GET/POST/DELETE）+ 项目详情页协作管理卡片（owner 可增删成员）
- Prisma schema 更新：AIConfig.reasoningEffort、Project.assets / collaborators 关联、ProjectAsset、ProjectCollaborator，db push 同步表结构
- 首页美化：Hero 极光景深 + 点阵纹理、功能卡片光标高光 / 3D 倾斜 / 高光扫过（ModuleCard 客户端组件）、步骤渐变环徽章、CTA 柔光、prefers-reduced-motion 守卫
- 修复首页 RSC 序列化报错（图标改字符串 key + 客户端 ICON_MAP 映射）
- 修复 Hero 品牌标：恢复 logo.png 并修正显示尺寸、顶部对齐压缩首屏高度
- 修复编辑器底部白底栏（移除 dashboard 布局 min-h-screen，高度由内容撑开）

### 2026.7.12
- Phase 0 收尾完成：
  - 预览脚本鉴权对齐：脚本内容接口 `authenticate()` 改为「先 Authorization JWT、再回退 proxy 注入的 x-user-id」，修复 localStorage token 过期/为空时预览落空（协作者与过期会话正常取脚本，无身份仍 401）
  - 立绘角色层生效：引擎 `GameState` 新增 `resourceMap` 并注入执行器；素材库上传立绘经 `registerResourceMap` 注册到项目 config，`@perform/@pose` 真正命中上传 URL（此前 resourceMap 从未被赋值）
  - 技术债清理：删除遗留 `script-generate`/`asset-generate` 死路由与 `AIService` 未用方法，修正过期 README API 表与 `AIToolService` 注释
  - 首页功能卡图标还原：各模块改用图标库（lucide-react）独立语义图标（星工坊=Wrench / 星尘库=Package / 星墨=Pen / 星灵=Sparkles / 星之境=Gamepad2 / 星语=MessageCircle），深色 `#4A3045` 保证浅渐变底上对比；撤销统一 StellarIcon 方案（用户反馈）
- 星灵 AI 多模态发图：
  - provider `streamChat` 支持将 user 消息的 `media` 图片附件转为 OpenAI 视觉 `content` 数组（Echo-1.5-Pro 视觉模型可用，data URL / https 均支持，无附件保持纯文本向后兼容）
  - 聊天页新增图片上传 / 粘贴入口、附件缩略图预览、用户气泡复用 `MediaBlock` 回显，支持「仅图无文」发送；会话历史（localStorage）含 media 刷新后可见

### 2026.7.14
- AI 组件增强（A4 / A5 / A6）：
  - RAG 引用来源展示：`RagService.RetrievedChunk` 补 `id`；chat 路由检索后 emit `data:{sources}` SSE，星灵页面渲染可折叠「引用来源」卡片（文档名 + 片段），来源随消息存入 localStorage
  - Agent 增强：前后端中断链路贯通——`AIStreamOptions`/provider 循环检查 `signal.aborted` 提前结束，`request.signal` 透传，`ai/page.tsx` 起 `AbortController` + 红色「停止」按钮（客户端断开即止生成省 token），`tool_result` 改为可折叠卡片；agents 页新增「快速模板」预填名称与角色
  - 提示词库增强：`{{变量}}` 占位解析填值（迷你表单），卡片拆为「插入输入框」与「系统提示」两动作，分别写 `stellar_pending_insert` / `stellar_pending_system_prompt`，星灵页挂载时预填输入框
- 右侧面板样式修复（用户反馈「右侧样式有点混乱」）：
  - `RightPanel` 宽度 350px → 420px；5 个 Tab 改为「lucide 图标 + 短标签（指令 / 快捷键 / 流程 / 素材 / 场景）」避免中文截断，hover 显示全名
  - 场景搭建器三栏横向布局 → 纵向单列（工具栏 → 资源面板全宽 → 预览拖拽区 → 角色列表 → 属性面板）
  - 场景套件统一深色主题（与编辑器一致）：`ResourcePanel`/`PropertyPanel`/`CharacterList` 卡面 `rgba(255,255,255,0.03)`、输入框深色底、文字 `#E2D0F5`；资源面板内容区加 `maxHeight:260px` 内部滚动；`ScenePreview` 去浅色阴影

### 2026.7.17
- 开始按 avg-engine 参考站制定并落地编辑器增强计划（备份见 `galgame_toolkit_backup_20260717`）
- P1-B 指令属性检查器（对标 LetsGal Studio「属性检查器」）：
  - 新建 `src/components/editor/InstructionInspector.tsx`：监听编辑器派发的 `galgame-cursor` 事件取当前行号，从脚本文本解析 `@指令 key=value` 参数，按轻量 schema（文本/数字/下拉/开关）渲染可编辑字段；编辑即时拼回指令文本并经 `galgame-replace-line` 事件写回当前行（不抢输入框焦点）
  - `ScriptEditor.tsx` 新增 `galgame-replace-line` 监听：`model.applyEdits` 整行替换，与既有 `galgame-insert` 对称解耦
  - `RightPanel.tsx` 新增第 6 个 Tab「指令检查器」（SlidersHorizontal 图标），高亮当前指令分类、展示格式说明，未命中 schema 的指令走通用字段 + 原始文本兜底
  - 覆盖高频指令：`@bg`/`@perform`/`@pose`/`@char_*`/`@bgm`/`@jump`/`@choice`/`@set` 等

- P1-A 三视图切换（对标 LetsGal Studio 三视图）：
  - `InstructionInspector` 导出 `INSTRUCTION_FIELDS`/`CATEGORY_COLORS`/`parseSingleLine`/`buildLine` 等，作为指令解析单一数据源
  - 新建 `ScriptCardView`：整脚本按行分类(指令/对话/章节/注释/空行)渲染可编辑卡片，指令卡按 schema 出字段表单，编辑按行号写回原文(与纯文本共用 scriptContent)
  - 新建 `GamePreviewEmbed`：复用引擎 Hook 内嵌实时预览(精简掉存档/菜单 chrome)，scriptText 变化防抖后自动 reload
  - 编辑器页面新增 `viewMode`(纯文本/卡片/双栏)分段切换控件并持久化 localStorage；双栏=Monaco 左 + 实时预览右，顺带实现「编辑即预览」

- P2 素材引用分析（对标 LetsGal Studio「资源总览：引用计数 / 游离 / 缺失标红 / 包体预估」）：
  - 服务端零 schema 改动：在 `ProjectAssetService.format()` 用 `fs.stat` 读取磁盘文件大小写入 `ProjectAssetRecord.fileSize`（文件缺失返回 0），资产 GET 接口现返回 `fileSize`
  - 新建 `AssetReferencePanel`：复用 `ScriptParser` 扫描脚本中 `@bg`/`@bgm`/`@sfx`/`@video`/`@perform` 资源引用，与「项目素材库」+「resourceMap」交叉比对
    - 已引用：URL 精确匹配 / 素材名归一化匹配，展示行号与体积
    - 缺失引用：脚本引用但库中无对应资源且未注册 resourceMap → 标红（潜在破图破音）；内置占位符 default/none/black/white/transparent 自动忽略
    - 游离素材：素材库有但脚本从未引用（可清理），提供一键「引用」插入
    - 实际包体：`pkgBytes` = 去重后已引用素材的 `fileSize` 合计；附素材库总体积 / 游离体积对比
    - UI：4 张指标卡 + 引用健康度条 + 可折叠三类列表；点击引用项派发 `galgame-goto-line` 跳到对应脚本行
  - 修复既有 gap：`ScriptEditor` 新增 `galgame-goto-line` 监听（revealLineInCenter + setPosition + focus），使流程图节点点击跳转与引用跳行均生效（此前该事件无人监听）
  - `RightPanel` 新增第 7 个 Tab「引用分析」（FileSearch 图标）渲染分析面板
  - 注：P1-C 精确联动（点行跳 OP 状态）仍需引擎支持「从指定位置快进重建状态」，属较深引擎改动，本次未做；双栏已先实现弱化版「编辑即预览」

- P3 连续对话快捷插入（对标 LetsGal Studio「连续对话模式：同角色多句归组」）：【2026.7.17 用户要求移除】
  - 移除内容：`ScriptEditor.tsx` 的 `detectCurrentSpeaker` / `insertContinueDialog` 函数、`galgame-insert-dialog` 事件监听、`Alt+Enter` 快捷键；编辑器页面「续对话」面包屑按钮；`ShortcutReference` 的 `Alt+Enter` 条目。
  - 移除后 `tsc --noEmit` 0 错、grep 无残留引用（已验证）。

- 指令 inline 补全（对标 avg-engine「Tab 菜单插 Block」）：
  - `ScriptEditor.tsx` 注册 Monaco `registerCompletionItemProvider('galgameScript', { triggerCharacters: ['@', ' '] })`，provider 仅注册一次（`galgameCompletionRegistered` 守卫）
  - 模式1：输入 `@` 触发，列出全部指令（`allInstructionHandlers` 提供），每项带分类/格式/描述；选中后插入带参数骨架的 snippet（`@bg id=${1} transition=${2:cover} $0`），select 类型取首项为占位、number 取 `0`
  - 模式2：在 `@directive ` 后输入空格触发，列出该指令尚未使用的参数 key（`INSTRUCTION_FIELDS` schema 比对已用 `key=`），一键插入 `key=$1`
  - 复用既有 `allInstructionHandlers` 与 `INSTRUCTION_FIELDS` 作为单一数据源，零新增数据结构
  - 验证：`tsc --noEmit` 0 错；dev server 重启后 `/editor/test` 返回 HTTP 200（首次编译受沙箱慢文件系统影响约 83s，非代码问题）

- 自动保存状态指示（Phase 1 编辑器增强：自动保存状态指示）：
  - `editor/[projectId]/page.tsx` 新增 `saveStatus` 状态机（`saved`/`saving`/`unsaved`/`error`）
  - `handleSave` 增加 `opts.silent` 参数：自动保存走 silent 模式，不弹 toast（避免每 1.5s 提示），仅由状态指示器反馈；仅手动保存（Ctrl+S / Save 按钮）仍弹 toast
  - 新增防抖自动保存 `useEffect`：内容有改动（`hasUnsavedChanges`）后 1.5s 自动落盘；依赖 `hasUnsavedChanges`/`scriptContent`/`handleSave`，内容再变则重置计时，保存成功清除；借 `hasUnsavedChanges` 守卫避免初始加载（走 `setScriptContent` 直达、未置 dirty）误触发保存
  - 面包屑新增保存状态指示器：保存中（旋转 + 文字）/ 已保存（绿点）/ 未保存（琥珀点）/ 保存失败（红点），深色主题配色对齐；保留手动 Save 按钮
  - 验证：`tsc --noEmit` 0 错；dev server `/editor/test` HTTP 200
