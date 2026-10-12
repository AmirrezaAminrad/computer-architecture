#!/usr/bin/env python3
"""Stage-4 study: the cache simulator against real workloads.

Generates traces with the workloads/ generators, then runs a matrix of
(trace x cache geometry x prefetcher on/off):

  1. Capacity staircase: a random trace over a 64 MiB region against cache
     sizes from 16 KiB to 32 MiB — the hit-rate curve should step at the
     SAME capacities where Stages 1-2 measured latency steps (L1d, L2, L3,
     taken from the detected caches in results/machine.json).
  2. Prefetcher: sequential / strided-128 / random traces with the
     next-line prefetcher on and off.
  3. Matmul loop orders: the real ijk and ikj access streams against an
     L1-like geometry, with two-level AMAT (L1+L2).

Results go to results/simulator.csv (one row per run).
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from simulator import trace as tr  # noqa: E402
from simulator.cache import (Cache, CacheConfig, CacheStats,  # noqa: E402
                             run_multilevel)

ROOT = Path(__file__).resolve().parents[1]
TRACE_DIR = ROOT / "traces"
RESULTS = ROOT / "results"


def load_machine_caches() -> dict[int, int]:
    """level -> size (bytes), from the pointer-chase run's machine.json."""
    path = RESULTS / "machine.json"
    if not path.exists():
        return {}
    with open(path) as f:
        machine = json.load(f)
    out: dict[int, int] = {}
    for c in machine.get("detected_caches", []):
        if c["type"] in ("data", "unified"):
            out.setdefault(c["level"], c["size_bytes"])
    return out


def generate_traces(line_size: int = 64) -> dict[str, list]:
    TRACE_DIR.mkdir(exist_ok=True)
    traces: dict[str, list] = {}

    def build(name, gen, comment):
        # Materialize through the file so the study uses the SAME trace
        # files the CLI consumes (and so traces are inspectable artifacts).
        path = TRACE_DIR / f"{name}.trc"
        n = tr.write_trace(path, gen, comment=comment)
        traces[name] = tr.read_trace(path)
        print(f"  {path.name}: {n} accesses")
        return traces[name]

    build("random", tr.random_access(64 * 1024 * 1024, 500000, line_size,
                                     seed=42),
          "random, region 64MiB, 500k accesses, seed 42")
    build("sequential", tr.sequential(8 * 1024 * 1024, line_size),
          "sequential walk, region 8MiB")
    build("strided128", tr.strided(8 * 1024 * 1024, 128, line_size),
          "strided walk, region 8MiB, stride 128B")
    build("matmul_ijk", tr.matmul_ijk(48, line_size),
          "naive ijk matmul, n=48")
    build("matmul_ikj", tr.matmul_ikj(48, line_size),
          "ikj matmul, n=48")
    build("matmul_row_ijk", tr.matmul_row_ijk(1024),
          "one C row (i=0) of naive ijk, n=1024: B walked down columns")
    build("matmul_row_ikj", tr.matmul_row_ikj(1024),
          "one C row (i=0) of ikj, n=1024: B rows streamed")
    return traces


CSV_HEADER = ("trace,config,size_bytes,ways,line_size,replacement,"
              "write_policy,allocate,prefetch,accesses,hits,misses,"
              "hit_rate,miss_rate,evictions,writebacks,memory_writes,"
              "prefetches,compulsory,capacity,conflict,amat_ns")


def stats_row(trace_name: str, cfg: CacheConfig, prefetch: bool,
              stats: CacheStats, amat_ns: float) -> list:
    return [trace_name, cfg.label(), cfg.size_bytes, cfg.ways,
            cfg.line_size, cfg.replacement, cfg.write_policy, cfg.allocate,
            int(prefetch), stats.accesses, stats.hits, stats.misses,
            f"{stats.hit_rate():.4f}", f"{stats.miss_rate():.4f}",
            stats.evictions, stats.writebacks, stats.memory_writes,
            stats.prefetches, stats.compulsory, stats.capacity,
            stats.conflict, f"{amat_ns:.3f}"]


def main() -> int:
    print("generating traces:")
    traces = generate_traces()

    detected = load_machine_caches()
    if detected:
        print("detected caches (from results/machine.json):",
              {f"L{k}": f"{v // 1024} KiB" for k, v in sorted(detected.items())})

    rows: list[list] = []

    # ---- 1. working-set staircase against the DETECTED caches -------------
    # Fixed cache geometries (from results/machine.json), swept working-set
    # window: each curve cliffs where the window outgrows that cache — the
    # simulator-side twin of the Stage-1 latency staircase.
    print("working-set staircase (window sweeps vs detected geometries):")
    windows = [16 * 1024, 32 * 1024, 64 * 1024, 128 * 1024, 256 * 1024,
               512 * 1024, 1024 * 1024, 2 * 1024 * 1024, 4 * 1024 * 1024,
               8 * 1024 * 1024, 16 * 1024 * 1024, 32 * 1024 * 1024]
    if not detected:
        print("  warning: results/machine.json missing; "
              "using generic 32K/1M/16M geometries")
        detected = {1: 32 * 1024, 2: 1024 * 1024, 3: 16 * 1024 * 1024}
    geometries = []
    for level, size in sorted(detected.items()):
        ways = {1: 12, 2: 10, 3: 12}.get(level, 8)
        hit_ns = {1: 1.0, 2: 10.0, 3: 30.0}.get(level, 30.0)
        try:
            geometries.append((level, CacheConfig(
                size_bytes=size, line_size=64, ways=ways,
                hit_time_ns=hit_ns)))
        except ValueError as exc:
            print(f"  skipping L{level} ({size} B, {ways} ways): {exc}")
    for level, cfg in geometries:
        curve = []
        for w in windows:
            passes = max(2, min(64, (512 * 1024) // max(1, w // 64)))
            cache = Cache(cfg)
            cache.run(list(tr.window_sweep(w, passes)))
            curve.append(cache.stats.hit_rate())
            rows.append(stats_row(f"window{w // 1024}K", cfg, False,
                                  cache.stats, 0.0))
        pretty = "  ".join(f"{w // 1024}K:{h:.2f}"
                           for w, h in zip(windows, curve))
        print(f"  L{level} {cfg.label()}: {pretty}")

    # ---- 2. prefetcher on/off ---------------------------------------------
    print("prefetcher study (L1-like 32 KiB 8-way):")
    for name in ("sequential", "strided128", "random"):
        for prefetch in (False, True):
            cfg = CacheConfig(size_bytes=32 * 1024, line_size=64, ways=8)
            cache = Cache(cfg, prefetch=prefetch)
            cache.run(traces[name])
            st = cache.stats
            print(f"  {name:12s} prefetch={int(prefetch)}: "
                  f"miss rate {st.miss_rate():.4f} "
                  f"(prefetches={st.prefetches})")
            rows.append(stats_row(name, cfg, prefetch, st, 0.0))

    # ---- 3. matmul loop orders: one C row at n=1024, two-level AMAT -------
    print("matmul loop orders (one C row at n=1024; L1 48 KiB 12-way + "
          "L2 detected, two-level AMAT):")
    l1 = CacheConfig(size_bytes=detected.get(1, 32 * 1024), line_size=64,
                     ways={1: 12}.get(1, 8) if 1 in detected else 8,
                     hit_time_ns=1.0) if 1 in detected else \
        CacheConfig(size_bytes=32 * 1024, line_size=64, ways=8,
                    hit_time_ns=1.0)
    l2 = CacheConfig(size_bytes=detected.get(2, 1024 * 1024), line_size=64,
                     ways=10, hit_time_ns=10.0)
    for name in ("matmul_row_ijk", "matmul_row_ikj"):
        res = run_multilevel([l1, l2], traces[name], memory_time_ns=100.0)
        st = res.levels[0]
        l2st = res.levels[1]
        print(f"  {name:16s}: L1 hit rate {st.hit_rate():.4f} "
              f"(misses {st.misses}), L2 hit rate {l2st.hit_rate():.4f}, "
              f"AMAT {res.amat_ns:.2f} ns")
        rows.append(stats_row(name, l1, False, st, res.amat_ns))
        rows.append(stats_row(name + "_L2", l2, False, l2st,
                              res.level_amats[1]))

    RESULTS.mkdir(exist_ok=True)
    out = RESULTS / "simulator.csv"
    with open(out, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(CSV_HEADER.split(","))
        writer.writerows(rows)
    print(f"\nwrote {out} ({len(rows)} runs)")
    print("plot with: python scripts/plot_simulator.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
