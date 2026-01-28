'use client';

import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';

interface StatusOverlayProps {
  status: 'initializing' | 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  progress: { stt: number; llm: number };
}

export function StatusOverlay({ status, errorMessage, progress }: StatusOverlayProps) {
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Initialization Failed</h1>
        <p className="text-slate-400 text-center max-w-md">{errorMessage || 'An unknown error occurred while initializing WebGPU or loading models.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2 bg-blue-600 rounded-lg font-bold hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === 'initializing' || status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-8">
        <div className="relative mb-8">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold">
            AI
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2 text-center text-balance tracking-tight">Initializing DebateLens</h1>
        <p className="text-slate-400 mb-8 text-center max-w-md">
          {progress.stt === 0 && progress.llm === 0
            ? "Setting up WebGPU environment..."
            : "Downloading and loading AI models..."}
        </p>

        <div className="w-full max-w-md space-y-6">
          <div>
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">STT</span>
                Whisper Speech Recognition
              </span>
              <span className="text-slate-300">{Math.round(progress.stt || 0)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.stt || 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="flex items-center gap-2">
                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs">LLM</span>
                Phi-3 Mini Language Model
              </span>
              <span className="text-slate-300">{Math.round(progress.llm || 0)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-purple-600 to-purple-400 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.llm || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700 max-w-md">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-sm text-slate-300">
              <p className="font-medium mb-1">What&apos;s happening now?</p>
              <ul className="space-y-1 text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Downloading AI models (~2.5GB total)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Initializing WebGPU for hardware acceleration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Preparing real-time fact-checking engine</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-8 text-slate-600 text-[10px] uppercase tracking-[0.2em] font-medium border-t border-slate-900 pt-4">
          Requires WebGPU • First-time setup may take 1-3 minutes
        </p>
      </div>
    );
  }

  return null;
}
