// Core constants + math/easing helpers for the motion engine

export const W = 1920;
export const H = 1080;
export const DURATION = 15;
export const BEAT = 0.5; // 120 BPM

export const COL = {
  bg: '#07080c',
  ink: '#f4f1ea',
  amber: '#ffb020',
  cyan: '#22e0ff',
  magenta: '#ff2e88',
  lime: '#b6ff3b',
  violet: '#8b5cff',
  coral: '#ff5a36',
};

export const SANS = '"Space Grotesk","Helvetica Neue",Arial,sans-serif';
export const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,monospace';

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const fract = (x: number) => x - Math.floor(x);
export const hash2 = (i: number, j: number) => fract(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453);

export const ease = {
  linear: (t: number) => t,
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
