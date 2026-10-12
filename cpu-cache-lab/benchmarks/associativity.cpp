// Stage 2 benchmark: cache associativity via same-set conflict sweeps.
//
// No CPU geometry is hard-coded. The experiment DERIVES the geometry:
//
//   Phase A (find the L1 set period): chase K=16 lines spaced D bytes apart,
//   sweeping D over powers of two. Addresses spaced D apart land in the same
//   cache set of any cache whose set period (sets x line_size) divides D.
//   When D first reaches the L1 set period, all K lines collapse into ONE
//   L1 set; K exceeds the associativity -> the set thrashes -> per-access
//   latency jumps. The first jump D is the L1 set period.
//
//   Phase B (L1 associativity): with D fixed at that period, sweep the
//   number of conflicting lines K. The K where latency jumps is
//   associativity + 1.
//
//   Phase C (beyond-L1 probe — UNRELIABLE, kept for the lesson it teaches):
//   with K = (detected L1 ways - 1), sweep D over multiples of the L1 period.
//   Naively this should peel L2 the way phase B peeled L1. It usually does
//   NOT: L1 is VIPT with its index bits inside the 4 KiB page offset, so
//   virtual spacing controls L1 sets — but higher caches are indexed by
//   PHYSICAL address bits beyond the page offset, so virtual spacing cannot
//   place lines in a chosen L2/L3 set. What phase C actually shows is random
//   physical-frame collisions (a partial-thrash plateau), not the L2's real
//   geometry. Reliable L2/L3 associativity measurement needs huge-page
//   control; the docs spell this out.
//
//   L3 is NOT isolated by this method for the same reason (and because set
//   periods nest, so lower levels always collide first).
//
// Output CSV: phase,spacing_bytes,k_lines,median_ns,min_ns

#include "common/bench_utils.h"
#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/pointer_chase.h"
#include "common/pinning.h"
#include "common/random.h"

#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <string>
#include <vector>

#ifndef BENCH_BUILD_FLAGS
#define BENCH_BUILD_FLAGS "unknown"
#endif

using namespace lab;

namespace {

constexpr double kTargetRepNs = 40.0e6;
constexpr double kJumpRatio = 1.5;  // "jump" = 1.5x the previous point

// Links `k_lines` slots (spaced spacing_nodes apart inside the arena) into
// one random cycle — see common/pointer_chase.h (shared with the TLB bench).
void link_cycle_at_stride(Node* arena, size_t k_lines, size_t spacing_nodes,
                          uint64_t seed) {
    lab::link_spaced_cycle(arena, k_lines, spacing_nodes, seed);
}

// First index i>0 whose median is >= ratio * median[i-1]; SIZE_MAX if none.
size_t find_first_jump(const std::vector<double>& medians, double ratio) {
    for (size_t i = 1; i < medians.size(); ++i) {
        if (medians[i] >= ratio * medians[i - 1]) return i;
    }
    return SIZE_MAX;
}

int self_test() {
    int failures = 0;
    auto check = [&](bool ok, const char* what) {
        if (!ok) { ++failures; std::printf("FAIL: %s\n", what); }
    };

    // Slot cycle: 5 lines spaced 2 nodes apart in a 16-node arena.
    std::vector<Node> arena(16);
    link_cycle_at_stride(arena.data(), 5, 2, 42);
    Node* p = arena.data();
    std::vector<bool> visited(16, false);
    size_t hops = 0;
    do {
        const size_t idx = (size_t)(p - arena.data());
        check(idx % 2 == 0, "chase lands on spacing boundaries");
        check(idx < 10, "chase stays inside the slotted region");
        check(!visited[idx], "each slot visited once per lap");
        visited[idx] = true;
        p = p->next;
        ++hops;
    } while (p != arena.data() && hops <= 5);
    check(hops == 5, "cycle length equals the slot count");

    // Jump detection.
    check(find_first_jump({1.0, 1.1, 3.3, 3.4}, kJumpRatio) == 2, "jump found at 2");
    check(find_first_jump({1.0, 1.1, 1.2, 1.1}, kJumpRatio) == SIZE_MAX,
          "no jump in flat data");

    std::printf("associativity self-test: %s\n", failures ? "FAILED" : "OK");
    return failures ? 1 : 0;
}

void print_usage(std::FILE* out) {
    std::fprintf(out,
        "associativity — same-set conflict sweeps (measures cache associativity)\n"
        "\n"
        "Options (defaults in brackets):\n"
        "  --min-d SIZE   smallest line spacing [64]      (phase A sweep start)\n"
        "  --max-d SIZE   largest line spacing [4M]\n"
        "  --k-a N        conflicting lines in the period sweep [16]\n"
        "  --k-max N      max conflicts in the K sweeps [32]\n"
        "  --reps N       timed repetitions per point [5]\n"
        "  --seed S       permutation seed [42]\n"
        "  --cpu N        pin to logical CPU N; -1 disables [0]\n"
        "  --out-dir DIR  output directory [results]\n"
        "  --csv NAME     CSV file name [associativity.csv]\n"
        "  --quiet        suppress progress lines\n"
        "  --self-test    run correctness checks and exit\n"
        "  --help         this text\n");
}

}  // namespace

int main(int argc, char** argv) {
    uint64_t min_d = 64, max_d = 4u << 20, seed = 42;
    int k_a = 16, k_max = 32, reps = 5, cpu = 0;
    std::string out_dir = "results", csv_name = "associativity.csv";
    bool quiet = false;

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto next = [&](std::string* v) -> bool {
            if (i + 1 >= argc) return false;
            *v = argv[++i];
            return true;
        };
        std::string v;
        if (arg == "--help") { print_usage(stdout); return 0; }
        else if (arg == "--self-test") { return self_test(); }
        else if (arg == "--min-d" && next(&v)) {
            if (!parse_size_bytes(v, &min_d) || min_d < 64) {
                std::fprintf(stderr, "error: bad --min-d '%s'\n", v.c_str());
                return 2;
            }
        }
        else if (arg == "--max-d" && next(&v)) {
            if (!parse_size_bytes(v, &max_d) || max_d < min_d) {
                std::fprintf(stderr, "error: bad --max-d '%s'\n", v.c_str());
                return 2;
            }
        }
        else if (arg == "--k-a" && next(&v)) k_a = std::atoi(v.c_str());
        else if (arg == "--k-max" && next(&v)) k_max = std::atoi(v.c_str());
        else if (arg == "--reps" && next(&v)) reps = std::atoi(v.c_str());
        else if (arg == "--seed" && next(&v)) seed = std::strtoull(v.c_str(), nullptr, 10);
        else if (arg == "--cpu" && next(&v)) cpu = std::atoi(v.c_str());
        else if (arg == "--out-dir" && next(&v)) out_dir = v;
        else if (arg == "--csv" && next(&v)) csv_name = v;
        else if (arg == "--quiet") quiet = true;
        else {
            std::fprintf(stderr, "error: unknown argument '%s' (see --help)\n", arg.c_str());
            return 2;
        }
    }
    if (k_a < 2 || k_max < k_a || k_max > 512) {
        std::fprintf(stderr, "error: need 2 <= --k-a <= --k-max <= 512\n");
        return 2;
    }

    if (cpu >= 0) {
        std::string err;
        if (pin_to_cpu(cpu, err)) {
            if (!quiet) std::fprintf(stderr, "pinned to logical CPU %d\n", cpu);
        } else {
            std::fprintf(stderr, "warning: pinning failed (%s); continuing UNPINNED\n",
                         err.c_str());
        }
    }

    double tsc_hz = 0.0;
    const MachineInfo machine = query_machine();
    if (!calibrate_tsc(&tsc_hz)) {
        std::fprintf(stderr, "warning: TSC calibration unavailable\n");
    }

    // Detected geometry is used ONLY to choose phase-C parameters and to
    // cross-check the measurement — the measurement itself is independent.
    int detected_l1_ways = 0;
    for (const CacheInfo& c : machine.caches) {
        if (c.level == 1 && c.type == "data") detected_l1_ways = c.ways;
    }

    // Largest arena needed: k_a * max_d (phase A), k_max * P1 (phase B, P1<=max_d),
    // and (detected_l1_ways+1) * max_d for phase C — all bounded by k_a... use
    // k_max * max_d to be safe within reason.
    size_t arena_nodes = (size_t)k_max * (size_t)(max_d / sizeof(Node));
    if (arena_nodes > (32u << 20)) arena_nodes = 32u << 20;  // 2 GiB hard ceiling
    std::vector<Node> arena;
    try {
        arena.resize(arena_nodes);
    } catch (const std::bad_alloc&) {
        std::fprintf(stderr, "error: out of memory for %zu-node arena\n", arena_nodes);
        return 3;
    }

    const std::string csv_path = out_dir + "/" + csv_name;
    std::string err;
    std::ofstream csv = open_csv(csv_path,
        "phase,spacing_bytes,k_lines,median_ns,min_ns", err);
    if (!csv) {
        std::fprintf(stderr, "error: %s\n", err.c_str());
        return 2;
    }
    if (!write_machine_json(out_dir + "/machine_associativity.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            "associativity", seed, tsc_hz, err)) {
        std::fprintf(stderr, "warning: machine_associativity.json: %s\n", err.c_str());
    }

    auto measure_point = [&](const char* phase, size_t spacing, size_t k,
                             size_t* out_ops) -> Sample {
        const size_t spacing_nodes = spacing / sizeof(Node);
        link_cycle_at_stride(arena.data(), k, spacing_nodes, seed + k);
        uint64_t last_ops = 0;
        const Sample s = measure_ns_per_op(
            [&](size_t target) {
                chase(arena.data(), target, nullptr);
                last_ops = target;
                return last_ops;
            },
            kTargetRepNs, reps);
        *out_ops = last_ops;
        csv << phase << ',' << spacing << ',' << k << ',' << s.median_ns << ','
            << s.min_ns << '\n';
        return s;
    };

    // ---------------- Phase A: find the L1 set period ----------------
    std::vector<double> medians_a;
    std::vector<uint64_t> ds;
    if (!quiet) std::fprintf(stderr, "--- phase A: sweeping spacing D (K=%d lines) ---\n", k_a);
    size_t ops_dummy;
    for (uint64_t d = min_d; d <= max_d; d *= 2) {
        const Sample s = measure_point("find_period", d, (size_t)k_a, &ops_dummy);
        medians_a.push_back(s.median_ns);
        ds.push_back(d);
        if (!quiet) {
            std::fprintf(stderr, "  D=%9s  median %8.3f ns\n", human_bytes(d).c_str(),
                         s.median_ns);
        }
        if (d > max_d / 2) break;
    }
    const size_t jump_a = find_first_jump(medians_a, kJumpRatio);
    if (jump_a == SIZE_MAX) {
        std::fprintf(stderr, "warning: no set-period jump found in phase A — "
                             "cannot derive associativity; CSV still written\n");
        csv.flush();
        std::printf("wrote %s (incomplete: no jump found)\n", csv_path.c_str());
        return 0;
    }
    const uint64_t period_l1 = ds[jump_a];
    if (!quiet) {
        std::fprintf(stderr, "measured L1 set period: %s "
                             "(sets x line size; jump x%.1f)\n",
                     human_bytes(period_l1).c_str(),
                     medians_a[jump_a] / medians_a[jump_a - 1]);
    }

    // ---------------- Phase B: L1 associativity ----------------
    if (!quiet) std::fprintf(stderr, "--- phase B: K-sweep at D=%s ---\n",
                             human_bytes(period_l1).c_str());
    std::vector<double> medians_b;
    std::vector<size_t> ks_b;
    for (int k = 2; k <= k_max; ++k) {
        const Sample s = measure_point("l1_k_sweep", period_l1, (size_t)k, &ops_dummy);
        medians_b.push_back(s.median_ns);
        ks_b.push_back((size_t)k);
        if (!quiet) std::fprintf(stderr, "  K=%3d  median %8.3f ns\n", k, s.median_ns);
    }
    const size_t jump_b = find_first_jump(medians_b, kJumpRatio);
    const int measured_l1_assoc =
        jump_b == SIZE_MAX ? -1 : (int)ks_b[jump_b] - 1;
    if (!quiet) {
        if (measured_l1_assoc > 0) {
            std::fprintf(stderr, "measured L1 associativity: %d ways "
                                 "(jump at K=%zu; OS reports %d)\n",
                         measured_l1_assoc, ks_b[jump_b], detected_l1_ways);
        } else {
            std::fprintf(stderr, "warning: no L1 associativity jump found in phase B\n");
        }
    }

    // ---------------- Phase C: beyond-L1 probe (unreliable, see header) ----
    // Higher caches are physically indexed in bits beyond the 4 KiB page
    // offset, so virtual spacing D does not control their set mapping. Any
    // "period"/"associativity" derived here is an artifact of random physical
    // frame placement, reported as such.
    uint64_t period_beyond_l1 = 0;
    if (detected_l1_ways >= 2) {
        const size_t k_c = (size_t)detected_l1_ways - 1;  // stay within L1 ways
        if (!quiet) std::fprintf(stderr, "--- phase C: beyond-L1 spacing sweep (K=%zu) ---\n", k_c);
        std::vector<double> medians_c;
        std::vector<uint64_t> ds_c;
        for (uint64_t d = 2 * period_l1; d <= max_d; d *= 2) {
            if ((size_t)k_c * (d / sizeof(Node)) > arena_nodes) break;
            const Sample s = measure_point("beyond_l1_period", d, k_c, &ops_dummy);
            medians_c.push_back(s.median_ns);
            ds_c.push_back(d);
            if (!quiet) {
                std::fprintf(stderr, "  D=%9s  median %8.3f ns\n",
                             human_bytes(d).c_str(), s.median_ns);
            }
            if (d > max_d / 2) break;
        }
        const size_t jump_c = find_first_jump(medians_c, kJumpRatio);
        if (jump_c != SIZE_MAX) {
            period_beyond_l1 = ds_c[jump_c];
            if (!quiet) {
                std::fprintf(stderr, "beyond-L1 jump at D=%s (NOT a cache set period — "
                                     "physical-indexing artifact, see docs)\n",
                             human_bytes(period_beyond_l1).c_str());
            }
            // K-sweep at that spacing: shows the partial-thrash plateau shape.
            if (!quiet) std::fprintf(stderr, "--- phase C: beyond-L1 K-sweep at D=%s ---\n",
                                     human_bytes(period_beyond_l1).c_str());
            std::vector<double> medians_d;
            std::vector<size_t> ks_d;
            for (int k = 2; k <= detected_l1_ways + 1; ++k) {
                if ((size_t)k * (period_beyond_l1 / sizeof(Node)) > arena_nodes) break;
                const Sample s = measure_point("beyond_l1_k_sweep", period_beyond_l1,
                                               (size_t)k, &ops_dummy);
                medians_d.push_back(s.median_ns);
                ks_d.push_back((size_t)k);
                if (!quiet) std::fprintf(stderr, "  K=%3d  median %8.3f ns\n", k, s.median_ns);
            }
            // The K-sweep rows are kept in the CSV; no associativity number is
            // derived from them — the jump position here reflects random
            // physical-frame collisions, not cache geometry.
            (void)ks_d; (void)medians_d;
        } else if (!quiet) {
            std::fprintf(stderr, "note: no beyond-L1 jump found in phase C\n");
        }
    } else if (!quiet) {
        std::fprintf(stderr, "note: L1 ways not reported by the OS; skipping phase C\n");
    }

    csv.flush();
    if (!csv.good()) {
        std::fprintf(stderr, "error: failed writing %s\n", csv_path.c_str());
        return 2;
    }

    std::printf("\nsummary (measured, this run):\n");
    std::printf("  L1 set period      : %s\n", human_bytes(period_l1).c_str());
    std::printf("  L1 associativity   : %s\n",
                measured_l1_assoc > 0 ? std::to_string(measured_l1_assoc).c_str()
                                      : "not determined");
    if (period_beyond_l1) {
        std::printf("  beyond-L1 jump     : %s (artifact — L2/L3 are physically\n"
                    "                       indexed; virtual spacing cannot probe them,\n"
                    "                       see docs/associativity.md)\n",
                    human_bytes(period_beyond_l1).c_str());
    }
    std::printf("  (OS-detected L1d ways: %d — comparison only, not an input to the "
                "phase A/B measurement)\n", detected_l1_ways);
    std::printf("wrote %s\nplot with: python scripts/plot_associativity.py\n",
                csv_path.c_str());
    return 0;
}
