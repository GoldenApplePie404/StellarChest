// AI 厂商预设 API - GET 返回五模态的 Provider/端点/模型预设（前端下拉用）
import { NextResponse } from 'next/server';
import { AI_PRESETS, AI_MODALITY_LABELS, AI_MODALITIES } from '@/lib/ai-presets';
import { successResponse } from '@/lib/errors';
import type { ApiResponse } from '@/types/api';

/** GET - 返回全部预设 */
export async function GET(): Promise<NextResponse<ApiResponse<{
  modalities: typeof AI_MODALITIES;
  labels: typeof AI_MODALITY_LABELS;
  presets: typeof AI_PRESETS;
}>>> {
  return NextResponse.json(successResponse({ modalities: AI_MODALITIES, labels: AI_MODALITY_LABELS, presets: AI_PRESETS }));
}
