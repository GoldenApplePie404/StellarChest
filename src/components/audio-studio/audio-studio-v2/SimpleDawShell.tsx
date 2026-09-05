// ============================================================
// SimpleDawShell — simple-daw 完整移植 (MIT)
// Transport顶 + Browser左(折叠) + (ChannelRack|PianoRoll)上 + Playlist下 + Mixer Modal
// ============================================================
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Save, FolderOpen, Download, Upload, Activity, FileUp, TvMinimalPlay,
  SlidersHorizontal,
} from 'lucide-react';
import { useSimpleDawStore } from '@/store/useSimpleDawStore';
import { simpleAudioEngine } from '@/engine/SimpleAudioEngine';
import Transport from '@/components/audio-studio/audio-studio-v2/Transport';
import ChannelRack from '@/components/audio-studio/audio-studio-v2/ChannelRack';
import PianoRoll from '@/components/audio-studio/audio-studio-v2/PianoRoll';
import Playlist from '@/components/audio-studio/audio-studio-v2/Playlist';
import Mixer from '@/components/audio-studio/audio-studio-v2/Mixer';
import SoundSearchModal from '@/components/audio-studio/audio-studio-v2/SoundSearchModal';
import SynthEditorV2 from '@/components/audio-studio/audio-studio-v2/SynthEditorV2';

export default function SimpleDawShell(): React.JSX.Element {
  const channels = useSimpleDawStore((s) => s.channels);
  const projects = useSimpleDawStore((s) => s.projects);
  const savedSounds = useSimpleDawStore((s) => s.savedSounds);
  const saveProject = useSimpleDawStore((s) => s.saveProject);
  const loadProject = useSimpleDawStore((s) => s.loadProject);
  const deleteProject = useSimpleDawStore((s) => s.deleteProject);
  const addChannel = useSimpleDawStore((s) => s.addChannel);
  const removeSound = useSimpleDawStore((s) => s.removeSoundFromLibrary);
  const isMixerOpen = useSimpleDawStore((s) => s.isMixerOpen);
  const setMixerOpen = useSimpleDawStore((s) => s.setMixerOpen);

  const [sidebar, setSidebar] = useState({ w: 240, collapsed: false });
  const [sidebarTab, setSidebarTab] = useState<'projects' | 'sounds'>('projects');
  const resizeRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const midiRef = useRef<HTMLInputElement>(null);
  const [showSynth, setShowSynth] = useState(false);

  const handleImportMidi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    await simpleAudioEngine.importMIDI(file);
    if (midiRef.current) midiRef.current.value = '';
  };

  const startResize = () => { resizeRef.current = true; };
  useEffect(() => {
    const m = (e: MouseEvent) => { if (resizeRef.current) setSidebar((s) => ({ ...s, w: Math.max(160, Math.min(500, e.clientX)) })); };
    const u = () => { resizeRef.current = false; };
    document.addEventListener('mousemove', m); document.addEventListener('mouseup', u);
    return () => { document.removeEventListener('mousemove', m); document.removeEventListener('mouseup', u); };
  }, []);

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { loadProject(JSON.parse(ev.target?.result as string)); } catch { alert('Invalid project file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const c = { bg: '#1A0A2E', bg2: '#2D1B4E', border: 'rgba(200,162,232,0.12)', accent: '#FF6B9D', text: '#F5E6FF', dim: '#C4B5D9', faint: '#6A5A7D' };

  // Keyboard shortcuts
  const isPlaying = useSimpleDawStore((s) => s.isPlaying);
  const togglePlay = useSimpleDawStore((s) => s.togglePlay);
  const selectedChannelId = useSimpleDawStore((s) => s.selectedChannelId);
  const deleteChannel = useSimpleDawStore((s) => s.deleteChannel);

  const handlePlay = useCallback(async () => {
    if (!simpleAudioEngine.initialized) await simpleAudioEngine.init();
    const next = !isPlaying;
    simpleAudioEngine.togglePlay(next);
    togglePlay();
  }, [isPlaying, togglePlay]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); handlePlay(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedChannelId && channels.length > 1) { deleteChannel(selectedChannelId); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePlay, selectedChannelId, channels.length, deleteChannel]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col select-none" style={{ background: c.bg, color: c.text, fontFamily: '"Inter", "Noto Sans SC", sans-serif' }}>
      <style>{`
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(200,162,232,0.2);border-radius:3px}
        .studio-scroll::-webkit-scrollbar-thumb:hover{background:${c.accent}}
        .vertical-slider{writing-mode:vertical-lr;direction:rtl;appearance:slider-vertical;-webkit-appearance:slider-vertical}
      `}</style>

      {/* ===== Transport ==== */}
      <Transport/>

      {/* ===== Main ==== */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        {!sidebar.collapsed && (
          <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: sidebar.w, borderRight: `1px solid ${c.border}`, transition: 'width 0.15s ease' }}>
            <div className="flex items-center gap-1 px-3 py-2 border-b" style={{ borderColor: c.border }}>
              <button className="p-1 rounded hover:bg-white/5 text-white/40" onClick={() => setSidebar((s) => ({ ...s, collapsed: true }))}><ChevronLeft size={14}/></button>
              <button className="p-1 rounded hover:bg-white/5 text-white/40" onClick={() => saveProject(`Project ${projects.length + 1}`)}><Save size={14}/></button>
              <button className="p-1 rounded hover:bg-white/5 text-white/40" onClick={() => fileRef.current?.click()}><FolderOpen size={14}/></button>
              <button className="p-1 rounded hover:bg-white/5 text-white/40" onClick={() => simpleAudioEngine.exportToWav()}><Download size={14}/></button>
              <button className="p-1 rounded hover:bg-white/5 text-white/40" onClick={() => midiRef.current?.click()}><Upload size={14}/></button>
              <button className="p-1 rounded hover:bg-white/5 text-white/40" onClick={() => simpleAudioEngine.exportMIDI()} title="Export MIDI"><FileUp size={14}/></button>
              <div className="w-px h-4 mx-0.5" style={{ backgroundColor: c.border }}/>
              <button className={`p-1 rounded ${showSynth ? ' text-pink-400' : 'text-white/40'} hover:bg-white/5`} onClick={() => setShowSynth(!showSynth)} title="Synth Editor"><TvMinimalPlay size={14}/></button>
              <input ref={midiRef} type="file" accept=".mid,.midi" onChange={handleImportMidi} className="hidden"/>
              <input ref={fileRef} type="file" accept=".json" onChange={handleLoadFile} className="hidden"/>
            </div>

            <div className="flex border-b" style={{ borderColor: c.border }}>
              {(['projects', 'sounds'] as const).map((tab) => (
                <button key={tab} onClick={() => setSidebarTab(tab)} className="flex-1 py-2 text-[10px] font-bold tracking-wider transition-colors"
                  style={{ background: sidebarTab === tab ? c.bg : 'transparent', color: sidebarTab === tab ? c.accent : c.faint, border: 'none' }}>
                  {tab === 'projects' ? 'PROJECTS' : 'SOUNDS'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-2 text-xs" style={{ color: c.dim }}>
              {sidebarTab === 'projects' ? (
                projects.length === 0 ? <div className="italic p-2">No saved projects</div> :
                projects.map((p) => (
                  <div key={p.id} className="flex justify-between items-center px-2 py-1.5 rounded cursor-pointer hover:bg-white/5" onClick={() => loadProject(p)}>
                    <div className="truncate flex-1">{p.name}<br/><span className="text-[10px] text-white/20">{p.date ? new Date(p.date).toLocaleDateString() : ''}</span></div>
                  </div>
                ))
              ) : (
                savedSounds.length === 0 ? <div className="italic p-2">No saved sounds</div> :
                savedSounds.map((s) => (
                  <div key={s.id} className="flex justify-between items-center px-2 py-1.5 rounded cursor-pointer hover:bg-white/5" onClick={() => addChannel(s.name, 'sampler', s.previews?.['preview-hq-ogg'] || s.url)}>
                    <div className="truncate flex-1">{s.name}<br/><span className="text-[10px] text-white/20">{s.username}</span></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {sidebar.collapsed && (
          <button onClick={() => setSidebar((s) => ({ ...s, collapsed: false }))} className="flex-shrink-0 p-1 m-2 rounded hover:bg-white/5 text-white/40"><ChevronRight size={14}/></button>
        )}

        {!sidebar.collapsed && <div onMouseDown={startResize} className="flex-shrink-0 w-1 cursor-col-resize"/>}

        {/* Workspace */}
        <div className="flex-1 flex flex-col p-2 gap-2 min-w-0 overflow-hidden">
          {/* Top: ChannelRack + PianoRoll */}
          <div className="flex gap-2" style={{ height: showSynth ? '38%' : '48%', minHeight: 160 }}>
            <div className="flex-1 min-w-0" style={{ maxWidth: '50%' }}><ChannelRack/></div>
            <div className="flex-1 min-w-0"><PianoRoll/></div>
          </div>

          {/* Synth Editor (collapsible) */}
          {showSynth && selectedChannelId && channels.find(c => c.id === selectedChannelId)?.type === 'synth' && (
            <div className="flex-shrink-0" style={{ maxHeight: 120 }}>
              <SynthEditorV2
                channelId={selectedChannelId}
                config={channels.find(c => c.id === selectedChannelId)!.synthConfig || {
                  oscillatorType: 'sine', attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5,
                  filterCutoff: 20000, filterResonance: 0.1, filterType: 'lowpass',
                }}
                onChange={cfg => useSimpleDawStore.getState().updateChannel(selectedChannelId, { synthConfig: cfg })}
              />
            </div>
          )}
          {showSynth && (!selectedChannelId || channels.find(c => c.id === selectedChannelId)?.type !== 'synth') && (
            <div className="flex-shrink-0 flex items-center justify-center text-white/20 text-xs" style={{ height: 80 }}>Select a synth channel to edit</div>
          )}

          {/* Bottom: Playlist */}
          <div className="flex-1 min-h-0"><Playlist/></div>

          {/* Status bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1 rounded-md text-[11px]" style={{ height: 28, backgroundColor: c.bg2, border: `1px solid ${c.border}`, color: c.faint }}>
            <Activity size={12}/>44100Hz | 24bit | Tone.js &middot; {channels.length} channels
          </div>
        </div>
      </div>

      {/* ===== Mixer Modal ==== */}
      {isMixerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={() => setMixerOpen(false)}>
          <div className="flex flex-col rounded-lg overflow-hidden shadow-2xl" style={{ width: '88%', maxWidth: 1100, maxHeight: '82vh', backgroundColor: c.bg, border: `2px solid ${c.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: c.border, backgroundColor: 'rgba(26,10,46,0.5)' }}>
              <span className="text-sm font-bold flex items-center gap-2" style={{ color: c.accent }}><SlidersHorizontal size={16}/>MIXER</span>
              <button className="px-3 py-1 rounded-md text-sm hover:bg-white/5 text-white/40" onClick={() => setMixerOpen(false)}>✕</button>
            </div>
            <div className="flex-1 overflow-auto" style={{ minHeight: 380 }}><Mixer/></div>
          </div>
        </div>
      )}

      {/* Sound Search Modal */}
      <SoundSearchModal/>
    </div>
  );
}
