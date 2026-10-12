#!/usr/bin/env python3
"""Plot simulator results: staircase vs detected caches, prefetcher, matmul.

Usage: python scripts/plot_simulator.py [--csv results/simulator.csv]
"""
import argparse

from plot_common import human_bytes, load_csv, load_machine, require_matplotlib, save

plt = require_matplotlib()

WINDOWS_K = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768]
LEVEL_STYLE = {1: ("#1f77b4", "L1-like"), 2: ("#2ca02c", "L2-like"),
               3: ("#9467bd", "L3-like")}
LEVEL_SIZE_KEY = {"L1-like": 1, "L2-like": 2, "L3-like": 3}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="results/simulator.csv")
    ap.add_argument("--machine", default="results/machine.json")
    ap.add_argument("--out", default="results/simulator.png")
    args = ap.parse_args()

    rows = load_csv(args.csv)
    machine = load_machine(args.machine)

    fig, axes = plt.subplots(1, 3, figsize=(16, 4.8))

    # ---- Panel 1: working-set staircase per detected geometry -------------
    ax = axes[0]
    curves: dict[str, dict[int, float]] = {}
    for r in rows:
        if r["trace"].startswith("window"):
            w = int(r["trace"].replace("window", "").replace("K", ""))
            curves.setdefault(r["config"], {})[w] = float(r["hit_rate"])
    for i, (cfg_label, curve) in enumerate(curves.items()):
        level = 1 + i if i < 3 else 3
        color = LEVEL_STYLE.get(level, ("gray", f"L{level}"))[0]
        xs = sorted(curve)
        ax.plot(xs, [curve[x] for x in xs], "o-", lw=1.6, ms=4, color=color,
                label=cfg_label.split("/")[0])
    ax.set_xscale("log", base=2)
    ax.set_xlabel("working-set window (KiB, log)")
    ax.set_ylabel("simulated hit rate")
    ax.set_ylim(-0.05, 1.05)
    ax.set_title("staircase vs detected caches\n"
                 "(cliffs land at the detected capacities)", fontsize=9)
    ax.grid(True, which="both", alpha=0.3)
    ax.legend(fontsize=8)
    if machine:
        seen = set()
        for c in machine.get("detected_caches", []):
            if c["type"] == "instruction" or c["level"] in seen:
                continue
            seen.add(c["level"])
            ax.axvline(c["size_bytes"] // 1024, color="gray", ls=":",
                      lw=1.0, alpha=0.8)
            ax.annotate(f"L{c['level']} {human_bytes(c['size_bytes'])}",
                        xy=(c["size_bytes"] // 1024, 1.02), fontsize=7,
                        color="dimgray", rotation=0, ha="center")

    # ---- Panel 2: prefetcher on/off ---------------------------------------
    ax = axes[1]
    names, off_vals, on_vals = [], [], []
    for r in rows:
        if r["trace"] in ("sequential", "strided128", "random") \
                and r["config"].startswith("32KiB"):
            if r["trace"] not in names:
                names.append(r["trace"])
    for name in names:
        for r in rows:
            if r["trace"] == name and r["config"].startswith("32KiB"):
                if r["prefetch"] == "0":
                    off_vals.append(float(r["miss_rate"]))
                else:
                    on_vals.append(float(r["miss_rate"]))
    import numpy as np
    x = np.arange(len(names))
    ax.bar(x - 0.2, off_vals, 0.38, label="prefetch off", color="#d62728")
    ax.bar(x + 0.2, on_vals, 0.38, label="prefetch on", color="#2ca02c")
    ax.set_xticks(x)
    ax.set_xticklabels(names, fontsize=9)
    ax.set_ylabel("miss rate")
    ax.set_ylim(0, 1.1)
    ax.set_title("degree-1 next-line prefetcher\n"
                 "(helps sequential; useless for stride-128 and random)",
                 fontsize=9)
    ax.legend(fontsize=8)
    ax.grid(True, axis="y", alpha=0.3)

    # ---- Panel 3: matmul loop orders, AMAT ---------------------------------
    ax = axes[2]
    mm = {}
    for r in rows:
        if r["trace"].startswith("matmul_row") and not r["trace"].endswith("_L2") \
                and float(r["amat_ns"]) > 0:
            mm[r["trace"]] = float(r["amat_ns"])
    if mm:
        keys = sorted(mm)
        bars = ax.bar(range(len(keys)), [mm[k] for k in keys],
                      color=["#d62728", "#2ca02c"][:len(keys)])
        for b, k in zip(bars, keys):
            ax.annotate(f"{mm[k]:.1f} ns", xy=(b.get_x() + b.get_width() / 2,
                                               mm[k]),
                        xytext=(0, 3), textcoords="offset points",
                        ha="center", fontsize=9)
        ax.set_xticks(range(len(keys)))
        ax.set_xticklabels(["ijk (one row)", "ikj (one row)"], fontsize=9)
        ax.set_ylabel("two-level AMAT (ns)")
        ax.set_title("matmul loop orders, n=1024 row\n"
                     "the simulator predicts rung 0 vs rung 1", fontsize=9)
        ax.grid(True, axis="y", alpha=0.3)

    title = f"Cache simulator — {machine.get('cpu_brand', '')}" if machine \
        else "Cache simulator"
    fig.suptitle(title, fontsize=11)
    save(fig, args.out)


if __name__ == "__main__":
    main()
