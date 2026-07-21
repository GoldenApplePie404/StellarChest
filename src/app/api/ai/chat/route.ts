// AI 对话流式接口 - POST /api/ai/chat
// 以 SSE (text/event-stream) 返回文本增量；鉴权沿用 proxy 注入的 x-user-id
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/AIService';
import { retrieveChunks, buildContext } from '@/services/ai/RagService';
import { ValidationError, AppError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { AIChatMessage } from '@/types/ai';

export const runtime = 'nodejs';

interface ChatBody {
  messages: AIChatMessage[];
  model?: string;
  temperature?: number;
  knowledgeBaseId?: string;
  agentId?: string;
}

/** POST - 流式对话 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const userId = request.headers.get('x-user-id') || '';
    if (!userId) {
      return NextResponse.json({ code: 401, data: null, message: '请先登录' }, { status: 401 });
    }

    const body = await request.json() as ChatBody;
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ code: 400, data: null, message: 'messages 不能为空' }, { status: 400 });
    }

    // Agent 模式：走工具编排循环（SSE 事件含 tool_call / tool_result）
    if (body.agentId) {
      const aid = body.agentId;
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const ev of aiService.streamAgentChat(userId, body.messages, {
              agentId: aid,
              model: body.model,
              temperature: body.temperature,
              signal: request.signal,
            })) {
              if (ev.type === 'delta') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: ev.text })}\n\n`));
              } else if (ev.type === 'tool_call') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ tool_call: { name: ev.name, args: ev.args } })}\n\n`));
              } else if (ev.type === 'tool_result') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ tool_result: { name: ev.name, result: ev.result } })}\n\n`));
              } else if (ev.type === 'done') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              }
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : '对话生成失败';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          } finally {
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
    }

    // 预校验：避免流式已开始才报错
    const config = await aiService.getConfig(userId, 'chat');
    if (!config || !config.apiEndpoint || !config.apiKey) {
      return NextResponse.json(
        { code: 400, data: null, message: '请先在「星灵 → 模型配置」中填写对话模型的 API 端点与密钥' },
        { status: 400 },
      );
    }

    // RAG：挂载知识库时，检索 topK 拼为 system 上下文前置注入
    let chatMessages = body.messages;
    let sources: { id: string; docTitle: string; snippet: string }[] = [];
    if (body.knowledgeBaseId) {
      const lastUser = [...body.messages].reverse().find((m) => m.role === 'user');
      const chunks = await retrieveChunks(userId, body.knowledgeBaseId, lastUser?.content ?? '', 3);
      const ctx = buildContext(chunks);
      if (ctx) chatMessages = [{ role: 'system', content: ctx }, ...body.messages];
      // 来源片段（截断预览）回流前端，用于引用展示
      sources = chunks.map((c) => ({ id: c.id, docTitle: c.docTitle, snippet: c.content.slice(0, 160) }));
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (sources.length) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`));
          }
          for await (const delta of aiService.streamChat(userId, chatMessages, {
            model: body.model,
            temperature: body.temperature,
            signal: request.signal,
          })) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (e) {
          const msg = e instanceof Error ? e.message : '对话生成失败';
          console.error('[chat][stream] userId=%s error=%s', userId, msg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
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
    if (error instanceof ValidationError) return NextResponse.json({ code: error.code, data: null, message: error.message }, { status: error.code });
    return NextResponse.json({ code: 500, data: null, message: '服务器内部错误' }, { status: 500 });
  }
}
