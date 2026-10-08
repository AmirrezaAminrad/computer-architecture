# Experiment 2 — Stride sweep: finding the cache-line size

*Stage 2 of the cpu-cache-lab. Numbers below were measured on the development
machine (i5-1334U, pinned to logical CPU 0, seed 42; see
`results/machine_cache_line.json`). The *shape* generalizes; the values do not.*

## What are we measuring?

The cost of one memory access as the **stride** between accesses grows from
1 B to 256 B, in two modes over the same 32 MiB buffer (far larger than L3):

- **Latency mode** (strides ≥ 8 B): a *dependent* pointer chase whose slots
  sit `stride` bytes apart. Lines are visited in **random order** (the
  prefetcher cannot pipeline it) but within each line the slots are chained
  sequentially. A line fetched at cost L serves `64/stride` hops, so the
  per-hop cost is `(L + (64/stride − 1)·hit)/…` — rising with stride, then
  flat once a stride fills a whole line.
- **Throughput mode** (all strides): independent scalar loads `sum += buf[i]`
  over the buffer. The CPU overlaps misses (memory-level parallelism) and the
  prefetcher helps, so this measures amortized bandwidth.

The vectorization of the throughput kernel is explicitly disabled — a
compiler that widens byte loads into vector loads would silently change what
"stride" means.

## Why does it matter?

Every "sequential access is cheaper" intuition comes from the cache line: the
memory system never delivers one byte, it delivers 64. This experiment makes
the line size jump out of the data — and shows, in the same figure, why
latency and bandwidth are *different* quantities that people constantly
conflate.

## What should I expect?

- Latency mode: per-hop cost roughly proportional to stride while
  `stride < line_size`, then **flat** at the true (unprefetched) miss
  latency. The knee = the line size.
- Throughput mode: cost also grows with stride, but out-of-order execution
  overlaps misses (≈10–14 outstanding misses) and the prefetcher feeds the
  stream, so the plateau sits far *below* the latency plateau and its knee is
  blurred upward by TLB-walk amortization (fewer accesses per page) —
  on this machine it stops growing at 128 B, not 64 B.

## What does the graph mean?

Measured (median of 5 reps of ~40 ms):

| stride | latency mode | throughput mode |
|---|---|---|
| 8 B  | 14.3 ns | 0.56 ns |
| 16 B | 25.7 ns | 1.01 ns |
| 32 B | 48.8 ns | 1.86 ns |
| 64 B | 108.8 ns | 3.96 ns |
| 128 B | 112.2 ns | 5.34 ns |
| 256 B | 112.8 ns | 7.08 ns |

- The latency curve grows ×1.8–2.2 per octave up to **64 B and then stops
  dead** (112 ns at 128 and 256). The knee is exactly the detected 64 B
  cache-line size — a clean, measured confirmation.
- The latency plateau (~110 ns) matches the Stage-1 pointer-chase DRAM
  plateau (~120 ns), as it must: at stride 64 this kernel *is* the Stage-1
  chase. Two different programs agreeing on the same number is what makes
  both credible.
- The throughput panel keeps rising to ~128 B: fewer accesses per page means
  each access carries more TLB-walk amortization, and the prefetcher changes
  its behavior. This is not noise — it is the lesson that "cost per access"
  in overlapped code is a system property, not a line-size read-out.

## What could make the result inaccurate?

1. **Which core** (hybrid P/E) — as everywhere in this lab; try `--cpu`.
2. **Prefetcher strength differs between modes**: the latency mode defeats it
   by random line order; the throughput mode relies on it. Any change in
   prefetcher policy moves the throughput curve but not the latency knee.
3. **Zeroed pages**: the buffer is filled with a non-trivial pattern because
   all-zero pages can be served faster on machines with memory compression.
4. **Timer noise at small strides** (0.3 ns/access): median-of-5 mitigates;
   the min column is there for comparison.
5. **SIMD leakage**: if you rebuild without the no-vectorize attribute,
   the compiler may widen loads and shift the small-stride points.

## How does this connect to the next experiment?

The line size explains *why* 64-byte-granular structures matter — and the
latency mode at stride 64 is literally the Stage-1 chase. The next
experiment (`associativity.cpp`) zooms into the cache itself: not *how far*
data is, but *how many lines can share a home*.

---

*Interactive companion: ArchLab memory module §3.3 shows spatial locality
and block size visually (`#/memory`).*
