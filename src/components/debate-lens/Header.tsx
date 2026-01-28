'use client';

import { Mic, MicOff, Copy, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AudioVisualizer } from './AudioVisualizer';

interface HeaderProps {
  listening: boolean;
  userSpeaking: boolean;
  selectedDevice: string;
  setSelectedDevice: (id: string) => void;
  devices: MediaDeviceInfo[];
  activeSpeaker: 'A' | 'B';
  setActiveSpeaker: (s: 'A' | 'B') => void;
  onCopy: () => void;
  onClear: () => void;
  onExport: () => void;
  onToggleListening: () => void;
}

export function Header({
  listening,
  userSpeaking,
  selectedDevice,
  setSelectedDevice,
  devices,
  activeSpeaker,
  setActiveSpeaker,
  onCopy,
  onClear,
  onExport,
  onToggleListening
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={cn("w-3 h-3 rounded-full transition-colors duration-500", (userSpeaking) ? "bg-green-500" : "bg-red-500")} />
          {(userSpeaking) && <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-75" />}
        </div>
        <h1 className="font-black text-2xl tracking-tighter italic uppercase">Debate<span className="text-blue-500 not-italic">Lens</span></h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <AudioVisualizer listening={listening} isSpeaking={userSpeaking} />
          <div className="text-[7px] text-slate-500 font-black uppercase tracking-widest mt-1">Audio Input Level</div>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="bg-slate-800/50 border border-slate-700/50 text-[10px] rounded px-2 py-1 text-blue-400 font-bold focus:outline-none"
          >
            {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label.slice(0, 20)}...</option>)}
          </select>
        </div>

        <div className="flex bg-slate-800/50 rounded-xl p-1 border border-slate-700/50 shadow-inner">
          <button
            onClick={() => setActiveSpeaker('A')}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2",
              activeSpeaker === 'A'
                ? "bg-blue-600 text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)] scale-105"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Speaker A <span className="opacity-50 text-[10px] bg-black/20 px-1 rounded">1</span>
          </button>
          <button
            onClick={() => setActiveSpeaker('B')}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2",
              activeSpeaker === 'B'
                ? "bg-red-600 text-white shadow-[0_4px_20px_rgba(220,38,38,0.4)] scale-105"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            Speaker B <span className="opacity-50 text-[10px] bg-black/20 px-1 rounded">2</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">TAB</kbd> to swap
        </div>

        <div className="flex items-center gap-2 border-l border-slate-800 pl-6">
          <button
            onClick={onCopy}
            className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-400 transition-all active:scale-95"
            title="Copy Transcript"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={onExport}
            className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-green-400 transition-all active:scale-95"
            title="Export to Markdown"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={onClear}
            className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-red-400 transition-all active:scale-95"
            title="Clear Feed"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onToggleListening}
          className={cn(
            "hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all duration-300 active:scale-95",
            !listening
              ? "border-red-500/50 bg-red-500/10 text-red-400"
              : (userSpeaking)
                ? "border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                : "border-slate-700 bg-slate-800/50 text-slate-500"
          )}
        >
          {!listening ? <MicOff className="w-3.5 h-3.5" /> : ((userSpeaking) ? <Mic className="w-3.5 h-3.5 animate-bounce" /> : <Mic className="w-3.5 h-3.5" />)}
          {!listening ? "Muted" : ((userSpeaking) ? "Live Audio" : "Listening")}
        </button>
      </div>
    </header>
  );
}
