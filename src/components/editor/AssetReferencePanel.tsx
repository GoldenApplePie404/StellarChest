// 素材引用分析面板 —— 扫描当前脚本中 @bg/@bgm/@sfx/@video/@perform 的资源引用，
// 与项目素材库 + resourceMap 交叉比对，产出：
//   · 已引用（脚本引用且能解析到素材库资源）
//   · 缺失引用（脚本引用但库中无对应资源 / 未注册 resourceMap —— 潜在破图破音）
//   · 游离素材（素材库有但脚本从未引用 —— 可清理）
//   · 包体预估（实际被引用素材的磁盘体积合计）
// 点击任意引用项可跳转到对应脚本行（派发 galgame-goto-line）。
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { ScriptParser } from '@/engine/ScriptParser';
import { formatFileSize } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, CircleSlash, Package, Link2, Unlink, FileSearch } from 'lucide-react';

interface AssetRow {
  id: string;
  kind: 'character' | 'background' | 'audio';
  name: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

type RefCategory = 'background' | 'audio' | 'video' | 'character';

interface RefItem {
  category: RefCategory;
  key: string;
  lines: number[];
}

const BUILTIN = new Set(['default', 'none', 'black', 'white', 'transparent']);

const KIND_LABELS: Record<AssetRow['kind'] | RefCategory, string> = {
  character: '立绘',
  background: '背景',
  audio: '音频',
  video: '视频',
};
const KIND_COLORS: Record<string, string> = {
  character: '#FF85AB',
  background: '#FFD700',
  audio: '#6BCB77',
  video: '#7EC8E3',
};

/** 由素材名生成角色ID（与素材库插入逻辑保持一致） */
function toCharId(name: string): string {
  const base = name.replace(/\.[^.]+$/, '');
  return base.trim().replace(/\s+/g, '_').replace(/[^\w一-龥_-]/g, '') || 'char';
}

function normId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9一-龥]/g, '');
}

/** 从脚本抽取资源引用（去重，记录行号，1-based） */
function extractRefs(script: string): RefItem[] {
  const parser = new ScriptParser();
  const lines = parser.parse(script);
  const map = new Map<string, RefItem>();
  for (const ln of lines) {
    if (ln.type !== 'instruction' || !ln.instruction) continue;
    const { name, params } = ln.instruction;
    const p = params as Record<string, string | number | boolean>;
    const pick = (...ks: string[]): string => {
      for (const k of ks) {
        const v = p[k];
        if (typeof v === 'string' && v) return v;
        if (typeof v === 'number') return String(v);
      }
      return '';
    };
    let category: RefCategory | null = null;
    let key = '';
    if (name === 'bg' || name === 'web_bg') { category = 'background'; key = pick('id', 'value', 'arg1'); }
    else if (name === 'bgm' || name === 'web_bgm' || name === 'sfx' || name === 'web_sfx') { category = 'audio'; key = pick('id', 'value', 'arg1'); }
    else if (name === 'video') { category = 'video'; key = pick('id', 'value', 'arg1'); }
    else if (name === 'perform' || name === 'web_perform') { category = 'character'; key = pick('char', 'id', 'value', 'arg1'); }
    if (!category || !key) continue;
    const idKey = `${category}:${key}`;
    const item = map.get(idKey) ?? { category, key, lines: [] };
    item.lines.push(ln.lineNumber + 1);
    map.set(idKey, item);
  }
  return [...map.values()];
}

/** 资源 key 是否匹配某素材（URL 精确匹配 / 名称归一化匹配） */
function assetMatches(key: string, asset: AssetRow): boolean {
  const isUrl = key.startsWith('http') || key.startsWith('/');
  if (isUrl) return asset.fileUrl === key || asset.fileUrl.endsWith(key);
  return normId(asset.name.replace(/\.[^.]+$/, '')) === normId(key);
}

interface AnalysisResult {
  present: { ref: RefItem; asset: AssetRow }[];
  mapped: RefItem[];
  missing: RefItem[];
  orphan: AssetRow[];
  pkgBytes: number;
  totalBytes: number;
  orphanBytes: number;
}

function analyze(refs: RefItem[], assets: AssetRow[], resourceMap: Record<string, string> | null): AnalysisResult {
  const present: { ref: RefItem; asset: AssetRow }[] = [];
  const mapped: RefItem[] = [];
  const missing: RefItem[] = [];
  const usedAssetIds = new Set<string>();

  for (const r of refs) {
    if (BUILTIN.has(r.key.toLowerCase())) continue; // 忽略内置占位符
    const asset = assets.find((a) => assetMatches(r.key, a));
    if (asset) {
      present.push({ ref: r, asset });
      usedAssetIds.add(asset.id);
    } else if (resourceMap && Object.prototype.hasOwnProperty.call(resourceMap, r.key)) {
      mapped.push(r);
    } else {
      missing.push(r);
    }
  }

  const orphan = assets.filter((a) => !usedAssetIds.has(a.id));

  const seen = new Set<string>();
  let pkgBytes = 0;
  for (const p of present) {
    if (!seen.has(p.asset.id)) {
      seen.add(p.asset.id);
      pkgBytes += p.asset.fileSize || 0;
    }
  }
  const totalBytes = assets.reduce((s, a) => s + (a.fileSize || 0), 0);
  const orphanBytes = orphan.reduce((s, a) => s + (a.fileSize || 0), 0);

  return { present, mapped, missing, orphan, pkgBytes, totalBytes, orphanBytes };
}

interface Props {
  scriptText: string;
  projectId: string;
}

export default function AssetReferencePanel({ scriptText, projectId }: Props): React.JSX.Element {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [resourceMap, setResourceMap] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ present: boolean; missing: boolean; orphan: boolean }>({ present: true, missing: true, orphan: false });

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== 'undefined' ? localStorage.getItem('galgame_token') || '' : '';
    const headers = { Authorization: `Bearer ${token}` };
    setLoading(true);
    Promise.all([
      fetch(`/api/projects/${projectId}/assets`, { headers }).then((r) => r.json()),
      fetch(`/api/projects/${projectId}`, { headers }).then((r) => r.json()),
    ])
      .then(([assetData, projData]) => {
        if (cancelled) return;
        if (assetData.code === 200 && assetData.data) setAssets(assetData.data as AssetRow[]);
        if (projData.code === 200 && projData.data?.config?.resourceMap) {
          setResourceMap(projData.data.config.resourceMap as Record<string, string>);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const refs = useMemo(() => extractRefs(scriptText), [scriptText]);
  const result = useMemo(() => analyze(refs, assets, resourceMap), [refs, assets, resourceMap]);

  const gotoLine = useCallback((line: number) => {
    window.dispatchEvent(new CustomEvent('galgame-goto-line', { detail: { line } }));
  }, []);

  const insertRef = useCallback((a: AssetRow) => {
    const text =
      a.kind === 'audio' ? `@bgm ${a.fileUrl}`
        : a.kind === 'character' ? `@perform ${toCharId(a.name)}`
          : `@bg ${a.fileUrl}`;
    window.dispatchEvent(new CustomEvent('galgame-insert', { detail: { text: `\n${text}\n` } }));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: 'rgba(255,155,181,0.2)', borderTopColor: '#FF9BB5' }} />
      </div>
    );
  }

  const totalRefs = result.present.length + result.mapped.length + result.missing.length;
  const okRatio = totalRefs > 0 ? Math.round((result.present.length / totalRefs) * 100) : 100;

  return (
    <div className="h-full overflow-y-auto">
      {/* 标题 */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <FileSearch size={15} style={{ color: '#FF9BB5' }} />
          <span className="text-sm font-bold" style={{ color: '#E2D0F5' }}>素材引用分析</span>
        </div>
        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          脚本 {refs.length} 处引用 · 与 {assets.length} 个素材交叉比对
        </p>
      </div>

      {/* 指标卡 */}
      <div className="grid grid-cols-2 gap-2 px-3">
        <Metric
          icon={<CheckCircle2 size={14} />}
          label="已引用"
          value={String(result.present.length)}
          color="#6BCB77"
          sub={formatFileSize(result.pkgBytes)}
        />
        <Metric
          icon={<AlertTriangle size={14} />}
          label="缺失引用"
          value={String(result.missing.length)}
          color="#FF6B7A"
          sub={result.missing.length ? '需修复' : '无'}
        />
        <Metric
          icon={<CircleSlash size={14} />}
          label="游离素材"
          value={String(result.orphan.length)}
          color="rgba(255,255,255,0.5)"
          sub={formatFileSize(result.orphanBytes)}
        />
        <Metric
          icon={<Package size={14} />}
          label="实际包体"
          value={formatFileSize(result.pkgBytes)}
          color="#FFD700"
          sub={`库总 ${formatFileSize(result.totalBytes)}`}
        />
      </div>

      {/* 健康度条 */}
      <div className="px-3 mt-3">
        <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <span>引用健康度</span>
          <span style={{ color: okRatio === 100 ? '#6BCB77' : '#FFD700' }}>{okRatio}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${okRatio}%`, background: okRatio === 100 ? 'linear-gradient(90deg,#6BCB77,#98E8C8)' : 'linear-gradient(90deg,#FFD700,#FF9BB5)' }} />
        </div>
      </div>

      {/* 已引用 */}
      <Section
        title="已引用"
        count={result.present.length}
        color="#6BCB77"
        icon={<Link2 size={13} />}
        open={open.present}
        onToggle={() => setOpen((o) => ({ ...o, present: !o.present }))}
      >
        {result.present.length === 0 ? (
          <Empty text="暂无已解析的素材引用" />
        ) : (
          result.present.map(({ ref, asset }) => (
            <Row key={`${ref.category}:${ref.key}`} onClick={() => gotoLine(ref.lines[0] ?? 1)}>
              <KindChip kind={ref.category} />
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate" style={{ color: '#E2D0F5' }}>{ref.key}</div>
                <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  行 {ref.lines.join(', ')} · {asset.name}
                </div>
              </div>
              <span className="text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatFileSize(asset.fileSize)}</span>
            </Row>
          ))
        )}
      </Section>

      {/* 缺失引用 */}
      <Section
        title="缺失引用"
        count={result.missing.length}
        color="#FF6B7A"
        icon={<AlertTriangle size={13} />}
        open={open.missing}
        onToggle={() => setOpen((o) => ({ ...o, missing: !o.missing }))}
      >
        {result.missing.length === 0 ? (
          <Empty text="所有引用都能解析到素材" good />
        ) : (
          result.missing.map((r) => (
            <Row key={`${r.category}:${r.key}`} onClick={() => gotoLine(r.lines[0] ?? 1)} danger>
              <KindChip kind={r.category} />
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate" style={{ color: '#FFB3C1' }}>{r.key}</div>
                <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  行 {r.lines.join(', ')} · 未找到对应素材
                </div>
              </div>
            </Row>
          ))
        )}
      </Section>

      {/* 游离素材 */}
      <Section
        title="游离素材"
        count={result.orphan.length}
        color="rgba(255,255,255,0.5)"
        icon={<Unlink size={13} />}
        open={open.orphan}
        onToggle={() => setOpen((o) => ({ ...o, orphan: !o.orphan }))}
      >
        {result.orphan.length === 0 ? (
          <Empty text="素材库资源均已被引用" />
        ) : (
          result.orphan.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid transparent' }}
            >
              <KindChip kind={a.kind} />
              <div className="flex-1 min-w-0">
                <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{a.name}</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{formatFileSize(a.fileSize)}</div>
              </div>
              <button
                onClick={() => insertRef(a)}
                className="px-2 py-0.5 rounded text-[10px] font-bold transition-all"
                style={{ background: 'rgba(255,126,179,0.15)', color: '#FF9BB5' }}
                title="插入引用到脚本"
              >
                引用
              </button>
            </div>
          ))
        )}
      </Section>

      {BUILTIN.size > 0 && result.missing.length === 0 && (
        <p className="px-3 pb-3 pt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          内置占位符（default / none 等）已自动忽略。
        </p>
      )}
    </div>
  );
}

/** 指标卡 */
function Metric({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string; color: string; sub: string }) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
        {icon}
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      </div>
      <div className="text-base font-bold leading-none" style={{ color }}>{value}</div>
      <div className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
    </div>
  );
}

/** 可折叠分区 */
function Section({ title, count, color, icon, open, onToggle, children }: {
  title: string; count: number; color: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="px-3 pt-3">
      <button onClick={onToggle} className="flex items-center gap-2 w-full text-left mb-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-bold" style={{ color: '#E2D0F5' }}>{title}</span>
        <span className="text-[10px] px-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>{count}</span>
        <div className="flex-1" />
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{open ? '收起' : '展开'}</span>
      </button>
      {open && <div className="space-y-1 pb-1">{children}</div>}
    </div>
  );
}

/** 引用行（可点击跳行） */
function Row({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all"
      style={{
        background: danger ? 'rgba(255,107,122,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${danger ? 'rgba(255,107,122,0.12)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  );
}

function KindChip({ kind }: { kind: string }) {
  const color = KIND_COLORS[kind] || '#FF9BB5';
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0" style={{ background: color + '22', color }}>
      {KIND_LABELS[kind as keyof typeof KIND_LABELS] || kind}
    </span>
  );
}

function Empty({ text, good }: { text: string; good?: boolean }) {
  return (
    <div className="text-[11px] px-2 py-1.5" style={{ color: good ? 'rgba(107,203,119,0.7)' : 'rgba(255,255,255,0.3)' }}>{text}</div>
  );
}
