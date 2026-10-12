# Experiment 3 — Associativity: how many lines can share a cache set

*Stage 2. Measured on the development machine (i5-1334U, pinned to logical
CPU 0, seed 42; see `results/machine_associativity.json`).*

## What are we measuring?

A cache is organized as `sets × ways` slots; a line's set is chosen by
address bits. If more than `ways` hot lines map to the *same set*, they evict
each other on every access even though the cache has gigabytes free.

The benchmark chases K lines spaced D bytes apart, with a seeded random cycle
(the Stage-1 trick — no prefetching, pure dependency chain):

- **Phase A**: sweep the spacing D from 64 B to 4 MiB with K = 16 fixed.
  Spacing D puts every line in the same set of any cache whose *set period*
  (`sets × line_size`) divides D. The first latency jump is therefore the L1
  set period — measured, not assumed.
- **Phase B**: with D fixed at that measured period, sweep the conflict
  count K. The K where latency jumps is `associativity + 1`.
- **Phase C**: an attempt to peel L2 the same way — and an instructive
  failure (see below).

## Why does it matter?

Associativity is why "I only use 40 KB, so I'm L1-resident" can be false: 13
hot lines landing in one set thrash a 12-way cache. It is also the mechanism
behind real, painful performance cliffs (page-offset-aligned buffers, large
hash tables) and behind the value of huge pages and index hashing.

## What should I expect?

- A jump in phase A at `sets × 64 B` of the L1 (typically 4 KiB for
  classic 64-set L1s, 2 KiB for 32-set designs — nothing is assumed).
- A jump in phase B at K = ways + 1.
- Phase C: *no* clean L2 result, for a fundamental reason covered below.

## What does the graph mean?

Measured:

- **Phase A**: flat ~1.14 ns for D ≤ 2 KiB; jump ×2.9 at **D = 4 KiB**; the
  16 lines all landed in one L1 set and started thrashing. Measured L1 set
  period = 4 KiB ⇒ 64 sets × 64 B (consistent with the detected 48 KiB
  12-way L1d).
- **Phase B**: flat ~1.13 ns for K ≤ 12; jump at **K = 13** ⇒ **measured L1
  associativity = 12 ways**. The OS reports 12 — the measurement and the
  detection agree, which is exactly the kind of cross-check this lab exists
  for.
- **Phase C** (K = 11, sweeping D beyond the L1 period): a plateau appears
  from 64 KiB onward at ~2.7 ns, and the K-sweep there jumps at K = 7–8. It
  would be wrong to read that as "L2 = 64 KiB period, 6 ways": the OS
  reports L2 = 1.25 MiB, 10-way, whose set period is 128 KiB.

## What could make the result inaccurate?

1. **The phase-C artifact (important).** L1 is VIPT with its index bits
   inside the 4 KiB page offset, so *virtual* spacing controls which L1 set
   you hit — that is why phases A/B work. Higher caches are indexed by
   **physical** address bits beyond the page offset; two virtual addresses
   D = 64 KiB apart usually live in unrelated physical frames, so their L2
   set relationship is random. The 2.7 ns plateau is partial thrashing from
   random physical-frame collisions — a real effect, but not L2's geometry.
   Reliable L2/L3 associativity measurement needs 2 MiB pages (control the
   physical mapping), which Windows only grants with a special privilege;
   the lab leaves that as future work rather than printing a wrong number.
2. **L3 is unreachable by this method even in principle**: any spacing that
   collides in L3 also collides in L1/L2 (set periods nest), so lower levels
   always thrash first.
3. **Pseudo-LRU**: the K-sweep jump position is exact for true LRU; with
   tree-PLRU a cycling pattern of exactly `ways` lines can occasionally
   evict early. The flat-to-jump transition here was sharp, so the number is
   trustworthy — on other CPUs, read the *shape* of the transition.
4. **Pinned core choice**: E-cores on this CPU have an 8-way 32 KiB L1d
   (`--cpu` to compare — phase B would jump at K = 9).

## How does this connect to the next experiment?

Associativity is one of the two "capacity-like" limits (the other is TLB
reach). The next benchmark isolates the TLB — and the docs there explain how
hard that isolation is when the cache hierarchy steps at the same page
counts.

---

*Interactive companion: ArchLab memory module §3.2 lets you reproduce
same-set conflicts on a toy cache (`#/memory`).*
