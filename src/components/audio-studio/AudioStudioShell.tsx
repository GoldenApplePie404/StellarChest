// ============================================================
// AudioStudioShell — simple-daw 风格布局 (MIT 移植)
// Transport 顶栏 + 左侧浏览(可折叠) + 中区(Step/Piano并排 + Playlist下方) + Mixer Modal
// ============================================================
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play, Pause, Square, SkipBack, Metronome, Repeat,
  SlidersHorizontal, Upload, Download, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, Save, FolderOpen, Activity,
} from 'lucide-react';
import useAudioStudioStore from '@/store/useAudioStudioStore';
import AudioEngine from '@/engine/AudioEngine';
import StepSequencer from '@/components/audio-studio/StepSequencer';
import PianoRoll from '@/components/audio-studio/PianoRoll';
import PlaylistView from '@/components/audio-studio/PlaylistView';
import Mixer from '@/components/audio-studio/Mixer';
import BrowserPanel from '@/components/audio-studio/BrowserPanel';
import EffectsPanel from '@/components/audio-studio/EffectsPanel';

export default function AudioStudioShell(): React.JSX.Element {
  // Audio Store
  const patterns = useAudioStudioStore((s) => s.patterns);
  const activePatternId = useAudioStudioStore((s) => s.activePatternId);
  const setActivePattern = useAudioStudioStore((s) => s.setActivePattern);
  const activeTrackIndex = useAudioStudioStore((s) => s.activeTrackIndex);
  const addTrack = useAudioStudioStore((s) => s.addTrack);
  const bpm = useAudioStudioStore((s) => s.bpm);
  const setBpm = useAudioStudioStore((s) => s.setBpm);
  const isPlaying = useAudioStudioStore((s) => s.isPlaying);
  const setIsPlaying = useAudioStudioStore((s) => s.setIsPlaying);
  const setTransportPosition = useAudioStudioStore((s) => s.setTransportPosition);
  const transportPosition = useAudioStudioStore((s) => s.transportPosition);
  const metronomeOn = useAudioStudioStore((s) => s.metronomeOn);
  const toggleMetronome = useAudioStudioStore((s) => s.toggleMetronome);
  const mixerChannels = useAudioStudioStore((s) => s.mixerChannels);
  const addPattern = useAudioStudioStore((s) => s.addPattern);

  // Local State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMixerOpen, setMixerOpen] = useState(false);
  const [loopOn, setLoopOn] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizingRef = useRef(false);

  const activePattern = useMemo(() => patterns.find((p) => p.id === activePatternId), [patterns, activePatternId]);
  const activeTrack = useMemo(() => (activePattern?.tracks[activeTrackIndex] ?? null), [activePattern, activeTrackIndex]);
  const totaleNotes = useMemo(() => activePattern?.tracks.reduce((s, t) => s + t.notes.length, 0) || 0, [activePattern]);

  // Sidebar resize
  const startResize = useCallback(() => { resizingRef.current = true; }, []);
  useEffect(() => {
    const move = (e: MouseEvent) => { if (resizingRef.current) setSidebarWidth(Math.max(180, Math.min(600, e.clientX))); };
    const up = () => { resizingRef.current = false; };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, []);

  // Transport
  const handlePlay = useCallback(async () => {
    if (isPlaying) { AudioEngine.pause(); setIsPlaying(false); return; }
    await AudioEngine.init(); AudioEngine.setBpm(bpm); AudioEngine.setMetronome(metronomeOn);
    AudioEngine.setOnPositionUpdate((s) => setTransportPosition(s));
    AudioEngine.setOnPlayStateChange((p) => setIsPlaying(p));
    const p = patterns.find((x) => x.id === activePatternId) ?? patterns[0];
    if (p) await AudioEngine.play(p);
  }, [isPlaying, bpm, metronomeOn, patterns, activePatternId, setIsPlaying, setTransportPosition]);

  const handleStop = useCallback(() => { AudioEngine.stop(); setIsPlaying(false); setTransportPosition(0); }, [setIsPlaying, setTransportPosition]);
  const handleRewind = useCallback(() => { if (isPlaying) { AudioEngine.stop(); setIsPlaying(false); } setTransportPosition(0); }, [isPlaying, setIsPlaying, setTransportPosition]);

  const formatTime = (s: number) => { const m = Math.floor(s/60); const sec = Math.floor(s%60); const ms = Math.floor((s%1)*100); return `${m}:${String(sec).padStart(2,'0')}.${String(ms).padStart(2,'0')}`; };
  const beatPos = useMemo(() => { const beat = transportPosition / (60/bpm); return `${Math.floor(beat/4)+1}.${Math.floor(beat%4)+1}.${Math.floor((beat%1)*4)+1}`; }, [transportPosition, bpm]);

  // MIDI
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const result = await AudioEngine.importMIDI(file); if (!result) return;
    addPattern(result.name);
    const np = useAudioStudioStore.getState().patterns.find(p => p.name === result.name); if (!np) return;
    setActivePattern(np.id);
    for (const td of result.tracks) {
      addTrack(td.instrument as any, td.name);
      const up = useAudioStudioStore.getState().patterns.find(p => p.id === np.id); if (!up) continue;
      const nt = up.tracks[up.tracks.length-1]; if (!nt) continue;
      for (const n of td.notes) useAudioStudioStore.getState().addNote(np.id, nt.id, n.midi, n.start, n.duration, n.velocity);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addPattern, setActivePattern, addTrack]);

  // Fullscreen
  const toggleFull = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen().catch(()=>{});
  }, []);
  useEffect(() => { const h = () => setIsFullscreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT') return; if (e.key === ' ') { e.preventDefault(); handlePlay(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [handlePlay]);

  const colors = {
    bg: '#1A0A2E', bg2: '#2D1B4E', border: 'rgba(200,162,232,0.12)',
    text: '#F5E6FF', textDim: '#C4B5D9', textFaint: '#6A5A7D',
    accent: '#FF6B9D', purple: '#C8A2E8', gold: '#FFD700',
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col select-none" style={{ background: `linear-gradient(160deg, ${colors.bg} 0%, ${colors.bg2} 50%, ${colors.bg} 100%)`, color: colors.text, fontFamily: '"Noto Sans SC", sans-serif' }}>
      {/* Global Studio Styles */}
      <style>{`
        :root { --bg-dark:${colors.bg}; --bg-panel:${colors.bg2}; --bg-element:rgba(61,42,94,0.6); --bg-hover:rgba(74,53,112,0.8); --primary:${colors.accent}; --primary-hover:#FF8DB0; --text-main:${colors.text}; --text-dim:${colors.textDim}; --border:${colors.border}; }
        ::-webkit-scrollbar{width:6px;height:6px}.studio-scroll::-webkit-scrollbar-track{background:transparent}.studio-scroll::-webkit-scrollbar-thumb{background:rgba(200,162,232,0.2);border-radius:3px}.studio-scroll::-webkit-scrollbar-thumb:hover{background:${colors.accent}}
        .btn-sd{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:rgba(61,42,94,0.55);color:${colors.textDim};border:1px solid ${colors.border};padding:5px 10px;border-radius:5px;cursor:pointer;font-size:11px;transition:all 0.15s}.btn-sd:hover{background:rgba(74,53,112,0.8);color:${colors.text}}.btn-sd.active{background:rgba(255,107,157,0.2);border-color:rgba(255,107,157,0.4);color:${colors.accent};box-shadow:0 0 10px rgba(255,107,157,0.15)}
        .play-btn{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 30% 30%,rgba(255,107,157,0.5),rgba(255,107,157,0.2));border:1px solid rgba(255,107,157,0.45);color:#FFB3CC;cursor:pointer;box-shadow:0 0 14px rgba(255,107,157,0.25);transition:all 0.15s}.play-btn:hover{box-shadow:0 0 20px rgba(255,107,157,0.45);transform:translateY(-1px)}.play-btn:active{transform:scale(0.95)}
        .time-display{font-family:"JetBrains Mono",monospace;font-size:14px;font-weight:600;color:${colors.gold};text-shadow:0 0 10px rgba(255,215,0,0.25)}.beat-display{font-family:"JetBrains Mono",monospace;font-size:10px;color:${colors.purple}}
        .panel-sd{background:${colors.bg2};border:1px solid ${colors.border};border-radius:6px;overflow:hidden}
        .panel-hdr{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid ${colors.border};font-size:11px;font-weight:600;color:${colors.textDim};text-transform:uppercase;letter-spacing:0.5px}
      `}</style>

      {/* ===== Transport Bar ===== */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2" style={{ background: `linear-gradient(180deg, rgba(45,27,78,0.95), rgba(26,10,46,0.98))`, borderBottom: `1px solid ${colors.border}` }}>
        {/* Logo */}
        <span className="text-xs font-bold mr-2" style={{ background: 'linear-gradient(135deg, #FF6B9D, #C8A2E8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Music Studio</span>

        {/* Play / Stop / Rewind */}
        <div className="flex items-center gap-1">
          <button onClick={handleRewind} className="btn-sd" title="回到起点"><SkipBack size={12}/></button>
          <button onClick={handlePlay} className="play-btn">{isPlaying ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor" style={{marginLeft:2}}/>}</button>
          <button onClick={handleStop} className="btn-sd"><Square size={11} fill="currentColor"/></button>
        </div>

        {/* Loop + Metronome */}
        <div className="flex items-center gap-1">
          <button onClick={() => setLoopOn(!loopOn)} className={`btn-sd ${loopOn ? 'active' : ''}`} title="循环"><Repeat size={12}/></button>
          <button onClick={toggleMetronome} className={`btn-sd ${metronomeOn ? 'active' : ''}`} title="节拍器"><Metronome size={12}/></button>
        </div>

        {/* BPM */}
        <div className="flex flex-col items-center" style={{width:70}}>
          <div className="flex justify-between w-full text-[9px]" style={{color:colors.textFaint}}><span>BPM</span><span>{bpm}</span></div>
          <input type="range" min={40} max={240} value={bpm} onChange={e => { const v=Number(e.target.value); setBpm(v); AudioEngine.setBpm(v); }} style={{width:'100%',accentColor:colors.accent,height:4}}/>
        </div>

        {/* Time */}
        <div className="flex flex-col items-center leading-tight ml-1">
          <span className="time-display">{formatTime(transportPosition)}</span>
          <span className="beat-display">{beatPos}</span>
        </div>

        <div className="flex-1"/>

        {/* Mixer Toggle */}
        <button onClick={() => setMixerOpen(!isMixerOpen)} className={`btn-sd ${isMixerOpen ? 'active' : ''}`} title="混音台 (F9)">
          <SlidersHorizontal size={13}/><span className="text-[10px] font-bold">MIXER</span>
        </button>

        {/* File */}
        <div className="relative">
          <button className="btn-sd" onClick={e => { e.stopPropagation(); setShowFileMenu(!showFileMenu); }}><FolderOpen size={13}/></button>
          {showFileMenu && <div className="absolute top-full right-0 mt-1 z-50 min-w-[140px] rounded-lg py-1 shadow-xl" style={{background:colors.bg2,border:`1px solid ${colors.border}`}} onClick={e => e.stopPropagation()}>
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors" style={{color:colors.textDim}} onClick={() => { fileInputRef.current?.click(); setShowFileMenu(false); }}><Upload size={12} className="inline mr-1"/>导入 MIDI</button>
            <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors" style={{color:colors.textDim}} onClick={() => { activePattern && AudioEngine.exportMIDI(activePattern); setShowFileMenu(false); }}><Download size={12} className="inline mr-1"/>导出 MIDI</button>
          </div>}
        </div>
        <input ref={fileInputRef} type="file" accept=".mid,.midi" onChange={handleImport} className="hidden"/>

        {/* Fullscreen */}
        <button onClick={toggleFull} className="btn-sd">{isFullscreen ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}</button>
      </div>

      {/* ===== Main Area ===== */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        {!sidebarCollapsed && <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{width:sidebarWidth,borderRight:`1px solid ${colors.border}`,transition:'width 0.15s ease'}}>
          <div className="flex items-center gap-1 px-3 py-2 border-b" style={{borderColor:colors.border}}>
            <button className="btn-sd" onClick={() => setSidebarCollapsed(true)}><ChevronLeft size={14}/></button>
            <span className="text-[10px] font-semibold tracking-wider ml-1" style={{color:colors.textFaint}}>BROWSER</span>
          </div>
          <div className="flex-1 overflow-y-auto studio-scroll"><BrowserPanel collapsed={false} onToggleCollapse={() => {}}/></div>
        </div>}

        {sidebarCollapsed && <button onClick={() => setSidebarCollapsed(false)} className="btn-sd h-8 w-8 flex-shrink-0 m-2" title="展开浏览器"><ChevronRight size={14}/></button>}

        {/* Resizer */}
        {!sidebarCollapsed && <div onMouseDown={startResize} style={{width:3,cursor:'col-resize',background:'transparent',flexShrink:0}}/>}

        {/* Workspace */}
        <div className="flex-1 flex flex-col min-w-0 p-2 gap-2 overflow-hidden">
          {/* Top: ChannelRack + PianoRoll side by side */}
          <div className="flex gap-2" style={{height:'45%',minHeight:200}}>
            <div className="flex-1 min-w-0 panel-sd flex flex-col" style={{maxWidth:'50%'}}>
              <div className="panel-hdr"><span>CHANNEL RACK</span></div>
              <div className="flex-1 overflow-auto studio-scroll"><StepSequencer/></div>
            </div>
            <div className="flex-1 min-w-0 panel-sd flex flex-col">
              <div className="panel-hdr flex items-center justify-between">
                <span>PIANO ROLL</span>
                <select value={activeTrackIndex} onChange={e => useAudioStudioStore.getState().setActiveTrackIndex(Number(e.target.value))}
                  className="text-[10px] px-2 py-0.5 rounded border outline-none" style={{background:'rgba(45,27,78,0.6)',borderColor:colors.border,color:colors.text,maxWidth:140}}>
                  {activePattern?.tracks.map((t,i) => <option key={t.id} value={i} style={{background:'#2D1B4E',color:colors.text}}>{t.name}</option>)}
                </select>
                <select value={activePatternId} onChange={e => setActivePattern(e.target.value)}
                  className="text-[10px] px-2 py-0.5 rounded border outline-none" style={{background:'rgba(45,27,78,0.6)',borderColor:colors.border,color:colors.text,maxWidth:140}}>
                  {patterns.map(p => <option key={p.id} value={p.id} style={{background:'#2D1B4E',color:colors.text}}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex-1 overflow-auto studio-scroll"><PianoRoll/></div>
            </div>
          </div>

          {/* Bottom: Playlist full width */}
          <div className="flex-1 min-h-0 panel-sd flex flex-col">
            <div className="panel-hdr">
              <span>PLAYLIST</span>
              <span className="ml-auto text-[9px] font-normal" style={{color:colors.textFaint}}>{totaleNotes} notes &middot; {activePattern?.tracks.length||0} tracks</span>
            </div>
            <div className="flex-1 overflow-auto studio-scroll"><PlaylistView/></div>
          </div>
        </div>
      </div>

      {/* ===== Status Bar ===== */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-1" style={{background:`linear-gradient(0deg,${colors.bg},${colors.bg2})`,borderTop:`1px solid ${colors.border}`,height:28,fontSize:11,color:colors.textFaint}}>
        <Activity size={12}/> <span>44100Hz | 24bit | Tone.js</span>
        <span className="ml-auto">{totaleNotes} 音符 &middot; {patterns.length} 模板</span>
      </div>

      {/* ===== Mixer Modal ===== */}
      {isMixerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)'}} onClick={() => setMixerOpen(false)}>
          <div className="flex flex-col rounded-lg overflow-hidden shadow-2xl" style={{width:'85%',maxWidth:1000,maxHeight:'80vh',background:colors.bg2,border:`2px solid ${colors.border}`}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2" style={{borderBottom:`1px solid ${colors.border}`,background:'rgba(26,10,46,0.5)'}}>
              <span className="text-sm font-bold flex items-center gap-2" style={{color:colors.accent}}><SlidersHorizontal size={16}/> MIXER</span>
              <button className="btn-sd" onClick={() => setMixerOpen(false)}>✕</button>
            </div>
            <div className="flex-1 overflow-auto studio-scroll flex" style={{minHeight:360}}>
              <div className="flex-1"><Mixer/></div>
            </div>
            {activeTrack && mixerChannels.find(m => m.id === activeTrack.id) && (
              <div className="flex-shrink-0 overflow-y-auto studio-scroll px-3 py-2" style={{borderTop:`1px solid ${colors.border}`,maxHeight:160}}>
                <EffectsPanel channelId={mixerChannels.find(m => m.id === activeTrack.id)!.id}/>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
