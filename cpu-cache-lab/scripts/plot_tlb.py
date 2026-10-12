#!/usr/bin/env python3
"""Plot TLB results: per-hop cost vs number of pages.

Usage: python scripts/plot_tlb.py [--csv results/tlb.csv]
"""
import argparse
import math

from plot_common import (first_jump, human_bytes, load_csv, load_machine,
                         require_matplotlib, save)

plt = require_matplotlib()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="results/tlb.csv")
    ap.add_argument("--machine", default="results/machine_tlb.json")
    ap.add_argument("--out", default="results/tlb.png")
    args = ap.parse_args()

    rows = load_csv(args.csv)
    machine = load_machine(args.machine)

    pages = [int(r["pages"]) for r in rows]
    med = [float(r["median_ns"]) for r in rows]

    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.plot(pages, med, "o-", color="#1f77b4", lw=1.8)
    ax.set_xscale("log", base=2)
    ax.set_yscale("log", base=10)
    ax.set_xlabel("number of pages touched (one line each, log)")
    ax.set_ylabel("ns per hop (log)")
    ax.grid(True, which="both", alpha=0.3)

    title = f"TLB probe — {machine.get('cpu_brand', '')}" if machine else "TLB probe"
    if machine:
        ps = int(rows[0]["page_size_bytes"]) if rows else 4096
        ax.set_title(f"one line per page ({ps} B pages, randomized order; "
                     "touched data stays cache-resident — rises are translation costs)",
                     fontsize=9, color="dimgray")

    # Observed steps, labeled as observations: translation-structure
    # capacities (dTLB / STLB / page-walk caches), positions measured.
    jumps, last = [], None
    ys = list(med)
    while True:
        start = 0 if last is None else last + 1
        sub = ys[start:]
        j = first_jump(sub, 1.4)
        if j is None:
            break
        idx = start + j
        jumps.append(idx)
        last = idx
        if len(jumps) >= 4:
            break
    for idx in jumps:
        ax.annotate(f"step at {pages[idx]} pages\n(x{med[idx]/med[idx-1]:.1f})",
                    xy=(pages[idx], med[idx]), xytext=(-88, 16),
                    textcoords="offset points", fontsize=8, color="firebrick",
                    arrowprops=dict(arrowstyle="->", color="firebrick", lw=1.0))

    fig.suptitle(title, fontsize=11)
    save(fig, args.out)


if __name__ == "__main__":
    main()
