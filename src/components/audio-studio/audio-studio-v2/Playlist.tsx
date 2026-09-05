// ============================================================
// Playlist v2 — simple-daw 原版直译 (MIT)
// 左键绘/右键擦/拖拽移动 + 标尺点击定位
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { useSimpleDawStore } from '@/store/useSimpleDawStore';

export default function PlaylistV2(): React.JSX.Element {
  const currentStep = useSimpleDawStore(s => s.currentStep);
  const setCurrentStep = useSimpleDawStore(s => s.setCurrentStep);
  const channels = useSimpleDawStore(s => s.channels);
  const playlistClips = useSimpleDawStore(s => s.playlistClips);
  const addClip = useSimpleDawStore(s => s.addClip);
  const moveClip = useSimpleDawStore(s => s.moveClip);
  const deleteClip = useSimpleDawStore(s => s.deleteClip);
  const selectedChannelId = useSimpleDawStore(s => s.selectedChannelId);
  const sequenceLength = useSimpleDawStore(s => s.sequenceLength);

  const [draggingClip, setDraggingClip] = useState<any>(null);
  const [mouseMode, setMouseMode] = useState<'none'|'painting'|'erasing'>('none');

  const handleRulerClick = (e: React.MouseEvent) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    setCurrentStep(Math.floor(x / 32) * sequenceLength);
  };

  const handleInteraction = (x: number, trackIdx: number, mode: 'painting'|'erasing') => {
    const blockIndex = Math.floor(x / 32);
    const ch = channels[trackIdx]; if (!ch) return;
    const exist = playlistClips.find(c => c.channelId === ch.id && c.blockIndex === blockIndex);
    if (mode === 'painting' && !exist) addClip({ channelId: ch.id, blockIndex, blockCount: 1 });
    else if (mode === 'erasing' && exist) deleteClip(exist.id);
  };

  useEffect(() => { const up = () => setMouseMode('none'); window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up); }, []);

  const onMouseDown = (e: React.MouseEvent, clip: any) => {
    if (e.button === 2) { e.preventDefault(); deleteClip(clip.id); return; }
    e.stopPropagation();
    setDraggingClip({ clip, startX: e.clientX, origBlock: clip.blockIndex });
    const move = (me: MouseEvent) => moveClip(clip.id, Math.max(0, clip.blockIndex + Math.round((me.clientX - e.clientX) / 32)));
    const up = () => { setDraggingClip(null); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  };

  const c = { border: 'rgba(200,162,232,0.12)', accent: '#FF6B9D' };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#1A0A2E', border: `1px solid ${c.border}`, borderRadius: 6 }}>
      <div className="flex items-center gap-3 px-3 py-2 border-b text-[11px]" style={{ borderColor: c.border }}>
        <span className="font-semibold tracking-wider uppercase text-white/40">Playlist</span>
        <span className="text-white/30 text-[10px]">Drag to move | Left-drag Paint | Right-drag Erase | Click ruler seek</span>
      </div>
      <div className="flex flex-1 overflow-auto relative">
        <div className="w-20 flex-shrink-0 sticky left-0 z-20" style={{ backgroundColor: '#140a24', borderRight: '1px solid #2a1a3e' }}>
          <div className="h-6 border-b" style={{ backgroundColor: '#0d0616', borderColor: c.border }}/>
          {channels.map(ch => (
            <div key={ch.id} className="h-10 flex items-center px-2 text-[10px] border-b border-white/5" style={{ color: ch.id === selectedChannelId ? '#F5E6FF' : '#C4B5D9', borderLeft: `3px solid ${ch.color}` }}>{ch.name}</div>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          <div onClick={handleRulerClick} className="h-6 flex-shrink-0 relative cursor-pointer border-b" style={{ width: 4096, backgroundColor: '#0d0616', borderColor: c.border }}>
            {Array.from({ length: 128 }).map((_, i) => <div key={i} className="absolute top-0 h-full text-[10px] border-l" style={{ left: i*32, color: '#4a3a5a', borderColor: '#2a1a3e', paddingLeft: 2 }}>{i+1}</div>)}
          </div>
          <div className="flex-1 relative" style={{ width: 4096, background: 'linear-gradient(90deg, #1a0e2e 1px, transparent 1px), linear-gradient(#1a0e2e 1px, transparent 1px)', backgroundSize: '32px 40px' }}>
            {channels.map((ch, trackIdx) => (
              <div key={ch.id} className="w-full h-10 relative"
                onMouseDown={e => { if (e.button===0){ setMouseMode('painting'); handleInteraction(e.clientX-e.currentTarget.getBoundingClientRect().left, trackIdx, 'painting'); } else if (e.button===2){ setMouseMode('erasing'); handleInteraction(e.clientX-e.currentTarget.getBoundingClientRect().left, trackIdx, 'erasing'); }}}
                onMouseMove={e => { if (mouseMode!=='none') handleInteraction(e.clientX-e.currentTarget.getBoundingClientRect().left, trackIdx, mouseMode); }}
                onContextMenu={e => e.preventDefault()}>
                {playlistClips.filter(c => c.channelId===ch.id).map(clip => (
                  <div key={clip.id} onMouseDown={e => onMouseDown(e, clip)} onContextMenu={e => e.preventDefault()}
                    className="absolute rounded-md cursor-move select-none" style={{
                      left: clip.blockIndex*32, width: clip.blockCount*32, height: 36, top: 2,
                      backgroundColor: ch.color+'44', border: `1px solid ${ch.color}`,
                      boxShadow: ch.id===selectedChannelId ? `0 0 10px ${ch.color}` : 'none',
                      zIndex: draggingClip?.clip.id===clip.id ? 100 : 1,
                    }}/>
                ))}
              </div>
            ))}
            <div className="absolute top-0 w-0.5 h-full z-10 pointer-events-none" style={{ left: (currentStep/sequenceLength)*32, backgroundColor: '#FF6B9D', boxShadow: '0 0 6px rgba(255,107,157,0.6)' }}/>
          </div>
        </div>
      </div>
    </div>
  );
}
