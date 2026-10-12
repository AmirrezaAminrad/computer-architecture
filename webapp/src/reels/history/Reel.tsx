import { useCallback, useEffect, useRef, useState } from 'react';
import { createRenderer } from './motion/renderer';
import { Sound } from './motion/audio';
import { DURATION, W, H } from './motion/util';
import { SCENES } from './motion/scenes';
import { useReelActive } from '../useReelActive';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';

const Icon = {
  play: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
  ),
  restart: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
  ),
  sound: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></svg>
  ),
  mute: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="m22 9-6 6M16 9l6 6" /></svg>
  ),
  full: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></svg>
  ),
};

const btn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium tracking-wider text-white/80 uppercase transition hover:bg-white/15 hover:text-white active:scale-95 disabled:opacity-40';

export default function Player() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = useReelActive(wrapRef);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundRef = useRef(new Sound());
  const eng = useRef({ t: 0, playing: true, recording: false });
  const recRef = useRef<MediaRecorder | null>(null);
  const renderRef = useRef<((t: number) => void) | null>(null);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [ready, setReady] = useState(false);

  const canExport = typeof MediaRecorder !== 'undefined';

  // fonts, then boot
  useEffect(() => {
    let alive = true;
    const load = Promise.all([
      document.fonts.load('700 100px "Space Grotesk"'),
      document.fonts.load('500 20px "JetBrains Mono"'),
      document.fonts.load('700 20px "JetBrains Mono"'),
    ]).catch(() => undefined);
    const timeout = new Promise((r) => setTimeout(r, 2500));
    Promise.race([load, timeout]).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const finishRecording = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  }, []);

  // main loop
  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    const render = createRenderer(canvasRef.current);
    renderRef.current = render;
    const snd = soundRef.current;
    let raf = 0;
    let last = performance.now();
    let uiTick = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = eng.current;
      if (s.playing) {
        s.t += dt;
        if (s.t >= DURATION) {
          if (s.recording) {
            s.t = DURATION - 0.001;
            s.playing = false;
            s.recording = false;
            finishRecording();
            setPlaying(false);
          } else {
            s.t = s.t % DURATION;
            snd.start(s.t);
          }
        }
      }
      render(s.t);
      uiTick += dt;
      if (uiTick > 0.033) {
        uiTick = 0;
        setTime(s.t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, finishRecording]);

  useEffect(() => () => soundRef.current.stop(), []);

  const seek = useCallback((t: number, resumeAudio = true) => {
    const s = eng.current;
    s.t = Math.min(DURATION - 0.001, Math.max(0, t));
    setTime(s.t);
    renderRef.current?.(s.t);
    if (resumeAudio && s.playing) soundRef.current.start(s.t);
  }, []);

  const togglePlay = useCallback(() => {
    const s = eng.current;
    if (s.recording) return;
    s.playing = !s.playing;
    setPlaying(s.playing);
    if (s.playing) {
      if (s.t >= DURATION - 0.01) s.t = 0;
      soundRef.current.start(s.t);
    } else soundRef.current.stop();
  }, []);

  const restart = useCallback(() => {
    const s = eng.current;
    if (s.recording) return;
    s.playing = true;
    setPlaying(true);
    seek(0);
  }, [seek]);

  const toggleSound = useCallback(() => {
    const snd = soundRef.current;
    snd.audible = !snd.audible;
    setSoundOn(snd.audible);
    if (snd.audible && eng.current.playing) snd.start(eng.current.t);
    else if (!snd.audible && !snd.capture) snd.stop();
  }, []);

  const fullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  const exportVideo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || eng.current.recording) return;
    const snd = soundRef.current;
    const stream = canvas.captureStream(60);
    snd.capture = true;
    try {
      snd.captureStream().getAudioTracks().forEach((tr) => stream.addTrack(tr));
    } catch {
      /* video only */
    }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 14_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'computer-architecture-showreel.webm';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      snd.capture = false;
      if (!snd.audible) snd.stop();
      eng.current.recording = false;
      setExporting(false);
      eng.current.playing = true;
      setPlaying(true);
      eng.current.t = 0;
      if (snd.audible) snd.start(0);
    };
    recRef.current = rec;
    const s = eng.current;
    s.t = 0;
    s.playing = true;
    s.recording = true;
    setPlaying(true);
    setExporting(true);
    snd.start(0);
    rec.start(250);
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active.current) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowRight') seek(eng.current.t + 0.5);
      else if (e.code === 'ArrowLeft') seek(eng.current.t - 0.5);
      else if (e.key === 'f') fullscreen();
      else if (e.key === 'm') toggleSound();
      else if (e.key === 'r') restart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, togglePlay, seek, fullscreen, toggleSound, restart]);

  const fmt = (t: number) => `${Math.floor(t).toString().padStart(2, '0')}.${Math.floor((t % 1) * 100).toString().padStart(2, '0')}`;

  return (
    <div
      ref={wrapRef}
      className="flex w-full flex-col items-center justify-center gap-5 rounded-xl bg-[#050608] px-4 py-6"
    >
      <div className="w-full max-w-[1280px]">
        <div className="mb-3 flex items-end justify-between px-1 text-white/60">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-cyan-300/80 uppercase">Motion Design Showreel</div>
            <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              A Brief History of Computer Architecture
            </h1>
          </div>
          <div className="hidden font-mono text-[10px] tracking-[0.2em] uppercase sm:block">
            15s · 1920×1080 · 120 BPM · rendered live
          </div>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_120px_-30px_rgba(34,224,255,0.35)]"
          style={{ aspectRatio: `${W} / ${H}` }}
          onClick={togglePlay}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
          {!ready && (
            <div className="absolute inset-0 grid place-items-center font-mono text-xs tracking-[0.3em] text-white/50 uppercase">
              Loading assets…
            </div>
          )}
          {exporting && (
            <div className="absolute top-3 right-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 font-mono text-[10px] tracking-widest text-red-400 uppercase">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Rendering WebM…
            </div>
          )}
          {!playing && !exporting && ready && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white/10 text-white backdrop-blur">
                <svg viewBox="0 0 24 24" className="h-9 w-9" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          )}
        </div>

        {/* transport */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={btn} onClick={togglePlay} disabled={exporting} aria-label="Play/Pause">
            {playing ? Icon.pause : Icon.play}
          </button>
          <button className={btn} onClick={restart} disabled={exporting} aria-label="Restart">
            {Icon.restart}
          </button>

          <div className="relative min-w-[200px] flex-1">
            <input
              type="range"
              min={0}
              max={DURATION}
              step={0.01}
              value={time}
              disabled={exporting}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="scrub w-full"
              style={{ ['--p' as string]: `${(time / DURATION) * 100}%` }}
              aria-label="Timeline"
            />
            <div className="pointer-events-none relative mt-1 h-4">
              {SCENES.filter((s) => s.hud).map((s) => (
                <span
                  key={s.name}
                  className="absolute -translate-x-1/2 font-mono text-[9px] tracking-wider"
                  style={{ left: `${(s.start / DURATION) * 100}%`, color: s.accent, opacity: 0.8 }}
                >
                  {s.hud!.year}
                </span>
              ))}
            </div>
          </div>

          <div className="w-[88px] text-right font-mono text-xs tabular-nums text-white/70">
            {fmt(time)} / 15.00
          </div>

          <button className={btn} onClick={toggleSound} aria-pressed={soundOn}>
            {soundOn ? Icon.sound : Icon.mute}
            <span className="hidden sm:inline">{soundOn ? 'Sound on' : 'Sound off'}</span>
          </button>
          {canExport && (
            <button className={btn} onClick={exportVideo} disabled={exporting || !ready}>
              {Icon.download}
              <span className="hidden sm:inline">{exporting ? 'Rendering…' : 'Export WebM'}</span>
            </button>
          )}
          <button className={btn} onClick={fullscreen} aria-label="Fullscreen">
            {Icon.full}
          </button>
        </div>
        <p className="mt-3 px-1 font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">
          Space play/pause · ←/→ nudge · M sound · F fullscreen · R restart
        </p>
      </div>
    </div>
  );
}
