import { useMemo, useState, type ReactNode } from "react";
import { Button, Panel, Segmented } from "../../components/ui";
import { useLang } from "../../lib/i18n";

/* ── Worked examples (from the course slides) ─────────────────────────────
   Complement is written with ′ to keep expressions monospace-safe.        */

interface Step {
  expr: string;
  law: string; // English string → also the i18n key
  note?: string;
}

const EXAMPLE_A: Step[] = [
  { expr: "f = AB + AB′C + AB′C′", law: "Start" },
  { expr: "f = A(B + B′C + B′C′)", law: "Distributive laws", note: "factor out A" },
  { expr: "f = A(B + B′(C + C′))", law: "Distributive laws", note: "factor out B′" },
  { expr: "f = A(B + B′·1)", law: "Inverse elements", note: "C + C′ = 1" },
  { expr: "f = A(B + B′)", law: "Identity elements", note: "B′·1 = B′" },
  { expr: "f = A·1", law: "Inverse elements", note: "B + B′ = 1" },
  { expr: "f = A", law: "Identity elements", note: "A·1 = A" },
];

const EXAMPLE_B: Step[] = [
  { expr: "f = AB′C′ + B′C′ + A′BC′ + AC′", law: "Start" },
  { expr: "f = B′C′ + A′BC′ + AC′", law: "Absorption", note: "AB′C′ + B′C′ = B′C′" },
  { expr: "f = C′(B′ + A′B + A)", law: "Factor common term", note: "C′ is in every term" },
  { expr: "f = C′(B′ + A + B)", law: "Simplification (A + A′B = A + B)" },
  { expr: "f = C′(A + 1)", law: "Inverse elements", note: "B + B′ = 1" },
  { expr: "f = C′", law: "Null elements", note: "A + 1 = 1" },
];

interface LawRow {
  name: string;
  and: string;
  or: string;
}

const BASIC: LawRow[] = [
  { name: "Commutative laws", and: "A·B = B·A", or: "A + B = B + A" },
  { name: "Distributive laws", and: "A·(B + C) = A·B + A·C", or: "A + B·C = (A + B)·(A + C)" },
  { name: "Identity elements", and: "1·A = A", or: "0 + A = A" },
  { name: "Inverse elements", and: "A·A′ = 0", or: "A + A′ = 1" },
];

const OTHER: LawRow[] = [
  { name: "Null elements", and: "0·A = 0", or: "1 + A = 1" },
  { name: "Idempotent laws", and: "A·A = A", or: "A + A = A" },
  { name: "Associative laws", and: "A·(B·C) = (A·B)·C", or: "A + (B + C) = (A + B) + C" },
  { name: "DeMorgan's theorem", and: "(A·B)′ = A′ + B′", or: "(A + B)′ = A′·B′" },
];

/* minterm sets (A = MSB) of the original and the simplified form — they must match */
const PROOF_A = { orig: [4, 5, 6, 7], simp: [4, 5, 6, 7] };
const PROOF_B = { orig: [0, 2, 4, 6], simp: [2, 4, 6] }; // C′ → every row with C=0

function LawTable({ title, rows }: { title: ReactNode; rows: LawRow[] }) {
  const { t } = useLang();
  return (
    <Panel title={title}>
      <table className="w-full text-[13px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-line/60 last:border-0">
              <td className="py-1.5 pe-3 align-top text-mute">{t(r.name)}</td>
              <td className="py-1.5 pe-3 font-mono text-ink" dir="ltr">{r.and}</td>
              <td className="py-1.5 font-mono text-ink" dir="ltr">{r.or}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

export function BooleanLaws() {
  const { t } = useLang();
  const [ex, setEx] = useState<"a" | "b">("a");
  const [i, setI] = useState(0);
  const steps = ex === "a" ? EXAMPLE_A : EXAMPLE_B;
  const proof = ex === "a" ? PROOF_A : PROOF_B;
  const step = steps[Math.min(i, steps.length - 1)];
  const done = i >= steps.length - 1;

  const rows = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6, 7].map((m) => {
        const bits = [m >> 2, (m >> 1) & 1, m & 1]; // A B C
        return { m, bits, o: proof.orig.includes(m), s: proof.simp.includes(m) };
      }),
    [proof],
  );

  const pickEx = (v: "a" | "b") => {
    setEx(v);
    setI(0);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title={t("Step-through simplifier")}
          right={
            <Segmented
              value={ex}
              onChange={pickEx}
              color="#fb923c"
              options={[
                { value: "a", label: t("Example a") },
                { value: "b", label: t("Example b") },
              ]}
            />
          }
        >
          <div dir="ltr" className="rounded-xl border border-line bg-bg/60 px-4 py-5 text-center">
            <div className="font-mono text-lg font-semibold text-ink sm:text-xl">{step.expr}</div>
            {i > 0 && (
              <div className="mt-2 text-[13px] font-semibold text-digital">
                {t(step.law)}
                {step.note && <span className="ms-2 font-mono text-[12px] font-normal text-dim" dir="ltr">{step.note}</span>}
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>{t("← Back")}</Button>
            <Button variant="primary" color="#fb923c" onClick={() => setI(Math.min(steps.length - 1, i + 1))} disabled={done}>
              {t("Apply law →")}
            </Button>
            <Button variant="ghost" onClick={() => setI(0)}>{t("Reset")}</Button>
            <span className="ms-auto font-mono text-xs text-dim">
              {i + 1} / {steps.length}
            </span>
          </div>
          {done && (
            <p className="mt-3 text-[13px] leading-relaxed text-mute">
              {t("Same truth table, far fewer gates — that is the whole game of Boolean simplification.")}
            </p>
          )}
        </Panel>

        <Panel title={t("Proof — every row still agrees")}>
          <table className="w-full text-center font-mono text-[13px]" dir="ltr">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-dim">
                <th className="pb-2">A</th>
                <th className="pb-2">B</th>
                <th className="pb-2">C</th>
                <th className="pb-2">{t("original")}</th>
                <th className="pb-2">{t("simplified")}</th>
                <th className="pb-2">=</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.m} className="border-t border-line/60">
                  {r.bits.map((b, k) => (
                    <td key={k} className="py-1 text-mute">{b}</td>
                  ))}
                  <td className="py-1 font-semibold" style={{ color: r.o ? "#22d3ee" : "#4a5886" }}>{r.o ? 1 : 0}</td>
                  <td className="py-1 font-semibold" style={{ color: r.s ? "#fb923c" : "#4a5886" }}>{r.s ? 1 : 0}</td>
                  <td className="py-1" style={{ color: r.o === r.s ? "#34d399" : "#fb7185" }}>✓</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <LawTable title={t("Basic postulates")} rows={BASIC} />
        <LawTable title={t("Other identities")} rows={OTHER} />
      </div>
    </div>
  );
}
