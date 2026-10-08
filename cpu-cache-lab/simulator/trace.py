#!/usr/bin/env python3
"""Trace-format library for the cpu-cache-lab simulator (Stage 4).

Format: one access per line, "R 0xADDR" or "W 0xADDR"; '#' comments and
blank lines are allowed. The generators here are shared by the workload
CLIs in workloads/ and by the tests.
"""

from __future__ import annotations

import random
from pathlib import Path
from typing import Iterator


def read_trace(path: str | Path) -> list[tuple[bool, int]]:
    """Reads a trace file into [(is_write, address), ...].

    Malformed lines raise ValueError with the line number — errors are
    reported, never skipped silently.
    """
    entries: list[tuple[bool, int]] = []
    with open(path, "r", encoding="utf-8") as f:
        for lineno, raw in enumerate(f, start=1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) != 2 or parts[0].upper() not in ("R", "W"):
                raise ValueError(
                    f"{path}:{lineno}: expected 'R <addr>' or 'W <addr>', "
                    f"got: {line!r}")
            try:
                addr = int(parts[1], 0)  # accepts 0x hex and decimal
            except ValueError:
                raise ValueError(f"{path}:{lineno}: bad address {parts[1]!r}")
            if addr < 0:
                raise ValueError(f"{path}:{lineno}: negative address")
            entries.append((parts[0].upper() == "W", addr))
    return entries


def write_trace(path: str | Path, accesses: Iterator[tuple[bool, int]],
                comment: str | None = None) -> int:
    """Writes (is_write, address) pairs; returns the number of lines written."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    n = 0
    with open(path, "w", encoding="utf-8") as f:
        if comment:
            for line in comment.splitlines():
                f.write(f"# {line}\n")
        for is_write, addr in accesses:
            f.write(f"{'W' if is_write else 'R'} 0x{addr:x}\n")
            n += 1
    return n


def sequential(region_bytes: int, line_size: int = 64,
               is_write: bool = False) -> Iterator[tuple[bool, int]]:
    """One access per line, ascending — the prefetcher's dream."""
    for addr in range(0, region_bytes, line_size):
        yield is_write, addr


def window_sweep(window_bytes: int, passes: int, line_size: int = 64,
                 is_write: bool = False) -> Iterator[tuple[bool, int]]:
    """Cyclic sweeps over a fixed working-set window: the working-set trace.

    Repeatedly walks lines 0..W once per pass. A cache larger than W holds
    the whole window (hit rate ~1 after the first pass); a smaller cache
    thrashes every pass (hit rate ~0). This is the simulator-side analog of
    the Stage-1 pointer-chase staircase.
    """
    for _ in range(passes):
        for addr in range(0, window_bytes, line_size):
            yield is_write, addr


def strided(region_bytes: int, stride: int, line_size: int = 64,
            is_write: bool = False) -> Iterator[tuple[bool, int]]:
    """Every stride bytes; stride > line_size skips whole lines."""
    for addr in range(0, region_bytes, stride):
        yield is_write, addr


def random_access(region_bytes: int, count: int, line_size: int = 64,
                  seed: int = 42, is_write: bool = False,
                  aligned: bool = True) -> Iterator[tuple[bool, int]]:
    """Seeded uniform random accesses within the region (line-aligned by
    default so every access maps to exactly one cache line)."""
    rng = random.Random(seed)
    top = region_bytes - line_size if aligned else region_bytes - 1
    for _ in range(count):
        addr = rng.randrange(0, top + 1, line_size) if aligned \
            else rng.randrange(0, region_bytes)
        yield is_write, addr


def matmul_ijk(n: int, line_size: int = 64) -> Iterator[tuple[bool, int]]:
    """The REAL access stream of naive ijk matmul (C = A·B, row-major).

    Emitted exactly as the loops run: for each (i, j) a read of C[i][j] is
    implicit in the sum (counted once), then per k: read A[i][k], read
    B[k][j], and one write of C[i][j] at the end.
    """
    base_a = 0
    base_b = n * n * 8
    base_c = 2 * n * n * 8
    for i in range(n):
        for j in range(n):
            yield False, base_c + (i * n + j) * 8  # C[i][j] will be written
            for k in range(n):
                yield False, base_a + (i * n + k) * 8
                yield False, base_b + (k * n + j) * 8
            yield True, base_c + (i * n + j) * 8


def matmul_ikj(n: int, line_size: int = 64) -> Iterator[tuple[bool, int]]:
    """The REAL access stream of ikj matmul: per (i, k) one read of A[i][k],
    then a streaming pass over B's row k and C's row i (read + write per
    element... the += form reads C then writes it once per (i,k))."""
    base_a = 0
    base_b = n * n * 8
    base_c = 2 * n * n * 8
    for i in range(n):
        for k in range(n):
            yield False, base_a + (i * n + k) * 8
            for j in range(n):
                yield False, base_b + (k * n + j) * 8
                yield False, base_c + (i * n + j) * 8
                yield True, base_c + (i * n + j) * 8


def _row_bases(n: int) -> tuple[int, int, int]:
    return 0, n * n * 8, 2 * n * n * 8


def matmul_row_ijk(n: int) -> Iterator[tuple[bool, int]]:
    """One C row (i = 0) of naive ijk: for j, for k.

    A's row (8 KiB at n=1024) is re-read every j and stays cached, but B is
    walked DOWN ITS COLUMNS: n lines n*8 bytes apart — at n=1024 that is a
    64 KiB working set per column, larger than a 48 KiB L1d. This is the
    exact pattern that made rung 0 slow (docs/matmul.md).
    """
    base_a, base_b, base_c = _row_bases(n)
    for j in range(n):
        for k in range(n):
            yield False, base_a + k * 8
            yield False, base_b + (k * n + j) * 8
        yield True, base_c + j * 8


def matmul_row_ikj(n: int) -> Iterator[tuple[bool, int]]:
    """One C row (i = 0) of ikj: for k, stream B's row k and C's row j.

    Every inner loop is sequential: B's row and C's row stream through the
    cache once per k. Same flops, entirely different memory behavior.
    """
    base_a, base_b, base_c = _row_bases(n)
    for k in range(n):
        yield False, base_a + k * 8
        for j in range(n):
            yield False, base_b + (k * n + j) * 8
            yield False, base_c + j * 8
            yield True, base_c + j * 8
