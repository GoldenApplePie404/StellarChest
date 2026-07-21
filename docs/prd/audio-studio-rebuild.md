# PRD：音乐工作室重构 — 专业级在线 DAW

> **产品经理**：Alice（许清楚）
> **项目名称**：audio_studio_rebuild
> **技术栈**：Vite + React + MUI + Tailwind CSS · Tone.js v15 · @tonejs/midi
> **原始需求**：将 `/tools/audio/studio` 当前的简陋音乐工作室重构为类似 FL Studio 的专业级在线 DAW，包含步进音序器、增强钢琴卷帘、混音台、效果器链、采样器/鼓机、编排视图、浏览器面板、可视化分析、导出增强等 10 个功能模块。

---

## 1. 产品定义

### 1.1 产品目标

1. **提供专业级的在线音乐创作体验** — 让视觉小说创作者无需安装任何桌面 DAW，即可在浏览器中完成全部作曲、编曲、混音工作流。
2. **深度集成到视觉小说平台** — 音乐工作室的输出（WAV/MIDI/Pattern 数据）应能无缝导入到视觉小说项目的对话脚本和场景配置中。
3. **降低音乐创作门槛** — 通过 FL Studio 式的编排语言（Pattern + Playlist）、步进音序器和鼓机预设，让没有乐理基础的创作者也能快速产出背景音乐和音效。

### 1.2 用户故事

| ID | 用户故事 |
|:--:|----------|
| US1 | As a **视觉小说开发者**, I want to **使用步进音序器快速编排鼓点节奏**, so that **无需学习钢琴卷帘即可创作打击乐部分**。 |
| US2 | As a **音乐作曲者**, I want to **在增强的钢琴卷帘中选中、拖拽、调整音符的起止和力度**, so that **能精细编辑 MIDI 旋律**。 |
| US3 | As a **混音师**, I want to **在混音台中为每个轨道调节音量、声像并插入效果器链**, so that **能完成完整的混音工作流**。 |
| US4 | As a **音效设计师**, I want to **将采样/鼓机预设拖拽到轨道上**, so that **能快速构建节奏声部**。 |
| US5 | As a **编曲者**, I want to **创建多个 Pattern 并在编排视图中排列组合**, so that **能构建完整的歌曲结构**。 |
| US6 | As a **项目管理者**, I want to **从浏览器面板浏览采样库和预设乐器**, so that **能快速找到合适的音色并拖入工程**。 |
| US7 | As a **质量保障人员**, I want to **查看每个轨道的电平表和主输出的频谱分析**, so that **能监控音频动态并避免削波**。 |
| US8 | As a **导出负责人**, I want to **导出多轨分轨 WAV、MIDI 并支持导入现有 MIDI 文件**, so that **可在其他 DAW 中继续编辑**。 |
| US9 | As a **视觉小说脚本编辑**, I want to **将完成的音乐工程保存为平台项目格式**, so that **能直接关联到视觉小说的场景/对话节点**。 |
| US10 | As a **一般用户**, I want to **通过可拖拽调整面板大小的多栏布局操作所有功能**, so that **有类似 FL Studio 的熟悉操作体验**。 |

---

## 2. 技术规范

### 2.1 需求池

#### P0 — 核心功能（必须有）

| 编号 | 需求描述 | 关联模块 |
|:----:|----------|:--------:|
| R01 | **步进音序器**：通道机架式布局，每行一个乐器通道，每列一个步进。点击添加/删除节拍，支持力度（Velocity）调节（点击循环 4 级或纵向滚动）。支持多个 Pattern，Pattern 可复制/重命名。 | Step Sequencer |
| R02 | **钢琴卷帘重写**：支持音符选中（框选/Shift 多选）、拖拽移动（上下移调、左右移时）、拖拽调整时长（右边缘拖拽）、力度视觉化（颜色/高度条）、水平/垂直缩放（滚轮/Ctrl+滚轮）、网格吸附（1/4、1/8、1/16 可选）、MIDI 键盘显示（可缩放的键位范围）。 | Piano Roll |
| R03 | **混音台**：每个轨道独立音量推子（-∞ ~ +6 dB）、声像旋钮（L/R）、Mute/Solo 按钮。主输出总线。效果器插槽链（每个轨道 4 个插槽，支持拖拽排序）。电平表（VU 表头样式，实时显示每个轨道和主输出的 RMS/Peak）。 | Mixer |
| R04 | **编排视图（Playlist）**：将 Pattern 作为 Clip 拖拽到时间轴上排列。支持 Pattern 克隆、裁剪、移动。时间轴标尺（小节/拍号）。轨道头显示轨道名和颜色。横向/纵向滚动。 | Playlist |
| R05 | **播放引擎重构**：基于 Tone.js Transport + Part/Sequence 实现精确调度。支持全局 BPM（20-300）、播放/暂停/停止、循环播放（可设起止点）、播放头跟随。当前节拍高亮。 | Engine |

#### P1 — 重要功能（应该有）

| 编号 | 需求描述 | 关联模块 |
|:----:|----------|:--------:|
| R06 | **效果器链**：6 种效果器 — 混响（Reverb: decay, wet/dry, tone）、延迟（Delay: delayTime, feedback, wet/dry）、合唱（Chorus: rate, depth, wet/dry）、压缩（Compressor: threshold, ratio, attack, release）、失真（Distortion: distortion amount, wet/dry）、滤波（Filter: frequency, type, rolloff）。每个效果器独立参数面板，可折叠/展开。效果器拖拽改变顺序。 | Effects Chain |
| R07 | **采样器与鼓机**：Tone.js Sampler 载入鼓采样。内置鼓机预设（标准 Kit：Kick/Snare/Hi-Hat/Open-Hat/Clap）。拖拽音频文件（WAV/MP3/OGG）到轨道生成 Player 实例。采样波形显示在轨道上。 | Sampler/Drum Machine |
| R08 | **浏览器面板**：左侧可折叠面板，包含「采样库」Browser（按类别浏览鼓/乐器/FX 采样）、「预设」Browser（乐器预设/效果器预设/Pattern 模板）。拖拽到轨道/效果器插槽。支持搜索筛选。 | Browser Panel |
| R09 | **可视化分析**：每个轨道 VU 电平表（使用 Tone.js Meter/FFT）。主输出频谱分析器（FFT 可视化，带频率标尺）。波形显示（播放中的 Pattern/音频片段）。 | Visualization |
| R10 | **MIDI 导入/导出增强**：导出 MIDI（使用 @tonejs/midi 替代手写 MIDI 编码）。导入 MIDI 文件（解析为标准 MIDI，生成带音符的轨道）。导出多轨分轨 WAV（每个轨道单独渲染 + 主输出合并）。 | Export |

#### P2 — 锦上添花（可有）

| 编号 | 需求描述 | 关联模块 |
|:----:|----------|:--------:|
| R11 | **MIDI 键盘输入**：连接外部 MIDI 键盘（Web MIDI API），实时输入音符到选中轨道/Pattern。 | MIDI Input |
| R12 | **自动化曲线（Automation）**：在 Playlist 中为音量/声像/效果器参数绘制自动化曲线。 | Automation |
| R13 | **工程模板**：预置常见工程模板（8-bar loop、J-RPG BGM、Visual Novel Piano）。 | Templates |
| R14 | **AI 辅助作曲**：基于已有 Pattern 生成变体或和弦进行（调用现有 AI API）。 | AI Assist |
| R15 | **键盘快捷键完整覆盖**：类似 FL Studio 的快捷键体系（F5=Browser, F6=Step Seq, F7=Piano Roll, F8=Playlist, F9=Mixer）。 | Shortcuts |

### 2.2 UI 布局设计稿

#### 整体布局（FL Studio 风格多面板）

```
┌─────────────────────────────────────────────────────────────────────┐
│  [菜单栏]  文件 │ 编辑 │ 工具 │ 视图 │ 帮助    [BPM: 120] [4/4]  │
├─────────────────────────────────────────────────────────────────────┤
│  [播放控制]  ⏮ ⏯ ⏹ 🔴 [位置: 00:00.0]  [循环: A:0 B:16] [节拍器] │
├─────────┬───────────────────────────────────────┬───────────────────┤
│         │                                       │                   │
│  Browser│     ┌───────────────────────────────┐ │    Mixer         │
│  Panel   │     │                               │ │    ┌─────────┐  │
│  ─────── │     │    Tab: [Step Seq] [Piano]   │ │    │Track 1  │  │
│  Drums   │     │           [Playlist]         │ │    │[Vol][Pan]│  │
│  Kicks   │     │                               │ │    │[FX Slot] │  │
│  Snares  │     │   主编辑区域                   │ │    │[VU Meter]│  │
│  Hats    │     │   (根据选中 Tab 切换)          │ │    ├─────────┤  │
│  ─────── │     │                               │ │    │Track 2  │  │
│  Synths  │     │                               │ │    │...      │  │
│  Presets │     │                               │ │    ├─────────┤  │
│  ─────── │     │                               │ │    │Master   │  │
│  Samples │     │                               │ │    │[FFT]    │  │
│  ...     │     │                               │ │    └─────────┘  │
│         │     └───────────────────────────────┘ │                   │
│         │                                       │                   │
├─────────┴───────────────────────────────────────┴───────────────────┤
│  状态栏: 轨道数 │ 音符数 │ 内存使用 │ 音频设备状态                   │
└─────────────────────────────────────────────────────────────────────┘
```

#### 步进音序器子布局

```
┌───────────────────────────────────────────────────────────────────┐
│ [Pattern: P1 ▼] [复制] [重命名] [+ 新 Pattern]                    │
├───────┬───────────────────────────────────────────────────────────┤
│       │  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15│
├───────┼───────────────────────────────────────────────────────────┤
│Kick   │ [■] [ ] [ ] [ ] [■] [ ] [ ] [ ] [■] [ ] [ ] [ ] [■] [ ]  │
│Snare  │ [ ] [ ] [■] [ ] [ ] [ ] [■] [ ] [ ] [ ] [■] [ ] [ ] [ ]  │
│HH-Cl  │ [■] [■] [■] [■] [■] [■] [■] [■] [■] [■] [■] [■] [■] [■]  │
│HH-Op  │ [ ] [ ] [■] [ ] [ ] [ ] [■] [ ] [ ] [ ] [■] [ ] [ ] [ ]  │
│Clap   │ [ ] [ ] [ ] [ ] [■] [ ] [ ] [ ] [ ] [ ] [■] [ ] [ ] [ ]  │
├───────┼───────────────────────────────────────────────────────────┤
│[+] 添加通道   [力度: ██████░░ 80]    [速: 1/4  ▾]                │
└───────────────────────────────────────────────────────────────────┘
```

#### 混音台子布局

```
┌────────────────────────────────────────────────────────────────────┐
│  Mixer (混音台)                                     [主输出]       │
├────────┬────────┬────────┬────────┬────────┬────────┬────────────┤
│ Track1 │ Track2 │ Track3 │ Track4 │ Track5 │ Track6 │ Master     │
│ Piano  │ Kick   │ Bass   │ Synth  │ Pad    │ FX     │            │
│        │        │        │        │        │        │            │
│ ┌──┐   │ ┌──┐   │ ┌──┐   │ ┌──┐   │ ┌──┐   │ ┌──┐   │ ┌──┐      │
│ │+6│   │ │+6│   │ │+6│   │ │+6│   │ │+6│   │ │+6│   │ │+6│      │
│ │  │   │ │  │   │ │  │   │ │  │   │ │  │   │ │  │   │ │  │      │
│ │0 │   │ │0 │   │ │0 │   │ │0 │   │ │0 │   │ │0 │   │ │0 │      │
│ │  │   │ │  │   │ │  │   │ │  │   │ │  │   │ │  │   │ │  │      │
│ │  │   │ │  │   │ │  │   │ │  │   │ │  │   │ │  │   │ │  │      │
│ │-∞│   │ │-∞│   │ │-∞│   │ │-∞│   │ │-∞│   │ │-∞│   │ │-∞│      │
│ └──┘   │ └──┘   │ └──┘   │ └──┘   │ └──┘   │ └──┘   │ └──┘      │
│ [VU ██]│ [VU ██]│ [VU ██]│ [VU ██]│ [VU ██]│ [VU ██]│ [VU ██]   │
│────────┤────────┤────────┤────────┤────────┤────────┤────────────│
│ FX Ins │ FX Ins │ FX Ins │ FX Ins │ FX Ins │ FX Ins │ FX Ins    │
│ [Rev]  │ [Comp] │ [Del]  │ [---]  │ [Chor] │ [---]  │ [Limiter] │
│ [---]  │ [---]  │ [---]  │ [---]  │ [---]  │ [---]  │ [---]     │
│ [---]  │ [---]  │ [---]  │ [---]  │ [---]  │ [---]  │ [---]     │
│ [---]  │ [---]  │ [---]  │ [---]  │ [---]  │ [---]  │ [---]     │
├────────┴────────┴────────┴────────┴────────┴────────┴────────────┤
│ [Pan: ●━─] [M] [S]                                               │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. 与现有代码的集成方案

### 3.1 目录结构重构建议

```
src/
├── components/
│   └── tools/
│       └── audio/
│           ├── studio/                          # DAW 主目录
│           │   ├── AudioStudioTool.tsx           # 主入口（重构当前文件）
│           │   ├── transports/                   # 传输栏
│           │   │   └── TransportBar.tsx
│           │   ├── step-sequencer/               # 步进音序器
│           │   │   ├── StepSequencer.tsx
│           │   │   ├── StepGrid.tsx
│           │   │   ├── ChannelStrip.tsx
│           │   │   └── PatternSelector.tsx
│           │   ├── piano-roll/                   # 钢琴卷帘重写
│           │   │   ├── PianoRoll.tsx
│           │   │   ├── PianoKeys.tsx
│           │   │   ├── NoteGrid.tsx
│           │   │   ├── VelocityBar.tsx
│           │   │   └── NoteSelector.ts
│           │   ├── mixer/                        # 混音台
│           │   │   ├── Mixer.tsx
│           │   │   ├── ChannelFader.tsx
│           │   │   ├── PanKnob.tsx
│           │   │   ├── VUMeter.tsx
│           │   │   └── MasterBus.tsx
│           │   ├── effects/                      # 效果器链
│           │   │   ├── EffectsChain.tsx
│           │   │   ├── EffectSlot.tsx
│           │   │   ├── EffectPanel.tsx
│           │   │   └── presets/
│           │   │       ├── ReverbPanel.tsx
│           │   │       ├── DelayPanel.tsx
│           │   │       ├── ChorusPanel.tsx
│           │   │       ├── CompressorPanel.tsx
│           │   │       ├── DistortionPanel.tsx
│           │   │       └── FilterPanel.tsx
│           │   ├── sampler/                      # 采样器/鼓机
│           │   │   ├── DrumMachine.tsx
│           │   │   ├── SamplerTrack.tsx
│           │   │   └── DrumPresets.ts
│           │   ├── playlist/                     # 编排视图
│           │   │   ├── Playlist.tsx
│           │   │   ├── PatternClip.tsx
│           │   │   ├── TimelineRuler.tsx
│           │   │   └── PlaylistTrack.tsx
│           │   ├── browser/                      # 浏览器面板
│           │   │   ├── BrowserPanel.tsx
│           │   │   ├── SampleLibrary.tsx
│           │   │   └── PresetExplorer.tsx
│           │   ├── visualization/                # 可视化
│           │   │   ├── SpectrumAnalyzer.tsx
│           │   │   ├── WaveformDisplay.tsx
│           │   │   └── VUMeterBar.tsx
│           │   └── export/                       # 导出
│           │       ├── ExportDialog.tsx
│           │       └── MIDIImporter.ts
│           ├── AudioWaveformTool.tsx             # 保留不变
│           ├── AudioEffectsTool.tsx              # 保留不变
│           └── AudioAITool.tsx                   # 保留不变
├── hooks/
│   └── useMusicStudio.ts                         # 需要拆分重构
├── stores/                                       # 新增：状态管理
│   └── audio/
│       ├── useTransportStore.ts                  # 传输状态
│       ├── useTrackStore.ts                      # 轨道/Patterm 状态
│       ├── useMixerStore.ts                      # 混音台/效果器状态
│       └── useProjectStore.ts                    # 工程保存/加载
└── types/
    └── tools.ts                                  # 需要扩展类型定义
```

### 3.2 增量集成策略

1. **Phase 1 — 基础设施**（P0）
   - 重构状态管理层（从单个 hook 拆分为多个 store）
   - 实现 Tab 切换的布局框架（Step Seq / Piano Roll / Playlist）
   - 实现可折叠/可拖拽的多面板布局
   - 实现步进音序器 + 增强钢琴卷帘
   - 确保现有导出功能不受影响

2. **Phase 2 — 混音与效果**（P0 + P1）
   - 实现混音台面板
   - 实现效果器链和 6 种效果器参数面板
   - 使用 Tone.js Meter/FFT 实现电平表和频谱分析
   - 保留并增强之前的导出 WAV/MIDI 入口

3. **Phase 3 — 编排与采样**（P1）
   - 实现编排视图（Playlist）
   - 实现 Pattern 管理（多 Pattern 创建/复制/编排）
   - 实现采样器/鼓机 + 浏览器面板

4. **Phase 4 — 导出增强与收尾**（P1 + P2）
   - 替换手写 MIDI 导出的 @tonejs/midi 迁移
   - 实现 MIDI 导入
   - 实现多轨分轨导出
   - 键盘快捷键完整覆盖
   - 工程模板

### 3.3 数据模型扩展

```typescript
// 现有类型需要扩展的方向：

// 新增：Pattern 模型
interface Pattern {
  id: string;
  name: string;
  color: string;
  length: number;      // 小节数
  notes: Record<string, MIDINote[]>;  // channelId → notes
}

// 新增：效果器实例
interface EffectInstance {
  id: string;
  type: 'reverb' | 'delay' | 'chorus' | 'compressor' | 'distortion' | 'filter';
  enabled: boolean;
  params: Record<string, number>;  // 效果器参数
  bypassed: boolean;
}

// 扩展：轨道模型增加效果器链和 Pattern 引用
interface StudioTrack {
  ...existingFields,
  effects: EffectInstance[];        // 效果器链
  patterns: Pattern[];              // 该轨道的 Pattern 列表
  activePatternId: string;          // 当前编辑的 Pattern
  sampleUrl?: string;               // 采样文件 URL（采样器轨道）
  isSampleTrack: boolean;           // 是否为采样器轨道
}

// 新增：编排 Clip
interface PlaylistClip {
  id: string;
  patternId: string;
  trackId: string;
  startTime: number;      // 起始小节
  duration: number;       // 持续小节
  offset: number;         // clip 内偏移
  muted: boolean;
}
```

---

## 4. 待确认问题

| 编号 | 问题 | 建议方向 |
|:----:|------|----------|
| Q01 | 是否保留现有的 AudioWaveformTool / AudioEffectsTool / AudioAITool 作为独立工具入口，还是逐步合并到 DAW 中？ | 建议 Phase 1 保留独立入口，后续版本考虑将波形编辑和效果器作为 DAW 内部模块集成。 |
| Q02 | 状态管理方案：使用 Zustand（推荐）还是 React Context + useReducer？ | Zustand 更轻量，支持 selector 避免不必要渲染，适合 DAW 的高频更新场景（VU 表、播放头）。 |
| Q03 | Pattern 的数据粒度：Pattern 是按轨道独立（FL Studio 模式），还是全局 Pattern 包含所有轨道（Ableton Live 模式）？ | 建议 FL Studio 模式：每个轨道有独立的 Pattern 列表，Step Sequencer 按轨道切换 Pattern。 |
| Q04 | 效果器参数是否需要支持 Automation 曲线？ | P2 功能，Phase 2 先实现静态参数调节，Phase 4 再考虑 Automation。 |
| Q05 | 采样库的存储策略：采样的音频文件是前端加载（public/ 目录），还是通过现有的 API 上传/下载？ | 基础鼓机预设内置到 public/samples/，用户拖拽的文件通过现有 /api/tools/audio/upload 上传。 |
| Q06 | 是否要支持 Web Worker 渲染多轨导出？当前导出 WAV 走的是服务端 API 渲染。 | 建议保持服务端渲染方案，后续可考虑前端 OfflineAudioContext 渲染作为备选。 |
| Q07 | @tonejs/midi 的迁移范围：仅替换 MIDI 导出，还是同时用于谱面展示？ | Phase 4 先替换 MIDI 导出/导入，谱面乐谱渲染属于 P3 范围。 |
| Q08 | 移动端/触屏适配的优先级？ | 桌面优先（FL Studio 参考），移动端仅保证基本播放和查看。 |
| Q09 | 是否保留现有 AudioStudioTool.tsx 中的录制（Mic）功能？ | 建议保留并增强，录制的内容可作为采样导入浏览器面板。 |
| Q10 | 浏览器面板的采样库是否需要从外部 API 加载默认采样包？ | 基础包内置（鼓 Kit ~2MB），扩展包按需通过后台管理上传。 |
