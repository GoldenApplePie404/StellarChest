// 星灵 · 剧本分析引擎
// —— 借鉴 Galgame-Studio 的 scene_analyzer.py，将自由文本转换为结构化素材需求清单
// 适配现有 ai-templates.ts 提示词模板库

import {
  STYLE_TEMPLATES,
  EXPRESSION_PROMPTS,
  BGM_MOODS,
  type ExpressionPrompt,
  type BGMMood,
} from './ai-templates';

// ============================================================
// 类型定义 —— LLM 返回的结构化场景 JSON
// ============================================================

/** LLM 返回的单个场景 */
export interface AnalyzedScene {
  scene_id: string;
  scene_title: string;
  location: string;
  time: string;
  mood: string;
  bg_description: string;
  characters_in_scene: AnalyzedCharacter[];
  cg_suggestions: AnalyzedCG[];
  lines: AnalyzedLine[];
  bgm_mood: string;
  sfx: string[];
  transition: string;
  choices?: AnalyzedChoice[];
}

export interface AnalyzedCharacter {
  name: string;
  role: string;
  appearance: string;
  sprites_needed: string[];
}

export interface AnalyzedCG {
  cg_id: string;
  description: string;
  trigger_line_index: number;
}

export interface AnalyzedLine {
  speaker: string;
  text: string;
  type: 'narration' | 'dialogue' | 'inner_thought';
  expression?: string;
}

export interface AnalyzedChoice {
  choice_id: string;
  text: string;
  target_scene?: string;
}

// ============================================================
// 素材需求清单 —— 分析结果去重后按类型归类
// ============================================================

export interface SceneAnalysisResult {
  meta: {
    totalScenes: number;
    totalLines: number;
    totalDialogues: number;
    characterCount: number;
    bgCount: number;
    cgCount: number;
    bgmCount: number;
    sfxCount: number;
    choiceSceneCount: number;
  };
  characters: CharacterAssetRequirement[];
  backgrounds: BackgroundAssetRequirement[];
  cgs: CGAssetRequirement[];
  bgm: BGMAssetRequirement[];
  sfx: SFXAssetRequirement[];
  choices: ChoiceRequirement[];
  rawScenes: AnalyzedScene[];
}

export interface CharacterAssetRequirement {
  name: string;
  role: string;
  appearance: string;
  sprites: SpritePromptCard[];
}

export interface SpritePromptCard {
  expression: string;
  emotion: string;
  promptSuffix: string;
  /** 拼装好的完整文生图 prompt */
  positivePrompt: string;
  negativePrompt: string;
  filenameTemplate: string;
  bestUse: string;
}

export interface BackgroundAssetRequirement {
  location: string;
  bgDescription: string;
  /** 拼装好的完整文生图 prompt */
  positivePrompt: string;
  negativePrompt: string;
  filenameTemplate: string;
  usedInScenes: string[];
}

export interface CGAssetRequirement {
  cgId: string;
  sceneTitle: string;
  description: string;
  positivePrompt: string;
  negativePrompt: string;
  filenameTemplate: string;
}

export interface BGMAssetRequirement {
  mood: string;
  label: string;
  aiPrompt: string;
  sunoGenre: string;
  filenameTemplate: string;
  sceneCount: number;
  bestFor: string;
}

export interface SFXAssetRequirement {
  sfx: string;
  sceneCount: number;
}

export interface ChoiceRequirement {
  sceneId: string;
  sceneTitle: string;
  choices: { id: string; text: string }[];
}

// ============================================================
// 系统提示词 —— 剧本 → 分镜分析
// ============================================================

export const SCENE_ANALYSIS_SYSTEM = `你是一个专业的Galgame/视觉小说剧本编剧。你的任务是将输入的小说或剧本文本转换为结构化的视觉小说分镜脚本。

## 输出格式
你必须返回严格的 JSON 对象，格式为 { "scenes": [...] }。不要包含任何 JSON 之外的文本、注释或 Markdown 包裹。

每个场景的结构：
{
  "scene_id": "scene_001",
  "scene_title": "场景标题（简短有力，6字以内）",
  "location": "场景地点描述",
  "time": "时间描述（如：傍晚教室、雨后的街道）",
  "mood": "氛围（英文标签，如 warm_library / rainy_street / tense_room）",
  "bg_description": "背景画面的详细描述，用于AI绘图（50-100字，描述光线、环境、氛围、建筑细节）",
  "characters_in_scene": [
    {
      "name": "角色名",
      "role": "主角/女主/配角",
      "appearance": "外观的详细描述，用于AI绘图做立绘（包含发型、发色、服装、体型、气质，50-80字）",
      "sprites_needed": ["default", "happy", "sad", "angry", "shy"]
    }
  ],
  "cg_suggestions": [
    {
      "cg_id": "cg_001",
      "description": "CG场景描述（80-120字），用于AI绘图生成事件CG",
      "trigger_line_index": 5
    }
  ],
  "lines": [
    {
      "speaker": "说话人（旁白/角色名）",
      "text": "台词内容",
      "type": "narration|dialogue|inner_thought",
      "expression": "对话时的表情（仅dialogue类型需要）"
    }
  ],
  "bgm_mood": "BGM情绪标签（如 calm_piano / tense_strings / romantic / sad / upbeat / mysterious）",
  "sfx": ["音效列表，如 door_open, rain, footsteps"],
  "transition": "转场方式（fade / dissolve / none）",
  "choices": [
    {
      "choice_id": "choice_001a",
      "text": "选项文本（如：追上去拦住她）",
      "target_scene": ""
    }
  ]
}

## 规则
1. 根据文本的自然段落和场景切换来划分场景，通常 200-800 字一个场景
2. 每个场景需要有明确的地点变化或情绪转折
3. 角色名要从原文中提取，不要创造新名字
4. 旁白统一用"旁白"作为 speaker
5. 心情独白用 type="inner_thought"
6. bg_description 要足够详细，包含构图、光线、色彩指引
7. 角色 appearance 要统一——同一角色在不同场景中外观描述要一致
8. CG 建议用于值得画成独立插画的关键场景（如相遇、重要事件、结局）
9. BGM 情绪标签要能指导 AI 音乐生成
10. 如果原文有多个选项或分支走向，在对应场景中添加 choices 字段
11. choices 中的 target_scene 先留空
12. 不要强行编造分支，只在原文确实存在选择点时添加 choices`;

// ============================================================
// 用户消息构建
// ============================================================

export function buildAnalysisUserPrompt(scriptText: string): string {
  const truncated =
    scriptText.length > 8000
      ? scriptText.slice(0, 8000) + '\n\n...（文本过长，已截取前 8000 字）'
      : scriptText;
  return `请分析以下剧本或小说文本，将其转换为视觉小说分镜脚本。

注意：
- 角色名只从原文中提取
- 背景描述要包含构图和光线指引
- 角色外观描述要详细且能够在所有场景中保持一致
- 道具、服装、环境细节要具体化
- 标记适合做 CG 的关键场景

小说/剧本文本：
---
${truncated}
---

请直接返回 JSON 对象，格式为 {"scenes": [...]}，不要包含任何其他内容。`;
}

// ============================================================
// LLM 返回解析 —— 兼容多种格式
// ============================================================

export function parseAnalysisResponse(rawText: string): AnalyzedScene[] {
  let text = rawText.trim();

  // 去除 Markdown 代码块包裹
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  text = text.trim();

  // 尝试解析 JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // 尝试提取第一个 JSON 对象/数组
    const objMatch = text.match(/\{[\s\S]*\}/);
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (objMatch) {
      try { parsed = JSON.parse(objMatch[0]); } catch { return []; }
    } else if (arrMatch) {
      try { parsed = JSON.parse(arrMatch[0]); } catch { return []; }
    } else {
      return [];
    }
  }

  // 兼容 { "scenes": [...] } 和直接是数组
  let scenes: unknown[] = [];
  if (Array.isArray(parsed)) {
    scenes = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.scenes)) scenes = obj.scenes;
    else if (Array.isArray(obj.data)) scenes = obj.data;
    else if (Array.isArray(obj.result)) scenes = obj.result;
  }

  return scenes as AnalyzedScene[];
}

// ============================================================
// 场景分析 → 素材需求清单
// ============================================================

export function buildAssetRequirements(scenes: AnalyzedScene[]): SceneAnalysisResult {
  // --- 汇总统计 ---
  const charMap = new Map<string, { role: string; appearance: string; sprites: Set<string> }>();
  const bgMap = new Map<string, { description: string; scenes: string[] }>();
  const cgList: { cgId: string; sceneTitle: string; description: string }[] = [];
  const bgmCounter = new Map<string, number>();
  const sfxCounter = new Map<string, number>();
  const choiceScenes: { sceneId: string; sceneTitle: string; choices: { id: string; text: string }[] }[] = [];
  let totalLines = 0;
  let totalDialogues = 0;

  for (const scene of scenes) {
    // 角色汇总
    for (const char of scene.characters_in_scene ?? []) {
      const existing = charMap.get(char.name);
      if (existing) {
        // 追加新表情
        for (const s of char.sprites_needed ?? []) existing.sprites.add(s);
      } else {
        charMap.set(char.name, {
          role: char.role ?? '未知',
          appearance: char.appearance ?? `${char.name}, 无外观描述`,
          sprites: new Set(char.sprites_needed ?? ['default']),
        });
      }
    }

    // 背景汇总
    const loc = scene.location ?? '未知地点';
    if (bgMap.has(loc)) {
      bgMap.get(loc)!.scenes.push(scene.scene_title ?? scene.scene_id);
    } else {
      bgMap.set(loc, {
        description: scene.bg_description ?? '',
        scenes: [scene.scene_title ?? scene.scene_id],
      });
    }

    // CG 汇总
    for (const cg of scene.cg_suggestions ?? []) {
      cgList.push({
        cgId: cg.cg_id ?? `cg_${cgList.length + 1}`,
        sceneTitle: scene.scene_title ?? scene.scene_id,
        description: cg.description ?? '',
      });
    }

    // BGM 统计
    const mood = scene.bgm_mood;
    if (mood) bgmCounter.set(mood, (bgmCounter.get(mood) ?? 0) + 1);

    // SFX 统计
    for (const sfx of scene.sfx ?? []) {
      sfxCounter.set(sfx, (sfxCounter.get(sfx) ?? 0) + 1);
    }

    // 选项
    if (scene.choices && scene.choices.length > 0) {
      choiceScenes.push({
        sceneId: scene.scene_id,
        sceneTitle: scene.scene_title ?? scene.scene_id,
        choices: scene.choices.map((c) => ({ id: c.choice_id, text: c.text })),
      });
    }

    // 台词统计
    for (const line of scene.lines ?? []) {
      totalLines++;
      if (line.type === 'dialogue') totalDialogues++;
    }
  }

  // --- 角色立绘需求 ---
  const defaultStyle = STYLE_TEMPLATES.anime_default!;
  const characters: CharacterAssetRequirement[] = [];
  for (const [name, data] of charMap) {
    const expressions = [...data.sprites];
    const sprites: SpritePromptCard[] = expressions.map((exprKey) => {
      const expr =
        EXPRESSION_PROMPTS.find((e) => e.expression === exprKey) ??
        EXPRESSION_PROMPTS.find((e) => e.label.includes(exprKey)) ??
        EXPRESSION_PROMPTS[0]!;
      return {
        expression: expr.expression,
        emotion: expr.emotion,
        promptSuffix: expr.promptSuffix,
        positivePrompt: [
          defaultStyle.basePrompt,
          `1girl, solo, character design sheet, ${data.appearance}`,
          expr.emotion,
          expr.promptSuffix,
        ].join(', '),
        negativePrompt: defaultStyle.negativePrompt,
        filenameTemplate: `${safeName(name)}_${expr.expression}.png`,
        bestUse: expr.bestUse,
      };
    });
    characters.push({ name, role: data.role, appearance: data.appearance, sprites });
  }

  // --- 背景需求 ---
  const backgrounds: BackgroundAssetRequirement[] = [];
  for (const [location, data] of bgMap) {
    backgrounds.push({
      location,
      bgDescription: data.description,
      positivePrompt: `${defaultStyle.basePrompt}, ${data.description || location}, no characters, detailed environment, cinematic lighting, visual novel background`,
      negativePrompt: defaultStyle.negativePrompt + ', people, character, human, face, signature, watermark, text',
      filenameTemplate: `bg_${safeName(location)}.png`,
      usedInScenes: data.scenes,
    });
  }

  // --- CG 需求 ---
  const cgs: CGAssetRequirement[] = cgList.map((cg) => ({
    cgId: cg.cgId,
    sceneTitle: cg.sceneTitle,
    description: cg.description,
    positivePrompt: `${defaultStyle.basePrompt}, ${cg.description}, visual novel event CG, dramatic composition, cinematic lighting, highly detailed`,
    negativePrompt: defaultStyle.negativePrompt,
    filenameTemplate: `${safeName(cg.cgId)}.png`,
  }));

  // --- BGM 需求 ---
  const bgm: BGMAssetRequirement[] = [];
  for (const [mood, count] of bgmCounter) {
    const match = BGM_MOODS.find((b) => b.mood === mood);
    bgm.push({
      mood,
      label: match?.label ?? mood,
      aiPrompt: match?.prompt ?? `visual novel ${mood} background music`,
      sunoGenre: match?.sunoGenre ?? 'visual novel bgm',
      filenameTemplate: `bgm_${safeName(mood)}.ogg`,
      sceneCount: count,
      bestFor: match?.bestFor ?? '',
    });
  }

  // --- SFX 需求 ---
  const sfx: SFXAssetRequirement[] = [];
  for (const [name, count] of sfxCounter) {
    sfx.push({ sfx: name, sceneCount: count });
  }

  // --- 选项 ---
  const choices: ChoiceRequirement[] = choiceScenes;

  return {
    meta: {
      totalScenes: scenes.length,
      totalLines,
      totalDialogues,
      characterCount: characters.length,
      bgCount: backgrounds.length,
      cgCount: cgs.length,
      bgmCount: bgm.length,
      sfxCount: sfx.length,
      choiceSceneCount: choices.length,
    },
    characters,
    backgrounds,
    cgs,
    bgm,
    sfx,
    choices,
    rawScenes: scenes,
  };
}

// ============================================================
// 工具函数
// ============================================================

function safeName(input: string): string {
  return input
    .replace(/[\\/*?:"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/\.{2,}/g, '_')
    .slice(0, 64);
}
