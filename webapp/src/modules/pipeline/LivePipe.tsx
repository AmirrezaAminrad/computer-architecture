import type { Schedule } from "../../lib/pipeline";
import { STAGES, STAGE_INFO } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

export function LivePipe({ sched, t }: { sched: Schedule; t: number }) {
  const { t: tr } = useLang();
  const occupant: (number | null)[] = STAGES.map(() => null);
  const minStageBehind: number[] = []; // for bubble detection
  sched.rows.forEach((row, ri) => {
    const c = row.cells.find((x) => x.cycle === t);
    if (c) {
      const si = STAGES.indexOf(c.stage);
      occupant[si] = ri;
      minStageBehind.push(si);
    }
  });
  const youngest = minStageBehind.length ? Math.min(...minStageBehind) : 99;

  return (
    <div className="relative" dir="ltr">
      {/* columns are exactly 20% each (no gap) so the chip overlay below lines up */}
      <div className="grid grid-cols-5">
        {STAGES.map((s, i) => {
          const info = STAGE_INFO[s];
          const bubble = occupant[i] === null && t >= 1 && youngest < i && occupant.some((o, k) => k > i && o !== null);
          return (
            <div key={s} className="mx-0.5 rounded-xl border px-1 py-1.5 text-center sm:px-2" style={{ borderColor: info.hex + "55", background: info.hex + "10" }}>
              <div className="font-mono text-[11px] font-bold sm:text-xs" style={{ color: info.hex }}>{s}</div>
              <div className="hidden text-[10px] text-dim sm:block">{tr(info.name)}</div>
              <div className="relative mt-1.5 h-[54px] sm:h-[58px]">
                {bubble && (
                  <div className="absolute inset-x-0.5 inset-y-0 flex items-center justify-center rounded-lg border border-dashed border-warn/50 text-[10px] font-semibold uppercase tracking-wider text-mem/80">
                    {tr("bubble")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* flowing chips, overlaid on the same grid geometry */}
      <div className="pointer-events-none absolute inset-x-0 bottom-1.5 h-[54px] overflow-hidden sm:h-[58px]">
        {sched.rows.map((row, ri) => {
          const first = row.cells[0].cycle;
          const lastC = row.cells[row.cells.length - 1];
          const cur = row.cells.find((x) => x.cycle === t);
          let left = -22;
          let opacity = 0;
          let shift = 0;
          let color = "#98a4cb";
          let stall = false;
          if (cur) {
            left = STAGES.indexOf(cur.stage) * 20;
            opacity = 1;
            color = STAGE_INFO[cur.stage].hex;
            stall = cur.stall;
            if (cur.flushed) color = "#fb7185";
          } else if (t > lastC.cycle) {
            if (row.ghost) {
              left = STAGES.indexOf(lastC.stage) * 20;
              shift = 14;
            } else left = 100;
          } else if (t < first) {
            left = -22;
          }
          const flushedNow = cur?.flushed;
          return (
            <div
              key={ri}
              className="absolute top-0 h-full px-0.5 sm:px-1"
              style={{
                width: "20%",
                left: `${left}%`,
                opacity,
                transform: `translateY(${shift}px)`,
                transition: "left .55s cubic-bezier(.4,.1,.2,1), opacity .4s, transform .4s",
              }}
            >
              <div
                className="flex h-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 px-1 text-center"
                style={{
                  borderColor: stall ? "#fbbf24" : color,
                  background: (stall ? "#fbbf24" : color) + "26",
                  borderStyle: stall || row.ghost ? "dashed" : "solid",
                  boxShadow: `0 0 14px ${color}44`,
                }}
              >
                <div className="w-full truncate font-mono text-[9.5px] font-bold leading-tight text-ink sm:text-[11px]">{row.text.replace("↯ ", "")}</div>
                <div className="text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]" style={{ color: stall ? "#fbbf24" : color }}>
                  {flushedNow ? tr("flushed ✕") : stall ? tr("stalled") : row.ghost ? tr("wrong path") : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
