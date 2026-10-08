import { useCallback, useEffect, useRef, useState } from 'react';
import { renderFrame, SCENES } from './motion/timeline';
import { DURATION, FPS, H, W } from './motion/util';
import { useReelActive } from '../useReelActive';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-700.css';

const fmt = (t: number) => `${t.toFixed(2).padStart(5, '0')}s`;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = useReelActive(wrapRef);
  const tRef = useRef(0);
  const playingRef = useRef(true);
  const loopRef = useRef(true);
  const dirty = useRef(true);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [ready, setReady] = useState(false);
  const [full, setFull] = useState(false);

  // fonts
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const loads = [
      '700 100px "Space Grotesk"',
      '500 100px "Space Grotesk"',
      '500 20px "JetBrains Mono"',
      '700 20px "JetBrains Mono"',
    ].map((f) => document.fonts.load(f).catch(() => null));
    Promise.all(loads).then(finish);
    const to = setTimeout(finish, 1800);
    return () => clearTimeout(to);
  }, []);

  // render loop
  useEffect(() => {
    if (!ready) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    let last = performance.now();
    let raf = 0;
    let lastUi = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current) {
        tRef.current += dt;
        dirty.current = true;
        if (tRef.current >= DURATION) {
          if (loopRef.current) tRef.current %= DURATION;
          else {
            tRef.current = DURATION - 0.001;
            playingRef.current = false;
            setPlaying(false);
          }
        }
      }
      if (dirty.current) {
        renderFrame(ctx, tRef.current);
        dirty.current = false;
        if (now - lastUi > 50) {
          lastUi = now;
          setTime(tRef.current);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  const setPlay = useCallback((p: boolean) => {
    if (p && tRef.current >= DURATION - 0.01) tRef.current = 0;
    playingRef.current = p;
    setPlaying(p);
  }, []);

  const seek = useCallback((t: number) => {
    tRef.current = Math.max(0, Math.min(DURATION - 0.001, t));
    dirty.current = true;
    setTime(tRef.current);
  }, []);

  const toggleLoop = useCallback(() => {
    loopRef.current = !loopRef.current;
    setLoop(loopRef.current);
  }, []);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active.current) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlay(!playingRef.current);
      } else if (e.code === 'ArrowRight') {
        playingRef.current = false;
        setPlaying(false);
        seek(tRef.current + (e.shiftKey ? 1 : 1 / FPS));
      } else if (e.code === 'ArrowLeft') {
        playingRef.current = false;
        setPlaying(false);
        seek(tRef.current - (e.shiftKey ? 1 : 1 / FPS));
      } else if (e.code === 'KeyR') {
        seek(0);
        setPlay(true);
      } else if (e.code === 'KeyL') toggleLoop();
      else if (e.code === 'KeyF') toggleFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, seek, setPlay, toggleLoop, toggleFull]);

  const activeIdx = SCENES.reduce((a, s, i) => (time >= s.start ? i : a), 0);

  return (
    <div
      ref={wrapRef}
      className="flex flex-col items-center justify-center rounded-xl bg-[#020308] px-3 py-3 text-slate-200 select-none"
      style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
    >
      <div
        className="relative overflow-hidden rounded-xl ring-1 ring-white/10"
        style={{
          width: 'min(100%, (100vh - 128px) * 16 / 9)',
          aspectRatio: '16 / 9',
          boxShadow: '0 0 120px -20px rgba(46,230,255,0.25), 0 0 60px -10px rgba(139,92,255,0.25)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-full w-full cursor-pointer bg-[#05060b]"
          onClick={() => setPlay(!playingRef.current)}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#05060b] text-xs tracking-[0.4em] text-cyan-300/80">
            LOADING ASSETS…
          </div>
        )}
        {ready && !playing && (
          <button
            onClick={() => setPlay(true)}
            className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-black/50 backdrop-blur transition hover:scale-110 hover:border-cyan-300"
            aria-label="Play"
          >
            <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-white">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* controls */}
      <div style={{ width: 'min(100%, (100vh - 128px) * 16 / 9)' }} className="mt-3 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlay(!playing)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-cyan-400/30"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-white">
                <path d="M7 4.5v15l13-7.5z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              seek(0);
              setPlay(true);
            }}
            className="flex h-9 shrink-0 items-center rounded-full bg-white/10 px-3 text-[11px] tracking-widest transition hover:bg-cyan-400/30"
          >
            ↺ REPLAY
          </button>
          <input
            type="range"
            min={0}
            max={DURATION}
            step={1 / FPS}
            value={time}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-cyan-300"
            aria-label="Timeline"
          />
          <span className="w-28 shrink-0 text-right text-[11px] tabular-nums tracking-wider text-slate-400">
            {fmt(time)} / {fmt(DURATION)}
          </span>
          <button
            onClick={toggleLoop}
            className={`h-9 shrink-0 rounded-full px-3 text-[11px] tracking-widest transition ${
              loop ? 'bg-cyan-400/25 text-cyan-200' : 'bg-white/10 text-slate-400'
            }`}
          >
            LOOP
          </button>
          <button
            onClick={toggleFull}
            className="h-9 shrink-0 rounded-full bg-white/10 px-3 text-[11px] tracking-widest transition hover:bg-cyan-400/30"
          >
            {full ? 'EXIT' : 'FULL'}
          </button>
        </div>

        <div className="flex gap-1">
          {SCENES.map((s, i) => (
            <button
              key={s.name}
              onClick={() => {
                seek(s.start);
              }}
              style={{ flexGrow: s.dur, flexBasis: 0, borderColor: i === activeIdx ? s.accent : 'transparent' }}
              className={`rounded-md border-b-2 px-2 py-1.5 text-left text-[10px] tracking-[0.2em] transition ${
                i === activeIdx ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-slate-500 hover:text-slate-300'
              }`}
            >
              <span style={{ color: s.accent }}>0{i}</span> {s.name}
            </button>
          ))}
        </div>
        <p className="text-center text-[10px] tracking-[0.25em] text-slate-600">
          SPACE PLAY/PAUSE · ← → FRAME STEP (SHIFT = 1s) · R RESTART · L LOOP · F FULLSCREEN
        </p>
      </div>
    </div>
  );
}
