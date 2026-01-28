'use client';

import { useEffect, useCallback } from 'react';
import { useDebateManager } from '@/hooks/useDebateManager';
import { Header } from './Header';
import { ManualInput } from './ManualInput';
import { TranscriptList } from './TranscriptList';
import { StatusOverlay } from './StatusOverlay';
import { exportToMarkdown } from '@/lib/export-utils';

export default function DebateLens() {
  const {
    transcripts,
    activeSpeaker,
    setActiveSpeaker,
    status,
    errorMessage,
    devices,
    selectedDevice,
    setSelectedDevice,
    progress,
    vad,
    clearFeed,
    deleteTranscript,
    swapSpeaker,
    manualSubmit,
    toggleListening,
  } = useDebateManager();

  const handleCopy = useCallback(() => {
    const text = transcripts.map(t => {
      const verdict = t.factCheck?.verdict && t.factCheck.verdict !== 'NOT_A_CLAIM' 
        ? ` [Verdict: ${t.factCheck.verdict}]` 
        : '';
      return `Speaker ${t.speaker}: ${t.text}${verdict}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
  }, [transcripts]);

  const handleExport = useCallback(() => {
    exportToMarkdown(transcripts);
  }, [transcripts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      if (e.key === '1') setActiveSpeaker('A');
      if (e.key === '2') setActiveSpeaker('B');
      if (e.key === 'Tab') {
        e.preventDefault();
        setActiveSpeaker(prev => prev === 'A' ? 'B' : 'A');
      }
      if (e.key === 'm') toggleListening();
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        clearFeed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening, clearFeed, setActiveSpeaker]);

  if (status !== 'ready') {
    return <StatusOverlay status={status} errorMessage={errorMessage} progress={progress} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      <Header 
        listening={vad.listening}
        userSpeaking={vad.userSpeaking}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
        devices={devices}
        activeSpeaker={activeSpeaker}
        setActiveSpeaker={setActiveSpeaker}
        onCopy={handleCopy}
        onClear={clearFeed}
        onExport={handleExport}
        onToggleListening={toggleListening}
      />

      <ManualInput 
        activeSpeaker={activeSpeaker}
        onManualSubmit={manualSubmit}
      />

      <TranscriptList 
        transcripts={transcripts}
        onDelete={deleteTranscript}
        onSwap={swapSpeaker}
      />

      <footer className="px-6 py-3 text-[9px] flex justify-between items-center text-slate-600 uppercase tracking-[0.3em] font-bold border-t border-slate-900 bg-slate-950">
        <div className="flex gap-4">
          <span>WebGPU Active</span>
          <span>Whisper-Tiny</span>
          <span>Phi-3 Mini</span>
        </div>
        <div className="hidden sm:block">
          DebateLens v0.3.0 • Real-time Fact-Checking
        </div>
      </footer>
    </div>
  );
}
