// ============================================================
// PianoRoll v2 — simple-daw 原版直译 (MIT)
// 网格单元格 + QWERTY 键盘输入 + 拖拽扩展 + 录制
// ============================================================
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSimpleDawStore } from '@/store/useSimpleDawStore';
import { simpleAudioEngine } from '@/engine/SimpleAudioEngine';

const NOTES = ['B','A#','A','G#','G','F#','F','E','D#','D','C#','C'];
const OCTAVES = [5,4,3,2];
const ALL_NOTES = OCTAVES.flatMap(o => NOTES.map(n => `${n}${o}`));

const KEY_TO_NOTE: Record<string, string> = {
  'z':'C4','s':'C#4','x':'D4','d':'D#4','c':'E4','v':'F4','g':'F#4','b':'G4','h':'G#4','n':'A4','j':'A#4','m':'B4',
  ',':'C5','l':'C#5','.':'D5',';':'D#5','/':'E5',
  'q':'C5','2':'C#5','w':'D5','3':'D#5','e':'E5','4':'F5','r':'F#5','5':'G5','t':'G#5','6':'A5','y':'A#5','7':'B5',
};

export default function PianoRollV2(): React.JSX.Element {
  const channels = useSimpleDawStore(s => s.channels);
  const selectedId = useSimpleDawStore(s => s.selectedChannelId);
  const updateChannel = useSimpleDawStore(s => s.updateChannel);
  const currentStep = useSimpleDawStore(s => s.currentStep);
  const setCurrentStep = useSimpleDawStore(s => s.setCurrentStep);
  const sequenceLength = useSimpleDawStore(s => s.sequenceLength);
  const isRecording = useSimpleDawStore(s => s.isRecording);
  const clearChannelNotes = useSimpleDawStore(s => s.clearChannelNotes);

  const channel = channels.find(c => c.id === selectedId);
  const [activeKeys, setActiveKeys] = useState<Record<string, boolean>>({});
  const [dragNote, setDragNote] = useState<{ pitch: string; time: number } | null>(null);
  const recordingNotesRef = useRef<Record<string, number>>({});
  const stateRef = useRef({ selectedId, isRecording, currentStep, sequenceLength, channel });

  useEffect(() => { stateRef.current = { selectedId, isRecording, currentStep, sequenceLength, channel }; }, [selectedId, isRecording, currentStep, sequenceLength, channel]);

  const playNote = (pitch: string) => {
    const { channel: ch, isRecording: rec, currentStep: cs } = stateRef.current;
    if (!ch) return;
    setActiveKeys(prev => ({ ...prev, [pitch]: true }));
    simpleAudioEngine.triggerSound(ch, pitch);
    if (rec && recordingNotesRef.current[pitch] === undefined) {
      recordingNotesRef.current[pitch] = cs;
    }
  };

  const stopNote = (pitch: string) => {
    setActiveKeys(prev => ({ ...prev, [pitch]: false }));
    const { isRecording: rec, currentStep: cs, sequenceLength: sl, selectedId: sid } = stateRef.current;
    if (rec && recordingNotesRef.current[pitch] !== undefined) {
      const startTime = recordingNotesRef.current[pitch]!;
      delete recordingNotesRef.current[pitch];
      let duration = cs - startTime;
      if (cs <= startTime) duration = cs < startTime ? (sl - startTime) + cs : 1;
      if (duration < 1) duration = 1;
      const fresh = useSimpleDawStore.getState().channels.find(c => c.id === sid);
      if (fresh) updateChannel(sid!, { notes: [...fresh.notes, { id: Math.random().toString(36).substr(2,9), pitch, time: startTime, duration, velocity: 100 }] });
    }
  };

  // QWERTY keyboard
  useEffect(() => {
    const kd = (e: KeyboardEvent) => { if (e.repeat || (e.target as HTMLElement)?.tagName === 'INPUT') return; const n = KEY_TO_NOTE[e.key.toLowerCase()]; if (n) playNote(n); };
    const ku = (e: KeyboardEvent) => { const n = KEY_TO_NOTE[e.key.toLowerCase()]; if (n) stopNote(n); };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useEffect(() => { const up = () => setDragNote(null); window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up); }, []);

  if (!channel) return <div className="flex items-center justify-center h-full text-white/30 text-sm">Select a channel to edit notes</div>;

  const handleCellMouseDown = (pitch: string, time: number) => {
    const idx = (channel.notes || []).findIndex(n => n.pitch === pitch && Number(n.time) === Number(time));
    if (idx > -1) {
      const newNotes = [...channel.notes];
      newNotes.splice(idx, 1);
      updateChannel(channel.id, { notes: newNotes });
      setDragNote(null);
    } else {
      simpleAudioEngine.triggerSound(channel, pitch);
      const newNote = { id: Math.random().toString(36).substr(2,9), pitch, time: Number(time), duration: 1, velocity: 100 };
      updateChannel(channel.id, { notes: [...channel.notes, newNote] });
      setDragNote({ pitch, time: Number(time) });
    }
  };

  const handleCellMouseEnter = (pitch: string, time: number) => {
    if (dragNote && pitch === dragNote.pitch && Number(time) >= dragNote.time) {
      const dur = Math.max(1, Math.min(64, Number(time) - dragNote.time + 1));
      const newNotes = channel.notes.map(n => (n.pitch === dragNote.pitch && Number(n.time) === dragNote.time) ? { ...n, duration: dur } : n);
      updateChannel(channel.id, { notes: newNotes });
    }
  };

  const totalWidth = sequenceLength * 32;
  const colors = { border: 'rgba(200,162,232,0.12)', accent: '#FF6B9D' };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none" style={{ backgroundColor: '#1A0A2E' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b text-[11px]" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-3">
          <span className="font-bold" style={{ color: '#F5E6FF' }}>PIANO ROLL: {channel.name}</span>
          <button onClick={() => clearChannelNotes(channel.id)} className="px-2 py-0.5 rounded text-[10px] border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors">Clear Notes</button>
        </div>
        <div className="flex gap-4" style={{ color: '#C4B5D9' }}>
          {isRecording && <span className="text-red-500 font-bold animate-pulse">REC</span>}
          <span>Notes: {channel.notes.length}</span>
          <span>1/16 Grid</span>
        </div>
      </div>

      {/* Grid area */}
      <div className="flex flex-1 overflow-auto" style={{ backgroundColor: '#0d0616' }}>
        {/* Piano keys */}
        <div className="w-[60px] flex-shrink-0 sticky left-0 z-10 border-r" style={{ backgroundColor: '#120822', borderColor: '#2a1a3e' }}>
          <div className="h-6 border-b" style={{ backgroundColor: '#000', borderColor: '#2a1a3e' }}/>
          {ALL_NOTES.map(note => (
            <div key={note} onMouseDown={e => { e.preventDefault(); playNote(note); }} onMouseUp={e => { e.preventDefault(); stopNote(note); }} onMouseLeave={() => { if (activeKeys[note]) stopNote(note); }}
              className="h-6 border-b text-[9px] flex items-center pl-1.5 font-bold transition-colors cursor-pointer"
              style={{
                borderColor: '#1a0e2e',
                backgroundColor: activeKeys[note] ? colors.accent : (note.includes('#') ? '#0d0616' : '#1e1633'),
                color: activeKeys[note] ? '#fff' : (note.includes('#') ? '#4a3a5a' : '#C4B5D9'),
              }}>
              {note}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 relative">
          <div onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setCurrentStep(Math.floor((e.clientX - rect.left) / 32) % sequenceLength); }}
            className="h-6 border-b cursor-pointer" style={{ width: totalWidth, backgroundColor: '#120822', borderColor: '#2a1a3e' }}/>
          <div className="relative" style={{ width: totalWidth,
            background: 'linear-gradient(90deg, #1a0e2e 1px, transparent 1px), linear-gradient(#1a0e2e 1px, transparent 1px)',
            backgroundSize: '32px 24px', backgroundColor: '#0d0616' }}>
            {ALL_NOTES.map(note => (
              <div key={note} className="flex" style={{ height: 24 }}>
                {Array.from({ length: sequenceLength }).map((_, i) => {
                  const noteAtCell = channel.notes.find(n => n.pitch === note && i >= Number(n.time) && i < Number(n.time) + (typeof n.duration === 'number' ? n.duration : 1));
                  const isActive = !!noteAtCell;
                  const isStart = noteAtCell && Number(noteAtCell.time) === i;
                  return (
                    <div key={i} onMouseDown={e => { e.preventDefault(); handleCellMouseDown(note, i); }} onMouseEnter={() => handleCellMouseEnter(note, i)}
                      className="cursor-crosshair box-border flex-shrink-0"
                      style={{
                        minWidth: 32, height: 24,
                        borderRight: i % 4 === 3 ? '1px solid #2a1a3e' : '1px solid rgba(200,162,232,0.03)',
                        backgroundColor: isActive ? colors.accent : 'transparent',
                        borderLeft: isStart ? '2px solid rgba(255,255,255,0.4)' : 'none',
                        zIndex: isActive ? 5 : 0,
                        boxShadow: isActive ? 'inset 0 0 5px rgba(0,0,0,0.3)' : 'none',
                      }}/>
                  );
                })}
              </div>
            ))}
            {/* Playhead */}
            <div className="absolute top-0 w-0.5 h-full z-50 pointer-events-none" style={{
              left: (currentStep % sequenceLength) * 32,
              background: 'rgba(255,255,255,0.4)',
              boxShadow: `0 0 10px ${colors.accent}`,
            }}/>
          </div>
        </div>
      </div>
    </div>
  );
}
