# Experiment 6 — Instruction latency vs throughput

*Stage 2. Measured on the development machine (i5-1334U, pinned to logical
CPU 0; see `results/machine_instruction_latency.json`).*

## What are we measuring?

For the same 64-bit integer operation, two different "speeds":

- **Latency** (1 chain): `x += c` over and over — every step consumes the
  previous result, so the per-step time is the instruction's latency.
- **Throughput** (K chains): K independent accumulators updated side by
  side — the CPU executes them concurrently, so the per-step time falls to
  the execution-port limit.

This is measured for 64-bit `add` and `mul` across 1, 2, 4, 8, 16 chains.
Three defenses keep the measurement honest, each against a specific
optimizer behavior:

1. an `asm` barrier after **every** step — otherwise GCC folds
   `x += c; x += c` into `x += 2c` and the "latency" collapses to
   throughput (this actually happens);
2. 8 unrolled steps per loop iteration — loop overhead amortized to ~1%;
3. `no-tree-vectorize` on the kernel — 16 independent adds would otherwise
   become SIMD instructions, which is a different experiment (it returns in
   the matmul stage).

Closed-form self-tests verify the chains compute what they claim
(`seed + n·c`, `seed · cⁿ`).

## Why does it matter?

Latency and throughput are routinely confused, and optimizing for the wrong
one is a classic waste: a dependent pointer chase cannot be "unrolled"
faster (see Experiment 2), while independent work often hides its cost
entirely. The add/mul pair shows that latency and throughput limits are
*independent numbers from different hardware resources*.

## What should I expect?

- `add`: 1-cycle latency; throughput several per cycle (multiple ALU ports).
- `mul`: ~3-cycle latency; throughput ~1 per cycle (one multiply port) —
  so more chains help mul only up to 2–3, then plateau.

## What does the graph mean?

Measured (median of 5 reps of ~40 ms; ns values are exact; the cycles
column uses the calibrated *nominal* TSC frequency of 2.496 GHz while the
core actually boosts higher — the **ratios are exact**, absolute cycle
counts are inflated by turbo, which the plot's subtitle also states):

| chains | add (ns/op) | mul (ns/op) |
|---|---|---|
| 1 | 0.228 | 0.687 |
| 2 | 0.114 | 0.341 |
| 4 | 0.067 | 0.230 |
| 8 | 0.052 | 0.228 |
| 16 | 0.134 | 0.227 |

- **add, 1 chain**: 0.228 ns — one dependent add per core-clock cycle (the
  textbook 1-cycle latency; the absolute cycles figure reads 0.57 TSC-cycles
  because of the turbo inflation, the mul/add ratio is the honest signal).
- **add, 8 chains**: 0.052 ns — **4.4× the throughput** of one chain:
  independent work really is "free" until the ports saturate.
- **add, 16 chains**: 0.134 ns — *worse* than 8: sixteen live accumulators
  plus loop state exceed the register file, and spills appear. More
  parallelism is not automatically better.
- **mul, 1 chain**: 0.687 ns = **3.0× the add latency** — the classic
  3-cycle IMUL, measured from a ratio that needs no frequency knowledge.
- **mul, 4+ chains**: flat at ~0.23 ns — throughput saturates at ~1
  multiply per cycle no matter how many chains you supply. One multiply
  port. Unlike add, no amount of independence buys more.

The two panels are the whole lesson: add is throughput-rich (ports galore)
but latency-bound when dependent; mul is throughput-poor (one port) and
latency-bound at 3× — and both bounds were measured, not looked up.

## What could make the result inaccurate?

1. **TSC-cycles ≠ core cycles** under turbo (see above): use ns and ratios.
2. **Register pressure at 16 chains** is a measurement of a *different*
   regime (spills) — visible and expected, do not average it away.
3. **Compiler updates** may change how the barriers interact with
   scheduling; the closed-form self-tests catch correctness, and the shape
   of the curve catches folding.
4. **Frequency drift** during the run changes ns but not ratios; pinning to
   one core keeps it bounded.

## How does this connect to the next stage?

With the core measured (this) and memory measured (Stages 1–2), the matmul
stage puts both together: naive matmul is memory-bound; each optimization
rung trades instruction-level parallelism (this experiment) for better data
locality (Experiments 1–4).
