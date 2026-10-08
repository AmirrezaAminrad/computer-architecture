import { useState } from "react";
import { Button, Callout, Panel, Segmented } from "../../components/ui";
import { GateShape, SvgSwitch, Wire } from "../../components/gates";
import { SIGNAL } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

/* ── Tab A: shift register ──────────────────────────────── */

type ShMode = 0 | 1 | 2 | 3; // S1S0: hold, right, left, load

function ShiftRegister() {
  const { t } = useLang();
  const [q, setQ] = useState([1, 0, 1, 0]); // Q3..Q0
  const [sin, setSin] = useState(1);
  const [load, setLoad] = useState([0, 0, 1, 1]);
  const [mode, setMode] = useState<ShMode>(1);
  const [tick, setTick] = useState(0);

  const pulse = () => {
    setQ((old) => {
      if (mode === 0) return old;
      if (mode === 1) return [sin, old[0], old[1], old[2]];
      if (mode === 2) return [old[1], old[2], old[3], sin];
      return [...load];
    });
    setTick((x) => x + 1);
  };

  const cellX = (i: number) => 70 + i * 116;

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("Shift register — four D flip-flops in a row")} bodyClassName="overflow-x-auto">
        <div dir="ltr">
          <svg width={560} height={330} viewBox="0 0 560 330" className="max-w-full">
            {/* serial input (left, used by right shift) */}
            <SvgSwitch x={10} cy={85} value={sin} label="" onToggle={() => setSin(1 - sin)} />
            <text x={34} y={56} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">Sin</text>
            <text x={4} y={28} fontSize={10} fill={SIGNAL.dim}>{mode === 1 ? t("enters here (right)") : ""}</text>
            <Wire pts={[[62, 85], [70, 85]]} on={sin === 1 && mode === 1} />
            {/* serial input (right, used by left shift) */}
            <SvgSwitch x={500} cy={85} value={sin} label="" onToggle={() => setSin(1 - sin)} />
            <text x={524} y={56} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">Sin</text>
            <text x={556} y={28} fontSize={10} fill={SIGNAL.dim} textAnchor="end">{mode === 2 ? t("enters here (left)") : ""}</text>
            <Wire pts={[[506, 85], [500, 85]]} on={sin === 1 && mode === 2} />

            {q.map((bit, i) => {
              const x = cellX(i);
              return (
                <g key={i}>
                  <rect x={x} y={40} width={88} height={90} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
                  <text x={x + 44} y={62} fontSize={12} fontWeight={800} fill={SIGNAL.mute} textAnchor="middle">{`D·FF`}</text>
                  <text x={x + 44} y={74} fontSize={12} fontWeight={700} fill={SIGNAL.dim} textAnchor="middle">Ck</text>
                  <g key={`${tick}-${i}`} className="pop">
                    <text x={x + 44} y={116} fontSize={26} fontWeight={800} textAnchor="middle" fill={bit ? SIGNAL.on : SIGNAL.dim} style={{ transition: "fill .2s" }}>
                      {bit}
                    </text>
                  </g>
                  <text x={x + 44} y={150} fontSize={13} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{`Q${3 - i}`}</text>
                  {i < 3 && (mode === 1 || mode === 2) && (
                    <line
                      x1={mode === 1 ? x + 92 : x + 112}
                      y1={85}
                      x2={mode === 1 ? x + 112 : x + 92}
                      y2={85}
                      stroke={SIGNAL.on}
                      strokeWidth={2.5}
                      markerEnd="url(#arrowHead)"
                    />
                  )}
                  {/* parallel load switch */}
                  <g onClick={() => setLoad(load.map((v, k) => (k === i ? 1 - v : v)))} style={{ cursor: "pointer" }}>
                    <text x={x + 44} y={188} fontSize={10} fill={SIGNAL.dim} textAnchor="middle">{`D${3 - i}`}</text>
                    <rect x={x + 28} y={196} width={32} height={22} rx={7} fill={load[i] ? "rgba(251,146,60,.22)" : "#141d37"} stroke={load[i] ? "#fb923c" : "#4a5886"} strokeWidth={1.5} style={{ transition: "all .2s" }} />
                    <text x={x + 44} y={211.5} fontSize={11} fontWeight={800} textAnchor="middle" fill={load[i] ? "#fb923c" : SIGNAL.dim}>{load[i]}</text>
                  </g>
                  {/* clock stub */}
                  <Wire pts={[[x + 8, 130], [x + 8, 245]]} on={false} w={1.5} />
                  <circle cx={x + 8} cy={245} r={3} fill="#4a5886" />
                </g>
              );
            })}
            <defs>
              <marker id="arrowHead" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                <path d="M0,0 L7,3.5 L0,7 Z" fill={mode === 1 || mode === 2 ? SIGNAL.on : "#4a5886"} />
              </marker>
            </defs>
            {/* clock bus */}
            <Wire pts={[[60, 245], [520, 245]]} on={false} />
            <text x={290} y={266} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">{t("common clock")}</text>
          </svg>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="primary" color="#fb923c" onClick={pulse}>{t("CLK ↑ (pulse)")}</Button>
          <span className="font-mono text-[13px] text-mute" dir="ltr">{`Q = ${q.join("")}`}</span>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title={t("Mode control (S₁ S₀)")}>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as ShMode)}
            color="#fb923c"
            options={[
              { value: 0, label: t("Hold (00)") },
              { value: 1, label: t("Shift right (01)") },
              { value: 2, label: t("Shift left (10)") },
              { value: 3, label: t("Load (11)") },
            ]}
          />
          <table className="mt-4 w-full max-w-[300px] text-center text-[13px]" dir="ltr">
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-wider text-dim">
                <th className="pb-2">S₁</th>
                <th className="pb-2">S₀</th>
                <th className="pb-2 text-start ps-3">{t("function")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { s: "0 0", f: t("no change"), m: 0 },
                { s: "0 1", f: t("shift right"), m: 1 },
                { s: "1 0", f: t("shift left"), m: 2 },
                { s: "1 1", f: t("parallel load"), m: 3 },
              ].map((r) => (
                <tr key={r.s} className="border-t border-line/60" style={r.m === mode ? { background: "rgba(251,146,60,.12)" } : undefined}>
                  <td className="py-1.5 font-mono">{r.s.split(" ")[0]}</td>
                  <td className="py-1.5 font-mono">{r.s.split(" ")[1]}</td>
                  <td className="py-1.5 text-start ps-3" style={{ color: r.m === mode ? "#fb923c" : undefined }}>{r.f}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[13px] leading-relaxed text-mute">
            {t("Two select lines turn one chain of flip-flops into four machines. In load mode the D inputs march in side by side on the next clock edge; in shift modes one bit enters serially per pulse.")}
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ── Tab B: ripple counter ──────────────────────────────── */

function RippleCounter() {
  const { t } = useLang();
  const [count, setCount] = useState(0);
  const [hist, setHist] = useState<number[]>([0]);
  const bits = (n: number) => [3, 2, 1, 0].map((k) => (n >> k) & 1); // Q3..Q0

  const pulse = () => {
    setCount((c) => {
      const nc = (c + 1) % 16;
      setHist((h) => [...h, nc].slice(-16));
      return nc;
    });
  };
  const reset = () => {
    setCount(0);
    setHist([0]);
  };

  const colW = 36;
  const waveW = 16 * colW;
  const rowH = 34;
  const waveH = 5 * rowH + 26;

  const wave = (row: number) => {
    // build step path for one row across 16 columns
    const pts: string[] = [];
    if (row === 0) {
      // clock: high first half, low second half of each column
      for (let c = 0; c < 16; c++) {
        const x0 = c * colW;
        pts.push(`M${x0},${row * rowH + rowH - 8} L${x0},${10 + row * rowH} L${x0 + colW / 2},${10 + row * rowH} L${x0 + colW / 2},${row * rowH + rowH - 8} L${x0 + colW},${row * rowH + rowH - 8}`);
      }
      return pts.join(" ");
    }
    // Q rows: level = bit of count after that pulse; transition at falling edge (half)
    for (let c = 0; c < hist.length; c++) {
      const bit = bits(hist[c])[row - 1];
      const y = bit ? 10 + row * rowH : row * rowH + rowH - 8;
      const x0 = c * colW + colW / 2;
      if (c === 0) pts.push(`M0,${row * rowH + rowH - 8} L${colW / 2},${row * rowH + rowH - 8}`);
      pts.push(`L${x0},${y} L${x0 + colW / 2 + colW},${y}`);
    }
    return pts.join(" ");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("Ripple counter — four JK flip-flops, J = K = 1")} bodyClassName="overflow-x-auto">
        <div dir="ltr">
          <svg width={560} height={210} viewBox="0 0 560 210" className="max-w-full">
            {bits(count).map((bit, i) => {
              const x = 60 + i * 116;
              return (
                <g key={i}>
                  <rect x={x} y={20} width={88} height={74} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
                  <text x={x + 18} y={42} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>J=1</text>
                  <text x={x + 18} y={80} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>K=1</text>
                  <text x={x + 58} y={54} fontSize={22} fontWeight={800} textAnchor="middle" fill={bit ? SIGNAL.on : SIGNAL.dim}>{bit}</text>
                  <text x={x + 44} y={126} fontSize={13} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{`Q${3 - i}`}</text>
                  {i > 0 && <Wire pts={[[x, 57], [x - 14, 57], [x - 14, 108], [x - 72, 108], [x - 72, 94]]} on={false} w={1.5} />}
                </g>
              );
            })}
            <Wire pts={[[452, 94], [452, 168]]} on={false} w={1.5} />
            <text x={452} y={184} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">CLK</text>
            <text x={250} y={160} fontSize={12} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">ripple ⟵ clock enters at Q₀</text>
          </svg>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button variant="primary" color="#fb923c" onClick={pulse}>{t("CLK ↑ (count)")}</Button>
            <Button variant="ghost" onClick={reset}>{t("Reset")}</Button>
            <span className="font-mono text-[14px] font-bold text-digital" dir="ltr">
              {count} = 0b{count.toString(2).padStart(4, "0")}
            </span>
            <span className="text-[12px] text-dim">{t("counts 0–15, then wraps")}</span>
          </div>
        </div>
      </Panel>

      <Panel title={t("Timing — every stage halves the clock")}>
        <div dir="ltr">
          <svg width={waveW + 56} height={waveH} className="max-w-full">
            {["Ck", "Q₀", "Q₁", "Q₂", "Q₃"].map((label, row) => (
              <g key={label}>
                <text x={8} y={row * rowH + rowH / 2 + 4} fontSize={12} fontWeight={700} fill={SIGNAL.mute}>{label}</text>
                <path transform="translate(34 0)" d={wave(row)} fill="none" stroke={row === 0 ? "#7482b0" : SIGNAL.on} strokeWidth={2} strokeLinejoin="round" />
                <line x1={34} y1={row * rowH + rowH + 4} x2={waveW + 34} y2={row * rowH + rowH + 4} stroke="#223052" strokeWidth={1} />
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-mute">
          {t("Each flip-flop halves the frequency of the one before it: Q₀ toggles on every pulse, Q₁ every second, Q₃ every eighth — a 4-bit counter walking 0 → 15 and wrapping.")}
        </p>
      </Panel>
    </div>
  );
}

/* ── Tab C: design a counter from a state table (slide Ex 8) ─ */

function CounterDesign() {
  const { t } = useLang();
  const [e, setE] = useState(1);
  const [x, setX] = useState(1);
  const [ab, setAb] = useState(0); // state number, A = MSB

  const nextState = () => {
    if (!e) return ab;
    return x ? (ab + 1) % 4 : (ab + 3) % 4;
  };

  // state table rows: E x A B → A⁺ B⁺
  const rows: { e: number; x: number; s: number; ns: number }[] = [];
  for (const ee of [0, 1]) for (const xx of [0, 1]) for (let s = 0; s < 4; s++) rows.push({ e: ee, x: xx, s, ns: ee ? (xx ? (s + 1) % 4 : (s + 3) % 4) : s });

  const exRows = rows.map((r) => {
    const a = (r.s >> 1) & 1, b = r.s & 1;
    const na = (r.ns >> 1) & 1, nb = r.ns & 1;
    const jk = (qi: number, qni: number) => (qi === 0 ? (qni === 0 ? "0 X" : "1 X") : qni === 0 ? "X 1" : "X 0");
    return { ...r, a, b, na, nb, ja: jk(a, na), jb: jk(b, nb) };
  });

  const stateName = (s: number) => `${(s >> 1) & 1}${s & 1}`;
  const dirLabel = !e ? t("hold") : x ? t("count up 00→01→10→11") : t("count down 11→10→01→00");

  const jaMap = [ // rows E=0,1 × cols xB (00,01,11,10)
    [0, 0, 0, 0],
    [1, 0, 1, 0],
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("Step 1 — the specification and its state table")}>
          <p className="mb-3 text-[13px] leading-relaxed text-mute">
            {t("Design a 2-bit counter with inputs E and x: when E = 0 the state freezes; when E = 1, x = 1 counts up and x = 0 counts down. (Course slide, Example 8.)")}
          </p>
          <table className="w-full text-center font-mono text-[12.5px]" dir="ltr">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-dim">
                <th className="pb-2">E</th><th className="pb-2">x</th>
                <th className="pb-2">A(t)</th><th className="pb-2">B(t)</th>
                <th className="pb-2">A(t+1)</th><th className="pb-2">B(t+1)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const active = r.e === e && r.x === x && r.s === ab;
                return (
                  <tr key={i} className="border-t border-line/60" style={active ? { background: "rgba(251,146,60,.12)" } : undefined}>
                    <td className="py-1">{r.e}</td><td className="py-1">{r.x}</td>
                    <td className="py-1">{(r.s >> 1) & 1}</td><td className="py-1">{r.s & 1}</td>
                    <td className="py-1" style={{ color: "#fb923c" }}>{(r.ns >> 1) & 1}</td><td className="py-1" style={{ color: "#fb923c" }}>{r.ns & 1}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel title={t("Step 2 — through the JK excitation table")}>
          <p className="mb-3 text-[13px] leading-relaxed text-mute">
            {t("For each transition the JK excitation table says what J and K must be: 0→0 needs J=0 (K free), 0→1 needs J=1, 1→0 needs K=1, 1→1 needs K=0 — the X entries are don't-cares that make the K-maps easy.")}
          </p>
          <table className="w-full text-center font-mono text-[12.5px]" dir="ltr">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-dim">
                <th className="pb-2">E x A B</th>
                <th className="pb-2">J_A K_A</th>
                <th className="pb-2">J_B K_B</th>
              </tr>
            </thead>
            <tbody>
              {exRows.map((r, i) => {
                const active = r.e === e && r.x === x && r.s === ab;
                return (
                  <tr key={i} className="border-t border-line/60" style={active ? { background: "rgba(251,146,60,.12)" } : undefined}>
                    <td className="py-1">{r.e}{r.x}{r.a}{r.b}</td>
                    <td className="py-1 text-cyan-300">{r.ja}</td>
                    <td className="py-1 text-amber-300">{r.jb}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("Step 3 — K-maps give the equations")}>
          <div className="flex flex-wrap items-start gap-6">
            <div dir="ltr">
              <svg width={230} height={120} viewBox="0 0 230 120">
                <text x={2} y={12} fontSize={10} fill={SIGNAL.dim}>J_A = K_A</text>
                {["xB=00", "01", "11", "10"].map((lbl, ci) => (
                  <text key={ci} x={54 + ci * 44} y={26} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">{lbl.replace("xB=", "")}</text>
                ))}
                {jaMap.map((rowVals, ri) =>
                  rowVals.map((v, ci) => (
                    <g key={`${ri}-${ci}`}>
                      <rect x={36 + ci * 44} y={34 + ri * 40} width={42} height={38} rx={5} fill={v ? "rgba(251,146,60,.16)" : "#0b1226"} stroke="#223052" />
                      <text x={57 + ci * 44} y={58 + ri * 40} fontSize={14} fontWeight={800} textAnchor="middle" fill={v ? "#fb923c" : "#31406e"}>{v}</text>
                    </g>
                  )),
                )}
                <text x={14} y={54} fontSize={11} fill={SIGNAL.mute} textAnchor="middle">E=0</text>
                <text x={14} y={94} fontSize={11} fill={SIGNAL.mute} textAnchor="middle">E=1</text>
              </svg>
            </div>
            <div className="space-y-2 font-mono text-[14px]" dir="ltr">
              <div className="text-ink">J_A = K_A = E·(x ⊙ B)</div>
              <div className="text-mute">= E·x̄·B̄ + E·x·B</div>
              <div className="text-ink">J_B = K_B = E</div>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-mute">
            {t("The two corner 1s on the E = 1 row are x̄B̄ and xB — an XNOR of x with B, gated by E. B toggles whenever we are allowed to count, so J_B = K_B = E. (K_A mirrors J_A; cells with A = 1 are don't-cares.)")}
          </p>
        </Panel>

        <Panel title={t("Step 4 — the circuit, alive")}>
          <div dir="ltr">
            <svg width={520} height={264} viewBox="0 0 520 264" className="max-w-full">
              <SvgSwitch x={16} cy={50} value={x} label="x" onToggle={() => setX(1 - x)} />
              <SvgSwitch x={16} cy={110} value={e} label="E" onToggle={() => setE(1 - e)} />
              <Wire pts={[[66, 50], [112, 50], [112, 66], [129, 66]]} on={x === 1} />
              {/* E rail: to the AND gate and to FF B's J=K */}
              <Wire pts={[[66, 110], [110, 110], [110, 226], [340, 226], [340, 194], [360, 194]]} on={e === 1} />
              <circle cx={236} cy={226} r={3.5} fill={e === 1 ? SIGNAL.on : SIGNAL.off} />
              <Wire pts={[[236, 226], [236, 94]]} on={e === 1} />
              {/* XNOR: x and B */}
              <GateShape type="XOR" x={130} y={40} out={x === (ab & 1) ? 1 : 0} />
              <circle cx={208} cy={80} r={5} fill={SIGNAL.body} stroke={x === (ab & 1) ? SIGNAL.on : "#7482b0"} strokeWidth={2.5} />
              <Wire pts={[[213, 80], [224, 80], [224, 66], [236, 66]]} on={x === (ab & 1)} />
              {/* AND with E */}
              <GateShape type="AND" x={236} y={40} out={e === 1 && x === (ab & 1) ? 1 : 0} />
              <Wire pts={[[306, 80], [352, 80], [352, 74], [360, 74]]} on={e === 1 && x === (ab & 1)} />
              <circle cx={352} cy={80} r={3} fill={e === 1 && x === (ab & 1) ? SIGNAL.on : SIGNAL.off} />
              <Wire pts={[[352, 80], [352, 92], [360, 92]]} on={e === 1 && x === (ab & 1)} />
              {/* FF A */}
              <g transform="translate(360 30)">
                <rect width={90} height={70} rx={9} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
                <text x={45} y={22} fontSize={13} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">FF A</text>
                <text x={12} y={44} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>J</text>
                <text x={12} y={62} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>K</text>
                <text x={74} y={44} fontSize={13} fontWeight={800} fill={(ab >> 1) & 1 ? SIGNAL.on : SIGNAL.dim} textAnchor="middle">{(ab >> 1) & 1}</text>
              </g>
              {/* FF B, J=K=E */}
              <g transform="translate(360 150)">
                <rect width={90} height={70} rx={9} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
                <text x={45} y={22} fontSize={13} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">FF B</text>
                <text x={12} y={44} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>J=E</text>
                <text x={12} y={62} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>K=E</text>
                <text x={74} y={44} fontSize={13} fontWeight={800} fill={ab & 1 ? SIGNAL.on : SIGNAL.dim} textAnchor="middle">{ab & 1}</text>
              </g>
              {/* feedback B → XNOR */}
              <Wire pts={[[450, 180], [470, 180], [470, 246], [96, 246], [96, 94], [129, 94]]} on={(ab & 1) === 1} w={2} />
              {/* CLK into FF B */}
              <Wire pts={[[320, 252], [405, 252], [405, 220]]} on={false} w={1.5} />
              <text x={306} y={256} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="end">Ck</text>
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button variant="primary" color="#fb923c" onClick={() => setAb(nextState())}>{t("CLK ↑ (pulse)")}</Button>
            <span className="font-mono text-[14px] font-bold text-digital" dir="ltr">{`state = ${stateName(ab)}`}</span>
            <span className="text-[13px] text-mute">{dirLabel}</span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-mute">
            {t("Flip E and x and pulse: the state holds, counts up or counts down — exactly the slide's specification, now running.")}
          </p>
        </Panel>
      </div>
    </div>
  );
}

export function ShiftCounter() {
  const { t } = useLang();
  const [tab, setTab] = useState<"shift" | "count" | "design">("shift");
  return (
    <div className="space-y-5">
      <Segmented
        value={tab}
        onChange={setTab}
        color="#fb923c"
        options={[
          { value: "shift", label: t("Shift registers") },
          { value: "count", label: t("Ripple counter") },
          { value: "design", label: t("Design a counter (slide Ex 8)") },
        ]}
      />
      {tab === "shift" && <ShiftRegister />}
      {tab === "count" && <RippleCounter />}
      {tab === "design" && <CounterDesign />}
      <Callout title={t("From parts to behaviour")} tone="idea">
        {t("This is the standard workflow of sequential design: write the state table, convert it through the flip-flop's excitation table, minimize with K-maps, and wire the result. Everything in module 03's control unit is built the same way, just at a larger scale.")}
      </Callout>
    </div>
  );
}
