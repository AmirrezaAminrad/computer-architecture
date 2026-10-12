/** Quine–McCluskey minimization of a Boolean function given by its minterms. */

export interface QmTerm {
  /** One char per variable (A first): "0", "1", or "-" for a dropped variable. */
  bits: string;
  /** Minterms this term covers. */
  ms: number[];
  /** True if it could not merge into a larger term — a prime implicant. */
  prime: boolean;
}

export interface QmResult {
  /** Merge rounds: columns[0] are the minterms, columns[k] the 2ᵏ-groups. */
  columns: QmTerm[][];
  primes: QmTerm[];
  /** Primes that are the only cover of some minterm. */
  essential: QmTerm[];
  /** An exact minimum cover (fewest terms, then fewest literals). */
  cover: QmTerm[];
}

const VARS = "ABCDEFGH";
const literals = (bits: string) => [...bits].filter((c) => c !== "-").length;
const byFirst = (a: QmTerm, b: QmTerm) => a.ms[0] - b.ms[0] || (a.bits < b.bits ? -1 : 1);

/** "0-1" → "A′C"; no literals → "1". */
export const termOf = (bits: string) => [...bits].map((c, i) => (c === "-" ? "" : VARS[i] + (c === "0" ? "′" : ""))).join("") || "1";

/** Step 1: merge terms that differ in exactly one bit until nothing merges. */
function mergeColumns(n: number, ones: Set<number>): QmTerm[][] {
  let cur: QmTerm[] = [...ones].sort((a, b) => a - b).map((m) => ({ bits: m.toString(2).padStart(n, "0"), ms: [m], prime: true }));
  const columns: QmTerm[][] = [];
  while (cur.length) {
    columns.push(cur);
    const next = new Map<string, QmTerm>();
    for (const a of cur) {
      for (const b of cur) {
        const diff = [...a.bits].flatMap((c, i) => (c !== b.bits[i] ? [i] : []));
        // a "-" only matches a "-", so a differing "-" never merges
        if (diff.length !== 1 || a.bits[diff[0]] === "-" || b.bits[diff[0]] === "-") continue;
        a.prime = b.prime = false;
        const bits = a.bits.slice(0, diff[0]) + "-" + a.bits.slice(diff[0] + 1);
        if (!next.has(bits)) next.set(bits, { bits, ms: [...new Set([...a.ms, ...b.ms])].sort((x, y) => x - y), prime: true });
      }
    }
    cur = [...next.values()];
  }
  return columns;
}

/** Step 3: Petrick's method — expand ∏(sum of primes covering m) with absorption, keep the cheapest product. */
function petrick(primes: QmTerm[], left: number[]): QmTerm[] {
  let products: bigint[] = [0n];
  for (const m of left) {
    const sum = primes.flatMap((p, i) => (p.ms.includes(m) ? [1n << BigInt(i)] : []));
    const expanded = [...new Set(products.flatMap((x) => sum.map((s) => x | s)))];
    // absorption: drop any product that is a superset of another
    products = expanded.filter((x) => !expanded.some((y) => y !== x && (y & x) === y));
  }
  const pick = (mask: bigint) => primes.filter((_, i) => (mask >> BigInt(i)) & 1n);
  const cost = (ts: QmTerm[]) => ts.length * 1000 + ts.reduce((s, t) => s + literals(t.bits), 0);
  return products.map(pick).reduce((best, ts) => (cost(ts) < cost(best) ? ts : best));
}

export function quineMcCluskey(n: number, ones: Set<number>): QmResult {
  const columns = mergeColumns(n, ones);
  const primes = columns.flat().filter((t) => t.prime).sort(byFirst);

  // Step 2: prime-implicant chart — essential primes, then Petrick on whatever they leave uncovered.
  const essential = primes.filter((p) => p.ms.some((m) => primes.filter((q) => q.ms.includes(m)).length === 1));
  const left = [...ones].filter((m) => !essential.some((p) => p.ms.includes(m)));
  const rest = primes.filter((p) => !essential.includes(p));
  const cover = [...essential, ...(left.length ? petrick(rest, left) : [])].sort(byFirst);
  return { columns, primes, essential, cover };
}
