// RAG 检索服务（V1：关键词命中检索，零额外依赖、不耗 Key）
// 切片 / 分词 / 关键词计分检索 / 上下文拼接
import prisma from '@/lib/db';

/** 检索命中的切片 */
export interface RetrievedChunk {
  id: string;
  docTitle: string;
  content: string;
  score: number;
}

/** 简单分词：小写 + 去标点 + 去短词（中英通用） */
function tokenize(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[\s\p{P}]+/gu, ' ');
  return cleaned.split(' ').map((w) => w.trim()).filter((w) => w.length >= 2);
}

/** 把文本切成 ~maxChars 的块（按段落聚合，带重叠） */
export function chunkText(text: string, maxChars = 500, overlap = 60): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = '';
  for (const para of paragraphs) {
    if (buf && buf.length + para.length + 2 > maxChars) {
      chunks.push(buf.trim());
      buf = overlap > 0 ? buf.slice(Math.max(0, buf.length - overlap)) : '';
    }
    buf = buf ? `${buf}\n\n${para}` : para;
    while (buf.length > maxChars) {
      chunks.push(buf.slice(0, maxChars).trim());
      buf = buf.slice(maxChars - overlap);
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [text.trim()];
}

/** 关键词检索 topK（按命中词数计分） */
export async function retrieveChunks(
  userId: string,
  kbId: string,
  query: string,
  topK = 3,
): Promise<RetrievedChunk[]> {
  const kb = await prisma.aIKnowledgeBase.findFirst({ where: { id: kbId, userId } });
  if (!kb) return [];
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];

  const docs = await prisma.aIKnowledgeDoc.findMany({
    where: { kbId },
    include: { chunks: true },
  });

  const scored: RetrievedChunk[] = [];
  for (const doc of docs) {
    for (const ch of doc.chunks) {
      const text = ch.content.toLowerCase();
      let score = 0;
      for (const t of qTokens) {
        if (text.includes(t)) score += 1;
      }
      if (score > 0) scored.push({ id: ch.id, docTitle: doc.title, content: ch.content, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/** 把命中切片拼成注入 system 的上下文 */
export function buildContext(chunks: RetrievedChunk[]): string {
  if (!chunks.length) return '';
  const parts = chunks.map((c, i) => `【资料 ${i + 1}】(${c.docTitle})\n${c.content}`);
  return '以下是与问题相关的知识库资料，请在回答时优先参考：\n\n' + parts.join('\n\n');
}
