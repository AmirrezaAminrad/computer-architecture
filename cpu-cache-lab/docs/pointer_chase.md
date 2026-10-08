# Experiment 1 — Pointer chasing: measuring memory latency

*Stage 1 of the cpu-cache-lab. Results referenced below were measured on the
development machine (see `results/machine.json` for the exact hardware and
build context). Your numbers will differ; the *shape* of the curve will not.*

---

## What are we measuring?

The time it takes the CPU to perform **one dependent load from memory**:

```
p = p->next;   // the next address is unknown until this load returns
```

Nodes are linked into a single random cycle, each node padded to exactly one
64-byte cache line. We start with a 4 KiB working set (fits in L1) and grow it
to 256 MiB (far beyond any cache), recording the median and minimum nanoseconds
per hop at each size.

The chain is *dependent*: the CPU cannot know which address it needs next
until the previous load finishes. No out-of-order trickery, no prefetch
(parallelism of loads), no speculation can hide the latency. What you measure
is what memory actually costs you.

## Why does it matter?

Nearly all "is my program fast?" reasoning rests on the answer to "how far is
this data?" A cache miss is 50–100× more expensive than an L1 hit on real
hardware. This one experiment gives you the numbers your intuition should be
built from, and every later experiment in this lab (strided access, tiling,
false sharing) is a variation on it.

## What should I expect?

A staircase. Each step is a working set that no longer fits in one level of
the cache hierarchy and spills into the next, slower level:

| Working set | Where the data lives | Typical latency |
|---|---|---|
| ≤ L1d capacity | L1 (per core, fastest) | ~1–2 ns, a few cycles |
| ≤ L2 capacity | L2 (per core) | ~3–5× L1 |
| ≤ L3 capacity | L3 (shared between cores) | ~10–15× L1 |
| beyond L3 | DRAM | ~50–100× L1 |

The step *positions* come from the cache sizes; the step *heights* come from
the hardware's own design. Both are measured here, never assumed.

## What does the graph mean?

This is the graph produced by `scripts/plot_pointer_chase.py` on the
development machine (2026-09-29, i5-1334U, pinned to logical CPU 0, seed 42,
5 repetitions of ~40 ms each):

- **Flat ~1.15–1.2 ns plateau up to 45 KiB.** The whole working set lives in
  the 48 KiB L1 data cache detected on this CPU (`results/machine.json`,
  source: Windows `GetLogicalProcessorInformation`). ~1.2 ns ≈ 2.9 nominal
  TSC cycles — the right ballpark for an L1 hit.
- **Step ×2.9 at 64 KiB → ~3.5 ns plateau.** The working set outgrew L1d;
  most hops now miss L1 and land in L2 (detected: 1.25 MiB).
- **Rising 1.4–4 MiB (×1.8 step at 1.4 MiB → 9.5 ns, 14 ns at 2 MiB, 25 ns at
  4 MiB).** The curve starts bending exactly around the 1.25 MiB L2 boundary.
- **Step ×1.8 at 5.7 MiB → 60–103 ns, then a ~120–130 ns plateau from 32 MiB.**
  Beyond the 12 MiB L3, every hop goes to DRAM. The long climb *before* the
  plateau (5.7→32 MiB) is L3 sharing effects, replacement policy, and TLB
  misses stacking on top of cache misses.
- The green dashed line (best of 5 repetitions) tracks the median closely in
  L1/L2 but sits below it in the L3/DRAM region — variance there is real and
  expected (see pitfalls below).

Read the graph as: *the cache hierarchy is not a rumor — it is a factor of
~100 between the first plateau and the last.*

## What could make the result inaccurate?

1. **Which core you pinned to.** This CPU is hybrid (P-cores + E-cores with
   different L2 sizes and latencies). CPU 0 is one particular core; run
   `--cpu 4`, `--cpu 8`, ... and compare — different cores give measurably
   different curves. The benchmark reports what it pinned to.
2. **Frequency scaling.** The ns numbers are wall-clock truth, but the
   cycles column uses the *invariant TSC* frequency (measured here at
   2.496 GHz — that is the TSC's nominal rate, NOT the current turbo
   frequency of the core). Ratios across sizes are exact; absolute cycle
   counts carry this caveat.
3. **Transparent huge pages.** At large sizes, 4 KiB pages mean a TLB miss on
   nearly every hop; if the OS maps the buffer with huge pages the DRAM
   plateau drops noticeably. Windows Large Pages are not used here; the TLB
   benchmark in a later stage makes this effect explicit.
4. **Background load.** Anything else running shares L3, memory bandwidth,
   and the core itself. Close things; expect a few percent of noise in the
   L3/DRAM region.
5. **The random walk isn't perfectly representative.** One long cycle is the
   cleanest way to measure pure latency, but real workloads also show
   locality patterns this deliberately destroys. That is the point — but it
   means this number is a *worst case* for latency, not an average case.
6. **Iteration-count adaptation.** The benchmark picks iterations to hit a
   ~40 ms repetition budget using a probe of the same working set; the count
   is recorded in the CSV (`iterations` column) so runs stay reproducible and
   auditable.

## How does this connect to the next experiment?

You now know the *cost* of one miss at each level. The next benchmark
(`benchmarks/cache_line.cpp`, stage 2) holds the working set past-L1 and
varies the **stride** between accesses: it answers "what does one cache line
buy me?" — the sequential-access/bandwidth half of the story that latency
alone cannot tell. Together they form the two axes every memory optimization
decision is made on.

---

*Interactive companion: flip the ArchLab memory-hierarchy pyramid to
"Measured" to see these plateaus next to the textbook values — webapp module
03 §3.1 (`#/memory`).*
