"use client";

import { useRef, useEffect, useCallback } from "react";

interface WaveformProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  barCount?: number;
  className?: string;
}

export default function Waveform({
  analyser,
  isPlaying,
  barCount = 64,
  className = "",
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!analyser) return;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, [analyser]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas || !analyser || !dataRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    if (!isPlaying) {
      ctx.fillStyle = "oklch(0.5 0 0 / 0.15)";
      const gap = 2;
      const bw = (w - gap * (barCount - 1)) / barCount;
      for (let i = 0; i < barCount; i++) {
        const bh = 8 + (Math.sin(i * 1.5 + Date.now() / 2000) * 0.5 + 0.5) * 6;
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        ctx.fillRect(x, y, bw, bh);
      }
      return;
    }

    analyser.getByteFrequencyData(dataRef.current as Uint8Array<ArrayBuffer>);
    const data = dataRef.current;

    const step = Math.floor(data.length / barCount);
    const gap = 2;
    const bw = (w - gap * (barCount - 1)) / barCount;

    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, "oklch(0.65 0.2 180)");
    gradient.addColorStop(0.5, "oklch(0.65 0.25 140)");
    gradient.addColorStop(1, "oklch(0.75 0.2 80)");
    ctx.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += data[i * step + j];
      }
      const avg = sum / step / 255;
      const bh = Math.max(2, avg * h);
      const x = i * (bw + gap);
      const y = (h - bh) / 2;
      ctx.fillRect(x, y, bw, bh);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [analyser, isPlaying, barCount]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
    />
  );
}
