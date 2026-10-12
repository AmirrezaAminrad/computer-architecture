# Stage 4 — The cache simulator: predictions that land on the measurements

*Everything here is simulated (stdlib Python, no dependencies) from traces of
real access patterns; the hardware context comes from the *detected* caches
in `results/machine.json`. The study's output is `results/simulator.csv`
(46 runs) and `results/simulator.png`.*

## What are we simulating?

`simulator/cache.py` models a cache from four knobs — size, line size,
associativity, replacement (LRU/FIFO/random) — plus write behavior
(write-back vs write-through, write-allocate vs no-write-allocate). On top:

- **Multi-level**: L1→L2→memory with per-level configs and the *recursive*
  AMAT, `AMAT_i = t_i + miss_rate_i × AMAT_{i+1}` (ending at memory time) —
  not a hard-coded two-level formula.
- **Degree-1 next-line prefetcher**: after every access, insert the
  successor line. Prefetched lines can evict useful data — that is how
  prefetching hurts.
- **Miss classification**: a miss is *compulsory* if the block was never
  touched in this trace; otherwise the request is replayed against a shadow
  fully-associative cache of the same capacity — shadow hit ⇒ *conflict*,
  shadow miss ⇒ *capacity*.

Traces come from `workloads/` as plain `R 0x…` / `W 0x…` files: sequential,
strided, seeded-random, and — for matmul — the **exact access streams** of
the two loop orders from Stage 3 (full matrix at n=48, and one C row at
n=1024 where the naive kernel's B-column working set is 64 KiB against a
48 KiB L1d).

## Why does it matter?

A simulator is a cheap place to ask "what if the cache were bigger / the
loop order different / a prefetcher existed?" — but only if the simulator
agrees with the hardware. This stage's whole point is that agreement:

## What should I expect, and what did we get?

1. **The staircase, simulated.** Cyclic sweeps over working-set windows
   against the three *detected* geometries: hit rate ~0.98 until the window
   outgrows the cache, then a cliff. The cliffs land **exactly at the
   detected capacities**: 48 KiB (L1d) between windows 32K→64K, 1.25 MiB
   (L2) between 1M→2M, 12 MiB (L3) between 8M→16M. Two independent
   instruments — the Stage-1 latency staircase and this simulator — place
   the hierarchy at the same capacities. The L3 curve also shows the honest
   subtlety: its decline is *gradual* (0.94 at 2 MiB → 0.88 at 4 MiB → 0.75
   at 8 MiB) because LRU keeps *parts* of a too-big window.
2. **The prefetcher, honestly.** Sequential: miss rate 1.0 → **0.0**
   (131k prefetches, every next line covered). Stride 128: miss rate 1.0 →
   1.0 — the prefetcher fetches the line you skipped, every time. Random:
   0.9995 → 0.9996 — pure waste (499,770 prefetches for 2 extra hits).
   A degree-1 next-line prefetcher is free only when your stride ≤ one line.
3. **Loop orders, predicted.** One C row at n=1024: ijk hits L1 49.9% of the
   time (B's column is a 64 KiB rotating window against a 48 KiB L1d) and
   ikj hits 95.8% (three sequential streams). Two-level AMAT: **56.1 ns vs
   5.6 ns** — a 10× prediction of exactly the 15× gap measured between
   matmul rung 0 and rung 1 on the real CPU.

## What does the graph mean?

- Panel 1 cliffs *are* the cache capacities, recovered from access patterns
  alone — the same conclusion as Stage 1's latency staircase, from a model
  that knows nothing about latency.
- Panel 2's bars are the prefetcher's contract: it converts sequential
  streams into hits and does nothing (or wastes bandwidth) otherwise.
- Panel 3 is the bridge to Stage 3: the simulator's AMAT ratio (10×)
  predicted the measured GFLOP/s ratio (15×) before either kernel was run.

## What could make the result inaccurate?

1. **Miss-classification limits (important).** The shadow fully-associative
   cache shares the main cache's replacement policy, so pathological LRU
   behavior (cyclic patterns just over capacity) can be billed to either
   bucket. The classes are *per trace*, not properties of the program. And
   the shadow holds every unique block — memory-heavy for huge traces.
2. **The multi-level model is a simplification**: no inclusion enforcement,
   no back-invalidation, and an L1 dirty eviction is modeled as one L2
   access rather than a separate write. AMAT assumes every access starts at
   L1 (true for this lab's kernels; not for prefetches or TLB walks).
3. **Hit times are inputs** (1/10/100 ns by default; the detected *sizes*
   are used, but latencies are always measured separately in Stages 1–2).
4. **Cold-start**: the first pass of every window sweep is compulsory
   misses; with few passes they drag the hit rate down (visible at the L3
   curve's left edge: 0.98 not 1.00).
5. **Python simulator speed**: ~500k accesses/second — traces are capped so
   studies stay interactive; the full n=1024 matrix stream would be 3·10⁹
   accesses.

## How does this connect to the next stage?

The simulator models one core's cache. Stage 5 asks what happens when
*two* cores' caches share the same data: MSI/MESI coherence over a bus, and
the false-sharing benchmark that shows why `alignas(64)` is not decoration.
