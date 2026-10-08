import { useId } from "react";
import type { Schedule } from "../../lib/pipeline";
import { STAGE_INFO } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

interface Props {
  sched: Schedule;
  /** reveal cycles ≤ t */
  t: number;
  arrows?: boolean;
  colW?: number;
  labelW?: number;
  rowH?: number;
}

export function Gantt({ sched, t, arrows = true, colW = 50, labelW = 168, rowH = 36 }: Props) {
  const { t: tr, ts } = useLang();
  // several Gantts can be on the page at once; defs ids must not collide
  const uid = useId().replace(/:/g, "");
  const hatchId = `${uid}-hatch`;
  const arrGoodId = `${uid}-arr-good`;
  const arrBadId = `${uid}-arr-bad`;
  const head = 30;
  const cols = Math.max(sched.total, 1);
  const W = labelW + cols * colW + 12;
  const H = head + sched.rows.length * rowH + 10;
  const cx = (cycle: number) => labelW + (cycle - 1) * colW + colW / 2;
  const cy = (row: number) => head + row * rowH + rowH / 2;

  return (
    <div className="overflow-x-auto pb-1" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: Math.min(W, 900), width: "100%", maxWidth: W * 1.3 }} role="img" aria-label={ts("Pipeline timing diagram")}>
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fbbf2418" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#fbbf2455" strokeWidth="2" />
          </pattern>
          <marker id={arrGoodId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#34d399" />
          </marker>
          <marker id={arrBadId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#fb7185" />
          </marker>
        </defs>

        {/* current-cycle band */}
        {t >= 1 && t <= cols && (
          <rect x={labelW + (t - 1) * colW} y={2} width={colW} height={H - 6} rx={8} fill="#ffffff" opacity={0.06} style={{ transition: "x .3s" }} />
        )}

        {/* header */}
        {Array.from({ length: cols }).map((_, i) => (
          <text key={i} x={cx(i + 1)} y={20} textAnchor="middle" fontSize={11} fontWeight={i + 1 === t ? 800 : 500} fill={i + 1 === t ? "#e8ecfb" : "#62709b"}>
            {i + 1}
          </text>
        ))}
        <text x={labelW - 8} y={20} textAnchor="end" fontSize={10} fill="#62709b" letterSpacing={1.5}>{tr("CYCLE")}</text>

        {/* rows */}
        {sched.rows.map((row, ri) => (
          <g key={ri}>
            <line x1={0} x2={W} y1={head + ri * rowH} y2={head + ri * rowH} stroke="#223052" strokeOpacity={0.5} />
            <text x={labelW - 10} y={cy(ri) + 4} textAnchor="end" fontSize={12} fill={row.ghost ? "#fb7185" : "#e8ecfb"} fontStyle={row.ghost ? "italic" : "normal"} opacity={row.ghost ? 0.85 : 1}>
              {row.text}
            </text>
            {row.cells.map((c, ci) => {
              const vis = c.cycle <= t;
              const info = STAGE_INFO[c.stage];
              const x = labelW + (c.cycle - 1) * colW + 3;
              const y = head + ri * rowH + 4;
              return (
                <g key={ci} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(6px)", transition: "opacity .35s, transform .35s" }}>
                  <rect
                    x={x}
                    y={y}
                    width={colW - 6}
                    height={rowH - 8}
                    rx={7}
                    fill={c.stall ? `url(#${hatchId})` : c.flushed || row.ghost ? "#fb718522" : info.hex + "30"}
                    stroke={c.stall ? "#fbbf24" : row.ghost ? "#fb7185" : info.hex}
                    strokeWidth={c.cycle === t ? 2.5 : 1.5}
                    strokeDasharray={c.stall || row.ghost ? "4 3" : undefined}
                  />
                  <text x={x + (colW - 6) / 2} y={y + (rowH - 8) / 2 + 4} textAnchor="middle" fontSize={colW < 44 ? 10 : 11} fontWeight={700} fill={c.stall ? "#fbbf24" : row.ghost ? "#fb7185" : info.hex}>
                    {c.stall ? tr("stall") : c.stage}
                  </text>
                  {c.flushed && (
                    <g stroke="#fb7185" strokeWidth={2} strokeLinecap="round">
                      <line x1={x + colW - 18} y1={y + 3} x2={x + colW - 10} y2={y + 11} />
                      <line x1={x + colW - 10} y1={y + 3} x2={x + colW - 18} y2={y + 11} />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        ))}

        {/* hazard / forwarding arrows */}
        {arrows &&
          sched.deps.map((d, i) => {
            const vis = d.to.cycle <= t && d.from.cycle <= t;
            const x1 = cx(d.from.cycle);
            const y1 = cy(d.producer) + rowH / 2 - 6;
            const x2 = cx(d.to.cycle);
            const y2 = cy(d.consumer) - rowH / 2 + 7;
            const color = d.forwarded ? "#34d399" : "#fb7185";
            const dy = Math.max(12, (y2 - y1) * 0.45);
            return (
              <path
                key={i}
                d={`M${x1} ${y1} C${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                markerEnd={d.forwarded ? `url(#${arrGoodId})` : `url(#${arrBadId})`}
                style={{ opacity: vis ? 0.95 : 0, transition: "opacity .4s", filter: `drop-shadow(0 0 4px ${color}88)` }}
              />
            );
          })}
      </svg>
    </div>
  );
}
