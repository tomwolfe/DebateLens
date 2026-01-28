'use client';

import { useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Mic, Loader2 } from 'lucide-react';
import { Transcript } from '@/hooks/useDebateManager';
import { TranscriptItem } from './TranscriptItem';

interface TranscriptListProps {
  transcripts: Transcript[];
  onDelete: (id: string) => void;
  onSwap: (id: string) => void;
}

export function TranscriptList({ transcripts, onDelete, onSwap }: TranscriptListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <main 
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {transcripts.map((t) => (
          <TranscriptItem 
            key={t.id} 
            transcript={t} 
            onDelete={onDelete} 
            onSwap={onSwap} 
          />
        ))}
      </AnimatePresence>
      
      {transcripts.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-6 opacity-30">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
              <Mic className="w-10 h-10" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-slate-950 p-1">
              <Loader2 className="w-6 h-6 animate-spin-slow text-slate-800" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-xl font-bold tracking-tight">System Ready</p>
            <p className="text-sm">Speak into your microphone to begin analysis</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </main>
  );
}
