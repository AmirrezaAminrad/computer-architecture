#!/usr/bin/env python3
"""Plot matmul results: GFLOP/s per rung + the tile-size sweep.

Usage: python scripts/plot_matmul.py [--csv results/matmul.csv]
"""
import argparse

from plot_common import load_csv, load_machine, require_matplotlib, save

plt = require_matplotlib()

RUNG_ORDER = ["naive-ijk", "ikj", "tiled", "vectorized", "blocked", "openmp",
              "blas"]
RUNG_LABELS = {
    "naive-ijk": "0 naive ijk",
    "ikj": "1 ikj",
    "tiled": "2 tiled",
    "vectorized": "3 vectorized",
    "blocked": "4 reg-block+pack",
    "openmp": "5 OpenMP",
    "blas": "6 BLAS",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="results/matmul.csv")
    ap.add_argument("--machine", default="results/machine_matmul.json")
    ap.add_argument("--out", default="results/matmul.png")
    args = ap.parse_args()

    rows = load_csv(args.csv)
    machine = load_machine(args.machine)

    # Latest N in the CSV (rows accumulate across runs).
    n = max(int(r["n"]) for r in rows)

    # Panel 1: best GFLOP/s per version at that N (tiled: its best tile).
    fig, axes = plt.subplots(1, 2, figsize=(13, 5.2),
                             gridspec_kw={"width_ratios": [2, 1.3]})

    per_version = {}
    for r in rows:
        if int(r["n"]) != n or r["status"] == "skipped":
            continue
        v = r["version"]
        g = float(r["gflops_median"])
        if v not in per_version or g > per_version[v][0]:
            per_version[v] = (g, r)
    versions = [v for v in RUNG_ORDER if v in per_version]
    vals = [per_version[v][0] for v in versions]
    colors = ["#d62728" if per_version[v][1]["status"] != "ok" else "#1f77b4"
              for v in versions]
    bars = axes[0].bar(range(len(versions)), vals, color=colors)
    for b, v in zip(bars, versions):
        axes[0].annotate(f"{per_version[v][0]:.1f}",
                         xy=(b.get_x() + b.get_width() / 2, per_version[v][0]),
                         xytext=(0, 3), textcoords="offset points",
                         ha="center", fontsize=9)
    axes[0].set_xticks(range(len(versions)))
    axes[0].set_xticklabels([RUNG_LABELS.get(v, v) for v in versions],
                            rotation=20, ha="right", fontsize=9)
    axes[0].set_ylabel(f"GFLOP/s (median, N={n})")
    axes[0].set_title("The ladder: each rung fixes the previous one's "
                      "memory behavior", fontsize=10)
    axes[0].grid(True, axis="y", alpha=0.3)

    # Panel 2: tile sweep for the tiled rung.
    ax2 = axes[1]
    tiled = sorted([(int(r["tile"]), float(r["gflops_median"]))
                    for r in rows
                    if r["version"] == "tiled" and int(r["n"]) == n
                    and r["status"] == "ok" and int(r["tile"]) > 0])
    if tiled:
        ts, gs = zip(*tiled)
        ax2.plot(ts, gs, "o-", color="#2ca02c", lw=1.8)
        for x, y in zip(ts, gs):
            ax2.annotate(f"{y:.1f}", xy=(x, y), xytext=(0, 6),
                         textcoords="offset points", ha="center", fontsize=8)
        ax2.set_xscale("log", base=2)
        ax2.set_xticks(list(ts))
        ax2.set_xticklabels([str(t) for t in ts], fontsize=8)
        ax2.set_xlabel("tile size T")
        ax2.set_ylabel("GFLOP/s")
        ax2.set_title("tiled rung vs tile size\n(too small: loop overhead; "
                      "too large: tiles leave L1/L2)", fontsize=9)
        ax2.grid(True, which="both", alpha=0.3)

    title = f"Matmul ladder — {machine.get('cpu_brand', '')}" if machine else "Matmul ladder"
    skipped = sorted({r["version"] for r in rows if r["status"] == "skipped"})
    note = ""
    if skipped:
        note = f" (skipped, not installed: {', '.join(skipped)})"
    fig.suptitle(title + note, fontsize=11)
    save(fig, args.out)


if __name__ == "__main__":
    main()
