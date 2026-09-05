// ============================================================
// Transport — simple-daw 移植 (MIT)
// Play/Stop/Record/BPM slider/Mixer toggle/Time display
// ============================================================
'use client';

import { useEffect } from 'react';
import { Play, Square, SlidersHorizontal } from 'lucide-react';
import { useSimpleDawStore } from '@/store/useSimpleDawStore';
import { simpleAudioEngine } from '@/engine/SimpleAudioEngine';

export default function Transport(): React.JSX.Element {
  const isPlaying = useSimpleDawStore((s) => s.isPlaying);
  const togglePlay = useSimpleDawStore((s) => s.togglePlay);
  const bpm = useSimpleDawStore((s) => s.bpm);
  const setBpm = useSimpleDawStore((s) => s.setBpm);
  const sequenceLength = useSimpleDawStore((s) => s.sequenceLength);
  const setSequenceLength = useSimpleDawStore((s) => s.setSequenceLength);
  const isRecording = useSimpleDawStore((s) => s.isRecording);
  const setIsRecording = useSimpleDawStore((s) => s.setIsRecording);
  const isMixerOpen = useSimpleDawStore((s) => s.isMixerOpen);
  const setMixerOpen = useSimpleDawStore((s) => s.setMixerOpen);

  useEffect(() => { simpleAudioEngine.setBpm(bpm); }, [bpm]);

  const handlePlay = async () => {
    if (!simpleAudioEngine.initialized) await simpleAudioEngine.init();
    const next = !isPlaying;
    simpleAudioEngine.togglePlay(next);
    togglePlay();
  };

  return (
    <div className="flex items-center gap-4 px-5 py-2.5 border-b" style={{ borderColor: 'rgba(200,162,232,0.12)', background: 'linear-gradient(180deg, rgba(45,27,78,0.95), rgba(26,10,46,0.98))', height: 56 }}>
      {/* Play / Stop / Record */}
      <div className="flex items-center gap-2">
        <button onClick={handlePlay} className={`p-2 rounded-lg flex items-center justify-center transition-all ${
          isPlaying ? 'bg-pink-500/20 border border-pink-500/30 text-pink-400' : 'hover:bg-white/5 text-white/60'
        }`}>
          {isPlaying ? <Square size={18} fill="currentColor"/> : <Play size={18} fill="currentColor" className="ml-0.5"/>}
        </button>
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`p-2 rounded-lg flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white' : 'hover:bg-white/5 text-white/60'}`}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: isRecording ? 'white' : 'currentColor' }}/>
        </button>
        <button onClick={() => setMixerOpen(!isMixerOpen)} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
          isMixerOpen ? 'bg-pink-500/20 border border-pink-500/30 text-pink-400' : 'hover:bg-white/5 text-white/50'
        }`}>
          <SlidersHorizontal size={14}/>MIXER
        </button>
      </div>

      {/* BPM */}
      <div className="flex flex-col" style={{ width: 80 }}>
        <div className="flex justify-between text-[10px] text-white/40"><span>BPM</span><span className="tabular-nums">{bpm}</span></div>
        <input type="range" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full h-1 accent-pink-400 cursor-pointer"/>
      </div>

      {/* Pattern Length */}
      <div className="flex flex-col" style={{ width: 80 }}>
        <div className="flex justify-between text-[10px] text-white/40"><span>LEN</span><span className="tabular-nums">{sequenceLength}</span></div>
        <input type="range" min={8} max={64} step={4} value={sequenceLength} onChange={(e) => setSequenceLength(Number(e.target.value))}
          className="w-full h-1 accent-purple-300 cursor-pointer"/>
      </div>

      <div className="flex-1"/>
    </div>
  );
}
