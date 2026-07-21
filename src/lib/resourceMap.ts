// 资源映射合并工具
//
// 预览/运行脚本时，引擎通过 resourceMap 把脚本里的资源ID（如 @bg bg1、@bgm bgm、
// @perform 角色名）解析成真实URL。这里做两件事：
//   1) 读项目配置里「显式注册」的 resourceMap（经素材面板插入时写入）—— 优先级最高；
//   2) 把「已上传的资产」按「文件名去扩展名」自动并入（如上传 bg1.png → 可用 @bg bg1），
//      但只填补 config 中尚未存在的 key，绝不覆盖作者显式注册。
//
// 这样作者上传了素材后，脚本里直接写素材文件名就能引用，无需再手动注册 resourceMap。

export interface UploadedAsset {
  name?: string;
  fileUrl?: string;
}

import { normalizeAssetUrl } from '@/lib/assetUrl';

/** 去掉文件扩展名，得到资源 key（bg1.png → bg1） */
function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

/**
 * 拉取并合并项目的完整 resourceMap。
 * @param projectId 项目ID
 * @param headers   已带鉴权的请求头（与拉取脚本/配置一致）
 * @returns 合并后的 resourceMap（config 显式项优先，已上传资产补缺口）
 */
export async function fetchMergedResourceMap(
  projectId: string,
  headers: Record<string, string>,
): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};

  // 1) 显式注册优先
  try {
    const res = await fetch(`/api/projects/${projectId}`, { headers });
    const data = await res.json();
    if (data?.code === 200 && data?.data?.config?.resourceMap) {
      const explicit = data.data.config.resourceMap as Record<string, string>;
      for (const [k, v] of Object.entries(explicit)) {
        if (v) merged[k] = normalizeAssetUrl(v);
      }
    }
  } catch {
    /* 配置获取失败不阻断脚本加载 */
  }

  // 2) 已上传资产按文件名去扩展名补缺口
  try {
    const res = await fetch(`/api/projects/${projectId}/assets`, { headers });
    const data = await res.json();
    if (data?.code === 200 && Array.isArray(data?.data)) {
      for (const a of data.data as UploadedAsset[]) {
        if (!a?.name || !a?.fileUrl) continue;
        const key = stripExt(a.name);
        if (key && !(key in merged)) merged[key] = normalizeAssetUrl(a.fileUrl);
      }
    }
  } catch {
    /* 资产获取失败不阻断脚本加载 */
  }

  return merged;
}
