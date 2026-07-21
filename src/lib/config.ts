// 全局配置常量
// 数据目录路径、文件大小限制、默认值等

import path from 'path';

/** 项目根目录（运行时基准路径） */
const PROJECT_ROOT = process.cwd();

/** 数据存储根目录 */
export const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, 'data');

/** SQLite数据库文件路径 */
export const DB_PATH = path.join(DATA_DIR, 'galgame_toolkit.db');

/** 上传文件存储根目录 */
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

/** 图片上传目录 */
export const IMAGE_UPLOAD_DIR = path.join(UPLOAD_DIR, 'images');

/** 音频上传目录 */
export const AUDIO_UPLOAD_DIR = path.join(UPLOAD_DIR, 'audio');

/** 项目文件上传目录 */
export const PROJECT_UPLOAD_DIR = path.join(UPLOAD_DIR, 'projects');

/** 导出文件临时目录 */
export const EXPORT_DIR = path.join(DATA_DIR, 'exports');

/** 最大文件上传大小（默认50MB） */
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10);

/** 最大单文件大小（字节） */
export const MAX_SINGLE_FILE_SIZE = MAX_FILE_SIZE;

/** 允许的图片文件扩展名 */
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];

/** 允许的音频文件扩展名 */
export const ALLOWED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg', '.flac', '.aac'];

/** 允许的脚本文件扩展名 */
export const ALLOWED_SCRIPT_EXTENSIONS = ['.txt'];

/** 默认头像URL */
export const DEFAULT_AVATAR_URL = '/default-assets/default_avatar.svg';

/** 默认封面URL */
export const DEFAULT_COVER_URL = '/default-assets/default_cover.svg';

/** 默认背景图URL */
export const DEFAULT_BG_URL = '/default-assets/bg_default.svg';

/** 应用端口 */
export const APP_PORT = parseInt(process.env.PORT || '3000', 10);

/** JWT过期时间 */
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** JWT密钥 */
export const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-for-development';

/** 论坛帖子分类映射（中文标签） */
export const POST_CATEGORY_LABELS: Record<string, string> = {
  creation_exchange: '创作交流',
  asset_share: '素材分享',
  tech_help: '技术求助',
  work_show: '作品展示',
};

/** 素材分类映射（中文标签） */
export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  ui_component: 'UI组件',
  texture: '贴图',
  sound_effect: '音效',
  character_sprite: '立绘',
  background: '背景图',
  other: '其他',
};

/** 分页默认值 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
