// 单模态AI配置「连接测试」API - POST
// 用表单当前值（provider/apiEndpoint/apiKey/model）做一次轻量请求，验证 key 有效 + 端点可达
// 注意：本路由需 Node runtime（openai SDK 依赖 Node 网络栈），且不应被外部 proxy 鉴权阻断（直接读取 x-user-id 仅作日志用）
import { NextRequest, NextResponse } from 'next/server';
import { OpenAICompatibleProvider } from '@/services/ai/OpenAICompatibleProvider';
import { InternalError, successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';
import type { AIModality } from '@/types/ai';

export const runtime = 'nodejs';

const MODALITIES: AIModality[] = ['chat', 'image', 'music', 'video', 'voice'];

interface TestBody {
  provider?: string;
  apiEndpoint?: string;
  apiKey?: string;
  model?: string;
}

/** POST - 测试某模态配置的连通性 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ modality: string }> },
): Promise<NextResponse<ApiResponse<{ ok: boolean; sample?: string; error?: string }>>> {
  try {
    const { modality } = await params;
    if (!MODALITIES.includes(modality as AIModality)) {
      return NextResponse.json({ code: 400, data: null, message: '未知模态' }, { status: 400 });
    }
    const body = (await request.json()) as TestBody;

    const apiEndpoint = (body.apiEndpoint ?? '').trim();
    const apiKey = (body.apiKey ?? '').trim();
    const model = (body.model ?? '').trim();

    if (!apiEndpoint) {
      return NextResponse.json(
        successResponse({ ok: false, error: '请先填写 API 端点地址' }),
        { status: 200 },
      );
    }
    if (!model) {
      return NextResponse.json(
        successResponse({ ok: false, error: '请先填写模型名称' }),
        { status: 200 },
      );
    }
    // 注意：apiKey 允许为空（用户尚未填写），此时测试大概率返回 401，属预期

    const provider = new OpenAICompatibleProvider({
      provider: body.provider ?? 'openai_compatible',
      apiEndpoint,
      apiKey,
      model,
    });

    let sample: string | undefined;
    if (modality === 'chat') {
      // 对话模态：发一条极简消息，验证真实对话能力
      sample = (await provider.generateText('连接测试，请只回复"ok"两个字')).slice(0, 60);
    } else {
      // 其他模态：仅做鉴权 + 连通性检查（不发内容，最通用）
      await provider.testConnection();
    }

    return NextResponse.json(successResponse({ ok: true, sample }), { status: 200 });
  } catch (error: unknown) {
    // 统一把异常转成 {ok:false, error} 返回给前端（不抛 500，前端友好展示）
    const errorMsg =
      error instanceof InternalError
        ? error.message
        : error instanceof Error
          ? error.message
          : '连接测试失败';
    return NextResponse.json(successResponse({ ok: false, error: errorMsg }), { status: 200 });
  }
}
