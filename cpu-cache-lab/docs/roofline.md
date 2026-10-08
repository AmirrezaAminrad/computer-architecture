# Stage 5 — The roofline: where every matmul rung sits, and why

*Figure: `results/roofline.png`; points and ceilings: `results/roofline.csv`.
Ceilings are MEASURED on this machine (not spec sheets): peak 22.22 GFLOP/s
= the best matmul rung; bandwidth 9.61 GB/s = the best streaming rate from
the Stage-2 stride benchmark. Both are overridable
(`--peak-flops / --bandwidth`) for spec-style numbers.*

## What are we plotting?

The roofline is the machine's contract: at arithmetic intensity
`AI = FLOPs / bytes moved from memory`, attainable performance is
`min(peak FLOP/s, bandwidth × AI)`. Log-log axes turn that into a slope
(memory-bound region) meeting a ceiling (compute-bound region), with the
**ridge point** at `AI = peak / bandwidth = 22.22 / 9.61 ≈ 2.3 FLOP/byte`
on this machine.

Each matmul rung is placed at `(analytic AI, measured GFLOP/s)`. The AI
formulas (documented in `scripts/roofline.py`) estimate DRAM traffic per
rung, e.g. naive's B-column walk moves ~8·N³ bytes (one line per 8 MACs)
→ AI ≈ 0.25; a perfectly blocked kernel moves ~3·N²·8 bytes → AI ≈ N/12.

## Why does it matter?

One picture answers "what's the most more optimization can buy?": a point
on the *slope* is limited by memory (better locality pays linearly); a
point on the *ceiling* is limited by compute or kernel quality (locality
work is finished; only better instruction-level code helps).

## What does the figure show for our ladder?

- **Rung 0 (naive) sits far left and far BELOW the roof** (AI ≈ 0.25, roof
  ≈ 2.4 GFLOP/s, measured 0.70). Two compounding reasons: low intensity
  *and* it cannot even saturate the bandwidth — the B-column walk is a
  chain of dependent misses (Stage 1's ~100 ns latency per cold line), the
  very thing the basic roofline does not model. Latency-bound, not
  bandwidth-bound.
- **Rungs 1/3 (ikj, vectorized) share naive's analytic AI (~0.25) yet
  measure 15× faster.** The roofline's blind spot, stated plainly: the
  model counts the same bytes for both, but ikj's sequential streams
  *overlap* their misses (Stage-2's latency vs throughput lesson) — same
  AI, completely different ability to use the bandwidth. The basic roofline
  cannot see this; only the microbenchmarks can.
- **Rungs 2/4/5 (tiled, blocked, OpenMP) sit at high analytic AI (8–21),
  approaching the measured ceiling** (17.1 → 22.2 of a 22.2 peak): the
  optimization ladder's job was to move the kernel from the memory slope
  to the ceiling, and it did. The remaining gap between blocked (17.3) and
  the OpenMP point (22.2) is parallelism; the gap from 22.2 to a real
  BLAS/peak-spec number is kernel quality (bigger register blocks, A
  packing, better scheduling) — future work, honestly labeled.

## What could make the result inaccurate?

1. **The AI values are analytic estimates** with documented formulas — real
   DRAM traffic depends on cache replacement and prefetching. The vertical
   gaps are indicative; treat the *side of the ridge* as the signal.
2. **The peak is an observed ceiling** (best rung), not the CPU's spec
   peak: the true compute ceiling is higher, so "compute-bound" here means
   "limited by this kernel family's quality, not by memory". Override with
   `--peak-flops` for a spec-style roof.
3. **The bandwidth proxy** is a single-core streaming rate (9.61 GB/s);
   multithreaded rungs can draw more total bandwidth — another reason the
   OpenMP point sits *at* the measured peak rather than under a bandwidth
   roof.
4. **N=1024 only**: the points are one operating point of each kernel; at
   larger N the blocked rungs' AI rises (traffic ~N² vs flops ~N³).

## How does this connect to the whole lab?

Every earlier stage built one ingredient of this figure: Stage 1 measured
memory latency, Stage 2 measured the line size and streaming bandwidth,
Stage 3 supplied the kernels and their GFLOP/s, Stage 4's simulator
explained the traffic models. The roofline is where the lab's measurements
converge into a single design tool.
