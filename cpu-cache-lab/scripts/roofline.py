#!/usr/bin/env python3
"""Roofline plot for the matmul ladder (Stage 5 of cpu-cache-lab).

Ceilings come from THIS machine's measurements, not from assumed spec
numbers (both can be overridden):

  * peak FLOP/s  = best GFLOP/s observed across the matmul rungs
                   (results/matmul.csv) — an *observed* ceiling;
  * bandwidth    = best streaming rate from the Stage-2 stride benchmark
                   (results/cache_line.csv, throughput mode, stride >= 64:
                   every access moves its own 64 B line).

Arithmetic intensity per rung is an ANALYTIC estimate of DRAM traffic
(the formulas are documented below and in docs/roofline.md); positions are
indicative — the actionable signal is the vertical gap to the roof and the
horizontal position relative to the ridge point.

Usage:
    python scripts/roofline.py [--peak-flops G] [--bandwidth GBS]
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from plot_common import load_csv, load_machine, require_matplotlib, save  # noqa: E402

plt = require_matplotlib()


def measured_ceilings(matmul_csv: str, cache_line_csv: str):
    """(peak_gflops, bandwidth_gbs) from the lab's own results."""
    peak = 0.0
    for r in load_csv(matmul_csv):
        if r["status"] == "ok":
            peak = max(peak, float(r["gflops_median"]))
    bw = 0.0
    for r in load_csv(cache_line_csv):
        if r["mode"] == "throughput" and int(r["stride_bytes"]) >= 64:
            # throughput mode, stride >= line: every access moves one line
            ns = float(r["median_ns_per_access"])
            bw = max(bw, 64.0 / ns)  # GB/s (64 B per ns = 1 GB/ms)
    return peak, bw


# Analytic DRAM-traffic models per rung (N = matrix size). Documented in
# docs/roofline.md; these are ESTIMATES — enough to place rungs on the
# memory-bound vs compute-bound sides of the ridge.
def analytic_ai(version: str, tile: int, n: int) -> float:
    flops = 2.0 * n ** 3
    if version == "naive-ijk":
        # B is walked down columns: 8 consecutive j share a line, so B's
        # line traffic is N/8 re-walks of the whole matrix per row of C.
        traffic = 8.0 * n ** 3
    elif version in ("ikj", "vectorized"):
        # B rows stream sequentially and are re-read per row of C; L2/L3
        # absorb most of it, L1 does not — use the L1-level traffic.
        traffic = 8.0 * n ** 3
    elif version == "tiled":
        # Per tile triple: 3 tiles of T*T elements feed T^3 MACs.
        t = max(1.0, float(tile or 64))
        traffic = (3.0 * t * t * 8.0) * (n ** 3 / t ** 3)
    elif version == "blocked":
        # Register-blocked with T=256 k-tiles: same tile model, T=256.
        traffic = (3.0 * 256.0 * 256.0 * 8.0) * (n ** 3 / 256.0 ** 3)
    elif version == "openmp":
        traffic = (3.0 * 256.0 * 256.0 * 8.0) * (n ** 3 / 256.0 ** 3)
    elif version == "blas":
        traffic = 3.0 * n * n * 8.0  # near-perfect blocking
    else:
        traffic = 8.0 * n ** 3
    return flops / traffic


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--matmul-csv", default="results/matmul.csv")
    ap.add_argument("--cache-line-csv", default="results/cache_line.csv")
    ap.add_argument("--machine", default="results/machine.json")
    ap.add_argument("--out", default="results/roofline.png")
    ap.add_argument("--csv-out", default="results/roofline.csv")
    ap.add_argument("--peak-flops", type=float, default=None,
                    help="peak GFLOP/s override (spec number); default: "
                         "best measured across matmul rungs")
    ap.add_argument("--bandwidth", type=float, default=None,
                    help="memory bandwidth override in GB/s; default: best "
                         "measured streaming rate from cache_line")
    args = ap.parse_args()

    machine = load_machine(args.machine)
    try:
        peak, bw = measured_ceilings(args.matmul_csv, args.cache_line_csv)
    except FileNotFoundError as exc:
        sys.exit(f"error: {exc} — run the matmul and cache_line benchmarks "
                 f"first")
    if args.peak_flops:
        peak = args.peak_flops
    if args.bandwidth:
        bw = args.bandwidth
    if peak <= 0 or bw <= 0:
        sys.exit("error: could not determine peak FLOP/s and bandwidth — "
                 "provide --peak-flops and --bandwidth")
    ridge_ai = peak / bw

    # Collect rung points at the largest N measured.
    rows = load_csv(args.matmul_csv)
    n = max(int(r["n"]) for r in rows)
    points = {}
    for r in rows:
        if int(r["n"]) != n or r["status"] != "ok":
            continue
        v = r["version"]
        g = float(r["gflops_median"])
        if v not in points or g > points[v][0]:
            points[v] = (g, int(r["tile"]))

    fig, ax = plt.subplots(figsize=(10, 6.5))
    ais = [10 ** k / 100 for k in range(0, 55, 2)]  # 0.01 .. ~300 log-spaced
    ais = [0.01 * (300 / 0.01) ** (i / 60) for i in range(61)]
    roof = [min(peak, a * bw) for a in ais]
    ax.plot(ais, roof, "-", color="black", lw=2,
            label=f"roofline: min({peak:.1f} GFLOP/s, {bw:.1f} GB/s)")

    order = ["naive-ijk", "ikj", "tiled", "vectorized", "blocked", "openmp",
             "blas"]
    labels = {"naive-ijk": "0 naive ijk", "ikj": "1 ikj",
              "tiled": "2 tiled", "vectorized": "3 vectorized",
              "blocked": "4 reg-block+pack", "openmp": "5 OpenMP",
              "blas": "6 BLAS"}
    csv_rows = [["version", "N", "arithmetic_intensity_flops_per_byte",
                 "gflops_median", "roof_gflops_at_ai"]]
    for v in order:
        if v not in points:
            continue
        g, tile = points[v]
        ai = analytic_ai(v, tile, n)
        roof_at = min(peak, ai * bw)
        bound = "memory-bound" if g < 0.8 * roof_at and ai < ridge_ai else (
            "compute-bound" if ai >= ridge_ai else "below roof (kernel/latency limited)")
        ax.plot([ai], [g], "o", ms=9,
                color="#d62728" if bound == "memory-bound" else "#1f77b4")
        ax.annotate(f"{labels.get(v, v)}\n{g:.1f} GF/s, AI~{ai:.2f}\n({bound})",
                    xy=(ai, g), xytext=(6, -16), textcoords="offset points",
                    fontsize=7.5)
        ax.plot([ai, ai], [0, roof_at], ":", color="gray", lw=0.8)
        csv_rows.append([v, n, f"{ai:.4f}", f"{g:.2f}", f"{roof_at:.2f}"])
    ax.axvline(ridge_ai, color="gray", ls="--", lw=1.0)
    ax.annotate(f"ridge: AI = {ridge_ai:.2f}\n(peak / bandwidth)",
                xy=(ridge_ai, peak * 0.55), fontsize=8, color="dimgray",
                ha="left")

    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("arithmetic intensity (FLOP / byte, log)")
    ax.set_ylabel("performance (GFLOP/s, log)")
    cpu = machine.get("cpu_brand", "") if machine else ""
    ax.set_title(f"Roofline — {cpu}\n"
                 "ceilings MEASURED on this machine (override with "
                 "--peak-flops / --bandwidth); AI is analytic (see docs)",
                 fontsize=9)
    ax.grid(True, which="both", alpha=0.3)
    ax.set_ylim(bottom=0.1)

    out_csv = Path(args.csv_out)
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with open(out_csv, "w", newline="") as f:
        w = csv.writer(f)
        w.writerows(csv_rows)

    fig.tight_layout()
    save(fig, args.out)
    print(f"ceilings: peak {peak:.2f} GFLOP/s, bandwidth {bw:.2f} GB/s, "
          f"ridge AI {ridge_ai:.2f} flop/byte")
    return 0


if __name__ == "__main__":
    sys.exit(main())
