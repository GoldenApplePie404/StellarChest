// 统一多模态生成接口 - POST /api/ai/generate
// 以 SSE 返回进度/结果；chat 模态请走 /api/ai/chat。
// 异步模态（music/video）后端轮询厂商并实时推送进度；同步模态（image/voice）直接返回。
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/AIService';
import { ValidationError, AppError } from '@/lib/errors';
import { AI_MODALITIES, AI_MODALITY_LABELS } from '@/lib/ai-presets';
import type { AIGenerateRequest, AIGenerateProgress } from '@/types/ai';

/** POST - 统一生成（SSE） */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) {
      return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    }

    let body: AIGenerateRequest;
    try {
      body = (await request.json()) as AIGenerateRequest;
    } catch {
      return NextResponse.json({ code: 400, data: null, message: '请求体无效' }, { status: 400 });
    }

    const { modality, prompt, model, options } = body;
    if (!modality || !AI_MODALITIES.includes(modality)) {
      return NextResponse.json({ code: 400, data: null, message: '未知的生成模态' }, { status: 400 });
    }
    if (modality === 'chat') {
      return NextResponse.json({ code: 400, data: null, message: '对话请使用 /api/ai/chat' }, { status: 400 });
    }
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ code: 400, data: null, message: '提示词不能为空' }, { status: 400 });
    }

    // 预校验：避免流式已开始才报错
    const config = await aiService.getConfig(userId, modality);
    if (!config || !config.apiEndpoint || !config.apiKey) {
      return NextResponse.json(
        { code: 400, data: null, message: `请先在「星灵 → 模型配置」中填写「${AI_MODALITY_LABELS[modality]}」的 API 端点与密钥` },
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (p: AIGenerateProgress): void => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(p)}\n\n`));
        };
        try {
          const gen = await aiService.buildGenerator(userId, modality, model);
          if (gen.isAsync && gen.generateAsync) {
            send({ phase: 'generating', progress: 5, message: '已创建生成任务' });
            const result = await gen.generateAsync(prompt, options, (progress, message) => {
              send({ phase: 'generating', progress, message });
            });
            send({ phase: 'done', progress: 100, result });
          } else if (gen.generateSync) {
            send({ phase: 'generating', progress: 50, message: '生成中…' });
            const result = await gen.generateSync(prompt, options);
            send({ phase: 'done', progress: 100, result });
          } else {
            throw new ValidationError('生成器无可用方法');
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : '生成失败';
          send({ phase: 'error', error: msg });
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: unknown) {
    if (error instanceof AppError) return NextResponse.json(error.toResponse(), { status: error.code });
    if (error instanceof ValidationError) {
      return NextResponse.json({ code: error.code, data: null, message: error.message }, { status: error.code });
    }
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
