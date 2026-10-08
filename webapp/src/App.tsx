import { useCallback, useEffect, useState } from "react";
import { MODULES, getModule, type ModuleId } from "./lib/theme";
import { useLang, type Lang } from "./lib/i18n";
import { cn } from "./utils/cn";
import CpuModule from "./modules/Cpu";
import Digital from "./modules/Digital";
import Logic from "./modules/Logic";
import Memory from "./modules/Memory";
import Overview from "./modules/Overview";
import PipelineModule from "./modules/Pipeline";
import Videos from "./modules/Videos";

const IDS = MODULES.map((m) => m.id);

function readHash(): ModuleId {
  const h = window.location.hash.replace(/^#\/?/, "") as ModuleId;
  return IDS.includes(h) ? h : "overview";
}

function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, ts } = useLang();
  const opts: { value: Lang; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "fa", label: "فا" },
  ];
  return (
    <div className={cn("inline-flex rounded-lg border border-line bg-bg/60 p-0.5", className)} role="group" aria-label={ts("Language")}>
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setLang(o.value)}
          aria-pressed={lang === o.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-bold transition-all duration-150",
            lang === o.value ? "bg-ink text-bg shadow" : "text-mute hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Logo() {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect x="1.5" y="1.5" width="27" height="27" rx="7" fill="#0d1427" stroke="#2f3f6e" strokeWidth="1.5" />
        <rect x="8" y="8" width="14" height="14" rx="3" fill="none" stroke="#22d3ee" strokeWidth="1.8" />
        {[10, 15, 20].map((p) => (
          <g key={p} stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round">
            <line x1={p} y1="3.5" x2={p} y2="8" />
            <line x1={p} y1="22" x2={p} y2="26.5" />
            <line x1="3.5" y1={p} x2="8" y2={p} />
            <line x1="22" y1={p} x2="26.5" y2={p} />
          </g>
        ))}
        <circle cx="15" cy="15" r="2.4" fill="#34d399" />
      </svg>
      <div className="leading-tight">
        <div className="text-[17px] font-bold tracking-tight text-ink">ArchLab</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">{t("Computer Architecture")}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<ModuleId>(readHash);
  const { t, ts } = useLang();

  useEffect(() => {
    const onHash = () => setPage(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((id: ModuleId) => {
    window.location.hash = `/${id}`;
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const m = getModule(page);
    document.title = page === "overview" ? ts("ArchLab — Interactive Computer Architecture") : `${ts(m.short)} · ArchLab`;
  }, [page, ts]);

  // only a page change jumps to the top — switching language keeps the reader where they were
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  const idx = IDS.indexOf(page);
  const prev = idx > 0 ? MODULES[idx - 1] : null;
  const next = idx < MODULES.length - 1 ? MODULES[idx + 1] : null;

  return (
    <div className="min-h-screen lg:ps-[272px]">
      {/* sidebar (desktop) */}
      <aside className="fixed inset-y-0 start-0 hidden w-[272px] flex-col border-e border-line bg-bg/80 px-4 py-6 backdrop-blur lg:flex">
        <div className="mb-4 flex items-start justify-between gap-2">
          <button onClick={() => go("overview")} className="px-2 text-start" aria-label={ts("ArchLab home")}>
            <Logo />
          </button>
          <LangToggle />
        </div>
        <nav className="flex-1 space-y-1.5" aria-label={ts("Modules")}>
          {MODULES.map((m) => {
            const active = m.id === page;
            return (
              <button
                key={m.id}
                onClick={() => go(m.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-start transition-all duration-200",
                  active ? cn("bg-white/[0.06]", m.border) : "border-transparent hover:bg-white/5",
                )}
              >
                <span
                  className={cn("mt-0.5 flex h-6 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold transition-colors", active ? "text-bg" : cn(m.text, m.bgSoft))}
                  style={active ? { background: m.hex } : undefined}
                >
                  {m.num}
                </span>
                <span>
                  <span className={cn("block text-sm font-semibold leading-tight", active ? "text-ink" : "text-mute group-hover:text-ink")}>{t(m.short)}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-dim">{m.id === "overview" ? t("How the pieces fit") : t(m.question)}</span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="mt-6 rounded-xl border border-line bg-surface/60 p-3 text-[11px] leading-relaxed text-dim">
          {t("Every simulation runs live in your browser. Simplifications are called out where they occur — the structure is faithful, the numbers are textbook-typical.")}
        </div>
      </aside>

      {/* top bar (mobile / tablet) */}
      <div className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => go("overview")} aria-label={ts("ArchLab home")}><Logo /></button>
          <LangToggle />
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3" aria-label={ts("Modules")}>
          {MODULES.map((m) => {
            const active = m.id === page;
            return (
              <button
                key={m.id}
                onClick={() => go(m.id)}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", active ? "text-bg" : "border-line text-mute hover:text-ink")}
                style={active ? { background: m.hex, borderColor: m.hex } : undefined}
              >
                {m.num !== "00" && <span className="me-1 font-mono opacity-70">{m.num}</span>}
                {t(m.short)}
              </button>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8 sm:py-12">
        <div key={page} className="rise-in">
          {page === "overview" && <Overview go={go} />}
          {page === "logic" && <Logic />}
          {page === "digital" && <Digital />}
          {page === "cpu" && <CpuModule />}
          {page === "memory" && <Memory />}
          {page === "pipeline" && <PipelineModule />}
          {page === "videos" && <Videos />}
        </div>

        {/* prev / next */}
        <div className="mt-8 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
          {prev ? (
            <button onClick={() => go(prev.id)} className="group rounded-xl border border-line bg-surface/60 p-4 text-start transition hover:border-dim">
              <div className="text-[11px] uppercase tracking-widest text-dim">{t("← Previous")}</div>
              <div className={cn("mt-1 font-semibold", prev.text)}>{prev.num !== "00" ? `${prev.num} · ` : ""}{t(prev.title)}</div>
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button onClick={() => go(next.id)} className="group rounded-xl border border-line bg-surface/60 p-4 text-end transition hover:border-dim">
              <div className="text-[11px] uppercase tracking-widest text-dim">{t("Next →")}</div>
              <div className={cn("mt-1 font-semibold", next.text)}>{next.num} · {t(next.title)}</div>
            </button>
          )}
        </div>
        <footer className="mt-10 pb-4 text-center text-xs text-dim">
          {t("ArchLab · an interactive tour of computer architecture · built with React, SVG and Tailwind")}
        </footer>
      </main>
    </div>
  );
}
