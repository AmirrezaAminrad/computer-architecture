import { useState, type ReactNode } from "react";
import { Button, Panel, Segmented, Slider, Switch } from "../../components/ui";
import { Wire } from "../../components/gates";
import { SIGNAL } from "../../lib/theme";
import { useLang } from "../../lib/i18n";

const bin4 = (n: number) => n.toString(2).padStart(4, "0");
const bin8 = (n: number) => n.toString(2).padStart(8, "0");

/* ── Arithmetic circuit (slide Ex 7) ────────────────────── */

function ArithmeticCircuit() {
  const { t } = useLang();
  const [a, setA] = useState(9);
  const [b, setB] = useState(5);
  const [s, setS] = useState(0);
  const [cin, setCin] = useState(0);

  const muxIn = [b, 0, 15, (~b) & 15][s * 2 + cin];
  const sum = a + muxIn + cin;
  const f = sum & 15;
  const cout = sum > 15 ? 1 : 0;

  const table = [
    { s: 0, cin: 0, op: "A + B" },
    { s: 0, cin: 1, op: "A + 1" },
    { s: 1, cin: 0, op: "A − 1" },
    { s: 1, cin: 1, op: "A + B̄ + 1 = A − B" },
  ];
  const active = table.findIndex((r) => r.s === s && r.cin === cin);

  const inY = [42, 84, 126, 168];

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("Arithmetic circuit — MUX + full adder")} bodyClassName="overflow-x-auto">
        <div dir="ltr">
          <svg width={604} height={266} viewBox="0 -14 604 266" className="max-w-full">
            {/* MUX trapezoid */}
            <path d="M60 18 L170 52 L170 182 L60 216 Z" fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={88} y={106} fontSize={14} fontWeight={800} fill={SIGNAL.text}>MUX</text>
            <text x={88} y={124} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>4→1</text>
            {["B", "0", "1111", "B̄"].map((label, i) => {
              const on = i === s * 2 + cin;
              return (
                <g key={i}>
                  <text x={54} y={inY[i] + 4} fontSize={12} fontWeight={700} textAnchor="end" fill={on ? SIGNAL.on : SIGNAL.mute}>{label}</text>
                  <Wire pts={[[58, inY[i]], [60, inY[i]]]} on={on} w={2} />
                  {on && <circle cx={60} cy={inY[i]} r={4} fill={SIGNAL.on} />}
                </g>
              );
            })}
            {/* select stubs — start on the slanted bottom edge */}
            <Wire pts={[[104, 202], [104, 238]]} on={s === 1} w={2} />
            <Wire pts={[[134, 193], [134, 238]]} on={cin === 1} w={2} />
            <text x={104} y={250} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">S₁</text>
            <text x={134} y={250} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">S₀</text>

            {/* mux out → FA Y */}
            <Wire pts={[[170, 118], [300, 118], [300, 132], [330, 132]]} on={muxIn > 0} w={3} />
            {/* A operand routed over the top of the MUX into the FA's X input */}
            <text x={20} y={4} fontSize={12} fontWeight={700} fill={SIGNAL.mute}>{`A = ${bin4(a)}`}</text>
            <Wire pts={[[84, 0], [318, 0], [318, 90], [330, 90]]} on={a > 0} w={3} />

            {/* FA box */}
            <rect x={330} y={60} width={130} height={110} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={395} y={92} fontSize={16} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">FA</text>
            <text x={344} y={86} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>X</text>
            <text x={344} y={136} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>Y</text>
            <Wire pts={[[395, 60], [395, 46]]} on={cin === 1} w={2} />
            <text x={407} y={54} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>Cin</text>
            {/* result */}
            <Wire pts={[[460, 100], [506, 100]]} on={f > 0} w={3} />
            <text x={510} y={95} fontSize={14} fontWeight={800} fill={SIGNAL.on}>F = {bin4(f)}</text>
            <text x={510} y={112} fontSize={11} fill={SIGNAL.mute}>= {f}</text>
            <Wire pts={[[395, 170], [395, 188]]} on={cout === 1} w={2.5} />
            <text x={407} y={202} fontSize={11} fontWeight={700} fill={cout ? SIGNAL.on : SIGNAL.mute}>Cout = {cout}</text>
          </svg>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Slider label={`A = ${a}`} value={a} min={0} max={15} onChange={setA} color="#fb923c" />
          <Slider label={`B = ${b}`} value={b} min={0} max={15} onChange={setB} color="#fb923c" />
        </div>
        <div className="mt-3 flex flex-wrap gap-6">
          <Switch on={s === 1} onChange={(v) => setS(v ? 1 : 0)} label="S" hint={t("operation select")} color="#fb923c" />
          <Switch on={cin === 1} onChange={(v) => setCin(v ? 1 : 0)} label="Cin" hint={t("carry in / +1")} color="#fb923c" />
        </div>
      </Panel>

      <Panel title={t("Function table (slide Ex 7)")}>
        <table className="w-full max-w-[380px] text-center font-mono text-[13.5px]" dir="ltr">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-dim">
              <th className="pb-2">S</th>
              <th className="pb-2">Cin</th>
              <th className="pb-2 text-start ps-3">F</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <tr key={i} className="border-t border-line/60" style={i === active ? { background: "rgba(251,146,60,.12)" } : undefined}>
                <td className="py-1.5">{r.s}</td>
                <td className="py-1.5">{r.cin}</td>
                <td className="py-1.5 text-start ps-3 font-bold" style={{ color: i === active ? "#fb923c" : "#98a4cb" }}>{r.op}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[13px] leading-relaxed text-mute">
          {t("One MUX and one adder produce all four operations. S and Cin together address the MUX: it hands the adder B, 0, all-ones (so A + 1111 = A − 1), or B̄ — and Cin supplies the +1 that turns A + B̄ into A − B. This is the adder–subtractor of the slides, drawn as a data-selection problem.")}
        </p>
      </Panel>
    </div>
  );
}

/* ── Logic circuit ──────────────────────────────────────── */

function LogicCircuit() {
  const { t } = useLang();
  const [a, setA] = useState(0b1010);
  const [b, setB] = useState(0b0110);
  const [op, setOp] = useState(2); // 00 and, 01 or, 10 xor, 11 not
  const results = [a & b, a | b, a ^ b, (~a) & 0xff];
  const f = results[op];
  const names = ["AND", "OR", "XOR", "NOT A"];

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("Logic circuit — one stage, bit i")} bodyClassName="overflow-x-auto">
        <div dir="ltr">
          <svg width={480} height={250} viewBox="0 0 480 250" className="max-w-full">
            <text x={16} y={14} fontSize={12} fontWeight={700} fill={SIGNAL.mute}>{`Aᵢ = ${(a >> 3) & 1}`}</text>
            <text x={16} y={108} fontSize={12} fontWeight={700} fill={SIGNAL.mute}>{`Bᵢ = ${(b >> 3) & 1}`}</text>
            {/* input rails feeding every gate */}
            <Wire pts={[[44, 23], [56, 23]]} on={((a >> 3) & 1) === 1} w={2} />
            <line x1={56} y1={23} x2={56} y2={174} stroke={(a >> 3) & 1 ? SIGNAL.on : SIGNAL.off} strokeWidth={2} style={{ transition: "stroke .25s" }} />
            <Wire pts={[[44, 120], [68, 120]]} on={((b >> 3) & 1) === 1} w={2} />
            <line x1={68} y1={37} x2={68} y2={133} stroke={(b >> 3) & 1 ? SIGNAL.on : SIGNAL.off} strokeWidth={2} style={{ transition: "stroke .25s" }} />
            {/* gates: AND, OR, XOR, NOT — simplified as labeled boxes into MUX; NOT only takes A */}
            {["AND", "OR", "XOR", "NOT"].map((name, i) => {
              const y = 30 + i * 48;
              const on = i === op;
              const unary = name === "NOT";
              const ya = unary ? y : y - 7;
              return (
                <g key={name}>
                  <Wire pts={[[56, ya], [80, ya]]} on={((a >> 3) & 1) === 1} w={2} />
                  <circle cx={56} cy={ya} r={3} fill={(a >> 3) & 1 ? SIGNAL.on : SIGNAL.off} />
                  {!unary && <Wire pts={[[68, y + 7], [80, y + 7]]} on={((b >> 3) & 1) === 1} w={2} />}
                  {!unary && <circle cx={68} cy={y + 7} r={3} fill={(b >> 3) & 1 ? SIGNAL.on : SIGNAL.off} />}
                  <rect x={80} y={y - 14} width={74} height={28} rx={7} fill={on ? SIGNAL.bodyOn : SIGNAL.body} stroke={on ? SIGNAL.on : "#4a5886"} strokeWidth={2} style={{ transition: "all .2s" }} />
                  <text x={117} y={y + 4} fontSize={11} fontWeight={800} textAnchor="middle" fill={on ? SIGNAL.on : SIGNAL.mute}>{name}</text>
                  <Wire pts={[[154, y], [200, y]]} on={on} w={on ? 3 : 2} />
                  <text x={168} y={y - 6} fontSize={10} fill={on ? SIGNAL.on : SIGNAL.dim} textAnchor="middle">{on ? String((results[op] >> 3) & 1) : ""}</text>
                </g>
              );
            })}
            {/* MUX */}
            <path d="M200 24 L260 52 L260 192 L200 220 Z" fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={214} y={112} fontSize={12} fontWeight={800} fill={SIGNAL.text}>MUX</text>
            <text x={214} y={128} fontSize={10} fontWeight={700} fill={SIGNAL.mute}>4→1</text>
            <Wire pts={[[260, 122], [320, 122]]} on={true} w={3} />
            <text x={326} y={118} fontSize={13} fontWeight={800} fill={SIGNAL.on}>{`Fᵢ = ${(f >> 3) & 1}`}</text>
            {/* select lines */}
            <text x={208} y={240} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>{`S₁ = ${(op >> 1) & 1}   S₀ = ${op & 1}`}</text>
          </svg>
        </div>
        <div className="mt-2">
          <Segmented
            value={op}
            onChange={setOp}
            color="#fb923c"
            options={[
              { value: 0, label: "00 · AND" },
              { value: 1, label: "01 · OR" },
              { value: 2, label: "10 · XOR" },
              { value: 3, label: "11 · NOT" },
            ]}
          />
        </div>
      </Panel>

      <Panel title={t("Applied to whole registers")}>
        <div className="space-y-3 font-mono text-[14px]" dir="ltr">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg/50 px-3 py-2">
            <span className="text-mute">A = {bin8(a)}</span>
            <span className="text-dim">({a})</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg/50 px-3 py-2">
            <span className="text-mute">B = {bin8(b)}</span>
            <span className="text-dim">({b})</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2" style={{ borderColor: "#fb923c66", background: "rgba(251,146,60,.08)" }}>
            <span className="font-bold text-digital">{`${names[op]} → F = ${bin8(f)}`}</span>
            <span className="text-dim">({f})</span>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Slider label={`A = ${a}`} value={a} min={0} max={255} onChange={setA} color="#fb923c" />
          <Slider label={`B = ${b}`} value={b} min={0} max={255} onChange={setB} color="#fb923c" />
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-mute">
          {t("The stage above computes one bit pair; n of them in parallel — sharing the same S₁S₀ — give a logic unit for whole registers: AND, OR, XOR or complement, selected per instruction.")}
        </p>
      </Panel>
    </div>
  );
}

/* ── Shift unit ─────────────────────────────────────────── */

type ShOp = "shl" | "shr" | "cil" | "cir" | "ashl" | "ashr";

function ShiftUnit() {
  const { t } = useLang();
  const [r, setR] = useState(0b10110100);
  const [op, setOp] = useState<ShOp>("shl");
  const [sin, setSin] = useState(0);

  const sign = (r >> 7) & 1;
  const overflow = ((r >> 7) & 1) ^ ((r >> 6) & 1);
  let res = r;
  let note: ReactNode = "";
  switch (op) {
    case "shl": res = ((r << 1) | sin) & 0xff; note = t("logical left: 0 (or serial-in) enters at the right"); break;
    case "shr": res = (r >>> 1) | (sin << 7); note = t("logical right: 0 (or serial-in) enters at the left"); break;
    case "cil": res = ((r << 1) | (r >> 7)) & 0xff; note = t("rotate left: the MSB wraps around to bit 0"); break;
    case "cir": res = (r >> 1) | ((r & 1) << 7); note = t("rotate right: bit 0 wraps around to the MSB"); break;
    case "ashl": res = (r << 1) & 0xff; note = t("arithmetic left: same wires as shl, but overflow matters"); break;
    case "ashr": res = (r >>> 1) | (sign << 7); note = t("arithmetic right: the sign bit is replicated — signed ÷2"); break;
  }
  const beforeBits = bin8(r).split("");
  const afterBits = bin8(res).split("");

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("Shift micro-operations on an 8-bit register")}>
        <div className="space-y-3">
          <div className="font-mono text-[15px]" dir="ltr">
            <span className="text-dim">before </span>
            <span className="tracking-widest text-ink">{beforeBits.join(" ")}</span>
          </div>
          <div className="font-mono text-[15px]" dir="ltr">
            <span className="text-dim">after  </span>
            <span className="tracking-widest font-bold text-digital">{afterBits.join(" ")}</span>
          </div>
          <Segmented
            value={op}
            onChange={(v) => setOp(v as ShOp)}
            color="#fb923c"
            options={(["shl", "shr", "cil", "cir", "ashl", "ashr"] as ShOp[]).map((o) => ({ value: o, label: o }))}
          />
          <div className="flex flex-wrap items-center gap-4">
            {(op === "shl" || op === "shr") && (
              <Switch on={sin === 1} onChange={(v) => setSin(v ? 1 : 0)} label={t("serial in")} color="#fb923c" />
            )}
            <Button variant="primary" color="#fb923c" onClick={() => setR(res)}>{t("Apply to R")}</Button>
            <Button variant="ghost" onClick={() => setR(0b10110100)}>{t("Reset R")}</Button>
          </div>
          <p className="text-[13px] leading-relaxed text-mute">{note}</p>
          {op === "ashl" && (
            <div className="rounded-xl border px-3 py-2 text-[13px]" style={{ borderColor: overflow ? "#fb718566" : "#223052", color: overflow ? "#fb7185" : "#98a4cb" }}>
              {t("overflow = R₇ ⊕ R₆ (before the shift) =")} <span className="font-mono font-bold">{overflow}</span>
              {overflow === 1 && ` — ${t("the sign flips, so a signed multiply-by-2 just overflowed.")}`}
            </div>
          )}
        </div>
      </Panel>

      <Panel title={t("The six shifts at a glance")}>
        <table className="w-full text-[13px]" dir="ltr">
          <tbody>
            {[
              ["shl / shr", t("shift in a 0 (or serial-in bit) at the far end")],
              ["cil / cir", t("rotate: the bit that falls off one end re-enters the other")],
              ["ashl", t("multiply by 2 — watch overflow = R₇ ⊕ R₆")],
              ["ashr", t("divide by 2, sign preserved: the MSB copies itself")],
            ].map(([k, v], i) => (
              <tr key={i} className="border-b border-line/50 last:border-0">
                <td className="py-2 pe-3 font-mono font-bold text-digital">{k}</td>
                <td className="py-2 text-mute">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[13px] leading-relaxed text-mute">
          {t("Hardware-wise every shift is a row of 2×1 MUXes: one select line chooses “keep” or “take my neighbor”, and the serial inputs at the two ends are wired per operation.")}
        </p>
      </Panel>
    </div>
  );
}

/* ── One-stage ALU ──────────────────────────────────────── */

function OneStageAlu() {
  const { t } = useLang();
  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <Panel title={t("One stage of the ALU (slide, p.23)")}>
        <div dir="ltr">
          <svg width={520} height={300} viewBox="0 0 520 300" className="max-w-full">
            {/* arithmetic circuit box */}
            <rect x={30} y={30} width={150} height={80} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={105} y={64} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{t("arithmetic circuit")}</text>
            <text x={105} y={82} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">A, B, Cᵢ → Dᵢ</text>
            {/* logic circuit box */}
            <rect x={30} y={180} width={150} height={80} rx={10} fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={105} y={214} fontSize={12} fontWeight={800} fill={SIGNAL.text} textAnchor="middle">{t("logic circuit")}</text>
            <text x={105} y={232} fontSize={10} fill={SIGNAL.mute} textAnchor="middle">Aᵢ, Bᵢ → Eᵢ</text>
            {/* select mux */}
            <path d="M300 100 L370 128 L370 192 L300 220 Z" fill={SIGNAL.body} stroke="#7482b0" strokeWidth={2.5} />
            <text x={314} y={152} fontSize={12} fontWeight={800} fill={SIGNAL.text}>MUX</text>
            <text x={314} y={168} fontSize={10} fontWeight={700} fill={SIGNAL.mute}>4→1</text>
            {/* inputs to mux — four taps down the flat left edge */}
            <Wire pts={[[180, 70], [190, 70], [190, 122], [300, 122]]} on={false} w={2} />
            <text x={200} y={116} fontSize={10} fill={SIGNAL.mute}>Dᵢ</text>
            <Wire pts={[[180, 220], [190, 220], [190, 150], [300, 150]]} on={false} w={2} />
            <text x={200} y={144} fontSize={10} fill={SIGNAL.mute}>Eᵢ</text>
            <circle cx={270} cy={178} r={3.5} fill={SIGNAL.mute} />
            <text x={264} y={172} fontSize={10} fill={SIGNAL.mute} textAnchor="end">Aᵢ₋₁ (shr)</text>
            <Wire pts={[[270, 178], [300, 178]]} on={false} w={2} />
            <circle cx={270} cy={206} r={3.5} fill={SIGNAL.mute} />
            <text x={264} y={200} fontSize={10} fill={SIGNAL.mute} textAnchor="end">Aᵢ₊₁ (shl)</text>
            <Wire pts={[[270, 206], [300, 206]]} on={false} w={2} />
            {/* output */}
            <Wire pts={[[370, 160], [430, 160]]} on={false} w={3} />
            <text x={436} y={165} fontSize={13} fontWeight={800} fill={SIGNAL.text}>Fᵢ</text>
            {/* selects */}
            <Wire pts={[[335, 206], [335, 240]]} on={false} w={2} />
            <text x={335} y={254} fontSize={11} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">S₃ S₂</text>
            <Wire pts={[[60, 110], [60, 130]]} on={false} w={2} />
            <Wire pts={[[60, 260], [60, 286]]} on={false} w={2} />
            <text x={44} y={146} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>S₁ S₀</text>
            <text x={72} y={280} fontSize={11} fontWeight={700} fill={SIGNAL.mute}>S₁ S₀</text>
          </svg>
        </div>
      </Panel>
      <Panel title={t("What the select lines mean")}>
        <table className="w-full text-center font-mono text-[13px]" dir="ltr">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-dim">
              <th className="pb-2">S₃ S₂</th>
              <th className="pb-2 text-start ps-3">{t("Fᵢ comes from")}</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["0 0", t("the arithmetic circuit (Dᵢ)")],
              ["0 1", t("the logic circuit (Eᵢ)")],
              ["1 0", t("shift right — the neighbor Aᵢ₋₁")],
              ["1 1", t("shift left — the neighbor Aᵢ₊₁")],
            ].map(([k, v], i) => (
              <tr key={i} className="border-t border-line/60">
                <td className="py-1.5 font-bold text-ink">{k}</td>
                <td className="py-1.5 text-start ps-3 text-mute">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[13px] leading-relaxed text-mute">
          {t("Stack n of these stages side by side and the shared S₃S₂S₁S₀ wires pick, for the whole word, between arithmetic, logic, and both shifts — that bundle is the ALU the datapath in §3.2 keeps calling.")}
        </p>
      </Panel>
    </div>
  );
}

export function Alu() {
  const { t } = useLang();
  const [tab, setTab] = useState<"arith" | "logic" | "shift" | "stage">("arith");
  return (
    <div className="space-y-5">
      <Segmented
        value={tab}
        onChange={setTab}
        color="#a78bfa"
        options={[
          { value: "arith", label: t("Arithmetic") },
          { value: "logic", label: t("Logic") },
          { value: "shift", label: t("Shift") },
          { value: "stage", label: t("One-stage ALU") },
        ]}
      />
      {tab === "arith" && <ArithmeticCircuit />}
      {tab === "logic" && <LogicCircuit />}
      {tab === "shift" && <ShiftUnit />}
      {tab === "stage" && <OneStageAlu />}
    </div>
  );
}
