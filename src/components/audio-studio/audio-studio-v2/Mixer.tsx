// ============================================================
// Mixer v2 — simple-daw 移植 (MIT)
// ============================================================
'use client';

import React, { memo } from 'react';
import { useSimpleDawStore, type SimpleChannel } from '@/store/useSimpleDawStore';
import { simpleAudioEngine } from '@/engine/SimpleAudioEngine';

const Strip = memo(function Strip({ ch }: { ch: SimpleChannel }) {
  const updateChannel = useSimpleDawStore(s => s.updateChannel);
  const up = (u: Partial<SimpleChannel>) => { updateChannel(ch.id, u); simpleAudioEngine.updateChannelSettings({ ...ch, ...u }); };
  return (
    <div className="w-[60px] flex flex-col items-center gap-2 px-1.5 py-2 border-r border-white/5 h-full" style={{ backgroundColor: 'rgba(45,27,78,0.5)' }}>
      <div className="text-[10px] text-center h-7 w-full pt-1 text-white/40" style={{ borderTop: `3px solid ${ch.color || '#FF6B9D'}` }}>{(ch.name || 'SYNTH').toUpperCase()}</div>
      <div className="flex flex-col items-center gap-0.5">
        <input type="range" min={-1} max={1} step={0.1} value={ch.pan} onChange={e => up({ pan: parseFloat(e.target.value) })} className="w-10 h-1 accent-pink-400"/>
        <span className="text-[8px] uppercase text-white/30">PAN</span>
      </div>
      <div className="flex-1 flex justify-center py-2">
        <input type="range" min={0} max={1} step={0.01} value={ch.volume} onChange={e => up({ volume: parseFloat(e.target.value) })}
          className="vertical-slider h-[150px] w-5 accent-pink-400" style={{ writingMode: 'vertical-lr', direction: 'rtl' }}/>
      </div>
      <div className="flex gap-1">
        <button className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ch.mute ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/40'}`} onClick={() => up({ mute: !ch.mute })}>M</button>
        <button className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ch.solo ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40'}`} onClick={() => up({ solo: !ch.solo })}>S</button>
      </div>
    </div>
  );
});

export default function MixerV2(): React.JSX.Element {
  const channels = useSimpleDawStore(s => s.channels);
  const mv = useSimpleDawStore(s => s.masterVolume);
  const mr = useSimpleDawStore(s => s.masterReverb);
  const mw = useSimpleDawStore(s => s.masterWidth);
  const set = (u: any) => { useSimpleDawStore.setState(u); simpleAudioEngine.updateMasterEffects(); };
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1A0A2E', border: '1px solid rgba(200,162,232,0.12)', borderRadius: 6 }}>
      <div className="px-4 py-2 border-b border-white/5 text-xs text-white/40 uppercase tracking-wider">Mixer</div>
      <div className="flex-1 flex overflow-x-auto" style={{ backgroundColor: '#120822', minHeight: 350 }}>
        {channels.map(ch => <Strip key={ch.id} ch={ch}/>)}
        <div className="w-[140px] flex flex-col items-center px-2.5 py-3 border-l-2 border-white/10 h-full" style={{ backgroundColor: '#1e1633' }}>
          <div className="text-[11px] font-bold text-pink-400 mb-3 tracking-wider">MASTER</div>
          <div className="w-full mb-3 flex flex-col gap-2">
            <label className="text-[8px] uppercase text-white/30">REVERB</label>
            <input type="range" min={0} max={1} step={0.01} value={mr} onChange={e => set({ masterReverb: parseFloat(e.target.value) })} className="w-full h-1 accent-cyan-400"/>
            <label className="text-[8px] uppercase text-white/30">3D WIDTH</label>
            <input type="range" min={0} max={1} step={0.01} value={mw} onChange={e => set({ masterWidth: parseFloat(e.target.value) })} className="w-full h-1 accent-cyan-400"/>
          </div>
          <div className="flex-1 flex justify-center">
            <input type="range" min={0} max={1.2} step={0.01} value={mv} onChange={e => set({ masterVolume: parseFloat(e.target.value) })}
              className="vertical-slider h-[200px] w-6 accent-pink-400" style={{ writingMode: 'vertical-lr', direction: 'rtl' }}/>
          </div>
        </div>
      </div>
    </div>
  );
}
