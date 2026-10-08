import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Callout, Panel, Stat, Tag, bin } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { cn } from "../../utils/cn";

/*
 * Booth's radix-2 algorithm (Mano §10-3): multiply two 8-bit signed numbers.
 * Registers: A (9-bit accumulator — the extra bit catches partial products
 * like 128 that don't fit signed 8-bit), Q (multiplier), Q₋₁ (bit shifted out
 * last cycle), B (multiplicand), SC (step counter). Each step:
 *   look at Q₀Q₋₁ → 10: A ← A − B · 01: A ← A + B · 00/11: nothing
 *   then arithmetic-shift-right A‖Q‖Q₋₁, decrement SC.
 * The final A‖Q is the 16-bit two's-complement product.
 */

const toSigned8 = (a: number) => (a & 0x80 ? a - 256 : a);

interface Step {
  i: number;
  pair: string; // Q₀Q₋₁ before the step
  action: string;
  kind: "add" | "sub" | "none";
  a: number; // after action+shift, signed (A is 9 bits wide internally)
  q: number;
  q1: number;
  sc: number;
}

function runBooth(b: number, q0: number) {
  const B = toSigned8(b & 0xff);
  let A = 0;
  let Q = q0 & 0xff;
  let q1 = 0;
  const steps: Step[] = [];
  for (let i = 1; i <= 8; i++) {
    const pair = `${Q & 1}${q1}`;
    let kind: Step["kind"] = "none";
    let action = "— (00 or 11: skip the add)";
    if (pair === "10") {
      A -= B;
      kind = "sub";
      action = `A ← A − B  (${A} after sub)`;
    } else if (pair === "01") {
      A += B;
      kind = "add";
      action = `A ← A + B  (${A} after add)`;
    }
    // arithmetic right shift of A‖Q‖Q₋₁
    const aLsb = A & 1;
    A >>= 1;
    q1 = Q & 1;
    Q = (Q >>> 1) | (aLsb << 7);
    steps.push({ i, pair, action, kind, a: A, q: Q, q1, sc: 8 - i });
  }
  return { steps, product: (A << 8) | Q };
}

const PRESETS = [
  { b: 7, q: -3 },
  { b: -5, q: -4 },
  { b: 13, q: 11 },
  { b: -128, q: -1 },
  { b: 15, q: 15 },
];

function RegBox({ label, bits, color, flash, note }: { label: string; bits: string; color: string; flash?: boolean; note?: ReactNode }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5 transition-all duration-300", flash ? "shadow-[0_0_16px_rgba(251,191,36,0.25)]" : "")} style={{ borderColor: flash ? color : "#223052", background: flash ? color + "14" : "rgba(13,20,39,.5)" }}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {label}
        </span>
        {note && <span className="font-mono text-[10px] text-dim">{note}</span>}
      </div>
      <div className="mt-1 font-mono text-lg font-bold tracking-[0.08em]" style={{ color: bits.includes("—") ? "#4a5886" : "#e8ecfb" }}>
        {bits}
      </div>
    </div>
  );
}

export function Booth() {
  const { t } = useLang();
  const [b, setB] = useState(7);
  const [q, setQ] = useState(-3);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);

  const { steps, product } = useMemo(() => runBooth(b, q), [b, q]);
  const cur = pos > 0 ? steps[pos - 1] : null;
  const next = pos < 8 ? steps[pos] : null;
  const done = pos >= 8;
  const trueProduct = b * q;
  // current register values: start from identity, apply shifts of executed steps
  const state = useMemo(() => {
    let A = 0;
    let Q = q & 0xff;
    let q1 = 0;
    for (let i = 0; i < pos; i++) {
      const s = steps[i];
      A = s.a;
      Q = s.q;
      q1 = s.q1;
    }
    return { A, Q, q1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, b, q]);

  useEffect(() => {
    setPos(0);
    setPlaying(false);
  }, [b, q]);

  useEffect(() => {
    if (!playing) return;
    if (pos >= 8) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setPos((p) => p + 1), 850);
    return () => clearTimeout(t);
  }, [playing, pos]);

  const setOperand = (which: "b" | "q", v: number) => {
    const clamped = Math.max(-128, Math.min(127, v));
    which === "b" ? setB(clamped) : setQ(clamped);
  };

  const productOk = product === trueProduct;

  return (
    <Panel title={t("Booth's algorithm — signed multiplication, step by step")}>
      <p className="mb-4 max-w-3xl text-sm leading-relaxed text-mute">
        {t("The adders above can add; multiplying naively would add on every 1 bit — up to 8 additions. Booth's insight: look at the")} <em>{t("transitions")}</em>.{" "}
        {t("Entering a run of 1s means")} <span className="font-mono text-ink">+B</span>{t(", leaving it means")} <span className="font-mono text-ink">−B</span>{" "}
        {t("(because a run like 01110 = 10000 − 10). Hardware just repeats one micro-step, shown live below.")}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {PRESETS.map((p, i) => (
          <Button
            key={i}
            className="!px-2.5 !py-1 !text-xs"
            active={p.b === b && p.q === q}
            onClick={() => {
              setB(p.b);
              setQ(p.q);
            }}
          >
            {p.b} × {p.q}
          </Button>
        ))}
        <div className="ms-auto flex items-center gap-3">
          {(
            [
              ["B · multiplicand", b, "b"],
              ["Q · multiplier", q, "q"],
            ] as const
          ).map(([label, val, which]) => (
            <label key={which} className="flex items-center gap-2 text-xs text-mute">
              {t(label)}
              <input
                type="number"
                min={-128}
                max={127}
                value={val}
                onChange={(e) => setOperand(which, Number(e.target.value))}
                className="w-16 rounded-lg border border-line bg-bg/60 px-2 py-1 text-center font-mono text-xs text-ink outline-none focus:border-logic"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <RegBox label="A" bits={bin(state.A & 0x1ff, 9)} color="#22d3ee" flash={cur?.kind === "add"} note={`${state.A}`} />
            <RegBox label="Q" bits={bin(state.Q)} color="#a78bfa" note={`${toSigned8(state.Q)}`} />
            <RegBox label="Q₋₁" bits={String(state.q1)} color="#34d399" note={t("last out")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <RegBox label="B" bits={bin(b & 0xff)} color="#fbbf24" note={`${b}`} />
            <RegBox label="SC" bits={String(8 - pos)} color="#fb7185" note={t("steps left")} />
          </div>
          <div className="rounded-xl border border-line bg-bg/50 px-3.5 py-3 text-xs leading-relaxed">
            {done ? (
              <span className="text-good">{t("Done — 8 steps. Product is in A‖Q.")}</span>
            ) : next ? (
              <>
                <span className="text-dim">{t("Next: look at Q₀Q₋₁ =")}</span>{" "}
                <span className="font-mono font-bold text-ink">{next.pair}</span>
                <span className="text-dim"> → </span>
                <span className={cn("font-semibold", next.kind === "add" ? "text-good" : next.kind === "sub" ? "text-bad" : "text-dim")}>
                  {next.kind === "add" ? "A ← A + B" : next.kind === "sub" ? "A ← A − B" : t("no add")}
                </span>
                <span className="text-dim">, {t("then shift right one place.")}</span>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" color="#22d3ee" onClick={() => setPos(Math.min(8, pos + 1))} disabled={done}>
              {t("Step ▸")}
            </Button>
            <Button onClick={() => setPos(Math.max(0, pos - 1))} disabled={pos === 0}>
              {t("◂ Back")}
            </Button>
            <Button
              onClick={() => setPlaying((v) => !v)}
              active={playing}
              disabled={done && !playing}
            >
              {playing ? t("‖ Pause") : done ? t("Done") : t("▶ Play")}
            </Button>
            <Button onClick={() => { setPos(0); setPlaying(false); }}>{t("↺ Reset")}</Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("Product (A‖Q)")} value={productOk ? trueProduct : "≠"} color={productOk ? "#34d399" : "#fb7185"} sub={bin(product & 0xffff, 16)} />
            <Stat label={t("True product")} value={`${b} × ${q} = ${trueProduct}`} sub={productOk ? t("Booth agrees ✓") : t("mismatch")} color={productOk ? undefined : "#fb7185"} />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-bg/40 p-3.5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Trace — one row per cycle")}</div>
          <table className="w-full text-start font-mono text-[11px]" dir="ltr">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-dim">
                <th className="py-1 pe-2 font-semibold">#</th>
                <th className="py-1 pe-2 font-semibold">Q₀Q₋₁</th>
                <th className="py-1 pe-2 font-semibold">{t("op")}</th>
                <th className="py-1 pe-2 font-semibold">A</th>
                <th className="py-1 pe-2 font-semibold">Q</th>
                <th className="py-1 font-semibold">SC</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => {
                const s = steps[i];
                const seen = i < pos;
                const isCur = i === pos - 1;
                return (
                  <tr
                    key={i}
                    className={cn("border-t border-line/50 transition-colors", isCur && "bg-white/[0.06]", !seen && "opacity-30")}
                  >
                    <td className="py-1.5 pe-2 text-dim">{i + 1}</td>
                    <td className="py-1.5 pe-2 text-mute">{s.pair}</td>
                    <td className={cn("py-1.5 pe-2 font-bold", s.kind === "add" ? "text-good" : s.kind === "sub" ? "text-bad" : "text-dim")}>
                      {s.kind === "add" ? "+B" : s.kind === "sub" ? "−B" : "·"}
                    </td>
                    <td className="py-1.5 pe-2 text-ink">{seen ? bin(s.a & 0x1ff, 9) : "· · · ·"}</td>
                    <td className="py-1.5 pe-2 text-mute">{seen ? bin(s.q) : "· · · ·"}</td>
                    <td className="py-1.5 text-dim">{8 - i - 1}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2.5 text-[11px] leading-relaxed text-dim">
            {t("Each row is after the add/subtract and the arithmetic shift. Watch Q empty from the right while the product fills A‖Q; Q₋₁ remembers the bit that just fell out.")}
          </p>
        </div>
      </div>

      <Callout title={t("Why hardware likes Booth")} tone="idea">
        {t("Worst case is the same 8 operations, but typical operands win big:")} {bin(15)}{" "}
        {t("has a single run of 1s → one +B and one −B instead of four additions.")} {t("Real multipliers go further —")}{" "}
        <Tag color="#22d3ee">{t("radix-4 Booth")}</Tag>{" "}
        {t("examines two multiplier bits at a time and halves the cycles. This is exactly the circuit inside the ALU the CPU module executes.")}
      </Callout>
    </Panel>
  );
}
