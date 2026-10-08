import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dot, GateShape, Lamp, SvgSwitch, Wire, gatePorts } from "../../components/gates";
import { Button, Callout, Panel, Segmented } from "../../components/ui";
import { SIGNAL } from "../../lib/theme";
import { useLang } from "../../lib/i18n";
import { cn } from "../../utils/cn";


function Label({ x, y, children, anchor = "start" }: { x: number; y: number; children: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fontSize={11} fontWeight={700} fill={SIGNAL.dim} textAnchor={anchor}>
      {children}
    </text>
  );
}

/* ─────────────── Truth tables ─────────────── */

function AdderTable({ rows, cur, headers }: { rows: number[][]; cur: number; headers: string[] }) {
  return (
    <table className="w-full text-center font-mono text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-widest text-dim">
          {headers.map((h, i) => (
            <th key={h} className={cn("py-1 font-semibold", i >= headers.length - 2 && "text-logic")}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className={cn("transition-colors", ri === cur ? "bg-logic/15 text-ink" : "text-dim")}>
            {r.map((v, i) => (
              <td key={i} className={cn("py-1", i >= headers.length - 2 && v ? "font-bold text-logic" : "")}>{v}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────── Ripple-carry ─────────────── */

function Ripple() {
  const { t, tf } = useLang();
  const N = 4;
  const [x, setX] = useState(0b0101);
  const [y, setY] = useState(0b0111);
  const [reveal, setReveal] = useState(N);
  const timer = useRef<number | null>(null);
  const [signedView, setSignedView] = useState(false);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const carries: number[] = [0];
  const sums: number[] = [];
  for (let i = 0; i < N; i++) {
    const xi = (x >> i) & 1, yi = (y >> i) & 1, ci = carries[i];
    sums[i] = xi ^ yi ^ ci;
    carries[i + 1] = (xi & yi) | ((xi ^ yi) & ci);
  }
  const result = sums.reduce((acc, s, i) => acc | (s << i), 0);
  const cout = carries[N];
  const overflowSigned = carries[N] ^ carries[N - 1];
  const sg = (v: number) => (v >= 8 ? v - 16 : v);

  const run = () => {
    if (timer.current) window.clearInterval(timer.current);
    setReveal(0);
    let k = 0;
    timer.current = window.setInterval(() => {
      k++;
      setReveal(k);
      if (k >= N && timer.current) window.clearInterval(timer.current);
    }, 650);
  };

  const flip = (which: "x" | "y", i: number) => {
    if (timer.current) window.clearInterval(timer.current);
    setReveal(N);
    if (which === "x") setX(x ^ (1 << i));
    else setY(y ^ (1 << i));
  };

  const cols = Array.from({ length: N }, (_, k) => N - 1 - k); // MSB → LSB
  const done = (i: number) => i < reveal;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-mute">
          {t("Four full adders chained: each one's")} <span className="text-logic">Cout</span> {t("feeds the next one's")} <span className="text-logic">Cin</span>.
        </div>
        <div className="flex items-center gap-2">
          <Segmented value={signedView ? "s" : "u"} onChange={(v) => setSignedView(v === "s")} options={[{ value: "u", label: t("unsigned") }, { value: "s", label: t("signed") }]} color="#22d3ee" />
          <Button onClick={run}>▶ {t("Animate carry ripple")}</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="mx-auto grid min-w-[360px] max-w-xl grid-cols-[64px_repeat(4,1fr)] items-center gap-y-2 text-center">
          <div />
          {cols.map((i) => (
            <div key={i} className="text-[11px] font-semibold uppercase tracking-widest text-dim">{tf("bit {i}", { i })}</div>
          ))}

          <div className="text-end font-mono text-xs text-dim">{t("carry in")}</div>
          {cols.map((i) => (
            <div key={i} className="relative">
              <div
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs font-bold transition-all duration-300",
                  done(i) ? (carries[i] ? "border-mem bg-mem/20 text-mem scale-110" : "border-line text-dim") : "border-dashed border-line text-transparent",
                )}
              >
                {done(i) ? carries[i] : "?"}
              </div>
            </div>
          ))}

          <div className="text-end font-mono text-xs text-mute">X</div>
          {cols.map((i) => (
            <Bit key={i} v={(x >> i) & 1} onClick={() => flip("x", i)} label={`X bit ${i}`} />
          ))}

          <div className="text-end font-mono text-xs text-mute">+ Y</div>
          {cols.map((i) => (
            <Bit key={i} v={(y >> i) & 1} onClick={() => flip("y", i)} label={`Y bit ${i}`} />
          ))}

          <div className="col-span-5 my-1 h-px bg-line" />

          <div className="text-end font-mono text-xs text-mute">Sum</div>
          {cols.map((i) => (
            <div key={i} className="mx-auto">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-lg font-bold transition-all duration-300 sm:h-11 sm:w-12",
                  done(i) ? (sums[i] ? "border-pipe bg-pipe/20 text-pipe" : "border-line bg-raised text-dim") : "border-dashed border-line text-transparent",
                )}
              >
                {done(i) ? sums[i] : "?"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-bg/50 px-3 py-2.5 sm:col-span-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Result")}</div>
          <div className="mt-1 font-mono text-lg text-ink">
            {signedView ? sg(x) : x} + {signedView ? sg(y) : y} = <span className="font-bold text-pipe">{reveal >= N ? (signedView ? sg(result) : result) : "…"}</span>
            <span className="ms-2 text-sm text-dim">
              {reveal >= N && (signedView ? (overflowSigned ? tf("(true sum {s} doesn't fit)", { s: sg(x) + sg(y) }) : "") : cout ? tf("(true sum {s} doesn't fit in 4 bits)", { s: x + y }) : "")}
            </span>
          </div>
        </div>
        <FlagBox label={t("C · carry-out")} on={reveal >= N && cout === 1} hint={t("unsigned overflow")} />
        <FlagBox label={t("V · overflow")} on={reveal >= N && overflowSigned === 1} hint={t("signed overflow (Cout ≠ carry into MSB)")} />
      </div>
    </div>
  );
}

function FlagBox({ label, on, hint }: { label: ReactNode; on: boolean; hint: ReactNode }) {
  const { t } = useLang();
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 transition-colors duration-300", on ? "border-bad/60 bg-bad/10" : "border-line bg-bg/50")}>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{label}</div>
      <div className={cn("mt-1 font-mono text-lg font-bold", on ? "text-bad" : "text-dim")}>{on ? t("SET") : t("clear")}</div>
      <div className="text-[11px] text-dim">{hint}</div>
    </div>
  );
}

function Bit({ v, onClick, label }: { v: number; onClick?: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      aria-label={label}
      className={cn(
        "mx-auto flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-lg font-bold transition-all duration-200 sm:h-11 sm:w-12",
        v ? "border-logic bg-logic/20 text-logic" : "border-line bg-raised text-dim",
        onClick ? "hover:border-dim active:scale-90" : "cursor-default",
      )}
    >
      {v}
    </button>
  );
}

/* ─────────────── Container ─────────────── */

export function Adders() {
  const { t } = useLang();
  const [which, setWhich] = useState<"half" | "full" | "ripple">("half");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={which}
          onChange={setWhich}
          options={[
            { value: "half", label: t("Half adder") },
            { value: "full", label: t("Full adder") },
            { value: "ripple", label: t("4-bit ripple-carry") },
          ]}
          color="#22d3ee"
        />
        <span className="text-sm text-dim">
          {which === "half" && t("Adds two bits. Can't accept a carry-in, so it can only be the lowest bit.")}
          {which === "full" && t("Adds two bits plus a carry-in: two half adders and an OR gate.")}
          {which === "ripple" && t("Chain n full adders to add n-bit numbers.")}
        </span>
      </div>

      {which === "half" && <HalfAdderPanel />}
      {which === "full" && <FullAdderPanel />}
      {which === "ripple" && (
        <Panel title={t("4-bit ripple-carry adder")}>
          <Ripple />
        </Panel>
      )}

      <Callout title={t("Arithmetic emerges from logic")} tone="note">
        {t("Nothing above \u201cknows\u201d what addition is. The sum bit is XOR (1 when an odd number of inputs are 1) and the carry is AND/OR (1 when two or more are). A CPU's ALU is this idea scaled up — plus a few multiplexers to choose between operations.")}
        {which === "ripple" && " " + t("The catch: the MSB's sum can't settle until the carry has rippled through every stage, so delay grows linearly with width. That's why real ALUs use carry-lookahead or prefix adders.")}
      </Callout>
    </div>
  );
}

/* The panels own their input state so tables can highlight the live row. */
function HalfAdderPanel() {
  const { t } = useLang();
  const rows = [[0, 0, 0, 0], [0, 1, 0, 1], [1, 0, 0, 1], [1, 1, 1, 0]];
  return (
    <Panel title={t("Half adder = XOR + AND")}>
      <HalfAdderWithTable rows={rows} />
    </Panel>
  );
}

function HalfAdderWithTable({ rows }: { rows: number[][] }) {
  const { t } = useLang();
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const s = a ^ b;
  const c = a & b;
  const X = gatePorts("XOR", 220, 20);
  const N = gatePorts("AND", 220, 140);
  const yA = 46, yB = 194, xA = 110, xB = 142;
  const cur = a * 2 + b;
  return (
    <div className="grid items-center gap-5 lg:grid-cols-[1fr_220px]">
      <div>
        <svg viewBox="-34 0 594 250" className="w-full" role="img" aria-label="Half adder circuit">
          <Wire on={a === 1} pts={[[48, yA], [X.ins[0].x, X.ins[0].y]]} />
          <Wire on={a === 1} pts={[[xA, yA], [xA, N.ins[0].y], [N.ins[0].x, N.ins[0].y]]} />
          <Wire on={b === 1} pts={[[48, yB], [N.ins[1].x, N.ins[1].y]]} />
          <Wire on={b === 1} pts={[[xB, yB], [xB, X.ins[1].y], [X.ins[1].x, X.ins[1].y]]} />
          <Dot x={xA} y={yA} on={a === 1} />
          <Dot x={xB} y={yB} on={b === 1} />
          <Wire on={s === 1} pts={[[X.out.x, X.out.y], [430, X.out.y]]} />
          <Wire on={c === 1} pts={[[N.out.x, N.out.y], [430, N.out.y]]} />
          <GateShape type="XOR" x={220} y={20} out={s} />
          <GateShape type="AND" x={220} y={140} out={c} />
          <Label x={256} y={108} anchor="middle">XOR</Label>
          <Label x={255} y={228} anchor="middle">AND</Label>
          <SvgSwitch x={-4} cy={yA} value={a} label="A" onToggle={() => setA(a ^ 1)} />
          <SvgSwitch x={-4} cy={yB} value={b} label="B" onToggle={() => setB(b ^ 1)} />
          <Lamp x={444} y={X.out.y} value={s} label="Sum" />
          <Lamp x={444} y={N.out.y} value={c} label="Carry" />
        </svg>
        <p className="mt-2 text-center font-mono text-sm text-mute">
          {a} + {b} = <span className="font-bold text-logic">{c}{s}</span>
          <span className="text-dim"> {t("(binary)")} = {a + b}</span>
        </p>
      </div>
      <AdderTable rows={rows} cur={cur} headers={["A", "B", "Carry", "Sum"]} />
    </div>
  );
}

function FullAdderPanel() {
  const rows: number[][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i >> 2) & 1, b = (i >> 1) & 1, c = i & 1;
    const t = a + b + c;
    rows.push([a, b, c, t >> 1, t & 1]);
  }
  return <FullAdderWithTable rows={rows} />;
}

function FullAdderWithTable({ rows }: { rows: number[][] }) {
  const { t } = useLang();
  return (
    <Panel title={t("Full adder = 2 × half adder + OR")}>
      <FullAdderLive rows={rows} />
    </Panel>
  );
}

function FullAdderLive({ rows }: { rows: number[][] }) {
  const { t } = useLang();
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const [cin, setCin] = useState(1);
  const p = a ^ b, g1 = a & b, sum = p ^ cin, g2 = p & cin, cout = g1 | g2;
  const X1 = gatePorts("XOR", 200, 20);
  const A1 = gatePorts("AND", 200, 130);
  const X2 = gatePorts("XOR", 430, 20);
  const A2 = gatePorts("AND", 430, 170);
  const O = gatePorts("OR", 580, 230);
  const yA = 46, yB = 214, yC = 322;
  const xA = 104, xB = 138, xP = 345, xC = 388;
  const cur = a * 4 + b * 2 + cin;
  return (
    <div className="grid items-center gap-5 xl:grid-cols-[1fr_230px]">
      <div>
        <svg viewBox="-34 0 834 352" className="w-full" role="img" aria-label="Full adder circuit">
          <Wire on={a === 1} pts={[[48, yA], [X1.ins[0].x, X1.ins[0].y]]} />
          <Wire on={a === 1} pts={[[xA, yA], [xA, A1.ins[0].y], [A1.ins[0].x, A1.ins[0].y]]} />
          <Wire on={b === 1} pts={[[48, yB], [xB, yB], [xB, X1.ins[1].y], [X1.ins[1].x, X1.ins[1].y]]} />
          <Wire on={b === 1} pts={[[xB, A1.ins[1].y], [A1.ins[1].x, A1.ins[1].y]]} />
          <Wire on={p === 1} pts={[[X1.out.x, X1.out.y], [xP, X1.out.y], [xP, X2.ins[0].y], [X2.ins[0].x, X2.ins[0].y]]} />
          <Wire on={p === 1} pts={[[xP, X1.out.y], [xP, A2.ins[0].y], [A2.ins[0].x, A2.ins[0].y]]} />
          <Wire on={cin === 1} pts={[[48, yC], [xC, yC], [xC, X2.ins[1].y], [X2.ins[1].x, X2.ins[1].y]]} />
          <Wire on={cin === 1} pts={[[xC, A2.ins[1].y], [A2.ins[1].x, A2.ins[1].y]]} />
          <Wire on={g1 === 1} pts={[[A1.out.x, A1.out.y], [312, A1.out.y], [312, O.ins[1].y], [O.ins[1].x, O.ins[1].y]]} />
          <Wire on={g2 === 1} pts={[[A2.out.x, A2.out.y], [548, A2.out.y], [548, O.ins[0].y], [O.ins[0].x, O.ins[0].y]]} />
          <Wire on={sum === 1} pts={[[X2.out.x, X2.out.y], [700, X2.out.y]]} />
          <Wire on={cout === 1} pts={[[O.out.x, O.out.y], [700, O.out.y]]} />
          <Dot x={xA} y={yA} on={a === 1} />
          <Dot x={xB} y={yB} on={b === 1} />
          <Dot x={xP} y={X1.out.y} on={p === 1} />
          <Dot x={xC} y={yC} on={cin === 1} />
          <rect x={176} y={6} width={152} height={218} rx={14} fill="none" stroke="#2f3f6e" strokeDasharray="5 5" />
          <Label x={252} y={22} anchor="middle">HALF ADDER #1</Label>
          <rect x={406} y={6} width={152} height={250} rx={14} fill="none" stroke="#2f3f6e" strokeDasharray="5 5" />
          <Label x={482} y={22} anchor="middle">HALF ADDER #2</Label>
          <GateShape type="XOR" x={200} y={20} out={p} />
          <GateShape type="AND" x={200} y={130} out={g1} />
          <GateShape type="XOR" x={430} y={20} out={sum} />
          <GateShape type="AND" x={430} y={170} out={g2} />
          <GateShape type="OR" x={580} y={230} out={cout} />
          <Label x={xP + 6} y={X1.out.y - 8}>{`P=${p}`}</Label>
          <Label x={A1.out.x + 8} y={A1.out.y - 8}>{`G1=${g1}`}</Label>
          <Label x={A2.out.x + 6} y={A2.out.y - 8}>{`G2=${g2}`}</Label>
          <SvgSwitch x={-4} cy={yA} value={a} label="A" onToggle={() => setA(a ^ 1)} />
          <SvgSwitch x={-4} cy={yB} value={b} label="B" onToggle={() => setB(b ^ 1)} />
          <SvgSwitch x={-4} cy={yC} value={cin} label="Cin" onToggle={() => setCin(cin ^ 1)} />
          <Lamp x={714} y={X2.out.y} value={sum} label="Sum" />
          <Lamp x={714} y={O.out.y} value={cout} label="Cout" />
        </svg>
        <p className="mt-2 text-center font-mono text-sm text-mute">
          {a} + {b} + {cin} = <span className="font-bold text-logic">{cout}{sum}</span>
          <span className="text-dim"> {t("(binary)")} = {a + b + cin}</span>
        </p>
      </div>
      <AdderTable rows={rows} cur={cur} headers={["A", "B", "Cin", "Cout", "Sum"]} />
    </div>
  );
}

