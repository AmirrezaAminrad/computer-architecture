"""Correctness tests for the Stage-5 coherence simulator.

Run from the project root:
    python -m unittest simulator.tests.test_coherence -v

The protocol-transition tests assert exact state/buses after hand-traced
sequences; the invariant tests plant violations and verify the checker
catches them.
"""

import unittest

from simulator.coherence import (CoherenceError, CoherenceSim,
                                 adjacent_counters, padded_counters,
                                 private_counters, producer_consumer,
                                 read_only_shared, tas_lock, ttas_lock)


def fresh(protocol="MSI", cores=2) -> CoherenceSim:
    return CoherenceSim(protocol=protocol, n_cores=cores)


class TestMSI(unittest.TestCase):
    def test_cold_read_then_hit(self):
        sim = fresh()
        self.assertEqual(sim.read(0, 0), 0)
        self.assertEqual(sim.state(0, 0), "S")
        self.assertEqual(sim.stats["bus_reads"], 1)
        self.assertEqual(sim.stats["cold_misses"], 1)
        sim.read(0, 0)  # hit: no bus
        self.assertEqual(sim.stats["bus_reads"], 1)

    def test_write_after_read_upgrades(self):
        sim = fresh()
        sim.read(0, 0)                    # S
        sim.write(0, 0)                   # S -> M via BusUpgr
        self.assertEqual(sim.state(0, 0), "M")
        self.assertEqual(sim.stats["bus_upgrades"], 1)
        self.assertEqual(sim.stats["bus_rdX"], 0)
        sim.write(0, 0)                   # M -> M silent
        self.assertEqual(sim.stats["bus_upgrades"], 1)

    def test_other_core_read_flushes_m_to_s(self):
        sim = fresh()
        sim.write(0, 0)                   # M via BusRdX (value 1)
        self.assertEqual(sim.read(1, 0), 1)  # latest value, via c2c
        self.assertEqual(sim.state(0, 0), "S")   # demoted
        self.assertEqual(sim.state(1, 0), "S")
        self.assertEqual(sim.stats["cache_to_cache"], 1)
        self.assertEqual(sim.stats["memory_writes"], 1)  # dirty flush
        self.assertEqual(sim.stats["invalidations"], 0)  # read: no inval

    def test_write_invalidates_sharer(self):
        sim = fresh()
        sim.read(0, 0)                    # S
        sim.read(1, 0)                    # S (both share)
        sim.write(1, 0)                   # BusUpgr -> core 0 invalidated
        self.assertEqual(sim.state(0, 0), "I")
        self.assertEqual(sim.state(1, 0), "M")
        self.assertEqual(sim.stats["invalidations"], 1)
        # Core 0's next read is a coherence miss and gets the new value.
        self.assertEqual(sim.read(0, 0), 1)
        self.assertEqual(sim.stats["coherence_misses"], 1)

    def test_write_miss_uses_busrdx(self):
        sim = fresh()
        sim.write(0, 0)                   # I -> M: BusRdX, cold miss
        self.assertEqual(sim.stats["bus_rdX"], 1)
        self.assertEqual(sim.stats["cold_misses"], 1)
        self.assertEqual(sim.state(0, 0), "M")


class TestMESI(unittest.TestCase):
    def test_cold_read_gets_exclusive(self):
        sim = fresh("MESI")
        sim.read(0, 0)
        self.assertEqual(sim.state(0, 0), "E")   # no other copy -> E
        self.assertEqual(sim.stats["bus_reads"], 1)

    def test_silent_e_to_m_write(self):
        # THE MESI win: read-then-write private data needs ONE bus op total
        # (the cold read); the write is silent. MSI needs a BusRdX upgrade.
        mesi = fresh("MESI")
        mesi.read(0, 0)
        mesi.write(0, 0)
        self.assertEqual(mesi.state(0, 0), "M")
        self.assertEqual(mesi.bus_transactions(), 1)

        msi = fresh("MSI")
        msi.read(0, 0)
        msi.write(0, 0)
        self.assertEqual(msi.bus_transactions(), 2)  # BusRd + BusUpgr

    def test_e_supplies_cache_to_cache(self):
        sim = fresh("MESI")
        sim.read(0, 0)                    # E
        sim.read(1, 0)                    # snoops: E -> S, c2c, no memory
        self.assertEqual(sim.state(0, 0), "S")
        self.assertEqual(sim.state(1, 0), "S")
        self.assertEqual(sim.stats["cache_to_cache"], 1)
        self.assertEqual(sim.stats["memory_writes"], 0)  # E was clean

    def test_m_flushes_on_snoop(self):
        sim = fresh("MESI")
        sim.write(0, 0)                   # M (via BusRdX, value 1)
        self.assertEqual(sim.read(1, 0), 1)
        self.assertEqual(sim.state(0, 0), "S")
        self.assertEqual(sim.stats["memory_writes"], 1)
        self.assertEqual(sim.stats["cache_to_cache"], 1)


class TestInvariants(unittest.TestCase):
    def test_checker_accepts_legal_states(self):
        sim = fresh("MESI", cores=3)
        sim.read(0, 0)                    # E
        sim.read(1, 0)                    # both S now
        sim.check_invariants()            # must not raise
        sim.write(1, 0)                   # M, core 0 invalidated
        sim.check_invariants()

    def test_checker_catches_two_m_copies(self):
        sim = fresh()
        sim.write(0, 0)
        sim.cache[1][0] = "M"             # plant the violation
        with self.assertRaises(CoherenceError):
            sim.check_invariants()

    def test_checker_catches_m_with_sharer(self):
        sim = fresh()
        sim.write(0, 0)
        sim.cache[1][0] = "S"             # plant: M and S coexist
        with self.assertRaises(CoherenceError):
            sim.check_invariants()

    def test_checker_catches_stale_value(self):
        sim = fresh()
        sim.write(0, 0)                   # M, value 1
        sim.value[0][0] = 999             # plant stale
        with self.assertRaises(CoherenceError):
            sim.check_invariants()

    def test_reads_return_latest_across_cores(self):
        sim = fresh("MESI", cores=4)
        expected = 0
        for i in range(50):
            c = i % 4
            if i % 3 == 0:
                expected = sim.write(c, 0)
            else:
                self.assertEqual(sim.read(c, 0), expected)


class TestWorkloads(unittest.TestCase):
    def test_false_sharing_adjacent_vs_padded(self):
        # Same program logic; only the block mapping differs. Adjacent
        # counters (one shared block) generate invalidations on every write
        # (~3 per write with 4 cores); padded counters (per-core blocks)
        # generate none after the cold misses.
        adj = fresh(cores=4)
        adjacent_counters(adj, 50)
        pad = fresh(cores=4)
        padded_counters(pad, 50)
        self.assertGreater(adj.stats["invalidations"], 100)
        self.assertEqual(pad.stats["invalidations"], 0)
        self.assertGreater(adj.bus_transactions(),
                           pad.bus_transactions() * 10)

    def test_private_counters_no_invalidation(self):
        sim = fresh("MSI", cores=4)
        private_counters(sim, 50)
        self.assertEqual(sim.stats["invalidations"], 0)
        self.assertEqual(sim.stats["coherence_misses"], 0)

    def test_read_only_shared_no_invalidation(self):
        sim = fresh(cores=3)
        read_only_shared(sim, 30)
        self.assertEqual(sim.stats["invalidations"], 0)
        self.assertEqual(sim.stats["cold_misses"], 3)  # one per core
        # Everyone sits in S: subsequent reads are silent hits.
        reads_before = sim.stats["bus_reads"]
        read_only_shared(sim, 10)
        self.assertEqual(sim.stats["bus_reads"], reads_before)

    def test_producer_consumer_value_chain(self):
        sim = fresh(cores=2)
        producer_consumer(sim, 100)  # raises internally on any stale read
        # Cold misses: the producer's first write and the consumer's first
        # read (neither had seen the block). Every later consumer read is a
        # coherence miss after being invalidated by the publish.
        self.assertEqual(sim.stats["cold_misses"], 2)
        self.assertEqual(sim.stats["coherence_misses"], 99)

    def test_tas_storm_vs_ttas_quiet(self):
        cores, rounds = 4, 50
        tas = fresh(cores=cores)
        tas_lock(tas, rounds)
        ttas = fresh(cores=cores)
        ttas_lock(ttas, rounds)
        # The storm signature: a failed TAS is an unconditional BusRdX, so
        # TAS issues many more exclusive bus ops and invalidations than
        # TTAS, whose spinners sit in S reading locally.
        self.assertGreater(tas.stats["bus_rdX"],
                           ttas.stats["bus_rdX"] * 3)
        self.assertGreater(tas.stats["invalidations"],
                           ttas.stats["invalidations"])
        self.assertGreater(tas.bus_transactions(), ttas.bus_transactions())
        # Both implement the same lock: no invariant violations raised.

    def test_workloads_run_under_both_protocols(self):
        from simulator import coherence as coh
        for protocol in ("MSI", "MESI"):
            for name, fn in coh.WORKLOADS.items():
                with self.subTest(protocol=protocol, workload=name):
                    sim = fresh(protocol, cores=3)
                    fn(sim, 20)
                    sim.check_invariants()


if __name__ == "__main__":
    unittest.main()
