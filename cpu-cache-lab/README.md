# cpu-cache-lab

A hands-on laboratory for learning how CPU caches and memory *actually*
behave — by measuring a real machine, not by reading about one.

Everything here follows one rule: **never claim a number you did not measure.**
Cache sizes shown in plots come from OS/CPUID detection and are labeled
"detected"; every performance statement is tied to a CSV in `results/` and a
recorded build context in `results/machine*.json`. When an experiment hits a
fundamental limitation (physical cache indexing, missing OS privileges), the
lab says so instead of printing a plausible number.

---

## The story (how the lab unfolds)

1. **Measure the CPU.** A pointer-chasing benchmark walks a random cycle of
   64-byte nodes and records one dependent-load latency as the working set
   grows from 4 KiB to hundreds of MiB. This single experiment makes the
   cache hierarchy visible as latency steps. ← *done*
2. **Discover its cache hierarchy.** Five more microbenchmarks pick the
   hierarchy apart: how much one cache line buys you, where same-set
   conflicts start, what translation costs, what mispredicted branches cost,
   and the difference between instruction latency and throughput.
   ← *done*
3. **Optimize matrix multiplication.** Six rungs (naive → loop order →
   tiling → vectorization → register blocking + packing → OpenMP → BLAS),
   each justified by the measurements from stages 1–2. ← *done, measured*
4. **Build a cache simulator.** A small, readable Python simulator with LRU /
   FIFO / random replacement, write policies, multi-level AMAT, a next-line
   prefetcher, and miss classification — validated against the Stage-1/2
   measurements. ← *done, measured*
5. **Compare the simulator against real measurements.** The simulator's
   staircase cliffs land on the detected cache capacities, and its AMAT
   predicts the matmul ladder's rung-0/rung-1 gap (10× simulated, 15×
   measured). ← *done as part of stage 4's study*
6. **Build a coherence simulator.** MSI/MESI over an atomic shared bus with
   per-block caches and machine-checked invariants; seven coherence
   workloads including the false-sharing pair. ← *done, measured*
7. **Explain false sharing — for real.** A pthread/OpenMP benchmark on the
   actual machine: adjacent counters vs `alignas(64)` counters, plus a
   roofline that places every matmul rung on measured ceilings.
   ← *done, measured*

**The lab is complete: every stage of the story is built, tested, and
measured on the reference machine.**

## Interactive companion

The sibling [`webapp/`](../webapp/) ("ArchLab") explains the theory behind
these experiments interactively in the browser — memory hierarchy, cache
simulator, locality, virtual memory/TLB, MSI/MESI coherence, Booth
multiplication. `webapp/src/lib/lab-data.ts` is generated from this folder's
`results/` (`python scripts/export_lab_data.py`), so the webapp shows the same
measured numbers you see in the CSVs here. Per-experiment docs below link to
the matching ArchLab section.

## Status

| Stage | Component | Status |
|---|---|---|
| 1 | `pointer_chase` + plot + docs | **done, measured** |
| 2 | `cache_line`, `associativity`, `tlb`, `branch`, `instruction_latency` | **done, measured** |
| 3 | `matmul/` rungs 0–6 | **done, measured** |
| 4 | `simulator/` cache + traces + prefetcher + miss classes + AMAT | **done, validated** |
| 5 | `simulator/coherence.py` (MSI/MESI) + false-sharing benchmark + roofline | **done, measured** |

The table groups the story's seven steps into five build stages (story steps 4-5
are one stage; steps 6-7 are stage 5).

## Quickstart

Requirements: a C++17 compiler (g++ or clang++), GNU make, and Python 3.10+.
Plotting additionally needs `matplotlib` and `numpy`
(`pip install matplotlib numpy`); the simulators are standard-library only.

| Platform | Setup |
|---|---|
| Linux / WSL | `sudo apt install build-essential python3` |
| macOS | `xcode-select --install` (OpenMP benchmarks need `brew install libomp`) |
| Windows | MSYS2 UCRT64: `pacman -S make mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-python`; run `mingw32-make`/`make` from an MSYS2 or Git Bash shell, **not** `cmd.exe` |

```bash
make            # build every benchmark + the test binary into build/bin/
make test       # unit tests + every --self-test + simulator tests
make run        # run every benchmark with its default sweep -> results/
make plot       # regenerate every PNG in results/ from the CSVs
make help       # list targets and flags
make clean
```

Useful flags: `PORTABLE=1` (drop `-march=native`; use this on CI runners,
VMs, or non-x86), `CXX=clang++`, `PYTHON=python`.

CMake works too (same targets, `ctest` runs the self-tests):

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release   # -DLAB_PORTABLE=ON to drop -march=native
cmake --build build && ctest --test-dir build --output-on-failure
```

CI builds and tests the lab on Linux (make + CMake), Windows (MSYS2) and
runs the simulator tests on Python 3.10 and 3.12. CI checks correctness
(self-tests), never performance numbers: shared runners are far too noisy.

Each benchmark also has a documented CLI (`--help`): size bounds, reps, seed,
CPU pinning, output paths. Every run writes:

- `results/<bench>.csv` — the measurements (schemas documented per benchmark),
- `results/machine_<bench>.json` — CPU brand, detected caches, RAM, measured
  TSC frequency, compiler, flags, seed, timestamp (reproducibility context),
- `results/<bench>.png` — the annotated plot (regenerable from the CSV).

## What the measurements show (reference machine: i5-1334U — measured, not specified)

- **Memory latency staircase** (Stage 1): ~1.2 ns/hop inside the 48 KiB L1d →
  step at 64 KiB → L2/L3 climb → **~120 ns DRAM plateau beyond 32 MiB**:
  a 100× spread from one curve.
- **Cache-line size** (Stage 2): the dependent-chase stride sweep stops
  growing at exactly **64 B** (14.3 → 48.8 → 108.8 ns, then flat), matching
  the detected line size; the overlapped-throughput panel deliberately shows
  why bandwidth and latency are different animals.
- **L1 associativity = 12 ways** — measured from a same-set conflict sweep
  (jump at K = 13), agreeing with OS detection; the experiment *derives* the
  4 KiB L1 set period itself. The beyond-L1 phase documents why L2/L3
  associativity cannot be probed with virtual addresses (physical indexing).
- **Translation costs**: one line per page, randomized — flat ~1.14 ns until
  ~128 pages, then measured steps at ≈128, ≈1024, ≈2896 pages (translation
  structures), reaching 14.6 ns/hop with the touched data still fully cached.
- **Branches**: identical kernel, random data 3.59 ns/elem vs sorted
  1.07–1.11; the branchless (`cmov`) build of the same code is 0.47 ns/elem
  for *all* orders — the compiler deleted the branch (verified in the
  disassembly).
- **Latency vs throughput**: dependent 64-bit add = 1 cycle/op; 8
  independent chains → 4.4× more throughput (then register spills at 16);
  dependent mul = 3× add's latency, but its throughput saturates at
  ~1 op/cycle with one chain's worth of help — one multiply port.
- **The matmul ladder** (Stage 3, N=1024, all verified against naive at
  1.7e-13): naive `ijk` **0.70 GFLOP/s** (column-strided B = a cache-line
  miss per multiply — consistent with Stage 1's measured DRAM latency) →
  `ikj` **10.58** (15×) → tiled **17.09** (tile sweep peaks at T≈96) →
  explicit AVX2+FMA **11.11** (≈ rung 1 — the compiler had already
  auto-vectorized it; vectorization only pays once data flows) →
  4×4 register blocking + B packing **17.32** → OpenMP 12 threads **22.44**.
  BLAS is not installed on the reference machine and is recorded as `skipped`, not
  silently omitted. Full story in `docs/matmul.md`.
- **The simulator agrees with the hardware** (Stage 4): hit-rate cliffs from
  pure access traces land exactly at the detected cache capacities (48 KiB /
  1.25 MiB / 12 MiB); the degree-1 next-line prefetcher takes a sequential
  stream from miss rate 1.0 to 0.0 and does nothing for stride-128 or random;
  and the simulator's two-level AMAT for the two matmul loop orders
  (56.1 ns vs 5.6 ns — 10×) predicts the measured 15× GFLOP/s gap between
  rungs 0 and 1. Miss classification (compulsory/capacity/conflict) is
  implemented with its limitations documented. Full story in
  `docs/simulator.md`.
- **Coherence and false sharing** (Stage 5): the MSI/MESI simulator shows
  adjacent counters costing **1600 bus transactions / 799 invalidations**
  vs padded counters' **8 / 0** (identical code, different layout), MESI
  halving private-counter traffic (silent E→M), and TTAS reducing failed-
  spin `BusRdX` operations from 201 to 1. On the real machine, the same
  experiment measures a **22.9× speedup** from `alignas(64)` padding
  (12 threads, 5M increments each, correctness-checked).
- **The roofline** places the matmul rungs on measured ceilings: naive deep
  in the memory-bound region (and below the bandwidth roof — it is
  latency-bound), the optimized rungs approaching the observed 22.2 GFLOP/s
  ceiling. Full story in `docs/coherence.md` and `docs/roofline.md`.

Full guided interpretation per experiment: `docs/*.md` (what we measure, why
it matters, what to expect, how to read the graph, what can skew it, what
comes next).

## Repository layout

```text
cpu-cache-lab/
├── Makefile                # primary build (mingw32-make / GNU make, POSIX shell)
├── CMakeLists.txt          # alternative build (same targets, ctest self-tests; built in CI)
├── common/                 # shared, tested infrastructure (NOT benchmark code)
│   ├── timing.h            #   clock_gettime(CLOCK_MONOTONIC); QPC equivalent on Windows
│   ├── pinning.h           #   CPU pinning + honest "unsupported" reporting
│   ├── hints.h             #   do_not_optimize / clobber_memory (anti-DCE barriers)
│   ├── cycles.h            #   measured invariant-TSC frequency (caveats documented)
│   ├── cpu_info.{h,cpp}    #   CPU brand, cache sizes, RAM — detected, never hard-coded
│   ├── random.h            #   seeded splitmix64 (reproducible permutations)
│   ├── pointer_chase.h     #   cache-line nodes + chase kernels (shared with tests)
│   └── bench_utils.h       #   probe/repeat/warm-up harness, size parsing, CSV opening
├── benchmarks/             # one self-contained benchmark each, --self-test included
│   ├── pointer_chase.cpp   #   stage 1: latency vs working set
│   ├── cache_line.cpp      #   stage 2: stride sweep, latency + throughput modes
│   ├── associativity.cpp   #   stage 2: same-set conflicts (derives L1 geometry)
│   ├── tlb.cpp             #   stage 2: one access per page
│   ├── branch.cpp          #   stage 2: sorted vs random, branch vs cmov
│   ├── instruction_latency.cpp  # stage 2: dependent vs independent chains
│   └── false_sharing.cpp   #   stage 5: adjacent vs alignas(64) counters (OpenMP)
├── matmul/                 # stage 3: the optimization ladder (kernels.h is the reading)
│   ├── kernels.h           #   rungs 0-6 with the "why" in comments
│   ├── driver.h            #   shared CLI/timing/verification/CSV + self-test
│   ├── naive.cpp … openmp.cpp  # thin per-rung binaries
│   └── sweep.cpp           #   full ladder + tile sweep + BLAS comparison
├── tests/test_pointer_chase.cpp  # correctness tests, separate from perf code
├── simulator/              # stage 4: the Python cache simulator (stdlib only)
│   ├── cache.py            #   policies, multilevel+AMAT, prefetcher, miss classes, CLI
│   ├── trace.py            #   R/W trace format + access-pattern generators
│   ├── study.py            #   traces x geometries x prefetcher -> results/simulator.csv
│   └── tests/test_cache.py #   20 hand-verified tests (incl. the brief's example)
├── workloads/              # trace generators (sequential, strided, random, matmul)
├── traces/                 # generated trace files (regenerable, gitignored)
├── scripts/                # plot_common.py + one plotter per experiment
├── results/                # CSV + machine JSON + PNG (never stdout-only)
└── docs/                   # per-experiment interpretation guides (start at docs/README.md)
```

## Engineering rules this project follows

Reproducible (fixed seeds, recorded flags/iterations), measured-not-assumed
(cache sizes detected at runtime, TSC frequency calibrated, nothing hard-coded),
honest about the environment (missing tools are reported, not skipped; phase-C
artifacts are labeled as artifacts), warm-up + multiple repetitions with median
and min reported, correctness tests kept apart from performance runs
(`--self-test` + `tests/`), and no benchmark result is ever fabricated —
including the ones in this README.

## Environment notes (reference machine, recorded for honesty)

The checked-in `results/` were measured on one machine (Intel i5-1334U,
Windows 10). Your numbers will differ; the *shapes* (staircases, cliffs,
ratios) are what should reproduce. Rerun `make run` to measure your own.

- **Windows-native build path.** The reference results were measured natively
  on Windows 10 (MinGW g++ 14.2, UCRT64) rather than WSL. Timing uses
  `QueryPerformanceCounter` (Windows' monotonic high-resolution clock) with
  `clock_gettime(CLOCK_MONOTONIC)` used as-is on Linux/WSL; both are wrapped
  in `common/timing.h`.
- **Known toolchain quirk (worked around):** on the reference machine, g++'s default
  *dynamic* C++ runtime link fails inside collect2→ld with a silent
  `ld returned 116 exit status` (deterministic for any program touching
  libstdc++; direct `ld` invocations with identical arguments succeed). The
  Makefile therefore links with `-static-libstdc++ -static-libgcc`, which is
  portable, makes binaries self-contained, and sidesteps the bug entirely.
- **No `perf` / `lscpu` on Windows.** Both build paths (Makefile and
  `CMakeLists.txt`) are exercised by CI. `perf`, `perf c2c` and `lscpu` do not exist on Windows —
  cache topology is detected via `GetLogicalProcessorInformation` instead,
  and the TLB/translation structures are reported as *observed step
  positions* rather than named capacities.
- **WSL workflow (for later stages).** Stages that want Linux tooling
  (`perf stat`, `perf c2c`, `lscpu`, `stopo`) should run inside WSL:
  install the toolchain once with
  `wsl -d Ubuntu-24.04 -u root apt update && wsl -d Ubuntu-24.04 -u root apt install -y build-essential linux-tools-common`,
  then build and run from `/mnt/d/Productivity/Codes/Computer architecture/cpu-cache-lab`.
  The common/ layer compiles unchanged there.
- **Linux pinning.** `--cpu N` indexes the CPUs the process is *allowed* to
  use (honours cpusets/containers); an out-of-range index is reported, not
  silently ignored. macOS cannot pin threads and says so.
- **Hybrid CPU caveat.** The i5-1334U mixes P- and E-cores with different
  caches and latencies. Benchmarks pin to one core by default (`--cpu N` to
  explore); comparing pins is a legitimate experiment, not a nuisance.

## Where to go next

The lab covers the brief end to end. Natural extensions, none required:

- **WSL + `perf`**: rerun the benchmarks under Ubuntu-24.04 (see
  "Environment notes") for `perf stat` and `perf c2c` evidence next to the
  timing-based conclusions (false sharing, matmul rungs, TLB).
- **Roofline with spec ceilings**: `python scripts/roofline.py
  --peak-flops <spec> --bandwidth <spec>` overlays the lab's kernels on the
  CPU's official numbers.
- **Deeper matmul**: larger register blocks (8×4), A packing, and
  double-buffered packing pipelines are how real BLAS closes the gap
  between our 22 GFLOP/s and the CPU's true peak.
- **The coherence simulator's limits** (documented in
  `docs/coherence.md`) point at MOESI/MESIF, cache-capacity effects, and
  non-atomic real buses as natural next models.
