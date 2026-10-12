#!/usr/bin/env python3
"""Workload: sequential walk — one read per cache line, ascending.

    python workloads/sequential.py --region 8M --line-size 64 --out traces/sequential.trc
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from simulator import trace as tr  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--region", default="8M",
                    help="region to walk, accepts K/M/G suffixes [8M]")
    ap.add_argument("--line-size", type=lambda x: int(x, 0), default=64)
    ap.add_argument("--out", default="traces/sequential.trc")
    args = ap.parse_args()

    mult = {"K": 1024, "M": 1024**2, "G": 1024**3}
    region = args.region.upper()
    value = int(region[:-1]) * mult.get(region[-1], 1) if region[-1] in mult \
        else int(args.region, 0)

    n = tr.write_trace(args.out, tr.sequential(value, args.line_size),
                       comment=f"sequential walk, region={value}B, "
                               f"line={args.line_size}B")
    print(f"wrote {n} accesses -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
