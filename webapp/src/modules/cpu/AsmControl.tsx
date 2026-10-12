import { useState } from "react";
import { Button, Callout, Panel } from "../../components/ui";
import { SvgSwitch, Wire } from "../../components/gates";
import { SIGNAL } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

/* next state per (state, x): [nextIfX1, nextIfX0] */
const NEXT: [number, number][] = [
  [0, 1], // M0
  [2, 1], // M1
  [0, 3], // M2
  [2, 1], // M3
];

/* ── Part 1: ASM chart anatomy ──────────────────────────── */

function Arr({ pts }: { pts: [number, number][] }) {
  return <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={SIGNAL.off} strokeWidth={2} strokeLinejoin="round" markerEnd="url(#asmArrow)" />;
}

function AsmAnatomy() {
  const { t } = useLang();
  const rules = [
    t("A state box may be followed only by a state box or a decision box."),
    t("A decision box connects to all of its branches."),
    t("A conditional box connects only to a decision box or a state box."),
    t("Boxes of the conditional and decision kind can never close a loop on themselves."),
    t("Every block of an ASM chart contains exactly one state box."),
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("The three boxes of an ASM chart")} bodyClassName="overflow-x-auto">
        <div dir="ltr">
          <svg width={620} height={130} viewBox="0 0 620 130" className="max-w-full">
            {/* state box */}
            <rect x={10} y={33} width={150} height={64} rx={8} fill={SIGNAL.body} stroke="#a78bfa" strokeWidth={2.5} />
            <text x={85} y={60} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{t("state box")}</text>
            <text x={85} y={80} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">{t("outputs, one clock")}</text>
            {/* decision box */}
            <path d="M330 15 L450 65 L330 115 L210 65 Z" fill={SIGNAL.body} stroke="#fbbf24" strokeWidth={2.5} />
            <text x={330} y={61} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{t("decision box")}</text>
            <text x={330} y={80} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">{t("tests an input")}</text>
            {/* conditional box */}
            <ellipse cx={540} cy={65} rx={68} ry={36} fill={SIGNAL.body} stroke="#34d399" strokeWidth={2.5} />
            <text x={540} y={61} fontSize={11} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{t("conditional")}</text>
            <text x={540} y={77} fontSize={11} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{t("box")}</text>
            {/* arrows */}
            <Wire pts={[[160, 65], [210, 65]]} on={false} w={2} />
            <Wire pts={[[450, 65], [472, 65]]} on={false} w={2} />
          </svg>
        </div>
      </Panel>
      <Panel title={t("Rules of a well-formed chart")}>
        <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-mute">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#a78bfa" }} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-relaxed text-mute">
          {t("An ASM block starts at one state box and runs through the decisions and conditional outputs until the next state box — one block per clock pulse, exactly like one micro-operation chain per cycle.")}
        </p>
      </Panel>
    </div>
  );
}

/* ── Part 2: the M0–M3 machine, MUX-implemented ─────────── */

function AsmChart() {
  const { t } = useLang();
  const bx = (y: number, label: string, z = false) => (
    <g>
      <rect x={110} y={y} width={90} height={38} rx={8} fill={SIGNAL.body} stroke="#a78bfa" strokeWidth={2.5} />
      <text x={155} y={y + 24} fontSize={13} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{label}{z ? " · Z" : ""}</text>
    </g>
  );
  const diamond = (cy: number) => (
    <path d={`M155 ${cy - 22} L197 ${cy} L155 ${cy + 22} L113 ${cy} Z`} fill={SIGNAL.body} stroke="#fbbf24" strokeWidth={2.5} />
  );
  const xm = (cy: number) => (
    <text x={155} y={cy + 4} fontSize={11} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">X</text>
  );
  return (
    <Panel title={t("The example machine as an ASM chart")}>
      <div dir="ltr">
        <svg width={320} height={590} viewBox="0 0 320 590" className="mx-auto max-w-full">
          <defs>
            <marker id="asmArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#7482b0" />
            </marker>
          </defs>
          {bx(20, "M0")}
          <Arr pts={[[155, 58], [155, 78]]} />
          {diamond(100)}{xm(100)}
          {/* M0 self loop x=1 */}
          <Arr pts={[[197, 100], [255, 100], [255, 39], [200, 39]]} />
          <text x={262} y={72} fontSize={12} fontWeight={800} fill={SIGNAL.mute}>1</text>
          <text x={143} y={130} fontSize={12} fontWeight={800} fill={SIGNAL.mute}>0</text>
          <Arr pts={[[155, 122], [155, 150]]} />
          {bx(150, "M1")}
          <Arr pts={[[155, 188], [155, 208]]} />
          {diamond(230)}{xm(230)}
          {/* M1 self loop x=0 */}
          <Arr pts={[[113, 230], [48, 230], [48, 169], [110, 169]]} />
          <text x={40} y={205} fontSize={12} fontWeight={800} fill={SIGNAL.mute}>0</text>
          <text x={143} y={262} fontSize={12} fontWeight={800} fill={SIGNAL.mute}>1</text>
          <Arr pts={[[155, 252], [155, 280]]} />
          {bx(280, "M2")}
          <Arr pts={[[155, 318], [155, 338]]} />
          {diamond(360)}{xm(360)}
          {/* M2 x=1 → back to M0 */}
          <Arr pts={[[197, 360], [290, 360], [290, 20], [200, 20]]} />
          <text x={276} y={190} fontSize={12} fontWeight={800} fill={SIGNAL.mute}>1</text>
          <text x={143} y={392} fontSize={12} fontWeight={800} fill={SIGNAL.mute}>0</text>
          <Arr pts={[[155, 382], [155, 410]]} />
          {bx(410, "M3", true)}
          <Arr pts={[[155, 448], [155, 468]]} />
          {diamond(490)}{xm(490)}
          {/* M3 x=1 → M2 */}
          <Arr pts={[[197, 490], [272, 490], [272, 299], [200, 299]]} />
          <text x={278} y={400} fontSize={12} fontWeight={800} fill={SIGNAL.mute}>1</text>
          {/* M3 x=0 → M1 */}
          <Arr pts={[[113, 490], [70, 490], [70, 180], [110, 180]]} />
          <text x={62} y={360} fontSize={12} fontWeight={800} fill={SIGNAL.mute}>0</text>
        </svg>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-mute">
        {t("Four state boxes, four decisions on the same input X, one output Z that lives in state M3. The chart and the state table say the same thing twice — the chart just reads like a program.")}
      </p>
    </Panel>
  );
}

function MuxControl() {
  const { t } = useLang();
  const [state, setState] = useState(0);
  const [x, setX] = useState(0);

  const next = NEXT[state][x === 1 ? 0 : 1];
  const pulse = () => {
    setState(next);
  };

  // MUX1 (next Q0): every input is x̄ ; MUX2 (next Q1): [0, x, x̄, x]
  const xbar = 1 - x;
  const mux2in = [0, x, xbar, x];
  const d0 = xbar;
  const d1 = mux2in[state];
  const stateName = (s: number) => `M${s}`;

  const inY = (base: number) => [base, base + 22, base + 44, base + 66];

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("MUX-based control — flip X, pulse the clock")} bodyClassName="overflow-x-auto">
        <div dir="ltr">
          <svg width={730} height={400} viewBox="0 0 730 400" className="max-w-full">
            <SvgSwitch x={20} cy={40} value={x} label="X" onToggle={() => setX(1 - x)} />
            <text x={30} y={70} fontSize={11} fill={SIGNAL.dim}>X̄ = {xbar}</text>
            {/* dashed X distribution rail feeding both MUXes' inputs */}
            <line x1={70} y1={40} x2={126} y2={40} stroke="#4a5886" strokeWidth={1.5} strokeDasharray="4 4" />
            <line x1={126} y1={40} x2={126} y2={318} stroke="#4a5886" strokeWidth={1.5} strokeDasharray="4 4" />
            {[76, 98, 120, 142, 252, 274, 296, 318].map((yy) => (
              <g key={yy}>
                <line x1={126} y1={yy} x2={132} y2={yy} stroke="#4a5886" strokeWidth={1.5} strokeDasharray="4 4" />
                <circle cx={126} cy={yy} r={2.5} fill="#4a5886" />
              </g>
            ))}

            {/* MUX2 → D1 (FF Q1) */}
            <path d="M150 50 L250 78 L250 178 L150 206 Z" fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={172} y={108} fontSize={12} fontWeight={800} fill={SIGNAL.text}>MUX 2</text>
            <text x={172} y={124} fontSize={10} fontWeight={700} fill={SIGNAL.mute}>→ D₁</text>
            {["0", "X", "X̄", "X"].map((lbl, i) => {
              const on = i === state && mux2in[i] === 1;
              return (
                <text key={i} x={144} y={inY(72)[i] + 4} fontSize={11} fontWeight={700} textAnchor="end" fill={on ? SIGNAL.on : SIGNAL.mute}>
                  {lbl}
                </text>
              );
            })}
            <Wire pts={[[250, 128], [300, 128], [300, 108], [350, 108]]} on={d1 === 1} w={3} />
            <text x={262} y={122} fontSize={10} fill={SIGNAL.mute}>D₁</text>

            {/* MUX1 → D0 (FF Q0) */}
            <path d="M150 230 L250 258 L250 358 L150 386 Z" fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={172} y={292} fontSize={12} fontWeight={800} fill={SIGNAL.text}>MUX 1</text>
            <text x={172} y={308} fontSize={10} fontWeight={700} fill={SIGNAL.mute}>→ D₀</text>
            {["X̄", "X̄", "X̄", "X̄"].map((lbl, i) => {
              const on = i === state && xbar === 1;
              return (
                <text key={i} x={144} y={inY(252)[i] + 4} fontSize={11} fontWeight={700} textAnchor="end" fill={on ? SIGNAL.on : SIGNAL.mute}>
                  {lbl}
                </text>
              );
            })}
            <Wire pts={[[250, 308], [300, 308], [300, 288], [350, 288]]} on={d0 === 1} w={3} />
            <text x={262} y={302} fontSize={10} fill={SIGNAL.mute}>D₀</text>

            {/* select wires: state (Q1Q0) address both muxes */}
            <Wire pts={[[452, 130], [470, 130], [470, 22], [200, 22], [200, 64]]} on={((state >> 1) & 1) === 1} w={2} />
            <Wire pts={[[452, 300], [482, 300], [482, 10], [186, 10], [186, 241]]} on={(state & 1) === 1} w={2} />
            <text x={488} y={120} fontSize={10} fontWeight={700} fill={SIGNAL.mute}>Q₁</text>
            <text x={488} y={296} fontSize={10} fontWeight={700} fill={SIGNAL.mute}>Q₀</text>

            {/* FFs */}
            <g transform="translate(350 78)">
              <rect width={100} height={60} rx={9} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
              <text x={50} y={24} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">D-FF</text>
              <text x={50} y={44} fontSize={14} fontWeight={800} textAnchor="middle" fill={(state >> 1) & 1 ? SIGNAL.on : SIGNAL.dim}>{(state >> 1) & 1}</text>
              <text x={112} y={30} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>Q₁</text>
            </g>
            <g transform="translate(350 258)">
              <rect width={100} height={60} rx={9} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
              <text x={50} y={24} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">D-FF</text>
              <text x={50} y={44} fontSize={14} fontWeight={800} textAnchor="middle" fill={(state & 1) ? SIGNAL.on : SIGNAL.dim}>{state & 1}</text>
              <text x={112} y={30} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>Q₀</text>
            </g>

            {/* decoder */}
            <g transform="translate(540 150)">
              <rect width={100} height={90} rx={9} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
              <text x={50} y={38} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">DEC 2→4</text>
              <text x={50} y={56} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">{t("state")}</text>
            </g>
            <Wire pts={[[452, 130], [520, 130], [520, 165], [540, 165]]} on={((state >> 1) & 1) === 1} w={2} />
            <Wire pts={[[452, 300], [514, 300], [514, 219], [540, 219]]} on={(state & 1) === 1} w={2} />
            {[0, 1, 2, 3].map((i) => {
              const on = i === state;
              return (
                <g key={i}>
                  <Wire pts={[[640, 168 + i * 20], [662, 168 + i * 20]]} on={on} w={on ? 3 : 2} />
                  <text x={666} y={172 + i * 20} fontSize={12} fontWeight={800} fill={on ? SIGNAL.on : SIGNAL.mute}>{`M${i}`}</text>
                </g>
              );
            })}
            {/* Z = M3 */}
            <text x={666} y={260} fontSize={12} fontWeight={800} fill={state === 3 ? "#fb7185" : SIGNAL.dim}>{`Z = ${state === 3 ? 1 : 0}`}</text>

            {/* clock */}
            <text x={380} y={352} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>Ck</text>
          </svg>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={pulse} color="#a78bfa">{t("CLK ↑ (next state)")}</Button>
          <span className="font-mono text-[14px] font-bold" style={{ color: "#a78bfa" }} dir="ltr">
            {stateName(state)} ({((state >> 1) & 1).toString()}{(state & 1).toString()}) → {stateName(next)}
          </span>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title={t("State table (present → next)")}>
          <table className="w-full max-w-[360px] text-center font-mono text-[13px]" dir="ltr">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-dim">
                <th className="pb-2">{t("present")}</th>
                <th className="pb-2">X=1</th>
                <th className="pb-2">X=0</th>
                <th className="pb-2">Z</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((s) => (
                <tr key={s} className="border-t border-line/60" style={s === state ? { background: "rgba(167,139,250,.14)" } : undefined}>
                  <td className="py-1.5 font-bold" style={{ color: s === state ? "#a78bfa" : "#98a4cb" }}>
                    {`M${s} (${((s >> 1) & 1).toString()}${(s & 1).toString()})`}
                  </td>
                  <td className="py-1.5">{`M${NEXT[s][0]}`}</td>
                  <td className="py-1.5">{`M${NEXT[s][1]}`}</td>
                  <td className="py-1.5" style={{ color: s === 3 ? "#fb7185" : "#62709b" }}>{s === 3 ? 1 : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title={t("Why MUXes?")}>
          <p className="text-[13.5px] leading-relaxed text-mute">
            {t("Each flip-flop needs a Boolean function of (state, X) for its D input. Instead of random logic, a MUX per flip-flop uses the state as the address: the selected input literally is the next-state equation for that state. Change the machine = rewire the MUX inputs, not the gates.")}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mute">
            {t("Here MUX 2 implements D₁ = M₀·0 + M₁·x + M₂·x̄ + M₃·x, and MUX 1 collapses to D₀ = x̄ in every state — exactly the slide's wiring.")}
          </p>
        </Panel>
      </div>
    </div>
  );
}

export function AsmControl() {
  const { t } = useLang();
  return (
    <div className="space-y-5">
      <AsmAnatomy />
      <div className="grid gap-5 lg:grid-cols-2">
        <AsmChart />
        <div className="space-y-5">
          <MuxControl />
        </div>
      </div>
      <Callout title={t("Where this leads")} tone="idea">
        {t("Replace the example machine's four states with the CPU's instruction-cycle states (T₀…T₃) and its X with opcode bits, and you have hardwired control: the same tables, the same MUX trick, one scale up. Microprogrammed control goes one further — it stores those MUX inputs in a control memory.")}
      </Callout>
    </div>
  );
}
