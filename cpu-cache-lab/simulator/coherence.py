#!/usr/bin/env python3
"""Cache-coherence simulator (Stage 5 of cpu-cache-lab): MSI and MESI.

Model: N cores, each with a write-back cache holding whole BLOCKS (a block
is a cache line — block granularity is exactly what makes false sharing
real). All bus operations are ATOMIC and serialized; every cache snoops the
bus and updates state. Values are tracked so the simulator can VERIFY that
every read returns the most recently written value.

Protocols (transitions are written out explicitly in read()/write()):

  MSI:  I --BusRd--> S          I --BusRdX--> M          S --BusUpgr--> M
        The M holder flushes (writeback + cache-to-cache) on every BusRd /
        BusRdX by another core.
  MESI: adds E (exclusive-clean): a cold READ with no other copy loads E
        silently; writing an E line needs NO bus operation (E -> M silent) —
        the private-data optimization. S -> M still needs BusUpgr; M and E
        supply data cache-to-cache on snoops.

Tracked per run: bus reads / read-exclusive / upgrades, invalidations,
cache-to-cache transfers, cold vs coherence misses, memory (writeback)
writes. Invariants are checked after EVERY operation:
  * at most one M; at most one E;
  * if a copy is M or E, every other copy is I;
  * all valid copies (and memory, when nothing is dirty) hold the latest
    value;
  * every read returns the latest written value.

Workloads (see WORKLOADS): private_counters, adjacent_counters (FALSE
SHARING), padded_counters, read_only_shared, producer_consumer, tas_lock,
ttas_lock.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

VALID = ("M", "S", "E")


class CoherenceError(Exception):
    pass


class CoherenceSim:
    """One shared block space; per-core caches map block -> state."""

    def __init__(self, protocol: str = "MSI", n_cores: int = 4):
        if protocol not in ("MSI", "MESI"):
            raise ValueError("protocol must be MSI or MESI")
        if n_cores < 1:
            raise ValueError("need at least one core")
        self.protocol = protocol
        self.n_cores = n_cores
        # cache[core][block] = state in VALID; absent = I
        self.cache: list[dict[int, str]] = [dict() for _ in range(n_cores)]
        self.value: list[dict[int, int]] = [dict() for _ in range(n_cores)]
        self.memory: dict[int, int] = {}          # block -> memory's copy
        self.latest: dict[int, int] = {}          # latest written value
        # A core that was invalidated on a block coherence-misses on its
        # next access to that block.
        self.invalidated: list[set[int]] = [set() for _ in range(n_cores)]
        self.stats = {
            "bus_reads": 0, "bus_rdX": 0, "bus_upgrades": 0,
            "invalidations": 0, "cache_to_cache": 0,
            "cold_misses": 0, "coherence_misses": 0,
            "memory_writes": 0, "reads": 0, "writes": 0,
        }

    # -- helpers ------------------------------------------------------------

    def state(self, core: int, block: int) -> str:
        return self.cache[core].get(block, "I")

    def _bus(self, op: str, detail: str = "") -> None:
        key = {"BusRd": "bus_reads", "BusRdX": "bus_rdX",
               "BusUpgr": "bus_upgrades"}.get(op)
        if key:
            self.stats[key] += 1

    def _supply(self, block: int, requester: int) -> int:
        """Bus supplies `block` to `requester`; snooping suppliers flush.

        Returns the delivered value; counts cache-to-cache transfers and
        memory writes, performing the supplier side of MSI/MESI.
        """
        value = self.memory.get(block, 0)
        others_have = False
        for c in range(self.n_cores):
            if c == requester:
                continue
            st = self.state(c, block)
            if st == "I":
                continue
            others_have = True
            if st == "M":
                # Dirty supplier: writeback to memory, data goes to the
                # requester cache-to-cache, supplier demotes to S.
                self.stats["memory_writes"] += 1
                self.memory[block] = self.value[c][block]
                value = self.value[c][block]
                self.stats["cache_to_cache"] += 1
                self.cache[c][block] = "S"
            elif st == "E":
                # MESI exclusive-clean supplier: no memory traffic.
                self.stats["cache_to_cache"] += 1
                self.cache[c][block] = "S"
                value = self.value[c][block]
            else:  # S: stays S
                value = self.value[c][block]
        return value, others_have

    def _invalidate_others(self, block: int, requester: int) -> None:
        for c in range(self.n_cores):
            if c == requester:
                continue
            if self.state(c, block) != "I":
                del self.cache[c][block]
                self.value[c].pop(block, None)
                self.stats["invalidations"] += 1
                self.invalidated[c].add(block)

    def check_invariants(self) -> None:
        for block in self.latest:
            states = [self.state(c, block) for c in range(self.n_cores)]
            if states.count("M") > 1:
                raise CoherenceError(
                    f"block {block}: two M copies: {states}")
            if states.count("E") > 1:
                raise CoherenceError(
                    f"block {block}: two E copies: {states}")
            for special in ("M", "E"):
                if special in states:
                    for c, st in enumerate(states):
                        if st != "I" and st != special:
                            raise CoherenceError(
                                f"block {block}: {special} coexists with a "
                                f"{st} at core {c}: {states}")
            # Value invariant: every valid copy holds the latest value.
            for c, st in enumerate(states):
                if st in VALID and self.value[c][block] != self.latest[block]:
                    raise CoherenceError(
                        f"stale value at core {c}, block {block}: "
                        f"{self.value[c][block]} != {self.latest[block]}")

    # -- processor operations -------------------------------------------------

    def read(self, core: int, block: int) -> int:
        self.stats["reads"] += 1
        st = self.state(core, block)
        if st in VALID:
            value = self.value[core][block]
            if value != self.latest.get(block, value):
                raise CoherenceError("read returned a stale value")
            return value

        if block in self.invalidated[core]:
            self.stats["coherence_misses"] += 1
        else:
            self.stats["cold_misses"] += 1
        self._bus("BusRd", f"core{core} block{block}")
        value, others_have = self._supply(block, core)
        # MSI: always S. MESI: E when no other copy holds the block.
        self.cache[core][block] = "S" if (self.protocol == "MSI" or
                                          others_have) else "E"
        self.value[core][block] = value
        self.invalidated[core].discard(block)
        self.check_invariants()
        return value

    def write(self, core: int, block: int, value: int | None = None) -> int:
        """Writes a value (auto-incremented unless given explicitly — locks
        need exact 0s for release). Returns the value written."""
        self.stats["writes"] += 1
        if value is None:
            value = self.latest.get(block, 0) + 1
        st = self.state(core, block)

        if st == "M":
            pass  # silent write hit
        elif st == "E" and self.protocol == "MESI":
            pass  # silent E -> M: the MESI private-data optimization
        elif st == "S":
            self._bus("BusUpgr", f"core{core} block{block}")
            self._invalidate_others(block, core)
        else:  # I
            if block in self.invalidated[core]:
                self.stats["coherence_misses"] += 1
            else:
                self.stats["cold_misses"] += 1
            self._bus("BusRdX", f"core{core} block{block}")
            self._supply(block, core)      # any dirty copy flushes
            self._invalidate_others(block, core)

        self.cache[core][block] = "M"
        self.value[core][block] = value
        self.latest[block] = value
        self.invalidated[core].discard(block)
        self.check_invariants()
        return value

    def test_and_set(self, core: int, block: int) -> int:
        """Atomic TAS like `lock xchg`: unconditional read-modify-write —
        ONE bus operation storm even when the lock was held (returns the
        OLD value; 0 = was free)."""
        old = self.read(core, block)
        self.write(core, block, value=1)
        return old

    # -- stats ----------------------------------------------------------------

    def bus_transactions(self) -> int:
        return (self.stats["bus_reads"] + self.stats["bus_rdX"] +
                self.stats["bus_upgrades"])

    def summary(self) -> dict:
        s = dict(self.stats)
        s["bus_transactions"] = self.bus_transactions()
        return s


# --------------------------------------------------------------------------
# Workloads — each drives a sim; stats stay on the sim. `block` ids are
# BLOCK indices: the false-sharing experiment is the difference between
# mapping per-core counters to the SAME block or to separate blocks.
# --------------------------------------------------------------------------

def private_counters(sim: CoherenceSim, iters: int) -> None:
    """Each core increments its own block: zero sharing after cold misses."""
    for _ in range(iters):
        for c in range(sim.n_cores):
            sim.read(c, c)
            sim.write(c, c)


def adjacent_counters(sim: CoherenceSim, iters: int) -> None:
    """FALSE SHARING: every core increments a private slot of the SAME
    block. Block granularity invalidates the whole line on every write."""
    for _ in range(iters):
        for c in range(sim.n_cores):
            sim.read(c, 0)
            sim.write(c, 0)


def padded_counters(sim: CoherenceSim, iters: int) -> None:
    """The fix: per-core counters on separate blocks (alignas(64) on real
    hardware). Identical program logic to adjacent_counters."""
    for _ in range(iters):
        for c in range(sim.n_cores):
            sim.read(c, c)
            sim.write(c, c)


def read_only_shared(sim: CoherenceSim, iters: int) -> None:
    """All cores read one block: one S copy per core, no further traffic."""
    for _ in range(iters):
        for c in range(sim.n_cores):
            sim.read(c, 0)


def producer_consumer(sim: CoherenceSim, iters: int) -> None:
    """Core 0 writes a data block, core 1 reads it — ping-pong ownership."""
    for i in range(1, iters + 1):
        sim.write(0, 0)          # publish (value == i)
        got = sim.read(1, 0)     # consume
        if got != i:
            raise CoherenceError(f"consumer read {got}, expected {i}")


def tas_lock(sim: CoherenceSim, iters: int) -> None:
    """Contended lock with plain test-and-set. Each round: one core acquires
    and holds the lock while every other core makes ONE spin attempt — and a
    TAS attempt is an unconditional BusRdX even when it fails, so each
    spinner invalidates the holder and steals the line. (K-1) storms per
    round; the holder's release then misses too."""
    LOCK = 0
    sim.write(0, LOCK, value=0)        # lock starts free
    for r in range(iters):
        holder = r % sim.n_cores
        while sim.test_and_set(holder, LOCK) != 0:
            pass                       # acquire (retry until it sticks)
        for c in range(sim.n_cores):   # critical section: others spin once
            if c != holder:
                sim.test_and_set(c, LOCK)
        sim.write(holder, LOCK, value=0)   # release


def ttas_lock(sim: CoherenceSim, iters: int) -> None:
    """Same rounds, but spin attempts are plain READS (test-and-TEST-and-
    set): a spinner in S-state hits locally with zero bus traffic; only the
    genuine acquire (after observing 0) touches the bus."""
    LOCK = 0
    sim.write(0, LOCK, value=0)        # lock starts free
    for r in range(iters):
        holder = r % sim.n_cores
        while sim.test_and_set(holder, LOCK) != 0:
            pass                       # acquire
        for c in range(sim.n_cores):   # critical section: others spin once
            if c != holder:
                if sim.read(c, LOCK) == 0:   # local S-hit: looks free?
                    sim.test_and_set(c, LOCK)
        sim.write(holder, LOCK, value=0)   # release


WORKLOADS = {
    "private_counters": private_counters,
    "adjacent_counters": adjacent_counters,
    "padded_counters": padded_counters,
    "read_only_shared": read_only_shared,
    "producer_consumer": producer_consumer,
    "tas_lock": tas_lock,
    "ttas_lock": ttas_lock,
}


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

CSV_HEADER = ("protocol,workload,cores,iters,bus_transactions,bus_reads,"
              "bus_rdX,bus_upgrades,invalidations,cache_to_cache,"
              "cold_misses,coherence_misses,memory_writes,reads,writes")


def run_one(protocol: str, name: str, cores: int, iters: int) -> CoherenceSim:
    sim = CoherenceSim(protocol=protocol, n_cores=cores)
    WORKLOADS[name](sim, iters)
    sim.check_invariants()
    return sim


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="MSI/MESI cache-coherence simulator (cpu-cache-lab stage 5)")
    ap.add_argument("--protocol", choices=("MSI", "MESI", "both"),
                    default="both")
    ap.add_argument("--workload", choices=tuple(WORKLOADS) + ("all",),
                    default="all")
    ap.add_argument("--cores", type=int, default=4)
    ap.add_argument("--iters", type=int, default=200)
    ap.add_argument("--csv", default="results/coherence.csv")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    protocols = ["MSI", "MESI"] if args.protocol == "both" else [args.protocol]
    workloads = list(WORKLOADS) if args.workload == "all" else [args.workload]

    out_path = Path(args.csv)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    write_header = not out_path.exists() or out_path.stat().st_size == 0
    with open(out_path, "a", newline="") as f:
        writer = csv.writer(f)
        if write_header:
            writer.writerow(CSV_HEADER.split(","))
        for protocol in protocols:
            for name in workloads:
                sim = run_one(protocol, name, args.cores, args.iters)
                s = sim.summary()
                writer.writerow([protocol, name, args.cores, args.iters,
                                 s["bus_transactions"], s["bus_reads"],
                                 s["bus_rdX"], s["bus_upgrades"],
                                 s["invalidations"], s["cache_to_cache"],
                                 s["cold_misses"], s["coherence_misses"],
                                 s["memory_writes"], s["reads"], s["writes"]])
                if not args.quiet:
                    print(f"{protocol:4s} {name:20s} bus={s['bus_transactions']:6d} "
                          f"(rd={s['bus_reads']} rdX={s['bus_rdX']} "
                          f"upgr={s['bus_upgrades']}) "
                          f"invalidations={s['invalidations']:5d} "
                          f"c2c={s['cache_to_cache']:5d} "
                          f"misses: cold={s['cold_misses']} "
                          f"coherence={s['coherence_misses']}")
    print(f"appended {len(protocols) * len(workloads)} rows -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
