import { useState } from "react";
import { Panel, Segmented } from "../../components/ui";
import { Lamp, SvgSwitch, Wire } from "../../components/gates";
import { SIGNAL } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

/* ── small local shapes ─────────────────────────────────── */

function And3({ x, y, out }: { x: number; y: number; out: number }) {
  const on = out === 1;
  return (
    <g transform={`translate(${x} ${y})`} style={{ filter: on ? "drop-shadow(0 0 6px rgba(34,211,238,0.55))" : "none", transition: "filter .25s" }}>
      <path d="M0 0 H40 A40 40 0 0 1 40 80 H0 Z" fill={on ? SIGNAL.bodyOn : SIGNAL.body} stroke={on ? SIGNAL.on : "#7482b0"} strokeWidth={2.5} strokeLinejoin="round" style={{ transition: "fill .25s, stroke .25s" }} />
    </g>
  );
}

function Or4({ x, y, out }: { x: number; y: number; out: number }) {
  const on = out === 1;
  return (
    <g transform={`translate(${x} ${y})`} style={{ filter: on ? "drop-shadow(0 0 6px rgba(34,211,238,0.55))" : "none", transition: "filter .25s" }}>
      <path d="M0 16 Q55 16 100 64 Q55 112 0 112 Q30 64 0 16 Z" fill={on ? SIGNAL.bodyOn : SIGNAL.body} stroke={on ? SIGNAL.on : "#7482b0"} strokeWidth={2.5} strokeLinejoin="round" style={{ transition: "fill .25s, stroke .25s" }} />
    </g>
  );
}

function TopToggle({ x, cy, value, label, onToggle }: { x: number; cy: number; value: number; label: string; onToggle?: () => void }) {
  return (
    <g transform={`translate(${x} ${cy})`} onClick={onToggle} style={{ cursor: onToggle ? "pointer" : "default" }}>
      <text x={0} y={-22} fontSize={12} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">{label}</text>
      <rect x={-15} y={-13} width={30} height={26} rx={8} fill={value ? "rgba(34,211,238,.22)" : "#141d37"} stroke={value ? SIGNAL.on : "#4a5886"} strokeWidth={2} style={{ transition: "all .2s" }} />
      <text x={0} y={4.5} fontSize={12} fontWeight={800} textAnchor="middle" fill={value ? SIGNAL.on : SIGNAL.dim} style={{ transition: "all .2s" }}>{value}</text>
    </g>
  );
}

function BusLine({ x, y1, y2, on }: { x: number; y1: number; y2: number; on: boolean }) {
  return <line x1={x} y1={y1} x2={x} y2={y2} stroke={on ? SIGNAL.on : SIGNAL.off} strokeWidth={2.5} style={{ transition: "stroke .25s" }} />;
}

/* ── Tab A: gate-level 4×1 MUX ──────────────────────────── */

const CELL_Y = [70, 154, 238, 322];
const XB = { s1bar: 210, s1: 254, s0bar: 298, s0: 342 };

function MuxGates() {
  const { t } = useLang();
  const [d, setD] = useState([0, 1, 0, 0]);
  const [s1, setS1] = useState(0);
  const [s0, setS0] = useState(0);
  const sel = s1 * 2 + s0;
  const f = d[sel];

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("4-to-1 multiplexer — gates")} bodyClassName="overflow-x-auto">
        <div dir="ltr">
          <svg width={800} height={430} viewBox="0 0 800 430" className="max-w-full">
            <g transform="translate(0 64)">
            {/* select buses (complement buses fed through top inverters) */}
            <BusLine x={XB.s1bar} y1={-21} y2={352} on={s1 === 0} />
            <BusLine x={XB.s1} y1={-21} y2={352} on={s1 === 1} />
            <BusLine x={XB.s0bar} y1={-21} y2={352} on={s0 === 0} />
            <BusLine x={XB.s0} y1={-21} y2={352} on={s0 === 1} />
            {/* inverters in the top corridor (above gate-0 tap wires): S bus → left-pointing NOT → S̄ bus */}
            {[
              { xs: XB.s1, xb: XB.s1bar, on: s1 === 1, out: s1 === 0 },
              { xs: XB.s0, xb: XB.s0bar, on: s0 === 1, out: s0 === 0 },
            ].map(({ xs, xb, on, out }) => (
              <g key={xb}>
                <Wire pts={[[xs, 30], [xb + 30, 30]]} on={on} w={2} />
                <path d={`M${xb + 30} 22 L${xb + 30} 38 L${xb + 8} 30 Z`} fill={out ? SIGNAL.bodyOn : SIGNAL.body} stroke={out ? SIGNAL.on : "#7482b0"} strokeWidth={2} style={{ transition: "all .25s" }} />
                <circle cx={xb + 4} cy={30} r={4} fill={out ? SIGNAL.bodyOn : SIGNAL.body} stroke={out ? SIGNAL.on : "#7482b0"} strokeWidth={2} style={{ transition: "all .25s" }} />
              </g>
            ))}
            <TopToggle x={XB.s1} cy={-34} value={s1} label="S₁" onToggle={() => setS1(1 - s1)} />
            <TopToggle x={XB.s0} cy={-34} value={s0} label="S₀" onToggle={() => setS0(1 - s0)} />
            <TopToggle x={XB.s1bar} cy={-34} value={1 - s1} label="S̄₁" />
            <TopToggle x={XB.s0bar} cy={-34} value={1 - s0} label="S̄₀" />

            {/* data + AND3 gates */}
            {d.map((dv, i) => {
              const cy = CELL_Y[i];
              const b1 = (i >> 1) & 1;
              const b0 = i & 1;
              const andOut = dv && (b1 === s1) && (b0 === s0) ? 1 : 0;
              const line1X = b1 ? XB.s1 : XB.s1bar;
              const line2X = b0 ? XB.s0 : XB.s0bar;
              const orInY = 112 + i * 32;
              const routeX = 556 + i * 8;
              return (
                <g key={i}>
                  <SvgSwitch x={40} cy={cy} value={dv} label={`D${i}`} onToggle={() => setD(d.map((v, k) => (k === i ? 1 - v : v)))} />
                  <Wire pts={[[90, cy], [470, cy]]} on={dv === 1} />
                  <Wire pts={[[line1X, cy - 24], [470, cy - 24]]} on={b1 === s1} />
                  <Wire pts={[[line2X, cy + 24], [470, cy + 24]]} on={b0 === s0} />
                  <circle cx={line1X} cy={cy - 24} r={4} fill={b1 === s1 ? SIGNAL.on : SIGNAL.off} />
                  <circle cx={line2X} cy={cy + 24} r={4} fill={b0 === s0 ? SIGNAL.on : SIGNAL.off} />
                  <And3 x={470} y={cy - 40} out={andOut} />
                  <Wire pts={[[550, cy], [routeX, cy], [routeX, orInY], [600, orInY]]} on={andOut === 1} />
                </g>
              );
            })}

            <Or4 x={600} y={96} out={f} />
            <Wire pts={[[700, 160], [726, 160]]} on={f === 1} />
            <Lamp x={748} y={160} value={f} label="F" />
            </g>
          </svg>
        </div>
      </Panel>

      <Panel title={t("Function table")}>
        <table className="w-full max-w-[320px] text-center font-mono text-[14px]" dir="ltr">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-dim">
              <th className="pb-2">S₁</th>
              <th className="pb-2">S₀</th>
              <th className="pb-2">F</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => (
              <tr key={i} className="border-t border-line/60" style={i === sel ? { background: "rgba(251,146,60,.12)" } : undefined}>
                <td className="py-1.5">{(i >> 1) & 1}</td>
                <td className="py-1.5">{i & 1}</td>
                <td className="py-1.5 font-bold" style={{ color: i === sel ? "#fb923c" : "#98a4cb" }}>D{i}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[13px] leading-relaxed text-mute">
          {t("Each AND gate passes its Dᵢ only when the select lines spell its own index; exactly one AND fires, and the OR collects the winner. The highlighted table row follows your selects.")}
        </p>
      </Panel>
    </div>
  );
}

/* ── Tab B: an 8×1 MUX implements a 4-variable function ──── */

const F_MINTERMS = new Set([0, 2, 5, 8, 9, 12, 13, 14, 15]);
const MUX_INPUTS = ["1", "A", "A′", "0", "A", "1", "A", "A"]; // I0..I7 (slide example)

function MuxImplements() {
  const { t } = useLang();
  const [a, setA] = useState(1);
  const [s, setS] = useState(5); // BCD select, 0..7
  const evalInput = (label: string) => (label === "1" ? 1 : label === "0" ? 0 : label === "A" ? a : 1 - a);
  const f = evalInput(MUX_INPUTS[s]);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <Panel title={t("8×1 MUX as a function of A")} bodyClassName="overflow-x-auto">
          <div dir="ltr">
            <svg width={560} height={345} viewBox="0 0 560 345" className="max-w-full">
              {/* A feeds the data inputs that depend on it: a rail with taps (A′ through an inverter bubble) */}
              <SvgSwitch x={34} cy={44} value={a} label="A" onToggle={() => setA(1 - a)} />
              <Wire pts={[[86, 44], [108, 44], [108, 220]]} on={a === 1} w={2} />
              {MUX_INPUTS.map((label, i) =>
                label === "A" || label === "A′" ? (
                  <g key={`tap${i}`}>
                    <Wire pts={[[108, 42 + i * 25.5], [label === "A" ? 126 : 118, 42 + i * 25.5]]} on={evalInput(label) === 1} w={2} />
                    {label === "A′" && <circle cx={122} cy={42 + i * 25.5} r={3.5} fill={SIGNAL.body} stroke={a === 0 ? SIGNAL.on : "#7482b0"} strokeWidth={1.5} />}
                    <circle cx={108} cy={42 + i * 25.5} r={3} fill={a === 1 ? SIGNAL.on : SIGNAL.off} />
                  </g>
                ) : null,
              )}
              {/* select switches */}
              {[
                { label: "B", bit: (s >> 2) & 1, set: (v: number) => setS((s & 0b011) | (v << 2)) },
                { label: "C", bit: (s >> 1) & 1, set: (v: number) => setS((s & 0b101) | (v << 1)) },
                { label: "D", bit: s & 1, set: (v: number) => setS((s & 0b110) | v) },
              ].map((sw, i) => (
                <SvgSwitch key={sw.label} x={40} cy={262 + i * 30} value={sw.bit} label={sw.label} onToggle={() => sw.set(1 - sw.bit)} />
              ))}
              {/* MUX block */}
              <path d="M230 20 L340 55 L340 205 L230 240 Z" fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
              <text x={262} y={136} fontSize={15} fontWeight={800} fill={SIGNAL.text}>MUX</text>
              <text x={262} y={156} fontSize={12} fontWeight={700} fill={SIGNAL.mute}>8→1</text>
              {/* data inputs */}
              {MUX_INPUTS.map((label, i) => {
                const y = 42 + i * 25.5;
                const active = i === s;
                const val = evalInput(label);
                return (
                  <g key={i}>
                    <Wire pts={[[150, y], [230, y]]} on={active && val === 1} w={active ? 3 : 2} />
                    <text x={144} y={y + 4} fontSize={13} fontWeight={700} textAnchor="end" fill={active ? SIGNAL.on : SIGNAL.mute}>
                      {label}
                    </text>
                    <text x={236} y={y + 4} fontSize={10} fontWeight={700} fill={active ? SIGNAL.on : SIGNAL.dim}>{`I${i}`}</text>
                    {active && <circle cx={230} cy={y} r={4} fill={SIGNAL.on} />}
                  </g>
                );
              })}
              {/* select wires — end on the slanted bottom edge */}
              {["B", "C", "D"].map((label, i) => {
                const ex = 250 + i * 35;
                const cy = 262 + i * 30;
                const edgeY = 240 - (ex - 230) * (35 / 110);
                return <Wire key={label} pts={[[90, cy], [ex, cy], [ex, edgeY]]} on={((s >> (2 - i)) & 1) === 1} w={2} />;
              })}
              {/* output */}
              <Wire pts={[[340, 130], [420, 130]]} on={f === 1} w={3} />
              <Lamp x={448} y={130} value={f} label="F" />
            </svg>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title={t("Implementation table — F(A,B,C,D)")}>
            <table className="w-full text-center font-mono text-[13px]" dir="ltr">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-dim">
                  <th className="pb-2 text-start">{t("row")}</th>
                  {Array.from({ length: 8 }, (_, j) => (
                    <th key={j} className="pb-2" style={j === s ? { color: "#fb923c" } : undefined}>
                      {String(j).padStart(3, "0")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1].map((row) => (
                  <tr key={row} className="border-t border-line/60">
                    <td className="py-1.5 text-start text-[12px] text-mute">{row === 0 ? "A′" : "A"}</td>
                    {Array.from({ length: 8 }, (_, j) => {
                      const m = row * 8 + j;
                      const circled = F_MINTERMS.has(m);
                      return (
                        <td key={j} className="py-1.5">
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border"
                            style={{
                              borderColor: circled ? (j === s ? "#fb923c" : "#98a4cb") : "transparent",
                              color: circled ? (j === s ? "#fb923c" : "#e8ecfb") : "#31406e",
                            }}
                          >
                            {m}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-line">
                  <td className="py-1.5 text-start text-[12px] font-bold text-digital">F</td>
                  {MUX_INPUTS.map((label, j) => (
                    <td key={j} className="py-1.5 font-bold" style={j === s ? { color: "#fb923c" } : { color: "#98a4cb" }}>
                      {label}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-[13px] leading-relaxed text-mute">
              {t("Fix B, C, D (the select lines) and F becomes a function of A alone: both minterms circled → wire 1; none → 0; only the bottom row → A; only the top row → A′. That reads the MUX inputs straight off the table — the bottom row is exactly I0…I7.")}
            </p>
          </Panel>
          <Panel title={t("Try it")}>
            <p className="text-[13px] leading-relaxed text-mute">
              {t("Flip A and the selects B, C, D: the active data input (I₀…I₇) glows and F follows it. Columns of the table highlight the select you chose.")}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ── Tab C: decoders + scalable trees ───────────────────── */

function DecoderBox({ x, y, w = 120, h = 110, title, active }: { x: number; y: number; w?: number; h?: number; title: string; active: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={10} fill={active ? SIGNAL.bodyOn : SIGNAL.body} stroke={active ? SIGNAL.on : "#4a5886"} strokeWidth={2.5} style={{ transition: "all .25s" }} />
      <text x={w / 2} y={h / 2 - 4} fontSize={14} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{title}</text>
    </g>
  );
}

function Decoders() {
  const { t } = useLang();
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const [e, setE] = useState(1);
  const activeOut = e ? a * 4 + b * 2 + c : -1;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("3×8 decoder with enable")} bodyClassName="overflow-x-auto">
          <div dir="ltr">
            <svg width={480} height={350} viewBox="0 0 480 350" className="max-w-full">
              <SvgSwitch x={30} cy={70} value={a} label="A" onToggle={() => setA(1 - a)} />
              <SvgSwitch x={30} cy={140} value={b} label="B" onToggle={() => setB(1 - b)} />
              <SvgSwitch x={30} cy={210} value={c} label="C" onToggle={() => setC(1 - c)} />
              <SvgSwitch x={30} cy={320} value={e} label="E" onToggle={() => setE(1 - e)} />
              <Wire pts={[[80, 70], [200, 70]]} on={a === 1} />
              <Wire pts={[[80, 140], [200, 140]]} on={b === 1} />
              <Wire pts={[[80, 210], [200, 210]]} on={c === 1} />
              <Wire pts={[[80, 320], [148, 320], [148, 275], [200, 275]]} on={e === 1} />
              <DecoderBox x={200} y={24} w={130} h={268} title="3×8 DEC" active={e === 1} />
              <text x={265} y={284} fontSize={12} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">E</text>
              {Array.from({ length: 8 }, (_, i) => {
                const on = i === activeOut;
                const y = 40 + i * 34;
                return (
                  <g key={i}>
                    <Wire pts={[[330, y], [382, y]]} on={on} w={on ? 3 : 2} />
                    <Lamp x={402} y={y} value={on ? 1 : 0} label={`D${i}`} />
                  </g>
                );
              })}
            </svg>
          </div>
        </Panel>

        <Panel title={t("Truth table")}>
          <table className="w-full text-center font-mono text-[12px]" dir="ltr">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-dim">
                <th className="pb-2">E</th>
                <th className="pb-2">A</th>
                <th className="pb-2">B</th>
                <th className="pb-2">C</th>
                <th className="pb-2">{t("active output")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { e: 0, label: "—" },
                ...Array.from({ length: 8 }, (_, i) => ({ e: 1, label: `D${i}` })),
              ].map((row, idx) => {
                const isActive = row.e === 1 && idx - 1 === activeOut;
                return (
                  <tr key={idx} className="border-t border-line/60" style={isActive ? { background: "rgba(251,146,60,.12)" } : undefined}>
                    <td className="py-1">{row.e}</td>
                    <td className="py-1">{row.e ? ((idx - 1) >> 2) & 1 : "×"}</td>
                    <td className="py-1">{row.e ? ((idx - 1) >> 1) & 1 : "×"}</td>
                    <td className="py-1">{row.e ? (idx - 1) & 1 : "×"}</td>
                    <td className="py-1 font-bold" style={{ color: isActive ? "#fb923c" : "#98a4cb" }}>{row.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] leading-relaxed text-mute">
            {t("A decoder with n inputs and an enable lights exactly one of 2ⁿ outputs — n inputs in, 2ⁿ outputs out. When E = 0, everything stays dark.")}
          </p>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("Scaling up: 32×1 MUX from 8×1 MUXes")}>
          <div dir="ltr">
            <svg width={470} height={318} className="max-w-full" viewBox="0 0 470 318">
              {[0, 1, 2, 3].map((i) => {
                const y = 20 + i * 72;
                const range = `${i * 8}–${i * 8 + 7}`;
                const orInY = 86 + i * 32;
                return (
                  <g key={i}>
                    <rect x={30} y={y} width={120} height={52} rx={9} fill={SIGNAL.body} stroke="#4a5886" strokeWidth={2} />
                    <text x={90} y={y + 24} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">MUX 8→1</text>
                    <text x={90} y={y + 40} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">{range}</text>
                    <text x={22} y={y + 30} fontSize={11} fill={SIGNAL.mute} textAnchor="end">D{range.split("–")[0]}</text>
                    <Wire pts={[[150, y + 26], [210, y + 26]]} on={false} />
                    <text x={182} y={y + 18} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">{["A′B′", "A′B", "AB′", "AB"][i]}</text>
                    <rect x={210} y={y + 12} width={54} height={28} rx={6} fill={SIGNAL.body} stroke="#4a5886" strokeWidth={1.5} />
                    <text x={237} y={y + 30} fontSize={9} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">AND</text>
                    <Wire pts={[[264, y + 26], [292, y + 26], [292, orInY], [320, orInY]]} on={false} />
                  </g>
                );
              })}
              <path d="M320 70 Q372 84 372 146 Q372 208 320 222 Q338 146 320 70 Z" fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2} />
              <text x={340} y={150} fontSize={10} fontWeight={800} fill={SIGNAL.text}>OR</text>
              <Wire pts={[[372, 146], [408, 146]]} on={false} />
              <text x={412} y={150} fontSize={13} fontWeight={800} fill={SIGNAL.text}>F</text>
              <text x={160} y={306} fontSize={11} fill={SIGNAL.mute}>{t("selects C, D, E inside every MUX; A, B pick the MUX")}</text>
            </svg>
          </div>
        </Panel>

        <Panel title={t("Scaling up: 5×32 decoder from 3×8 decoders")}>
          <div dir="ltr">
            <svg width={470} height={318} className="max-w-full" viewBox="0 0 470 318">
              <rect x={250} y={110} width={96} height={70} rx={9} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2} />
              <text x={298} y={138} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">DEC 2→4</text>
              <text x={298} y={156} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">A, B</text>
              <Wire pts={[[346, 145], [400, 145]]} on={false} />
              <text x={404} y={149} fontSize={12} fontWeight={800} fill={SIGNAL.text}>A B</text>
              {[0, 1, 2, 3].map((i) => {
                const y = 20 + i * 72;
                const xi = 184 + i * 8;
                return (
                  <g key={i}>
                    <rect x={30} y={y} width={110} height={52} rx={9} fill={SIGNAL.body} stroke="#4a5886" strokeWidth={2} />
                    <text x={85} y={y + 24} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">DEC 3→8</text>
                    <text x={85} y={y + 40} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">{`${i * 8}–${i * 8 + 7}`}</text>
                    <Wire pts={[[140, y + 26], [xi, y + 26], [xi, 125 + i * 10], [250, 125 + i * 10]]} on={false} w={1.5} />
                    <text x={xi + 4} y={y + 20} fontSize={10} fontWeight={700} fill={SIGNAL.mute}>E</text>
                  </g>
                );
              })}
              <text x={30} y={306} fontSize={11} fill={SIGNAL.mute}>{t("C, D, E enter all four; A, B enable exactly one")}</text>
            </svg>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ── wrapper ────────────────────────────────────────────── */

export function MuxDecoder() {
  const { t } = useLang();
  const [tab, setTab] = useState<"mux" | "impl" | "dec">("mux");
  return (
    <div className="space-y-5">
      <Segmented
        value={tab}
        onChange={setTab}
        color="#fb923c"
        options={[
          { value: "mux", label: t("4×1 MUX — the data switch") },
          { value: "impl", label: t("8×1 MUX implements F(A,B,C,D)") },
          { value: "dec", label: t("Decoders & scaling") },
        ]}
      />
      {tab === "mux" && <MuxGates />}
      {tab === "impl" && <MuxImplements />}
      {tab === "dec" && <Decoders />}
    </div>
  );
}
