import type { CSSProperties, ReactNode } from "react";
import { cn } from "../utils/cn";
import { useLang } from "../lib/i18n";
import type { ModuleMeta } from "../lib/theme";

/* ───────────── Layout primitives ───────────── */

export function ModuleHeader({ mod, children }: { mod: ModuleMeta; children?: ReactNode }) {
  const { t } = useLang();
  return (
    <header className="rise-in mb-10">
      <div className="mb-3 flex items-center gap-3">
        <span
          className={cn("rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tracking-widest", mod.text, mod.border, mod.bgSoft)}
        >
          {t("MODULE")} {mod.num}
        </span>
        <span className="text-xs uppercase tracking-widest text-dim">{t(mod.question)}</span>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t(mod.title)}</h1>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-mute sm:text-lg">{children ?? t(mod.tagline)}</p>
    </header>
  );
}

export function Section({
  id,
  num,
  title,
  lead,
  mod,
  children,
}: {
  id?: string;
  num: string;
  title: ReactNode;
  lead?: ReactNode;
  mod: ModuleMeta;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-14 scroll-mt-24">
      <div className="mb-5 flex items-baseline gap-3">
        <span className={cn("font-mono text-sm font-semibold", mod.text)}>{num}</span>
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h2>
      </div>
      {lead && <div className="mb-6 max-w-3xl text-[15px] leading-relaxed text-mute">{lead}</div>}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function Panel({
  title,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface/80 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] backdrop-blur", className)}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-mute">{title}</div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </div>
  );
}

export function Callout({
  title,
  children,
  tone = "idea",
}: {
  title: ReactNode;
  children: ReactNode;
  tone?: "idea" | "warn" | "note";
}) {
  const tones = {
    idea: "border-cpu/30 bg-cpu/[0.07] [--t:#a78bfa]",
    warn: "border-mem/30 bg-mem/[0.07] [--t:#fbbf24]",
    note: "border-logic/30 bg-logic/[0.07] [--t:#22d3ee]",
  } as const;
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed text-mute", tones[tone])}>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--t)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ───────────── Controls ───────────── */

export function Button({
  children,
  onClick,
  variant = "subtle",
  disabled,
  className,
  title,
  active,
  color,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "subtle" | "ghost";
  disabled?: boolean;
  className?: string;
  title?: string;
  active?: boolean;
  color?: string;
}) {
  const style: CSSProperties | undefined =
    variant === "primary" && color ? { backgroundColor: color, color: "#06101c" } : undefined;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={cn(
        "inline-flex select-none items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-[0.97]",
        variant === "primary" && !color && "bg-ink text-bg hover:bg-white",
        variant === "primary" && color && "hover:brightness-110",
        variant === "subtle" && "border border-line bg-raised text-ink hover:border-dim hover:bg-[#1a2547]",
        variant === "ghost" && "text-mute hover:bg-white/5 hover:text-ink",
        active && "border-ink/60 bg-white/10",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Switch({
  on,
  onChange,
  label,
  hint,
  color = "#34d399",
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="group flex items-center gap-3 text-start"
    >
      <span
        className="relative inline-block h-6 w-11 shrink-0 rounded-full border border-line transition-colors duration-200"
        style={{ backgroundColor: on ? color : "#1a2547" }}
      >
        <span
          className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all duration-200"
          style={{ left: on ? 22 : 2 }}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-dim">{hint}</span>}
      </span>
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  color = "#e8ecfb",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap rounded-lg border border-line bg-bg/60 p-0.5", className)}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 sm:text-[13px]",
              sel ? "text-bg shadow" : "text-mute hover:text-ink",
            )}
            style={sel ? { backgroundColor: color } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  color = "#22d3ee",
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  color?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-medium text-mute">{label}</span>
        <span className="font-mono font-semibold text-ink">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--thumb": color } as CSSProperties}
      />
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
  color,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-line bg-bg/50 px-3.5 py-3", className)}>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums transition-colors" style={{ color: color ?? "#e8ecfb" }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-dim">{sub}</div>}
    </div>
  );
}

export function Tag({ children, color = "#98a4cb", className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold", className)}
      style={{ color, borderColor: color + "55", backgroundColor: color + "14" }}
    >
      {children}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-white/5 px-1 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
}

/* ───────────── Small helpers ───────────── */

export const hex = (n: number, digits = 2) => n.toString(16).toUpperCase().padStart(digits, "0");
export const bin = (n: number, digits = 8) => n.toString(2).padStart(digits, "0");
