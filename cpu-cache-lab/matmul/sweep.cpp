// The matmul ladder sweep: runs every rung at the requested size on the SAME
// matrices, verifies each against the naive reference, sweeps tile sizes for
// the tiled rung, and finishes with the BLAS comparison if a BLAS library is
// present on the machine (dynamically loaded; reported as skipped if not).
//
// Every result goes to results/matmul.csv (one row per version/tile) — the
// same CSV the per-rung binaries append to, so runs accumulate.
//
//   matmul_sweep [--size 1024] [--tile-sweep 8,16,24,32,48,64,96,128]
//                [--threads N] [--reps 3] [--cpu 0] [--out-dir results]
//                [--csv matmul.csv] [--quiet] [--self-test] [--help]

#include "matmul/driver.h"

#include <cstdlib>
#include <string>
#include <vector>

namespace matmul {

namespace {

std::vector<int> parse_tile_list(const std::string& text, bool* ok) {
    std::vector<int> tiles;
    size_t pos = 0;
    *ok = true;
    while (pos < text.size()) {
        const size_t comma = text.find(',', pos);
        const std::string part = text.substr(pos, comma == std::string::npos
                                                       ? std::string::npos
                                                       : comma - pos);
        const int t = std::atoi(part.c_str());
        if (t < 1 || t > 2048) {
            *ok = false;
            return tiles;
        }
        tiles.push_back(t);
        if (comma == std::string::npos) break;
        pos = comma + 1;
    }
    return tiles;
}

}  // namespace

int sweep_main(int argc, char** argv) {
    Options opt;
    opt.tile = 64;
    std::string tile_list = "8,16,24,32,48,64,96,128";

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        auto next = [&](std::string* v) -> bool {
            if (i + 1 >= argc) return false;
            *v = argv[++i];
            return true;
        };
        std::string v;
        if (arg == "--help") {
            print_usage_common(stdout,
                "  --tile-sweep LIST  comma-separated tile sizes for the tiled rung\n"
                "                     [8,16,24,32,48,64,96,128]\n"
                "  --threads N        OpenMP team size for rung 5 [all]\n");
            return 0;
        }
        else if (arg == "--self-test") { return self_test(true); }
        else if (arg == "--tile-sweep" && next(&v)) tile_list = v;
        else if (arg == "--size" && next(&v)) opt.n = std::atoi(v.c_str());
        else if (arg == "--threads" && next(&v)) opt.threads = std::atoi(v.c_str());
        else if (arg == "--reps" && next(&v)) opt.reps = std::atoi(v.c_str());
        else if (arg == "--cpu" && next(&v)) opt.cpu = std::atoi(v.c_str());
        else if (arg == "--out-dir" && next(&v)) opt.out_dir = v;
        else if (arg == "--csv" && next(&v)) opt.csv_name = v;
        else if (arg == "--quiet") opt.quiet = true;
        else {
            std::fprintf(stderr, "error: unknown argument '%s' (see --help)\n",
                         arg.c_str());
            return 2;
        }
    }
    if (opt.n < 1 || opt.n > 8192 || opt.reps < 1 || opt.reps > 100) {
        std::fprintf(stderr, "error: bad --size or --reps\n");
        return 2;
    }
    bool tiles_ok = true;
    const std::vector<int> tiles = parse_tile_list(tile_list, &tiles_ok);
    if (!tiles_ok || tiles.empty()) {
        std::fprintf(stderr, "error: bad --tile-sweep '%s'\n", tile_list.c_str());
        return 2;
    }

    if (opt.cpu >= 0) {
        std::string err;
        if (pin_to_cpu(opt.cpu, err)) {
            if (!opt.quiet) std::fprintf(stderr, "pinned to logical CPU %d\n", opt.cpu);
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

    const size_t count = (size_t)opt.n * opt.n;
    std::vector<double> A(count), B(count), C(count), Cref(count);
    try {
        init_random(A.data(), count, 42);
        init_random(B.data(), count, 1337);
    } catch (const std::bad_alloc&) {
        std::fprintf(stderr, "error: out of memory for --size %d\n", opt.n);
        return 3;
    }

    const std::string csv_path = opt.out_dir + "/" + opt.csv_name;
    std::string err;
    std::ofstream csv = open_csv(csv_path,
        "version,n,tile,threads,impl,seconds_median,gflops_median,"
        "seconds_min,gflops_min,verify_max_diff,status,compiler,flags", err);
    if (!csv) {
        std::fprintf(stderr, "error: %s\n", err.c_str());
        return 2;
    }
    if (!write_machine_json(opt.out_dir + "/machine_matmul.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            "sweep", 0, tsc_hz, err)) {
        std::fprintf(stderr, "warning: machine_matmul.json: %s\n", err.c_str());
    }

    int failures = 0;
    int threads_report = opt.threads > 0 ? opt.threads : -1;

    // --- Rung 0: naive ijk. Its output doubles as the verification reference.
    if (!opt.quiet) std::fprintf(stderr, "--- rung 0: naive ijk ---\n");
    std::string impl;
    Timing t = time_gemm(gemm0_naive, A.data(), B.data(), C.data(), opt.n,
                         0, 1, &impl, opt.reps, opt.warmup);
    std::copy(C.begin(), C.end(), Cref.begin());
    csv << "naive-ijk," << opt.n << ",0,1," << impl << ',' << t.median_s << ','
        << gflops(opt.n, t.median_s) << ',' << t.min_s << ','
        << gflops(opt.n, t.min_s) << ",0.000e+00,ok,"
        << csv_escape(std::string("g++ ") + __VERSION__) << ','
        << csv_escape(BENCH_BUILD_FLAGS) << '\n';
    if (!opt.quiet) {
        std::fprintf(stderr, "  %8.4f s  %8.2f GFLOP/s\n", t.median_s,
                     gflops(opt.n, t.median_s));
    }

    // --- Helper for rungs 1..5: run into C, verify vs Cref, append row.
    auto run_and_record = [&](const char* version, GemmFn fn, int tile,
                              int threads, bool threads_col) {
        if (!opt.quiet) std::fprintf(stderr, "--- %s ---\n", version);
        std::fill(C.begin(), C.end(), 0.0);
        std::string impl_local;
        t = time_gemm(fn, A.data(), B.data(), C.data(), opt.n, tile, threads,
                      &impl_local, opt.reps, opt.warmup);
        double scale = 0.0;
        const double diff = max_abs_diff(C.data(), Cref.data(), count, &scale);
        const bool ok = verify_ok(diff, scale);
        if (!ok) ++failures;
        csv << version << ',' << opt.n << ',' << tile << ','
            << (threads_col ? threads_report : 1) << ','
            << csv_escape(impl_local) << ',' << t.median_s << ','
            << gflops(opt.n, t.median_s) << ',' << t.min_s << ','
            << gflops(opt.n, t.min_s) << ',' << diff << ','
            << (ok ? "ok" : "FAILED") << ','
            << csv_escape(std::string("g++ ") + __VERSION__) << ','
            << csv_escape(BENCH_BUILD_FLAGS) << '\n';
        if (!opt.quiet) {
            std::fprintf(stderr, "  %8.4f s  %8.2f GFLOP/s  impl=%s  verify: %s (diff %.2e)\n",
                         t.median_s, gflops(opt.n, t.median_s), impl_local.c_str(),
                         ok ? "ok" : "FAILED", diff);
        }
    };

    run_and_record("ikj", gemm1_ikj, 0, 1, false);

    // --- Rung 2: tiled, with the tile-size sweep.
    for (int tile : tiles) {
        run_and_record("tiled", gemm2_tiled, tile, 1, false);
    }

    run_and_record("vectorized", gemm3_vectorized, 0, 1, false);
    run_and_record("blocked", gemm4_blocked, rung_default_tile(4), 1, false);

#ifdef _OPENMP
    // Unpin before multithreaded rows: the OpenMP team inherits this thread's
    // affinity mask, which was pinned to one core for the single-thread rungs.
    std::string unpin_err;
    if (!unpin_thread(unpin_err)) {
        std::fprintf(stderr, "warning: unpin failed (%s)\n", unpin_err.c_str());
    } else if (!opt.quiet) {
        std::fprintf(stderr, "unpinned for the multithreaded rows "
                             "(the team would inherit the one-core pin)\n");
    }
    // libgomp's default team size can go sticky after parallel regions that
    // ran while the thread was pinned — resolve it from the hardware instead.
    const int omp_threads =
        opt.threads > 0 ? opt.threads
                        : (opt.threads == 0 ? lab::logical_cpu_count() : 1);
    threads_report = omp_threads;
    if (!opt.quiet) {
        std::fprintf(stderr, "OpenMP team size: %d\n", omp_threads);
    }
    run_and_record("openmp", gemm5_openmp, rung_default_tile(5), omp_threads,
                   true);
#else
    run_and_record("openmp", gemm5_openmp, rung_default_tile(5), 1, true);
#endif

    // --- Rung 6: BLAS, only if one is present on this machine.
    if (!opt.quiet) std::fprintf(stderr, "--- rung 6: BLAS (dynamic) ---\n");
    BlasHandle blas;
    if (blas_load(&blas)) {
        std::fill(C.begin(), C.end(), 0.0);
        std::vector<double> secs;
        for (int r = 0; r < opt.reps + (opt.warmup ? 1 : 0); ++r) {
            std::fill(C.begin(), C.end(), 0.0);
            const int64_t t0 = now_ns();
            rung6_blas(blas, A.data(), B.data(), C.data(), opt.n);
            const int64_t t1 = now_ns();
            if (opt.warmup && r == 0) continue;  // first pass = warm-up
            secs.push_back((double)(t1 - t0) / 1e9);
        }
        t.median_s = median_of_sorted(secs);
        t.min_s = *std::min_element(secs.begin(), secs.end());
        double scale = 0.0;
        const double diff = max_abs_diff(C.data(), Cref.data(), count, &scale);
        const bool ok = verify_ok(diff, scale);
        if (!ok) ++failures;
        csv << "blas," << opt.n << ",0,1,blas:" << blas.name << ',' << t.median_s
            << ',' << gflops(opt.n, t.median_s) << ',' << t.min_s << ','
            << gflops(opt.n, t.min_s) << ',' << diff << ','
            << (ok ? "ok" : "FAILED") << ','
            << csv_escape(std::string("g++ ") + __VERSION__) << ','
            << csv_escape(BENCH_BUILD_FLAGS) << '\n';
        if (!opt.quiet) {
            std::fprintf(stderr, "  %s: %8.4f s  %8.2f GFLOP/s  verify: %s\n",
                         blas.name.c_str(), t.median_s,
                         gflops(opt.n, t.median_s), ok ? "ok" : "FAILED");
        }
        blas_unload(&blas);
    } else {
        // Not silently skipped: a row records it and the summary says so.
        csv << "blas," << opt.n << ",0,1,none,0,0,0,0,0,skipped,"
            << csv_escape(std::string("g++ ") + __VERSION__) << ','
            << csv_escape(BENCH_BUILD_FLAGS) << '\n';
        std::fprintf(stderr, "  no BLAS library found — rung 6 skipped "
                             "(recorded as 'skipped' in the CSV)\n");
    }

    csv.flush();
    if (!csv.good()) {
        std::fprintf(stderr, "error: failed writing %s\n", csv_path.c_str());
        return 2;
    }

    std::printf("\nwrote %s (%d verification failures)\n", csv_path.c_str(),
                failures);
    std::printf("plot with: python scripts/plot_matmul.py\n");
    return failures ? 1 : 0;
}

}  // namespace matmul

int main(int argc, char** argv) {
    return matmul::sweep_main(argc, argv);
}
