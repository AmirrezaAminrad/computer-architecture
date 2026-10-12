"""Correctness tests for the Stage-4 cache simulator.

Run from the project root:
    python -m unittest simulator.tests.test_cache -v

Every test uses hand-computed expectations on tiny traces — the point is
that a human verified these numbers, not that they look plausible.
"""

import tempfile
import unittest
from pathlib import Path

from simulator.cache import Cache, CacheConfig, run_multilevel
from simulator.trace import read_trace


CONFIG_KEYS = {"size_bytes", "line_size", "ways", "replacement",
               "write_policy", "allocate", "hit_time_ns"}

CONFIG_DEFAULTS = {"size_bytes": 64, "line_size": 16, "ways": 1}


def make_cache(**kwargs) -> Cache:
    """Cache(...) with config kwargs split from cache kwargs (prefetch, ...)."""
    cfg_kwargs = {**CONFIG_DEFAULTS, **{k: v for k, v in kwargs.items()
                                        if k in CONFIG_KEYS}}
    cache_kwargs = {k: v for k, v in kwargs.items() if k not in CONFIG_KEYS}
    return Cache(CacheConfig(**cfg_kwargs), seed=42, **cache_kwargs)


def write_temp_trace(accesses) -> str:
    """Writes [(is_write, addr), ...] as a trace file; returns the path."""
    fd, path = tempfile.mkstemp(suffix=".trc")
    import os
    os.close(fd)  # Windows: an open fd locks the file against unlink
    with open(path, "w") as f:
        for is_write, addr in accesses:
            f.write(f"{'W' if is_write else 'R'} 0x{addr:x}\n")
    return path


class TestDecomposition(unittest.TestCase):
    def test_power_of_two(self):
        cfg = CacheConfig(size_bytes=4096, line_size=64, ways=2)  # 32 sets
        off, st, tag = cfg.decompose(0x1234)
        self.assertEqual(off, 0x1234 % 64)               # 0x14
        self.assertEqual(st, (0x1234 // 64) % 32)        # 0x89 % 32
        self.assertEqual(tag, 0x1234 // (64 * 32))

    def test_non_power_of_two_sets(self):
        # 48 B cache, 16 B lines, 1 way -> 3 sets (not a power of two).
        cfg = CacheConfig(size_bytes=48, line_size=16, ways=1)
        self.assertEqual(cfg.num_sets, 3)
        # Blocks 0, 1, 2 land in sets 0, 1, 2; block 3 wraps to set 0.
        self.assertEqual(cfg.decompose(0)[1], 0)
        self.assertEqual(cfg.decompose(16)[1], 1)
        self.assertEqual(cfg.decompose(32)[1], 2)
        self.assertEqual(cfg.decompose(48)[1], 0)   # block 3 % 3
        # Same BLOCK, different offset: same set, same tag (18 is block 1).
        self.assertEqual(cfg.decompose(18)[1], 1)
        self.assertEqual(cfg.decompose(18)[2], cfg.decompose(16)[2])

    def test_config_validation(self):
        with self.assertRaises(ValueError):
            CacheConfig(size_bytes=100, line_size=16, ways=3)  # 100 % 48 != 0
        with self.assertRaises(ValueError):
            CacheConfig(size_bytes=64, line_size=128, ways=1)
        with self.assertRaises(ValueError):
            CacheConfig(size_bytes=64, line_size=16, ways=1,
                        replacement="mru")


class TestBriefExample(unittest.TestCase):
    """The lab brief's example configuration: size = 64 B, line = 16 B,
    ways = 1, trace R 0 / R 0 / R 16 / R 0.

    Hand decoding: 64/(16*1) = 4 SETS, so block 0 (addr 0) is in set 0 and
    block 1 (addr 16) is in set 1 — they do NOT conflict:
        R 0  -> miss (cold)
        R 0  -> hit
        R 16 -> miss (cold, different set)
        R 0  -> hit (still resident)
    The eviction-rich variant of the same trace needs a ONE-set cache
    (16 B, 16 B lines, 1 way), where 0 and 16 share the only slot.
    """

    def test_hit_miss_sequence(self):
        cache = make_cache()  # 64 B / 16 B / 1 way -> 4 sets
        results = [cache.access(a, False) for a in (0, 0, 16, 0)]
        self.assertEqual(results, [False, True, False, True])
        st = cache.stats
        self.assertEqual((st.accesses, st.hits, st.misses), (4, 2, 2))
        self.assertEqual(st.evictions, 0)   # four sets, four distinct... only
        self.assertEqual(st.writebacks, 0)  # two blocks touched: no conflict
        self.assertAlmostEqual(cache.hit_rate(), 0.5)

    def test_one_set_variant_evicts(self):
        # Same trace on a 16 B, 1-way cache (a single set): 0 and 16 fight
        # for the only slot -> miss, hit, miss+evict, miss+evict.
        cache = make_cache(size_bytes=16, line_size=16, ways=1)
        results = [cache.access(a, False) for a in (0, 0, 16, 0)]
        self.assertEqual(results, [False, True, False, False])
        st = cache.stats
        self.assertEqual((st.hits, st.misses, st.evictions), (1, 3, 2))

    def test_via_trace_file(self):
        path = write_temp_trace([(False, 0), (False, 0), (False, 16),
                                 (False, 0)])
        try:
            trace = read_trace(path)
            cache = make_cache()
            cache.run(trace)
            self.assertEqual((cache.stats.hits, cache.stats.misses), (2, 2))
        finally:
            Path(path).unlink(missing_ok=True)


class TestReplacement(unittest.TestCase):
    def test_lru_vs_fifo_diverge(self):
        # Single-set (fully associative, 3 lines) cache. Trace: A B C A B D A.
        #   LRU:  A(m) B(m) C(m) A(h) B(h) D(m evicts LRU=C) A(h)   -> 3 hits
        #   FIFO: A(m) B(m) C(m) A(h) B(h) D(m evicts FIFO=A) A(m)  -> 2 hits
        # Same policy family, same evict-from-front — the difference is that
        # LRU re-orders on hits.
        trace = [(False, a) for a in (0, 16, 32, 0, 16, 64, 0)]
        lru = make_cache(size_bytes=48, line_size=16, ways=3,
                         replacement="lru")   # 48/(16*3) = 1 set
        fifo = make_cache(size_bytes=48, line_size=16, ways=3,
                          replacement="fifo")
        lru_hits = [lru.access(a, False) for _, a in trace]
        fifo_hits = [fifo.access(a, False) for _, a in trace]
        self.assertEqual(lru_hits, [False, False, False, True, True, False,
                                    True])
        self.assertEqual(fifo_hits, [False, False, False, True, True, False,
                                     False])

    def test_random_is_seeded_deterministic(self):
        trace = [(False, a) for a in range(0, 64 * 8, 16)] * 3
        r1 = make_cache(ways=2, replacement="random")
        r2 = make_cache(ways=2, replacement="random")
        s1, s2 = r1.run(list(trace)), r2.run(list(trace))
        self.assertEqual(s1.hits, s2.hits)
        self.assertEqual(s1.evictions, s2.evictions)


class TestWritePolicies(unittest.TestCase):
    def test_write_back_writeback_count(self):
        # ONE set (16 B, 1 way): lines 0 and 16 fight for the only slot.
        # W 0 (miss, alloc dirty), R 16 (miss, evicts dirty 0 -> writeback),
        # W 16 (hit, dirty), R 32 (miss, evicts dirty 16 -> writeback).
        cache = make_cache(size_bytes=16, line_size=16, ways=1,
                           replacement="lru", write_policy="write_back")
        for w, a in [(True, 0), (False, 16), (True, 16), (False, 32)]:
            cache.access(a, w)
        st = cache.stats
        self.assertEqual(st.writebacks, 2)
        self.assertEqual(st.memory_writes, 2)
        self.assertEqual(st.evictions, 2)

    def test_write_through_no_writebacks(self):
        cache = make_cache(size_bytes=16, line_size=16, ways=1,
                           write_policy="write_through")
        for w, a in [(True, 0), (False, 16), (True, 16), (False, 32)]:
            cache.access(a, w)
        st = cache.stats
        self.assertEqual(st.writebacks, 0)      # nothing is ever dirty
        self.assertEqual(st.memory_writes, 2)   # each store goes to memory

    def test_write_allocate_vs_not(self):
        # A single store to a cold line:
        alloc = make_cache(allocate="write_allocate")
        self.assertFalse(alloc.access(0, True))
        self.assertEqual(alloc.stats.misses, 1)
        # The line is now resident: a following read hits.
        self.assertTrue(alloc.access(0, False))

        noalloc = make_cache(allocate="no_write_allocate")
        self.assertFalse(noalloc.access(0, True))
        self.assertEqual(noalloc.stats.misses, 1)
        # The store bypassed the cache: the read must miss.
        self.assertFalse(noalloc.access(0, False))


class TestMultiLevel(unittest.TestCase):
    def test_amat_recursive_hand_computed(self):
        # L1: 16 B cache = ONE set, 1 way: R 0 and R 16 thrash it — all four
        # accesses miss (miss rate 1.0). L2: 256 B, 4-way, 4 sets: holds both
        # lines; its 4 accesses are 2 compulsory misses + 2 hits (miss 0.5).
        #   AMAT_L2 = 10 + 0.5 * 100 = 60
        #   AMAT_L1 = 1  + 1.0 * 60  = 61
        cfg_l1 = CacheConfig(size_bytes=16, line_size=16, ways=1,
                             hit_time_ns=1.0)
        cfg_l2 = CacheConfig(size_bytes=256, line_size=16, ways=4,
                             hit_time_ns=10.0)
        trace = [(False, 0), (False, 16), (False, 0), (False, 16)]
        res = run_multilevel([cfg_l1, cfg_l2], trace, memory_time_ns=100.0)
        self.assertAlmostEqual(res.amat_ns, 61.0)
        self.assertAlmostEqual(res.level_amats[0], 61.0)
        self.assertAlmostEqual(res.level_amats[1], 60.0)
        self.assertEqual(res.levels[0].misses, 4)
        self.assertEqual(res.levels[1].misses, 2)

    def test_three_level_recursion(self):
        # L1 and L2 are both single-set 1-way (everything misses at both),
        # L3 holds both lines (2 compulsory of 4 -> miss rate 0.5).
        #   AMAT_L3 = 3 + 0.5 * 100 = 53
        #   AMAT_L2 = 2 + 1.0 * 53  = 55
        #   AMAT_L1 = 1 + 1.0 * 55  = 56
        cfg1 = CacheConfig(size_bytes=16, line_size=16, ways=1, hit_time_ns=1.0)
        cfg2 = CacheConfig(size_bytes=16, line_size=16, ways=1, hit_time_ns=2.0)
        cfg3 = CacheConfig(size_bytes=256, line_size=16, ways=4, hit_time_ns=3.0)
        trace = [(False, 0), (False, 16), (False, 0), (False, 16)]
        res = run_multilevel([cfg1, cfg2, cfg3], trace, memory_time_ns=100.0)
        self.assertAlmostEqual(res.amat_ns, 56.0)
        self.assertAlmostEqual(res.level_amats[0], 56.0)
        self.assertAlmostEqual(res.level_amats[1], 55.0)
        self.assertAlmostEqual(res.level_amats[2], 53.0)


class TestPrefetcher(unittest.TestCase):
    def test_helps_sequential(self):
        trace = [(False, a) for a in range(0, 64 * 64, 64)]  # 64 lines
        off = make_cache(size_bytes=4096, line_size=64, ways=8)
        on = make_cache(size_bytes=4096, line_size=64, ways=8, prefetch=True)
        off.run(list(trace))
        on.run(list(trace))
        self.assertEqual(off.stats.misses, 64)   # every line cold, no reuse
        # With next-line prefetch: the first access misses, its prefetch
        # covers the next line, and so on down the stream -> 1 miss total,
        # 64 prefetch insertions (one per access).
        self.assertLessEqual(on.stats.misses, 4)
        self.assertGreaterEqual(on.stats.prefetches, 60)

    def test_does_not_help_random(self):
        import random as _r
        rng = _r.Random(7)
        region = 4096 * 64
        trace = [(False, rng.randrange(0, region, 64)) for _ in range(4000)]
        off = make_cache(size_bytes=4096, line_size=64, ways=8)
        on = make_cache(size_bytes=4096, line_size=64, ways=8, prefetch=True)
        off.run(list(trace))
        on.run(list(trace))
        # Both miss almost always (4 KiB cache vs 256 KiB region); the
        # prefetcher neither fixes nor badly hurts pure random streams here.
        self.assertGreater(off.stats.miss_rate(), 0.95)
        self.assertGreater(on.stats.miss_rate(), 0.95)


class TestMissClassification(unittest.TestCase):
    def test_hand_computed_classes(self):
        # Conflict scenario: 64 B cache, 16 B lines, 1 way -> 4 sets, 4-line
        # capacity. Blocks 0 and 64 both map to set 0 (block % 4), so they
        # fight for one slot — but two distinct lines fit easily in a fully
        # associative 64 B cache.
        # Trace: R0 R64 R0 R64
        #   R0  miss compulsory        R64 miss compulsory
        #   R0  miss, seen; shadow (FA, 4 lines) holds {0, 64} -> HIT
        #       => conflict. Same for the final R64.
        cache = make_cache(size_bytes=64, line_size=16, ways=1, classify=True)
        for a in (0, 64, 0, 64):
            cache.access(a, False)
        st = cache.stats
        self.assertEqual((st.compulsory, st.capacity, st.conflict), (2, 0, 2))
        self.assertEqual(st.misses, 4)

    def test_capacity_classified(self):
        # 32 B cache, 16 B lines, 2 ways -> 2 sets. Trace touches 6 distinct
        # lines twice (0..80 step 16, then again). 6 lines = 96 B > 32 B:
        # even fully associative cannot hold them -> second-pass misses are
        # capacity misses.
        cache = make_cache(size_bytes=32, line_size=16, ways=2, classify=True)
        lines = list(range(0, 96, 16))
        for a in lines + lines:
            cache.access(a, False)
        st = cache.stats
        self.assertEqual(st.compulsory, 6)
        self.assertEqual(st.capacity, 6)
        self.assertEqual(st.conflict, 0)


class TestTraceParser(unittest.TestCase):
    def test_comments_and_blank_lines(self):
        path = write_temp_trace([(False, 0)])
        text = Path(path).read_text() + "# a comment\n\n   \nR 0x10\n"
        Path(path).write_text(text)
        entries = read_trace(path)
        self.assertEqual(entries, [(False, 0), (False, 16)])

    def test_malformed_line_raises_with_lineno(self):
        import os
        fd, path = tempfile.mkstemp(suffix=".trc")
        os.close(fd)
        path = Path(path)
        path.write_text("R 0x0\nX 0x10\n")
        with self.assertRaises(ValueError) as ctx:
            read_trace(str(path))
        self.assertIn(":2:", str(ctx.exception))
        path.unlink()

    def test_decimal_addresses_accepted(self):
        path = write_temp_trace([(False, 0)])
        Path(path).write_text("R 16\nW 32\n")
        self.assertEqual(read_trace(path), [(False, 16), (True, 32)])


if __name__ == "__main__":
    unittest.main()
