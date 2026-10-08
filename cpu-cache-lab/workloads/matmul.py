#!/usr/bin/env python3
"""Workload: matmul access traces — the REAL stream of two loop orders.

Emits the exact R/W sequence of C = A·B for row-major n×n doubles, in the
naive `ijk` order or the streamed `ikj` order (see matmul/kernels.h). At
n=48 the naive trace has 3·n³ ≈ 332k accesses — big enough to show the
pattern, small enough to simulate quickly.

    python workloads/matmul.py --order ijk --n 48 --out traces/matmul_ijk.trc
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from simulator import trace as tr  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--order", choices=("ijk", "ikj"), default="ijk")
    ap.add_argument("--n", type=int, default=48,
                    help="matrix dimension (n^3 multiply-adds)")
    ap.add_argument("--line-size", type=lambda x: int(x, 0), default=64)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    out = args.out or f"traces/matmul_{args.order}.trc"
    gen = tr.matmul_ijk(args.n, args.line_size) if args.order == "ijk" \
        else tr.matmul_ikj(args.n, args.line_size)
    n = tr.write_trace(out, gen,
                       comment=f"matmul {args.order}, n={args.n} "
                               f"(A@0, B@{n*n*8:#x}, C@{2*n*n*8:#x})")
    print(f"wrote {n} accesses -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
