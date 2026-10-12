// Stage 2 benchmark: cache-line size via a stride sweep, in two modes.
//
// LATENCY mode (strides >= 8 B): a *dependent* pointer chase whose steps are
// `stride` bytes apart, in sequential order (lmbench-style). Dependent loads
// cannot be overlapped, so each hop costs real latency:
//   stride < 64 : hops mostly hit the line the previous hop just fetched
//                 -> per-hop cost is a blend of one miss and (64/stride - 1)
//                 hits, rising with stride.
//   stride >= 64: every hop needs a fresh line -> cost stops growing.
// The knee of this curve is the cache-line size. The plateau is LOWER than
// true DRAM latency because the sequential miss pattern is prefetchable; the
// KNEE POSITION is unaffected (see docs/cache_line.md).
//
// THROUGHPUT mode (all strides): independent scalar loads in a plain loop.
// The CPU overlaps misses (memory-level parallelism) and the prefetcher
// helps, so this measures amortized bandwidth, not latency; its knee is
// muddied by TLB-walk amortization and prefetcher behavior on real CPUs.
// Comparing the two panels is the lesson: latency vs overlapped throughput.
//
// Output CSV: mode,stride_bytes,buffer_bytes,ops_per_pass,passes,
//             median_ns_per_access,min_ns_per_access

#include "common/bench_utils.h"
#include "common/cpu_info.h"
#include "common/cycles.h"
#include "common/hints.h"
#include "common/pinning.h"
#include "common/random.h"

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

// -------------------------------------------------------------------------
// Throughput kernel: independent loads, one per stride step.
// no-tree-vectorize so the compiler cannot widen byte loads into vector
// loads (that would silently change what small strides mean).
// -------------------------------------------------------------------------
#if defined(__GNUC__) && !defined(__clang__)
__attribute__((optimize("no-tree-vectorize")))
#endif
uint64_t run_stride_throughput(const uint8_t* buf, size_t elems, size_t stride,
                               size_t target_accesses, uint64_t* sum_out) {
    const size_t per_pass = (elems + stride - 1) / stride;  // ceil
    const size_t passes =
        per_pass ? std::max<size_t>(1, target_accesses / per_pass) : 1;
    uint64_t sum = 0;
    for (size_t p = 0; p < passes; ++p) {
        for (size_t i = 0; i < elems; i += stride) sum += buf[i];
    }
    do_not_optimize(sum);
    if (sum_out) *sum_out = sum;
    return passes * per_pass;
}

// -------------------------------------------------------------------------
// Latency kernel: dependent chase over 8-byte slots spaced `stride` apart
// (stride >= 8: a slot must hold a pointer). Lines are visited in RANDOM
// order (so the hardware prefetcher cannot pipeline the stream and every
// line costs a real miss), but within a line the slots are chained
// sequentially (so a line fetched at cost L serves 64/stride hops).
// For stride >= 64 this degenerates to the Stage-1 pointer chase.
// -------------------------------------------------------------------------
uint8_t* slot_addr(uint8_t* base, size_t line, size_t line_size,
                   size_t sub, size_t stride) {
    return base + line * line_size + sub * stride;
}

void link_random_lines(uint8_t* base, size_t nlines, size_t line_size,
                       size_t slots_per_line, size_t stride, uint64_t seed) {
    const std::vector<uint32_t> order = random_permutation(nlines, seed);
    for (size_t k = 0; k < nlines; ++k) {
        const size_t line = order[k];
        const size_t next_line = order[(k + 1) % nlines];
        for (size_t sub = 0; sub + 1 < slots_per_line; ++sub) {
            *reinterpret_cast<uint8_t**>(slot_addr(base, line, line_size, sub, stride)) =
                slot_addr(base, line, line_size, sub + 1, stride);
        }
        *reinterpret_cast<uint8_t**>(
            slot_addr(base, line, line_size, slots_per_line - 1, stride)) =
            slot_addr(base, next_line, line_size, 0, stride);
    }
}

#if defined(__GNUC__) && !defined(__clang__)
__attribute__((optimize("no-tree-vectorize")))
#endif
uint8_t* chase_slots(uint8_t* start, size_t hops, uint64_t* sink) {
    uint8_t* p = start;
    for (size_t i = 0; i < hops; ++i) {
        p = *reinterpret_cast<uint8_t**>(p);
        asm volatile("" : "+r"(p) : : "memory");
    }
    do_not_optimize(p);
    if (sink) *sink += (uint64_t)(uintptr_t)p;
    return p;
}

void fill_pattern(std::vector<uint8_t>& buf) {
    // Non-zero pattern: all-zero pages can be served faster on machines with
    // memory compression.
    for (size_t i = 0; i < buf.size(); ++i) {
        buf[i] = (uint8_t)((i * 31 + (i >> 12)) & 0xFF);
    }
}

int self_test() {
    int failures = 0;
    auto check = [&](bool ok, const char* what) {
        if (!ok) {
            ++failures;
            std::printf("FAIL: %s\n", what);
        }
    };

    // --- throughput kernel: access counts and sums on a small buffer ---
    const size_t elems = 1000;
    std::vector<uint8_t> buf(elems);
    fill_pattern(buf);
    for (size_t stride : {size_t(1), size_t(2), size_t(3), size_t(7),
                          size_t(64), size_t(128), size_t(600), size_t(2000)}) {
        uint64_t ref_sum = 0;
        size_t ref_count = 0;
        for (size_t i = 0; i < elems; i += stride) {
            ref_sum += buf[i];
            ++ref_count;
        }
        uint64_t sum = 0;
        const uint64_t ops =
            run_stride_throughput(buf.data(), elems, stride, ref_count, &sum);
        char msg[128];
        std::snprintf(msg, sizeof msg, "throughput stride %zu: access count", stride);
        check(ops == ref_count, msg);
        std::snprintf(msg, sizeof msg, "throughput stride %zu: sum matches", stride);
        check(sum == ref_sum, msg);
    }

    // --- latency kernel: random line order, sequential within each line ---
    const size_t stride = 32, line_size = 64, slots_per_line = 2, nlines = 61;
    std::vector<uint8_t> arena(nlines * line_size);
    link_random_lines(arena.data(), nlines, line_size, slots_per_line, stride, 42);
    // The chase must visit every slot exactly once per lap and return.
    bool* seen = new bool[nlines * slots_per_line]();
    uint8_t* p = arena.data();
    for (size_t i = 0; i < nlines * slots_per_line; ++i) {
        const size_t offset = (size_t)(p - arena.data());
        const size_t slot = offset / stride;
        check(offset % stride == 0, "chase lands on slot boundaries");
        check(slot < nlines * slots_per_line, "chase stays inside slot range");
        check(!seen[slot], "each slot visited once per lap");
        seen[slot] = true;
        p = *reinterpret_cast<uint8_t**>(p);
    }
    check(p == arena.data(), "latency chase returns to start after one lap");
    delete[] seen;

    std::printf("cache_line self-test: %s\n", failures ? "FAILED" : "OK");
    return failures ? 1 : 0;
}

void print_usage(std::FILE* out) {
    std::fprintf(out,
        "cache_line — measure access cost vs stride (cache-line size)\n"
        "\n"
        "Modes: latency (dependent chase, strides 8..256; the knee reveals\n"
        "the line size) and throughput (independent loads, strides 1..256;\n"
        "amortized bandwidth view). Default: both.\n"
        "\n"
        "Options (defaults in brackets):\n"
        "  --buffer SIZE  buffer size, must exceed L3 [32M]\n"
        "  --mode M       latency | throughput | both [both]\n"
        "  --reps N       timed repetitions per point [5]\n"
        "  --cpu N        pin to logical CPU N; -1 disables pinning [0]\n"
        "  --out-dir DIR  output directory [results]\n"
        "  --csv NAME     CSV file name [cache_line.csv]\n"
        "  --quiet        suppress progress lines\n"
        "  --self-test    run correctness checks and exit\n"
        "  --help         this text\n");
}

}  // namespace

int main(int argc, char** argv) {
    uint64_t buffer_size = 32u << 20;
    uint64_t seed = 42;
    int reps = 5, cpu = 0;
    std::string mode = "both", out_dir = "results", csv_name = "cache_line.csv";
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
        else if (arg == "--buffer" && next(&v)) {
            if (!parse_size_bytes(v, &buffer_size) || buffer_size < 4096) {
                std::fprintf(stderr, "error: bad --buffer '%s'\n", v.c_str());
                return 2;
            }
        }
        else if (arg == "--mode" && next(&v)) {
            if (v != "latency" && v != "throughput" && v != "both") {
                std::fprintf(stderr, "error: --mode must be latency|throughput|both\n");
                return 2;
            }
            mode = v;
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
    if (reps < 1 || reps > 1000) {
        std::fprintf(stderr, "error: --reps must be in [1, 1000]\n");
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

    std::vector<uint8_t> buf;
    try {
        buf.resize(buffer_size);
    } catch (const std::bad_alloc&) {
        std::fprintf(stderr, "error: out of memory for --buffer %s\n",
                     human_bytes(buffer_size).c_str());
        return 3;
    }
    fill_pattern(buf);

    const std::string csv_path = out_dir + "/" + csv_name;
    std::string err;
    std::ofstream csv = open_csv(csv_path,
        "mode,stride_bytes,buffer_bytes,ops_per_pass,passes,"
        "median_ns_per_access,min_ns_per_access", err);
    if (!csv) {
        std::fprintf(stderr, "error: %s\n", err.c_str());
        return 2;
    }
    if (!write_machine_json(out_dir + "/machine_cache_line.json", machine,
                            std::string("g++ ") + __VERSION__, BENCH_BUILD_FLAGS,
                            "cache_line", 0, tsc_hz, err)) {
        std::fprintf(stderr, "warning: machine_cache_line.json: %s\n", err.c_str());
    }

    size_t point = 0, points = 0;
    const bool do_latency = mode != "throughput";
    const bool do_throughput = mode != "latency";
    const size_t latency_strides[] = {8, 16, 32, 64, 128, 256};
    const size_t throughput_strides[] = {1, 2, 4, 8, 16, 32, 64, 128, 256};
    points += (do_latency ? sizeof(latency_strides) : 0) / sizeof(size_t);
    points += (do_throughput ? sizeof(throughput_strides) : 0) / sizeof(size_t);

    if (do_latency) {
        if (!quiet) std::fprintf(stderr, "--- latency mode (random line order, sequential within line) ---\n");
        for (size_t stride : latency_strides) {
            // stride < 64: line = 64 B, 64/stride hops share each line's miss.
            // stride >= 64: every hop is its own line (Stage-1 chase shape).
            const size_t line_size = stride < 64 ? 64 : stride;
            const size_t nlines = buffer_size / line_size;
            const size_t slots_per_line = line_size / stride;
            link_random_lines(buf.data(), nlines, line_size, slots_per_line,
                              stride, seed);
            uint64_t last_ops = 0;
            const Sample s = measure_ns_per_op(
                [&](size_t target) {
                    chase_slots(buf.data(), target, nullptr);
                    last_ops = target;
                    return last_ops;
                },
                kTargetRepNs, reps);
            csv << "latency," << stride << ',' << buffer_size << ",1," << last_ops << ','
                << s.median_ns << ',' << s.min_ns << '\n';
            if (!quiet) {
                std::fprintf(stderr, "[%2zu/%2zu] stride %4zu  median %8.3f ns/hop  min %8.3f\n",
                             ++point, points, stride, s.median_ns, s.min_ns);
            }
        }
    }

    if (do_throughput) {
        if (!quiet) std::fprintf(stderr, "--- throughput mode (independent loads) ---\n");
        for (size_t stride : throughput_strides) {
            const size_t per_pass = (buffer_size + stride - 1) / stride;
            uint64_t last_ops = 0;
            const Sample s = measure_ns_per_op(
                [&](size_t target) {
                    last_ops = run_stride_throughput(buf.data(), buf.size(), stride,
                                                     target, nullptr);
                    return last_ops;
                },
                kTargetRepNs, reps);
            csv << "throughput," << stride << ',' << buffer_size << ',' << per_pass << ','
                << last_ops / per_pass << ',' << s.median_ns << ',' << s.min_ns << '\n';
            if (!quiet) {
                std::fprintf(stderr, "[%2zu/%2zu] stride %4zu  median %8.3f ns/access  min %8.3f\n",
                             ++point, points, stride, s.median_ns, s.min_ns);
            }
        }
    }

    csv.flush();
    if (!csv.good()) {
        std::fprintf(stderr, "error: failed writing %s\n", csv_path.c_str());
        return 2;
    }
    std::printf("wrote %s\nplot with: python scripts/plot_cache_line.py\n", csv_path.c_str());
    return 0;
}
