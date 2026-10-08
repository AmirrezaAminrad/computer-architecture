#!/usr/bin/env python3
"""Export the lab's measured results into the ArchLab webapp.

Reads results/*.csv + results/machine.json and emits webapp/src/lib/lab-data.ts
so the webapp can show *measured* numbers next to its textbook ones, without a
runtime fetch (the webapp builds to a single self-contained HTML file).

Usage:  python cpu-cache-lab/scripts/export_lab_data.py
Rerun after any lab rerun (`make run`) to refresh the webapp's numbers.
"""

import csv
import json
import sys
from pathlib import Path

LAB_ROOT = Path(__file__).resolve().parent.parent
RESULTS = LAB_ROOT / "results"
REPO_ROOT = LAB_ROOT.parent
OUT_FILE = REPO_ROOT / "webapp" / "src" / "lib" / "lab-data.ts"


def read_csv(name):
    with open(RESULTS / name, newline="") as f:
        return list(csv.DictReader(f))


def num(s):
    f = float(s)
    return int(f) if f == int(f) else f


def rows(lines, sep=",\n"):
    return sep.join("    " + ln for ln in lines)


def main():
    machine = json.loads((RESULTS / "machine.json").read_text())

    # ── pointer-chase latency staircase ──────────────────────────────────────
    staircase = [
        {"bytes": int(r["size_bytes"]), "ns": round(float(r["median_ns"]), 2)}
        for r in read_csv("pointer_chase.csv")
    ]

    # ── TLB reach staircase ──────────────────────────────────────────────────
    tlb = [
        {"pages": int(r["pages"]), "ns": round(float(r["median_ns"]), 2)}
        for r in read_csv("tlb.csv")
    ]

    # ── matmul optimization ladder: best row per implementation ─────────────
    raw = read_csv("matmul.csv")
    best = {}
    for r in raw:
        if r["status"] != "ok":
            continue
        key = r["version"] if r["version"] != "tiled" else "tiled"
        if key not in best or float(r["gflops_median"]) > float(best[key]["gflops_median"]):
            best[key] = r
    ladder = []
    for key, label, note in [
        ("naive-ijk", "Naive ijk", "a miss per multiply — DRAM latency on the critical path"),
        ("ikj", "Loop order → ikj", "inner loop walks C and B rows contiguously: 15× faster, zero cleverness"),
        ("tiled", "+ Tiling", "best tile: works in cache-sized squares"),
        ("vectorized", "+ AVX2/FMA", "SIMD alone doesn't fix the memory bound"),
        ("blocked", "+ Reg-block & pack", "registers as the innermost cache level"),
        ("openmp", "+ OpenMP ×12", "12 threads on the same optimized core"),
    ]:
        if key in best:
            r = best[key]
            ladder.append(
                {
                    "impl": r["impl"],
                    "label": label,
                    "gflops": round(float(r["gflops_median"]), 2),
                    "tile": int(r["tile"]) if int(r["tile"]) else None,
                    "threads": int(r["threads"]) if int(r["threads"]) else 1,
                    "note": note,
                }
            )
    speedup_ikj = round(float(best["naive-ijk"]["seconds_median"]) / float(best["ikj"]["seconds_median"]), 1)

    # ── false sharing ────────────────────────────────────────────────────────
    fs = {r["layout"]: r for r in read_csv("false_sharing.csv")}
    false_sharing = {
        "adjacentMps": int(float(fs["adjacent"]["increments_per_sec"])),
        "paddedMps": int(float(fs["padded"]["increments_per_sec"])),
        "slowdown": round(float(fs["padded"]["increments_per_sec"]) / float(fs["adjacent"]["increments_per_sec"]), 1),
    }

    # ── cache-line size (dependent-load latency vs stride) ───────────────────
    cache_line = [
        {"stride": int(r["stride_bytes"]), "ns": round(float(r["median_ns_per_access"]), 1)}
        for r in read_csv("cache_line.csv")
        if r["mode"] == "latency"
    ]

    # ── L1 associativity sweep: k same-set lines at the 4 KiB set period ─────
    assoc = [
        {"k": int(r["k_lines"]), "ns": round(float(r["median_ns"]), 2)}
        for r in read_csv("associativity.csv")
        if r["phase"] == "l1_k_sweep"
    ]

    # ── coherence simulator results (MSI vs MESI) ────────────────────────────
    coherence = [
        {
            "protocol": r["protocol"],
            "workload": r["workload"],
            "busTransactions": int(r["bus_transactions"]),
            "invalidations": int(r["invalidations"]),
            "coherenceMisses": int(r["coherence_misses"]),
        }
        for r in read_csv("coherence.csv")
    ]

    caches = [
        {"level": c["level"], "type": c["type"], "sizeBytes": c["size_bytes"], "lineSize": c["line_size"], "ways": c["ways"]}
        for c in machine["detected_caches"]
    ]

    # ── per-level latencies derived from the staircase (same bands the lab doc uses) ──
    l1d = next(c["sizeBytes"] for c in caches if c["level"] == 1 and c["type"] == "data")
    l2 = next(c["sizeBytes"] for c in caches if c["level"] == 2)
    l3 = next(c["sizeBytes"] for c in caches if c["level"] == 3)

    def median(vals):
        vs = sorted(vals)
        return vs[len(vs) // 2]

    l1_pts = [r["ns"] for r in staircase if r["bytes"] <= l1d]
    l2_pts = [r["ns"] for r in staircase if l1d < r["bytes"] <= l2]
    l3_pts = [r["ns"] for r in staircase if l2 < r["bytes"] <= l3]
    dram_pts = [r["ns"] for r in staircase if r["bytes"] > l3 and r["bytes"] >= 32 * 1024 * 1024]
    level_ns = {
        "l1": round(median(l1_pts), 2),
        "l2": round(median(l2_pts), 2),
        "l3": round(min(l3_pts), 2),  # first step past L2; deeper points are L3-sharing effects
        "dram": round(median(dram_pts), 2),
    }

    # sanity: the numbers we ship must be the numbers we measured
    assert staircase and tlb and ladder and coherence, "missing results CSVs — run `make run` first"

    caches_ts = rows(
        f"{{ level: {c['level']}, type: {json.dumps(c['type'])}, sizeBytes: {c['sizeBytes']}, lineSize: {c['lineSize']}, ways: {c['ways']} }}" for c in caches
    )
    staircase_ts = rows("{ bytes: %d, ns: %s }" % (r["bytes"], r["ns"]) for r in staircase)
    tlb_ts = rows("{ pages: %d, ns: %s }" % (r["pages"], r["ns"]) for r in tlb)
    ladder_ts = rows(
        "{ impl: %s, label: %s, gflops: %s, tile: %s, threads: %d, note: %s }"
        % (json.dumps(r["impl"]), json.dumps(r["label"]), r["gflops"], json.dumps(r["tile"]), r["threads"], json.dumps(r["note"]))
        for r in ladder
    )
    cache_line_ts = rows("{ stride: %d, ns: %s }" % (r["stride"], r["ns"]) for r in cache_line)
    assoc_ts = rows("{ k: %d, ns: %s }" % (r["k"], r["ns"]) for r in assoc)
    coherence_ts = rows(
        "{ protocol: %s, workload: %s, busTransactions: %d, invalidations: %d, coherenceMisses: %d }"
        % (json.dumps(r["protocol"]), json.dumps(r["workload"]), r["busTransactions"], r["invalidations"], r["coherenceMisses"])
        for r in coherence
    )

    out = f"""// GENERATED by cpu-cache-lab/scripts/export_lab_data.py — do not edit by hand.
// Source of truth: cpu-cache-lab/results/*.csv + results/machine.json.
// Regenerate after a lab rerun:  python cpu-cache-lab/scripts/export_lab_data.py

// Machine: {machine['cpu_brand']} — measured {machine['timestamp'][:10]}, {machine['compiler']}, {machine['build_flags']}

export interface DetectedCache {{
  level: number;
  type: string;
  sizeBytes: number;
  lineSize: number;
  ways: number;
}}

export interface MachineInfo {{
  cpu: string;
  logicalCpus: number;
  tscGhz: number;
  date: string;
  caches: DetectedCache[];
}}

export const MACHINE: MachineInfo = {{
  cpu: {json.dumps(machine['cpu_brand'])},
  logicalCpus: {machine['logical_cpus']},
  tscGhz: {round(machine['tsc_cycles_per_second'] / 1e9, 3)},
  date: {json.dumps(machine['timestamp'][:10])},
  caches: [
{caches_ts},
  ],
}};

/** Pointer-chase latency plateaus per level (medians of the staircase bands; L3 = first step past L2). */
export const LEVEL_NS = {{
  l1: {level_ns['l1']},
  l2: {level_ns['l2']},
  l3: {level_ns['l3']},
  dram: {level_ns['dram']},
}};

/** Stage 1: pointer-chase median latency per dependent load vs working-set size. */
export const STAIRCASE: {{ bytes: number; ns: number }}[] = [
{staircase_ts},
];

/** TLB benchmark: hop latency vs number of distinct 4 KiB pages touched. */
export const TLB_STAIRCASE: {{ pages: number; ns: number }}[] = [
{tlb_ts},
];

/** Stage 3: matmul n=1024 ladder, best measured run per implementation. */
export interface LadderRun {{ impl: string; label: string; gflops: number; tile: number | null; threads: number; note: string }}
export const MATMUL_LADDER: LadderRun[] = [
{ladder_ts},
];
/** Loop-order fixup alone (naive ijk → ikj). */
export const MATMUL_LOOP_ORDER_SPEEDUP = {speedup_ikj};

/** Stage 7: adjacent vs padded per-core counters, 12 threads × 5M increments. */
export const FALSE_SHARING = {{
  adjacentMps: {false_sharing['adjacentMps']},
  paddedMps: {false_sharing['paddedMps']},
  slowdown: {false_sharing['slowdown']},
}};

/** Stage 2: dependent-load latency vs stride — the 64-byte line made visible. */
export const CACHE_LINE_LATENCY: {{ stride: number; ns: number }}[] = [
{cache_line_ts},
];

/** Stage 2: k lines resident in one L1 set (4 KiB set period) — the cliff is the associativity. */
export const ASSOC_SWEEP: {{ k: number; ns: number }}[] = [
{assoc_ts},
];

/** Stage 6: coherence simulator (4 cores, 200 iters) — bus traffic per protocol/workload. */
export interface CoherenceRun {{ protocol: string; workload: string; busTransactions: number; invalidations: number; coherenceMisses: number }}
export const COHERENCE: CoherenceRun[] = [
{coherence_ts},
];
"""

    OUT_FILE.write_text(out, encoding="utf-8")
    print(f"wrote {OUT_FILE.relative_to(REPO_ROOT)}")
    print(f"  machine: {machine['cpu_brand']}, {machine['timestamp'][:10]}")
    print(f"  staircase: {len(staircase)} pts, tlb: {len(tlb)} pts, ladder: {len(ladder)} runs, assoc: {len(assoc)} pts, coherence: {len(coherence)} rows")
    print(f"  matmul loop-order speedup: {speedup_ikj}x, false sharing: {false_sharing['slowdown']}x")


if __name__ == "__main__":
    sys.exit(main())
