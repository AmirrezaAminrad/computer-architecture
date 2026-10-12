// Stage 5 benchmark: false sharing on the REAL machine.
//
// T threads each increment THEIR OWN atomic counter iters times. Two memory
// layouts, identical program logic:
//   adjacent — counters packed 8 bytes apart: up to 8 counters share one
//              cache line, so every increment invalidates the line in the
//              other cores' caches (coherence traffic per increment).
//   padded   — each counter is alignas(64): one line per counter, zero
//              sharing, zero coherence traffic.
// The measured time difference IS false sharing. On WSL/Linux you can see
// the traffic directly with `perf c2c` (see docs/coherence.md); on this
// Windows machine the timing is the evidence.
//
// Output CSV: layout,threads,iters,reps,seconds_median,seconds_min,
//             increments_per_sec,speedup_vs_adjacent
// (the speedup column is filled only on the padded row of each run).

#include "common/bench_utils.h"
#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/pinning.h"

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <cstdio>
#include <string>
#include <vector>

#ifdef _OPENMP
  #include <omp.h>
#endif

#ifndef BENCH_BUILD_FLAGS
#define BENCH_BUILD_FLAGS "unknown"
#endif

using namespace lab;

namespace {

struct alignas(64) PaddedCounter {
    std::atomic<long> v{0};
};
static_assert(sizeof(PaddedCounter) == 64, "padding must span a cache line");

double run_adjacent(std::vector<std::atomic<long>>& counters, int iters) {
    const double t0 = now_ns();
#ifdef _OPENMP
#pragma omp parallel
#endif
    {
        int t = 0;
#ifdef _OPENMP
        t = omp_get_thread_num();
#endif
        const int n = (int)counters.size();
        for (int i = 0; i < iters; ++i) {
            counters[(size_t)t].fetch_add(1, std::memory_order_relaxed);
            (void)n;
        }
    }
    return (now_ns() - t0) / 1e9;
}

double run_padded(std::vector<PaddedCounter>& counters, int iters) {
    const double t0 = now_ns();
#ifdef _OPENMP
#pragma omp parallel
#endif
    {
        int t = 0;
#ifdef _OPENMP
        t = omp_get_thread_num();
#endif
        for (int i = 0; i < iters; ++i) {
            counters[(size_t)t].v.fetch_add(1, std::memory_order_relaxed);
        }
    }
    return (now_ns() - t0) / 1e9;
}

}  // namespace

int main(int argc, char** argv) {
    int threads = 0;   // 0 = all
    int iters = 5 * 1000 * 1000;
    int reps = 5;
    std::string out_dir = "results", csv_name = "false_sharing.csv";
    bool quiet = false;

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto next = [&](std::string* v) -> bool {
            if (i + 1 >= argc) return false;
            *v = argv[++i];
            return true;
        };
        std::string v;
        if (arg == "--help") {
            std::printf(
                "false_sharing — adjacent vs cache-line-padded atomic counters\n"
                "Options: --threads N [all] --iters N [5000000] --reps N [5]\n"
                "         --out-dir DIR [results] --csv NAME [false_sharing.csv]\n"
                "         --quiet\n");
            return 0;
        }
        else if (arg == "--threads" && next(&v)) threads = std::atoi(v.c_str());
        else if (arg == "--iters" && next(&v)) iters = std::atoi(v.c_str());
        else if (arg == "--reps" && next(&v)) reps = std::atoi(v.c_str());
        else if (arg == "--out-dir" && next(&v)) out_dir = v;
        else if (arg == "--csv" && next(&v)) csv_name = v;
        else if (arg == "--quiet") quiet = true;
        else {
            std::fprintf(stderr, "error: unknown argument '%s'\n", arg.c_str());
            return 2;
        }
    }
#ifdef _OPENMP
    if (threads > 0) omp_set_num_threads(threads);
    else threads = omp_get_max_threads();
#else
    if (threads <= 0) threads = 1;
    std::fprintf(stderr, "warning: compiled without -fopenmp; using 1 thread\n");
#endif
    if (iters < 1000 || reps < 1) {
        std::fprintf(stderr, "error: bad --iters or --reps\n");
        return 2;
    }

    const MachineInfo machine = query_machine();
    double tsc_hz = 0.0;
    if (!calibrate_tsc(&tsc_hz)) {
        std::fprintf(stderr, "warning: TSC calibration unavailable\n");
    }
    std::string json_err;
    if (!write_machine_json(out_dir + "/machine_false_sharing.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            "false_sharing", 0, tsc_hz, json_err)) {
        // best effort: the CSV is the primary artifact
    }

    std::vector<std::atomic<long>> adjacent((size_t)threads);
    for (auto& c : adjacent) c.store(0);
    std::vector<PaddedCounter> padded((size_t)threads);

    // Warm-up, then a correctness invariant for the whole benchmark: thread t
    // only touches counter t, so each counter must equal exactly the number
    // of increments its thread performed.
    run_adjacent(adjacent, 1000);
    run_padded(padded, 1000);
    for (auto& c : adjacent) c.store(0);
    for (auto& c : padded) c.v.store(0);

    const std::string csv_path = out_dir + "/" + csv_name;
    std::string err;
    std::ofstream csv = open_csv(csv_path,
        "layout,threads,iters,reps,seconds_median,seconds_min,"
        "increments_per_sec,speedup_vs_adjacent", err);
    if (!csv) {
        std::fprintf(stderr, "error: %s\n", err.c_str());
        return 2;
    }
    if (!write_machine_json(out_dir + "/machine_false_sharing.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            "false_sharing", 0, tsc_hz, err)) {
        std::fprintf(stderr, "warning: machine_false_sharing.json: %s\n",
                     err.c_str());
    }

    double median_adj = 0.0;
    double speedup = 0.0;

    struct Layout {
        const char* name;
        bool adjacent;
    };
    const Layout layouts[] = {{"adjacent", true}, {"padded", false}};

    for (const auto& layout : layouts) {
        std::vector<double> secs;
        for (int r = 0; r < reps; ++r) {
            const double s = layout.adjacent
                                 ? run_adjacent(adjacent, iters)
                                 : run_padded(padded, iters);
            secs.push_back(s);
            // Correctness: thread t only touched counter t, and the reset
            // before each rep means every counter holds exactly iters.
            const long expected = iters;
            for (int t = 0; t < threads; ++t) {
                const long got = layout.adjacent
                                     ? adjacent[(size_t)t].load()
                                     : padded[(size_t)t].v.load();
                if (got != expected) {
                    std::fprintf(stderr,
                                 "error: %s counter[%d] = %ld, expected %ld "
                                 "— benchmark is broken\n",
                                 layout.name, t, got, expected);
                    return 1;
                }
            }
            // Reset for the next rep (warm-up equivalent).
            if (layout.adjacent) {
                for (auto& c : adjacent) c.store(0);
            } else {
                for (auto& c : padded) c.v.store(0);
            }
        }
        const double median = median_of_sorted(secs);
        const double min_s = *std::min_element(secs.begin(), secs.end());
        const double inc_per_s = (double)threads * iters / median;
        if (layout.adjacent) {
            median_adj = median;
            speedup = 0.0;
        } else {
            speedup = median_adj / median;
        }
        csv << layout.name << ',' << threads << ',' << iters << ',' << reps
            << ',' << median << ',' << min_s << ','
            << (long long)inc_per_s << ','
            << (layout.adjacent ? "" : [&] {
                   char b[32];
                   std::snprintf(b, sizeof b, "%.2f", speedup);
                   return std::string(b);
               }())
            << '\n';
        if (!quiet) {
            std::fprintf(stderr, "%-9s %8.4f s  (%.2f Mincrements/s)\n",
                         layout.name, median, inc_per_s / 1e6);
        }
    }

    csv.flush();
    if (!csv.good()) {
        std::fprintf(stderr, "error: failed writing %s\n", csv_path.c_str());
        return 2;
    }
    std::printf("padded/adjacent speedup: %.2fx  (%d threads, %d iters each)\n",
                speedup, threads, iters);
    std::printf("wrote %s\n", csv_path.c_str());
    return 0;
}
