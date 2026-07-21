// Zod验证schema集合
// 所有API入参验证使用Zod schema，遵循架构文档7.6节约定

import { z } from 'zod';

/** 注册请求验证schema */
export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6个字符').max(128, '密码最长128个字符'),
  nickname: z.string().min(1, '昵称不能为空').max(50, '昵称最长50个字符').optional(),
});

/** 登录请求验证schema */
export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

/** 创建项目请求验证schema */
export const createProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空').max(100, '项目名称最长100个字符'),
  description: z.string().max(500, '描述最长500个字符').optional(),
  coverUrl: z.string().url('封面URL格式不正确').optional(),
});

/** 更新项目请求验证schema */
export const updateProjectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空').max(100, '项目名称最长100个字符').optional(),
  description: z.string().max(500, '描述最长500个字符').optional(),
  coverUrl: z.string().url('封面URL格式不正确').optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

/** 上传素材请求验证schema */
export const uploadAssetSchema = z.object({
  name: z.string().min(1, '素材名称不能为空').max(100, '素材名称最长100个字符'),
  description: z.string().max(500, '描述最长500个字符').optional(),
  category: z.enum(['ui_component', 'texture', 'sound_effect', 'character_sprite', 'background', 'other']),
  licenseType: z.enum(['CC0', 'CC-BY', 'custom']).optional(),
  tags: z.array(z.string().max(30, '标签最长30个字符')).max(10, '最多10个标签').optional(),
});

/** 创建帖子请求验证schema */
export const createPostSchema = z.object({
  category: z.enum(['creation_exchange', 'asset_share', 'tech_help', 'work_show']),
  title: z.string().min(1, '标题不能为空').max(200, '标题最长200个字符'),
  content: z.string().min(1, '内容不能为空').max(10000, '内容最长10000个字符'),
});

/** 创建评论请求验证schema */
export const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(2000, '评论内容最长2000个字符'),
});

/** 保存AI配置请求验证schema（旧版单条，按 chat 模态落库） */
export const saveAIConfigSchema = z.object({
  provider: z.enum(['openai_compatible', 'claude', 'gemini']),
  apiEndpoint: z.string().url('API端点格式不正确'),
  apiKey: z.string().min(1, 'API密钥不能为空'),
  model: z.string().min(1, '模型名称不能为空'),
});

/** 保存单模态AI配置请求验证schema（P0：五模态独立配置） */
export const saveAIModalityConfigSchema = z.object({
  provider: z.string().min(1, 'Provider 不能为空'),
  apiEndpoint: z.string().min(1, 'API端点不能为空'),
  apiKey: z.string().optional().default(''),
  model: z.string().min(1, '模型名称不能为空'),
  enabled: z.boolean().optional().default(true),
  reasoningEffort: z.enum(['none', 'low', 'medium', 'high']).optional().default('none'),
});

/** AI脚本续写请求验证schema */
export const aiScriptContinueSchema = z.object({
  snippet: z.string().min(1, '原始脚本不能为空').max(10000, '脚本片段最长10000个字符'),
  instruction: z.string().min(1, '续写指令不能为空').max(500, '指令最长500个字符'),
});

/** 分页参数验证schema */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** 图片裁剪参数验证schema */
export const imageCropSchema = z.object({
  x: z.coerce.number().min(0, '裁剪起点X不能为负'),
  y: z.coerce.number().min(0, '裁剪起点Y不能为负'),
  width: z.coerce.number().min(1, '裁剪宽度至少1'),
  height: z.coerce.number().min(1, '裁剪高度至少1'),
});

/** 图片格式转换参数验证schema */
export const imageConvertSchema = z.object({
  format: z.enum(['png', 'jpg', 'webp'], { message: '目标格式仅支持png/jpg/webp' }),
  quality: z.coerce.number().min(1).max(100).optional(),
});

/** 音频格式转换参数验证schema */
export const audioConvertSchema = z.object({
  format: z.enum(['wav', 'mp3', 'ogg'], { message: '目标格式仅支持wav/mp3/ogg' }),
});

/** 音频裁剪参数验证schema */
export const audioTrimSchema = z.object({
  startTime: z.coerce.number().min(0, '起始时间不能为负'),
  endTime: z.coerce.number().min(0, '结束时间不能为负'),
});

/** 音量调节参数验证schema */
export const volumeAdjustSchema = z.object({
  volume: z.coerce.number().min(0, '音量不能为负').max(5, '音量倍数最大5倍'),
});

/** 通用ID参数验证schema */
export const idSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
});

// ============================================================
// 星工坊 (Stellar Workshop) — 工具 API Zod 验证 Schema
// ============================================================

/** 图片滤镜参数验证schema */
export const imageFilterSchema = z.object({
  fileKey: z.string().min(1, 'fileKey 不能为空'),
  brightness: z.number().min(-100).max(100).default(0),
  contrast: z.number().min(-100).max(100).default(0),
  saturation: z.number().min(-100).max(100).default(0),
  hue: z.number().min(-180).max(180).default(0),
  blur: z.number().min(0).max(100).default(0),
  preset: z
    .enum(['none', 'warm', 'cool', 'vintage', 'grayscale', 'sepia', 'sharpen'])
    .default('none'),
});

/** 图片旋转/翻转参数验证schema */
export const imageRotateSchema = z.object({
  fileKey: z.string().min(1, 'fileKey 不能为空'),
  type: z.enum(['90', '180', '270', 'flipH', 'flipV']),
});

/** 图片水印参数验证schema */
export const imageWatermarkSchema = z.object({
  fileKey: z.string().min(1, 'fileKey 不能为空'),
  text: z.string().min(1, '水印文字不能为空').max(100, '水印文字最长100个字符'),
  fontSize: z.number().min(8).max(200).default(32),
  color: z.string().min(1).default('#FFFFFF'),
  position: z
    .enum(['topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center'])
    .default('bottomRight'),
  opacity: z.number().min(0).max(1).default(0.5),
});

/** 画布导出参数验证schema */
export const canvasExportSchema = z.object({
  imageData: z.string().min(1, 'imageData 不能为空'),
  format: z.enum(['png', 'jpg', 'jpeg', 'webp']).default('png'),
  quality: z.number().min(1).max(100).optional(),
});

/** AI 图片操作参数验证schema */
export const aiImageSchema = z.object({
  operation: z.enum(['remove-bg', 'inpaint', 'super-resolution', 'style-transfer']),
  fileKey: z.string().min(1, 'fileKey 不能为空'),
  maskFileKey: z.string().optional(),
  scale: z.number().refine((v) => v === 2 || v === 4, { message: 'scale 仅支持 2 或 4' }).optional(),
  style: z.string().max(100).optional(),
});

/** 音频效果参数验证schema */
export const audioEffectsSchema = z.object({
  fileKey: z.string().min(1, 'fileKey 不能为空'),
  pitch: z.number().min(-12).max(12).default(0),
  speed: z.number().min(0.25).max(4.0).default(1.0),
  volume: z.number().min(-60).max(24).default(0),
  fadeIn: z.number().min(0).max(30).default(0),
  fadeOut: z.number().min(0).max(30).default(0),
  preservePitch: z.boolean().default(true),
});

/** 音乐工作室导出参数验证schema */
export const audioStudioSchema = z.object({
  fileKey: z.string().min(1, 'fileKey 不能为空'),
  bpm: z.number().min(20).max(300).default(120),
  format: z.enum(['wav', 'mp3']).default('wav'),
  tracks: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      instrument: z.enum(['piano', 'guitar', 'bass', 'drums', 'strings', 'synth']),
      muted: z.boolean().default(false),
      solo: z.boolean().default(false),
      notes: z.array(
        z.object({
          time: z.number().min(0),
          duration: z.number().min(0.01),
          midi: z.number().int().min(0).max(127),
          velocity: z.number().int().min(0).max(127).default(100),
        }),
      ),
    }),
  ).min(1, '至少需要一个轨道'),
});

/** AI 音频操作参数验证schema */
export const aiAudioSchema = z.object({
  operation: z.enum(['denoise', 'music-gen', 'sfx-gen']),
  fileKey: z.string().optional(),
  style: z.string().max(100).optional(),
  mood: z.string().max(100).optional(),
  duration: z.number().min(1).max(600).optional(),
  tempo: z.number().min(20).max(300).optional(),
  description: z.string().max(500).optional(),
});

/** 文件下载参数验证schema */
export const downloadQuerySchema = z.object({
  key: z.string().min(1, 'fileKey 不能为空'),
});
