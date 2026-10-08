"""Shared helpers for the cpu-cache-lab plot scripts (Stage 2)."""

import csv
import json
import math
import sys
from pathlib import Path


def require_matplotlib():
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        return plt
    except ImportError as exc:
        sys.exit("matplotlib is required for plotting (missing: %s).\n"
                 "Install it with:\n    pip install matplotlib numpy\n"
                 "The CSV results remain usable without it." % exc)


def load_csv(path):
    path = Path(path)
    if not path.exists():
        sys.exit(f"error: CSV not found: {path} — run the benchmark first")
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def load_machine(path):
    path = Path(path)
    if not path.exists():
        return None
    with path.open() as f:
        return json.load(f)


def human_bytes(n):
    for unit in ("B", "KiB", "MiB", "GiB"):
        if n < 1024 or unit == "GiB":
            return f"{int(n)} B" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} GiB"


def first_jump(values, ratio=1.5):
    """Index of the first value >= ratio * its predecessor; None if absent."""
    for i in range(1, len(values)):
        if values[i] >= ratio * values[i - 1]:
            return i
    return None


def save(fig, out_path):
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    print(f"wrote {out_path}")
