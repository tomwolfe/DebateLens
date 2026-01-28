'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Trash2, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transcript } from '@/hooks/useDebateManager';

interface TranscriptItemProps {
  transcript: Transcript;
  onDelete: (id: string) => void;
  onSwap: (id: string) => void;
}

export const TranscriptItem = React.memo(({ transcript: t, onDelete, onSwap }: TranscriptItemProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={cn(
        "flex flex-col max-w-[85%] md:max-w-[70%] space-y-3",
        t.speaker === 'A' ? "self-start" : "self-end items-end"
      )}
    >
      <div className={cn(
        "px-6 py-5 rounded-3xl text-lg md:text-xl shadow-2xl transition-all duration-700 leading-relaxed relative group overflow-hidden",
        t.speaker === 'A' 
          ? "bg-slate-900/80 rounded-tl-none border-l-4 border-blue-500/50" 
          : "bg-slate-900/80 rounded-tr-none border-r-4 border-red-500/50 text-right",
        t.isChecking && (t.speaker === 'A' ? "shadow-[0_0_50px_rgba(59,130,246,0.3)] border-blue-400" : "shadow-[0_0_50px_rgba(239,68,68,0.3)] border-red-400")
      )}>
        {t.isChecking && (
          <motion.div 
            className={cn(
              "absolute inset-0 opacity-20 pointer-events-none",
              t.speaker === 'A' ? "bg-gradient-to-r from-blue-600/0 via-blue-600/50 to-blue-600/0" : "bg-gradient-to-r from-red-600/0 via-red-600/50 to-red-600/0"
            )}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
        )}
        
        <div className={cn(
          "absolute top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20",
          t.speaker === 'A' ? "right-4" : "left-4"
        )}>
          <button
            onClick={() => onSwap(t.id)}
            className="p-1.5 hover:bg-blue-500/20 rounded-lg text-slate-500 hover:text-blue-400"
            title="Swap Speaker"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(t.id)}
            className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400"
            title="Delete transcript"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className={cn(
          "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-3",
          t.speaker === 'A' ? "text-blue-500" : "text-red-500 justify-end"
        )}>
          {t.speaker === 'A' && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
          Speaker {t.speaker}
          {t.speaker === 'B' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
        </div>
        <span className="text-slate-100 font-medium relative z-10">
          {t.text}
        </span>
      </div>

      {t.isChecking && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-400/70",
            t.speaker === 'B' && "flex-row-reverse"
          )}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          Analyzing Claim...
        </motion.div>
      )}

      {t.factCheck && t.factCheck.verdict !== 'NOT_A_CLAIM' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "p-5 rounded-2xl border text-sm w-full shadow-xl backdrop-blur-md relative overflow-hidden",
            t.factCheck.verdict === 'True' && "bg-green-500/10 border-green-500/30 text-green-50",
            t.factCheck.verdict === 'False' && "bg-red-500/10 border-red-500/30 text-red-50",
            t.factCheck.verdict === 'Unverified' && "bg-yellow-500/10 border-yellow-500/30 text-yellow-50"
          )}
        >
          <div className={cn(
            "flex items-center gap-2 font-black text-[11px] uppercase tracking-[0.2em] mb-3",
            t.factCheck.verdict === 'True' && "text-green-400",
            t.factCheck.verdict === 'False' && "text-red-400",
            t.factCheck.verdict === 'Unverified' && "text-yellow-400"
          )}>
            {t.factCheck.verdict === 'True' && <CheckCircle2 className="w-4 h-4" />}
            {t.factCheck.verdict === 'False' && <XCircle className="w-4 h-4" />}
            {t.factCheck.verdict === 'Unverified' && <AlertCircle className="w-4 h-4" />}
            {t.factCheck.verdict}
          </div>
          <p className="opacity-90 leading-relaxed font-medium">
            {t.factCheck.explanation}
          </p>
          
          <div className={cn(
            "absolute top-0 right-0 w-24 h-24 blur-[40px] opacity-20 -mr-12 -mt-12 rounded-full",
            t.factCheck.verdict === 'True' && "bg-green-500",
            t.factCheck.verdict === 'False' && "bg-red-500",
            t.factCheck.verdict === 'Unverified' && "bg-yellow-500"
          )} />
        </motion.div>
      )}
    </motion.div>
  );
});

TranscriptItem.displayName = 'TranscriptItem';
