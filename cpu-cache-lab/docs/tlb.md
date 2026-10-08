# Experiment 4 — TLB: the cost of translation

*Stage 2. Measured on the development machine (i5-1334U, pinned to logical
CPU 0, seed 42; see `results/machine_tlb.json`).*

## What are we measuring?

Every memory access is really two lookups: the cache hierarchy *and* the
page-table walk that translates virtual→physical. This benchmark touches
**exactly one cache line per page** (at a pseudo-random line inside each
page) and sweeps the number of pages from 1 to 16,384 in randomized order.

Two design points do the heavy lifting:

- **Randomized page order**: a sequential page walk looks like a stream;
  prefetching (including TLB prefetching) would hide the effect.
- **In-page offset**: with slots at page starts, every accessed line is at a
  4 KiB-multiple address — which is the L1 *set period* from the previous
  experiment. The first version of this benchmark produced a beautiful fake
  "TLB step" at 16 pages that was actually the associativity thrash. The
  pseudo-random in-page line spreads accesses across L1 sets; the touched
  data is then only `pages × 64 B` (≤ 1 MiB), which stays cache-resident for
  the entire sweep, so rises in the curve are translation costs, not cache
  misses.

`--page-size` is configurable; the default 4 KiB matches the OS's real page
size. Larger values are *simulated* pages — they change the access pattern's
density, not the MMU's granularity, and the docs say so.

## Why does it matter?

A TLB miss costs a page walk (one to four memory references). Programs that
pointer-chase across large buffers pay it on every hop even when their data
is perfectly cached. This experiment quantifies that hidden tax.

## What should I expect?

A staircase of translation-structure capacities: the L1 dTLB first (tens to
~100 entries), then the second-level TLB (typically 1–2 K entries for 4 KiB
pages), with page-walk caches smoothing the middle. Each level roughly
doubles the per-hop cost. Caveat: with 4 KiB pages, page count and buffer
size are the same variable — cache steps *want* to appear too; the in-page
offset trick plus a cache-resident touched set keeps them out of this curve.

## What does the graph mean?

Measured (median of 5 reps of ~40 ms):

| pages | buffer span | ns/hop |
|---|---|---|
| 1–90 | ≤ 360 KiB | ~1.14 (flat — data + translation both hit) |
| **128** | 512 KiB | **2.5** (step ×2.2) |
| 181–724 | 0.7–2.8 MiB | 2.7–2.8 |
| **1024** | 4 MiB | **5.1** (step ×1.8) |
| 2048 | 8 MiB | 5.8 |
| **2896** | 11.3 MiB | **10.4** (step ×1.8) |
| 16384 | 64 MiB | 14.6 |

The touched data at the last point is 16,384 × 64 B = 1 MiB — comfortably
inside the 12 MiB L3 — so the entire climb is translation. Three measured
steps (≈128, ≈1024, ≈2896 pages) correspond to the capacities of the
translation machinery (L1 dTLB, second-level TLB, page-walk caches). The
exact naming of each step would need hardware counters this machine lacks
(`perf` does not exist on Windows), so the lab reports positions and
magnitudes, not names. The headline is the shape: **translation cost can
grow an L1-hit into a ~13× L1-hit** before DRAM even enters the picture.

Note the honest correlation check: 128 pages ≈ the L1 dTLB boundary one
would expect (~96–128 entries on this core class), and the step magnitudes
(×2 each) match "one more page-table level".

## What could make the result inaccurate?

1. **Transparent/large pages**: if the OS backed the 64 MiB arena with 2 MiB
   pages, the whole curve would flatten (16,384 "pages" would span only 32
   real translations). The lab does not request large pages; if you suspect
   them, rerun with `--page-size 2M` and compare.
2. **Page-walk caches** respond to history: the randomized order keeps the
   walk pattern unpredictable, but background system activity still shifts
   steps by a few percent.
3. **Hybrid cores**: E-core TLBs are smaller; `--cpu` matters here as
   everywhere.
4. **Cache side-effects were engineered away, not measured away**: the
   in-page-offset claim ("data stays cache-resident") can be verified by
   rerunning with `--page-size 64` — the curve should flatten because the
   "pages" become lines and no translation structure is stressed.

## How does this connect to the next experiment?

Stage 1 measured how far memory is; this one measured a second axis of
"distance" — translation. Both feed the matmul stage: tiling choices must
respect *TLB reach*, not just cache capacity (that is why tile sizes stay
within a few MiB), and the next microbenchmarks (`branch`,
`instruction_latency`) turn from memory to the execution core itself.

---

*Interactive companion: ArchLab memory module §3.6 walks a load through a
TLB and page table live (`#/memory`).*
