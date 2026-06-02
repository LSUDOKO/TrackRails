"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Waveform from "./Waveform";

interface AudioPlayerProps {
  onPlayRequest: () => Promise<void>;
  getAudioElement: () => HTMLAudioElement | null;
  setAudioElement: (audio: HTMLAudioElement | null) => void;
  isDecrypting: boolean;
  canPlay: boolean;
  disabledReason?: string;
}

export default function AudioPlayer({
  onPlayRequest,
  getAudioElement,
  setAudioElement,
  isDecrypting,
  canPlay,
  disabledReason,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  const connectAnalyser = useCallback((audio: HTMLAudioElement) => {
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(audio);
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    an.connect(ctx.destination);
    audioCtxRef.current = ctx;
    sourceRef.current = src;
    setAnalyser(an);
  }, []);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    sourceRef.current = null;
    setAnalyser(null);
  }, []);

  const handlePlayPause = useCallback(async () => {
    let audio = getAudioElement();
    if (audio) {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
      return;
    }
    await onPlayRequest();
    audio = getAudioElement();
    if (!audio) return;
    connectAnalyser(audio);
  }, [onPlayRequest, getAudioElement, connectAnalyser]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = getAudioElement();
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }, [getAudioElement, duration]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    const audio = getAudioElement();
    if (audio) audio.volume = v;
  }, [getAudioElement]);

  useEffect(() => {
    const audio = getAudioElement();
    if (!audio) { setIsPlaying(false); return; }

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => { setIsPlaying(false); cleanup(); setAudioElement(null); };
    const onMeta = () => setDuration(audio.duration);
    const onTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
    };
  }, [getAudioElement, cleanup, setAudioElement]);

  function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="w-full">
      <div className="h-32 rounded-xl bg-black/5 dark:bg-white/5 overflow-hidden">
        <Waveform analyser={analyser} isPlaying={isPlaying} />
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          disabled={!canPlay || isDecrypting}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isDecrypting ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : isPlaying ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ) : (
            <svg className="ml-0.5 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div
            className="h-2 cursor-pointer rounded-full bg-border overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
            className="h-1 w-16 cursor-pointer accent-accent"
          />
        </div>
      </div>

      {disabledReason && !canPlay && (
        <p className="mt-3 text-center text-xs text-muted">{disabledReason}</p>
      )}
    </div>
  );
}
