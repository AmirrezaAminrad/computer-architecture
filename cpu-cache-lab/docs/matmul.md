# Stage 3 — The matmul ladder: from 0.7 to 22 GFLOP/s by fixing memory behavior

*Measured on the development machine (i5-1334U, N=1024, row-major doubles,
`results/matmul.csv` + `results/machine_matmul.json`; BLAS absent on this
machine and recorded as skipped). Medians of 3 reps, every rung verified
against the naive reference (max diff 1.7e-13 — pure summation-order noise).*

## What are we measuring?

C = A·B for 1024×1024 doubles = 2·N³ = 2.1 GFLOP of work. The *arithmetic* is
identical in every rung — only the memory behavior changes. GFLOP/s =
2·N³ / seconds / 1e9.

The ladder (each rung in `matmul/kernels.h`, with the why in comments):

| rung | idea | measured |
|---|---|---|
| 0 naive `ijk` | B walked **down its columns**: every inner-loop step is a new cache line (n·8 = 8 KiB away) for one useful double | **0.70 GFLOP/s** (3.08 s) |
| 1 `ikj` | same loops, permuted: inner loop streams along rows of B and C | **10.58** (15×) |
| 2 tiled | T×T tiles; the B tile is re-read T times from cache, not memory | **17.09** at T=96 (peak of the sweep) |
| 3 vectorized | `__restrict` + explicit 4-wide FMA (runtime-detected AVX2) | **11.11** |
| 4 reg-block + pack | 4×4 C-block in registers; B panel packed into a contiguous buffer | **17.32** |
| 5 OpenMP | rung 4, rows split across 12 threads | **22.44** |
| 6 BLAS | cblas_dgemm if present — on this machine: **skipped** (not installed) | — |

Rerun any rung standalone: `build/bin/matmul_tiled --size 1024 --tile 32`,
`matmul_openmp --threads 4`, etc. `build/bin/matmul_sweep` runs everything.

## Why each rung works (and why one doesn't)

- **Rung 1 is the giant** (15×): naive `ijk` turns every multiply into a
  DRAM-latency problem — cross-check with Stage 1: ~10⁹ column-strided
  accesses at ~3 ns each ≈ 3 s, exactly what we measured. `ikj` makes both
  streams sequential, which the prefetcher and the out-of-order core feed
  continuously.
- **Rung 3 ≈ rung 1, and that is the lesson**: disassembly shows rung 1's
  inner loop *already* contains `vfmadd231pd %ymm` — GCC runtime-versioned
  the alias check and auto-vectorized. The explicit AVX2 kernel adds almost
  nothing here because the kernel is still memory-bound on C's
  read-modify-write per k. Vectorization is not a magic "make it fast"
  button; it only pays once data flows.
- **Rung 2/4**: tiling and register blocking raise *arithmetic intensity* —
  flops per byte fetched. The 4×4 register block performs 16 FMAs per 4
  loads; packing the B panel turns its scattered per-k rows (n·8 B apart)
  into one sequential stream that L1 serves. This is Goto's BLAS idea in
  miniature.
- **Rung 5 gained only 1.3× from 12 threads** — honest observation, not a
  bug: the rung-4 kernel is already close to the memory-bandwidth ceiling of
  this laptop's single-socket memory for this C-traffic-heavy structure
  (C is read+written once per k-tile). Bigger register blocks and A-packing
  (what real BLAS does) would push further; so would a CPU whose cores share
  more bandwidth.
- **The tile sweep peaks at 96–128** (9.3 at T=8 → 17.1 at T=96 → 16.7 at
  128): too small and per-tile loop overhead dominates; too large and the
  working set (3·T²·8 B for the T×T tiles of A, B, C) outgrows L1/L2. The
  peak position ≈ where 3·T²·8 ≈ L1-L2 territory — measured, on this
  machine, at T ≈ 96 (≈220 KiB).

## Verification (why you can trust the numbers)

Every rung's C is compared element-wise against the naive reference; the
observed 1.7e-13 max difference is floating-point summation-order noise.
The self-tests run every rung on deliberately awkward sizes (n = 5, 63, 64,
65, 1 with tiles 8/16/32/48) — which is exactly how the pack-buffer sizing
bug (kt used as an end index instead of a count → heap corruption) and the
OpenMP team-size traps were caught. BLAS, when present, is verified the same
way; when absent, its row is recorded as `skipped` rather than omitted.

## What could make the result inaccurate?

1. **Pin vs threads interaction** (bitten for real during development):
   Windows worker threads inherit their creator's affinity mask. Pinning the
   main thread to one core made libgomp run the "12-thread" team entirely on
   that core, and its default team size followed the mask. The sweep now
   unpins before multithreaded rows and sizes the team from the hardware.
2. **Frequency scaling**: all rungs measured in one process, seconds apart —
   ratios are sound; absolute GFLOP/s moves a few percent with turbo state.
3. **First-touch page mapping**: matrices are written (initialized) before
   timing, so pages are committed and warm.
4. **BLAS threading**: a threaded BLAS would report under `threads=1` while
   using its own pool — the `impl` column names the library so you know.
5. **Reps=3 on a 3-second naive baseline** is a small sample; the min column
   shows the spread (here: tiny — the run is compute-stable).

## How does this connect to the next stage?

The ladder's curve (0.7 → 22 GFLOP/s) is the roofline plot come to life: each
rung moved the kernel along the memory-bound roof toward the compute ceiling.
Stage 4 makes that explicit — a Python cache simulator fed with real access
traces, AMAT, prefetcher modeling, and a roofline script that places every
rung on the machine's measured bandwidth and peak-flops axes.

---

*Interactive companion: ArchLab memory module §3.4 plots this measured
ladder next to the row/column toy demo it explains (`#/memory`).*
