// 星灵 AI 提示词模板种子（CommonJS，无需 tsx）
// 运行: node prisma/seed-templates.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SEED_PROMPTS = [
  // ---- 画风（5 条） ----
  { title: '日系动漫标准 · prompt', category: '画风', isPublic: true, content: 'masterpiece, best quality, anime style, highly detailed, soft lighting, clean linework, vibrant colors, 2D illustration' },
  { title: '日系写实 · prompt', category: '画风', isPublic: true, content: 'masterpiece, best quality, anime style, semi-realistic, detailed eyes, cinematic lighting, photorealistic render, 8k' },
  { title: '黑白漫画 · prompt', category: '画风', isPublic: true, content: 'masterpiece, best quality, manga style, black and white, hatching, screentone, pen and ink, comic art' },
  { title: '水墨古风 · prompt', category: '画风', isPublic: true, content: 'masterpiece, best quality, Chinese ink painting style, traditional Chinese art, ink wash, watercolor, elegant, poetic atmosphere' },
  { title: '轻小说插画 · prompt', category: '画风', isPublic: true, content: 'masterpiece, best quality, light novel illustration style, soft colors, ethereal, detailed background, beautiful lighting, character focus, anime art, visual novel cg' },
  { title: '通用负面提示词', category: '画风', isPublic: true, content: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry' },

  // ---- 角色表情（13 条） ----
  { title: '默认/中立 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, neutral expression, natural standing pose, looking at viewer, solid white background, visual novel sprite, character turnaround, sprite sheet style, uniform lighting, front facing, simple background' },
  { title: '开心 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, happy expression, smiling, bright eyes, cheerful, solid white background, visual novel sprite, uniform lighting' },
  { title: '悲伤 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, sad expression, slightly crying or sorrowful, drooping eyebrows, solid white background, visual novel sprite, uniform lighting' },
  { title: '生气 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, angry expression, furrowed brows, clenched teeth or pouting, solid white background, visual novel sprite, uniform lighting' },
  { title: '害羞 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, shy expression, blushing cheeks, looking away, embarrassed, flustered, solid white background, visual novel sprite, uniform lighting' },
  { title: '惊讶 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, surprised expression, wide eyes, slightly open mouth, solid white background, visual novel sprite, uniform lighting' },
  { title: '认真/坚定 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, serious expression, determined look, furrowed brows, solid white background, visual novel sprite, uniform lighting' },
  { title: '慌张 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, flustered expression, panicked, blushing heavily, sweating, solid white background, visual novel sprite, uniform lighting' },
  { title: '温柔微笑 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, gentle smile, kind eyes, warm expression, solid white background, visual novel sprite, uniform lighting' },
  { title: '哭泣 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, crying expression, tears streaming, emotional, solid white background, visual novel sprite, uniform lighting' },
  { title: '邪恶笑 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, evil smirk, sinister eyes, dark expression, solid white background, visual novel sprite, uniform lighting' },
  { title: '赌气/嘟嘴 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, pouting expression, slightly annoyed, cute angry, solid white background, visual novel sprite, uniform lighting' },
  { title: '思考 · 角色立绘', category: '角色表情', isPublic: true, content: '1girl, solo, full body portrait, standing pose, thoughtful expression, hand on chin, looking upward, solid white background, visual novel sprite, uniform lighting' },

  // ---- BGM（13 条） ----
  { title: '宁静钢琴 · BGM', category: 'BGM', isPublic: true, content: 'calm solo piano, gentle and sentimental, minor key, slow tempo, emotional ballad, Japanese visual novel background music, peaceful' },
  { title: '紧张弦乐 · BGM', category: 'BGM', isPublic: true, content: 'tense string quartet, suspenseful, building tension, dramatic, thriller soundtrack, minimal, repetitive motif' },
  { title: '浪漫温馨 · BGM', category: 'BGM', isPublic: true, content: 'romantic piano and strings, warm, gentle, love theme, sweet melody, visual novel romance bgm, tender and emotional' },
  { title: '悲伤哀婉 · BGM', category: 'BGM', isPublic: true, content: 'sad piano or violin, melancholic, emotional, rainy day mood, tearful, slow, minor key progression, nostalgic' },
  { title: '欢快日常 · BGM', category: 'BGM', isPublic: true, content: 'upbeat pop instrumental, happy, cheerful, energetic, bright piano and light drums, slice of life bgm, positive vibes' },
  { title: '神秘氛围 · BGM', category: 'BGM', isPublic: true, content: 'mysterious ambient, soft pads, subtle tension, ethereal, slow build, atmospheric soundscape' },
  { title: '战斗/紧张 · BGM', category: 'BGM', isPublic: true, content: 'action electronic, driving beat, fast tempo, intense, battle orchestral, visual novel action bgm' },
  { title: '怀旧音乐盒 · BGM', category: 'BGM', isPublic: true, content: 'nostalgic music box, memories, childhood, bittersweet, delicate melody, visual novel memory bgm' },
  { title: '希望/新开始 · BGM', category: 'BGM', isPublic: true, content: 'hopeful orchestral, rising melody, new beginning, inspiring, warm, slow crescendo' },
  { title: '喜剧/轻松 · BGM', category: 'BGM', isPublic: true, content: 'comedic light music, playful strings, quirky, light-hearted, cartoon style bgm, fun and bouncy' },
  { title: '雨天的街道 · BGM', category: 'BGM', isPublic: true, content: 'rainy street ambient, soft piano with rain sounds, reflective mood, urban melancholy, slow tempo' },
  { title: '温暖的室内 · BGM', category: 'BGM', isPublic: true, content: 'warm indoor ambient, acoustic guitar, cozy atmosphere, gentle and safe, home bgm' },
  { title: '夜晚星空 · BGM', category: 'BGM', isPublic: true, content: 'starry night ambient, celestial pads, deep and peaceful, wonder and mystery, slow harmonic progression' },

  // ---- 项目模板（6 条） ----
  { title: '校园恋爱 · 角色设定', category: '项目模板', isPublic: true, content: '你是一名角色设计师，为视觉小说故事生成角色设定卡。\n\n当前项目模板：校园恋爱（日系动漫标准风格）\n常见场景：教室 / 走廊 / 天台 / 图书馆 / 校门口 / 操场 / 放学路\n参考角色模板：\n- 主角: 普通高中生，黑发，白衬衫校服\n- 女主: 文静优等生，长发，眼镜或马尾\n- 青梅竹马: 活泼元气少女，短裙运动系\n\n请生成详细角色卡，含姓名、年龄、性格、外观、台词风格。' },
  { title: '古风仙侠 · 场景描述', category: '项目模板', isPublic: true, content: '你是一名场景设计，为视觉小说生成场景的描述和 AI prompt。\n\n项目模板：古风仙侠（水墨古风）\n可用地点：竹林 / 月下庭院 / 山巅道观 / 江南水乡 / 宫殿大殿 / 桃花林 / 悬崖边 / 客栈\n\n请为每个地点输出：[地点名] | prompt 描述词 | 氛围说明' },
  { title: '科幻未来 · 角色设定', category: '项目模板', isPublic: true, content: '你是一名角色设计师，为视觉小说故事生成角色设定卡。\n\n当前项目模板：科幻未来（日系写实风格）\n常见场景：霓虹街道 / 飞船舰桥 / 实验室 / 贫民窟 / 全息广场 / 废墟都市\n\n请生成详细角色卡，含姓名、年龄、性格、外观（含科技装备/义体）、台词风格。' },
  { title: '悬疑惊悚 · 氛围配置', category: '项目模板', isPublic: true, content: '你是配乐师，为视觉小说推荐 BGM。\n\n项目模板：悬疑惊悚\n推荐氛围：\n- 紧张调查: tense_strings\n- 不安预感: mysterious\n- 追逐逃脱: action\n- 悲伤真相: sad\n- 短暂安宁: calm_piano\n\n请输出每个 mood 的推荐提示词，含关键词、BPM、音色建议。' },
  { title: '异世界奇幻 · 场景描述', category: '项目模板', isPublic: true, content: '你是一名场景设计，为视觉小说生成场景描述和 AI prompt。\n\n项目模板：异世界奇幻（轻小说插画风格）\n可用地点：冒险者公会 / 魔法学院 / 精灵森林 / 龙巢遗迹 / 王国城堡 / 集市广场 / 地下迷宫\n\n请为每个地点输出：[地点名] | prompt 描述词 | 推荐画风 | 氛围说明' },
  { title: '成人恋爱 · 角色设定', category: '项目模板', isPublic: true, content: '你是一名角色设计师，为视觉小说故事生成角色设定卡。\n\n当前项目模板：成人恋爱（日系写实风格）\n常见场景：咖啡厅 / 公寓 / 办公室 / 海滨度假村 / 高级餐厅\n\n请生成详细角色卡，含姓名、年龄、性格、外观、台词风格。注意角色关系多样性。' },

  // ---- 系统提示（3 条） ----
  { title: '系统提示：剧本生成', category: '系统提示', isPublic: true, content: '你是资深 galgame 剧本作家，擅长用「一句话描述 + 角色台词 + 舞台提示」的结构产出治愈系/悬疑系视觉小说脚本。' },
  { title: '系统提示：角色设定', category: '系统提示', isPublic: true, content: '你是角色设计师，请为视觉小说生成详尽的角色卡：姓名、性格、外貌、背景故事、台词风格。' },
  { title: '系统提示：灵感脑暴', category: '系统提示', isPublic: true, content: '你是创意脑暴伙伴，给出天马行空但可落地的 galgame 企划点子与分支路线。' },
];

async function main() {
  console.log(`开始写入 ${SEED_PROMPTS.length} 条预置提示词模板...`);

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('没有用户，跳过。请先运行 npm run db:seed 创建用户。');
    return;
  }
  console.log(`找到 ${users.length} 个用户`);

  let created = 0;
  let skipped = 0;
  for (const user of users) {
    for (const prompt of SEED_PROMPTS) {
      try {
        const exists = await prisma.aIPrompt.findFirst({
          where: { userId: user.id, title: prompt.title },
        });
        if (exists) { skipped++; continue; }

        await prisma.aIPrompt.create({
          data: {
            userId: user.id,
            title: prompt.title,
            category: prompt.category,
            content: prompt.content,
            isPublic: prompt.isPublic,
          },
        });
        created++;
      } catch (e) {
        console.error(`写入失败 [${user.id.slice(0,8)}] ${prompt.title}: ${e.message}`);
      }
    }
  }

  console.log(`完成！新增 ${created} 条，已存在跳过 ${skipped} 条`);
}

main()
  .then(() => console.log('种子脚本执行完毕'))
  .catch((e) => { console.error('种子写入失败:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
