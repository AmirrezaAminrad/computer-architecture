#!/usr/bin/env python3
"""Plot branch results: median ns/element per (kind, order) as a bar chart.

Usage: python scripts/plot_branch.py [--csv results/branch.csv]
"""
import argparse

from plot_common import load_csv, load_machine, require_matplotlib, save

plt = require_matplotlib()

ORDER_COLORS = {"random": "#d62728", "ascending": "#2ca02c", "descending": "#1f77b4"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="results/branch.csv")
    ap.add_argument("--machine", default="results/machine_branch.json")
    ap.add_argument("--out", default="results/branch.png")
    args = ap.parse_args()

    rows = load_csv(args.csv)
    machine = load_machine(args.machine)

    kinds = sorted({r["kind"] for r in rows})
    orders = ["random", "ascending", "descending"]

    fig, ax = plt.subplots(figsize=(9, 5.5))
    width = 0.8 / len(orders)
    import numpy as np
    x = np.arange(len(kinds))
    for oi, order in enumerate(orders):
        vals = []
        for kind in kinds:
            v = next((float(r["median_ns_per_element"]) for r in rows
                      if r["kind"] == kind and r["order"] == order), None)
            vals.append(v)
        bars = ax.bar(x + oi * width, vals, width, label=order,
                      color=ORDER_COLORS[order])
        for b, v in zip(bars, vals):
            if v is not None:
                ax.annotate(f"{v:.2f}", xy=(b.get_x() + b.get_width() / 2, v),
                            xytext=(0, 2), textcoords="offset points",
                            ha="center", fontsize=8)

    ax.set_xticks(x + width * (len(orders) - 1) / 2)
    ax.set_xticklabels(kinds)
    ax.set_ylabel("median ns per element")
    ax.set_title("Branch cost: data order changes prediction quality; "
                 "a conditional move removes the branch entirely", fontsize=10)
    ax.legend(title="data order")
    ax.grid(True, axis="y", alpha=0.3)

    if machine and machine.get("cpu_brand"):
        fig.suptitle(f"Branch prediction — {machine['cpu_brand']}", fontsize=11)
    save(fig, args.out)


if __name__ == "__main__":
    main()
