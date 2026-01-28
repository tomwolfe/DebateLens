'use client';

import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  listening: boolean;
  isSpeaking: boolean;
}

export function AudioVisualizer({ listening, isSpeaking }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!listening || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const bars = 20;
    const barWidth = 3;
    const gap = 2;
    const values = new Array(bars).fill(0);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < bars; i++) {
        // Targeted simulation: if speaking, higher volatility
        const target = isSpeaking ? Math.random() * 20 + 5 : Math.random() * 3;
        values[i] += (target - values[i]) * 0.2; // Smooth transition
        
        const h = values[i];
        const x = i * (barWidth + gap);
        const y = (canvas.height - h) / 2;
        
        ctx.fillStyle = isSpeaking ? '#22c55e' : '#64748b';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, 2);
        ctx.fill();
      }
      
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [listening, isSpeaking]);

  if (!listening) {
    return (
      <div className="w-[100px] h-6 bg-slate-800/30 rounded-md flex items-center justify-center text-[8px] text-slate-600 font-bold uppercase tracking-tighter">
        Mic Off
      </div>
    );
  }

  return <canvas ref={canvasRef} width={100} height={24} className="opacity-80" />;
}
