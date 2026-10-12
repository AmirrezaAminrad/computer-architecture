import assert from "node:assert/strict";
import { test } from "node:test";
import { quineMcCluskey, termOf } from "./qm.ts";

const want = (...terms: string[]) => terms.sort().join(" + ");
const sop = (n: number, ones: number[]) => want(...quineMcCluskey(n, new Set(ones)).cover.map((t) => termOf(t.bits)));

test("textbook examples", () => {
  assert.equal(sop(3, [0, 3, 4]), want("A′BC", "B′C′"));
  assert.equal(sop(4, [0, 2, 8, 10]), want("B′D′")); // four corners wrap into one term
  assert.equal(sop(4, [3, 9, 12]), want("A′B′CD", "AB′C′D", "ABC′D′")); // nothing merges
  assert.equal(sop(4, [4, 8, 10, 11, 12, 15]), want("BC′D′", "ACD", "AB′D′"));
});

test("constants", () => {
  assert.equal(sop(3, []), "");
  assert.equal(sop(3, [0, 1, 2, 3, 4, 5, 6, 7]), "1");
});

test("cyclic cover needs Petrick, not just essential primes", () => {
  // Σm(0,1,2,5,6,7): six primes, none essential, minimum cover is 3 terms.
  const r = quineMcCluskey(3, new Set([0, 1, 2, 5, 6, 7]));
  assert.equal(r.primes.length, 6);
  assert.equal(r.essential.length, 0);
  assert.equal(r.cover.length, 3);
});

/** Independent oracle: implicants straight from the definition, no merging. */
function oracle(n: number, ones: Set<number>) {
  const cubes: { mask: number; val: number; ms: number[] }[] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    for (let val = 0; val < 1 << n; val++) {
      if (val & ~mask) continue; // val only on fixed bits
      const ms = Array.from({ length: 1 << n }, (_, m) => m).filter((m) => (m & mask) === val);
      if (ms.every((m) => ones.has(m))) cubes.push({ mask, val, ms });
    }
  }
  const primes = cubes.filter((c) => !cubes.some((d) => d !== c && d.ms.length > c.ms.length && c.ms.every((m) => d.ms.includes(m))));
  let min = ones.size ? Infinity : 0;
  const go = (from: number, left: Set<number>, used: number) => {
    if (used >= min) return;
    if (!left.size) return void (min = used);
    for (let i = from; i < primes.length; i++) {
      const rest = new Set([...left].filter((m) => !primes[i].ms.includes(m)));
      if (rest.size < left.size) go(i + 1, rest, used + 1);
    }
  };
  go(0, new Set(ones), 0);
  return { primes: primes.map((p) => p.ms.join()).sort(), min };
}

test("matches an independent oracle on every 3-variable and a sweep of 4-variable functions", () => {
  for (const [n, step] of [[3, 1], [4, 7]] as const) {
    for (let f = 0; f < 1 << (1 << n); f += step) {
      const ones = new Set(Array.from({ length: 1 << n }, (_, m) => m).filter((m) => (f >> m) & 1));
      const r = quineMcCluskey(n, ones);
      const o = oracle(n, ones);
      assert.deepEqual(r.primes.map((p) => p.ms.join()).sort(), o.primes, `primes n=${n} f=${f}`);
      assert.equal(r.cover.length, o.min, `cover size n=${n} f=${f}`);
      // cover is valid: exactly the function's minterms, nothing extra
      assert.deepEqual([...new Set(r.cover.flatMap((t) => t.ms))].sort((a, b) => a - b), [...ones].sort((a, b) => a - b), `coverage n=${n} f=${f}`);
    }
  }
});
