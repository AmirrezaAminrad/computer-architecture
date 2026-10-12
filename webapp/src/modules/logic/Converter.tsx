import { useState } from "react";
import { Button, Callout, Panel, Segmented } from "../../components/ui";
import { cn } from "../../utils/cn";
import { useLang } from "../../lib/i18n";

type Base = "bin" | "dec" | "hex";

function parseField(base: Base, raw: string, width: number): { ok: true; value: number } | { ok: false; key: string; p?: Record<string, string | number> } {
  let s = raw.replace(/[\s_]/g, "");
  const full = Math.pow(2, width);
  if (s === "") return { ok: true, value: 0 };
  if (base === "bin") {
    s = s.replace(/^0b/i, "");
    if (!/^[01]+$/.test(s)) return { ok: false, key: "Binary digits are only 0 and 1." };
    const v = parseInt(s, 2);
    if (v >= full) return { ok: false, key: "Needs more than {w} bits.", p: { w: width } };
    return { ok: true, value: v };
  }
  if (base === "hex") {
    s = s.replace(/^0x/i, "");
    if (!/^[0-9a-f]+$/i.test(s)) return { ok: false, key: "Hex digits are 0–9 and A–F." };
    const v = parseInt(s, 16);
    if (v >= full) return { ok: false, key: "Exceeds {w}-bit range (max {max}).", p: { w: width, max: `0x${(full - 1).toString(16).toUpperCase()}` } };
    return { ok: true, value: v };
  }
  if (!/^-?\d+$/.test(s)) return { ok: false, key: "Decimal digits are 0–9 (a leading − means two's complement)." };
  const n = parseInt(s, 10);
  if (n < 0) {
    if (n < -full / 2) return { ok: false, key: "Below the signed minimum ({min}).", p: { min: -full / 2 } };
    return { ok: true, value: n + full };
  }
  if (n >= full) return { ok: false, key: "Exceeds {w}-bit range (max {max}).", p: { w: width, max: full - 1 } };
  return { ok: true, value: n };
}

const groupBits = (s: string) => s.replace(/(.{4})(?=.)/g, "$1 ").trim();

export function Converter() {
  const { t, ts, tf } = useLang();
  const [width, setWidth] = useState(8);
  const [value, setValue] = useState(0b10110101);
  const [edit, setEdit] = useState<{ base: Base; text: string; err?: string; p?: Record<string, string | number> } | null>(null);
  const [note, setNote] = useState<string>("Click any bit, type in any field, or try an operation below.");

  const full = Math.pow(2, width);
  const mask = full - 1;
  const signed = value >= full / 2 ? value - full : value;

  const display: Record<Base, string> = {
    bin: groupBits(value.toString(2).padStart(width, "0")),
    dec: String(value),
    hex: value.toString(16).toUpperCase().padStart(width / 4, "0"),
  };

  const onType = (base: Base, text: string) => {
    const r = parseField(base, text, width);
    if (r.ok) {
      setValue(r.value);
      setEdit({ base, text });
    } else setEdit({ base, text, err: r.key, p: r.p });
  };

  const field = (base: Base, label: string, prefix: string, sub: string) => {
    const editing = edit?.base === base;
    const rawErr = editing ? edit?.err : undefined;
    const err = rawErr ? tf(rawErr, { w: width, ...(edit?.p ?? {}) }) : undefined;
    return (
      <div>
        <label className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="font-semibold uppercase tracking-widest text-mute">{t(label)}</span>
          <span className="text-dim">{t(sub)}</span>
        </label>
        <div
          className={cn(
            "flex items-center rounded-xl border bg-bg/60 transition-colors focus-within:border-logic",
            err ? "border-bad" : "border-line",
          )}
        >
          <span className="ps-3 font-mono text-sm text-dim">{prefix}</span>
          <input
            value={editing ? edit!.text : display[base]}
            onChange={(e) => onType(base, e.target.value)}
            onBlur={() => setEdit(null)}
            spellCheck={false}
            inputMode="text"
            className="w-full bg-transparent px-2 py-2.5 font-mono text-lg tracking-wider text-ink outline-none"
            aria-label={ts(label)}
            dir="ltr"
          />
        </div>
        <div className={cn("mt-1 h-4 text-xs", err ? "text-bad" : "text-transparent")} dir="ltr">{err ?? "ok"}</div>
      </div>
    );
  };

  const applyOp = (name: string) => {
    let v = value;
    let key = "";
    let p: Record<string, string | number> = {};
    const wrapSigned = (before: number, after: number) => before >= 0 && after < 0 || before < 0 && after >= 0;
    const sgn = (x: number) => (x >= full / 2 ? x - full : x);
    switch (name) {
      case "not":
        v = ~value & mask;
        key = "NOT flips every bit (one's complement).";
        break;
      case "inc":
        v = (value + 1) & mask;
        key = value === mask ? "Unsigned overflow: all-ones + 1 wraps to 0 (carry-out is discarded)." : "Adding 1 ripples a carry through the trailing 1s.";
        if (value !== mask && wrapSigned(sgn(value), sgn(v)) && sgn(value) > 0) {
          key = "Signed overflow! +{x} + 1 becomes {y} — the sign bit flipped without a carry-out.";
          p = { x: sgn(value), y: sgn(v) };
        }
        break;
      case "dec":
        v = (value - 1) & mask;
        key = value === 0 ? "Unsigned underflow: 0 − 1 wraps to all-ones (which is −1 in two's complement)." : "Subtracting 1 borrows through the trailing 0s.";
        if (value === full / 2) {
          key = "Signed overflow! {x} − 1 wraps around to +{y}.";
          p = { x: sgn(value), y: sgn(v) };
        }
        break;
      case "shl":
        v = (value << 1) & mask;
        key = value & (full / 2) ? "Shift left ×2 — but the top bit fell off the end (overflow)." : "Shift left multiplies by 2: every bit moves up one place value.";
        break;
      case "shr":
        v = value >> 1;
        key = "Logical shift right ÷2 (floor): every bit moves down one place; a 0 enters at the top.";
        break;
      case "neg":
        v = (~value + 1) & mask;
        key = "Two's-complement negate: invert all bits, then add 1. ({x} → {y})";
        p = { x: sgn(value), y: sgn(v) };
        break;
    }
    setValue(v);
    setNote(tf(key, p) + (name === "neg" && value === full / 2 ? " " + t("Note: the most-negative number is its own negation!") : ""));
    setEdit(null);
  };

  const terms: number[] = [];
  for (let i = width - 1; i >= 0; i--) if (value & (1 << i)) terms.push(1 << i);
  const printable = width === 8 && value >= 32 && value <= 126;

  return (
    <Panel
      title={t("Base converter")}
      right={
        <Segmented
          value={width}
          onChange={(w) => {
            setWidth(w);
            setValue((v) => v & (Math.pow(2, w) - 1));
            setEdit(null);
          }}
          options={[
            { value: 4, label: t("4-bit") },
            { value: 8, label: t("8-bit") },
            { value: 16, label: t("16-bit") },
          ]}
          color="#22d3ee"
        />
      }
    >
      <div className="grid gap-x-5 gap-y-1 md:grid-cols-3">
        {field("bin", "Binary", "0b", "base 2")}
        {field("dec", "Decimal", "", "base 10")}
        {field("hex", "Hexadecimal", "0x", "base 16")}
      </div>

      {/* Bit toggles */}
      <div className="mt-2 rounded-xl border border-line bg-bg/40 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-dim">
          <span>{t("Click a bit to flip it · each bit is worth a power of two")}</span>
          <span className="hidden sm:inline">MSB → LSB</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-4">
          {Array.from({ length: width / 4 }).map((_, ni) => {
            const nib = width / 4 - 1 - ni;
            const nibVal = (value >> (nib * 4)) & 0xf;
            return (
              <div key={nib} className="flex flex-col items-center">
                <div className="flex gap-1 sm:gap-1.5">
                  {[3, 2, 1, 0].map((b) => {
                    const idx = nib * 4 + b;
                    const on = (value >> idx) & 1;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setValue(value ^ (1 << idx));
                          setEdit(null);
                          setNote(tf("Flipped bit {idx} (worth {pow}) → value {sign}{pow}.", { idx, pow: Math.pow(2, idx), sign: on ? "−" : "+" }));
                        }}
                        className={cn(
                          "flex h-12 w-9 flex-col items-center justify-center rounded-lg border font-mono transition-all duration-200 active:scale-90 sm:h-14 sm:w-11",
                          on ? "border-logic bg-logic/20 text-logic shadow-[0_0_14px_rgba(34,211,238,0.35)]" : "border-line bg-raised text-dim hover:border-dim",
                        )}
                        aria-label={tf("bit {idx} is {v}", { idx, v: on })}
                      >
                        <span className="text-lg font-bold leading-none">{on}</span>
                        <span className="mt-1 text-[9px] leading-none opacity-70">{Math.pow(2, idx)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex w-full items-center gap-1 text-[11px] text-dim">
                  <span className="h-px flex-1 bg-line" />
                  <span className="rounded bg-white/5 px-1.5 font-mono font-semibold text-mute transition-all">{nibVal.toString(16).toUpperCase()}</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-center text-[11px] text-dim">
          {t("Each group of 4 bits (a nibble) is exactly one hex digit — that's why hex exists.")}
        </div>
      </div>

      {/* Interpretations */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-bg/50 px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Unsigned")}</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-ink tabular-nums">{value}</div>
          <div className="mt-1 break-words font-mono text-xs leading-relaxed text-dim" dir="ltr">
            {terms.length ? terms.join(" + ") : "0"}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg/50 px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Signed (two's complement)")}</div>
          <div className={cn("mt-1 font-mono text-2xl font-semibold tabular-nums transition-colors", signed < 0 ? "text-bad" : "text-ink")}>{signed}</div>
          <div className="mt-1 font-mono text-xs text-dim" dir="ltr">
            {tf("range {min} … {max} · MSB = {msb}", { min: -full / 2, max: full / 2 - 1, msb: (value >> (width - 1)) & 1 })} →{" "}
            {(value >> (width - 1)) & 1 ? `${-full / 2} + ${value - full / 2}` : t("non-negative")}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg/50 px-3.5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{width === 8 ? "ASCII" : t("Bit pattern")}</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-ink">{width === 8 ? (printable ? `'${String.fromCharCode(value)}'` : t("non-printable")) : tf("{w} bits", { w: width })}</div>
          <div className="mt-1 font-mono text-xs text-dim">
            {width === 8 ? t("the same 8 bits can be a number or a character") : t("the same bits mean what the program says they mean")}
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="me-1 text-xs font-semibold uppercase tracking-widest text-dim">{t("Try")}</span>
        <Button onClick={() => applyOp("not")}>NOT (~x)</Button>
        <Button onClick={() => applyOp("inc")}>+ 1</Button>
        <Button onClick={() => applyOp("dec")}>− 1</Button>
        <Button onClick={() => applyOp("shl")}>{"<< 1"}</Button>
        <Button onClick={() => applyOp("shr")}>{">> 1"}</Button>
        <Button onClick={() => applyOp("neg")}>{t("Negate")} (~x + 1)</Button>
        <Button variant="ghost" onClick={() => { setValue(0); setEdit(null); setNote(ts("Cleared.")); }}>{t("Clear")}</Button>
      </div>
      <div className="mt-3">
        <Callout title={t("What just happened")} tone="note">
          <span key={note} className="rise-in inline-block">{t(note)}</span>
        </Callout>
      </div>
    </Panel>
  );
}
