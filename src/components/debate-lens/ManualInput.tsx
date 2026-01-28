'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ManualInputProps {
  activeSpeaker: 'A' | 'B';
  onManualSubmit: (text: string) => void;
}

export function ManualInput({ activeSpeaker, onManualSubmit }: ManualInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().split(/\s+/).length >= 3) {
      onManualSubmit(text.trim());
      setText('');
    }
  };

  return (
    <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800/30">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="manual-input" className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Manual Input (for text fact-checking)
            </label>
            <span className="text-xs text-slate-500">
              Speaker: <span className={cn(
                "font-bold",
                activeSpeaker === 'A' ? "text-blue-400" : "text-red-400"
              )}>
                {activeSpeaker}
              </span>
            </span>
          </div>
          <textarea
            id="manual-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Enter text to fact-check as Speaker ${activeSpeaker}`}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full",
                activeSpeaker === 'A' ? "bg-blue-500" : "bg-red-500")}></span>
              Minimum 3 words required
            </span>
            <span className="text-xs text-slate-500">• Press Enter to submit</span>
            <span className="text-xs text-slate-500">• Press Tab to switch speaker</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={text.trim().split(/\s+/).length < 3}
          className="mt-4 sm:mt-0 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all whitespace-nowrap shadow-lg shadow-blue-500/20"
        >
          Submit for Fact-Check
        </button>
      </form>
    </div>
  );
}
