#!/usr/bin/env python3
"""Configurable cache simulator (Stage 4 of cpu-cache-lab).

Models one cache level: geometry (size / line size / associativity),
replacement (LRU / FIFO / random, seeded), and write behavior
(write-back vs write-through, write-allocate vs no-write-allocate).
Built on top of it: multi-level caches with recursive AMAT, a degree-1
next-line prefetcher, and the classic compulsory/capacity/conflict miss
classification.

Design notes:

* Addresses are plain integers. Decomposition uses DIVISION and MODULO, not
  bit masks, so non-power-of-two geometries (e.g. 3 sets) work exactly; for
  power-of-two hardware the two are equivalent (hardware uses bit slices).

* The prefetcher inserts the successor line (address + line_size) after
  every access, degree 1. A prefetch may itself evict a useful line — that
  is the mechanism by which prefetching HURTS some workloads.

* Miss classification (per miss): "compulsory" if the block address was
  never touched before in this trace; otherwise the request is replayed
  against a shadow FULLY-ASSOCIATIVE cache of the same total capacity —
  shadow hit => "conflict" (the set structure caused it), shadow miss =>
  "capacity". Limitations (see docs/simulator.md): the shadow shares the
  replacement policy, so pathological replacement behavior blurs the
  capacity/conflict boundary; the classification is per-trace, not a
  property of the program; and the shadow costs memory for every unique
  block.

* Multi-level: an L1 miss (read or write) becomes an L2 access; an L1 dirty
  eviction becomes an L2 write. L2 dirty evictions count as memory
  writebacks. There is no inclusion enforcement and no back-invalidation —
  a deliberate simplification, documented for the reader.

CLI (matches the lab brief):

    python simulator/cache.py --size 32768 --ways 8 --line-size 64 \
        --replacement lru --trace traces/seq.trc

Output: the brief's stats (accesses, hits, misses, hit rate, miss rate,
evictions, writebacks) plus miss classification, AMAT, and --json export.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from collections import OrderedDict
from dataclasses import dataclass, field, asdict
from pathlib import Path

from simulator.trace import read_trace  # the trace format lives in trace.py

# --------------------------------------------------------------------------
# Trace format: lines of "R 0xADDR" / "W 0xADDR" ('#' comments and blanks ok).
# The reader/writer are defined in simulator.trace; read_trace is re-exported
# here for convenience.
# --------------------------------------------------------------------------


# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

REPLACEMENTS = ("lru", "fifo", "random")
WRITE_POLICIES = ("write_back", "write_through")
ALLOCATE_POLICIES = ("write_allocate", "no_write_allocate")


@dataclass
class CacheConfig:
    size_bytes: int          # total data capacity
    line_size: int
    ways: int
    replacement: str = "lru"
    write_policy: str = "write_back"
    allocate: str = "write_allocate"
    hit_time_ns: float = 1.0

    def __post_init__(self) -> None:
        if self.size_bytes <= 0 or self.line_size <= 0 or self.ways <= 0:
            raise ValueError("size, line_size and ways must be positive")
        if self.line_size > self.size_bytes:
            raise ValueError("line_size cannot exceed size_bytes")
        if self.size_bytes % (self.line_size * self.ways) != 0:
            raise ValueError(
                f"size_bytes ({self.size_bytes}) must be a multiple of "
                f"line_size*ways ({self.line_size * self.ways})")
        if self.replacement not in REPLACEMENTS:
            raise ValueError(f"replacement must be one of {REPLACEMENTS}")
        if self.write_policy not in WRITE_POLICIES:
            raise ValueError(f"write_policy must be one of {WRITE_POLICIES}")
        if self.allocate not in ALLOCATE_POLICIES:
            raise ValueError(f"allocate must be one of {ALLOCATE_POLICIES}")

    @property
    def num_sets(self) -> int:
        return self.size_bytes // (self.line_size * self.ways)

    def decompose(self, addr: int) -> tuple[int, int, int]:
        """Returns (offset, set_index, tag) for an address.

        Modulo-based so any geometry works; identical to bit-slicing when
        everything is a power of two.
        """
        offset = addr % self.line_size
        block = addr // self.line_size
        set_index = block % self.num_sets
        tag = block // self.num_sets
        return offset, set_index, tag

    def label(self) -> str:
        kb = self.size_bytes
        human = f"{kb}B" if kb < 1024 else (
            f"{kb // 1024}KiB" if kb < 1024 * 1024 else f"{kb // (1024 * 1024)}MiB")
        return (f"{human}/{self.ways}w/L{self.line_size}/{self.replacement}/"
                f"{self.write_policy}/{self.allocate}")


@dataclass
class CacheStats:
    accesses: int = 0
    reads: int = 0
    writes: int = 0
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    writebacks: int = 0       # dirty lines evicted (write_back) / to memory
    memory_writes: int = 0    # write-through stores + dirty evictions
    prefetches: int = 0       # next-line prefetch inserts
    compulsory: int = 0
    capacity: int = 0
    conflict: int = 0

    def hit_rate(self) -> float:
        return self.hits / self.accesses if self.accesses else 0.0

    def miss_rate(self) -> float:
        return self.misses / self.accesses if self.accesses else 0.0

    def as_dict(self) -> dict:
        d = asdict(self)
        d["hit_rate"] = self.hit_rate()
        d["miss_rate"] = self.miss_rate()
        return d


# --------------------------------------------------------------------------
# One cache level
# --------------------------------------------------------------------------

class Cache:
    """One cache level. `classify` enables miss classification (needs a
    shadow fully-associative cache; only meaningful on the top level)."""

    def __init__(self, config: CacheConfig, seed: int = 42,
                 classify: bool = False, prefetch: bool = False):
        self.cfg = config
        self.rng = random.Random(seed)
        self.classify = classify
        self.prefetch = prefetch
        # Each set: OrderedDict tag -> dirty flag.
        # LRU: touch moves to MRU end, evict from LRU front.
        # FIFO: touch does NOT reorder, evict oldest-inserted (same call,
        #       the difference is only whether hits move the line).
        self.sets: list[OrderedDict[int, bool]] = [
            OrderedDict() for _ in range(config.num_sets)]
        self.stats = CacheStats()
        self._seen_blocks: set[int] = set()
        # Shadow fully-associative cache for classification: same capacity,
        # same replacement, one set.
        if classify:
            shadow_cfg = CacheConfig(
                size_bytes=config.size_bytes, line_size=config.line_size,
                ways=max(1, config.size_bytes // config.line_size),
                replacement=config.replacement)
            self._shadow = Cache(shadow_cfg, seed=seed, classify=False)

    # -- core ---------------------------------------------------------------

    def _evict_victim(self, set_index: int) -> int | None:
        """Picks and removes a line from the set; returns its tag.

        LRU and FIFO both evict the front of the insertion/use order; they
        differ only in whether HITS reorder the line (see access()).
        """
        s = self.sets[set_index]
        if not s:
            return None
        if self.cfg.replacement == "random":
            tag = self.rng.choice(list(s.keys()))
            del s[tag]
            return tag
        tag, _ = s.popitem(last=False)
        return tag

    def access(self, addr: int, is_write: bool) -> bool:
        """Simulates one access; returns True on hit."""
        cfg = self.cfg
        _, set_index, tag = cfg.decompose(addr)
        s = self.sets[set_index]
        st = self.stats
        st.accesses += 1
        if is_write:
            st.writes += 1
        else:
            st.reads += 1

        block = addr // cfg.line_size
        if s and tag in s:
            st.hits += 1
            if cfg.replacement == "lru":
                s.move_to_end(tag)  # FIFO deliberately skips this
            if is_write:
                if cfg.write_policy == "write_back":
                    s[tag] = True  # mark dirty
                else:  # write-through: straight to memory
                    st.memory_writes += 1
            if self.classify:
                # The shadow must see EVERY access (hits included) so its
                # replacement state mirrors a real fully-associative cache.
                self._shadow.access(addr, is_write)
            if self.prefetch:
                self._prefetch_next(addr)
            return True

        # ---- miss ----
        st.misses += 1
        shadow_hit = False
        if self.classify:
            # Replay against the shadow first (it must see this access too).
            shadow_hit = self._shadow.access(addr, is_write)
            if block not in self._seen_blocks:
                st.compulsory += 1
            elif shadow_hit:
                st.conflict += 1   # fits in FA of same capacity: set conflict
            else:
                st.capacity += 1   # misses even fully associative
        self._seen_blocks.add(block)

        dirty = False
        if is_write:
            if cfg.allocate == "write_allocate":
                dirty = cfg.write_policy == "write_back"
                if cfg.write_policy == "write_through":
                    st.memory_writes += 1
            else:  # no-write-allocate: the store bypasses the cache
                st.memory_writes += 1
                if self.prefetch:
                    self._prefetch_next(addr)
                return False

        if len(s) >= cfg.ways:
            victim_tag, victim_dirty = s.popitem(last=False)
            st.evictions += 1
            if victim_dirty:
                st.writebacks += 1
                st.memory_writes += 1
        s[tag] = dirty

        if self.prefetch:
            self._prefetch_next(addr)
        return False

    def _prefetch_next(self, addr: int) -> None:
        """Degree-1 next-line prefetch: fetch addr + line_size if absent."""
        next_addr = (addr // self.cfg.line_size + 1) * self.cfg.line_size
        _, set_index, tag = self.cfg.decompose(next_addr)
        s = self.sets[set_index]
        if tag in s:
            return
        self.stats.prefetches += 1
        if len(s) >= self.cfg.ways:
            victim_tag, victim_dirty = s.popitem(last=False)
            self.stats.evictions += 1
            if victim_dirty:
                self.stats.writebacks += 1
                self.stats.memory_writes += 1
        s[tag] = False  # prefetched lines arrive clean

    # -- results ------------------------------------------------------------

    def run(self, trace: list[tuple[bool, int]]) -> CacheStats:
        for is_write, addr in trace:
            self.access(addr, is_write)
        return self.stats

    def hit_rate(self) -> float:
        return self.stats.hits / self.stats.accesses if self.stats.accesses else 0.0

    def miss_rate(self) -> float:
        return self.stats.misses / self.stats.accesses if self.stats.accesses else 0.0


# --------------------------------------------------------------------------
# Multi-level: L1 -> L2 -> memory, recursive AMAT
# --------------------------------------------------------------------------

@dataclass
class MultiLevelResult:
    levels: list[CacheStats]
    amat_ns: float
    level_amats: list[float]   # AMAT seen from each level downward


def run_multilevel(configs: list[CacheConfig], trace: list[tuple[bool, int]],
                   memory_time_ns: float, seed: int = 42,
                   prefetch_top: bool = False) -> MultiLevelResult:
    """Runs the trace through stacked caches.

    AMAT uses the recursive formulation (not a hard-coded two-level form):
        AMAT_i = hit_time_i + miss_rate_i * AMAT_{i+1}
        AMAT_last = hit_time_last + miss_rate_last * memory_time
    i.e. AMAT_1 = t1 + m1*(t2 + m2*(t3 + m3*mem)) for three levels.
    """
    if not configs:
        raise ValueError("need at least one cache level")
    levels = [Cache(c, seed=seed, prefetch=(prefetch_top and i == 0))
              for i, c in enumerate(configs)]

    for is_write, addr in trace:
        # L1 first; on a miss, walk down the remaining levels with the same
        # request. A dirty L1 eviction pushing data into L2 is modeled
        # abstractly: L2 sees one access per L1 miss (fill + possible write
        # combined). No inclusion enforcement, no back-invalidation — a
        # deliberate, documented simplification.
        if levels[0].access(addr, is_write):
            continue
        for lvl in levels[1:]:
            if lvl.access(addr, is_write):
                break
        # If no level hit, the data comes from memory — its cost enters via
        # memory_time in the AMAT, not as a separate event.

    # ---- AMAT (recursive) ----
    amat_next = memory_time_ns
    level_amats = []
    for lvl in reversed(levels):
        amat_next = lvl.cfg.hit_time_ns + lvl.miss_rate() * amat_next
        level_amats.append(amat_next)
    level_amats.reverse()

    return MultiLevelResult(levels=[l.stats for l in levels],
                            amat_ns=amat_next, level_amats=level_amats)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Configurable cache simulator (cpu-cache-lab stage 4)")
    p.add_argument("--trace", required=True,
                   help="trace file with 'R 0xADDR' / 'W 0xADDR' lines")
    p.add_argument("--size", type=lambda x: int(x, 0), default=32768,
                   help="cache size in bytes [32768]")
    p.add_argument("--ways", type=int, default=8,
                   help="associativity [8]")
    p.add_argument("--line-size", type=lambda x: int(x, 0), default=64,
                   help="line size in bytes [64]")
    p.add_argument("--replacement", choices=REPLACEMENTS, default="lru")
    p.add_argument("--write-policy", choices=WRITE_POLICIES,
                   default="write_back")
    p.add_argument("--allocate", choices=ALLOCATE_POLICIES,
                   default="write_allocate")
    p.add_argument("--hit-time", type=float, default=1.0,
                   help="this level's hit time in ns [1.0]")
    p.add_argument("--memory-time", type=float, default=100.0,
                   help="memory access time in ns (for AMAT) [100.0]")
    p.add_argument("--prefetch", action="store_true",
                   help="enable the degree-1 next-line prefetcher")
    p.add_argument("--seed", type=int, default=42,
                   help="seed for random replacement [42]")
    p.add_argument("--no-classify", action="store_true",
                   help="skip compulsory/capacity/conflict classification")
    p.add_argument("--l2-size", type=lambda x: int(x, 0), default=None,
                   help="optional L2 size in bytes (enables two levels)")
    p.add_argument("--l2-ways", type=int, default=8)
    p.add_argument("--l2-hit-time", type=float, default=10.0)
    p.add_argument("--json", default=None,
                   help="write results as JSON to this path")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    trace = read_trace(args.trace)
    if not trace:
        print(f"error: trace {args.trace} contains no accesses", file=sys.stderr)
        return 2

    cfg = CacheConfig(size_bytes=args.size, line_size=args.line_size,
                      ways=args.ways, replacement=args.replacement,
                      write_policy=args.write_policy, allocate=args.allocate,
                      hit_time_ns=args.hit_time)

    if args.l2_size:
        l2 = CacheConfig(size_bytes=args.l2_size, line_size=args.line_size,
                         ways=args.l2_ways, replacement=args.replacement,
                         write_policy=args.write_policy,
                         allocate=args.allocate,
                         hit_time_ns=args.l2_hit_time)
        result = run_multilevel([cfg, l2], trace,
                                memory_time_ns=args.memory_time,
                                seed=args.seed, prefetch_top=args.prefetch)
        l1, l2s = result.levels
        print(f"trace: {args.trace} ({len(trace)} accesses)")
        print(f"L1 {cfg.label()}  hit_time={cfg.hit_time_ns}ns")
        print(f"  accesses={l1.accesses} hits={l1.hits} misses={l1.misses} "
              f"hit_rate={l1.hits / l1.accesses:.4f} "
              f"miss_rate={l1.misses / l1.accesses:.4f}")
        print(f"  evictions={l1.evictions} writebacks={l1.writebacks} "
              f"memory_writes={l1.memory_writes} prefetches={l1.prefetches}")
        print(f"L2 {l2.label()}  hit_time={l2.hit_time_ns}ns")
        print(f"  accesses={l2s.accesses} hits={l2s.hits} misses={l2s.misses} "
              f"hit_rate={l2s.hits / l2s.accesses:.4f} "
              f"miss_rate={l2s.misses / l2s.accesses:.4f}")
        print(f"  evictions={l2s.evictions} writebacks={l2s.writebacks} "
              f"memory_writes={l2s.memory_writes}")
        print(f"AMAT (recursive): {result.amat_ns:.3f} ns "
              f"(L1: {result.level_amats[0]:.3f}, "
              f"L2: {result.level_amats[1]:.3f})")
        payload = {"trace": str(args.trace), "n_accesses": len(trace),
                   "l1": l1.as_dict(), "l2": l2s.as_dict(),
                   "amat_ns": result.amat_ns,
                   "level_amats_ns": result.level_amats}
    else:
        cache = Cache(cfg, seed=args.seed,
                      classify=not args.no_classify, prefetch=args.prefetch)
        st = cache.run(trace)
        print(f"trace: {args.trace} ({len(trace)} accesses)")
        print(f"cache: {cfg.label()}  hit_time={cfg.hit_time_ns}ns")
        print(f"  accesses={st.accesses} reads={st.reads} writes={st.writes}")
        print(f"  hits={st.hits} misses={st.misses} "
              f"hit_rate={st.hits / st.accesses:.4f} "
              f"miss_rate={st.misses / st.accesses:.4f}")
        print(f"  evictions={st.evictions} writebacks={st.writebacks} "
              f"memory_writes={st.memory_writes} prefetches={st.prefetches}")
        if not args.no_classify:
            total = st.compulsory + st.capacity + st.conflict
            print(f"  misses by class: compulsory={st.compulsory} "
                  f"capacity={st.capacity} conflict={st.conflict} "
                  f"(sum={total} of {st.misses} misses)")
        amat = cfg.hit_time_ns + cache.miss_rate() * args.memory_time
        print(f"AMAT: {amat:.3f} ns  "
              f"= {cfg.hit_time_ns} + {cache.miss_rate():.4f} * {args.memory_time}")
        payload = {"trace": str(args.trace), "n_accesses": len(trace),
                   "config": asdict(cfg), "stats": st.as_dict(), "amat_ns": amat}

    if args.json:
        Path(args.json).parent.mkdir(parents=True, exist_ok=True)
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"wrote {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
