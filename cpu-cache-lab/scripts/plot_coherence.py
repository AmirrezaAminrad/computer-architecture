#!/usr/bin/env python3
"""Plot coherence results: bus traffic per workload, MSI vs MESI.

Usage: python scripts/plot_coherence.py [--csv results/coherence.csv]
"""
import argparse

from plot_common import load_csv, require_matplotlib, save

plt = require_matplotlib()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="results/coherence.csv")
    ap.add_argument("--out", default="results/coherence.png")
    args = ap.parse_args()

    rows = load_csv(args.csv)
    workloads = sorted({r["workload"] for r in rows})
    protocols = sorted({r["protocol"] for r in rows})

    import numpy as np
    x = np.arange(len(workloads))
    width = 0.8 / max(1, len(protocols))

    fig, axes = plt.subplots(1, 2, figsize=(14, 5),
                             gridspec_kw={"width_ratios": [1.6, 1]})
    colors = {"MSI": "#1f77b4", "MESI": "#2ca02c"}

    ax = axes[0]
    for pi, protocol in enumerate(protocols):
        vals = []
        for w in workloads:
            v = next((int(r["bus_transactions"]) for r in rows
                      if r["protocol"] == protocol and r["workload"] == w), 0)
            vals.append(v)
        bars = ax.bar(x + pi * width, vals, width, label=protocol,
                      color=colors.get(protocol))
        for b, v in zip(bars, vals):
            ax.annotate(str(v), xy=(b.get_x() + b.get_width() / 2, v),
                        xytext=(0, 2), textcoords="offset points",
                        ha="center", fontsize=7, rotation=90)
    ax.set_xticks(x + width * (len(protocols) - 1) / 2)
    ax.set_xticklabels([w.replace("_", "\n") for w in workloads], fontsize=8)
    ax.set_ylabel("bus transactions")
    ax.set_title("bus traffic per workload (atomic-bus model)", fontsize=10)
    ax.legend(fontsize=8)
    ax.grid(True, axis="y", alpha=0.3)

    ax = axes[1]
    labels, vals = [], []
    for r in rows:
        if r["workload"] in ("adjacent_counters", "padded_counters"):
            labels.append(f"{r['protocol']}\n{r['workload'].split('_')[0]}")
            vals.append(int(r["invalidations"]))
    ax.bar(range(len(labels)), vals,
           color=["#d62728" if "adjacent" in l else "#2ca02c"
                  for l in labels])
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, fontsize=8)
    ax.set_ylabel("invalidations")
    ax.set_title("false sharing: same code, different layout\n"
                 "(adjacent counters share a line; padded do not)",
                 fontsize=9)
    ax.grid(True, axis="y", alpha=0.3)

    fig.suptitle("Coherence simulator (MSI / MESI, atomic bus)", fontsize=11)
    save(fig, args.out)


if __name__ == "__main__":
    main()
