// ============================================================
// SoundSearchModal — simple-daw 原版直译 (MIT)
// Freesound 搜索 + 已保存音色库
// ============================================================
'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Play, Plus, Search, Loader2, Save, Trash2 } from 'lucide-react';
import { useSimpleDawStore } from '@/store/useSimpleDawStore';

interface FreesoundResult {
  id: number; name: string; username: string; duration: number;
  previews?: Record<string, string>; tags?: string[];
}

function getBestPreview(previews?: Record<string, string>): string | null {
  if (!previews) return null;
  return previews['preview-hq-ogg'] || previews['preview-lq-ogg'] || previews['preview-hq-mp3'] || previews['preview-lq-mp3'] || null;
}

export default function SoundSearchModal(): React.JSX.Element | null {
  const isOpen = useSimpleDawStore(s => s.isSoundSearchOpen);
  const setOpen = useSimpleDawStore(s => s.setSoundSearchOpen);
  const addChannel = useSimpleDawStore(s => s.addChannel);
  const saveSound = useSimpleDawStore(s => s.saveSoundToLibrary);
  const savedSounds = useSimpleDawStore(s => s.savedSounds);
  const removeSound = useSimpleDawStore(s => s.removeSoundFromLibrary);

  const [activeTab, setActiveTab] = useState<'search'|'saved'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FreesoundResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [page, setPage] = useState(1);
  const [minDur, setMinDur] = useState('');
  const [maxDur, setMaxDur] = useState('15');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { if (!isOpen && audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }, [isOpen]);

  const handlePreview = (url: string | null) => {
    if (!url) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    const a = new Audio(url); audioRef.current = a;
    a.play().catch(() => {});
  };

  const handleSearch = async (p = 1) => {
    if (!query) return;
    setLoading(true); if (p === 1) setResults([]);
    try {
      const token = apiKey.trim() || '6yO5R9R9M2V5T8K8G8J8H8F8D8S8A8Q8';
      let filter = '';
      if (maxDur) filter += ` duration:[${minDur||0} TO ${maxDur}]`;
      const res = await fetch(`https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}&fields=id,name,previews,username,duration,tags&page=${p}&token=${token}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setResults(data.results || []); setPage(p);
    } catch { alert('Search failed. Check your Freesound API token.'); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const colors = { bg: '#1A0A2E', border: 'rgba(200,162,232,0.12)', accent: '#FF6B9D', text: '#F5E6FF', dim: '#C4B5D9' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
      <div className="flex flex-col rounded-lg shadow-2xl p-6" style={{ width: 700, height: 650, backgroundColor: colors.bg, border: `1px solid ${colors.border}`, boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-5">
            <h2 onClick={() => setActiveTab('search')} className="flex items-center gap-3 text-lg m-0 cursor-pointer" style={{ color: activeTab==='search' ? colors.accent : colors.dim }}><Search size={24}/>Freesound</h2>
            <h2 onClick={() => setActiveTab('saved')} className="flex items-center gap-3 text-lg m-0 cursor-pointer" style={{ color: activeTab==='saved' ? colors.accent : colors.dim }}>Saved Library</h2>
          </div>
          <button className="p-1 rounded hover:bg-white/5 text-white/40" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>

        {activeTab === 'search' && (
          <>
            <div className="flex gap-2 mb-4">
              <input type="password" placeholder="Freesound API Token..." value={apiKey} onChange={e=>setApiKey(e.target.value)}
                className="px-2 py-1.5 rounded text-[11px] border outline-none" style={{ width:150, background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)', color:colors.text }}/>
              <div className="flex items-center gap-1">
                <input placeholder="Min Sec" value={minDur} onChange={e=>setMinDur(e.target.value)} className="px-1.5 py-1 rounded text-[11px] border outline-none" style={{ width:60, background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)', color:colors.text }}/>
                <span className="text-[10px] text-white/40">to</span>
                <input placeholder="Max Sec" value={maxDur} onChange={e=>setMaxDur(e.target.value)} className="px-1.5 py-1 rounded text-[11px] border outline-none" style={{ width:60, background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)', color:colors.text }}/>
              </div>
            </div>
            <div className="flex gap-3 mb-4">
              <input type="text" placeholder="Search sounds..." value={query} onKeyDown={e=>e.key==='Enter'&&handleSearch(1)} onChange={e=>setQuery(e.target.value)}
                className="flex-1 h-10 px-3 rounded text-[15px] border outline-none" style={{ background:'rgba(255,255,255,0.05)', borderColor:'rgba(255,255,255,0.1)', color:colors.text }}/>
              <button onClick={()=>handleSearch(1)} disabled={loading} className="px-6 h-10 rounded-md font-bold text-sm transition-colors"
                style={{ backgroundColor: loading ? 'rgba(255,107,157,0.3)' : colors.accent, color: '#fff' }}>
                {loading ? <Loader2 size={20} className="animate-spin"/> : 'Search'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto rounded-lg border" style={{ borderColor:'rgba(255,255,255,0.1)', backgroundColor:'rgba(0,0,0,0.2)' }}>
              {results.map(sound => (
                <div key={sound.id} className="flex justify-between items-center px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <div className="flex-1 truncate mr-4">
                    <div className="text-sm font-medium mb-1 truncate" style={{ color: colors.text }}>{sound.name}</div>
                    <div className="text-[11px]" style={{ color: colors.dim }}>{Math.round(sound.duration)}s &middot; by {sound.username}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1.5 rounded hover:bg-white/5 text-white/40" onClick={()=>handlePreview(getBestPreview(sound.previews))} title="Preview"><Play size={14}/></button>
                    <button className="p-1.5 rounded hover:bg-white/5 text-white/40" onClick={()=>{ saveSound({ name:sound.name, username:sound.username, url:getBestPreview(sound.previews)||'' }); alert('Saved!'); }} title="Save"><Save size={14}/></button>
                    <button onClick={()=>{ const url=getBestPreview(sound.previews); if(url){ addChannel(sound.name,'sampler',url); setOpen(false); } else alert('No preview'); }}
                      className="px-3 py-1.5 rounded-md text-xs font-bold transition-colors" style={{ backgroundColor: colors.accent, color:'#fff' }}><Plus size={16}/></button>
                  </div>
                </div>
              ))}
              {results.length > 0 && (
                <div className="flex justify-center items-center gap-3 py-3">
                  <button disabled={page<=1} onClick={()=>handleSearch(page-1)} className="px-3 py-1 rounded text-xs border border-white/10 bg-white/5 text-white/40 disabled:opacity-30">Prev</button>
                  <span className="text-[12px] text-white/40">Page {page}</span>
                  <button onClick={()=>handleSearch(page+1)} className="px-3 py-1 rounded text-xs border border-white/10 bg-white/5 text-white/40">Next</button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'saved' && (
          <div className="flex-1 overflow-y-auto rounded-lg border" style={{ borderColor:'rgba(255,255,255,0.1)', backgroundColor:'rgba(0,0,0,0.2)' }}>
            {savedSounds.length===0 ? (
              <div className="flex items-center justify-center h-full text-white/30 text-sm">No saved sounds yet. Search and save sounds to build your library.</div>
            ) : (
              savedSounds.map(s => (
                <div key={s.id} className="flex justify-between items-center px-4 py-3 border-b border-white/5">
                  <div>
                    <div className="text-[13px] font-bold" style={{ color: colors.text }}>{s.name}</div>
                    <div className="text-[11px]" style={{ color: colors.dim }}>{s.username}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-1.5 rounded hover:bg-white/5 text-white/40" onClick={()=>handlePreview(s.url)}><Play size={14}/></button>
                    <button onClick={()=>{ addChannel(s.name,'sampler',s.url); setOpen(false); }}
                      className="px-3 py-1.5 rounded-md text-xs font-bold transition-colors" style={{ backgroundColor: colors.accent, color:'#fff' }}><Plus size={16}/></button>
                    <button className="p-1.5 rounded hover:bg-white/5 text-white/40" onClick={()=>{ if(confirm('Remove?')) removeSound(s.id); }}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <div className="mt-4 text-[11px] text-center" style={{ color: colors.dim }}>
          Samples provided by <a href="https://freesound.org" target="_blank" rel="noreferrer" style={{ color: colors.accent }}>Freesound.org</a> under Creative Commons licenses.
        </div>
      </div>
    </div>
  );
}
