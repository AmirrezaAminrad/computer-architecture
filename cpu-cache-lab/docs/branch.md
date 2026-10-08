# Experiment 5 — Branch prediction: sorted vs random, and the cmov trap

*Stage 2. Measured on the development machine (i5-1334U, pinned to logical
CPU 0, seed 42; see `results/machine_branch.json`).*

## What are we measuring?

The cost of a data-dependent branch. One kernel, three data orders — the
same multiset of 4 Mi values in [0,1000) processed with the same threshold
(500), so only *predictability* changes:

- **random**: ~50% of branches go either way, unpredictably,
- **ascending / descending**: one long taken run, then one long not-taken
  run — the predictor learns them almost perfectly.

The hot path is `hot += x`. The cold path is a `noinline` function with a
side effect on a global — that construction matters: GCC cannot if-convert
or predicate a call with memory side effects, so a real conditional branch
is guaranteed to exist. (Disassembled, GCC 14.2 emitted
`cmp` + `jb` + `call cold_path` — a genuine branch.)

A second kernel replaces the branch with a select,
`hot += (x < t) ? x : 0`, which GCC lowered to `cmp` + `cmovb` — a
conditional move. No branch, no predictor involvement.

## Why does it matter?

Mispredictions cost 10–20 cycles *while the CPU has 200–500 cycles of
work in flight* — the pipeline flush is the single largest penalty a single
instruction can cause. And the cmov half of the experiment is the practical
lesson: the branch you *wrote* may not exist in the binary, so "my branch is
predictable" needs verification, not faith.

## What should I expect?

- Branchy kernel: random ≈ 3–5 ns/element more than sorted (≈ half the
  elements mispredict, at 10–20 cycles each, on top of ~1 ns of memory).
- Branchless kernel: identical time for all three orders — and typically
  *faster* than even the well-predicted branch, because predicted branches
  still cost fetch/redirect slots.

## What does the graph mean?

Measured (median of 5 reps of ~40 ms):

| kernel | random | ascending | descending |
|---|---|---|---|
| branch | **3.59 ns/elem** | 1.11 | 1.07 |
| branchless (cmov) | **0.47** | 0.47 | 0.47 |

- Unpredictable branches cost **3.3× more** than sorted ones — at ~50%
  mispredict rate that is ≈5 ns per mispredict ≈ the textbook 12–20 cycle
  penalty (the ratio is exact even without knowing the core's turbo
  frequency).
- The branchless kernel's flat 0.47 ns across all orders is the compiler
  deleting the branch. It beats even the perfectly-predicted branch (1.07)
  — predicted-taken branches still occupy fetch/redirect resources that
  `cmov` does not.
- Descriptors of what the compiler actually did (verified by disassembly,
  quoted in the source header):
  `run_branch`: `cmp %r8d,%ecx; jb ...; call cold_path`
  `run_branchless`: `cmp %r8d,%r10d; cmovb %rcx,%r9`

## What could make the result inaccurate?

1. **The compiler may rewrite your branch** — that is the experiment's
   subject, not a bug. If you change the kernel, re-check the disassembly:
   `objdump -d build/bin/branch.exe` and look at `run_branch`/`run_branchless`.
2. **Data distribution**: uniform values give a 50% split. A 90/10 split
   would be predictable even when "random" (the predictor loves skew) —
   `--threshold` explores this.
3. **Working-set size**: the default 4 MiB sits in L3. At DRAM-resident
   sizes the memory latency dominates and the branch effect drowns; at L1
   sizes the branch effect shines. `--size` trades these.
4. **The predictor learns across passes**: the same array is traversed
   repeatedly; runs of a few thousand iterations are enough for the
   predictor to warm up. That is realistic (hot loops) but means the first
   pass is slower than the median.

## How does this connect to the next experiment?

Misprediction is a *pipeline* penalty; the next experiment isolates pipeline
costs that are even more fundamental — the difference between an
instruction's latency and the machine's throughput, using nothing but
arithmetic.
