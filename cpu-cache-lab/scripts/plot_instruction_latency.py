#!/usr/bin/env python3
"""Plot instruction latency/throughput: cycles per op vs number of chains.

Usage: python scripts/plot_instruction_latency.py
       [--csv results/instruction_latency.csv]
"""
import argparse

from plot_common import load_csv, load_machine, require_matplotlib, save

plt = require_matplotlib()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="results/instruction_latency.csv")
    ap.add_argument("--machine", default="results/machine_instruction_latency.json")
    ap.add_argument("--out", default="results/instruction_latency.png")
    args = ap.parse_args()

    rows = load_csv(args.csv)
    machine = load_machine(args.machine)

    ops = sorted({r["op"] for r in rows})
    fig, axes = plt.subplots(1, len(ops), figsize=(6.5 * len(ops), 5), squeeze=False)

    for ax, op in zip(axes[0], ops):
        pts = [(int(r["chains"]), float(r["cycles_per_op_median"]))
               for r in rows if r["op"] == op and r["cycles_per_op_median"]]
        pts.sort()
        ks = [p[0] for p in pts]
        cyc = [p[1] for p in pts]
        ax.plot(ks, cyc, "o-", color="#1f77b4", lw=1.8)
        for k, c in zip(ks, cyc):
            ax.annotate(f"{c:.2f}", xy=(k, c), xytext=(0, 6),
                        textcoords="offset points", ha="center", fontsize=8)
        ax.set_title(f"64-bit {op}: latency (1 chain) vs throughput (many)", fontsize=10)
        ax.set_xlabel("independent chains")
        ax.set_ylabel("nominal-TSC cycles per op")
        ax.set_xticks(ks)
        ax.grid(True, alpha=0.3)
        # Throughput plateau = best (lowest) measured cycles/op.
        best = min(cyc)
        ax.axhline(best, color="firebrick", ls="--", lw=1.0, alpha=0.7)
        ax.annotate(f"best throughput: 1 op / {best:.2f} TSC-cycles",
                    xy=(ks[0], best), xytext=(4, -14), textcoords="offset points",
                    fontsize=8, color="firebrick")

    note = ("cycles use the calibrated invariant-TSC frequency (nominal, not the\n"
            "boosted core frequency) — RATIOS between points are exact, absolute\n"
            "cycle counts are inflated by turbo. ns values in the CSV are exact.")
    fig.suptitle(f"Instruction latency vs throughput — "
                 f"{machine.get('cpu_brand', '') if machine else ''}\n"
                 f"{note}", fontsize=9)
    save(fig, args.out)


if __name__ == "__main__":
    main()
