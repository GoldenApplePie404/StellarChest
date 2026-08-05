// 星灵 AI 提示词模板库
// 移植自 Galgame-Studio 的 prompt_generator.py + templates.py
// —— 角色表情 / 画风预设 / BGM 氛围 / 工具推荐 / 项目模板

// ============================================================
// ① 画风风格模板（5 种）
// ============================================================

export interface StyleTemplate {
  name: string;
  basePrompt: string;
  negativePrompt: string;
  bestFor: string;
}

export const STYLE_TEMPLATES: Record<string, StyleTemplate> = {
  anime_default: {
    name: '日系动漫标准',
    bestFor: '通用视觉小说、校园恋爱、日常故事',
    basePrompt:
      'masterpiece, best quality, anime style, highly detailed, soft lighting, clean linework, vibrant colors, 2D illustration',
    negativePrompt:
      'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
  },
  anime_realistic: {
    name: '日系写实',
    bestFor: '成人恋爱、都市题材、半写实风格',
    basePrompt:
      'masterpiece, best quality, anime style, semi-realistic, detailed eyes, cinematic lighting, photorealistic render, 8k',
    negativePrompt:
      'lowres, bad anatomy, bad hands, text, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark',
  },
  manga_style: {
    name: '黑白漫画',
    bestFor: '漫画风视觉小说、黑白过场',
    basePrompt:
      'masterpiece, best quality, manga style, black and white, hatching, screentone, pen and ink, comic art',
    negativePrompt:
      'color, lowres, bad anatomy, bad hands, text, cropped, worst quality, signature, watermark',
  },
  chinese_ink: {
    name: '水墨古风',
    bestFor: '古风仙侠、国风视觉小说',
    basePrompt:
      'masterpiece, best quality, Chinese ink painting style, traditional Chinese art, ink wash, watercolor, elegant, poetic atmosphere',
    negativePrompt:
      'lowres, bad anatomy, 3D, photorealistic, western style, signature, watermark, text',
  },
  light_novel: {
    name: '轻小说插画',
    bestFor: '异世界奇幻、冒险、轻小说风格',
    basePrompt:
      'masterpiece, best quality, light novel illustration style, soft colors, ethereal, detailed background, beautiful lighting, character focus, anime art, visual novel cg',
    negativePrompt:
      'lowres, bad anatomy, bad hands, text, error, missing fingers, cropped, worst quality, low quality, jpeg artifacts, signature, watermark',
  },
};

// ============================================================
// ② 角色表情映射（13 种）
// ============================================================

export interface ExpressionPrompt {
  expression: string;
  label: string;
  emotion: string;
  /** 完整 positive prompt（需配合画风 + 角色外观拼接） */
  promptSuffix: string;
  bestUse: string;
}

export const EXPRESSION_PROMPTS: ExpressionPrompt[] = [
  {
    expression: 'default',
    label: '默认/中立',
    emotion: 'neutral expression, natural standing pose, looking at viewer',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, character turnaround, sprite sheet style, uniform lighting, front facing, simple background',
    bestUse: '第一张立绘、通用站位',
  },
  {
    expression: 'happy',
    label: '开心',
    emotion: 'happy expression, smiling, bright eyes, cheerful',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '日常对话、友好场景',
  },
  {
    expression: 'sad',
    label: '悲伤',
    emotion: 'sad expression, slightly crying or sorrowful, drooping eyebrows',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '催泪场景、角色内心独白',
  },
  {
    expression: 'angry',
    label: '生气',
    emotion: 'angry expression, furrowed brows, clenched teeth or pouting',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '冲突、争吵、对峙',
  },
  {
    expression: 'shy',
    label: '害羞',
    emotion: 'shy expression, blushing cheeks, looking away, embarrassed, flustered',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '告白、暧昧、恋爱场景',
  },
  {
    expression: 'surprised',
    label: '惊讶',
    emotion: 'surprised expression, wide eyes, slightly open mouth',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '剧情转折、意外发现',
  },
  {
    expression: 'serious',
    label: '认真/坚定',
    emotion: 'serious expression, determined look, furrowed brows',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '重要宣言、决断时刻',
  },
  {
    expression: 'flustered',
    label: '慌/慌张',
    emotion: 'flustered expression, panicked, blushing heavily, sweating',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '被抓包、尴尬、喜剧场景',
  },
  {
    expression: 'gentle',
    label: '温柔微笑',
    emotion: 'gentle smile, kind eyes, warm expression',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '温馨日常、安慰场景',
  },
  {
    expression: 'crying',
    label: '哭泣',
    emotion: 'crying expression, tears streaming, emotional',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '高情绪场景、悲剧',
  },
  {
    expression: 'evil',
    label: '邪恶笑',
    emotion: 'evil smirk, sinister eyes, dark expression',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '反派登场、黑化场景',
  },
  {
    expression: 'pout',
    label: '赌气/嘟嘴',
    emotion: 'pouting expression, slightly annoyed, cute angry',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '喜剧、傲娇场景',
  },
  {
    expression: 'thinking',
    label: '思考',
    emotion: 'thoughtful expression, hand on chin, looking upward',
    promptSuffix: 'full body portrait, standing pose, solid white background, visual novel sprite, uniform lighting',
    bestUse: '推理、解密、疑虑场景',
  },
];

/** 根据角色名+外观+表情拼装完整文生图 prompt */
export function buildSpritePrompt(
  charName: string,
  appearance: string,
  expr: ExpressionPrompt,
  style?: StyleTemplate,
): string {
  const s: StyleTemplate = style || STYLE_TEMPLATES.anime_default as StyleTemplate;
  return [
    s.basePrompt,
    `1girl, solo, character design sheet, ${appearance}`,
    expr.emotion,
    expr.promptSuffix,
  ].join(', ');
}

/** 根据画风+表情拼装角色立绘 negative prompt */
export function buildSpriteNegative(style?: StyleTemplate): string {
  const s: StyleTemplate = style || STYLE_TEMPLATES.anime_default as StyleTemplate;
  return s.negativePrompt;
}

// ============================================================
// ③ BGM 氛围映射（13 种）
// ============================================================

export interface BGMMood {
  mood: string;
  label: string;
  prompt: string;
  sunoGenre: string;
  bestFor: string;
}

export const BGM_MOODS: BGMMood[] = [
  {
    mood: 'calm_piano',
    label: '宁静钢琴',
    prompt: 'calm solo piano, gentle and sentimental, minor key, slow tempo, emotional ballad, Japanese visual novel background music, peaceful',
    sunoGenre: 'calm piano ballad',
    bestFor: '室内对话、校园日常、安静独白',
  },
  {
    mood: 'tense_strings',
    label: '紧张弦乐',
    prompt: 'tense string quartet, suspenseful, building tension, dramatic, thriller soundtrack, minimal, repetitive motif',
    sunoGenre: 'suspense film score',
    bestFor: '悬疑场景、危机逼近',
  },
  {
    mood: 'romantic',
    label: '浪漫温馨',
    prompt: 'romantic piano and strings, warm, gentle, love theme, sweet melody, visual novel romance bgm, tender and emotional',
    sunoGenre: 'romantic orchestral pop',
    bestFor: '告白、约会、甜蜜回忆',
  },
  {
    mood: 'sad',
    label: '悲伤哀婉',
    prompt: 'sad piano or violin, melancholic, emotional, rainy day mood, tearful, slow, minor key progression, nostalgic',
    sunoGenre: 'sad emotional piano',
    bestFor: '离别、回忆、泪点场景',
  },
  {
    mood: 'upbeat',
    label: '欢快日常',
    prompt: 'upbeat pop instrumental, happy, cheerful, energetic, bright piano and light drums, slice of life bgm, positive vibes',
    sunoGenre: 'upbeat jpop instrumental',
    bestFor: '校园日常、欢乐场景',
  },
  {
    mood: 'mysterious',
    label: '神秘悬疑',
    prompt: 'mysterious ambient, soft pads, subtle tension, eerie but not horror, mysterious discovery, visual novel mystery bgm',
    sunoGenre: 'ambient mystery',
    bestFor: '推理、调查、未解之谜',
  },
  {
    mood: 'warm_library',
    label: '温暖安静',
    prompt: 'warm acoustic guitar, cozy atmosphere, library ambience, gentle fingerpicking, soft room tone, nostalgic study music',
    sunoGenre: 'acoustic lofi',
    bestFor: '自习、图书馆、安静谈心',
  },
  {
    mood: 'rainy_street',
    label: '雨夜都市',
    prompt: 'rainy day jazz, soft piano, gentle rain ambience, melancholic city, romantic noir, slow tempo',
    sunoGenre: 'rainy jazz noir',
    bestFor: '城市夜景、回忆闪回',
  },
  {
    mood: 'tense_room',
    label: '压抑紧张',
    prompt: 'tense minimal ambient, close room atmosphere, uncomfortable silence, subtle drone, psychological tension',
    sunoGenre: 'dark ambient',
    bestFor: '密室、审问、心理战',
  },
  {
    mood: 'action',
    label: '战斗激烈',
    prompt: 'action electronic, driving beat, fast tempo, intense, battle theme, synth and drums, energetic',
    sunoGenre: 'electronic action',
    bestFor: '战斗、追逐、高潮',
  },
  {
    mood: 'nostalgic',
    label: '回忆怀旧',
    prompt: 'nostalgic music box or soft piano, memories, childhood, bittersweet, slow waltz, warm but sad',
    sunoGenre: 'nostalgic music box',
    bestFor: '闪回、童年回忆、和好场景',
  },
  {
    mood: 'hopeful',
    label: '希望光明',
    prompt: 'hopeful orchestral, rising melody, new beginning, inspirational, gentle build, warm strings, bright future',
    sunoGenre: 'inspirational orchestral',
    bestFor: '结局、希望、新开始',
  },
  {
    mood: 'comedy',
    label: '搞笑轻松',
    prompt: 'comedic light music, playful pizzicato strings, quirky, funny, cartoonish, lighthearted, silly situations',
    sunoGenre: 'comedy cartoon',
    bestFor: '喜剧场景、搞笑段子',
  },
];

// ============================================================
// ④ AI 工具推荐矩阵
// ============================================================

export interface ToolRecItem {
  name: string;
  price: string;
  bestFor: string;
  pros: string;
  cons?: string;
  url?: string;
  guide?: string;
}

export interface ToolCategory {
  title: string;
  paid: ToolRecItem[];
  free: ToolRecItem[];
  guide: string;
}

export const TOOL_RECOMMENDATIONS: Record<string, ToolCategory> = {
  image_generation: {
    title: '🎨 AI绘图工具推荐',
    guide: '推荐组合: 日常图用 NovelAI（快且质量高），批量用 SD 本地（免费无限），CG 大图用 niji。⚠️ 立绘生成后务必用背景去除工具处理!',
    paid: [
      {
        name: 'NovelAI v4',
        price: '$10-25/月',
        bestFor: '二次元/动漫角色和场景，专为视觉小说优化',
        pros: '出图质量高、NSFW 友好、无需复杂 prompt',
        url: 'novelai.net',
      },
      {
        name: 'niji-journey',
        price: '$10-60/月',
        bestFor: '高质量动漫插画，电影级构图',
        pros: '画面细腻、角色设计一流',
        cons: 'NSFW 限制严格',
        url: 'midjourney.com',
      },
      {
        name: 'DALL-E 3 (ChatGPT Plus)',
        price: '$20/月',
        bestFor: '快速出概念图，prompt 理解力强',
        pros: '操作简单，中文 prompt 友好',
        cons: 'NSFW 完全屏蔽',
        url: 'chat.openai.com',
      },
    ],
    free: [
      {
        name: 'Stable Diffusion (本地部署)',
        price: '完全免费',
        bestFor: '批量出图、无内容审查、可定制模型',
        pros: '完全免费、无限生成、NSFW 可用、模型库丰富',
        cons: '需要显卡（建议 6GB+ VRAM）、配置稍复杂',
        guide: '推荐使用 Stability Matrix 一键安装包，加载动漫模型如 Anything-v5、Counterfeit',
      },
      {
        name: 'ComfyUI (本地)',
        price: '完全免费',
        bestFor: '节点式工作流、批量处理、高级控制',
        pros: '工作流可复用、适合量产、社区模板丰富',
        guide: '适合批量生成立绘差分，搭好工作流后拖入 prompt 即可批量出图',
      },
      {
        name: '通义万相 (阿里)',
        price: '免费额度',
        bestFor: '中文用户、无需翻墙、快速出图',
        pros: '中文 prompt 支持好、免费额度够用',
        cons: '风格控制较弱、商业用途需确认',
        url: 'tongyi.aliyun.com/wanxiang',
      },
      {
        name: 'CivitAI (在线生图)',
        price: '免费（部分需付费）',
        bestFor: '社区共享模型，浏览器在线跑 SD',
        pros: '模型多、可在线预览效果',
        url: 'civitai.com',
      },
    ],
  },
  bgm_generation: {
    title: '🎵 BGM 音乐工具推荐',
    guide: '推荐: 先用 Suno.ai 免费版生成 demo，确认方向后用 Pro 版本正式生成。需要特定氛围的 BGM 可去 DOVA-SYNDROME 按标签搜索。',
    paid: [
      {
        name: 'Suno.ai Pro',
        price: '$10-30/月',
        bestFor: '批量生成 BGM、音质好、支持歌词',
        pros: '音质优秀、风格多样、商用授权含 Pro',
        url: 'suno.ai',
      },
      {
        name: 'Udio Pro',
        price: '$10/月',
        bestFor: '高品质 BGM、声音更自然',
        pros: '声音更自然、操作友好',
        url: 'udio.com',
      },
    ],
    free: [
      {
        name: 'Suno.ai (免费版)',
        price: '免费（每日额度）',
        bestFor: '快速生成、试试效果',
        pros: '操作极简、生成快',
        cons: '商用需 Pro、每日限制次数',
      },
      {
        name: 'DOVA-SYNDROME',
        price: '完全免费',
        bestFor: '日系 BGM、品类齐全',
        pros: '数千首免费曲目、日本创作者、商用可',
        url: 'dova-s.jp',
      },
      {
        name: 'Freesound / Pixabay Music',
        price: '完全免费',
        bestFor: '音效和氛围音乐',
        pros: '社区驱动、品类极广',
      },
    ],
  },
  voice_generation: {
    title: '🎙️ 配音/语音工具推荐',
    guide: '推荐: GPT-SoVITS 是当前最好的免费方案。准备样本时注意：安静环境录制、语速自然、包含不同情绪。样本越长效果越好。',
    paid: [
      {
        name: 'ElevenLabs',
        price: '$5-99/月',
        bestFor: '高品质多语言 TTS、声线克隆',
        pros: '音质顶级、30+ 语言、API 可用',
        url: 'elevenlabs.io',
      },
      {
        name: 'Fish Audio',
        price: '按量付费',
        bestFor: '中文配音、国内可用',
        pros: '中文效果好、API 价格低',
        url: 'fish.audio',
      },
    ],
    free: [
      {
        name: 'GPT-SoVITS (本地)',
        price: '完全免费',
        bestFor: '声线克隆、完全可控',
        pros: '克隆效果极好、本地运行无审查、中文日文都行',
        cons: '需要显卡、需准备样本音频、配置稍复杂',
        guide: '推荐方案! 用 3-5 分钟干净人声样本即可训练。GitHub: RVC-Boss/GPT-SoVITS',
      },
      {
        name: 'RVC (声音转换)',
        price: '完全免费',
        bestFor: '声线转换/翻唱风格语音合成',
        pros: '声线转换效果出色、与 GPT-SoVITS 配合良好',
        guide: '与 GPT-SoVITS 配合使用效果好。先录自己的声音念台词，再用 RVC 转成目标声线。',
      },
    ],
  },
};

// ============================================================
// ⑤ 项目模板（6 套）
// ============================================================

export interface ProjectTemplate {
  id: string;
  nameCn: string;
  description: string;
  defaultStyle: keyof typeof STYLE_TEMPLATES;
  bgLocations: string[];
  characterArchetypes: Array<{ role: string; desc: string }>;
  sceneTypes: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    bg: string;
    text: string;
    accent: string;
  };
  // BGM 氛围预设
  bgmPresets?: Record<string, string[]>;
  // UI prompt 参考
  uiPrompts?: {
    titleBg: string;
    textbox: string;
    choiceButtons: string;
  };
  features?: string[];
}

export const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  campus: {
    id: 'campus',
    nameCn: '校园恋爱',
    description: '经典的校园恋爱故事模板，教室、天台、图书馆、放学路',
    defaultStyle: 'anime_default',
    bgLocations: [
      '教室', '走廊', '天台', '图书馆', '校门口', '操场', '放学路',
    ],
    characterArchetypes: [
      { role: '主角', desc: '普通高中生，黑发，白衬衫校服' },
      { role: '女主', desc: '同班同学或学妹，校服或便服' },
      { role: '闺蜜/基友', desc: '好友角色，活泼或冷静' },
    ],
    sceneTypes: [
      '初遇', '教室', '社团活动', '天台谈心', '图书馆自习', '学园祭', '告白', '毕业',
    ],
    colorScheme: {
      primary: '#FF6B8A',
      secondary: '#87CEEB',
      bg: '#FFF8F0',
      text: '#4A3728',
      accent: '#FFB6C1',
    },
    bgmPresets: {
      calm_piano: ['soft piano school bgm, warm afternoon classroom'],
      upbeat: ['cheerful school life, bright morning, friends chatting'],
      romantic: ['sweet romantic piano, sunset rooftop confession'],
      sad: ['melancholic piano after school, empty classroom'],
    },
    uiPrompts: {
      titleBg: 'Japanese high school background, cherry blossoms in spring, school building in distance, soft sunlight, nostalgic atmosphere, wide shot, beautiful sky',
      textbox: 'visual novel textbox, semi-transparent gradient, warm pink border, soft rounded corners, clean UI',
      choiceButtons: 'choice button, pastel pink gradient, soft glow, rounded rectangle, game UI',
    },
  },
  ancient_chinese: {
    id: 'ancient_chinese',
    nameCn: '古风仙侠',
    description: '仙侠/宫廷/江湖题材，山水墨韵、竹林庭院、月下剑影',
    defaultStyle: 'chinese_ink',
    bgLocations: [
      '竹林', '月下庭院', '山巅道观', '江南水乡', '宫殿大殿', '桃花林', '悬崖边', '客栈',
    ],
    characterArchetypes: [
      { role: '主角', desc: '年轻剑客/书生，白衣或青衫，束发' },
      { role: '女主', desc: '仙子/闺秀，飘逸长裙，发簪步摇' },
      { role: '前辈/师父', desc: '德高望重的长者，仙风道骨' },
    ],
    sceneTypes: [
      '初遇', '练剑', '茶叙', '观月', '战斗', '告白', '离别', '重聚',
    ],
    colorScheme: {
      primary: '#8B4513',
      secondary: '#2F4F4F',
      bg: '#F5F0E8',
      text: '#3C2415',
      accent: '#C41E3A',
    },
    bgmPresets: {
      calm_piano: ['traditional guqin solo, peaceful bamboo forest, ancient zen'],
      tense_strings: ['erhu tension, battle preparation, dramatic Chinese orchestra'],
      romantic: ['soft pipa and flute duet, moonlit garden, ancient love theme'],
    },
    uiPrompts: {
      titleBg: 'misty mountains, ancient Chinese landscape, pine trees, waterfall in distance, poetic atmosphere, elegant, wide shot',
      textbox: 'ancient scroll texture border, semi-transparent parchment, traditional Chinese pattern decoration, elegant',
      choiceButtons: 'ancient Chinese seal stamp design, red ink border, traditional calligraphy vibe',
    },
  },
  sci_fi: {
    id: 'sci_fi',
    nameCn: '科幻未来',
    description: '赛博朋克/太空歌剧/近未来题材，霓虹都市、飞船舰桥、虚拟空间',
    defaultStyle: 'anime_realistic',
    bgLocations: [
      '霓虹街道', '太空轨道', '实验室', '虚拟空间', '废墟都市', '太空站观景台', '机甲格纳库', '未来教室',
    ],
    characterArchetypes: [
      { role: '主角', desc: '年轻机师/黑客，近未来服装，可能有义体' },
      { role: '女主', desc: 'AI/改造人/研究员，科技感服装' },
      { role: '队友/搭档', desc: '战友或 AI 助手' },
    ],
    sceneTypes: [
      '初遇', '黑客房', '天台夜景', '太空漫步', '战斗', '虚拟世界', '逃亡', '最终决战',
    ],
    colorScheme: {
      primary: '#00FFFF',
      secondary: '#FF00FF',
      bg: '#0A0A1A',
      text: '#E0E0FF',
      accent: '#00FF88',
    },
    bgmPresets: {
      calm_piano: ['ambient synth, space station interior, calm'],
      tense_strings: ['cyberpunk tension, dark synth, dystopian electronic'],
      action: ['fast electronic, mecha battle, intense synthwave'],
      upbeat: ['future pop, bright synth, utopian city life'],
    },
    uiPrompts: {
      titleBg: 'futuristic city skyline at night, neon lights, holographic billboards, flying cars, cyberpunk aesthetic, rain on glass, wide cinematic shot',
      textbox: 'holographic interface, semi-transparent blue glass panel, digital circuit border, neon glow, high-tech UI',
      choiceButtons: 'holographic button, cyan neon glow, rounded digital panel, futuristic UI',
    },
  },
  mystery_horror: {
    id: 'mystery_horror',
    nameCn: '悬疑惊悚',
    description: '推理/恐怖/心理惊悚，昏暗洋馆、废弃医院、迷雾小镇',
    defaultStyle: 'anime_default',
    bgLocations: [
      '昏暗洋馆', '废弃医院', '迷雾森林', '老旧图书馆', '地下密室', '雨夜街道',
    ],
    characterArchetypes: [
      { role: '主角', desc: '侦探/调查员，深色风衣或校服' },
      { role: '女主', desc: '神秘少女，可能有特殊能力' },
      { role: '助手/搭档', desc: '可靠的伙伴或亦敌亦友' },
    ],
    sceneTypes: [
      '抵达', '推理', '线索发现', '追逐', '真相', '对峙', '逃亡', '回忆',
    ],
    colorScheme: {
      primary: '#8B0000',
      secondary: '#2F1B41',
      bg: '#0D0D0D',
      text: '#D4C5B2',
      accent: '#FF4444',
    },
    bgmPresets: {
      tense_strings: ['psychological horror strings, creeping dread, minimal'],
      mysterious: ['dark ambient, old mansion atmosphere, subtle tension'],
      sad: ['haunting piano, ghostly melody, tragic backstory'],
    },
    uiPrompts: {
      titleBg: 'old Victorian mansion in moonlight, fog, dead trees, mysterious atmosphere, dark and moody, wide shot',
      textbox: 'dark vintage frame, ornate gothic border, semi-transparent dark panel, aged texture, horror game UI',
      choiceButtons: 'aged paper texture, blood-red accent, vintage button, gothic horror UI',
    },
  },
  fantasy: {
    id: 'fantasy',
    nameCn: '异世界奇幻',
    description: '异世界转生/剑与魔法/冒险公会，中世纪欧洲风',
    defaultStyle: 'light_novel',
    bgLocations: [
      '冒险者公会', '王城街道', '魔法学院', '精灵森林', '地下迷宫', '城堡大厅', '草原旅路',
    ],
    characterArchetypes: [
      { role: '主角', desc: '转生者/冒险者，轻甲或法袍' },
      { role: '女主', desc: '精灵/公主/魔法师，奇幻装束' },
      { role: '队友', desc: '战士/魔法师/盗贼等经典职业' },
    ],
    sceneTypes: [
      '召唤仪式', '公会大厅', '任务委托', '迷宫探索', '营地篝火', '庆典', '决战', '加冕',
    ],
    colorScheme: {
      primary: '#4A90D9',
      secondary: '#D4A017',
      bg: '#1A2A1A',
      text: '#F0E6D0',
      accent: '#FFD700',
    },
    bgmPresets: {
      calm_piano: ['medieval town, peaceful lute, fantasy village'],
      upbeat: ['adventuring music, heroic orchestra, rpg town theme'],
      action: ['epic battle orchestra, sword clash, fantasy combat'],
      romantic: ['magical romance, harp and strings, moonlit castle'],
    },
    uiPrompts: {
      titleBg: 'floating castle in the sky, magical floating islands, dragon flying in distance, epic fantasy landscape, warm sunset, wide shot',
      textbox: 'ornate golden border, medieval manuscript texture, semi-transparent parchment panel, fantasy game UI',
      choiceButtons: 'golden ornate button, magical glow, medieval design, fantasy game UI',
    },
  },
  adult_romance: {
    id: 'adult_romance',
    nameCn: '成人恋爱',
    description: '成人向恋爱故事，含好感度系统、画面特效、CG 画廊等',
    defaultStyle: 'anime_realistic',
    features: ['affection', 'screen_shake', 'cg_gallery', 'h_scene_unlock'],
    bgLocations: [
      '卧房', '咖啡厅', '温泉旅馆', '夜店', '海边', '浴室', '酒店房间', '私人影院',
    ],
    characterArchetypes: [
      { role: '主角', desc: '普通青年/上班族，便服或正装' },
      { role: '女主1', desc: '活泼/傲娇/温柔系，日常+夜间服装' },
      { role: '女主2', desc: '成熟/御姐系，职业装+私服' },
      { role: '女主3', desc: '学妹/妹妹系，可爱风格' },
    ],
    sceneTypes: [
      '初遇', '约会', '告白', '谈心', '接吻', '恋爱场景', '早上', '冲突',
    ],
    colorScheme: {
      primary: '#FF3366',
      secondary: '#993366',
      bg: '#1A0A10',
      text: '#F0D0D8',
      accent: '#FF69B4',
    },
    bgmPresets: {
      calm_piano: ['intimate solo piano, warm bedroom atmosphere, gentle'],
      romantic: ['sensual r&b instrumental, soft saxophone, candlelit mood'],
      upbeat: ['playful pop instrumental, flirty, cheerful date'],
    },
    uiPrompts: {
      titleBg: 'romantic sunset silhouette, couple embracing in distance, soft bokeh lighting, cherry blossom petals, sensual romantic atmosphere, cinematic',
      textbox: 'semi-transparent dark gradient panel with subtle red glow, elegant curved corners, romantic',
      choiceButtons: 'heart-shaped accent button, rose gold gradient, soft glow, romantic adult game UI',
    },
  },
};

// ============================================================
// ⑥ 辅助函数：获取预设系统提示词
// ============================================================

/** 预设系统 prompt（可直接在 AI chat 中设置） */
export const SYSTEM_PROMPT_PRESETS = [
  {
    label: '剧本生成',
    prompt: '你是资深 galgame 脚本作家，擅长用「@指令 + 角色台词 + 舞台指示」的结构产出视觉小说场景。每条台词注明说话人，每条指令独立成行。语法参照星之境的 DSL（@bg 设置背景文件 key、@bgm 设置背景音乐 key、@chapter 定义章节、@label 标记跳转标签、@perform 指示角色定位、@choice 定义分支选项）。',
  },
  {
    label: '角色设定',
    prompt: '你是角色设计师，为视觉小说生成详细角色卡：姓名、年龄、性格偏好、外观（发型/瞳色/服装）、背景故事、台词风格。格式使用 Markdown 表格。共 3-6 个核心角色。',
  },
  {
    label: '背景生成',
    prompt: '你是视觉小说场景画师，根据描述生成背景 prompt。格式：| 地点 | Prompt | 推荐风格 |。推荐使用下面的模板风格，并注明对应 STYLE_TEMPLATES 中的 style key。',
  },
  {
    label: 'BGM 推荐',
    prompt: '你是视觉小说配乐指导。根据场景氛围，推荐合身的 BGM 风格与 Suno.ai prompt。格式：| 场景 | 氛围 | Suno Prompt | 推荐曲风 |。请参考 BGM_MOODS 中的 13 种氛围类型选型。',
  },
  {
    label: '灵感脑暴',
    prompt: '你是创意脑暴伙伴，给出天马行空但可落地的 galgame 企划点子与分支路线。每条 3-4 句话，包含核心要素：前提/主角/转折/选择支。',
  },
];

// ============================================================
// ⑦ 从模板生成快捷提示词
// ============================================================

/** 根据模板生成"角色设案"的完整系统提示词 */
export function buildCharacterDesignPrompt(template?: ProjectTemplate): string {
  const t: ProjectTemplate = template || PROJECT_TEMPLATES.campus as ProjectTemplate;
  const chars = t.characterArchetypes.map((c) => `- ${c.role}: ${c.desc}`).join('\n');
  const scenes = t.sceneTypes.join(' / ');
  return `你是一名角色设计师，为视觉小说故事生成角色设定卡。\n\n当前项目模板：${t.nameCn}（${t.defaultStyle}风格）\n常见场景：${scenes}\n参考角色模板：\n${chars}\n\n请生成详细角色卡，含姓名、年龄、性格、外观、台词风格。格式使用 clean table。`;
}

/** 根据模板生成"背景描述"的完整系统提示词 */
export function buildBgDescriptionPrompt(template?: ProjectTemplate): string {
  const t: ProjectTemplate = template || PROJECT_TEMPLATES.campus as ProjectTemplate;
  const locs = t.bgLocations.map((l) => `- ${l}`).join('\n');
  return `你是一名场景设计，为视觉小说拉取场景的描述和 AI prompt。\n\n项目模板：${t.nameCn}（风格：${t.defaultStyle}）\n可用地点：\n${locs}\n\n请为每个地点输出：格式 [地点名] | prompt 描述词 | 推荐画风 key | 氛围说明 |。`;
}

/** 根据模板生成"BGM 推荐"的完整系统提示词 */
export function buildBgmRecommendationPrompt(template?: ProjectTemplate): string {
  const t: ProjectTemplate = (template as ProjectTemplate) || PROJECT_TEMPLATES.campus;
  const presets = t.bgmPresets
    ? Object.entries(t.bgmPresets)
        .map(([mood, prompts]) => `- ${mood}: ${prompts[0]}`)
        .join('\n')
    : '暂无预置';
  return `你是配乐师，为视觉小说"${t.nameCn}"推荐 BGM。\n\n模板预置：\n${presets}\n\n请输出每个 mood 的推荐 SNUN_official prompt，含关键词、BPM、音色建议。`;
}

// ============================================================
// ⑧ UI 元素 prompt 快捷生成
// ============================================================

export function buildTitleScreenPrompt(styleKey: keyof typeof STYLE_TEMPLATES): string {
  const s: StyleTemplate = STYLE_TEMPLATES[styleKey] as StyleTemplate;
  const t = '标题界面 — 视觉小说标题背景，无人物，文字友好留白';
  return [s.basePrompt, t].join(', ');
}

export function buildTextBoxPrompt(styleKey: keyof typeof STYLE_TEMPLATES): string {
  const s: StyleTemplate = STYLE_TEMPLATES[styleKey] as StyleTemplate;
  const t = '半透明暗色面板，干净边缘，底部对话框，适合文字阅读，简洁 UI 切 ';
  return [s.basePrompt, t].join(', ');
}