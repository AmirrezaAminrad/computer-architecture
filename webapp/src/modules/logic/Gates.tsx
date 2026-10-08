import { useState } from "react";
import { GATE_FN, GateShape, Lamp, SvgSwitch, Wire, gateGeom, type GateType } from "../../components/gates";
import { Callout, Panel, Switch } from "../../components/ui";
import { cn } from "../../utils/cn";
import { useLang } from "../../lib/i18n";

const GATES: { type: GateType; expr: string; desc: string }[] = [
  { type: "AND", expr: "A · B", desc: "1 only when both inputs are 1" },
  { type: "OR", expr: "A + B", desc: "1 when at least one input is 1" },
  { type: "NOT", expr: "¬A", desc: "Inverts its single input" },
  { type: "XOR", expr: "A ⊕ B", desc: "1 when the inputs differ" },
  { type: "NAND", expr: "¬(A · B)", desc: "AND, inverted — a universal gate" },
  { type: "NOR", expr: "¬(A + B)", desc: "OR, inverted — also universal" },
];

function GateCard({ type, expr, desc, a, b, onA, onB }: { type: GateType; expr: string; desc: string; a: number; b: number; onA: () => void; onB: () => void }) {
  const { t } = useLang();
  const unary = type === "NOT";
  const out = GATE_FN[type](a, b);
  const gx = 78;
  const gy = 0;
  const geom = gateGeom(type);
  const inYs = geom.inY.map((y) => y + gy);
  const outX = gx + geom.outX;
  const rows = unary ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];

  return (
    <div className={cn("rounded-2xl border bg-surface/80 p-4 transition-colors duration-300", out ? "border-logic/40" : "border-line")}>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="font-mono text-lg font-bold tracking-wide text-ink">{type}</h3>
        <span className="font-mono text-sm text-logic">{expr}</span>
      </div>
      <p className="mb-2 text-xs text-dim">{t(desc)}</p>

      <svg viewBox="-24 0 294 80" className="w-full" role="img" aria-label={`${type} gate: output ${out}`}>
        {/* input wires */}
        {inYs.map((y, i) => (
          <Wire key={i} pts={[[44, y], [gx + geom.inX, y]]} on={(i === 0 ? a : b) === 1} />
        ))}
        {/* output wire */}
        <Wire pts={[[outX, 40], [212, 40]]} on={out === 1} />
        <GateShape type={type} x={gx} y={gy} out={out} />
        <SvgSwitch x={-4} cy={inYs[0]} value={a} label="A" onToggle={onA} />
        {!unary && <SvgSwitch x={-4} cy={inYs[1]} value={b} label="B" onToggle={onB} />}
        <Lamp x={226} y={40} value={out} label="" />
      </svg>

      <table className="mt-2 w-full text-center font-mono text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-widest text-dim">
            <th className="py-1 font-semibold">A</th>
            {!unary && <th className="py-1 font-semibold">B</th>}
            <th className="py-1 font-semibold text-logic">{t("Out")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const o = GATE_FN[type](r[0], r[1] ?? 0);
            const cur = unary ? r[0] === a : r[0] === a && r[1] === b;
            return (
              <tr key={r.join("")} className={cn("transition-colors duration-200", cur ? "bg-logic/15 text-ink" : "text-dim")}>
                {r.map((v, i) => (
                  <td key={i} className="py-1">{v}</td>
                ))}
                <td className={cn("py-1 font-bold", o ? "text-logic" : "text-dim")}>{o}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Gates() {
  const { t, tf } = useLang();
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);

  return (
    <div className="space-y-4">
      <Panel title={t("Shared inputs")} bodyClassName="flex flex-wrap items-center gap-x-8 gap-y-3">
        <Switch on={a === 1} onChange={(v) => setA(v ? 1 : 0)} label={tf("Input A = {v}", { v: a })} hint={t("drives all six gates")} color="#22d3ee" />
        <Switch on={b === 1} onChange={(v) => setB(v ? 1 : 0)} label={tf("Input B = {v}", { v: b })} hint={t("NOT ignores B")} color="#22d3ee" />
        <p className="text-xs text-dim sm:ms-auto sm:max-w-xs">
          {t("You can also click the switches drawn inside each gate. The highlighted truth-table row is the one you're currently in.")}
        </p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GATES.map((g) => (
          <GateCard key={g.type} {...g} a={a} b={b} onA={() => setA(a ^ 1)} onB={() => setB(b ^ 1)} />
        ))}
      </div>

      <Callout title={t("Why NAND and NOR are special")} tone="note">
        {t("Every other gate can be built from NAND alone (or from NOR alone):")} <span className="font-mono text-ink">NOT A = NAND(A, A)</span>
        {t(", and AND is a NAND followed by that NOT. Real chips are built from CMOS transistors, where NAND and NOR are the natural, cheapest single-stage gates.")}
      </Callout>
    </div>
  );
}
