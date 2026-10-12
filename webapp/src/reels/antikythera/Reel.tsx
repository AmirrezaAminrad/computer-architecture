import { useCallback, useEffect, useRef, useState } from "react";
import { render } from "./reel/render";
import { ReelAudio } from "./reel/audio";
import { CHAPTERS, DURATION, FPS, H, W, pad } from "./reel/utils";
import { useReelActive } from "../useReelActive";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/jetbrains-mono/greek-700.css";
import "@fontsource/anton/latin-400.css";
import "@fontsource/eb-garamond/latin-400-italic.css";

const audio = new ReelAudio();

const Icon = {
  play: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M7 4.5v15l13-7.5z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <rect x="6" y="4.5" width="4.5" height="15" rx="1" />
      <rect x="13.5" y="4.5" width="4.5" height="15" rx="1" />
    </svg>
  ),
  replay: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  ),
  soundOn: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  ),
  soundOff: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </svg>
  ),
  full: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  ),
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = useReelActive(wrapRef);
  const sliderRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const chapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const st = useRef({ t: 0, playing: true, sound: false, scrubbing: false, last: 0, dirty: true, chapter: -1 });

  const [playing, setPlaying] = useState(true);
  const [sound, setSound] = useState(false);
  const [isFs, setIsFs] = useState(false);

  const syncAudio = useCallback(() => {
    const s = st.current;
    if (s.sound && s.playing && !s.scrubbing) audio.play(s.t);
    else audio.stop();
  }, []);

  const updateUI = useCallback(() => {
    const s = st.current;
    if (sliderRef.current && !s.scrubbing) sliderRef.current.value = String(Math.round(s.t * 1000));
    if (sliderRef.current) sliderRef.current.style.setProperty("--p", `${(s.t / DURATION) * 100}%`);
    if (timeRef.current) {
      const sec = Math.floor(s.t);
      timeRef.current.textContent = `${pad(sec)}:${pad((s.t - sec) * FPS)} / ${pad(DURATION)}:00`;
    }
    let ch = 0;
    CHAPTERS.forEach((c, i) => {
      if (s.t >= c.t) ch = i;
    });
    if (ch !== s.chapter) {
      s.chapter = ch;
      chapterRefs.current.forEach((el, i) => {
        if (!el) return;
        el.dataset.active = i === ch ? "true" : "false";
      });
    }
  }, []);

  // render loop
  useEffect(() => {
    const ctx = canvasRef.current!.getContext("2d")!;
    let raf = 0;
    const tick = (now: number) => {
      const s = st.current;
      if (s.playing && !s.scrubbing) {
        const dt = Math.min(0.1, (now - s.last) / 1000);
        s.t += dt;
        if (s.t >= DURATION) {
          s.t = 0;
          if (s.sound) audio.play(0);
        }
        s.dirty = true;
      }
      s.last = now;
      if (s.dirty) {
        render(ctx, s.t);
        s.dirty = false;
        updateUI();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame((n) => {
      st.current.last = n;
      tick(n);
    });

    // make sure the typefaces are ready, then repaint
    const fams = [
      '400 100px "Anton"',
      '600 20px "JetBrains Mono"',
      '500 20px "JetBrains Mono"',
      'italic 400 40px "EB Garamond"',
    ];
    Promise.all([
      ...fams.map((f) => document.fonts.load(f, "ABC123")),
      document.fonts.load('700 15px "JetBrains Mono"', "ΚΡΙΟΣ ΤΑΥΡΟΣ"),
    ])
      .catch(() => undefined)
      .then(() => {
        st.current.dirty = true;
      });

    return () => {
      cancelAnimationFrame(raf);
      audio.stop();
    };
  }, [updateUI]);

  const togglePlay = useCallback(() => {
    const s = st.current;
    if (!s.playing && s.t >= DURATION - 0.05) s.t = 0;
    s.playing = !s.playing;
    setPlaying(s.playing);
    s.dirty = true;
    syncAudio();
  }, [syncAudio]);

  const seek = useCallback(
    (t: number) => {
      const s = st.current;
      s.t = Math.max(0, Math.min(DURATION - 0.001, t));
      s.dirty = true;
      if (!s.scrubbing) syncAudio();
    },
    [syncAudio]
  );

  const toggleSound = useCallback(() => {
    const s = st.current;
    s.sound = !s.sound;
    setSound(s.sound);
    syncAudio();
  }, [syncAudio]);

  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    const onKey = (e: KeyboardEvent) => {
      if (!active.current) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") seek(st.current.t + 1);
      else if (e.key === "ArrowLeft") seek(st.current.t - 1);
      else if (e.key === "f") toggleFs();
      else if (e.key === "m") toggleSound();
      else if (/^[1-6]$/.test(e.key)) seek(CHAPTERS[Number(e.key) - 1].t);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, togglePlay, seek, toggleFs, toggleSound]);

  const btn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200/20 bg-white/5 text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-300/10 hover:text-white active:scale-95";

  return (
    <div
      ref={wrapRef}
      className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[#020407] px-0 py-2 text-amber-50"
    >
      <div
        className="relative overflow-hidden bg-black shadow-[0_0_120px_rgba(240,185,90,0.12)] ring-1 ring-amber-200/10"
        style={{ width: "min(100%, calc((100vh - 120px) * 16 / 9))", aspectRatio: "16 / 9" }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-full w-full cursor-pointer"
          onClick={togglePlay}
        />
      </div>

      <div
        className="flex flex-col gap-2 px-3"
        style={{ width: "min(100%, calc((100vh - 120px) * 16 / 9))" }}
      >
        <div className="flex items-center gap-3">
          <button className={btn} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} title="Space">
            {playing ? Icon.pause : Icon.play}
          </button>
          <button className={btn} onClick={() => seek(0)} aria-label="Restart" title="Restart">
            {Icon.replay}
          </button>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={DURATION * 1000}
            step={1}
            defaultValue={0}
            className="reel-range flex-1"
            aria-label="Timeline"
            onPointerDown={() => {
              st.current.scrubbing = true;
              audio.stop();
            }}
            onPointerUp={() => {
              st.current.scrubbing = false;
              syncAudio();
            }}
            onInput={(e) => seek(Number((e.target as HTMLInputElement).value) / 1000)}
          />
          <span ref={timeRef} className="w-36 shrink-0 text-right font-mono text-xs tracking-widest text-amber-200/80">
            00:00 / 15:00
          </span>
          <button
            className={`${btn} ${sound ? "!border-amber-300/70 !bg-amber-300/15" : ""}`}
            onClick={toggleSound}
            aria-label="Toggle sound"
            title="Sound (M)"
          >
            {sound ? Icon.soundOn : Icon.soundOff}
          </button>
          <button className={btn} onClick={toggleFs} aria-label="Fullscreen" title="Fullscreen (F)">
            {isFs ? Icon.full : Icon.full}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] tracking-[0.2em]">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.label}
              ref={(el) => {
                chapterRefs.current[i] = el;
              }}
              data-active={i === 0 ? "true" : "false"}
              onClick={() => seek(c.t)}
              className="chapter rounded-full border border-amber-200/15 px-3 py-1 text-amber-100/50 transition hover:border-amber-300/50 hover:text-amber-100"
            >
              {c.label}
            </button>
          ))}
          <span className="ml-auto hidden text-amber-100/35 sm:inline">
            SPACE · ←/→ · 1–6 · M · F
          </span>
        </div>
      </div>
    </div>
  );
}
