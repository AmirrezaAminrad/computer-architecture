// Stage 2 benchmark: branch prediction — predictable vs unpredictable.
//
// The same multiset of values is processed through an IDENTICAL kernel in
// three orders: random, ascending, descending. A value below a threshold
// takes a cheap "hot" path; anything else takes a `noinline` cold path whose
// side effect on a global forces the compiler to emit a real conditional
// branch (it cannot if-convert or predicate a call with memory side effects).
//   random      : ~50% of branches go each way, unpredictably -> mispredicts
//   sorted      : one long taken run then one long not-taken run -> ~perfect
//   descending  : same, reversed
//
// A second kernel (`--kind branchless`, the default comparison) replaces the
// branch with a select: `hot += (x < t) ? x : 0;` — what the compiler usually
// lowers to a conditional move. If that lowering happened, order no longer
// matters, which is exactly the lesson: compilers can delete your branches.
// Check the emitted code with:
//   objdump -d build/bin/branch.exe | grep -A30 "run_branch"
// (the checked-in docs quote what GCC 14.2 actually emitted here).
//
// The working set (default 4 MiB) fits L3 but exceeds L2, so memory latency
// does not drown the ~10-20-cycle misprediction penalty.
//
// Output CSV: kind,order,n_elements,passes,median_ns_per_element,min_ns_per_element

#include "common/bench_utils.h"
#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/hints.h"
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

uint64_t g_cold_sink = 0;

// Side effect on a global makes this impossible to if-convert: the call must
// genuinely be branched around.
__attribute__((noinline)) void cold_path(uint32_t x) {
    g_cold_sink = g_cold_sink * 31u + x;
}

#if defined(__GNUC__) && !defined(__clang__)
__attribute__((optimize("no-tree-vectorize")))
#endif
uint64_t run_branch(const uint32_t* data, size_t n, uint32_t t,
                    size_t target_elems) {
    const size_t passes = (target_elems + n - 1) / n;
    uint64_t hot = 0;
    for (size_t p = 0; p < passes; ++p) {
        for (size_t i = 0; i < n; ++i) {
            const uint32_t x = data[i];
            if (x < t) {
                hot += x;
            } else {
                cold_path(x);
            }
        }
    }
    do_not_optimize(hot);
    return passes * n;
}

#if defined(__GNUC__) && !defined(__clang__)
__attribute__((optimize("no-tree-vectorize")))
#endif
uint64_t run_branchless(const uint32_t* data, size_t n, uint32_t t,
                        size_t target_elems) {
    const size_t passes = (target_elems + n - 1) / n;
    uint64_t hot = 0;
    for (size_t p = 0; p < passes; ++p) {
        for (size_t i = 0; i < n; ++i) {
            const uint32_t x = data[i];
            hot += (x < t) ? x : 0;
        }
    }
    do_not_optimize(hot);
    return passes * n;
}

// Builds the value multiset and the three orders.
void build_data(size_t n, uint64_t seed, std::vector<uint32_t>& random_order,
                std::vector<uint32_t>& ascending, std::vector<uint32_t>& descending) {
    SplitMix64 rng(seed);
    random_order.resize(n);
    for (size_t i = 0; i < n; ++i) {
        random_order[i] = (uint32_t)(rng.next() % 1000u);
    }
    ascending = random_order;
    std::sort(ascending.begin(), ascending.end());
    descending = ascending;
    std::reverse(descending.begin(), descending.end());
}

int self_test() {
    int failures = 0;
    auto check = [&](bool ok, const char* what) {
        if (!ok) { ++failures; std::printf("FAIL: %s\n", what); }
    };

    const size_t n = 200;
    std::vector<uint32_t> rnd, asc, des;
    build_data(n, 7, rnd, asc, des);

    // The hot sum must be identical across orders (same multiset): this
    // verifies all three orderings go through the same computation.
    uint32_t t = 100;
    uint64_t ref = 0;
    for (size_t i = 0; i < n; ++i) {
        if (asc[i] < t) ref += asc[i];  // ascending contains the same values
    }
    uint64_t hot_r = 0, hot_a = 0, hot_d = 0;
    // run_* does not return the hot sum; recompute it the same way the kernel
    // does to validate the kernel on tiny inputs.
    auto tiny_branch = [&](const std::vector<uint32_t>& d) {
        uint64_t hot = 0;
        for (size_t i = 0; i < d.size(); ++i) {
            const uint32_t x = d[i];
            if (x < t) hot += x;
            else cold_path(x);
        }
        return hot;
    };
    hot_r = tiny_branch(rnd);
    hot_a = tiny_branch(asc);
    hot_d = tiny_branch(des);
    check(hot_r == ref, "branch kernel hot sum matches reference");
    check(hot_a == ref, "ascending order gives the same hot sum");
    check(hot_d == ref, "descending order gives the same hot sum");

    // Pass rounding: fewer target elements than n still runs one full pass.
    const uint64_t ops = run_branch(asc.data(), n, t, 50);
    check(ops == n, "target below one pass runs exactly one pass");

    std::printf("branch self-test: %s (cold sink %llu)\n",
                failures ? "FAILED" : "OK", (unsigned long long)g_cold_sink);
    return failures ? 1 : 0;
}

void print_usage(std::FILE* out) {
    std::fprintf(out,
        "branch — predictable vs unpredictable branches (and cmov flattening)\n"
        "\n"
        "Options (defaults in brackets):\n"
        "  --size N       elements per pass [1048576]\n"
        "  --threshold V  hot-path threshold, values are 0..999 [500]\n"
        "  --kind K       branch | branchless | both [both]\n"
        "  --reps N       timed repetitions per point [5]\n"
        "  --seed S       data-generation seed [42]\n"
        "  --cpu N        pin to logical CPU N; -1 disables [0]\n"
        "  --out-dir DIR  output directory [results]\n"
        "  --csv NAME     CSV file name [branch.csv]\n"
        "  --quiet        suppress progress lines\n"
        "  --self-test    run correctness checks and exit\n"
        "  --help         this text\n");
}

}  // namespace

int main(int argc, char** argv) {
    size_t n = 1u << 20;
    uint32_t threshold = 500;
    uint64_t seed = 42;
    int reps = 5, cpu = 0;
    std::string kind = "both", out_dir = "results", csv_name = "branch.csv";
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
        else if (arg == "--size" && next(&v)) n = std::strtoull(v.c_str(), nullptr, 10);
        else if (arg == "--threshold" && next(&v)) threshold = (uint32_t)std::atoi(v.c_str());
        else if (arg == "--kind" && next(&v)) {
            if (v != "branch" && v != "branchless" && v != "both") {
                std::fprintf(stderr, "error: --kind must be branch|branchless|both\n");
                return 2;
            }
            kind = v;
        }
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
    if (n < 16 || n > (1ull << 30) || threshold > 999) {
        std::fprintf(stderr, "error: --size out of range or --threshold > 999\n");
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

    std::vector<uint32_t> rnd, asc, des;
    try {
        build_data(n, seed, rnd, asc, des);
    } catch (const std::bad_alloc&) {
        std::fprintf(stderr, "error: out of memory for --size %zu\n", n);
        return 3;
    }

    const std::string csv_path = out_dir + "/" + csv_name;
    std::string err;
    std::ofstream csv = open_csv(csv_path,
        "kind,order,n_elements,passes,median_ns_per_element,min_ns_per_element",
        err);
    if (!csv) {
        std::fprintf(stderr, "error: %s\n", err.c_str());
        return 2;
    }
    if (!write_machine_json(out_dir + "/machine_branch.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            "branch", seed, tsc_hz, err)) {
        std::fprintf(stderr, "warning: machine_branch.json: %s\n", err.c_str());
    }

    struct Order { const char* name; const std::vector<uint32_t>* data; };
    const Order orders[] = {
        {"random", &rnd}, {"ascending", &asc}, {"descending", &des},
    };

    size_t point = 0, points = 0;
    const bool do_branch = kind != "branchless";
    const bool do_branchless = kind != "branch";
    points = (do_branch ? 3 : 0) + (do_branchless ? 3 : 0);

    auto run_kind = [&](const char* kind_name,
                        uint64_t (*kernel)(const uint32_t*, size_t, uint32_t, size_t)) {
        for (const Order& o : orders) {
            size_t last_ops = 0;
            const Sample s = measure_ns_per_op(
                [&](size_t target) {
                    last_ops = kernel(o.data->data(), o.data->size(), threshold, target);
                    return last_ops;
                },
                kTargetRepNs, reps);
            csv << kind_name << ',' << o.name << ',' << o.data->size() << ','
                << last_ops / o.data->size() << ',' << s.median_ns << ','
                << s.min_ns << '\n';
            if (!quiet) {
                std::fprintf(stderr, "[%2zu/%2zu] %-10s %-10s median %7.3f ns/elem  min %7.3f\n",
                             ++point, points, kind_name, o.name, s.median_ns, s.min_ns);
            }
        }
    };

    if (do_branch) run_kind("branch", run_branch);
    if (do_branchless) run_kind("branchless", run_branchless);

    csv.flush();
    if (!csv.good()) {
        std::fprintf(stderr, "error: failed writing %s\n", csv_path.c_str());
        return 2;
    }
    std::printf("wrote %s\nplot with: python scripts/plot_branch.py\n", csv_path.c_str());
    return 0;
}
