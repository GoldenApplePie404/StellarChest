# Galgame Toolkit Coding Plan

> 本文件是 Galgame Toolkit 的全项目开发计划总册，用于统一记录各组件、子系统和产品阶段的开发基线、里程碑、依赖关系与验收标准。
>
> 首次建立：2026-08-06  
> 最近更新：2026-08-06  
> 维护范围：Galgame Toolkit 全项目

## 总册使用约定

1. 每个独立组件或子系统使用唯一计划编号，格式为 `CP-<领域>-<序号>`。
2. 新计划必须先登记到“计划索引”，再在“分组件计划”中建立对应章节。
3. 每个计划章节至少包含：目标、当前基线、范围边界、里程碑、依赖、验收标准和当前下一步。
4. 计划状态统一使用：`待规划`、`规划中`、`执行中`、`暂停`、`已完成`、`已归档`。
5. 一个功能只有在数据模型、真实业务或引擎接线、UI、保存恢复和验证路径均成立时，才能标记完成。
6. 后续对已有计划进行调整时，更新对应章节和索引中的“最近更新”，不在文件末尾重复堆叠临时方案。
7. 跨组件依赖在索引和正文中同时标注，避免各组件计划互相冲突。

## 计划索引

| 计划编号 | 组件 / 子系统 | 状态 | 当前阶段 | 入口或范围 | 最近更新 |
|---|---|---|---|---|---|
| [`CP-DAW-001`](#cp-daw-001) | 音乐工作室与高级 DAW | 规划中 | M1 待实施 | `/audio-studio-v2` | 2026-08-06 |
| [`CP-CANVAS-001`](#cp-canvas-001) | 星墨绘画工作室与专业画布 | 规划中 | C0 引擎与参考项目选型 | `/canvas-studio` | 2026-08-06 |

> 后续计划示例：AI 创作工具可登记为 `CP-AI-001`，协作系统可登记为 `CP-COLLAB-001`。示例编号不代表计划已经建立。

## 全项目开发规则

- 先确认计划范围，再修改代码；不擅自扩展未确认功能。
- 优先沿用现有架构、依赖、组件和数据模型，避免无必要地重复造轮子。
- 移植开源项目时记录来源、许可证、移植边界和本地适配点。
- 新增文件前确认无法在现有模块中合理扩展，避免产生大量零散试验文件。
- 每个里程碑必须有明确验收标准、类型检查和手动验证路径。
- 工程功能需要同时考虑保存、恢复、撤销、错误状态和版本迁移。
- 除非用户明确要求，不执行 Git commit 或 push。

## 新计划章节模板

新组件计划按以下结构追加到“分组件计划”区域：

```markdown
<a id="cp-domain-001"></a>
# CP-DOMAIN-001：组件或子系统名称

> 状态：待规划
> 最近更新：YYYY-MM-DD
> 负责人 / 执行方：待定
> 入口或代码范围：待定
> 参考项目与许可证：无 / 待定

## 0. 目标与范围
## 1. 当前基线
## 2. 架构与参考边界
## 3. 里程碑与依赖
## 4. 验收标准
## 5. 当前锁定的下一步
## 6. 决策与变更记录
```

---

# 分组件计划

<a id="cp-daw-001"></a>
# CP-DAW-001：音乐工作室与高级 DAW

> 状态：规划中  
> 最近更新：2026-08-06  
> 当前入口：`/audio-studio-v2`  
> 参考项目：`simple-daw-reference/`（MIT）  
> 当前锁定阶段：M1 待实施

## 0. 计划目标

将当前基于 `simple-daw` 的浏览器 Pattern Sequencer，逐步建设为：

1. 能完成完整音乐制作流程的高级 Web DAW；
2. 与星之境剧本、素材库、预览引擎深度联动的 Galgame 音乐工作室；
3. 面向 Galgame 一站式创作平台的独特音频生产与交付工具。

核心原则：

- 不按 FL Studio 的功能清单机械堆按钮。
- 不把“存在 UI 控件”当成“功能已完成”，每项功能必须有真实的音频引擎接线、工程数据和可验证交互。
- `simple-daw` 的源码结构和交互逻辑作为移植基线；我们的主题、平台集成和业务功能在其上扩展。
- Tone.js 负责音频调度、音源、效果、分析、录音和离线渲染；编辑器工程模型、撤销系统、资源管理和 Galgame 业务层由项目自行实现。
- 优先保证时间系统、工程可靠性和数据模型，再扩展高级视觉与更多控件。
- 旧版 `/audio-studio` 保留，V2 独立入口为 `/audio-studio-v2`；新功能默认先落在 V2。

---

## 1. 当前基线

### 1.1 技术栈

- Next.js 16.2.9 App Router
- React 19
- TypeScript strict
- Tailwind CSS 4
- Zustand
- Tone.js
- Prisma + SQLite

### 1.2 当前 V2 已接通能力

- Transport 基础播放、停止、BPM 和长度控制
- Tone.Transport 与 `scheduleRepeat('16n')` 调度
- Channel Rack 步进网格
- Piano Roll 基础音符编辑
- Playlist Pattern block 编排
- Mixer：每轨音量、声像、静音、独奏
- Master：基础 Reverb、3D Width、音量
- Sampler、PolySynth、MembraneSynth、NoiseSynth、MetalSynth
- MIDI 基础导入导出
- 实时 WAV 录制
- Sound Search / Freesound 导入入口
- 基础 Synth Editor：振荡器、ADSR、滤波器控件
- JSON 工程保存与加载
- 独立全屏路由 `/audio-studio-v2`

### 1.3 当前明确的半实现问题

以下项目存在 UI 或基础逻辑，但不能视为完整完成：

- Synth Editor 的 Filter Cutoff / Resonance 尚未稳定接入每轨真实 Filter 节点。
- Transport 尚未形成统一的 `ticks / beat / bar / seconds` 时间坐标体系。
- Loop、Seek、Marker、拍号、播放头和 Pattern 调度之间尚未完全统一。
- Playlist 主要是 Pattern block，不是统一的 Pattern / Audio / Automation Clip 系统。
- MIDI 处理未覆盖完整 PPQ、Tempo Map、CC、踏板、Program Change、多拍号和多轨映射。
- WAV 导出主要依赖实时 Recorder，不是高质量离线渲染。
- 工程保存缺少全局撤销历史、自动保存、崩溃恢复、版本快照和素材重链接。
- 当前音频引擎仍偏向“每拍扫描所有轨道”的简化调度，尚未充分使用 Tone.js 的事件模型。

---

## 2. `simple-daw` 移植边界

### 2.1 已移植的核心结构

参考仓库：`E:\In_development\StellarChest\simple-daw-reference`

| simple-daw 模块 | 当前对应模块 | 移植状态 |
|---|---|---|
| `useAppStore.js` | `src/store/useSimpleDawStore.ts` | 已移植并 TypeScript 化 |
| `AudioEngine.js` | `src/engine/SimpleAudioEngine.ts` | 已移植并适配 SSR 懒初始化 |
| `Transport.jsx` | `audio-studio-v2/Transport.tsx` | 已移植 |
| `ChannelRack.jsx` | `audio-studio-v2/ChannelRack.tsx` | 已移植 |
| `PianoRoll.jsx` | `audio-studio-v2/PianoRoll.tsx` | 已移植 |
| `Playlist.jsx` | `audio-studio-v2/Playlist.tsx` | 已移植 |
| `Mixer.jsx` | `audio-studio-v2/Mixer.tsx` | 已移植 |
| `SoundSearchModal.jsx` | `audio-studio-v2/SoundSearchModal.tsx` | 已补齐 |
| `App.jsx` | `audio-studio-v2/SimpleDawShell.tsx` | 已移植并接入独立路由 |

### 2.2 移植规则

- simple-daw 原版已有的功能，优先保持行为一致，再做类型、安全和平台适配。
- 主题保持 Galgame Toolkit 的深紫、粉色和星灵视觉路线，不直接复制原版橙色品牌配色。
- 不使用 simple-daw 的品牌名称、Logo 或不必要的原始文案。
- 保留 MIT 许可要求；参考仓库只作为源码与架构参考，不把无关项目文件混入主项目。
- 新增功能必须说明属于：
  - 原版能力补齐；
  - Tone.js 引擎增强；
  - 专业 DAW 能力；
  - Galgame 平台特色。

---

## 3. Tone.js 能力使用规划

### 3.1 已使用

- `Tone.Transport`
- `scheduleRepeat`
- `Tone.Sampler`
- `Tone.PolySynth`
- `Tone.MembraneSynth`
- `Tone.NoiseSynth`
- `Tone.MetalSynth`
- `Tone.Channel`
- `Tone.Freeverb`
- `Tone.Chorus`
- `Tone.Recorder`

### 3.2 优先接入

| Tone.js 能力 | 目标功能 | 所属里程碑 |
|---|---|---|
| `Part` / `Sequence` / `Loop` / `Event` | Pattern、音符、自动化事件的可靠调度 | M1 |
| Transport ticks / PPQ / loop / swing | 统一时间轴、量化、Swing、循环、Marker | M1 |
| `Player` / `Players` | 音频素材播放与 Audio Clip | M2 |
| `Offline` | 离线 WAV 渲染与 Stem 导出 | M4 |
| `Meter` / `Analyser` / `FFT` / `Waveform` | 电平表、频谱、波形、削波检测 | M3 |
| `Filter` / `EQ3` / `Compressor` / `Limiter` | 每轨效果链和 Master 母带 | M3 |
| `FeedbackDelay` / `Reverb` / `Convolver` | 延迟、混响、脉冲响应空间效果 | M3 |
| `LFO` / `Envelope` / `Signal` | 参数调制和 Automation 播放 | M3 |
| `UserMedia` / `Recorder` | 麦克风、角色语音和 Foley 录音 | M4 |

### 3.3 后置能力

- `GrainPlayer` / `PitchShift`：变速、变调和氛围音频处理
- `Panner3D` / `StereoWidener`：场景空间化和立体声塑形
- 更复杂的 Convolver、实时降噪和音高处理
- 桌面化后的低延迟设备接入与插件托管

### 3.4 Tone.js 不负责的部分

Tone.js 不能替代以下工程能力，必须自行建立：

- Pattern / Audio / Automation 三类 Clip 的统一数据模型
- 选择、多选、复制、切割、拉伸、吸附、编组和非破坏编辑
- 全局 Command History、撤销重做、自动保存、崩溃恢复
- Bus、Send、Return、Sidechain 路由图
- 素材引用、缺失素材重链接、版本快照和工程迁移
- Scene Scoring、剧情同步、引擎指令绑定和 Galgame 导出包

---

## 4. 开发里程碑

## M1：DAW Foundation 时间系统与工程可靠性

### 目标

把当前“能播放”的音序器升级为拥有可靠时间基准和可恢复工程状态的 DAW 底座。

### 开发范围

1. 新建统一 Timebase：
   - `ticks`
   - `beat`
   - `bar`
   - `seconds`
   - `bpm`
   - `ppq`
   - `timeSignature`
2. 重构 Transport Store：
   - 当前播放位置
   - 播放 / 停止 / 暂停
   - Seek
   - Loop Start / End
   - Marker
   - 节拍器
   - Swing
3. 用 `Tone.Part` / `Tone.Sequence` / `Tone.Loop` 替代单一全局扫描。
4. 修复播放头、时间码、小节拍和 Piano Roll 的统一换算。
5. 修复 Synth Filter 的真实音频节点接线。
6. 增加全局 Command History：
   - add / remove
   - move
   - edit note
   - change parameter
   - change clip
7. 增加工程 Schema Version。
8. 自动保存、手动恢复和最近工程恢复。
9. 增加最小错误边界和音频引擎初始化状态提示。

### 验收标准

- 播放、暂停、停止、Seek、Loop、Marker 在所有视图中一致。
- Piano Roll、Playlist 和音频引擎使用同一时间坐标。
- 任意编辑可以撤销和重做。
- 刷新页面后可以恢复最近一次自动保存工程。
- Synth Filter 的 Cutoff / Resonance 能真实改变声音。
- 不依赖 SSR 阶段创建 AudioContext。

---

## M2：Audio Clip 与专业 Playlist

### 目标

从 Pattern 编排器升级为可以混合 MIDI Pattern 和真实音频素材的 Playlist。

### 开发范围

1. 新建 Audio Clip 数据模型：
   - `id`
   - `assetId`
   - `startBeat`
   - `sourceOffset`
   - `duration`
   - `gain`
   - `fadeIn`
   - `fadeOut`
   - `reverse`
   - `loop`
   - `playbackRate`
2. 使用 `Tone.Player` / `Players` 播放 Audio Clip。
3. 音频导入与波形缓存。
4. Playlist 支持三类 Clip：
   - Pattern Clip
   - Audio Clip
   - Automation Clip
5. 编辑工具：
   - 选择
   - 移动
   - 多选
   - 复制
   - 切割
   - 删除
   - 吸附
   - 裁切
   - 淡入淡出
   - 增益调整
6. 轨道编组和轨道颜色。
7. 播放头跟随、Loop 区间和 Marker 显示。

### 验收标准

- 可将 WAV / MP3 / OGG 素材导入 Playlist。
- 可与 Pattern 同时播放。
- 可移动、裁切、复制和淡入淡出，且不破坏原始素材。
- 工程保存后重新加载，Clip 位置和参数保持一致。

---

## G1：Galgame Scene Scoring 工作流

### 目标

让音乐工作室直接理解 Galgame 剧本，而不是一个与创作平台割裂的普通 DAW。

### 开发范围

1. Scene Scoring Timeline：
   - 读取项目剧本
   - 显示 `@label`
   - 显示对白和旁白
   - 显示选择分支
   - 显示 `@bgm` / `@se` / `@voice`
   - 显示演出、转场和情绪变化
2. Emotion Map：
   - 接入现有剧本分析结果
   - 显示情绪曲线
   - 标记高潮、转折、留白
   - 建议 BPM、调式、和声色彩和配器
   - 将建议转换为 DAW Marker
3. Loop Composer：
   - Intro
   - Loop Start
   - Loop End
   - Outro
   - 零交叉检测
   - 交叉淡化
   - 连续循环试听
   - Intro + Loop 导出
4. Engine Binding Panel：
   - 选择项目素材
   - 绑定 `fileKey`
   - 配置音量、淡入、淡出、循环
   - 生成 `@bgm` / `@se` / `@voice`
   - 写回指定 `@label`
   - 预览实际游戏切歌效果

### 验收标准

- 选中剧本场景后，DAW 能显示该场景的剧情节点。
- 可在节点上配置 BGM、SE 和 Voice。
- 可试听循环和场景切换。
- 可将配置写回剧本并在星之境预览中生效。

---

## M3：Piano Roll、Automation 与专业 Mixer

### 开发范围

1. Piano Roll：
   - 框选和多选
   - 复制粘贴
   - 量化
   - Humanize
   - Legato
   - Ghost Notes
   - Scale Highlight
   - 和弦工具
   - 琶音器
   - Velocity / Pan / Pitch 事件
2. Automation：
   - Automation Clip
   - 参数绑定
   - 线性与贝塞尔曲线
   - 曲线点编辑
   - 实时录制推子和旋钮动作
   - 使用 `LFO` / `Envelope` 驱动参数
3. Mixer：
   - 每轨 Insert FX 链
   - EQ3
   - Compressor
   - Limiter
   - Delay
   - Reverb
   - Send / Return
   - Bus / Group
   - Sidechain 数据模型
   - Meter / FFT / Waveform
4. Master 总线和削波提示。

### 验收标准

- 可完成从 MIDI 编写到自动化和基本混音的完整流程。
- 参数变化会真实影响 Tone.js 音频节点。
- Mixer 能显示电平、频谱和削波状态。
- Automation 保存、播放和撤销行为稳定。

---

## M4：录音、离线渲染与交付

### 开发范围

1. 麦克风和线路录音：
   - `Tone.UserMedia`
   - 输入监听
   - 倒计时
   - 循环录音
   - Take 管理
2. MIDI 键盘输入录制。
3. 使用 `Tone.Offline` 离线渲染。
4. 导出：
   - WAV
   - OGG
   - MP3 转码层
   - Master
   - Stem 分轨
5. 交付分析：
   - Peak
   - RMS
   - LUFS
   - 削波检查
   - 尾音处理
6. Galgame Export Pack：
   - Master 音频
   - Intro + Loop 音频
   - Base / Tension / Romance / Climax 等 Stem
   - 循环点元数据
   - 响度报告
   - 星之境引擎配置
   - 素材引用与授权信息

### 验收标准

- 可从录音、编排、混音到导出完成闭环。
- 离线导出不依赖用户实时播放状态。
- 可输出适合游戏运行时使用的音频和配置包。

---

## G2：Galgame 音乐差异化能力

### 1. Adaptive Music Layers

将一首音乐拆成：

- Base
- Romance
- Tension
- Mystery
- Climax

支持量化切换、交叉淡化、状态预览和 Stem 导出。

### 2. Dialogue Ducking Preview

- 播放角色语音时自动压低 BGM；
- Threshold、Reduction、Attack、Release；
- 对比不同音乐音量下的语音清晰度；
- 导出运行时混音参数。

### 3. Character Leitmotif Library

为角色管理：

- 主题旋律
- 核心和弦
- 代表乐器
- 情绪变奏
- 使用场景
- 关联素材

### 4. Scene Variation Generator

同一个主题管理多个版本：

- 日常
- 浪漫
- 悲伤
- 紧张
- 高潮
- 黑化

保持核心动机一致，同时支持接入 AI 音乐提示词生成。

### 5. Galgame Export Pack

一次导出完整运行时资源：

- Master
- Intro + Loop
- 分层 Stem
- 循环点
- 场景绑定
- 音量和淡入淡出参数
- 响度与峰值报告
- `@bgm` / `@se` / `@voice` 配置

---

## 5. 开发路线选择

### 路线 A：专业底座优先

```text
M1 → M2 → M3 → M4 → G1 → G2
```

适合目标：先把产品做成完整可用的音乐制作工具。

优点：

- 架构稳定；
- 数据模型先统一；
- 后续功能返工少。

缺点：

- Galgame 差异化较晚出现；
- 前期视觉亮点不如特色工作流明显。

### 路线 B：Galgame 特色优先

```text
M1 最小集 → G1 → M2 → G2 → M3 → M4
```

适合目标：优先做出区别于普通 Web DAW 的演示效果。

优点：

- Scene Scoring、Loop Composer、Engine Binding 很快形成产品特色；
- 更贴近平台整体方向。

缺点：

- 早期仍受 Audio Clip 和混音能力限制；
- 如果 M1 做得过轻，后续可能返工。

### 路线 C：平衡路线，默认推荐

```text
M1 → M2 核心 → G1 → M3 → M4 → G2
```

具体顺序：

1. 统一时间系统、调度、撤销、自动保存和 Filter 接线；
2. 补 Audio Clip 与 Playlist 核心编辑；
3. 立即做 Scene Scoring、Loop Composer、Engine Binding；
4. 再补 Automation、Mixer 路由和高级 Piano Roll；
5. 最后做录音、离线渲染、Stem 和自适应音乐。

采用原因：

- 不让 Galgame 特色建立在脆弱的时间与工程底座上；
- 不把项目做成没有平台特色的普通 Web DAW；
- 每个里程碑都有可见成果和明确验收标准。

---

## 6. 当前锁定的下一步

默认进入 **M1：DAW Foundation 时间系统与工程可靠性**。

第一轮只处理以下范围：

1. 统一 Timebase 和 Transport Store；
2. 建立 `ticks / beat / bar / seconds` 转换；
3. 用 Tone.Part / Sequence / Loop 重构基础调度；
4. 实现可靠的时间码、Seek、Loop、Marker、节拍器和拍号；
5. 接通 Synth Filter 的真实音频节点；
6. 建立全局撤销/重做；
7. 增加工程 Schema Version、自动保存和恢复；
8. 为后续 Audio Clip、Automation 和 Scene Scoring 预留稳定数据边界。

M1 完成后再进入 M2，不在 M1 中提前加入大量 Audio Clip 或 Galgame UI，避免时间系统还没稳定就扩大改动面。

---

## 7. 每次开发的验收规则

每项后续功能完成时必须同时满足：

- 有真实 Store 数据模型；
- 有真实 Tone.js 或浏览器音频节点接线；
- 有可操作 UI；
- 有保存与恢复行为；
- 有撤销/重做策略；
- 有 TypeScript 类型检查；
- 有至少一条手动验证路径；
- 不破坏旧版 `/audio-studio`；
- V2 页面保持独立全屏；
- 不把临时实验代码混入稳定组件；
- 不擅自执行 Git commit 或 push。

## 8. 决策与变更记录

| 日期 | 决策 | 影响 |
|---|---|---|
| 2026-08-06 | 采用 `simple-daw`（MIT）作为 V2 的基础移植参考 | 保留其核心工作流，使用项目自身主题和平台集成 |
| 2026-08-06 | 后续 DAW 开发采用平衡路线 | 执行顺序为 M1 → M2 核心 → G1 → M3 → M4 → G2 |
| 2026-08-06 | `coding_plan.md` 改为全项目计划总册 | 本 DAW 计划归档为 `CP-DAW-001`，后续组件通过索引和独立章节登记 |

---

<a id="cp-canvas-001"></a>
# CP-CANVAS-001：星墨绘画工作室与专业画布

```yaml
id: CP-CANVAS-001
status: planning
priority: P1
active_milestone: CP-CANVAS-001-C0
depends_on: []
entry: /canvas-studio
legacy_scope: src/engine/CanvasEngine.ts
updated_at: 2026-08-06
```

> 状态：规划中  
> 当前锁定阶段：C0 引擎与参考项目选型  
> 当前入口：`/canvas-studio`  
> 旧入口：`/tools/image/canvas`，当前重定向到 `/canvas-studio`  
> 当前引擎：Konva 10.3.0 + react-konva 19.2.5  
> 参考项目：待 C0 合规审计与 PoC 后确定

## 0. 目标与产品边界

### 0.1 目标

将当前基础画布建设为：

1. 能承担 Galgame 角色立绘、表情差分、背景、CG 和 UI 素材制作的专业 Web 绘画工作室；
2. 同时支持高质量栅格绘画、对象/文本编辑和非破坏图层工作流；
3. 与项目素材库、AI 图像能力、角色设定和星之境引擎直接联动；
4. 具备完整页面、可靠工程文件、撤销恢复、导入导出和性能边界，而不是工具控件的集合。

### 0.2 核心原则

- 不预设一定更换 Konva；先用统一指标比较“保留、替换、混合架构”。
- 引擎许可证和参考项目许可证分别审计，不能因底层库是 MIT 就默认整个示例项目可移植。
- 参考项目只移植明确需要的工作流、交互和可复用实现，不复制品牌、素材和无关模块。
- 专业绘画的核心是笔刷质量、压感、图层、选区、变换、蒙版、颜色与工程可靠性，不能只按按钮数量评估。
- 绘画文档模型与渲染引擎解耦，避免再次更换底层时连带重写保存格式和平台集成。
- legacy Canvas 2D 与 Konva V2 在迁移完成前保留清晰边界，不双向写入两套不兼容状态。

### 0.3 本计划范围

- 当前实现与数据模型审计；
- 绘画引擎和完整开源参考项目选型；
- 许可证、依赖、维护状态与供应链审计；
- 隔离 PoC 和可回退迁移；
- 专业绘画工作台完整页面；
- 栅格笔刷、图层、选区、变换、颜色、导入导出和工程恢复；
- Galgame 角色差分、背景/立绘模板、AI 修图和素材库绑定。

### 0.4 暂不纳入

- 原生桌面级 Photoshop/Krita 插件生态；
- PSD 的所有私有特性和像素级完全兼容；
- CMYK 印刷出版链路；
- 自研 GPU 渲染器或从零实现完整笔刷物理系统；
- 未完成许可证审计的整仓复制；
- C0 决策前直接删除 legacy 实现或替换生产入口。

---

## 1. 当前真实基线

### 1.1 当前存在两条实现

| 路线 | 关键文件 | 定位 | 当前状态 |
|---|---|---|---|
| legacy Canvas 2D | `src/engine/CanvasEngine.ts`、`src/hooks/useCanvasEngine.ts`、`src/components/tools/image/ImageCanvasTool.tsx` | 基础位图涂鸦与图层合成 | 仍保留源码，不再是公开主入口 |
| Canvas Studio V2 | `src/components/tools/image/canvas-studio/`、`src/store/useCanvasStudioStore.ts`、`src/types/canvas-studio.ts` | Konva 场景图对象编辑器 | 当前 `/canvas-studio` 主入口 |
| 路由兼容层 | `src/app/(dashboard)/tools/image/canvas/page.tsx` | 旧地址兼容 | 已重定向至 `/canvas-studio` |

### 1.2 Canvas Studio V2 已接通能力

- Konva Stage、Layer 和 Transformer；
- 自由画笔、对象擦除、矩形、椭圆、直线、箭头、文本；
- 对象选择和部分对象缩放变换；
- 多图层的新增、删除、重命名、显示、透明度和上下移动；
- Zustand 状态、JSON 快照撤销/重做；
- 10% 至 400% 缩放与文档坐标显示；
- PNG 导出和 JSON 下载；
- 独立全屏工作台布局及快捷键。

### 1.3 不能视为完整的部分

- 自由笔画本质是 Konva `Line` 点列，没有笔压、倾斜、速度、纹理、稳定器和笔尖引擎；
- 擦除当前按命中的完整对象删除，不是像素级或蒙版式擦除；
- 图层只保存矢量形状数组，没有栅格图层、组、锁定、混合模式、蒙版、剪贴和调整图层；
- JSON 只有导出下载，缺少导入、Schema Version、迁移、素材引用和项目级持久化；
- 撤销历史是整份图层 JSON 快照，数据规模增大后存在内存和延迟风险；
- 文档尺寸固定，缺少新建文档、裁剪、旋转画布、DPI、背景透明与尺寸预设；
- 缺少选区、复制粘贴、多选、对齐、吸附、旋转、镜像和自由变换；
- 缺少图像导入、素材库保存、AI 结果回填、自动保存和崩溃恢复；
- 当前实现更接近矢量对象编辑器，不足以单独承担专业栅格插画工作流。

### 1.4 legacy 可保留的行为参考

legacy 版本已有画笔、橡皮、填充、吸管、画笔硬度、前景/背景色、基础图层合成与 PNG 导出。这些能力可以作为迁移验收清单，但其 Canvas 2D 实现和状态结构不作为新架构的默认基础。

---

## 2. 引擎与参考项目选型规则

### 2.1 候选架构

| 方案 | 适用定位 | 必须验证的问题 |
|---|---|---|
| A：继续 Konva | 以对象、文本、布局和轻量绘制为主 | 大量笔画性能、缓存、压感数据和栅格编辑是否可接受 |
| B：替换为栅格/WebGL 引擎 | 以插画、笔刷和像素处理为主 | React 集成、对象编辑、文字、导出和维护成本 |
| C：混合架构，默认优先验证 | 栅格绘画核心 + Konva/对象覆盖层 | 坐标同步、合成、撤销、选择、序列化和导出复杂度 |
| D：移植完整编辑器内核 | 参考项目已具备成熟工作流 | 许可证、架构耦合、包体、可维护性和平台适配成本 |

候选技术可包含 Konva、Fabric.js、PixiJS/WebGL 方案及其他通过审计的绘画内核。`tldraw`、Excalidraw 等白板型 SDK 只能作为对象交互参考，不能因 UI 完整就直接认定适合插画引擎。

### 2.2 引擎评分矩阵

C0 对每个候选按 100 分评估：

| 维度 | 权重 | 硬性要求 |
|---|---:|---|
| 许可证与商业合规 | 20 | 许可证文本可核验，义务可履行，无不明素材授权 |
| 笔刷与输入质量 | 20 | Pointer Events、压感；倾斜和笔速支持能力需有结论 |
| 栅格与图层能力 | 15 | 可支撑像素层、透明度、合成和非破坏扩展 |
| 性能与大画布 | 15 | 4K 画布、长笔画、多图层有可复现基准 |
| 工程模型与序列化 | 10 | 可建立版本化文档，不依赖不可控私有格式 |
| React/Next.js 适配 | 10 | 客户端边界、SSR、销毁和热更新行为明确 |
| 维护与生态 | 5 | 发布、Issue、文档和依赖维护状态可核验 |
| 导入导出与扩展 | 5 | PNG/WebP/JPEG 基线，PSD/ORA/SVG 能力有明确边界 |

决策门槛：

- 许可证项未通过，直接淘汰；
- 总分低于 75，不进入生产迁移；
- 笔刷或 4K 性能未达到 PoC 验收，不得以“后续优化”跳过；
- 新方案必须明显优于现状，或解决 Konva 无法合理解决的核心问题；
- 没有单一引擎同时满足要求时，优先选择边界清晰的混合架构，不强行寻找万能库。

### 2.3 参考项目合规清单

每个候选示例项目必须记录：

- 仓库 URL、固定 commit、许可证原文与版权声明；
- 源码、字体、图标、笔刷、示例图片、模型和第三方依赖各自许可；
- 是否允许修改、分发和商业使用；
- NOTICE、署名、源码公开或同许可证传播义务；
- 是否归档、维护活跃度、已知安全公告和供应链风险；
- 准备移植的文件/模块与明确不移植内容。

当前只把 miniPaint、SVG-Edit 等视为候选参考方向；在 C0 形成审计表前，不将其写成既定移植来源。

---

## 3. 目标架构边界

### 3.1 分层架构

```text
Canvas Studio Page / Panels / Commands
                ↓
CanvasDocument + Tool State + Command History
                ↓
Renderer Adapter / Brush Adapter / Import-Export Adapter
                ↓
Konva | Raster Canvas | WebGL | Hybrid Renderer
                ↓
Project Assets / AI Image / Character Data / Engine Binding
```

必须先稳定 `CanvasDocument` 和命令层，再让 UI 直接调用具体渲染引擎。渲染器负责绘制、命中测试和合成；文档层负责可保存业务数据；平台层负责素材、AI 和 Galgame 语义。

### 3.2 文档模型最低要求

```text
CanvasDocument
├─ schemaVersion
├─ metadata: title, width, height, dpi, colorSpace
├─ layers[]
│  ├─ raster | vector | text | group
│  ├─ visible, locked, opacity, blendMode
│  ├─ mask / clip reference
│  └─ content / asset reference
├─ guides / selection / optional animation metadata
└─ externalAssets[]
```

撤销历史不直接写入最终文档；运行时缓存与导出产物不混入可持久化工程数据。

### 3.3 迁移边界

- 新引擎先在隔离适配器或 PoC 页面验证，不直接改生产入口；
- C0 通过后才确定新旧共存周期和功能开关；
- 迁移器至少支持当前 V2 的 `StudioLayer[]`、基础形状和自由笔画；
- 无法无损迁移的字段必须产生可见报告，不能静默丢失；
- 回滚时保留当前 `/canvas-studio` 与 JSON 数据，不删除 legacy 源码；
- 生产入口切换后再安排旧实现归档，不能在迁移中途清理退路。

---

## 4. 里程碑与依赖

### CP-CANVAS-001-C0：现状审计、选型与合规 PoC

```yaml
id: CP-CANVAS-001-C0
status: planned
priority: P0
depends_on: []
blocks: [CP-CANVAS-001-C1]
```

范围：

1. 完成 legacy 与 Konva V2 功能矩阵、数据流和性能基线；
2. 选取 2 至 4 个引擎/参考项目候选；
3. 固定候选版本并完成许可证、资产和依赖审计；
4. 建立隔离 PoC，验证压感笔刷、4K 画布、多图层、选择变换、序列化和导出；
5. 用评分矩阵输出“保留 Konva、替换、混合架构”ADR；
6. 明确迁移映射、回滚路径和不移植清单。

预计影响范围：

- `package.json`，仅在用户确认 PoC 候选后新增依赖；
- `src/engine/canvas-studio/`；
- `src/types/canvas-studio.ts`；
- PoC 放置位置在实施前确认，不预先创建零散试验文件。

验收：

- 每个候选都有可核验许可证来源、固定版本和评分；
- 在同一设备和测试数据上记录 4096×4096 画布、多图层和连续笔画结果；
- PointerEvent `pressure` 进入实际笔触，而不只是被读取；
- PoC 能保存、重载并再次导出同一文档；
- ADR 明确一个推荐方案、淘汰理由、迁移成本和回滚方案；
- 未经用户确认，不进入 C1，不安装生产依赖。

### CP-CANVAS-001-C1：文档模型与渲染适配层

```yaml
id: CP-CANVAS-001-C1
status: blocked
priority: P0
depends_on: [CP-CANVAS-001-C0]
blocks: [CP-CANVAS-001-C2]
```

范围：

- 建立版本化 `CanvasDocument`；
- 建立 renderer、brush、command、import/export 适配边界；
- 将工具操作转换为命令，支持可合并笔画与事务式撤销；
- 实现 V2 JSON 导入迁移和错误报告；
- 增加自动保存、恢复、工程快照和外部素材引用；
- 保留现有功能的兼容渲染路径。

验收：

- 同一文档可保存、刷新恢复和跨版本迁移；
- 连续笔画不会为每个采样点创建独立历史项；
- 100 次典型撤销/重做后文档与渲染结果一致；
- 引擎替换不会迫使页面层重写工程保存协议；
- 旧 JSON 无法迁移时显示具体字段和对象，不静默失败。

### CP-CANVAS-001-C2：完整工作台与迁移闭环

```yaml
id: CP-CANVAS-001-C2
status: blocked
priority: P1
depends_on: [CP-CANVAS-001-C1]
blocks: [CP-CANVAS-001-C3]
```

范围：

- 建立完整页面布局：工具栏、工具属性、画布、图层、颜色、导航器、历史/资源面板；
- 移植经批准参考项目中的有效工作流；
- 新建/打开/保存/另存为/恢复工程；
- 导入图片和平台素材，导出 PNG、WebP、JPEG 与工程文件；
- 统一缩放、平移、旋转视图、适合窗口和高 DPI 渲染；
- 加入空状态、加载、错误、冲突、未保存更改和快捷键可达性。

验收：

- 用户可从新建文档到绘制、保存、重开和导出完成闭环；
- 页面在常用桌面宽度下不重叠，画布区域不会因面板内容跳动；
- 所有图标按钮有可访问名称或提示；
- 迁移前 V2 的基础形状、画笔、图层、撤销和导出能力不回退；
- 参考项目来源和本地修改边界可追溯。

### CP-CANVAS-001-C3：专业绘画核心

```yaml
id: CP-CANVAS-001-C3
status: blocked
priority: P1
depends_on: [CP-CANVAS-001-C2]
blocks: [CP-CANVAS-001-G1]
```

范围：

1. 笔刷：尺寸、不透明度、流量、硬度、间距、稳定器、压感曲线、纹理和预设；
2. 橡皮：像素级、压感和非破坏蒙版模式；
3. 图层：栅格、对象、文本、组、锁定、混合模式、蒙版、剪贴；
4. 选区：矩形、套索、魔棒、扩展/收缩、羽化、反选；
5. 变换：移动、缩放、旋转、镜像、自由变换、对齐和吸附；
6. 颜色：HSV/RGB、色板、吸管、最近颜色和调色盘；
7. 图像操作：裁剪、旋转画布、调整尺寸、基础色彩调整；
8. 性能：分块/脏区更新、离屏缓存、Worker 或 GPU 路径按选型落地。

验收：

- 鼠标与触控笔输入均可用，压感对笔宽或不透明度产生可见且可配置影响；
- 4K 画布的典型插画场景保持可交互，性能指标以 C0 基线和目标设备为准；
- 图层混合、蒙版和导出合成结果一致；
- 选区与变换均可撤销、保存和恢复；
- 长时间绘制不会因历史快照无限增长导致失控内存占用。

### CP-CANVAS-001-G1：Galgame 素材生产工作流

```yaml
id: CP-CANVAS-001-G1
status: blocked
priority: P1
depends_on: [CP-CANVAS-001-C3]
blocks: [CP-CANVAS-001-G2]
```

范围：

- 角色立绘与表情差分模板；
- 基于图层命名生成闭眼、张嘴、情绪和服装差分组合；
- 背景、CG、头像、对话框和 UI 素材尺寸预设；
- 安全区、裁切线、角色站位和对话框遮挡参考；
- 项目素材库打开、另存、版本和重链接；
- 一键导出立绘差分、缩略图和引擎素材映射；
- 生成可供星之境脚本引用的 `@character`、背景或 UI 配置建议。

验收：

- 一个角色工程可批量导出命名稳定的表情差分；
- 导出尺寸、透明背景、锚点和裁切规则可复现；
- 导出素材能进入项目素材库并被预览/脚本引用；
- 图层命名错误、组合冲突和缺失素材会在导出前报告。

### CP-CANVAS-001-G2：AI 辅助与高级非破坏工作流

```yaml
id: CP-CANVAS-001-G2
status: blocked
priority: P2
depends_on: [CP-CANVAS-001-G1]
blocks: []
```

范围：

- 选区内重绘、局部修复、扩图和背景移除；
- AI 结果作为新图层或新版本回填，不直接覆盖原图；
- 角色一致性参考、姿态/构图参考和生成参数记录；
- 人工绘制前后对比、版本选择和可撤销替换；
- AI 生成来源、提示词、模型和授权元数据随素材保存；
- 可选的线稿上色、背景辅助和表情差分建议。

验收：

- AI 调用失败或取消不会破坏当前文档；
- 结果默认进入独立图层/版本，并可完整撤销；
- 素材可追溯生成参数与来源；
- AI 功能不绕过项目既有供应商配置、权限和素材存储规则。

---

## 5. 推荐开发路线

默认采用与 DAW 相同的“底座和特色平衡推进”原则：

```text
C0 选型与合规 PoC
→ C1 文档模型与适配层
→ C2 完整工作台
→ C3 专业绘画核心
→ G1 Galgame 素材工作流
→ G2 AI 辅助与高级能力
```

其中 C0 是强制决策门。若 PoC 证明 Konva + 栅格扩展足够，则不为“换引擎”本身增加迁移；若专业笔刷与大画布要求无法满足，再选择替换或混合架构。

---

## 6. 风险与回滚

| 风险 | 影响 | 控制措施 |
|---|---|---|
| 将白板/矢量库误当专业绘画引擎 | 后期笔刷与像素编辑返工 | C0 压感与 4K 实测作为硬门槛 |
| 示例项目许可证或素材授权不清 | 商业分发风险 | 分别审计源码、依赖和资产，固定 commit |
| 混合渲染坐标和撤销不同步 | 数据损坏或导出错位 | 统一文档坐标和命令事务，适配器单向写入 |
| 整文档 JSON 历史膨胀 | 大工程卡顿或崩溃 | 命令历史、合并笔画、快照间隔与内存上限 |
| 旧 JSON 迁移丢字段 | 用户工程损失 | 只读原文件、迁移报告、版本化迁移器 |
| AI 结果覆盖原图 | 不可逆内容损失 | 新图层/新版本回填，默认非破坏 |
| 参考项目移植面过大 | 难维护、包体和依赖膨胀 | 模块白名单、功能映射、禁止整仓复制 |

回滚原则：C0/C1 不切换生产入口；C2 切换必须保留功能开关和当前 Konva 文档；任何迁移只生成新版本，不覆盖原工程；稳定观察完成后才归档旧实现。

---

## 7. 当前锁定的下一步

当前唯一允许启动的里程碑是 **CP-CANVAS-001-C0**。第一轮实施只包含：

1. 形成现状功能、性能和数据模型基线；
2. 与用户确认候选引擎和参考项目名单；
3. 做许可证与资产合规审计；
4. 设计同条件 PoC 与评分表；
5. 运行 PoC 后提交 ADR，由用户确认最终架构。

在 ADR 获得确认前：

- 不替换 `/canvas-studio` 的生产引擎；
- 不删除 legacy Canvas 2D 或当前 Konva V2；
- 不安装未经确认的生产依赖；
- 不开始完整页面移植；
- 不把候选项目名称写成既定技术决定。

---

## 8. 全计划验收规则

每项绘画功能标记完成前必须同时满足：

- 有真实 `CanvasDocument` 数据或明确运行时状态；
- 交互已接到真实渲染与合成行为，而非只有控件；
- 操作可撤销/重做，并定义合并粒度；
- 工程可保存、恢复和迁移；
- 导出结果与编辑预览一致；
- 有桌面鼠标和 Pointer Events 验证；涉及笔刷时必须验证触控笔压感；
- 有大画布和多图层性能验证；
- 有许可证、来源和第三方资产记录；
- 不破坏素材库、AI 图像或旧地址兼容；
- 不擅自执行 Git commit 或 push。

## 9. 决策与变更记录

| 日期 | 决策 | 影响 |
|---|---|---|
| 2026-08-06 | 建立 `CP-CANVAS-001` | 绘画工作室纳入项目总计划，不再以零散功能推进 |
| 2026-08-06 | 当前架构结论保持开放 | 必须通过 C0 决定保留 Konva、替换或采用混合架构 |
| 2026-08-06 | 采用“底座 + 完整页面 + 专业能力 + Galgame 集成”路线 | 先稳定文档和渲染边界，再扩展差异化能力 |
