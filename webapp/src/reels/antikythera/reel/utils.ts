// Shared helpers for the reel: math, easing, colour, typography.

export const W = 1920;
export const H = 1080;
export const CX = W / 2;
export const CY = H / 2;
export const TAU = Math.PI * 2;
export const DURATION = 15;
export const FPS = 30;

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** progress of t between a and b, clamped 0..1 */
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const E = {
  lin: (t: number) => t,
  in2: (t: number) => t * t,
  inCubic: (t: number) => t * t * t,
  out2: (t: number) => 1 - (1 - t) * (1 - t),
  out3: (t: number) => 1 - Math.pow(1 - t, 3),
  out4: (t: number) => 1 - Math.pow(1 - t, 4),
  inOut3: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t: number, s = 1.70158) => {
    const c3 = s + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const COL = {
  bg: "#04070b",
  ink: "#0a1218",
  bronze: "#c8873a",
  deepBronze: "#6b4219",
  gold: "#f0b95a",
  hot: "#ffe2a3",
  verdigris: "#4fd1b5",
  teal: "#0b2a33",
  cream: "#f4ead2",
  rust: "#ff6a3d",
};

export function rgba(hex: string, a = 1) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const F = {
  disp: '"Anton", "Impact", "Arial Narrow", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
  serif: '"EB Garamond", Georgia, "Times New Roman", serif',
};

export type Ctx = CanvasRenderingContext2D;

/** Letter-spaced text (manual tracking so it works in every browser). Returns width. */
export function spaced(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  sp: number,
  align: "left" | "center" | "right" = "left"
) {
  const chars = [...s];
  const ws = chars.map((ch) => ctx.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * Math.max(0, chars.length - 1);
  let sx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], sx, y);
    sx += ws[i] + sp;
  }
  ctx.textAlign = prev;
  return total;
}

export function spacedWidth(ctx: Ctx, s: string, sp: number) {
  const chars = [...s];
  return chars.reduce((a, ch) => a + ctx.measureText(ch).width, 0) + sp * Math.max(0, chars.length - 1);
}

/** Text revealed through a mask: slides up into place (pin 0..1), slides out upward (pout 0..1). */
export function maskedText(
  ctx: Ctx,
  draw: () => void,
  x: number,
  baseY: number,
  size: number,
  w: number,
  pin: number,
  pout = 0
) {
  if (pin <= 0 || pout >= 1) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 20, baseY - size * 1.02, w + 40, size * 1.22);
  ctx.clip();
  const dy = (1 - E.outExpo(pin)) * size * 1.15 - E.inCubic(pout) * size * 1.15;
  ctx.translate(0, dy);
  draw();
  ctx.restore();
}

/** Simple value-noise-ish smooth function from summed sines (deterministic). */
export function wob(a: number, seed = 0) {
  return (
    Math.sin(a * 3 + seed) * 0.5 +
    Math.sin(a * 5 + seed * 2.1) * 0.3 +
    Math.sin(a * 9 + seed * 0.7) * 0.2
  );
}

export function pad(n: number, w = 2) {
  return String(Math.floor(n)).padStart(w, "0");
}

/** Hit moments (seconds) that trigger shake / glitch / audio accents. */
export const HITS = [2.7, 5.2, 8.0, 12.35, 13.45];

export const CHAPTERS = [
  { t: 0, label: "01 ABYSS" },
  { t: 2.7, label: "02 AWAKENING" },
  { t: 5.2, label: "03 MECHANISM" },
  { t: 8.0, label: "04 THE DIAL" },
  { t: 11.0, label: "05 ECLIPSE" },
  { t: 13.45, label: "06 TITLE" },
];
