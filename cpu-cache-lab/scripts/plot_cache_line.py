#!/usr/bin/env python3
"""Plot cache_line results: access cost vs stride, latency + throughput panels.

Usage: python scripts/plot_cache_line.py [--csv results/cache_line.csv]
"""
import argparse
import math

from plot_common import (first_jump, human_bytes, load_csv, load_machine,
                         require_matplotlib, save)

plt = require_matplotlib()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="results/cache_line.csv")
    ap.add_argument("--machine", default="results/machine_cache_line.json")
    ap.add_argument("--out", default="results/cache_line.png")
    args = ap.parse_args()

    rows = load_csv(args.csv)
    machine = load_machine(args.machine)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    title = f"Stride sweep — {machine.get('cpu_brand', '')}" if machine else "Stride sweep"

    panels = [("latency", "dependent chase (no overlap)", axes[0]),
              ("throughput", "independent loads (overlapped)", axes[1])]
    for mode, subtitle, ax in panels:
        pts = [(int(r["stride_bytes"]), float(r["median_ns_per_access"]))
               for r in rows if r["mode"] == mode]
        if not pts:
            ax.set_visible(False)
            continue
        xs, ys = zip(*pts)
        ax.plot(xs, ys, "o-", color="#1f77b4", lw=1.8)
        ax.set_xscale("log", base=2)
        if mode == "latency":
            ax.set_yscale("log", base=10)
        ax.set_title(subtitle, fontsize=10)
        ax.set_xlabel("stride (bytes, log)")
        ax.set_ylabel("ns per access" + (" (log)" if mode == "latency" else ""))
        ax.grid(True, which="both", alpha=0.3)

        # Detected cache-line size as a guide: the latency knee should land on
        # or near it. The guide is detection-based context, not an assumption
        # baked into the measurement.
        line_size = None
        if machine:
            for c in machine.get("detected_caches", []):
                if c["type"] in ("data", "unified"):
                    line_size = c["line_size"]
                    break
        if line_size:
            ax.axvline(line_size, color="gray", ls=":", lw=1.2)
            ax.annotate(f"detected line size\n{line_size} B", xy=(line_size, ax.get_ylim()[1]),
                        xytext=(4, -12), textcoords="offset points",
                        fontsize=8, color="dimgray", va="top")

        # Observed knee: the smallest stride after which the cost stops
        # growing (ratio < 1.25). Labeled as an observation of this dataset.
        knee = None
        for i in range(len(ys) - 1):
            if ys[i + 1] < 1.25 * ys[i]:
                knee = i
                break
        if knee is not None:
            note = "growth stops (observed)"
            if mode == "throughput" and xs[knee] != 64:
                note += "\n(shifted by TLB/prefetch effects — see docs)"
            ax.annotate(f"{note}\nat {xs[knee]} B",
                        xy=(xs[knee], ys[knee]), xytext=(-95, -26),
                        textcoords="offset points", fontsize=8, color="firebrick",
                        arrowprops=dict(arrowstyle="->", color="firebrick", lw=1.0))

    fig.suptitle(title, fontsize=11)
    save(fig, args.out)


if __name__ == "__main__":
    main()
