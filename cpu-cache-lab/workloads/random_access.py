#!/usr/bin/env python3
"""Workload: seeded uniform random accesses within a region (line-aligned).

    python workloads/random_access.py --region 64M --count 500000 \
        --seed 42 --out traces/random.trc
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from simulator import trace as tr  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--region", default="64M")
    ap.add_argument("--count", type=int, default=500000)
    ap.add_argument("--line-size", type=lambda x: int(x, 0), default=64)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default="traces/random.trc")
    args = ap.parse_args()

    region = args.region.upper()
    mult = {"K": 1024, "M": 1024**2, "G": 1024**3}
    value = int(region[:-1]) * mult.get(region[-1], 1) if region[-1] in mult \
        else int(args.region, 0)

    n = tr.write_trace(args.out,
                       tr.random_access(value, args.count, args.line_size,
                                        seed=args.seed),
                       comment=f"random accesses, region={value}B, "
                               f"count={args.count}, seed={args.seed}")
    print(f"wrote {n} accesses -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
