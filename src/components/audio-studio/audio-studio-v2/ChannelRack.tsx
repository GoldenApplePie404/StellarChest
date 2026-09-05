// ============================================================
// ChannelRack — simple-daw 移植 (MIT)
// Step 网格 + channel 设置 popover(trim/rootNote)
// ============================================================
'use client';

import React, { useState, useEffect } from 'react';
import { useSimpleDawStore, type SimpleChannel } from '@/store/useSimpleDawStore';
import { simpleAudioEngine } from '@/engine/SimpleAudioEngine';
import { Settings2, Trash2, Save } from 'lucide-react';

function Step({ active, current, onClick }: { active: boolean; current: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      width: 24, height: 32, cursor: 'pointer', borderRadius: 3,
      backgroundColor: active ? '#FF6B9D' : current ? 'rgba(255,107,157,0.15)' : 'rgba(61,42,94,0.6)',
      border: `1px solid ${current ? '#FF6B9D' : 'rgba(200,162,232,0.15)'}`,
      boxShadow: active ? '0 0 10px rgba(255,107,157,0.5)' : 'none',
      transition: 'all 0.1s ease',
    }}/>
  );
}

function ChannelRow({ channel }: { channel: SimpleChannel }) {
  const toggleStep = useSimpleDawStore((s) => s.toggleStep);
  const currentStep = useSimpleDawStore((s) => s.currentStep);
  const selectedChannelId = useSimpleDawStore((s) => s.selectedChannelId);
  const setSelectedChannelId = useSimpleDawStore((s) => s.setSelectedChannelId);
  const deleteChannel = useSimpleDawStore((s) => s.deleteChannel);
  const updateChannel = useSimpleDawStore((s) => s.updateChannel);
  const saveSoundToLibrary = useSimpleDawStore((s) => s.saveSoundToLibrary);
  const sequenceLength = useSimpleDawStore((s) => s.sequenceLength);

  const [showSettings, setShowSettings] = useState(false);
  const isActive = selectedChannelId === channel.id;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (showSettings && !(e.target as HTMLElement).closest('.ch-popover') && !(e.target as HTMLElement).closest('.ch-settings-btn'))
        setShowSettings(false);
    };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [showSettings]);

  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const colors = { bg: '#1A0A2E', border: 'rgba(200,162,232,0.12)', accent: '#FF6B9D', text: '#F5E6FF', dim: '#C4B5D9', faint: '#6A5A7D' };

  return (
    <div onClick={() => setSelectedChannelId(channel.id)} className="flex items-center border-b border-white/5 cursor-pointer" style={{
      backgroundColor: isActive ? 'rgba(255,107,157,0.08)' : 'transparent', width: 'max-content', minWidth: '100%', position: 'relative',
    }}>
      {/* Sticky channel info */}
      <div className="w-[220px] flex-shrink-0 flex items-center gap-2 px-3 py-2.5 sticky left-0 z-10 border-r border-white/5" style={{
        backgroundColor: isActive ? 'rgba(45,27,78,1)' : colors.bg,
      }}>
        <div className="w-1 h-5 flex-shrink-0 rounded" style={{ backgroundColor: channel.color }}/>
        <span className="text-[13px] font-medium truncate flex-1" style={{ color: isActive ? colors.accent : colors.text }}>
          {channel.name}
        </span>
        <button className="ch-settings-btn p-1 rounded hover:bg-white/5 text-white/30" onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}>
          <Settings2 size={14}/>
        </button>
        <button className="p-1 rounded hover:text-red-400 text-white/30" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${channel.name}?`)) { simpleAudioEngine.disposeChannel(channel.id); deleteChannel(channel.id); }}}>
          <Trash2 size={14}/>
        </button>
      </div>

      {/* Settings popover */}
      {showSettings && (
        <div className="ch-popover absolute top-full left-5 z-50 w-72 rounded-lg p-4 shadow-xl" style={{ backgroundColor: '#1e1633', border: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
          <h4 className="text-sm font-bold mb-3 pb-2 border-b" style={{ color: colors.accent, borderColor: colors.border }}>Channel: {channel.name}</h4>
          {channel.type === 'sampler' ? (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xs text-white/50">Root Note</label>
                <select value={channel.rootNote || 'C3'} onChange={(e) => updateChannel(channel.id, { rootNote: e.target.value })}
                  className="text-[11px] px-2 py-1 rounded border outline-none" style={{ background: '#111', borderColor: colors.border, color: colors.text }}>
                  {notes.map(n => [0,1,2,3,4,5,6,7,8].map(o => {
                    const nn = `${n}${o}`;
                    return <option key={nn} value={nn}>{nn} {nn === 'C3' ? '(Default)' : ''}</option>;
                  }))}
                </select>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-white/40 mb-1"><span>Trim Start</span><span>{(channel.trimStart||0).toFixed(2)}s</span></div>
                <input type="range" min={0} max={2} step={0.01} value={channel.trimStart||0} onChange={(e) => { const v=parseFloat(e.target.value); updateChannel(channel.id,{trimStart:v}); simpleAudioEngine.updateChannelSettings({...channel,trimStart:v}); }}
                  className="w-full h-1 accent-pink-400"/>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-white/40 mb-1"><span>Trim End</span><span>{(channel.trimEnd||0).toFixed(2)}s</span></div>
                <input type="range" min={0} max={2} step={0.01} value={channel.trimEnd||0} onChange={(e) => { const v=parseFloat(e.target.value); updateChannel(channel.id,{trimEnd:v}); simpleAudioEngine.updateChannelSettings({...channel,trimEnd:v}); }}
                  className="w-full h-1 accent-pink-400"/>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-white/30">Synthesizer channel. Sample settings unavailable.</div>
          )}
          <hr className="my-3 border-white/5"/>
          <button className="text-[10px] px-3 py-1.5 rounded flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 transition-colors"
            onClick={() => { if (channel.sampleUrl) { saveSoundToLibrary({ name: channel.name, username: 'User', url: channel.sampleUrl }); setShowSettings(false); } }}>
            <Save size={11}/>Save to Library
          </button>
        </div>
      )}

      {/* Step grid */}
      <div className="flex items-center gap-1 px-3 py-2.5">
        {channel.steps.slice(0, sequenceLength).map((active, i) => (
          <React.Fragment key={i}>
            <Step active={active} current={(currentStep % sequenceLength) === i} onClick={() => toggleStep(channel.id, i)}/>
            {(i + 1) % 4 === 0 && (i + 1) !== sequenceLength && <div style={{ width: 8 }}/>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default function ChannelRack(): React.JSX.Element {
  const channels = useSimpleDawStore((s) => s.channels);
  const addChannel = useSimpleDawStore((s) => s.addChannel);
  const setSoundSearchOpen = useSimpleDawStore((s) => s.setSoundSearchOpen);
  const [showMenu, setShowMenu] = useState(false);

  const instruments = [
    { name: 'Kick', type: 'sampler' as const }, { name: 'Snare', type: 'sampler' as const },
    { name: 'HiHat', type: 'sampler' as const }, { name: 'Clap', type: 'sampler' as const },
    { name: 'Synth', type: 'synth' as const },
  ];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1A0A2E', border: '1px solid rgba(200,162,232,0.12)', borderRadius: 6, overflow: 'hidden' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(200,162,232,0.12)' }}>
        <span className="text-[11px] font-semibold tracking-wider uppercase text-white/40">Channel Rack</span>
        <div className="relative">
          <button className="text-[10px] px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/50 transition-colors" onClick={() => setShowMenu(!showMenu)}>+ ADD TRACK</button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 z-50 w-40 rounded-md py-1 shadow-xl" style={{ backgroundColor: '#1e1633', border: '1px solid rgba(200,162,232,0.12)' }}>
              {instruments.map((inst) => (
                <div key={inst.name} onClick={() => { addChannel(inst.name, inst.type); setShowMenu(false); }}
                  className="px-3 py-2 text-xs cursor-pointer hover:bg-white/5 text-white/70 transition-colors">{inst.name}</div>
              ))}
              <div onClick={() => { setSoundSearchOpen(true); setShowMenu(false); }}
                className="px-3 py-2 text-xs cursor-pointer hover:bg-white/5 text-pink-400 font-bold transition-colors">Search Freesound...</div>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto studio-scroll">
        {channels.map((ch) => <ChannelRow key={ch.id} channel={ch}/>)}
      </div>
    </div>
  );
}
