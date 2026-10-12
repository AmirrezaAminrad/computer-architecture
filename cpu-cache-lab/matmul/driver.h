#pragma once
// Shared driver for the matmul ladder: CLI parsing, matrix setup, timing,
// verification against the naive reference, CSV output, and the self-test
// that runs every rung on deliberately awkward sizes (edge tiles/panels).
//
// Per-rung binaries (naive.cpp, ikj.cpp, ...) are thin wrappers around
// rung_main(); sweep.cpp implements the full ladder itself on top of the
// same helpers.

#include "common/bench_utils.h"
#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/pinning.h"
#include "common/random.h"
#include "matmul/kernels.h"

#include <algorithm>
#include <cstdio>
#include <fstream>
#include <string>
#include <vector>

#ifndef BENCH_BUILD_FLAGS
#define BENCH_BUILD_FLAGS "unknown"
#endif

namespace matmul {

using namespace lab;  // the lab's timing/pinning/RNG utilities

// Uniform kernel signature: every rung is callable the same way; unused
// parameters (tile/threads) are ignored by the simpler rungs.
using GemmFn = void (*)(const double* A, const double* B, double* C, int n,
                        int tile, int threads, std::string* impl);

inline void gemm0_naive(const double* A, const double* B, double* C, int n,
                        int, int, std::string* impl) {
    rung0_ijk(A, B, C, n);
    if (impl) *impl = "plain-ijk";
}
inline void gemm1_ikj(const double* A, const double* B, double* C, int n,
                      int, int, std::string* impl) {
    rung1_ikj(A, B, C, n);
    if (impl) *impl = "plain-ikj";
}
inline void gemm2_tiled(const double* A, const double* B, double* C, int n,
                        int tile, int, std::string* impl) {
    rung2_tiled(A, B, C, n, tile);
    if (impl) *impl = "tiled-ikj";
}
inline void gemm3_vectorized(const double* A, const double* B, double* C,
                             int n, int, int, std::string* impl) {
    rung3_vectorized(A, B, C, n, impl);
}
inline void gemm4_blocked(const double* A, const double* B, double* C, int n,
                          int tile, int, std::string* impl) {
    rung4_blocked(A, B, C, n, tile, impl);
}
inline void gemm5_openmp(const double* A, const double* B, double* C, int n,
                         int tile, int threads, std::string* impl) {
    rung5_openmp(A, B, C, n, tile, threads, impl);
}

inline GemmFn rung_fn(int rung) {
    switch (rung) {
        case 0: return gemm0_naive;
        case 1: return gemm1_ikj;
        case 2: return gemm2_tiled;
        case 3: return gemm3_vectorized;
        case 4: return gemm4_blocked;
        case 5: return gemm5_openmp;
        default: return nullptr;
    }
}

inline const char* rung_name(int rung) {
    switch (rung) {
        case 0: return "naive-ijk";
        case 1: return "ikj";
        case 2: return "tiled";
        case 3: return "vectorized";
        case 4: return "blocked";
        case 5: return "openmp";
        default: return "?";
    }
}

inline int rung_default_tile(int rung) {
    return rung == 2 ? 64 : 256;  // rungs 4/5 use the packing-friendly size
}

// ---------------------------------------------------------------------------
// Matrix helpers
// ---------------------------------------------------------------------------

inline void init_random(double* M, size_t count, uint64_t seed) {
    SplitMix64 rng(seed);
    for (size_t i = 0; i < count; ++i) {
        M[i] = (double)(rng.next() >> 11) * (1.0 / 9007199254740992.0);  // [0,1)
    }
}

// Verifies C against the naive reference. Different rungs sum in different
// orders, so tiny floating-point differences are expected; the tolerance is
// far above reordering noise (~1e-13 relative) and far below any real bug.
inline double max_abs_diff(const double* C, const double* ref, size_t count,
                           double* ref_scale_out) {
    double maxdiff = 0.0, maxref = 0.0;
    for (size_t i = 0; i < count; ++i) {
        const double d = C[i] > ref[i] ? C[i] - ref[i] : ref[i] - C[i];
        if (d > maxdiff) maxdiff = d;
        const double a = ref[i] > 0 ? ref[i] : -ref[i];
        if (a > maxref) maxref = a;
    }
    if (ref_scale_out) *ref_scale_out = maxref;
    return maxdiff;
}

inline bool verify_ok(double maxdiff, double ref_scale) {
    return maxdiff <= 1e-9 * (ref_scale > 1.0 ? ref_scale : 1.0);
}

struct Timing {
    double median_s;
    double min_s;
};

inline Timing time_gemm(GemmFn fn, const double* A, const double* B, double* C,
                        int n, int tile, int threads, std::string* impl,
                        int reps, bool warmup) {
    if (warmup) fn(A, B, C, n, tile, threads, nullptr);  // untimed warm-up
    std::vector<double> secs;
    secs.reserve((size_t)reps);
    for (int r = 0; r < reps; ++r) {
        std::fill(C, C + (size_t)n * n, 0.0);
        const int64_t t0 = now_ns();
        // Capture the impl string from the first timed run — an extra call
        // afterwards would run on top of the existing C (C += A·B) and leave
        // ~2x the result in the matrix, which poisoned verification once
        // already. Zeroing + the timed run keeps C bit-correct.
        fn(A, B, C, n, tile, threads, r == 0 ? impl : nullptr);
        const int64_t t1 = now_ns();
        secs.push_back((double)(t1 - t0) / 1e9);
    }
    return {median_of_sorted(secs),
            *std::min_element(secs.begin(), secs.end())};
}

inline double gflops(int n, double seconds) {
    return 2.0 * (double)n * (double)n * (double)n / seconds / 1e9;
}

// Appends a result row; creates the CSV with its header when missing.
inline bool append_csv(const std::string& path, const std::string& row,
                       std::string& error) {
    std::error_code ec;
    const auto parent = std::filesystem::path(path).parent_path();
    if (!parent.empty()) std::filesystem::create_directories(parent, ec);
    std::ofstream out(path, std::ios::binary | std::ios::app);
    if (!out) {
        error = "cannot open " + path + " for appending";
        return false;
    }
    static const char* kHeader =
        "version,n,tile,threads,impl,seconds_median,gflops_median,"
        "seconds_min,gflops_min,verify_max_diff,status,compiler,flags";
    out.seekp(0, std::ios::end);
    if (out.tellp() == 0) out << kHeader << '\n';
    out << row << '\n';
    out.flush();
    if (!out.good()) {
        error = "failed while writing " + path;
        return false;
    }
    return true;
}

inline std::string csv_escape(const std::string& s) {
    return s.find(',') == std::string::npos ? s : "\"" + s + "\"";
}

// ---------------------------------------------------------------------------
// Self-test: every rung on awkward sizes vs the naive reference. Covers
// n % 4 != 0 (edge panels), tile > n, tiles that do not divide n, and the
// OpenMP path with 2 threads. Rung 6 is checked only if a BLAS is present.
// ---------------------------------------------------------------------------
inline int self_test(bool include_blas) {
    int failures = 0;
    auto check = [&](bool ok, const std::string& what) {
        if (!ok) {
            ++failures;
            std::printf("FAIL: %s\n", what.c_str());
        }
    };

    const struct { int n, tile; } cases[] = {{5, 8}, {63, 16}, {64, 32},
                                             {65, 48}, {1, 4}};
    for (const auto& tc : cases) {
        const size_t count = (size_t)tc.n * tc.n;
        std::vector<double> A(count), B(count), Cref(count), C(count);
        init_random(A.data(), count, 1000 + tc.n);
        init_random(B.data(), count, 2000 + tc.n);
        rung0_ijk(A.data(), B.data(), Cref.data(), tc.n);

        for (int rung = 1; rung <= 5; ++rung) {
            std::fill(C.begin(), C.end(), 0.0);
            std::string impl;
            GemmFn fn = rung_fn(rung);
            fn(A.data(), B.data(), C.data(), tc.n, tc.tile,
               rung == 5 ? 2 : 1, &impl);
            double scale = 0.0;
            const double diff = max_abs_diff(C.data(), Cref.data(), count, &scale);
            char msg[128];
            std::snprintf(msg, sizeof msg, "n=%d tile=%d rung %d (%s): diff %.3e",
                          tc.n, tc.tile, rung, impl.c_str(), diff);
            check(verify_ok(diff, scale), msg);
        }
    }

    if (include_blas) {
        BlasHandle blas;
        if (blas_load(&blas)) {
            const int n = 64;
            const size_t count = (size_t)n * n;
            std::vector<double> A(count), B(count), Cref(count), C(count);
            init_random(A.data(), count, 3000);
            init_random(B.data(), count, 4000);
            rung0_ijk(A.data(), B.data(), Cref.data(), n);
            std::fill(C.begin(), C.end(), 0.0);
            rung6_blas(blas, A.data(), B.data(), C.data(), n);
            double scale = 0.0;
            const double diff = max_abs_diff(C.data(), Cref.data(), count, &scale);
            char msg[128];
            std::snprintf(msg, sizeof msg, "n=64 rung 6 blas(%s): diff %.3e",
                          blas.name.c_str(), diff);
            check(verify_ok(diff, scale), msg);
            blas_unload(&blas);
        } else {
            std::printf("note: no BLAS found — rung 6 self-test skipped\n");
        }
    }

    std::printf("matmul self-test: %s\n", failures ? "FAILED" : "OK");
    return failures ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Shared CLI for the per-rung binaries.
// ---------------------------------------------------------------------------
struct Options {
    int n = 1024;
    int tile = 64;      // replaced by the rung default in rung_main
    int threads = 0;    // 0 = OpenMP default
    int reps = 3;
    int cpu = 0;
    bool cpu_given = false;  // --cpu seen on the command line
    bool warmup = true;
    bool verify = true;
    bool quiet = false;
    std::string out_dir = "results";
    std::string csv_name = "matmul.csv";
};

inline void print_usage_common(std::FILE* out, const char* extra) {
    std::fprintf(out,
        "Options (defaults in brackets):\n"
        "  --size N        matrix dimension [1024]\n"
        "  --reps N        timed repetitions [3]\n"
        "  --cpu N         pin to logical CPU N; -1 disables [0]\n"
        "  --warmup 0/1    untimed warm-up pass [1]\n"
        "  --verify 0/1    check result against the naive reference [1]\n"
        "  --out-dir DIR   output directory [results]\n"
        "  --csv NAME      CSV file name [matmul.csv]\n"
        "  --quiet         suppress progress lines\n"
        "  --self-test     run correctness checks and exit\n"
        "  --help          this text\n%s", extra);
}

// One rung, timed and verified. Returns process exit code.
inline int rung_main(int argc, char** argv, int rung) {
    Options opt;
    opt.tile = rung_default_tile(rung);
    const bool wants_tile = (rung == 2 || rung == 4 || rung == 5);
    const bool wants_threads = (rung == 5);
    char extra[256];
    std::snprintf(extra, sizeof extra, "%s%s",
                  wants_tile ? "  --tile T        tile size\n" : "",
                  wants_threads ? "  --threads N     OpenMP team size [all]\n" : "");

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto next = [&](std::string* v) -> bool {
            if (i + 1 >= argc) return false;
            *v = argv[++i];
            return true;
        };
        std::string v;
        if (arg == "--help") { print_usage_common(stdout, extra); return 0; }
        else if (arg == "--self-test") { return self_test(false); }
        else if (arg == "--size" && next(&v)) opt.n = std::atoi(v.c_str());
        else if (arg == "--tile" && next(&v)) opt.tile = std::atoi(v.c_str());
        else if (arg == "--threads" && next(&v)) opt.threads = std::atoi(v.c_str());
        else if (arg == "--reps" && next(&v)) opt.reps = std::atoi(v.c_str());
        else if (arg == "--cpu" && next(&v)) {
            opt.cpu = std::atoi(v.c_str());
            opt.cpu_given = true;
        }
        else if (arg == "--warmup" && next(&v)) opt.warmup = v != "0";
        else if (arg == "--verify" && next(&v)) opt.verify = v != "0";
        else if (arg == "--out-dir" && next(&v)) opt.out_dir = v;
        else if (arg == "--csv" && next(&v)) opt.csv_name = v;
        else if (arg == "--quiet") opt.quiet = true;
        else {
            std::fprintf(stderr, "error: unknown argument '%s' (see --help)\n",
                         arg.c_str());
            return 2;
        }
    }
    if (opt.n < 1 || opt.n > 8192) {
        std::fprintf(stderr, "error: --size must be in [1, 8192]\n");
        return 2;
    }
    if (opt.reps < 1 || opt.reps > 100) {
        std::fprintf(stderr, "error: --reps must be in [1, 100]\n");
        return 2;
    }

    // Pinning for a multithreaded run is a trap: Windows worker threads
    // inherit their creator's affinity mask, so an OpenMP team spawned from a
    // thread pinned to one core all land on that core (and libgomp's default
    // team size follows the same mask). Default: no pinning for rung 5.
    const bool pin = opt.cpu >= 0 && !(rung == 5 && !opt.cpu_given);
    if (pin) {
        std::string err;
        if (pin_to_cpu(opt.cpu, err)) {
            if (!opt.quiet) std::fprintf(stderr, "pinned to logical CPU %d\n", opt.cpu);
        } else {
            std::fprintf(stderr, "warning: pinning failed (%s); continuing UNPINNED\n",
                         err.c_str());
        }
    } else if (rung == 5 && !opt.cpu_given && !opt.quiet) {
        std::fprintf(stderr, "not pinning (multithreaded rung; --cpu N to pin "
                             "anyway — the team inherits the pin)\n");
    }

    double tsc_hz = 0.0;
    const MachineInfo machine = query_machine();
    if (!calibrate_tsc(&tsc_hz)) {
        std::fprintf(stderr, "warning: TSC calibration unavailable\n");
    }

    const size_t count = (size_t)opt.n * opt.n;
    std::vector<double> A(count), B(count), C(count);
    try {
        init_random(A.data(), count, 42);
        init_random(B.data(), count, 1337);
    } catch (const std::bad_alloc&) {
        std::fprintf(stderr, "error: out of memory for --size %d\n", opt.n);
        return 3;
    }

    GemmFn fn = rung_fn(rung);
    if (rung == 5 && opt.threads == 0) {
        // Resolve the default team size from the hardware: libgomp's own
        // default can be sticky after pinning/parallel-region history.
        opt.threads = logical_cpu_count();
    }
    std::string impl;
    const Timing t = time_gemm(fn, A.data(), B.data(), C.data(), opt.n,
                               opt.tile, opt.threads, &impl, opt.reps, opt.warmup);

    // Verification: recompute the naive reference (skipped for rung 0 —
    // it IS the reference).
    double diff = 0.0;
    std::string status = "ok";
    if (opt.verify && rung != 0) {
        std::vector<double> Cref(count);
        rung0_ijk(A.data(), B.data(), Cref.data(), opt.n);
        double scale = 0.0;
        diff = max_abs_diff(C.data(), Cref.data(), count, &scale);
        if (!verify_ok(diff, scale)) status = "FAILED";
    }

    std::string err;
    if (!write_machine_json(opt.out_dir + "/machine_matmul.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            rung_name(rung), 0, tsc_hz, err)) {
        std::fprintf(stderr, "warning: machine_matmul.json: %s\n", err.c_str());
    }
    char row[512];
    std::snprintf(row, sizeof row,
                  "%s,%d,%d,%d,%s,%.6f,%.2f,%.6f,%.2f,%.3e,%s,%s,%s",
                  rung_name(rung), opt.n, wants_tile ? opt.tile : 0,
                  wants_threads ? (opt.threads > 0 ? opt.threads : -1) : 1,
                  csv_escape(impl).c_str(), t.median_s, gflops(opt.n, t.median_s),
                  t.min_s, gflops(opt.n, t.min_s), diff, status.c_str(),
                  csv_escape(std::string("g++ ") + __VERSION__).c_str(),
                  csv_escape(BENCH_BUILD_FLAGS).c_str());
    if (!append_csv(opt.out_dir + "/" + opt.csv_name, row, err)) {
        std::fprintf(stderr, "error: %s\n", err.c_str());
        return 2;
    }

    std::printf("%-12s n=%-5d %8.4f s  %8.2f GFLOP/s  impl=%s%s%s\n",
                rung_name(rung), opt.n, t.median_s, gflops(opt.n, t.median_s),
                impl.c_str(),
                rung != 0 && opt.verify ? "  verify: " : "",
                rung != 0 && opt.verify ? status.c_str() : "");
    return status == "FAILED" ? 1 : 0;
}

}  // namespace matmul
