import { useState } from "react";
import { Button, Callout, Panel, Segmented } from "../../components/ui";
import { Lamp, SvgSwitch, Wire } from "../../components/gates";
import { SIGNAL } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

type FFType = "SR" | "JK" | "D" | "T";

interface Row {
  in: number[];
  out: string;
  outValue: number | null; // null = invalid / depends on Q
  bad?: boolean;
}

const CONFIG: Record<
  FFType,
  {
    inputs: string[];
    eq: string;
    note: string;
    rows: Row[];
    next: (ins: number[], q: number) => number | null;
  }
> = {
  SR: {
    inputs: ["S", "R"],
    eq: "Q(t+1) = S + R′·Q(t)",
    note: "The forbidden combination S = R = 1 tries to set and reset at once — keep it out of your state tables.",
    rows: [
      { in: [0, 0], out: "Qₙ (hold)", outValue: null },
      { in: [0, 1], out: "0 (reset)", outValue: 0 },
      { in: [1, 0], out: "1 (set)", outValue: 1 },
      { in: [1, 1], out: "— (invalid)", outValue: null, bad: true },
    ],
    next: ([s, r], q) => (s && r ? null : s ? 1 : r ? 0 : q),
  },
  JK: {
    inputs: ["J", "K"],
    eq: "Q(t+1) = J·Q̄(t) + K′·Q(t)",
    note: "J = K = 1 turns the flip-flop into a toggle: Q flips on every clock edge — the seed of every binary counter.",
    rows: [
      { in: [0, 0], out: "Qₙ (hold)", outValue: null },
      { in: [0, 1], out: "0 (reset)", outValue: 0 },
      { in: [1, 0], out: "1 (set)", outValue: 1 },
      { in: [1, 1], out: "Q̄ₙ (toggle)", outValue: null },
    ],
    next: ([j, k], q) => (j ? (k ? 1 - q : 1) : k ? 0 : q),
  },
  D: {
    inputs: ["D"],
    eq: "Q(t+1) = D",
    note: "On the clock edge Q copies D — the transparent workhorse every register and shift register is built from.",
    rows: [
      { in: [0], out: "0", outValue: 0 },
      { in: [1], out: "1", outValue: 1 },
    ],
    next: ([d]) => d,
  },
  T: {
    inputs: ["T"],
    eq: "Q(t+1) = T ⊕ Q(t)",
    note: "T = 0 holds the state, T = 1 flips it. A JK with its inputs tied together is exactly a T flip-flop.",
    rows: [
      { in: [0], out: "Qₙ (hold)", outValue: null },
      { in: [1], out: "Q̄ₙ (toggle)", outValue: null },
    ],
    next: ([tt], q) => tt ^ q,
  },
};

function FFBox({ x, y, name, oneInput }: { x: number; y: number; name: string; oneInput: boolean }) {
  const w = 150;
  const h = oneInput ? 130 : 150;
  const in1Y = oneInput ? h / 2 : 60;
  const in2Y = oneInput ? 0 : h - 40;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
      <text x={w / 2} y={26} fontSize={16} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{name}</text>
      {/* clock wedge on the bottom edge */}
      <path d={`M${w / 2 - 12} ${h} L${w / 2} ${h - 12} L${w / 2 + 12} ${h}`} fill="none" stroke="#7482b0" strokeWidth={2} />
      <text x={w / 2} y={h + 22} fontSize={12} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">Ck</text>
      {/* input stubs */}
      <line x1={-26} y1={in1Y} x2={0} y2={in1Y} stroke="#4a5886" strokeWidth={2.5} />
      {!oneInput && <line x1={-26} y1={in2Y} x2={0} y2={in2Y} stroke="#4a5886" strokeWidth={2.5} />}
      {/* output stubs */}
      <line x1={w} y1={h / 2 - 18} x2={w + 26} y2={h / 2 - 18} stroke="#4a5886" strokeWidth={2.5} />
      <line x1={w} y1={h / 2 + 18} x2={w + 26} y2={h / 2 + 18} stroke="#4a5886" strokeWidth={2.5} />
    </g>
  );
}

function FlipFlopDemo() {
  const { t } = useLang();
  const [type, setType] = useState<FFType>("JK");
  const cfg = CONFIG[type];
  const oneInput = cfg.inputs.length === 1;
  const [ins, setIns] = useState<number[]>([1, 0]);
  const [q, setQ] = useState(0);
  const [tick, setTick] = useState(0);

  const switchType = (v: FFType) => {
    setType(v);
    setIns(CONFIG[v].inputs.length === 1 ? [0] : [0, 0]);
    setQ(0);
    setTick((x) => x + 1);
  };

  const pulse = () => {
    const nq = cfg.next(ins, q);
    if (nq === null) return; // SR invalid: state unchanged, but flash below
    setQ(nq);
    setTick((x) => x + 1);
  };

  const activeRow = cfg.rows.findIndex((r) => r.in.length === ins.length && r.in.every((v, k) => v === ins[k]));
  const invalid = type === "SR" && ins[0] === 1 && ins[1] === 1;

  const boxX = 190;
  const boxY = 50;
  const w = 150;
  const h = oneInput ? 130 : 150;

  return (
    <div className="space-y-5">
      <Segmented
        value={type}
        onChange={switchType}
        color="#fb923c"
        options={(["SR", "JK", "D", "T"] as FFType[]).map((v) => ({ value: v, label: `${v}-FF` }))}
      />
      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <Panel title={t("Pulse the clock — state changes only on the edge")} bodyClassName="overflow-x-auto">
          <div dir="ltr">
            <svg width={470} height={oneInput ? 240 : 260} className="max-w-full">
              <FFBox x={boxX} y={boxY} name={`${type} · FF`} oneInput={oneInput} />
              {oneInput ? (
                <>
                  <SvgSwitch x={30} cy={boxY + h / 2} value={ins[0]} label={cfg.inputs[0]} onToggle={() => setIns([1 - ins[0]])} />
                  <Wire pts={[[80, boxY + h / 2], [boxX, boxY + h / 2]]} on={ins[0] === 1} />
                </>
              ) : (
                <>
                  <SvgSwitch x={30} cy={boxY + 60} value={ins[0]} label={cfg.inputs[0]} onToggle={() => setIns([1 - ins[0], ins[1]])} />
                  <SvgSwitch x={30} cy={boxY + h - 40} value={ins[1]} label={cfg.inputs[1]} onToggle={() => setIns([ins[0], 1 - ins[1]])} />
                  <Wire pts={[[80, boxY + 60], [boxX, boxY + 60]]} on={ins[0] === 1} />
                  <Wire pts={[[80, boxY + h - 40], [boxX, boxY + h - 40]]} on={ins[1] === 1} />
                </>
              )}
              <g key={tick} className="pop">
                <Lamp x={boxX + w + 52} y={boxY + h / 2 - 18} value={q} label="Q" />
                <Lamp x={boxX + w + 52} y={boxY + h / 2 + 18} value={1 - q} label="Q̄" />
              </g>
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button variant="primary" color="#fb923c" onClick={pulse} disabled={invalid}>
              {t("CLK ↑ (pulse)")}
            </Button>
            {invalid && <span className="text-[13px] font-semibold text-bad">{t("S = R = 1 is forbidden — the next state is undefined.")}</span>}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title={t("Truth table")}>
            <table className="w-full max-w-[340px] text-center font-mono text-[14px]" dir="ltr">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-dim">
                  {cfg.inputs.map((n) => (
                    <th key={n} className="pb-2">{n}</th>
                  ))}
                  <th className="pb-2">Q(t+1)</th>
                </tr>
              </thead>
              <tbody>
                {cfg.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line/60" style={i === activeRow ? { background: r.bad ? "rgba(251,113,133,.14)" : "rgba(251,146,60,.12)" } : undefined}>
                    {r.in.map((v, k) => (
                      <td key={k} className="py-1.5 text-mute">{v}</td>
                    ))}
                    <td className="py-1.5 font-bold" style={{ color: r.bad ? "#fb7185" : i === activeRow ? "#fb923c" : "#98a4cb" }}>
                      {r.out}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title={t("Characteristic equation")}>
            <div className="font-mono text-lg font-semibold text-ink" dir="ltr">{cfg.eq}</div>
            <p className="mt-2 text-[13px] leading-relaxed text-mute">{t(cfg.note)}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ── Bonus: build a JK from a D flip-flop and a 4×1 MUX ─── */

function JkFromD() {
  const { t } = useLang();
  const [j, setJ] = useState(1);
  const [k, setK] = useState(0);
  const [q, setQ] = useState(0);
  const [tick, setTick] = useState(0);
  const qbar = 1 - q;
  const dVal = [q, 0, 1, qbar][j * 2 + k]; // mux output = next D

  const pulse = () => {
    setQ(dVal);
    setTick((x) => x + 1);
  };

  const inY = [62, 105, 148, 191];
  const sel = j * 2 + k;
  const inVals = [q, 0, 1, qbar];
  const edgeY = (x: number) => 240 - (x - 250) * (30 / 110);
  return (
    <Panel title={t("Slide example — a JK flip-flop from a D flip-flop and a 4×1 MUX")} bodyClassName="overflow-x-auto">
      <div dir="ltr">
        <svg width={680} height={340} viewBox="0 0 680 340" className="max-w-full">
          {/* feedback rails run over the top so nothing crosses: Q̄ → I3 (outer), Q → I0 */}
          <Wire pts={[[612, 141], [660, 141], [660, 14], [150, 14], [150, 191], [222, 191]]} on={qbar === 1} w={2} />
          <Wire pts={[[612, 105], [640, 105], [640, 26], [190, 26], [190, 62], [222, 62]]} on={q === 1} w={2} />

          {/* MUX trapezoid */}
          <path d="M250 40 L360 70 L360 210 L250 240 Z" fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
          <text x={318} y={136} fontSize={13} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">MUX</text>
          <text x={318} y={154} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">4→1</text>

          {/* data inputs I0=Q, I1=0, I2=1, I3=Q̄ */}
          {inY.map((y, i) => (
            <g key={i}>
              <Wire pts={[[222, y], [250, y]]} on={inVals[i] === 1} w={i === sel ? 3 : 2} />
              <text x={216} y={y + 4} fontSize={12} fontWeight={700} textAnchor="end" fill={i === sel ? SIGNAL.on : SIGNAL.mute}>{["Q", "0", "1", "Q̄"][i]}</text>
              <text x={256} y={y + 4} fontSize={10} fill={i === sel ? SIGNAL.on : SIGNAL.dim}>{`I${i}`}</text>
              {i === sel && <circle cx={250} cy={y} r={4} fill={SIGNAL.on} />}
            </g>
          ))}

          {/* J / K select switches, wired up to the slanted bottom edge (J = S₁, K = S₀) */}
          <SvgSwitch x={24} cy={280} value={j} label="J" onToggle={() => setJ(1 - j)} />
          <SvgSwitch x={24} cy={316} value={k} label="K" onToggle={() => setK(1 - k)} />
          <Wire pts={[[76, 280], [290, 280], [290, edgeY(290)]]} on={j === 1} />
          <Wire pts={[[76, 316], [325, 316], [325, edgeY(325)]]} on={k === 1} />
          <text x={298} y={272} fontSize={10} fontWeight={700} fill={SIGNAL.dim}>S₁</text>
          <text x={333} y={308} fontSize={10} fontWeight={700} fill={SIGNAL.dim}>S₀</text>

          {/* D wire */}
          <Wire pts={[[360, 140], [370, 140], [370, 110], [400, 110]]} on={dVal === 1} w={3} />
          <text x={380} y={100} fontSize={12} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">D</text>

          {/* FF box */}
          <g transform="translate(400 60)">
            <rect width={140} height={120} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={70} y={26} fontSize={15} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">D · FF</text>
            <path d="M58 120 L70 108 L82 120" fill="none" stroke="#7482b0" strokeWidth={2} />
            <text x={70} y={140} fontSize={12} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">Ck</text>
          </g>

          {/* outputs */}
          <Wire pts={[[540, 105], [580, 105]]} on={q === 1} />
          <Wire pts={[[540, 141], [580, 141]]} on={qbar === 1} />
          <g key={tick} className="pop">
            <Lamp x={594} y={105} value={q} label="Q" />
            <Lamp x={594} y={141} value={qbar} label="Q̄" />
          </g>
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button variant="primary" color="#fb923c" onClick={pulse}>{t("CLK ↑ (pulse)")}</Button>
        <span className="font-mono text-[13px] text-mute" dir="ltr">
          D = MUX(J, K) = {dVal}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-mute">
        {t("The MUX feeds D with exactly the next state the JK table demands: I₀ = Q holds, I₁ = 0 resets, I₂ = 1 sets, I₃ = Q̄ toggles. Same behaviour, different guts — proof that flip-flop types are interchangeable.")}
      </p>
    </Panel>
  );
}

export function FlipFlops() {
  const { t } = useLang();
  const [tab, setTab] = useState<"ff" | "jk">("ff");
  return (
    <div className="space-y-5">
      <Segmented
        value={tab}
        onChange={setTab}
        color="#fb923c"
        options={[
          { value: "ff", label: t("The four flip-flops") },
          { value: "jk", label: t("JK from D + MUX (slide example)") },
        ]}
      />
      {tab === "ff" && <FlipFlopDemo />}
      {tab === "jk" && <JkFromD />}
      <Callout title={t("Why the clock?")} tone="note">
        {t("A flip-flop is the memory unit of sequential circuits: it stores one bit, and only a clock pulse can move it to a new state. One shared clock is what lets millions of flip-flops change state in lockstep instead of chaos.")}
      </Callout>
    </div>
  );
}
