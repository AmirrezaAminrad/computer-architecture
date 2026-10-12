#!/usr/bin/env python3
"""Plot associativity results: set-period sweep and conflict-count sweeps.

Usage: python scripts/plot_associativity.py [--csv results/associativity.csv]
"""
import argparse

from plot_common import (first_jump, human_bytes, load_csv, load_machine,
                         require_matplotlib, save)

plt = require_matplotlib()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="results/associativity.csv")
    ap.add_argument("--machine", default="results/machine_associativity.json")
    ap.add_argument("--out", default="results/associativity.png")
    args = ap.parse_args()

    rows = load_csv(args.csv)
    machine = load_machine(args.machine)

    def series(phase):
        pts = [(int(r["spacing_bytes"]), int(r["k_lines"]), float(r["median_ns"]))
               for r in rows if r["phase"] == phase]
        return pts

    fig, axes = plt.subplots(1, 3, figsize=(15, 4.6))
    title = f"Associativity — {machine.get('cpu_brand', '')}" if machine else "Associativity"

    # Panel 1: phase A — spacing sweep, first jump = L1 set period.
    ax = axes[0]
    pts = series("find_period")
    if pts:
        xs = [p[0] for p in pts]
        ys = [p[2] for p in pts]
        ax.plot(xs, ys, "o-", color="#1f77b4", lw=1.6)
        ax.set_xscale("log", base=2)
        ax.set_title("phase A: spacing sweep (K=16 lines)", fontsize=10)
        ax.set_xlabel("line spacing D (log)")
        ax.set_ylabel("ns per hop")
        jump = first_jump(ys)
        if jump is not None:
            ax.axvline(xs[jump], color="firebrick", ls="--", lw=1.2)
            ax.annotate(f"L1 set period {human_bytes(xs[jump])}\n(observed jump x{ys[jump]/ys[jump-1]:.1f})",
                        xy=(xs[jump], ys[jump]), xytext=(-100, -26),
                        textcoords="offset points", fontsize=8, color="firebrick",
                        arrowprops=dict(arrowstyle="->", color="firebrick", lw=1.0))
        ax.grid(True, which="both", alpha=0.3)

    # Panel 2: phase B — conflict-count sweep at the measured period.
    ax = axes[1]
    pts = series("l1_k_sweep")
    if pts:
        ks = [p[1] for p in pts]
        ys = [p[2] for p in pts]
        ax.plot(ks, ys, "o-", color="#1f77b4", lw=1.6)
        ax.set_title("phase B: conflicts in one L1 set", fontsize=10)
        ax.set_xlabel("number of conflicting lines K")
        ax.set_ylabel("ns per hop")
        jump = first_jump(ys)
        if jump is not None:
            ax.annotate(f"jump at K={ks[jump]} -> ~{ks[jump]-1} ways\n(observed)",
                        xy=(ks[jump], ys[jump]), xytext=(-95, 22),
                        textcoords="offset points", fontsize=8, color="firebrick",
                        arrowprops=dict(arrowstyle="->", color="firebrick", lw=1.0))
        ways = None
        if machine:
            for c in machine.get("detected_caches", []):
                if c["level"] == 1 and c["type"] == "data":
                    ways = c["ways"]
        if ways:
            ax.axvline(ways, color="gray", ls=":", lw=1.2)
            ax.annotate(f"OS reports {ways} ways", xy=(ways, ax.get_ylim()[1]),
                        xytext=(4, -12), textcoords="offset points",
                        fontsize=8, color="dimgray", va="top")
        ax.grid(True, alpha=0.3)

    # Panel 3: phase C — beyond-L1 probe, explicitly labeled an artifact.
    ax = axes[2]
    pts = series("beyond_l1_period")
    if pts:
        xs = [p[0] for p in pts]
        ys = [p[2] for p in pts]
        ax.plot(xs, ys, "o-", color="#7f7f7f", lw=1.6)
        ax.set_xscale("log", base=2)
        ax.set_title("phase C: beyond-L1 spacing\n(NOT a set period — physical-indexing\nartifact, see docs)", fontsize=9, color="dimgray")
        ax.set_xlabel("line spacing D (log)")
        ax.set_ylabel("ns per hop")
        ax.grid(True, which="both", alpha=0.3)

    fig.suptitle(title, fontsize=11)
    save(fig, args.out)


if __name__ == "__main__":
    main()
