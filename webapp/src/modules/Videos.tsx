import { lazy, Suspense, useState, type ComponentType } from "react";
import { ModuleHeader, Panel, Section, Tag } from "../components/ui";
import { getModule } from "../lib/theme";
import { useLang } from "../lib/i18n";
import { cn } from "../utils/cn";

const HistoryReel = lazy(() => import("../reels/history/Reel"));
const ShowReel = lazy(() => import("../reels/showreel/Reel"));
const AntikytheraReel = lazy(() => import("../reels/antikythera/Reel"));

interface Reel {
  id: string;
  Player: ComponentType;
  title: string;
  length: string;
  blurb: string;
  tags: string[];
}

const REELS: Reel[] = [
  {
    id: "history",
    Player: HistoryReel,
    title: "A Short History of the Processor",
    length: "1837 → 2024",
    blurb:
      "The whole arc in one timeline: Babbage's Analytical Engine, von Neumann's stored-program design, the Intel 4004, RISC & pipelining, the multi-core era, and chiplets & AI silicon.",
    tags: ["timeline", "history"],
  },
  {
    id: "showreel",
    Player: ShowReel,
    title: "ArchLab Motion Showreel",
    length: "4 scenes",
    blurb:
      "The four core ideas of this site — logic, pipelining, memory and multi-core — as hand-drawn motion scenes. Module 01–04's material, set in motion.",
    tags: ["logic", "pipeline", "memory", "multicore"],
  },
  {
    id: "antikythera",
    Player: AntikytheraReel,
    title: "The Antikythera Mechanism",
    length: "~100 BC",
    blurb:
      "Two thousand years before the CPU: hand-cut bronze gears, interlocking to track lunar months and the Saros eclipse cycle. The first analog computer — and the same lesson about mechanism and prediction.",
    tags: ["analog", "gears", "astronomy"],
  },
];

export default function Videos() {
  const mod = getModule("videos");
  const { t, ts } = useLang();
  const [sel, setSel] = useState(0);
  const reel = REELS[sel];

  return (
    <div>
      <ModuleHeader mod={mod}>
        {t("The same ideas this site teaches, rendered as motion design. Pick a reel: the processor's history, the four core modules set in motion, or the 2,000-year-old gearwork that started it all.")}
      </ModuleHeader>

      <Section
        mod={mod}
        num="6.1"
        title={ts("Watch")}
        lead={t("Every reel is drawn live on a canvas by TypeScript code in this repo (src/reels) — no video files. Click to play, scrub the timeline, press F for fullscreen, M for sound.")}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Panel title={t(reel.title)} right={<Tag color={mod.hex}>{reel.length === "4 scenes" || reel.length === "~100 BC" ? t(reel.length) : reel.length}</Tag>} bodyClassName="p-3 sm:p-4">
            <Suspense fallback={<div className="flex aspect-video w-full items-center justify-center rounded-xl border border-line bg-black text-xs tracking-widest text-dim">{t("Loading reel…")}</div>}>
              <div key={reel.id} className="overflow-hidden rounded-xl border border-line bg-black" role="region" aria-label={ts(reel.title)}>
                <reel.Player />
              </div>
            </Suspense>
            <p className="mt-3 px-1 text-sm leading-relaxed text-mute">{t(reel.blurb)}</p>
          </Panel>

          <div className="space-y-3">
            {REELS.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setSel(i)}
                className={cn(
                  "w-full rounded-xl border bg-surface/70 p-4 text-start transition-all duration-200 hover:-translate-y-0.5",
                  i === sel ? "border-vid/60 shadow-[0_0_18px_rgba(244,114,182,0.12)]" : "border-line hover:border-dim",
                )}
                aria-pressed={i === sel}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-bold", i === sel ? "text-vid" : "text-ink")}>{t(r.title)}</span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-dim">{r.length === "4 scenes" || r.length === "~100 BC" ? t(r.length) : r.length}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-dim">{t(r.blurb)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.tags.map((tg) => (
                    <Tag key={tg} color={i === sel ? "#f472b6" : "#62709b"}>
                      {t(tg)}
                    </Tag>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
