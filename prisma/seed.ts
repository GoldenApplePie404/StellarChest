// 星之匣 StellarChest 种子数据
// 仅初始化必要用户和AI配置，不创建示例项目/素材/帖子
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// 五模态默认配置（与 src/lib/ai-presets.ts 保持一致；Key 为空，由用户填写）
const DEFAULT_MODALITY_CONFIGS = [
  { modality: 'chat',  provider: 'deepseek',        apiEndpoint: 'https://api.deepseek.com/v1',                  model: 'deepseek-chat' },
  { modality: 'image', provider: 'seedream',        apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',   model: 'seedream-3.0' },
  { modality: 'music', provider: 'suno',            apiEndpoint: 'https://api.suno.com/v1',                     model: 'suno-v4' },
  { modality: 'video', provider: 'seedance',        apiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',   model: 'seedance-2.0' },
  { modality: 'voice', provider: 'tts_openai',      apiEndpoint: 'https://api.openai.com/v1',                   model: 'tts-1' },
] as const;

async function main(): Promise<void> {
  console.log('开始种子数据初始化...');

  // 1. 管理员用户
  const adminPasswordHash = await hash('admin123456', 10);
  await prisma.user.upsert({
    where: { email: 'admin@galgame-toolkit.com' },
    update: {},
    create: {
      email: 'admin@galgame-toolkit.com',
      passwordHash: adminPasswordHash,
      nickname: '系统管理员',
      role: 'admin',
      avatarUrl: '/default-assets/default_avatar.svg',
    },
  });
  console.log('管理员用户创建完成: admin@galgame-toolkit.com');

  // 2. 示例用户
  const userPasswordHash = await hash('user123456', 10);
  await prisma.user.upsert({
    where: { email: 'demo@galgame-toolkit.com' },
    update: {},
    create: {
      email: 'demo@galgame-toolkit.com',
      passwordHash: userPasswordHash,
      nickname: '示例创作者',
      role: 'user',
      avatarUrl: '/default-assets/default_avatar.svg',
    },
  });
  console.log('示例用户创建完成: demo@galgame-toolkit.com');

  // 3. 为每个用户写入五模态默认 AI 配置
  const users = await prisma.user.findMany();
  for (const user of users) {
    for (const cfg of DEFAULT_MODALITY_CONFIGS) {
      await prisma.aIConfig.upsert({
        where: { userId_modality: { userId: user.id, modality: cfg.modality } },
        update: {},
        create: {
          userId: user.id,
          modality: cfg.modality,
          provider: cfg.provider,
          apiEndpoint: cfg.apiEndpoint,
          apiKey: '',
          model: cfg.model,
          enabled: true,
        },
      });
    }
  }
  console.log(`已为 ${users.length} 个用户写入五模态 AI 默认配置`);

  console.log('种子数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
