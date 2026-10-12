#!/usr/bin/env python3
"""Plot pointer-chase latency vs working-set size (Stage 1 of cpu-cache-lab).

Reads results/pointer_chase.csv (written by benchmarks/pointer_chase.cpp) and,
optionally, results/machine.json for context. Writes a PNG with a log2 x-axis;
if the machine context is available, vertical guides are drawn at the
*detected* cache sizes so the measured latency steps can be compared against
the reported hardware (guides are labeled "detected", not assumed truth).

Usage:
    python scripts/plot_pointer_chase.py
    python scripts/plot_pointer_chase.py --csv results/pointer_chase.csv \
        --machine results/machine.json --out results/pointer_chase.png --show
"""

import argparse
import csv
import json
import math
import sys
from pathlib import Path


def human_bytes(n: float) -> str:
    for unit in ("B", "KiB", "MiB", "GiB"):
        if n < 1024 or unit == "GiB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024
    return f"{n:.1f} GiB"  # unreachable; keeps linters calm


def load_csv(path: Path):
    sizes, medians, mins = [], [], []
    with path.open(newline="") as f:
        for row in csv.DictReader(f):
            sizes.append(int(row["size_bytes"]))
            medians.append(float(row["median_ns"]))
            mins.append(float(row["min_ns"]))
    if not sizes:
        sys.exit(f"error: {path} contains no data rows")
    return sizes, medians, mins


def load_machine(path: Path):
    if not path.exists():
        return None
    with path.open() as f:
        return json.load(f)


def find_knees(sizes, medians, min_jump=1.30, max_size_jump=1.7, max_knees=3):
    """Sizes where measured latency jumped sharply over a small size increase.

    This is a description of THIS dataset (hence 'observed'), not a claim that
    the jump equals a cache boundary — TLB effects and page mapping can also
    produce steps.
    """
    jumps = []
    for i in range(1, len(sizes)):
        lat_ratio = medians[i] / medians[i - 1]
        size_ratio = sizes[i] / sizes[i - 1]
        if lat_ratio >= min_jump and size_ratio <= max_size_jump:
            jumps.append((lat_ratio, sizes[i]))
    # strongest first, merged so annotations don't crowd within 2x of each other
    jumps.sort(reverse=True)
    picked = []
    for ratio, s in jumps:
        if all(abs(math.log2(s / s2)) > 1.0 for _, s2 in picked):
            picked.append((ratio, s))
    return sorted(picked, key=lambda t: t[1])[:max_knees]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", default="results/pointer_chase.csv",
                    help="benchmark CSV [results/pointer_chase.csv]")
    ap.add_argument("--machine", default="results/machine.json",
                    help="machine context JSON; missing file = no guides")
    ap.add_argument("--out", default="results/pointer_chase.png",
                    help="output PNG [results/pointer_chase.png]")
    ap.add_argument("--show", action="store_true",
                    help="also open the plot in a window")
    args = ap.parse_args()

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from matplotlib.ticker import FixedLocator, FuncFormatter, NullFormatter
    except ImportError as exc:
        sys.exit("matplotlib is required for plotting (missing: %s).\n"
                 "Install it with:\n    pip install matplotlib numpy\n"
                 "The CSV results remain usable without it." % exc)

    csv_path, machine_path, out_path = Path(args.csv), Path(args.machine), Path(args.out)
    if not csv_path.exists():
        sys.exit(f"error: CSV not found: {csv_path} — run the benchmark first")
    sizes, medians, mins = load_csv(csv_path)
    machine = load_machine(machine_path)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(sizes, medians, "o-", color="#1f77b4", lw=1.8, ms=4.5,
            label="median latency")
    ax.plot(sizes, mins, "s--", color="#2ca02c", lw=1.2, ms=3.5, alpha=0.8,
            label="min latency (best repetition)")

    ax.set_xscale("log", base=2)
    k0, k1 = int(math.log2(sizes[0])), int(math.log2(sizes[-1]))
    # Label every second octave — 17 labeled octaves would collide.
    ax.xaxis.set_major_locator(FixedLocator([2 ** k for k in range(k0, k1 + 1, 2)]))
    ax.xaxis.set_major_formatter(FuncFormatter(lambda x, _: human_bytes(x)))
    ax.xaxis.set_minor_locator(FixedLocator([2 ** k for k in range(k0, k1 + 1)]))
    ax.xaxis.set_minor_formatter(NullFormatter())
    ax.set_xlabel("working-set size (bytes, log scale)")
    ax.set_ylabel("latency per dependent load (ns)")
    ax.set_ylim(bottom=0)
    ax.grid(True, which="both", axis="both", alpha=0.3)
    ax.legend(loc="lower right")

    # Detected cache sizes as context. Reported by the OS/CPUDID, not assumed;
    # a step should appear at or NEAR them (hybrid CPUs and shared L3 shift things).
    if machine:
        seen = set()
        for c in machine.get("detected_caches", []):
            if c["type"] == "instruction":
                continue  # this benchmark only walks data
            key = (c["level"], c["size_bytes"])
            if key in seen:
                continue
            seen.add(key)
            ax.axvline(c["size_bytes"], color="gray", ls=":", lw=1.2, alpha=0.8)
            ax.annotate(f"L{c['level']}{c['type'][0]} {human_bytes(c['size_bytes'])}\n(detected)",
                        xy=(c["size_bytes"], ax.get_ylim()[1]),
                        xytext=(c["size_bytes"] * 1.08, 0.96),
                        textcoords=("data", "axes fraction"),
                        fontsize=7.5, color="dimgray", va="top")

        # Observed knee points: measured jumps in THIS dataset.
        for ratio, s in find_knees(sizes, medians):
            idx = sizes.index(s)
            ax.annotate(f"step x{ratio:.1f} at {human_bytes(s)}\n(observed)",
                        xy=(s, medians[idx]),
                        xytext=(-90, 18), textcoords="offset points",
                        fontsize=7.5,
                        arrowprops=dict(arrowstyle="->", color="firebrick",
                                        lw=1.0),
                        color="firebrick")

        title_cpu = machine.get("cpu_brand", "")
        if title_cpu:
            fig.suptitle(f"Memory latency vs working-set size — {title_cpu}",
                         fontsize=11)
        ax.set_title("randomized pointer chasing, pinned core, "
                     f"seed={machine.get('seed', '?')} "
                     f"(build: {machine.get('compiler', '?')})",
                     fontsize=8.5, color="dimgray")

        # Right axis in TSC cycles, same curve — purely a unit conversion.
        tsc = machine.get("tsc_cycles_per_second")
        if tsc:
            ax2 = ax.twinx()
            ax2.set_ylim(bottom=0, top=ax.get_ylim()[1] * tsc / 1e9)
            ax2.set_ylabel("latency (nominal TSC cycles — not turbo frequency)",
                           color="dimgray")
            ax2.tick_params(axis="y", colors="dimgray")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    print(f"wrote {out_path}")
    if args.show:
        plt.show()


if __name__ == "__main__":
    main()
