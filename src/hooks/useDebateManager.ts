'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioProcessor } from './useAudioProcessor';
import { DEBOUNCE_MS } from '@/lib/constants';

export interface FactCheck {
  verdict: 'True' | 'False' | 'Unverified' | 'NOT_A_CLAIM';
  explanation: string;
}

export interface Transcript {
  id: string;
  text: string;
  speaker: 'A' | 'B';
  isChecking: boolean;
  timestamp: number;
  lastUpdated: number;
  factCheck?: FactCheck;
}

export type AppStatus = 'initializing' | 'loading' | 'ready' | 'error';

export function useDebateManager() {
  const [transcripts, setTranscripts] = useState<Transcript[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('debatelens_transcripts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return parsed.map((t: any) => ({ ...t, isChecking: false }));
        } catch (e) {
          console.error('Failed to parse saved transcripts', e);
        }
      }
    }
    return [];
  });

  const [activeSpeaker, setActiveSpeaker] = useState<'A' | 'B'>('A');
  const [status, setStatus] = useState<AppStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [progress, setProgress] = useState<{ stt: number; llm: number }>({ stt: 0, llm: 0 });
  const [isWorkerBusy, setIsWorkerBusy] = useState(false);
  
  const workerRef = useRef<Worker | null>(null);
  const factCheckTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const activeSpeakerRef = useRef(activeSpeaker);

  useEffect(() => {
    activeSpeakerRef.current = activeSpeaker;
  }, [activeSpeaker]);

  // Fetch devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const audioDevices = devs.filter(d => d.kind === 'audioinput');
      setDevices(audioDevices);
      if (audioDevices.length > 0 && !selectedDevice) {
        setSelectedDevice(audioDevices[0].deviceId);
      }
    });
  }, [selectedDevice]);

  const triggerFactCheck = useCallback((text: string, id: string) => {
    if (factCheckTimers.current[id]) {
      clearTimeout(factCheckTimers.current[id]);
    }

    factCheckTimers.current[id] = setTimeout(() => {
      setTranscripts(prev => prev.map(t => 
        t.id === id ? { ...t, isChecking: true } : t
      ));
      
      workerRef.current?.postMessage({
        type: 'fact-check',
        data: { text, id }
      });
      delete factCheckTimers.current[id];
    }, DEBOUNCE_MS);
  }, []);

  const handleTranscription = useCallback((text: string, id: string, speaker: 'A' | 'B') => {
    const trimmedText = text.trim();
    const wordCount = trimmedText.split(/\s+/).length;
    const fillers = /^(um|uh|ah|er|basically|actually|literally|honestly|you know|i mean|so|well|like)\s*,?\s*/i;
    const cleanText = trimmedText.replace(fillers, '');
    
    if (wordCount < 2 || cleanText.length < 5) return;

    setTranscripts(prev => {
      const lastTranscript = prev[prev.length - 1];
      const now = Date.now();

      if (lastTranscript && 
          lastTranscript.speaker === speaker && 
          (now - lastTranscript.lastUpdated) < 3000) {
        
        const mergedText = `${lastTranscript.text} ${trimmedText}`;
        const newTranscripts = prev.map((t, idx) => 
          idx === prev.length - 1 
            ? { ...t, text: mergedText, lastUpdated: now, isChecking: false } 
            : t
        );

        triggerFactCheck(mergedText, lastTranscript.id);
        return newTranscripts;
      }

      const newTranscript: Transcript = {
        id,
        text: trimmedText,
        speaker,
        isChecking: false,
        timestamp: now,
        lastUpdated: now,
      };

      triggerFactCheck(trimmedText, id);
      return [...prev, newTranscript];
    });
  }, [triggerFactCheck]);

  const handleFactCheckStream = useCallback((result: string, id: string, isDone: boolean) => {
    setTranscripts(prev => prev.map(t => {
      if (t.id === id) {
        const trimmedResult = result.trim();

        if (trimmedResult.includes('NOT_A_CLAIM')) {
          return {
            ...t,
            isChecking: false,
            factCheck: { verdict: 'NOT_A_CLAIM', explanation: '' }
          };
        }

        let verdict: 'True' | 'False' | 'Unverified' | null = null;
        let explanation = '';

        let verdictMatch = result.match(/\[VERDICT\]\s*([Tt]rue|[Ff]alse|[Uu]nverified)\s*(.*)/i);
        if (!verdictMatch) verdictMatch = result.match(/\[([Tt]rue|[Ff]alse|[Uu]nverified)\]\s*(.*)/);
        if (!verdictMatch) verdictMatch = result.match(/([Tt]rue|[Ff]alse|[Uu]nverified):\s*(.*)/);
        if (!verdictMatch) verdictMatch = result.match(/([Tt]rue|[Ff]alse|[Uu]nverified)\s*\|\s*(.*)/);
        if (!verdictMatch) verdictMatch = result.match(/([Tt]rue|[Ff]alse|[Uu]nverified)\s*[-–—]\s*(.*)/);

        if (verdictMatch) {
          const matchedVerdict = verdictMatch[1].toLowerCase();
          verdict = (matchedVerdict.charAt(0).toUpperCase() + matchedVerdict.slice(1)) as 'True' | 'False' | 'Unverified';
          explanation = verdictMatch[2].trim() || 'Analyzing...';
        } else {
          const verdictWordMatch = result.match(/\b([Tt]rue|[Ff]alse|[Uu]nverified)\b/i);
          if (verdictWordMatch) {
            const matchedVerdict = verdictWordMatch[1].toLowerCase();
            verdict = (matchedVerdict.charAt(0).toUpperCase() + matchedVerdict.slice(1)) as 'True' | 'False' | 'Unverified';
            explanation = result.replace(verdictWordMatch[0], '').replace('[VERDICT]', '').trim() || 'Analyzing...';
          }
        }

        if (verdict) {
          return { ...t, isChecking: !isDone, factCheck: { verdict, explanation } };
        }

        const cleanDisplayResult = result.replace('[VERDICT]', '').trim();
        return {
          ...t,
          isChecking: !isDone,
          factCheck: { verdict: 'Unverified', explanation: cleanDisplayResult || 'Analyzing...' }
        };
      }
      return t;
    }));
  }, []);

  const onSpeechEnd = useCallback((audio: Float32Array) => {
    const id = Math.random().toString(36).substring(7);
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'transcribe',
        data: { audio, id, speaker: activeSpeakerRef.current }
      }, [audio.buffer]);
    }
  }, []);

  const { vad } = useAudioProcessor(onSpeechEnd, selectedDevice);

  useEffect(() => {
    const w = new Worker(new URL('../workers/inference.worker.ts', import.meta.url), {
        type: 'module'
    });

    w.onmessage = (e) => {
      const { status, progress: p, model, text, id, speaker, error, isDone, busy } = e.data;

      if (busy !== undefined) setIsWorkerBusy(busy);
      if (status === 'ready') setStatus('ready');
      if (status === 'error') {
        if (id) {
          setTranscripts(prev => prev.map(t =>
            t.id === id ? { ...t, isChecking: false, factCheck: { verdict: 'Unverified', explanation: `Error: ${error}` } } : t
          ));
        } else {
          setStatus('error');
          setErrorMessage(error);
        }
      }
      if (status === 'progress') {
        setStatus('loading');
        setProgress(prev => ({ ...prev, [model]: p }));
      }
      if (status === 'transcription') {
        handleTranscription(text, id, speaker);
      }
      if (status === 'fact-check-stream') {
        handleFactCheckStream(text, id, isDone);
      }
    };

    w.postMessage({ type: 'load' });
    workerRef.current = w;

    return () => w.terminate();
  }, [handleTranscription, handleFactCheckStream]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('debatelens_transcripts', JSON.stringify(transcripts));
  }, [transcripts]);

  const clearFeed = useCallback(() => {
    if (confirm('Clear all transcripts?')) {
      setTranscripts([]);
      localStorage.removeItem('debatelens_transcripts');
    }
  }, []);

  const deleteTranscript = useCallback((id: string) => {
    setTranscripts(prev => prev.filter(t => t.id !== id));
  }, []);

  const swapSpeaker = useCallback((id: string) => {
    setTranscripts(prev => prev.map(t => 
      t.id === id ? { ...t, speaker: t.speaker === 'A' ? 'B' : 'A' } : t
    ));
  }, []);

  const manualSubmit = useCallback((text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount >= 3) {
      const id = Math.random().toString(36).substring(7);
      const now = Date.now();

      setTranscripts(prev => [
        ...prev,
        {
          id,
          text,
          speaker: activeSpeakerRef.current,
          isChecking: true,
          timestamp: now,
          lastUpdated: now,
        }
      ]);

      workerRef.current?.postMessage({
        type: 'fact-check',
        data: { text, id }
      });
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (vad.listening) {
      vad.pause();
    } else {
      vad.start();
    }
  }, [vad]);

  return {
    transcripts,
    activeSpeaker,
    setActiveSpeaker,
    status,
    errorMessage,
    devices,
    selectedDevice,
    setSelectedDevice,
    progress,
    isWorkerBusy,
    vad,
    clearFeed,
    deleteTranscript,
    swapSpeaker,
    manualSubmit,
    toggleListening,
  };
}
