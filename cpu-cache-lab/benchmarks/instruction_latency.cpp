// Stage 2 benchmark: instruction LATENCY vs THROUGHPUT.
//
// Two regimes for the same arithmetic operation (64-bit integer add / mul):
//
//   chains = 1  : ONE dependent chain, x += c over and over. Each step needs
//                 the previous result, so the per-step cost is the
//                 instruction's LATENCY (add: ~1 cycle, mul: ~3 cycles).
//   chains = K  : K independent accumulators updated side by side. The CPU
//                 overlaps them, so per-step cost approaches the
//                 THROUGHPUT limit (add: up to ~4/cycle on typical cores,
//                 mul: ~1/cycle — one multiply port).
//
// Implementation notes (each defends the measurement against the optimizer):
//   * An asm barrier after every step blocks algebraic folding (without it,
//     GCC turns x+=c; x+=c; into x+=2c and the "latency" collapses to
//     throughput).
//   * The chain body is unrolled 8 steps per loop iteration so loop overhead
//     (inc/cmp/jcc) is amortized to ~1%.
//   * no-tree-vectorize keeps K independent adds scalar; vectorizing would
//     measure SIMD throughput, which is a different experiment (it returns
//     in the matmul stage).
//   * cycles/op comes from the calibrated invariant-TSC frequency (nominal,
//     not turbo — same caveat as everywhere in this lab).
//
// Output CSV: op,chains,loop_iterations,ops,median_ns_per_op,min_ns_per_op,
//             cycles_per_op_median

#include "common/bench_utils.h"
#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/hints.h"
#include "common/pinning.h"

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
constexpr int kUnroll = 8;  // dependent steps per chain per loop iteration

constexpr uint64_t kAddC = 0x9E3779B97F4A7C15ull;
constexpr uint64_t kMulC = 0x2545F4914F6CDD1Dull;  // odd -> full-period mul

template <int K>
#if defined(__GNUC__) && !defined(__clang__)
__attribute__((optimize("no-tree-vectorize")))
#endif
uint64_t chain_add(uint64_t loop_iters, uint64_t* sink) {
    uint64_t r[K];
    for (int j = 0; j < K; ++j) r[j] = 0x1234ull + 0x1000ull * (uint64_t)j;
    for (uint64_t i = 0; i < loop_iters; ++i) {
        for (int s = 0; s < kUnroll; ++s) {
            for (int j = 0; j < K; ++j) {
                r[j] += kAddC;
                asm volatile("" : "+r"(r[j]));
            }
        }
    }
    uint64_t acc = 0;
    for (int j = 0; j < K; ++j) acc ^= r[j];
    do_not_optimize(acc);
    if (sink) *sink += acc;
    return loop_iters * (uint64_t)kUnroll * (uint64_t)K;
}

template <int K>
#if defined(__GNUC__) && !defined(__clang__)
__attribute__((optimize("no-tree-vectorize")))
#endif
uint64_t chain_mul(uint64_t loop_iters, uint64_t* sink) {
    uint64_t r[K];
    for (int j = 0; j < K; ++j) r[j] = 0x1234ull + 0x1000ull * (uint64_t)j;
    for (uint64_t i = 0; i < loop_iters; ++i) {
        for (int s = 0; s < kUnroll; ++s) {
            for (int j = 0; j < K; ++j) {
                r[j] *= kMulC;
                asm volatile("" : "+r"(r[j]));
            }
        }
    }
    uint64_t acc = 0;
    for (int j = 0; j < K; ++j) acc ^= r[j];
    do_not_optimize(acc);
    if (sink) *sink += acc;
    return loop_iters * (uint64_t)kUnroll * (uint64_t)K;
}

int self_test() {
    int failures = 0;
    auto check = [&](bool ok, const char* what) {
        if (!ok) { ++failures; std::printf("FAIL: %s\n", what); }
    };

    // Closed-form check: after n dependent steps, r = seed + n*c (add) or
    // seed * c^n (mul), mod 2^64.
    {
        uint64_t sink = 0;
        const uint64_t iters = 10;  // 10 * 8 = 80 dependent steps
        const uint64_t ops = chain_add<1>(iters, &sink);
        check(ops == iters * kUnroll, "chain_add op count");
        const uint64_t expect = 0x1234ull + 80ull * kAddC;
        // sink accumulated acc = r ^ ... for K=1: acc == r exactly.
        check(sink == expect, "chain_add closed form (seed + steps*c)");
    }
    {
        uint64_t sink = 0;
        const uint64_t iters = 10;
        chain_mul<1>(iters, &sink);
        uint64_t expect = 0x1234ull;
        for (uint64_t i = 0; i < iters * kUnroll; ++i) expect *= kMulC;
        check(sink == expect, "chain_mul closed form (seed * c^steps)");
    }
    {
        // Independent chains: each accumulator follows its own closed form.
        uint64_t sink = 0;
        chain_add<4>(10, &sink);
        uint64_t expect = 0;
        for (int j = 0; j < 4; ++j) {
            expect ^= 0x1234ull + 0x1000ull * (uint64_t)j + 80ull * kAddC;
        }
        check(sink == expect, "chain_add<4> all chains follow closed form");
    }

    std::printf("instruction_latency self-test: %s\n", failures ? "FAILED" : "OK");
    return failures ? 1 : 0;
}

void print_usage(std::FILE* out) {
    std::fprintf(out,
        "instruction_latency — dependent chains (latency) vs independent\n"
        "chains (throughput) for 64-bit add and mul\n"
        "\n"
        "Options (defaults in brackets):\n"
        "  --reps N       timed repetitions per point [5]\n"
        "  --cpu N        pin to logical CPU N; -1 disables [0]\n"
        "  --out-dir DIR  output directory [results]\n"
        "  --csv NAME     CSV file name [instruction_latency.csv]\n"
        "  --quiet        suppress progress lines\n"
        "  --self-test    run correctness checks and exit\n"
        "  --help         this text\n");
}

}  // namespace

int main(int argc, char** argv) {
    int reps = 5, cpu = 0;
    std::string out_dir = "results", csv_name = "instruction_latency.csv";
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
        else if (arg == "--reps" && next(&v)) reps = std::atoi(v.c_str());
        else if (arg == "--cpu" && next(&v)) cpu = std::atoi(v.c_str());
        else if (arg == "--out-dir" && next(&v)) out_dir = v;
        else if (arg == "--csv" && next(&v)) csv_name = v;
        else if (arg == "--quiet") quiet = true;
        else {
            std::fprintf(stderr, "error: unknown argument '%s' (see --help)\n", arg.c_str());
            return 2;
        }
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

    const std::string csv_path = out_dir + "/" + csv_name;
    std::string err;
    std::ofstream csv = open_csv(csv_path,
        "op,chains,loop_iterations,ops,median_ns_per_op,min_ns_per_op,"
        "cycles_per_op_median", err);
    if (!csv) {
        std::fprintf(stderr, "error: %s\n", err.c_str());
        return 2;
    }
    if (!write_machine_json(out_dir + "/machine_instruction_latency.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            "instruction_latency", 0, tsc_hz, err)) {
        std::fprintf(stderr, "warning: machine_instruction_latency.json: %s\n",
                     err.c_str());
    }

    uint64_t sink = 0;
    size_t point = 0, points = 10;  // 5 chain counts x 2 ops
    const int chain_counts[] = {1, 2, 4, 8, 16};

    auto run_op = [&](const char* op_name, bool is_mul) {
        for (int k : chain_counts) {
            uint64_t last_ops = 0;
            // K is a template parameter, so dispatch via explicit
            // instantiations in a switch.
            Sample s;
            if (!is_mul) {
                switch (k) {
                    case 1:  s = measure_ns_per_op([&](size_t t) { last_ops = chain_add<1>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    case 2:  s = measure_ns_per_op([&](size_t t) { last_ops = chain_add<2>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    case 4:  s = measure_ns_per_op([&](size_t t) { last_ops = chain_add<4>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    case 8:  s = measure_ns_per_op([&](size_t t) { last_ops = chain_add<8>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    case 16: s = measure_ns_per_op([&](size_t t) { last_ops = chain_add<16>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    default: continue;
                }
            } else {
                switch (k) {
                    case 1:  s = measure_ns_per_op([&](size_t t) { last_ops = chain_mul<1>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    case 2:  s = measure_ns_per_op([&](size_t t) { last_ops = chain_mul<2>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    case 4:  s = measure_ns_per_op([&](size_t t) { last_ops = chain_mul<4>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    case 8:  s = measure_ns_per_op([&](size_t t) { last_ops = chain_mul<8>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    case 16: s = measure_ns_per_op([&](size_t t) { last_ops = chain_mul<16>(t, &sink); return last_ops; }, kTargetRepNs, reps); break;
                    default: continue;
                }
            }
            const uint64_t loop_iters = last_ops / ((uint64_t)kUnroll * (uint64_t)k);
            const double cycles = tsc_hz > 0 ? s.median_ns * tsc_hz / 1e9 : 0.0;
            csv << op_name << ',' << k << ',' << loop_iters << ',' << last_ops << ','
                << s.median_ns << ',' << s.min_ns << ','
                << (tsc_hz > 0 ? std::to_string(cycles) : std::string()) << '\n';
            if (!quiet) {
                std::fprintf(stderr, "[%2zu/%2zu] %-3s chains=%2d  median %7.3f ns/op  = %6.3f cycles/op\n",
                             ++point, points, op_name, k, s.median_ns, cycles);
            }
        }
    };

    run_op("add", false);
    run_op("mul", true);

    csv.flush();
    if (!csv.good()) {
        std::fprintf(stderr, "error: failed writing %s\n", csv_path.c_str());
        return 2;
    }
    std::printf("wrote %s\nplot with: python scripts/plot_instruction_latency.py\n",
                csv_path.c_str());
    return 0;
}
