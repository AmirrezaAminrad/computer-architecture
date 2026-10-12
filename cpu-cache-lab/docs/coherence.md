# Stage 5 — Coherence: MSI, MESI, and the false-sharing tax

*Simulator: `simulator/coherence.py` (atomic serialized bus, block-granular
write-back caches, values tracked so every read is verified against the
latest write; invariants checked after every operation). Real-machine
benchmark: `benchmarks/false_sharing.cpp`. Results: `results/coherence.csv`,
`results/false_sharing.csv`, figures `results/coherence.png`. All numbers
below are from this machine (4 cores / 200 iterations for the simulator;
12 threads / 5M increments for the real benchmark).*

## What are we simulating?

Several cores each cache whole **blocks** (cache lines) and read/write them;
an atomic bus serializes every transaction and all caches snoop it. MSI and
MESI are implemented with their transitions written out explicitly:

- **MSI**: `I --BusRd--> S`, `I --BusRdX--> M`, `S --BusUpgr--> M`; the M
  holder flushes (writeback + cache-to-cache) whenever another core asks.
- **MESI** adds **E**: a cold read with *no other copy* loads E silently,
  and writing an E line is **silent** (E→M, no bus op) — the private-data
  optimization. E supplies data cache-to-cache without touching memory.

Because the caches are block-granular, "two counters 8 bytes apart" and
"two counters 64 bytes apart" are *different programs* to this simulator —
which is precisely the point.

## Why does it matter?

Every core in a multicore CPU has private caches; without a protocol, two
cores could hold different values for the same address. The protocol's cost
is invisible in single-threaded code and dominant in badly laid-out
multithreaded code — the false-sharing experiment below is the single most
practical lesson in this lab for writing parallel programs.

## What should I expect, and what did we get?

| workload | MSI bus ops | MESI bus ops | invalidations | reading |
|---|---|---|---|---|
| private counters | 8 | **4** | 0 | MESI halves it: cold read loads E, the write is silent |
| **adjacent counters** | 1600 | 1599 | **799** | false sharing: every write invalidates 3 sharers |
| **padded counters** | 8 | 4 | **0** | same code, `alignas(64)` layout: no sharing |
| read-only shared | 4 | 4 | 0 | 1 c2c in MESI (E→S), then everyone hits in S |
| producer–consumer | 400 | 400 | 199 | ownership ping-pongs: 2 bus ops per message |
| TAS lock | 1799 | 1799 | 999 | every failed spin is a BusRdX — the bus storm |
| TTAS lock | 1199 | 1199 | 799 | spinners read locally in S; only real attempts hit the bus |

- **False sharing, simulated**: adjacent vs padded counters is the same
  program with a different layout — **200× the bus traffic** and 799
  invalidations vs 0. (The simulator counts block-granularity effects; the
  real-hardware benchmark below shows the same phenomenon as wall-clock
  time.)
- **MESI's win is exactly where it should be**: private data (read-then-
  written by one core) costs half of MSI, because of the silent E→M.
  For genuinely shared blocks, MESI ≈ MSI.
- **TAS vs TTAS**: the storm signature is in the exclusive operations —
  TAS issues 201 BusRdX (one per failed spin), TTAS exactly **1**. TTAS
  spinners sit in S reading locally; total transactions differ 1.5×, and
  the gap grows with spin length (each TTAS spin adds zero traffic).

## The real machine: 22.9× from one `alignas(64)`

`benchmarks/false_sharing.cpp`: 12 threads each `fetch_add` their own
atomic counter 5M times.

- adjacent (8 B apart, up to 8 counters per line): **1.126 s**
- padded (`alignas(64)`, one line each): **0.049 s**
- **speedup: 22.9×**

The correctness check (each counter must equal exactly its own increment
count) passed in both layouts — the difference is purely coherence traffic,
which is invisible to a single-threaded profile. On WSL/Linux you can watch
it directly: `perf c2c record/report` attributes HITM (hit-modified) loads
to the false-sharing lines; `perf` is not available on native Windows, so
here the evidence is the timing — which is unambiguous.

## What could make the result inaccurate?

1. **The atomic bus is a simplification**: real CPUs use point-to-point
   interconnects with snoop filters and multiple outstanding transactions;
   the serialized-bus latencies here are structural, not cycle-accurate.
2. **Infinite caches**: cores never evict except via invalidation —
   capacity effects are out of scope (Stage 4 covers those).
3. **The workload interleaving is deterministic** (the bus serializes; the
   TAS/TTAS rounds give each holder a fixed critical section) — real
   contention schedules arbitrarily; the *ratios* (adjacent/padded,
   TAS/TTAS) are the robust signal.
4. **The real benchmark**: hyperthread siblings share a physical core's
   cache, so "12 threads" is 8 physical cores' worth of L1s — the 22.9×
   already includes that; `--threads 8` isolates it.
5. **`fetch_add` with relaxed ordering** is deliberately minimal; stronger
   orderings would add fences and blur the layout comparison.

## How does this connect to the roofline?

Coherence explains why *multithreaded* speedups disappoint when data is
shared at line granularity; the roofline (next) explains why even
single-threaded speedups saturate — both are about the same resource:
bytes moved per unit of useful work.

---

*Interactive companion: ArchLab memory module §3.5 plays the MSI/MESI state
machine and the false-sharing layout, with the measured 22.9×
(`#/memory`).*
