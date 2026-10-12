# Experiment guides

Each guide follows the same outline: what we measure, why it matters, what to
expect, how to read the graph, what can skew it, and what comes next.
Numbers quoted are from the reference machine (see the lab
[README](../README.md#environment-notes-reference-machine-recorded-for-honesty));
rerun `make run && make plot` to get your own.

| Stage | Guide | Source | Data |
|---|---|---|---|
| 1 | [Pointer chase: latency vs working set](pointer_chase.md) | `benchmarks/pointer_chase.cpp` | `results/pointer_chase.csv` |
| 2 | [Cache line size](cache_line.md) | `benchmarks/cache_line.cpp` | `results/cache_line.csv` |
| 2 | [Associativity](associativity.md) | `benchmarks/associativity.cpp` | `results/associativity.csv` |
| 2 | [TLB / translation](tlb.md) | `benchmarks/tlb.cpp` | `results/tlb.csv` |
| 2 | [Branch prediction](branch.md) | `benchmarks/branch.cpp` | `results/branch.csv` |
| 2 | [Instruction latency vs throughput](instruction_latency.md) | `benchmarks/instruction_latency.cpp` | `results/instruction_latency.csv` |
| 3 | [Matmul ladder](matmul.md) | `matmul/` | `results/matmul.csv` |
| 4 | [Cache simulator](simulator.md) | `simulator/cache.py`, `study.py` | `results/simulator.csv` |
| 5 | [Coherence and false sharing](coherence.md) | `simulator/coherence.py`, `benchmarks/false_sharing.cpp` | `results/coherence.csv`, `results/false_sharing.csv` |
| 5 | [Roofline](roofline.md) | `scripts/roofline.py` | `results/roofline.csv` |

## Reproducing the results

```bash
make PORTABLE=1 && make test   # build + correctness checks (no timing assertions)
make run                       # measure; overwrites results/*.csv and machine*.json
make plot                      # PNGs from the CSVs (needs matplotlib + numpy)
python scripts/export_lab_data.py   # refresh the ArchLab webapp's lab-data.ts
```

Tips for clean measurements: close other applications, use a fixed power
plan, keep the default CPU pinning, and compare shapes and ratios rather than
absolute values across machines. Every run records its CPU, compiler, flags,
seed and timestamp in `results/machine_<bench>.json`.
