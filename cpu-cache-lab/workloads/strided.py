#!/usr/bin/env python3
"""Workload: strided walk — one read every `stride` bytes.

Stride 64 touches every line; stride 128 skips alternate lines; stride 4096
touches one line per page. The default (128) skips every other line, which
is the canonical case a next-line prefetcher cannot cover.

    python workloads/strided.py --region 8M --stride 128 --out traces/strided128.trc
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from simulator import trace as tr  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--region", default="8M")
    ap.add_argument("--stride", type=lambda x: int(x, 0), default=128)
    ap.add_argument("--line-size", type=lambda x: int(x, 0), default=64)
    ap.add_argument("--out", default="traces/strided128.trc")
    args = ap.parse_args()

    region = args.region.upper()
    mult = {"K": 1024, "M": 1024**2, "G": 1024**3}
    value = int(region[:-1]) * mult.get(region[-1], 1) if region[-1] in mult \
        else int(args.region, 0)
    if args.stride < args.line_size:
        print("error: --stride must be >= --line-size", file=sys.stderr)
        return 2

    n = tr.write_trace(args.out, tr.strided(value, args.stride, args.line_size),
                       comment=f"strided walk, region={value}B, "
                               f"stride={args.stride}B")
    print(f"wrote {n} accesses -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
